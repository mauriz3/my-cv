/** Resolved theme colors for Chart.js (canvas cannot use `var(--x)`). */
export interface ChartTheme {
  /** Series s1…s5: brand, amber, teal, magenta and graphite (previous period). */
  series: [string, string, string, string, string]
  /** Escala secuencial del mapa y del mapa de calor (con opacidad). */
  sequential: string
  grid: string
  text: string
  muted: string
  surface: string
  font: string
}

function readChartTheme(): ChartTheme {
  const rootStyle = getComputedStyle(document.documentElement)
  const token = (name: string) => rootStyle.getPropertyValue(name).trim()
  return {
    series: [token('--ui-primary'), token('--chart-2'), token('--chart-3'), token('--chart-4'), token('--chart-5')],
    sequential: token('--chart-sequential'),
    grid: token('--ui-border'),
    text: token('--ui-text'),
    muted: token('--ui-text-muted'),
    surface: token('--ui-bg-elevated'),
    font: getComputedStyle(document.body).fontFamily,
  }
}

/**
 * Theme of the graphs: it is read when mounting and again when changing light/dark.
 * `theme` is worth `undefined` until mounted (on the server there are no styles to read).
 * `updateMode` (`none' just after theme change): colors change without animation.
 */
export function useChartTheme() {
  const colorMode = useColorMode()
  const theme = shallowRef<ChartTheme>()
  const updateMode = ref<'none' | 'default'>('default')

  onMounted(() => {
    theme.value = readChartTheme()
    // `.dark` toggles after render: wait one tick before reading updated tokens.
    watch(
      () => colorMode.value,
      async () => {
        await nextTick()
        updateMode.value = 'none'
        theme.value = readChartTheme()
        // vue-chartjs updates in the tick following the props change, then animates again.
        await nextTick()
        await nextTick()
        updateMode.value = 'default'
      },
    )
  })

  return { theme, updateMode }
}
