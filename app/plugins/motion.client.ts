/** Once per visit, before assembling the app: animations from `<html>` and listening to the system. */
export default defineNuxtPlugin(() => {
  startAnimationsSync()
})
