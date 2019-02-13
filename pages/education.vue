<template>
  <v-layout
    column
    justify-center
    align-center
  >
    <v-flex
      xs12
      sm8
    >
      <div class="text-xs-center primary--text">
        <h1>Education</h1>
        <v-img
          src="study.png"
          alt="study"
        ></v-img>
      </div>
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
            dark
          >
            <v-card-title class="title">{{ item.date }}</v-card-title>
            <v-card-text class="white text--primary">
              <p><strong>{{ item.edu }}</strong> at <a :href="item.url" target="_blank">{{ item.entity }}</a>.</p>
            </v-card-text>
          </v-card>
        </v-timeline-item>
      </v-timeline>
    </v-flex>
  </v-layout>
</template>

<script>
export default {
  data() {
    return {
      items: [
        {
          color: 'primary',
          icon: 'account_balance',
          date: '2010 – 2014',
          edu: 'Informatic Engineering Degree',
          entity: 'ULL',
          url: 'https://www.ull.es/grados/ingenieria-informatica/'
        },
        {
          color: 'primary',
          icon: 'import_contacts',
          date: '2014 – 2014',
          edu: 'Digital Marketing Course',
          entity: 'Google Activate',
          url:
            'https://learndigital.withgoogle.com/activatunegocio/course/digital-marketing'
        },
        {
          color: 'primary',
          icon: 'g_translate',
          date: '2013 - 2013',
          edu: 'English Course',
          entity: 'EF Academy Oxford',
          url: 'https://www.ef.com/wwen/academy/campuses/oxford/'
        },
        {
          color: 'primary',
          icon: 'account_balance',
          date: '2008 - 2010',
          edu: 'Computer technician',
          entity: 'IES Domingo Pérez Minik',
          url:
            'http://www.iesdomingoperezminik.es/dpmweb/category/formacion-profesional/informatica-y-comunicaciones/'
        }
      ]
    }
  }
}
</script>
