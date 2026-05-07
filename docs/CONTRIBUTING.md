# Contributing

Useful contribution areas:

- Better public-domain library entries.
- Text extraction and cleanup improvements.
- Reader mode polish, especially Ebook pagination, line marker behavior, and mobile Zen.
- Keyboard and mobile accessibility.
- Documentation.
- Tests for parser, cleanup, sessions, and playback timing.

Before opening a pull request:

```bash
npm run lint
npm run build
```

Keep the app local-first unless a future roadmap explicitly adds backend sync.

## Source Guidelines

Only add built-in library items that are clearly public domain or Creative Commons compatible for redistribution/linking. Prefer stable text URLs from Project Gutenberg, Wikisource, Internet Archive, or official public-domain repositories.

## Documentation Screenshots

Screenshots referenced by the README should live in `docs/img/` and use the exact filenames listed there. This keeps the GitHub landing page useful even before someone opens the app.
