# Bible translations in Biblia AI

## Bundled mobile seed (demo)

The app ships a **small dual-language sample** for offline demo (~94 verses × 2 languages, ~40 KB total):

| Locale code | Translation | Label | Chapters |
|-------------|-------------|-------|----------|
| `en` | King James Version (1769) | KJV | Genesis 1, Psalms 23, John 1, Romans 8:26–31 |
| `pl` | Biblia Gdańska (1881 revision) | Biblia Gdańska (1881) | Same slices |

Assets: `assets/bible-seed-en.json`, `assets/bible-seed-pl.json`.

## Polish source — public domain

**Primary source:** [midvash/bible-data — `versions/pl/bg`](https://github.com/midvash/bible-data/tree/main/versions/pl/bg)

- **Name:** Biblia Gdańska (1881 revision)
- **License:** Public domain (original 1632 Gdańska; 1881 revision)
- **Also documented:** [CrossWire SWORD `PolGdanska`](https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=PolGdanska) — DistributionLicense: Public Domain

**Not bundled (copyright):** NPWG, UBG 2017, NOWA Biblia Gdańska 2012 — do not import without explicit license.

## English source — public domain

**Bundled:** King James Version (KJV) — public domain.

## Import scripts

```bash
# Polish mobile seed from midvash GitHub (94 verses)
node scripts/import-polish-bible.mjs --midvash

# Full Polish Bible (all 66 books) — large; do not commit without approval
node scripts/import-polish-bible.mjs --midvash --full --output assets/bible-seed-pl-full.json

# Build both EN + PL mobile seeds
node scripts/prepare-bilingual-seed.mjs

# Full KJV pipeline (existing)
node scripts/prepare-bible-seed.mjs path/to/kjv-full.json
node scripts/create-mobile-seed.mjs path/to/kjv-full.json
```

After changing seed files, clear `@biblia-ai/db-seeded` in AsyncStorage or use **Settings → Advanced → Clear Scripture library data**.

## SQLite schema (v3)

Table `verses` includes `translation` (`en` | `pl`) with unique `(chapter_id, number, translation)`.

Query API: `scriptureRepository.getVersesByChapterId(chapterId, translation)`.

User preference: `translationStore` — `auto` follows UI locale (`pl` → Polish text, `en` → KJV).
