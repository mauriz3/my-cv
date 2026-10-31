/** Una sola vez por visita, al terminar de hidratar: estado de movimiento desde `<html>` y escucha del sistema. */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hooks.hookOnce('app:suspense:resolve', startMotionSync)
})
