/** Colores ya resueltos del tema para Chart.js (pinta en canvas y no entiende `var(--x)`). */
export interface ChartTheme {
  /** Series s1…s5: brand, ámbar, verde azulado, magenta y grafito (periodo anterior). */
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
    sequential: token('--brand-vivid'),
    grid: token('--ui-border'),
    text: token('--ui-text'),
    muted: token('--ui-text-muted'),
    surface: token('--ui-bg-elevated'),
    font: getComputedStyle(document.body).fontFamily,
  }
}

/**
 * Tema de las gráficas: se lee al montar y de nuevo al cambiar claro/oscuro.
 * `theme` vale `undefined` hasta montar (en el servidor no hay estilos que leer).
 * `updateMode` («none» justo tras cambiar de tema): los colores cambian sin animación.
 */
export function useChartTheme() {
  const colorMode = useColorMode()
  const theme = shallowRef<ChartTheme>()
  const updateMode = ref<'none' | 'default'>('default')

  onMounted(() => {
    theme.value = readChartTheme()
    // La clase `.dark` cambia tras el render: esperamos al siguiente tick para leer los tokens nuevos.
    watch(
      () => colorMode.value,
      async () => {
        await nextTick()
        updateMode.value = 'none'
        theme.value = readChartTheme()
        // vue-chartjs actualiza en el tick siguiente al cambio de props; después se vuelve a animar.
        await nextTick()
        await nextTick()
        updateMode.value = 'default'
      },
    )
  })

  return { theme, updateMode }
}
