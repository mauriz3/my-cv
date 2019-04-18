<template>
  <v-container grid-list-xl>
    <v-layout
      flex-child
      wrap
    >
      <v-flex
        xs12
        md8
        d-flex
      >
        <v-layout wrap>
          <v-flex xs12>
            <v-sheet
              class="d-flex"
              color="green lighten-3"
              min-height="420"
            >
              <v-stepper v-model="e1">
                <v-stepper-header>
                  <v-stepper-step :complete="e1 > 1" step="1">
                    Frontend
                  </v-stepper-step>

                  <v-divider />

                  <v-stepper-step :complete="e1 > 2" step="2">
                    Designer
                  </v-stepper-step>

                  <v-divider />

                  <v-stepper-step step="3">
                    DevOps
                  </v-stepper-step>
                </v-stepper-header>

                <v-stepper-items>
                  <v-stepper-content step="1">
                    <v-card
                      class="mb-3"
                      min-height="200px"
                    >
                      <v-img
                        src="frontend.png"
                        aspect-ratio="3.2"
                      />
                      <v-card-text>
                        <div>
                          I am a <a href="https://developers.google.com/web/progressive-web-apps/" target="_blank">
                            PWA
                          </a>, <a href="https://en.wikipedia.org/wiki/Content_management_system" target="_blank">
                            CMS
                          </a>, and dashboards developer. Working with serverless and <a href="https://jamstack.org/" target="_blank">
                            JAMstack
                          </a> architecture at the present. <strong>Experience</strong>: <strong class="primary--text">
                            2 years
                          </strong>.
                        </div>
                      </v-card-text>
                    </v-card>

                    <v-btn
                      class="mt-2"
                      color="primary"
                      @click="e1 = 2"
                    >
                      Continue
                    </v-btn>
                  </v-stepper-content>

                  <v-stepper-content step="2">
                    <v-card
                      class="mb-3"
                      min-height="200px"
                    >
                      <v-img
                        src="design.png"
                        aspect-ratio="3.2"
                      />
                      <v-card-text>
                        <div>
                          Creative thinking + <a href="https://www.interaction-design.org/literature/topics/ux-design" target="_blank">
                            UX
                          </a> + prototyping = Minimum Viable Product. <strong>Experience:</strong> <strong class="primary--text">
                            1 years
                          </strong>.
                        </div>
                      </v-card-text>
                    </v-card>

                    <v-btn
                      class="mt-2"
                      color="primary"
                      @click="e1 = 3"
                    >
                      Continue
                    </v-btn>
                  </v-stepper-content>

                  <v-stepper-content step="3">
                    <v-card
                      class="mb-3"
                      min-height="200px"
                    >
                      <v-img
                        src="devops.png"
                        aspect-ratio="3.2"
                      />
                      <v-card-text>
                        <div>
                          I can create and maintain your <a href="https://www.mabl.com/blog/what-is-cicd" target="_blank">
                            CI / CD pipeline
                          </a>. In addition to automating processes using the configuration as a code. <strong>Experience</strong>: <strong class="primary--text">
                            2 years
                          </strong>.
                        </div>
                      </v-card-text>
                    </v-card>
                    <v-btn
                      class="mt-2"
                      color="primary"
                      @click="e1 = 1"
                    >
                      Continue
                    </v-btn>
                  </v-stepper-content>
                </v-stepper-items>
              </v-stepper>
            </v-sheet>
          </v-flex>
          
          <v-flex xs12>
            <v-sheet
              class="d-flex elevation-1"
              min-height="150"
            >
              <v-card min-height="100px" flat>
                <div 
                  class="headline text-xs-center pt-4"
                  color="teal"
                >
                  {{ bottomNav }}
                </div>
                <v-bottom-nav
                  :active.sync="bottomNav"
                  :value="true"
                  absolute
                >
                  <v-btn
                    color="teal"
                    flat
                    value="B2"
                  >
                    <span>English</span>
                    <v-icon>history</v-icon>
                  </v-btn>

                  <v-btn
                    color="teal"
                    flat
                    value="C2"
                  >
                    <span>Spanish</span>
                    <v-icon>place</v-icon>
                  </v-btn>

                  <v-btn
                    color="teal"
                    flat
                    value="B1"
                  >
                    <span>Italian</span>
                    <v-icon>favorite</v-icon>
                  </v-btn>
                </v-bottom-nav>
              </v-card>
            </v-sheet>
          </v-flex>
        </v-layout>
      </v-flex>

      <v-flex
        xs12
        md4
        d-flex
      >
        <v-sheet
          class="d-flex elevation-1"
          min-height="600"
        >
          <v-card>
            <v-card-title primary-title class="pt-4 pb-0">
              <v-spacer />
              <h2>
                Tools & Technologies
              </h2>
              <v-spacer />
            </v-card-title>
            <v-card-text>
              <v-container fluid grid-list-sm>
                <v-layout row wrap>
                  <v-flex v-for="i in 15" :key="i" xs4>
                    <v-img :src="`${i}.png`" alt="tech" width="100%" height="100%" />
                  </v-flex>
                </v-layout>
              </v-container>
            </v-card-text>
          </v-card>
        </v-sheet>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      e1: 0,
      bottomNav: 'B2'
    }
  }
}
</script>
