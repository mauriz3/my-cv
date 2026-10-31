<script setup lang="ts">
import { BOOKS_REVEAL_THRESHOLD, revealDelayMs } from '~~/lib/books'

/**
 * «Libros que recomiendo» (Tanda D): sección del Perfil tras el recorrido, ancla `#books`, sin entrada en el menú.
 * Orden de lectura: h2 → p → ul > li > article (portada → género → h3 → autor → blockquote).
 */
const { t } = useI18n()
const cv = useCv()

const list = ref<HTMLElement | null>(null)
const { state: revealState } = useRevealOnce(list, BOOKS_REVEAL_THRESHOLD)
</script>

<template>
  <section id="books" aria-labelledby="books-title" class="books scroll-mt-6" data-testid="books">
    <h2 id="books-title" class="font-display text-2xl font-bold text-highlighted">{{ t('books.title') }}</h2>
    <p class="mt-2 text-sm text-muted">{{ t('books.intro') }}</p>

    <ul ref="list" class="mt-4 grid gap-4 xl:grid-cols-2" :data-reveal="revealState">
      <li
        v-for="(book, index) in cv.books"
        :key="book.id"
        class="books__item"
        :style="{ '--reveal-delay': `${revealDelayMs(index)}ms` }"
      >
        <article
          :aria-labelledby="`book-${book.id}`"
          class="book h-full rounded-xl border border-default bg-elevated p-4"
          :data-testid="`book-${book.id}`"
        >
          <BookCover :book="book" class="book__cover" />
          <div class="book__heading min-w-0">
            <p class="inline-block rounded-full bg-(--brand-soft) px-2 py-0.5 text-xs font-semibold text-primary">
              {{ book.genre }}
            </p>
            <h3 :id="`book-${book.id}`" class="mt-2 font-display text-lg leading-snug font-bold text-highlighted">
              {{ book.title }}
            </h3>
            <p class="mt-1 text-sm text-muted">{{ book.author }}</p>
          </div>
          <blockquote :lang="cv.locale" class="book__reason border-l-3 border-(--brand-vivid) pl-3 text-sm">
            {{ book.reason }}
          </blockquote>
        </article>
      </li>
    </ul>
  </section>
</template>

<style>
/*
 * Móvil: portada 96 px y título a la derecha; la cita, debajo a ancho completo.
 * Tablet (1 col): portada 128 px a la izquierda de todo. Escritorio (2 col): portada 150 px.
 */
.book {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  grid-template-areas: 'cover heading' 'reason reason';
  column-gap: 1rem;
  row-gap: 1rem;
  align-items: start;
}

.book__cover {
  grid-area: cover;
}

.book__heading {
  grid-area: heading;
}

.book__reason {
  grid-area: reason;
}

@media (min-width: 768px) {
  .book {
    grid-template-columns: 128px minmax(0, 1fr);
    grid-template-areas: 'cover heading' 'cover reason';
    grid-template-rows: auto 1fr;
    column-gap: 1.25rem;
    row-gap: 0.75rem;
  }
}

@media (min-width: 1280px) {
  .book {
    grid-template-columns: 150px minmax(0, 1fr);
  }
}

/* Marco fijo 2:3: el hover mueve solo la cara interior (transform), nunca la maqueta. */
.book-cover {
  aspect-ratio: 2 / 3;
}

.book-cover__face {
  height: 100%;
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.16);
  transition:
    transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.book:hover .book-cover__face {
  box-shadow: 0 10px 22px rgb(0 0 0 / 0.28);
}

/* La elevación solo con movimiento completo; en reducido el hover cambia solo la sombra. */
:root[data-motion='full'] .book:hover .book-cover__face {
  transform: translateY(-4px);
}

/* Entrada (solo transform / opacity, una vez): hasta cruzar el umbral las tarjetas esperan abajo y transparentes. */
:root[data-motion='full'] .books__item {
  transition:
    opacity 600ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--reveal-delay, 0ms);
}

:root[data-motion='full'] [data-reveal='hidden'] > .books__item {
  opacity: 0;
  transform: translateY(16px);
}
</style>
