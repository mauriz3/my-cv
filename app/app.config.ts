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
      // Hover de la paleta azul (brand-hover) en vez de la transparencia por defecto: mantiene el contraste AA.
      compoundVariants: [
        { color: 'primary', variant: 'solid', class: 'hover:bg-(--brand-hover) active:bg-(--brand-hover)' }
      ]
    }
  }
})
