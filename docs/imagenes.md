# Imágenes

Las imágenes del sitio viven en `public/` y se sirven tal cual (sin pipeline de imágenes en el build).

## Formatos

- **SVG** para ilustraciones y gráficos (inline en los componentes).
- **WebP** para todo ráster: capturas de Proyectos (`data/cv.shared.ts` → `projects[].image`), portadas de Libros (`public/books/`, con `width`/`height` reales en `books[].cover`) y el avatar `public/me.webp` que usa `scripts/og-image.mjs`.
  - Capturas con texto o colores planos: WebP **sin pérdida** (pesa menos que el PNG original y no cambia ni un píxel).
  - Fotos y portadas: WebP con pérdida, calidad 85.

## Excepciones (no WebP)

| Fichero | Motivo |
| --- | --- |
| `og-cv.png` | `og:image` / `twitter:image`: el rastreador de LinkedIn no admite bien WebP. |
| `favicon.ico` | Los navegadores lo piden en `/favicon.ico` aunque no se enlace. |
| `webtele.jpg` | JPEG ya comprimido: su WebP con calidad equivalente pesa más (q80: +3 %, q85: +20 %). |

No hay manifest ni `apple-touch-icon`, y los PDF (`scripts/pdf/`) no llevan imágenes.

## Reglas (las comprueba `tests/unit/images.spec.ts`)

- Toda imagen referenciada existe en `public/`.
- No hay imágenes sin usar en `public/`.
- Todo ráster es WebP salvo las excepciones de arriba.
- Las portadas declaran sus medidas reales.

## Añadir o cambiar una imagen

Convierte con [sharp](https://sharp.pixelplumbing.com/) o `cwebp` manteniendo las dimensiones (la carpeta de salida debe existir), por ejemplo:

```sh
npx --yes sharp-cli@6.1.0 -i captura.png -o public/ -f webp --lossless   # captura con texto
npx --yes sharp-cli@6.1.0 -i portada.jpg -o public/books/ -f webp -q 85     # foto o portada
```

Elige por imagen la opción que pese menos sin pérdida visible; si el WebP pesa más que el original, deja el original y añádelo a las excepciones (aquí y en el test).

## Decisión (ADR)

**2026-11-07 · Aceptada.**
- **Contexto:** `public/` acumulaba imágenes sin usar y capturas PNG/JPG pesadas.
- **Decisión:** Borrar lo no referenciado y servir los ráster en WebP; mantener PNG/ICO/JPG solo donde la compatibilidad o el peso lo justifican (tabla de excepciones).
- **Consecuencias:** Menos peso en Proyectos y Libros; un test impide imágenes huérfanas o ráster nuevos fuera de las excepciones.
