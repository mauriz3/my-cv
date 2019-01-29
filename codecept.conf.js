exports.config = {
  tests: './test/e2e/*_test.js',
  output: './test/e2e/output',
  helpers: {
    Puppeteer: {
      url: 'http://localhost:3000/',
      show: false
    }
  },
  include: {
    I: './test/e2e/steps_file.js'
  },
  bootstrap: null,
  mocha: {},
  name: 'my-cv'
}
