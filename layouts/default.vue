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
      <v-divider />
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
        v-if="this.$vuetify.breakpoint.lgAndUp"
        icon
        @click.stop="miniVariant = !miniVariant"
      >
        <v-icon>{{ `chevron_${miniVariant ? 'right' : 'left'}` }}</v-icon>
      </v-btn>
      <v-btn
        v-if="this.$vuetify.breakpoint.lgAndUp"
        icon
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
      <nuxt />
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
      class="elevation-18"
    >
      <v-card
        class="flex "
        flat
        tile
      >
        <v-card-title class="pt-1 pb-0">
          <strong class="mr-3">
            Contact me!
          </strong>
          <v-btn
            v-for="(contact, i) in contacts"
            :key="i"
            :href="contact.url"
            target="_blank"
            class="mx-3"
            :dark="dark"
            icon
          >
            <v-icon size="24px">
              {{ contact.icon }}
            </v-icon>
          </v-btn>
          <v-spacer />
          <a rel="license" href="https://creativecommons.org/licenses/by-nc-nd/4.0/" target="_blank">
            <img alt="Licencia de Creative Commons" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-nd/4.0/88x31.png">
          </a>
        </v-card-title>
        <v-divider />
        <v-card-actions class="justify-center">
          <strong>&copy;{{ new Date().getFullYear() }} - mauriz3</strong>
        </v-card-actions>
      </v-card>
    </v-footer>
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
      contacts: [
        {
          icon: 'fab fa-linkedin-in',
          url: 'https://www.linkedin.com/in/rendon7/'
        },
        {
          icon: 'fab fa-github-alt',
          url: 'https://github.com/mauriz3'
        },
        {
          icon: 'fab fa-codepen',
          url: 'https://codepen.io/maurirz3'
        }
      ],
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
          icon: 'bookmarks',
          title: 'My Projects',
          to: '/projects'
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
