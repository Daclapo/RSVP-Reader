# RSVP Formatter

RSVP Formatter is a web application for rapid serial visual presentation (RSVP) reading workflows.
It allows importing text from multiple sources, building a structured reading outline, and reading in focused playback modes.

Author: **David Clarkson**

## Overview

This project provides:

- A **Source Workspace** to prepare content from:
  - pasted text
  - uploaded files (txt, md, html, pdf, doc, docx, odt, epub)
  - one or more URLs
  - a built-in public-domain library
- A **Reader Mode** focused on reading flow with:
  - ORP word mode
  - Line flow mode
  - Chunk mode
- Outline extraction and synchronized navigation
- Playback controls with speed and style settings
- Theme presets and saved preferences

## Current Scope

PWA/offline installation is intentionally disabled in this version.
A PWA implementation can be added in a future iteration.

## Requirements

- Node.js 20+ (recommended: latest LTS)
- npm 10+

## Install

### New machine

```bash
git clone https://github.com/Daclapo/RSVP-Formatter.git
cd rsvp-formatter
npm install
```

### Update existing local copy

```bash
git pull
npm install
```

## Run

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

Lint:

```bash
npm run lint
```

## How to Use

### 1) Prepare text in Source Workspace

- **Paste**: write directly in the editor
- **Upload**: import multiple files, review extracted results, then append or replace editor text
- **URL**: queue one URL per line, import all, then append or replace editor text
- **Library**: load a public-domain book

### 2) Configure playback

Use playback controls to set:

- reading mode (ORP / line flow / chunk)
- WPM speed
- font family and text metrics
- visual colors for reader background/text

### 3) Open Reader Mode

In Reader Mode you can:

- play and pause reading
- search lines
- jump via outline
- use Zen mode for distraction-free playback

## Keyboard Shortcuts

- `Space` / `K`: play or pause
- `ArrowLeft`: previous step
- `ArrowRight`: next step
- `[` and `]`: decrease/increase WPM
- `F` (Reader Mode): toggle find
- `Esc`: exit Zen or close Reader panels

## Project Structure

- `src/app/page.tsx`: main UI workflow (workspace + reader)
- `src/components/`: feature components
- `src/components/ui/`: reusable UI primitives
- `src/lib/reader/parse.ts`: parsing and outline mapping
- `src/lib/reader/file-extract.ts`: multi-format file extraction
- `src/app/api/proxy/route.ts`: URL content extraction endpoint

## Notes on File Extraction

- `docx`, `pdf`, `odt`, and `epub` are parsed with best-effort extraction.
- Legacy binary `doc` files are best-effort and may require conversion to `docx` for better results.
- Complex formatting is flattened into reading text intentionally.

## License

MIT. See `LICENSE`.
