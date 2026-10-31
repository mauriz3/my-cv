/**
 * Visibilidad del aviso de analítica, compartida entre el aviso y el enlace del pie «Preferencias de analítica».
 * `reopen()` lo vuelve a mostrar y pide llevar el foco a él (la persona lo ha abierto a propósito).
 */
export function useConsentBanner() {
  const isOpen = useState('consent-banner-open', () => false)
  const wantsFocus = useState('consent-banner-focus', () => false)

  function reopen() {
    wantsFocus.value = true
    isOpen.value = true
  }

  return { isOpen, wantsFocus, reopen }
}
