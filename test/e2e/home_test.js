// eslint-disable-next-line no-undef
Feature('Welcome msg')

// eslint-disable-next-line no-undef
Scenario('test something', I => {
  I.amOnPage('http://localhost:3000')
  I.dontSee('swretrtg')
  I.see('Welcome to the Vuetify + Nuxt.js template')
  I.click('Continue')
  I.see('First, solve the problem. Then, write the code.')
})
