# Images

Site images live in `public/` and are served as-is (no image pipeline in the build).

## Formats

- **SVG** for illustrations and charts (inline in components).
- **WebP** for all raster: Projects screenshots (`data/cv.shared.ts` → `projects[].image`), Books covers (`public/books/`, with real `width`/`height` in `books[].cover`), and the avatar `public/me.webp` used by `scripts/og-image.mjs`.
  - Screenshots with text or flat colors: **lossless** WebP (smaller than the original PNG and pixel-identical).
  - Photos and covers: lossy WebP, quality 85.

## Exceptions (not WebP)

| File | Reason |
| --- | --- |
| `og-cv.png` | `og:image` / `twitter:image`: LinkedIn's crawler does not handle WebP well. |
| `favicon.ico` | Browsers request it at `/favicon.ico` even when not linked. |
| `webtele.jpg` | JPEG already compressed: equivalent-quality WebP is heavier (q80: +3%, q85: +20%). |

There is no manifest or `apple-touch-icon`, and PDFs (`scripts/pdf/`) contain no images.

## Rules (enforced by `tests/unit/images.spec.ts`)

- Every referenced image exists in `public/`.
- No unused images in `public/`.
- All raster is WebP except the exceptions above.
- Covers declare their real dimensions.

## Add or change an image

Convert with [sharp](https://sharp.pixelplumbing.com/) or `cwebp`, keeping dimensions (output folder must exist), for example:

```sh
npx --yes sharp-cli@6.1.0 -i screenshot.png -o public/ -f webp --lossless   # screenshot with text
npx --yes sharp-cli@6.1.0 -i cover.jpg -o public/books/ -f webp -q 85     # photo or cover
```

Per image, pick the option that weighs less without visible loss; if WebP is heavier than the original, keep the original and add it to the exceptions (here and in the test).

## Decision (ADR)

**2026-11-07 · Accepted.**
- **Context:** `public/` had unused images and heavy PNG/JPG screenshots.
- **Decision:** Remove unreferenced assets and serve raster as WebP; keep PNG/ICO/JPG only where compatibility or size justify it (exceptions table).
- **Consequences:** Less weight on Projects and Books; a test blocks orphan images or new raster outside exceptions.
