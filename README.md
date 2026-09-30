# KortKoll

Skanna samlarkort och se vad de är värda i kronor. Kortdata och Cardmarket-priser kommer från [TCGdex](https://tcgdex.dev) (gratis, ingen nyckel), omräknade till SEK med dagens kurs.

## Ladda ner appen (Android)

Gå till **Releases** till höger och ladda ner `KortKoll.apk`. Öppna filen på telefonen och tillåt installation av okända appar när Android frågar.

Varje gång något ändras i `main` bygger GitHub Actions en ny APK automatiskt.

## Webbversion (valfritt)

Filerna i `www/` kan läggas på valfri https-sida (t.ex. Netlify Drop) om du vill använda appen i webbläsaren.

## Bildmatchning (gratis, utan AI)

Appen jämför kortets konstverk med ett index av bildfingeravtryck (`www/hashes.*`), så den hittar kortet även när fotot är suddigt. Indexet byggs av workflowet **Bygg kortindex** (Actions, kör för hand en gång, sedan varje månad) från gratis TCGdex-bilder och startar därefter APK-bygget. Utan indexet fungerar appen som förut med textläsning.

## Offline och integritet

Textläsaren (Tesseract), dess språkdata och typsnitten ligger i appen (`www/vendor`, `www/fonts`), så inget hämtas från CDN eller Google. Appen pratar bara med TCGdex (kortdata och priser), pokemontcg.io (reservkälla när TCGdex saknar pris), Frankfurter (växelkurser), PokeAPI (Pokédex-info) och GitHub (Pokémon-bilder), och bara när de behövs.

## Publicera på Google Play

1. **Skapa en uppladdningsnyckel** (en gång): `keytool -genkeypair -keystore kortkoll-upload.jks -storetype PKCS12 -alias pokescan -keyalg RSA -keysize 2048 -validity 10000`. Spara filen och lösenorden säkert. Den får aldrig checkas in.
2. **Lägg in fyra hemligheter** under Settings > Secrets and variables > Actions:
   `ANDROID_KEYSTORE_BASE64` (`base64 -w0 kortkoll-upload.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
3. **Kör workflowet** *Bygg för Google Play* (Actions > Run workflow). Det bygger en signerad AAB (`KortKoll.aab`) och en signerad APK, och lägger dem som en pre-release.
4. **Ladda upp `KortKoll.aab`** i Play Console. Slå på Play App Signing när Google frågar (då är din nyckel bara uppladdningsnyckel och kan återställas).
5. Fyll i integritetspolicy, dataskyddsformulär, innehållsbetyg och butikssida. Namn och ikon är egna och innehåller inga Pokémon-varumärken.

Versionskoden (`versionCode`) är körningsnumret, så den ökar för varje bygge. Målversionen (target SDK) kommer från Capacitor 8 (Android 16 / API 36).

## Struktur

- `www/` – själva appen (HTML, ikoner, manifest, `fingerprint.js`)
- `tools/build-hashes.mjs` – bygger kortindexet
- `.github/workflows/build-apk.yml` – bygger APK med Capacitor
