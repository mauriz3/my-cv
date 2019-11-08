<template>
  <v-container grid-list-xl>
    <v-layout align-center justify-space-around row fill-height wrap>
      <v-flex xs12>
        <h1 class="text-xs-center primary--text">My Projects</h1>
      </v-flex>
      <v-flex xs11 md5 v-for="(item, i) in items" :key="i">
        <v-card width="100%" :elevation="7">
          <v-card-title class="primary title">
            <v-spacer></v-spacer>
            {{ item.title }}
            <v-spacer></v-spacer>
          </v-card-title>
          <v-card-media :src="item.img.src" :alt="item.img.atl" :aspect-ratio="16 / 10"></v-card-media>
          <v-card-text class="text-xs-center">{{ item.desc }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn class="mb-3" color="primary" :href="item.href" target="_blank">
              Visit site
              <v-icon right dark>image_search</v-icon>
            </v-btn>
            <v-spacer></v-spacer>
          </v-card-actions>
        </v-card>
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
          title: 'Webtele',
          img: {
            src: 'webtele.png',
            alt: 'Webtelehd web image'
          },
          desc:
            'Watch all your favorites TV programs and series in anytime, anywhere, in any device.',
          href: 'https://www.webtelehd.com/'
        },
        {
          title: 'Timeline Article',
          img: {
            src: 'timeline.png',
            alt: 'Timeline Article web image'
          },
          desc:
            "It is an investigation article to understand the Venezuela's current economic and political crisis.",
          href: 'https://vzlacrisistimeline.ga/'
        }
      ]
    }
  }
}
</script>
