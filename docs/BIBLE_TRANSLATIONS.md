# Bible translations in Biblia AI

## Bundled full Bible (production)

The app ships the **complete dual-language library** (~31k verses × 2 languages, ~11 MB total JSON):

| Locale code | Translation | Label | Asset |
|-------------|-------------|-------|-------|
| `en` | King James Version (1769) | KJV | `assets/bible-full-en.json` (31,100 verses) |
| `pl` | Biblia Gdańska (1881 revision) | Biblia Gdańska (1881) | `assets/bible-full-pl.json` (31,073 verses) |

Legacy demo slices (`assets/bible-seed-en.json`, 94 verses) remain for tooling only.

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
# Full EN + PL assets (network for PL)
node scripts/prepare-full-bible-seed.mjs

# Polish only from midvash raw GitHub
node scripts/import-polish-bible.mjs --midvash --full --output assets/bible-full-pl.json

# English from bundled KJV source
node scripts/convert-kjv-source.mjs --output assets/bible-full-en.json

# Legacy mobile demo slices (94 verses)
node scripts/prepare-bilingual-seed.mjs
```

After changing seed files, clear `@biblia-ai/full-bible-imported-v1` or use **Settings → Advanced → Clear Scripture library data**.

## SQLite schema (v3)

Table `verses` includes `translation` (`en` | `pl`) with unique `(chapter_id, number, translation)`.

Query API: `scriptureRepository.getVersesByChapterId(chapterId, translation)`.

User preference: `translationStore` — `auto` follows UI locale (`pl` → Polish text, `en` → KJV).
