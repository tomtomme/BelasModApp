# ModNest

ModNest ist eine Electron-Desktop-App zur Auswahl von Modrinth-Profilen und zur Installation von Mods aus Sammlungen eines öffentlichen Google Sheets.

## Wichtig: Quellcode ist noch kein Installer

Der Ordner `/home/tom/dyad-apps/mod-nest` enthält den **Quellcode** der App. In diesem Projektordner liegt momentan kein fertiges Programm, das sich per Doppelklick starten oder installieren lässt. Die Installer-Dateien entstehen erst, wenn der Desktop-Build ausgeführt wurde. Sie erscheinen anschließend im neu erstellten Ordner `release/`.

## App im Entwicklungsmodus starten

Voraussetzung ist eine eingerichtete Node.js-Entwicklungsumgebung mit den Projektabhängigkeiten. Öffne das Projekt in einer IDE, die npm-Skripte anzeigen und starten kann, und starte dort das Skript **`dev:desktop`**. Es öffnet ModNest als eigenes Desktop-Fenster. Das Skript **`dev`** startet nur die Web-Vorschau im Browser; dafür sind die lokalen Dateizugriffe nicht verfügbar.

## Linux-Paket erstellen (Manjaro/Arch)

Auf einem Linux-Rechner das npm-Skript **`build:linux`** starten. Nach erfolgreichem Abschluss liegen die Pakete unter `release/`:

- `ModNest-…AppImage` – portable AppImage-Datei
- `modnest_…_amd64.deb` – Debian-Paket, primär für Debian/Ubuntu-Systeme

Für Manjaro ist das AppImage die passendere der beiden erzeugten Dateien. Die AppImage-Datei anschließend im Dateimanager starten. Falls Manjaro nachfragt, die Datei als ausführbar zulassen. Ein Installer für Arch/Manjaro im nativen Paketformat wird derzeit nicht erzeugt.

## Windows-Installer erstellen

Das npm-Skript **`build:windows`** auf einem Windows-Rechner starten. Der NSIS-Installer `ModNest-Setup-1.0.0.exe` wird im Ordner `release/` abgelegt. Der Installer ist für Windows 11 vorgesehen. Windows-Builds sollten direkt unter Windows erzeugt werden; ein unter Linux erstellter Installer liegt diesem Quellcode nicht bei.

## Mod-Kompatibilität

ModNest fragt Modrinth nach Dateien für die Minecraft-Version und den Modloader-Typ des ausgewählten Profils. Die Modrinth-API stellt für Mods keine Filterung nach der exakten Loader-Buildnummer bereit. Daher kann die App die Minecraft-Version und den Modloader-Typ abgleichen, aber nicht garantieren, dass jede Mod mit einer bestimmten Fabric-/Forge-Buildnummer getestet wurde.

## Profile und Google Sheet

Beim Start verwendet ModNest den üblichen Modrinth-Profilordner des jeweiligen Betriebssystems. Unter Linux ist das standardmäßig `~/.var/app/com.modrinth.ModrinthApp/data/ModrinthApp/profiles/`; ein anderer Profilordner kann über **Ordner wählen** festgelegt werden. Das Google Sheet muss öffentlich lesbar sein und Modrinth-Links in den Sammlungszeilen enthalten.

## GitHub-Builds und Releases

Der Workflow `.github/workflows/build-desktop.yml` erstellt Pakete auf GitHub für Windows und Linux. Nach einem Push auf `main` oder `master` (oder nach manuellem Start unter **Actions**) findest du die Dateien als Workflow-Artefakte. Ein Artefakt kann im jeweiligen Workflow-Lauf heruntergeladen werden; die Artefakte bleiben 30 Tage verfügbar.

Für eine dauerhafte Release-Seite mit den Installern muss ein Versions-Tag nach dem Muster `v1.0.0` veröffentlicht werden. Dann hängt GitHub die Windows- und Linux-Dateien automatisch an ein GitHub Release an. Dafür sind keine Repository-Secrets nötig; der Workflow verwendet das automatisch bereitgestellte `GITHUB_TOKEN`.

Das Repo `tomtomme/BelasModApp` ist bislang leer. Der Workflow liegt zunächst nur im lokalen Projekt. Er kann erst laufen, nachdem der vollständige ModNest-Projektinhalt einschließlich des versteckten Ordners `.github` in dieses Repo übertragen und gepusht wurde.

## Freunde

Zum Weitergeben an Freunde die fertige Datei aus einem GitHub Release teilen – nicht den Quellcode-Ordner. Jede Plattform benötigt ihr eigenes Paket: Windows-Freunde brauchen den Windows-Installer, Linux-Freunde ein Linux-Paket.

## Datenschutz und Downloads

ModNest liest die ausgewählten lokalen Profil-Metadaten. Beim Installieren fragt es die Modrinth-API ab und lädt Mod-Dateien direkt von dort herunter. Es schreibt sie in den `mods/`-Unterordner des ausgewählten Profils und prüft die von Modrinth bereitgestellte SHA-1-Prüfsumme, sofern vorhanden.

## Einschränkungen des aktuellen Builds

- Die Oberfläche und Desktop-Integration sind implementiert; ein bereits gebauter Installer ist in diesem Repository noch nicht enthalten.
- Die Projektdatei enthält die npm-Skripte für Entwicklungsstart und Paketierung.
- Der Modloader wird nach Typ (Fabric, Forge, NeoForge oder Quilt), nicht nach dessen konkreter Buildnummer gefiltert.
- Die App ist nicht digital signiert. Windows kann beim ersten Start deshalb eine SmartScreen-Warnung anzeigen.
- Prüfe vor der Weitergabe die Freigabe des Sheets und die Namen der darin enthaltenen Modrinth-Mods.
