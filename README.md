# weave

Learn to read a language by reading books that slowly change language.

A book starts in English. Each chapter weaves in ~15 new Japanese words (most
frequent first), shown in indigo with furigana. Click any woven word for its
reading and definition; every click is tracked. Finishing a chapter's
FSRS-scheduled flashcards (its 15 new words plus everything due from earlier
chapters) unlocks the next chapter, which weaves in 15 more. Furigana
disappears per-word once its FSRS stability passes 7 days. By the end of a
book you are reading hundreds of Japanese words in context without crutches.

## Run

```
npm install
npm run dev        # custom server on :5317 (next dev CLI exits when detached; server.js does not)
```

## Add a book

```
npx tsx scripts/ingest.ts path/to/book.txt <slug> "Title" data/raw/en_50k.txt
npx tsx scripts/build-lexicon.ts <slug> /data/dicts/jmdict-eng.json
```

Ingest handles Project Gutenberg plain text (strips boilerplate, splits on
`CHAPTER <roman>.` headings). Other formats need a chapter-splitter tweak in
`scripts/ingest.ts`.

The lexicon builder reverse-looks-up JMdict (skipping honorific/humble senses
and penalizing katakana loanwords) and schedules introductions. Auto-picks are
imperfect for polysemous words - audit `vocab.json` + `lexicon.json` and put
corrections in `data/books/<slug>/lexicon-overrides.json` (see alice's for the
format), then re-run build-lexicon. Alice ships with 107/180 hand-curated
entries.

JMdict JSON lives at `/data/dicts/jmdict-eng.json` (from
github.com/scriptin/jmdict-simplified, `jmdict-eng` release asset).

## Layout

- `scripts/ingest.ts` - book text -> tokenized chapters + candidate lexemes
- `scripts/build-lexicon.ts` - JMdict lookup + introduction schedule
- `data/books/<slug>/` - chapters/, meta, vocab, lexicon (committed; regenerable)
- `src/lib/` - db (better-sqlite3, `data/weave.db`), srs (ts-fsrs), book loading
- `src/app/` - library, `/read/[slug]/[n]`, `/review/[slug]/[n]`, api routes
- `server.js` - custom Next server entrypoint
- `tests/` - vitest (`npm test`); pool=forks because better-sqlite3 crashes worker threads

## Future direction

- Grammar-stage weaving: chapter files carry token-level annotations, so
  phrase-level swap units (word order, particles) can be added to the same
  format without reprocessing.
- Chinese: same pipeline with CC-CEDICT + pinyin; `language` field in meta.json
  is already per-book.
- Cloze/sentence cards using the book sentence the word appeared in.
