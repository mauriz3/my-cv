/** Profile Title (“Name · Profile”): shared by Home and its short links (same preview). */
export function useProfileTitle(): () => string {
  const { t } = useI18n()
  const cv = useCv()
  return () => `${cv.value.fullName} · ${t('nav.profile')}`
}
