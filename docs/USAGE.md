# Usage Guide

## Source

Use `Source` to prepare text before reading.

- `Paste`: paste or edit text directly. Use `Text format` to mark Markdown when headings should become outline entries.
- `Upload`: import local documents.
- `URL`: load one article-like page, or use the advanced section for multiple URLs.
- `Wikipedia`: search English or Spanish Wikipedia, choose an article, and load it as readable Markdown-like text with headings.
- `Library`: load public-domain texts.

Use `Clean text` to remove common markup artifacts. Use `Clear text` to empty the active paste area.

## Reader Modes

- `ORP`: shows one word around an optimal recognition point.
- `Line flow`: keeps surrounding context visible while moving through lines.
- `Chunk`: reads grouped words.
- `Ebook`: fixed pages for natural reading, with one-page or two-page layout.

Default speeds:

- ORP: 300 WPM
- Line flow: 280 WPM
- Ebook: 280 WPM
- Chunk: 200 WPM

## Navigation

Use the reading progress slider and page input to move through the text. Search, outline, line navigator, sentence/paragraph jumps, and bookmarks provide more precise navigation.

Keyboard shortcuts:

- `Space` / `K`: play or pause.
- `ArrowRight` / `ArrowLeft`: next or previous word in ORP, Line flow, and Chunk.
- `ArrowRight` / `ArrowLeft` in Ebook: next or previous page. Two-page layout advances two pages.
- `[` / `]`: decrease or increase WPM.
- `F`: focus Reader search.
- `Esc`: exit Zen.

## Ebook

Ebook mode uses fixed-height pages and conservative pagination so content moves to the next page instead of being clipped. It supports one-page and two-page layouts, portrait and landscape single-page orientation, automatic highlight, automatic page advance, and an optional line marker that follows the active reading line.

Landscape is intended for wide reading: the app page uses the available container width while preserving page margins and original paragraph breaks.

## Sessions

Sessions store the current text, metadata, settings, progress, theme, language, and bookmarks in the browser. There is no cloud sync in this version.

## Troubleshooting

- If a URL does not import cleanly, paste the text manually. Some websites block extraction or render content after page load.
- If the outline is noisy, use Markdown headings in pasted text and set `Text format` to `Markdown`.
- If text storage reaches browser limits, save smaller sessions or clear local data from Settings.
