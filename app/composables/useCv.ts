import { getCv } from '~~/data/cv'
import type { Locale } from '~~/data/schema'

/** Contenido del CV en el idioma activo. */
export function useCv() {
  const { locale } = useI18n()
  return computed(() => getCv(locale.value as Locale))
}
