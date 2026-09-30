# PokéScan

Skanna Pokémon-kort och se vad de är värda i kronor. Kortdata och Cardmarket-priser kommer från [TCGdex](https://tcgdex.dev) (gratis, ingen nyckel), omräknade till SEK med dagens kurs.

## Ladda ner appen (Android)

Gå till **Releases** till höger och ladda ner `PokeScan.apk`. Öppna filen på telefonen och tillåt installation av okända appar när Android frågar.

Varje gång något ändras i `main` bygger GitHub Actions en ny APK automatiskt.

## Webbversion

Publiceras via GitHub Pages. Öppna adressen i mobilens webbläsare för att använda kameran utan att installera något.

## Struktur

- `www/` – själva appen (HTML, ikoner, manifest)
- `.github/workflows/build-apk.yml` – bygger APK med Capacitor
- `.github/workflows/pages.yml` – publicerar webbversionen
