/** Una sola vez por visita, antes de montar la app: animaciones desde `<html>` y escucha del sistema. */
export default defineNuxtPlugin(() => {
  startAnimationsSync()
})
