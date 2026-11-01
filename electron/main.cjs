const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const SHEET_ID = '1fhlWsEaExAHvK_PRTVEl_EqlgnEkFhxEdoOKlFvOTPU';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
const API = 'https://api.modrinth.com/v2';
let win;
let activeProfilesDirectory;

function defaultProfilesPath() {
  if (process.platform === 'win32') return path.join(app.getPath('appData'), 'com.modrinth.theseus', 'profiles');
  if (process.platform === 'linux') return path.join(os.homedir(), '.var/app/com.modrinth.ModrinthApp/data/ModrinthApp/profiles');
  return path.join(os.homedir(), '.local/share/ModrinthApp/profiles');
}

function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted && c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (field || row.length) { row.push(field.trim()); rows.push(row); } row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  return rows;
}

function modSlug(value) {
  const text = String(value || '').trim();
  const urlMatch = text.match(/(?:modrinth\.com\/(?:mod|plugin)\/)([A-Za-z0-9_-]+)/i);
  return urlMatch ? urlMatch[1] : /^[A-Za-z0-9_-]+$/.test(text) ? text : null;
}

function readCollections(csv) {
  const rows = parseCsv(csv).filter(row => row.some(cell => cell.trim()));
  if (!rows.length) throw new Error('Das Google Sheet enthält keine Daten.');
  const collections = new Map();
  const header = rows[0].map(value => value.toLowerCase());
  const collectionColumn = header.findIndex(value => /sammlung|collection|name/.test(value));
  const modColumn = header.findIndex(value => /mod|link|url/.test(value));
  const start = collectionColumn >= 0 ? 1 : 0;
  for (const row of rows.slice(start)) {
    const name = row[collectionColumn >= 0 ? collectionColumn : 0]?.trim();
    if (!name) continue;
    const linkCells = row.filter((_, index) => index !== collectionColumn && (modColumn < 0 || index >= modColumn));
    const mods = linkCells.map(modSlug).filter(Boolean);
    if (!collections.has(name)) collections.set(name, new Set());
    mods.forEach(slug => collections.get(name).add(slug));
  }
  const result = [...collections].map(([name, slugs]) => ({ name, mods: [...slugs].map(slug => ({ name: slug, slug })) }));
  if (!result.length || result.every(item => item.mods.length === 0)) throw new Error('Keine Modrinth-Mod-Links erkannt. Erwartet werden eine Spalte für Sammlungsnamen und Modrinth-Links.');
  return result;
}

function getDependency(data, key) {
  const deps = data.dependencies || {};
  return deps[key] || deps[key.replace(/-/g, '_')] || '';
}

async function scanProfiles(profileDir) {
  let entries;
  try { entries = await fs.readdir(profileDir, { withFileTypes: true }); }
  catch { return []; }
  const profiles = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(profileDir, entry.name);
    let metadata;
    for (const file of ['profile.json', 'instance.json', 'instance.cfg']) {
      try {
        const contents = await fs.readFile(path.join(dir, file), 'utf8');
        try { metadata = JSON.parse(contents); } catch { metadata = Object.fromEntries(contents.split(/\r?\n/).map(line => line.split('=').map(part => part.trim())).filter(parts => parts.length >= 2)); }
        if (metadata) break;
      } catch {}
    }
    if (!metadata) continue;
    const dependencies = metadata.dependencies || {};
    const game = metadata.gameVersion || metadata.game_version || dependencies.minecraft || metadata.game?.version || metadata.version || metadata.versionId || '';
    const loaderEntry = Object.entries(dependencies).find(([key]) => /^(fabric-loader|forge|neoforge|quilt-loader)$/.test(key));
    const loaderName = loaderEntry?.[0].split('-')[0] || metadata.loader || metadata.loaderType || '';
    const loaderVersion = loaderEntry?.[1] || metadata.loaderVersion || metadata.loader_version || '';
    const loader = String(loaderName).toLowerCase() === 'neoforge' ? 'neoforge' : String(loaderName).toLowerCase();
    profiles.push({ id: entry.name, name: metadata.name || entry.name, path: dir, game: String(game), loader, loaderVersion: String(loaderVersion), color: ['#d5a76d', '#7eae77', '#a28bd0'][profiles.length % 3] });
  }
  return profiles;
}

async function listProfiles(event, customDir) {
  const dir = customDir || defaultProfilesPath();
  const profiles = await scanProfiles(dir);
  activeProfilesDirectory = dir;
  return { directory: dir, profiles };
}

function parseProjectLink(slug) { return encodeURIComponent(slug); }

async function findModFile(slug, profile) {
  const params = new URLSearchParams({ game_versions: JSON.stringify([profile.game]), loaders: JSON.stringify([profile.loader]) });
  const response = await fetch(`${API}/project/${parseProjectLink(slug)}/version?${params}`, { headers: { 'User-Agent': 'ModNest/1.0 (desktop mod manager)' } });
  if (!response.ok) throw new Error(`${slug}: keine kompatible Version gefunden (${response.status}).`);
  const versions = await response.json();
  const match = versions.find(version => version.game_versions?.includes(profile.game) && version.loaders?.includes(profile.loader));
  const file = match?.files?.find(item => item.primary) || match?.files?.[0];
  if (!file?.url || !file.url.startsWith('https://')) throw new Error(`${slug}: keine sichere Download-Datei verfügbar.`);
  return { slug, title: match.name || slug, filename: path.basename(file.filename), url: file.url, hashes: file.hashes || {} };
}

async function installMods(event, { profile, slugs }) {
  if (!profile?.path || !path.isAbsolute(profile.path) || !activeProfilesDirectory) throw new Error('Profilpfad ungültig.');
  const resolvedProfile = path.resolve(profile.path);
  const resolvedRoot = path.resolve(activeProfilesDirectory);
  if (!resolvedProfile.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error('Das ausgewählte Profil liegt nicht im freigegebenen Modrinth-Profilordner.');
  if (!profile.game || !profile.loader) throw new Error('Minecraft-Version oder Modloader im Profil fehlt.');
  if (!Array.isArray(slugs) || !slugs.length) throw new Error('Keine Mods ausgewählt.');
  const uniqueSlugs = [...new Set(slugs.map(String))];
  const files = [];
  for (const slug of uniqueSlugs) files.push(await findModFile(slug, profile));
  const modsDir = path.join(profile.path, 'mods');
  await fs.mkdir(modsDir, { recursive: true });
  const completed = [];
  for (let i = 0; i < files.length; i += 1) {
    const item = files[i];
    const response = await fetch(item.url, { headers: { 'User-Agent': 'ModNest/1.0 (desktop mod manager)' } });
    if (!response.ok) throw new Error(`${item.slug}: Download fehlgeschlagen (${response.status}).`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (item.hashes.sha1) {
      const digest = crypto.createHash('sha1').update(bytes).digest('hex');
      if (digest.toLowerCase() !== item.hashes.sha1.toLowerCase()) throw new Error(`${item.slug}: Prüfsumme stimmt nicht überein; Datei wurde nicht gespeichert.`);
    }
    const destination = path.join(modsDir, path.basename(item.filename));
    await fs.writeFile(destination, bytes, { flag: 'w' });
    completed.push(item.slug);
    event.sender.send('install-progress', { completed, total: files.length, current: item.slug, path: destination });
  }
  return { installed: completed, modsPath: modsDir };
}

async function createWindow() {
  win = new BrowserWindow({ width: 1180, height: 860, minWidth: 760, minHeight: 620, title: 'ModNest', backgroundColor: '#fbfbf8', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) await win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else await win.loadFile(path.join(__dirname, '../dist/index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('https://modrinth.com/') || url.startsWith('https://docs.google.com/')) shell.openExternal(url); return { action: 'deny' }; });
}

ipcMain.handle('profiles:list', listProfiles);
ipcMain.handle('profiles:choose', async () => {
  const result = await dialog.showOpenDialog(win, { title: 'Modrinth-Profilordner wählen', properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths[0]) return null;
  return listProfiles(null, result.filePaths[0]);
});
ipcMain.handle('collections:fetch', async () => {
  const response = await fetch(SHEET_URL, { headers: { 'User-Agent': 'ModNest/1.0 (desktop mod manager)' } });
  if (!response.ok) throw new Error(`Google Sheet nicht erreichbar (${response.status}).`);
  return readCollections(await response.text());
});
ipcMain.handle('mods:install', installMods);

app.whenReady().then(async () => {
  await createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
