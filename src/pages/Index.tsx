import { useEffect, useMemo, useState } from "react";
import { Blocks, FolderOpen, Search, ChevronDown, Check, Download, PackageCheck, RefreshCw, ExternalLink, CircleHelp, Settings2, Box, Leaf, HardDrive, AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import "../collection.css";
import type { DesktopCollection, DesktopProfile, InstallProgress } from "@/lib/desktop";

type Profile = DesktopProfile;
type Collection = DesktopCollection & { description: string; tint: string };

const defaultProfiles: Profile[] = [
  { id: "demo-create", name: "Create · Welt 01", game: "1.20.1", loader: "forge", loaderVersion: "47.2.0", path: ".../profiles/Create · Welt 01", color: "#d5a76d" },
  { id: "demo-vanilla", name: "Vanilla Plus", game: "1.20.1", loader: "fabric", loaderVersion: "0.15.11", path: ".../profiles/Vanilla Plus", color: "#7eae77" },
  { id: "demo-building", name: "Building Tool", game: "1.21.1", loader: "fabric", loaderVersion: "0.16.5", path: ".../profiles/Building Tool", color: "#a28bd0" },
];
function collectionStyle(items: DesktopCollection[]): Collection[] {
  return items.map((item, index) => ({ ...item, description: `${item.mods.length} Mods aus deiner Sammlung`, tint: ["mint", "lavender", "peach"][index % 3] }));
}

export default function Index() {
  const [profiles, setProfiles] = useState(defaultProfiles);
  const [collections, setCollections] = useState<Collection[]>(collectionStyle([
    { name: "Test", mods: [{ name: "Sodium", slug: "sodium" }, { name: "Lithium", slug: "lithium" }, { name: "FerriteCore", slug: "ferrite-core" }] },
    { name: "Hallo", mods: [{ name: "Iris Shaders", slug: "iris" }, { name: "Mod Menu", slug: "modmenu" }, { name: "Entity Culling", slug: "entityculling" }, { name: "AppleSkin", slug: "appleskin" }] },
    { name: "Building Tool", mods: [{ name: "Litematica", slug: "litematica" }, { name: "MaLiLib", slug: "malilib" }, { name: "WorldEdit", slug: "worldedit" }] },
  ]));
  const [selected, setSelected] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("~/.var/app/com.modrinth.ModrinthApp/data/ModrinthApp/profiles/");
  const [syncing, setSyncing] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [installed, setInstalled] = useState<string[]>([]);
  const profile = profiles[selected] || profiles[0] || defaultProfiles[0];
  const filtered = useMemo(() => profiles.filter(p => p.name.toLowerCase().includes(query.toLowerCase())), [profiles, query]);
  const chosenMods = collections.filter(c => checked.includes(c.name)).flatMap(c => c.mods);
  const selectedModNames = Array.from(new Map(chosenMods.map(m => [m.slug, m])).values());

  useEffect(() => {
    if (!window.modnest) return;
    let active = true;
    window.modnest.listProfiles().then(result => {
      if (!active) return;
      setFolder(result.directory);
      setProfiles(result.profiles);
      setSelected(0);
      if (!result.profiles.length) toast.message("Keine Profile gefunden. Wähle deinen Modrinth-Profilordner.");
    }).catch(error => toast.error(error.message));
    window.modnest.fetchCollections().then(result => {
      if (!active) return;
      setCollections(collectionStyle(result));
      setChecked([]);
    }).catch(error => toast.error(`Google Sheet: ${error.message}`));
    const unsubscribe = window.modnest.onInstallProgress((event: InstallProgress) => {
      setInstalled(event.completed);
      setProgress(Math.round(event.completed.length / event.total * 100));
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  async function chooseFolder() {
    if (!window.modnest) { toast.message("Die Ordnerauswahl ist in der installierten Desktop-App verfügbar."); return; }
    try {
      const result = await window.modnest.chooseProfileFolder();
      if (!result) return;
      setFolder(result.directory); setProfiles(result.profiles); setSelected(0);
      if (!result.profiles.length) toast.error("In diesem Ordner wurden keine Modrinth-Profile erkannt.");
      else toast.success(`${result.profiles.length} Profile gefunden`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Ordner konnte nicht gelesen werden."); }
  }

  async function syncSheet() {
    if (!window.modnest) { toast.message("Google-Sheet-Synchronisierung ist in der Desktop-App verfügbar."); return; }
    setSyncing(true);
    try { setCollections(collectionStyle(await window.modnest.fetchCollections())); toast.success("Sammlungen aus Google Sheets aktualisiert"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Google Sheet konnte nicht gelesen werden."); }
    finally { setSyncing(false); }
  }

  async function install() {
    if (!selectedModNames.length) { toast.error("Wähle zuerst mindestens eine Sammlung aus."); return; }
    if (!window.modnest) { toast.error("Echte Downloads sind nur in der installierten Desktop-App verfügbar."); return; }
    if (!profiles.length) { toast.error("Wähle zuerst einen vorhandenen Modrinth-Profilordner aus."); return; }
    setInstalling(true); setProgress(0); setInstalled([]);
    try {
      const result = await window.modnest.installMods({ profile, slugs: selectedModNames.map(mod => mod.slug) });
      setInstalled(result.installed); setProgress(100); toast.success(`${result.installed.length} Mods nach ${result.modsPath} installiert`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Installation fehlgeschlagen."); }
    finally { setInstalling(false); }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Blocks size={22} strokeWidth={2.4}/><span/></div><div><b>modnest</b><small>MOD MANAGER</small></div></div>
      <div className="side-caption">DEINE BIBLIOTHEK</div>
      <div className="sidebar-current"><div className="current-icon"><Box size={17}/></div><div><b>Profile</b><small>{profiles.length} lokale Welten</small></div><span className="side-count">{profiles.length}</span></div>
      <div className="sidebar-bottom"><div className="sidebar-note"><div className="note-icon"><Leaf size={16}/></div><b>Deine Mods, an einem Ort.</b><p>Sammlungen auswählen und direkt ins Profil installieren.</p></div><button className="side-help" onClick={() => toast.message("Wähle ein Profil und danach eine oder mehrere Mod-Sammlungen.")}><CircleHelp size={16}/> Hilfe & Tipps</button><div className="version">MODNEST <span>•</span> PREVIEW 0.1</div></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div className="crumb">Bibliothek <span>/</span> <b>Profile</b></div><div className="top-actions"><span className="online"><i/> Modrinth erreichbar</span><button className="icon-button" aria-label="Einstellungen" onClick={() => toast.message("Einstellungen folgen in der Desktop-Version.")}><Settings2 size={18}/></button><div className="avatar">M</div></div></header>
      <div className="content">
        <div className="welcome"><div className="welcome-copy"><div className="eyebrow"><span/> DEINE MOD-BIBLIOTHEK</div><h1>Hallo, Builder<span>.</span></h1><p>Wähle ein Profil, such dir deine Sammlungen aus – fertig.</p></div><div className="hero-art"><div className="art-sun"/><div className="art-cloud">▪ ▪▪</div><div className="art-hill hill-a"/><div className="art-hill hill-b"/><div className="art-block block-one"/><div className="art-block block-two"/><div className="art-leaf"><Leaf size={26}/></div></div></div>
        <div className="folder-line"><div className="folder-icon"><FolderOpen size={17}/></div><div className="folder-text"><small>MODRINTH PROFIL-ORDNER</small><span title={folder}>{folder}</span></div><button className="text-button" onClick={chooseFolder}><FolderOpen size={15}/> Ordner wählen</button></div>
        <div className="section-title"><div><span className="step-number">01</span><div><h2>Profil auswählen</h2><p>Versionen werden passend zu diesem Profil geprüft.</p></div></div><span className="found-count">{profiles.length} PROFILE GEFUNDEN</span></div>
        <div className="profile-tools"><div className="searchbox"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Profil suchen…"/><kbd>⌘ K</kbd></div><button className="refresh-button" onClick={() => window.modnest?.listProfiles().then(result => { setFolder(result.directory); setProfiles(result.profiles); setSelected(0); toast.success(`${result.profiles.length} Profile gefunden`); }).catch(error => toast.error(error.message))}><RefreshCw size={15}/> Aktualisieren</button></div>
        <div className="profile-grid">{filtered.map(p => { const index = profiles.indexOf(p); return <button key={p.name} className={`profile-card ${selected === index ? "is-selected" : ""}`} onClick={() => setSelected(index)}><span className="profile-art" style={{"--profile-color":p.color} as React.CSSProperties}><span className="art-tile tile-a"/><span className="art-tile tile-b"/><span className="art-tile tile-c"/></span><span className="profile-info"><b>{p.name}</b><small>{p.game} <span>·</span> {p.loader} {p.loaderVersion}</small></span><span className="selection-check">{selected === index && <Check size={14}/>}</span></button>; })}{!filtered.length && <div className="no-results">Kein Profil mit diesem Namen gefunden.</div>}</div>
        <div className="version-strip"><div className="version-check"><span className="check-icon"><Check size={13}/></span><div><small>MINECRAFT-VERSION</small><b>{profile.game}</b></div></div><div className="version-divider"/><div className="version-check"><span className="check-icon"><Check size={13}/></span><div><small>MODLOADER</small><b>{profile.loader} <em>{profile.loaderVersion}</em></b></div></div><span className="compatible"><CheckCircle2 size={14}/> Kompatibel</span></div>
        <div className="section-title collection-heading"><div><span className="step-number">02</span><div><h2>Sammlungen hinzufügen</h2><p>Wähle, was in <b>{profile.name}</b> installiert werden soll.</p></div></div><button className="sheet-sync" onClick={syncSheet} disabled={syncing}><RefreshCw size={14} className={syncing ? "spin" : ""}/> {syncing ? "Wird synchronisiert…" : "Google Sheet sync"}</button></div>
        <div className="collection-grid">{collections.map((c, i) => { const active = checked.includes(c.name); const expanded = expandedCollections.includes(c.name); return <div key={c.name} className={`collection-card ${active ? "collection-active" : ""} ${expanded ? "collection-expanded" : ""}`}><button className="collection-main" aria-expanded={expanded} onClick={() => setExpandedCollections(expanded ? expandedCollections.filter(name => name !== c.name) : [...expandedCollections, c.name])}><span className={`collection-icon ${c.tint}`}><span>{i === 0 ? <Blocks size={20}/> : i === 1 ? <Leaf size={20}/> : <Box size={20}/>}</span></span><span className="collection-body"><b>{c.name}</b><small>{c.description}</small><span className="mod-count">{c.mods.length} MODS · {expanded ? "ZUKLAPPEN" : "MODS ANSEHEN"}</span></span><ChevronDown size={14} className="collection-chevron"/></button><button className="collection-checkbox" aria-label={`${c.name} ${active ? "abwählen" : "auswählen"}`} aria-pressed={active} onClick={() => setChecked(active ? checked.filter(x => x !== c.name) : [...checked, c.name])}>{active && <Check size={13}/>}</button>{expanded && <div className="collection-mod-list">{c.mods.map(mod => <div className="collection-mod" key={mod.slug}><span className="mod-dot"/><span>{mod.name}</span><a href={`https://modrinth.com/mod/${mod.slug}`} target="_blank" rel="noreferrer" aria-label={`${mod.name} auf Modrinth ansehen`} onClick={event => event.stopPropagation()}><ExternalLink size={12}/></a></div>)}</div>}</div>; })}</div>
        <div className="sheet-footnote"><span className="sheet-dot"/> Sammlungen aus Google Sheets <a href="https://docs.google.com/spreadsheets/d/1fhlWsEaExAHvK_PRTVEl_EqlgnEkFhxEdoOKlFvOTPU/edit?usp=sharing" target="_blank" rel="noreferrer">Tabelle ansehen <ExternalLink size={12}/></a><span className="footnote-spacer"/> <HardDrive size={13}/> Ziel: <b>mods/</b></div>
        {installing && <div className="install-progress"><div className="progress-label"><span><LoaderCircle size={15} className="spin"/> Installiere Mods für <b>{profile.name}</b></span><b>{progress}%</b></div><div className="progress-track"><i style={{width:`${progress}%`}}/></div><div className="install-list">{installed.map(name => <span key={name}><Check size={12}/>{name}</span>)}</div></div>}
        {installed.length > 0 && !installing && <div className="success-banner"><PackageCheck size={18}/><div><b>Sammlung bereit!</b><span>{installed.length} Mods ausgewählt für {profile.name}</span></div><span className="success-path">{profile.path}/mods</span></div>}
        <div className="bottom-bar"><div className="download-summary"><div className="summary-icon"><Download size={17}/></div><div><b>{selectedModNames.length} Mods ausgewählt</b><small>{checked.length} Sammlungen · {profile.game} · {profile.loader}</small></div></div><button className="install-button" onClick={install} disabled={installing || !checked.length}>{installing ? <><LoaderCircle size={17} className="spin"/> Wird installiert…</> : <><Download size={17}/> Mods installieren <ChevronDown size={14}/></>}</button></div>
        <div className="notice"><AlertCircle size={14}/> <span>Kompatibilität wird anhand der exakten Minecraft- und Loader-Version geprüft.</span></div>
      </div>
    </section>
  </main>;
}
