/** Periodo con fechas parciales (`YYYY` o `YYYY-MM`). `end: null` significa «actualidad». */
export interface Period {
  start: string
  end: string | null
}
