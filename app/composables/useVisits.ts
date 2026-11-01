import { visitsEndpoint, type VisitsReport } from '~~/lib/visits'
import {
  SAMPLE_FILTER,
  SAMPLE_RANGE,
  dataStateOf,
  rangeOfFilter,
  type VisitsDataState,
  type VisitsFilter,
} from '~~/lib/visitsFilter'

export type VisitsStatus = 'loading' | 'ready' | 'error'

/**
 * Informe de visitas de un filtro. ÚNICO punto del cliente que pide los datos: `/api/visits/:range`
 * (en Netlify, la instantánea de GA4 o el mock; en local y como respaldo, el JSON prerrenderizado del mock).
 * «Datos de ejemplo» no depende de la API: el mock se genera en el navegador con `buildMockReport`, que se carga
 * en diferido (chunk aparte, solo cuando se elige ese filtro).
 * Al cambiar de filtro se mantiene el informe anterior hasta que llega el nuevo (las gráficas transicionan).
 * `dataState`: de dónde salió la última respuesta (`real`, `sample` o `failed`); `undefined` hasta la primera.
 */
export function useVisits(filter: Ref<VisitsFilter>) {
  const report = shallowRef<VisitsReport>()
  const status = ref<VisitsStatus>('loading')
  const dataState = ref<VisitsDataState>()
  let latestRequest = 0

  async function fetchReport(selected: VisitsFilter): Promise<unknown> {
    if (selected === SAMPLE_FILTER) return (await import('~~/lib/visitsMock')).buildMockReport(SAMPLE_RANGE)
    // `responseType`: el JSON estático se sirve sin extensión y no siempre con su Content-Type.
    return $fetch(visitsEndpoint(selected), { responseType: 'json' })
  }

  async function load() {
    const request = ++latestRequest
    const selected = filter.value
    const range = rangeOfFilter(selected)
    status.value = 'loading'
    let response: unknown
    try {
      response = await fetchReport(selected)
    } catch {
      response = undefined
    }
    if (request !== latestRequest) return // llegó tarde: ya se pidió otro filtro
    const state = dataStateOf(response, range)
    dataState.value = state
    if (state === 'failed') {
      status.value = 'error'
      return
    }
    report.value = response as VisitsReport // ya comprobado por `dataStateOf`
    status.value = 'ready'
  }

  onMounted(load)
  watch(filter, load)

  return { report, status, dataState, retry: load }
}
