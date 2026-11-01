/** Título del Perfil («Nombre · Perfil»): lo comparten el Inicio y sus enlaces cortos (misma vista previa). */
export function useProfileTitle(): () => string {
  const { t } = useI18n()
  const cv = useCv()
  return () => `${cv.value.fullName} · ${t('nav.profile')}`
}
