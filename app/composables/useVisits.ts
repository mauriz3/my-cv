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
 * Report of visits of a filter. SINGLE point of the customer asking for the data: `/api/visits/:range`
 * (in Netlify, the GA4 snapshot or the mock; locally and as a backup, the mock's pre-rendered JSON).
 * Sample data does not hit the API: the browser builds it with `buildMockReport`, loaded on demand
 * (separate chunk, only when that filter is selected).
 * Changing the filter keeps the previous report until the new one arrives (the graphs transition).
 * `dataState`: where the last response came from (`real`, `sample` or `failed`); `undefined` until the first.
 */
export function useVisits(filter: Ref<VisitsFilter>) {
  const report = shallowRef<VisitsReport>()
  const status = ref<VisitsStatus>('loading')
  const dataState = ref<VisitsDataState>()
  let latestRequest = 0

  async function fetchReport(selected: VisitsFilter): Promise<unknown> {
    if (selected === SAMPLE_FILTER) return (await import('~~/lib/visitsMock')).buildMockReport(SAMPLE_RANGE)
    // `responseType`: the static JSON is served without extension and not always with its Content-Type.
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
    if (request !== latestRequest) return // stale: a newer filter request was sent
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
