# Wikipedia Source Evaluation

Wikipedia is implemented as a dedicated Source tab.

## Possible Flow

1. Search with the MediaWiki `opensearch` API.
2. Let the user choose a result.
3. Load selected content with the REST page endpoint, page summary endpoint, or parse API.
4. Convert HTML/sections to readable text or Markdown.
5. Keep title, language, URL, and warnings in source metadata.

## Risks

- API limits and user-agent expectations.
- Different languages and redirects.
- Disambiguation pages.
- Tables, infoboxes, references, captions, and citation markers.
- Very long pages that need section selection or cleanup.

## Current Scope

The app supports English and Spanish Wikipedia search, article selection, article loading, cleanup, and Markdown-like headings for navigation. Future work can add section selection, references toggles, and more languages.
