# PokéScan

Skanna Pokémon-kort och se vad de är värda i kronor. Kortdata och Cardmarket-priser kommer från [TCGdex](https://tcgdex.dev) (gratis, ingen nyckel), omräknade till SEK med dagens kurs.

## Ladda ner appen (Android)

Gå till **Releases** till höger och ladda ner `PokeScan.apk`. Öppna filen på telefonen och tillåt installation av okända appar när Android frågar.

Varje gång något ändras i `main` bygger GitHub Actions en ny APK automatiskt.

## Webbversion (valfritt)

Filerna i `www/` kan läggas på valfri https-sida (t.ex. Netlify Drop) om du vill använda appen i webbläsaren.

## Bildmatchning (gratis, utan AI)

Appen jämför kortets konstverk med ett index av bildfingeravtryck (`www/hashes.*`), så den hittar kortet även när fotot är suddigt. Indexet byggs av workflowet **Bygg kortindex** (Actions, kör för hand en gång, sedan varje månad) från gratis TCGdex-bilder och startar därefter APK-bygget. Utan indexet fungerar appen som förut med textläsning.

## Struktur

- `www/` – själva appen (HTML, ikoner, manifest, `fingerprint.js`)
- `tools/build-hashes.mjs` – bygger kortindexet
- `.github/workflows/build-apk.yml` – bygger APK med Capacitor
