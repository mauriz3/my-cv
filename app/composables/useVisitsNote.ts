import type { Ref } from 'vue'
import type { VisitsReport } from '~~/lib/visits'
import { formatUpdatedAgo } from '~~/lib/updatedAgo'
import { visitsNote, type VisitsNote } from '~~/lib/visitsFilter'

/**
 * Estado de la nota de Visitas (datos reales o de ejemplo) para la página `/visits` y la tarjeta del Inicio:
 * una sola fuente de verdad (`visitsNote`, por el campo `sample` del informe). Cada sitio elige su texto.
 * `updatedAgo`: «Datos actualizados hace X» con datos reales; vacío en otro caso.
 * Se calcula al llegar cada informe (no hace falta que corra el reloj mientras se mira).
 */
export function useVisitsNote(report: Ref<VisitsReport | undefined>, realDataAvailable: Ref<boolean> = ref(false)) {
  const { locale } = useI18n()
  return computed<{ kind: VisitsNote['kind']; updatedAgo: string }>(() => {
    const note = visitsNote(report.value, realDataAvailable.value)
    const updatedAgo =
      note.kind === 'updated' ? formatUpdatedAgo(note.generatedAt, new Date(), locale.value === 'es' ? 'es' : 'en') : ''
    return { kind: note.kind, updatedAgo }
  })
}
