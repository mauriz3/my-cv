/**
 * Visibility of the analytics prompt, shared between the prompt and the “Analytics Preferences” footer link.
 * `reopen()` shows it again and asks to bring the spotlight to it (the person has opened it on purpose).
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
