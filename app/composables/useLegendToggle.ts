/** Series hidden from an HTML legend (by stable key, not by position). */
export function useLegendToggle() {
  const hiddenKeys = ref<string[]>([])

  const isHidden = (key: string) => hiddenKeys.value.includes(key)

  function toggle(key: string | undefined) {
    if (!key) return
    hiddenKeys.value = isHidden(key)
      ? hiddenKeys.value.filter((hiddenKey) => hiddenKey !== key)
      : [...hiddenKeys.value, key]
  }

  return { isHidden, toggle }
}
