<template>
  <v-container fluid grid-list-xl>
    <v-layout
      justify-center
      align-top
      wrap
    >
      <v-flex
        xs12
        sm8
        md6
      >
        <h1 class="text-xs-center primary--text">
          Experience
        </h1>
        <v-timeline align-top>
          <v-timeline-item
            v-for="(item, i) in items"
            :key="i"
            :color="item.color"
            :icon="item.icon"
            fill-dot
          >
            <v-card
              :color="item.color"
            >
              <v-card-title class="title">
                {{ item.date }}
              </v-card-title>
              <v-card-text :class="autoColor">
                <p>
                  <strong>{{ item.job }}</strong> at <a :href="item.url" target="_blank">
                    {{ item.comp }}
                  </a>.
                </p>
                <!-- <p><strong>{{ item.job }}</strong> at <a :href="item.url" target="_blank">{{ item.comp }}</a>. {{ item.desc }}.</p> -->
              </v-card-text>
            </v-card>
          </v-timeline-item>
        </v-timeline>
      </v-flex>
      <v-flex
        xs12
        sm8
        md6
        class="my-3"
      >
        <v-img
          src="/work.png"
          alt="work"
        />
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      items: [
        {
          color: 'primary',
          icon: 'work',
          date: '2016 – Present',
          job: 'DevOps & FrontEnd Developer ',
          comp: 'System73',
          url: 'https://system73.com/',
          desc: ''
        },
        {
          color: 'primary',
          icon: 'work',
          date: 'Dec 2014 – Jun 2015',
          job: 'SysAdmin',
          comp: 'FASICAN',
          url: 'http://fasican.org/',
          desc: ''
        },
        {
          color: 'primary',
          icon: 'class',
          date: 'Mar 2014 – Jun 2014',
          job: 'University internship',
          comp: 'Open Canarias',
          url: 'https://www.opencanarias.com/',
          desc: ''
        },
        {
          color: 'primary',
          icon: 'class',
          date: 'Mar 2010 – Jun 2010',
          job: 'Computer technician internship',
          comp: 'Canary Islands University Hospital',
          url:
            'https://www3.gobiernodecanarias.org/sanidad/scs/organica.jsp?idCarpeta=3da5f513-541b-11de-9665-998e1388f7ed',
          desc: ''
        }
      ]
    }
  },
  computed: {
    autoColor: function() {
      return this.$vuetify.dark ? 'accent' : 'white'
    }
  }
}
</script>
