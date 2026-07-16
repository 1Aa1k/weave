# weave

Learn to read a language by reading books that slowly change language.

A book starts in English. Each chapter weaves in ~15 new Japanese words (most
frequent first), shown in indigo with furigana. Words come before text: a
chapter opens for reading only after you finish its FSRS-scheduled flashcards
(its 15 new words plus everything due from earlier chapters), so you always
meet new words as cards first, then in the wild. Click any woven word while
reading for its reading and definition; every click is tracked and front-loads
that word in review. Furigana disappears per-word once its FSRS stability
passes 7 days. By the end of a book you are reading hundreds of Japanese words
in context without crutches.

## Run

```
npm install
npm run dev        # custom server on :5317 (next dev CLI exits when detached; server.js does not)
```

## Add a book

```
npm run weave-book -- <input>            # gutenberg id, url, or .txt path
npm run weave-book -- 55 --slug oz       # flags: --slug --title --lang
```

One command: fetch (Gutenberg header supplies the title), chapterize,
tokenize, resolve the lexicon, schedule introductions, and print a report.
Epub input needs pandoc (`pandoc book.epub -t plain -o book.txt`).

Chapter detection tries heading strategies in confidence order
(`CHAPTER IV.`, `CHAPTER 12`, `Chapter One`, `3. Title`, roman-only,
markdown) with TOC-cluster rejection, and falls back to even ~3000-word
parts when a book has no headings (`scripts/lib/chapterize.ts`).

Word resolution order per lexeme:

1. `data/books/<slug>/lexicon-overrides.json` - book-specific senses
2. `data/lexicon/ja.json` - the global curated lexicon (grows with every
   book; each entry tagged `manual`/`reviewed`)
3. JMdict reverse lookup (skips honorific/humble senses, penalizes
   katakana loanwords) - scheduled auto-picks that are common words or
   weak matches land in `data/books/<slug>/review-queue.json`

The curation loop: read the review queue, put fixes for wrong picks in
`data/lexicon/ja-corrections.json`, then
`npx tsx scripts/promote-reviewed.ts <slug>` folds the queue into the
global lexicon (corrections as `manual`, the rest as `reviewed`) and a
re-run of weave-book rebuilds clean. Coverage compounds: Alice needed a
full audit, Oz reused 47% of it, Peter Pan reused 62% and needed one fix.

JMdict JSON lives at `/data/dicts/jmdict-eng.json` (from
github.com/scriptin/jmdict-simplified, `jmdict-eng` release asset);
override with `$JMDICT`.

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
