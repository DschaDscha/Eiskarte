# Eiskarte 🍦

Mobile Bestell-App für den eigenen Eisstand. Drei Oberflächen:

- **Bestellung** (`/`, `/warenkorb`) – Gäste stöbern durch die Eiskarte, legen Eis in den Warenkorb und geben mit ihrem Namen eine Bestellung auf.
- **Admin** (`/admin`) – Eissorten anlegen/bearbeiten/löschen inkl. Foto (z. B. aus der iPhone-Fotogalerie) und Lagerbestand. Passwortgeschützt.
- **Abholung** (`/abholung`) – Übersicht aller offenen Bestellungen je Gast, zum Abhaken beim Rausholen aus dem Keller. Beim Abhaken wird der Lagerbestand automatisch reduziert. Passwortgeschützt.

## Architektur

- `client/` – React-Frontend (Vite), mobil-optimiert.
- `server/` – Node.js/Express-API mit SQLite-Datenbank (`better-sqlite3`), Bild-Uploads via `multer`.

Bestellte Mengen werden bereits beim Bestellen gegen den verfügbaren Bestand geprüft (Lagerbestand minus bereits offene Bestellungen). Der tatsächliche Lagerbestand wird erst reduziert, wenn eine Bestellung in der Abholoberfläche als erledigt markiert wird.

## Lokale Entwicklung

```bash
npm run install:all

# Terminal 1
npm run dev:server     # API auf http://localhost:3001

# Terminal 2
npm run dev:client     # Vite-Dev-Server auf http://localhost:5173 (proxyt /api zum Server)
```

## Deployment auf eigenem Server / VPS (Node.js erforderlich)

```bash
npm run install:all
npm run build           # baut das React-Frontend nach client/dist
npm run start --prefix server   # startet den Express-Server (liefert API + Frontend zusammen aus)
```

Der Server lauscht standardmäßig auf Port `3001` (überschreibbar via Umgebungsvariable `PORT`). Er liefert sowohl die API (`/api/...`), hochgeladene Bilder (`/uploads/...`) als auch das gebaute Frontend aus – ein einzelner Prozess reicht für den Betrieb.

Für Dauerbetrieb empfiehlt sich ein Prozess-Manager, z. B.:

```bash
npm install -g pm2
pm2 start server/src/index.js --name eiskarte
```

Falls vor dem Server ein Reverse Proxy (nginx, Apache) läuft, einfach alle Anfragen an Port `3001` weiterleiten.

### Daten & Uploads

- Die SQLite-Datenbank liegt unter `server/data/eiskarte.db` und wird beim ersten Start automatisch angelegt.
- Hochgeladene Fotos liegen unter `server/uploads/`.

Beide Verzeichnisse sollten bei Backups/Updates erhalten bleiben.

### Zugangsschutz für Admin & Abholung

`/admin` und `/abholung` sowie die zugehörigen API-Endpunkte (Eissorten anlegen/bearbeiten/löschen, Bestellungen einsehen/abschließen) sind per HTTP Basic Auth geschützt. Der Browser fragt beim ersten Zugriff automatisch nach Benutzername/Passwort.

Standardmäßig: Benutzername `admin`, Passwort `eis2024`. **Vor dem Live-Betrieb unbedingt per Umgebungsvariablen überschreiben:**

```bash
export ADMIN_USERNAME=dein-benutzername
export ADMIN_PASSWORD=ein-sicheres-passwort
npm run start --prefix server
```

Mit pm2:

```bash
ADMIN_USERNAME=dein-benutzername ADMIN_PASSWORD=ein-sicheres-passwort pm2 start server/src/index.js --name eiskarte
```

Die Bestellseite (`/`, `/warenkorb`) bleibt für Gäste ohne Login erreichbar.
