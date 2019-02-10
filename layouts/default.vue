<template>
  <v-app :dark="dark">
    <v-navigation-drawer
      v-model="drawer"
      :mini-variant="miniVariant"
      :clipped="clipped"
      :width="210"
      fixed
      app
    >
      <v-list class="pa-1">
        <v-list-tile avatar>
          <v-list-tile-avatar>
            <img src="/me.png">
          </v-list-tile-avatar>

          <v-list-tile-content>
            <v-list-tile-title>Maurizio Rendon</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
      <v-divider></v-divider>
      <v-list>
        <v-list-tile
          v-for="(item, i) in items"
          :key="i"
          :to="item.to"
          router
          exact
        >
          <v-list-tile-action>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title v-text="item.title" />
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>
    <v-toolbar
      :clipped-left="clipped"
      fixed
      app
    >
      <v-toolbar-side-icon @click="drawer = !drawer" />
      <v-btn
        icon
        v-if="this.$vuetify.breakpoint.lgAndUp"
        @click.stop="miniVariant = !miniVariant"
      >
        <v-icon>{{ `chevron_${miniVariant ? 'right' : 'left'}` }}</v-icon>
      </v-btn>
      <v-btn
        icon
        v-if="this.$vuetify.breakpoint.lgAndUp"
        @click.stop="clipped = !clipped"
      >
        <v-icon>web</v-icon>
      </v-btn>
      <v-btn
        icon
        @click.stop="dark = !dark"
      >
        <v-icon>brightness_6</v-icon>
      </v-btn>
      <v-toolbar-title v-text="title" />
    </v-toolbar>
    <v-content>
      <v-container>
        <nuxt />
      </v-container>
    </v-content>
    <v-navigation-drawer
      v-model="rightDrawer"
      :right="right"
      temporary
      fixed
    >
      <v-list>
        <v-list-tile @click.native="right = !right">
          <v-list-tile-action>
            <v-icon light>
              compare_arrows
            </v-icon>
          </v-list-tile-action>
          <v-list-tile-title>Switch drawer (click me)</v-list-tile-title>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>
    <v-footer
      inset="inset"
      app
      height="auto"
    >
      <v-card
        class="flex"
        flat
        tile
      >
        <!-- <v-card-title class="primary">
          <v-spacer></v-spacer>
          <a rel="license" href="https://creativecommons.org/licenses/by-nc-nd/4.0/"><img alt="Licencia de Creative Commons" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-nd/4.0/88x31.png" /></a>
          <strong class="subheading">Get connected with us on social networks!</strong>
          <v-spacer></v-spacer>
          <v-btn
            v-for="icon in icons"
            :key="icon"
            class="mx-3"
            dark
            icon
          >
            <v-icon size="24px">{{ icon }}</v-icon>
          </v-btn>
        </v-card-title> -->

        <v-card-actions class="justify-center">
          &copy;{{ new Date().getFullYear() }} - mauriz3
        </v-card-actions>
      </v-card>
    </v-footer>
    <!-- <v-footer class="pa-3">
      <v-spacer></v-spacer>
      <div>&copy; {{ new Date().getFullYear() }}</div>
      <a rel="license" href="https://creativecommons.org/licenses/by-nc-nd/4.0/"><img alt="Licencia de Creative Commons" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-nd/4.0/88x31.png" /></a>
    </v-footer> -->
  </v-app>
</template>

<script>
export default {
  data() {
    return {
      dark: false,
      clipped: false,
      drawer: true,
      inset: false,
      icons: ['fab fa-linkedin'],
      items: [
        {
          icon: 'person',
          title: 'About Me',
          to: '/'
        },
        {
          icon: 'work',
          title: 'Experience',
          to: '/experience'
        },
        {
          icon: 'school',
          title: 'Education',
          to: '/education'
        }
      ],
      miniVariant: false,
      right: true,
      rightDrawer: false,
      title: 'My Resume'
    }
  }
}
</script>

<style>
footer .theme--dark.v-sheet {
  background-color: #212121 !important;
}
footer .theme--light.v-sheet,
.theme--light.v-footer {
  background-color: #fafafa !important;
}
</style>
