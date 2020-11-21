<template>
  <v-container grid-list-xl>
    <v-layout
      align-center
      :justify-start="$vuetify.breakpoint.mdAndUp"
      :justify-center="$vuetify.breakpoint.smAndDown"
      row
      fill-height
      wrap
    >
      <v-flex xs12>
        <h1 class="text-xs-center primary--text">
          My Projects
        </h1>
      </v-flex>
      <v-flex v-for="(item, i) in items" :key="i" xs11 sm5 md4>
        <v-card width="100%" height="100%" :elevation="7">
          <v-card-title class="primary title">
            <v-spacer />
            {{ item.title }}
            <v-spacer />
          </v-card-title>
          <v-card-media :src="item.img.src" :alt="item.img.atl" :aspect-ratio="16 / 9" style="height:170px;" />
          <v-card-text class="text-xs-center" style="height:74px;">
            <v-layout
              align-center
              justify-center
              row
              fill-height
              wrap
              style="height:74px;"
            >
              <v-flex xs12>
                {{ item.desc }}
              </v-flex>
            </v-layout>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn class="mb-3" color="primary" :href="item.href" target="_blank">
              Visit site
              <v-icon right dark>
                image_search
              </v-icon>
            </v-btn>
            <v-spacer />
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
          title: 'My CV',
          img: {
            src: '/cv.png',
            alt: 'My CV image'
          },
          desc: 'An interactive an original CV.',
          href: 'https://github.com/mauriz3/my-cv'
        },
        {
          title: 'Webtele',
          img: {
            src: '/webtele.jpg',
            alt: 'Webtelehd web image'
          },
          desc: 'Watch all your favorites TV channels anytime, anywhere.',
          href: 'https://www.webtelehd.com/'
        },
        {
          title: 'BALANCE OF THE FORCE',
          img: {
            src: '/bf.png',
            alt: 'BALANCE OF THE FORCE image'
          },
          desc: 'A gamified retrospective.',
          href: 'https://codepen.io/maurirz3/full/KKVdYgV'
        },
        {
          title: 'Feature Flags Panel',
          img: {
            src: '/ff.png',
            alt: 'Feature Flags Panel image'
          },
          desc: 'It is an  functional feature flags panel handler.',
          href: 'https://codepen.io/maurirz3/full/eYzMyWe'
        },
        {
          title: 'Streaming Analytcis',
          img: {
            src: '/sa.png',
            alt: 'Streaming Analytcis image'
          },
          desc: 'A Streaming Analytcis prototype.',
          href: 'https://codepen.io/maurirz3/full/JjYLMrZ'
        },
        {
          title: 'Responsive Youtube',
          img: {
            src: '/ri.png',
            alt: 'Responsive Youtube Iframe image'
          },
          desc: 'How to insert a youtube responsive iframe in your web?',
          href: 'https://codepen.io/maurirz3/pen/OJVwbNv?editors=1000'
        },
        {
          title: 'Status lights',
          img: {
            src: '/sl.png',
            alt: 'Status lights image'
          },
          desc: 'Status lights with hover effect.',
          href: 'https://codepen.io/maurirz3/pen/OJJoKXp?editors=1100'
        }
      ]
    }
  }
}
</script>
