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

## Deployment mit Docker

Im Repo liegen ein `Dockerfile` (baut Client + Server in einem Image) und eine `docker-compose.yml` mit persistenten Volumes für Datenbank und Uploads.

### Mit Docker Compose (empfohlen)

1. Passwort setzen: Datei `.env` im Projektordner anlegen (wird von Docker Compose automatisch eingelesen):
   ```
   ADMIN_USERNAME=dein-benutzername
   ADMIN_PASSWORD=ein-sicheres-passwort
   ```

2. Bauen und starten:
   ```bash
   docker compose up -d --build
   ```

3. App ist erreichbar unter `http://<server-ip>:3001`.

4. Logs ansehen / Container neu starten:
   ```bash
   docker compose logs -f
   docker compose restart
   ```

5. Stoppen (Daten bleiben durch die Volumes erhalten):
   ```bash
   docker compose down
   ```

Datenbank und hochgeladene Fotos liegen in den benannten Volumes `eiskarte-data` und `eiskarte-uploads` und überleben `docker compose down` sowie Image-Updates (`docker compose up -d --build` nach Codeänderungen).

### Ohne Docker Compose (reines `docker`)

```bash
docker build -t eiskarte .

docker run -d \
  --name eiskarte \
  -p 3001:3001 \
  -e ADMIN_USERNAME=dein-benutzername \
  -e ADMIN_PASSWORD=ein-sicheres-passwort \
  -v eiskarte-data:/app/server/data \
  -v eiskarte-uploads:/app/server/uploads \
  --restart unless-stopped \
  eiskarte
```

### Reverse Proxy / HTTPS vor dem Container

Falls die App über eine eigene Domain mit HTTPS laufen soll (z. B. für den Fotoupload vom iPhone), nginx oder Caddy vor den Container schalten und auf `http://localhost:3001` proxien. Beispiel für Caddy (`Caddyfile`):

```
eiskarte.deine-domain.de {
  reverse_proxy localhost:3001
}
```

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

### Online-Bildersuche im Admin-Bereich (Google)

Beim Anlegen/Bearbeiten einer Eissorte kann im Admin-Bereich statt eines eigenen Fotos auch direkt ein Bild über die Google-Bildersuche gesucht und übernommen werden. Dafür wird die **Google Custom Search JSON API** verwendet (kostenloses Kontingent: 100 Suchanfragen/Tag).

Einrichtung:

1. Im [Google Cloud Console](https://console.cloud.google.com/) ein Projekt anlegen (oder ein bestehendes nutzen) und die **Custom Search API** aktivieren.
2. Unter „APIs & Dienste" → „Anmeldedaten" einen **API-Key** erstellen → das ist `GOOGLE_API_KEY`.
3. Unter [Programmable Search Engine](https://programmablesearchengine.google.com/) eine neue Suchmaschine anlegen:
   - „Im gesamten Web suchen" aktivieren
   - „Bildersuche" aktivieren
   - die Suchmaschinen-ID (`cx`) kopieren → das ist `GOOGLE_CSE_ID`.
4. Beide Werte als Umgebungsvariablen setzen:
   ```bash
   export GOOGLE_API_KEY=dein-api-key
   export GOOGLE_CSE_ID=deine-suchmaschinen-id
   ```
   Bei Docker Compose stattdessen in der `.env`-Datei ergänzen:
   ```
   GOOGLE_API_KEY=dein-api-key
   GOOGLE_CSE_ID=deine-suchmaschinen-id
   ```

Sind die Variablen nicht gesetzt, bleibt die Online-Bildersuche im Admin-Bereich einfach deaktiviert (Fehlermeldung beim Suchen) – der normale Foto-Upload funktioniert davon unabhängig weiter.
