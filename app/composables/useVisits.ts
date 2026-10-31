import { visitsEndpoint, type VisitsRange, type VisitsReport } from '~~/lib/visits'

export type VisitsStatus = 'loading' | 'ready' | 'error'

/**
 * Informe de visitas de un rango. ÚNICO punto del cliente que sabe de dónde salen los datos:
 * hoy el JSON prerrenderizado del mock; con Google Analytics, el mismo endpoint servido en vivo.
 * Al cambiar de rango se mantiene el informe anterior hasta que llega el nuevo (las gráficas transicionan).
 */
export function useVisits(range: Ref<VisitsRange>) {
  const report = shallowRef<VisitsReport>()
  const status = ref<VisitsStatus>('loading')
  let latestRequest = 0

  async function load() {
    const request = ++latestRequest
    status.value = 'loading'
    try {
      // `responseType`: el JSON estático se sirve sin extensión y no siempre con su Content-Type.
      const next = await $fetch<VisitsReport>(visitsEndpoint(range.value), { responseType: 'json' })
      if (request !== latestRequest) return // llegó tarde: ya se pidió otro rango
      report.value = next
      status.value = 'ready'
    } catch {
      if (request === latestRequest) status.value = 'error'
    }
  }

  onMounted(load)
  watch(range, load)

  return { report, status, retry: load }
}
