export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brand',
      secondary: 'amber',
      neutral: 'graphite',
      success: 'green',
      warning: 'yellow',
      error: 'red'
    },
    button: {
      // Tono brand-hover (800 claro / 300 oscuro) en vez del primary por defecto: mantiene el contraste AA (≥ 4,5:1).
      compoundVariants: [
        { color: 'primary', variant: 'solid', class: 'hover:bg-(--brand-hover) active:bg-(--brand-hover)' },
        { color: 'primary', variant: 'soft', class: 'text-(--brand-hover)' }
      ]
    }
  }
})
