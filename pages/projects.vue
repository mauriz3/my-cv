<template>
  <v-container grid-list-xl>
    <v-layout align-center justify-space-around row fill-height wrap>
      <v-flex xs12>
        <h1 class="text-xs-center primary--text">
          My Projects
        </h1>
      </v-flex>
      <v-flex v-for="(item, i) in items" :key="i" xs11 md5>
        <v-card width="100%" :elevation="7">
          <v-card-title class="primary title">
            <v-spacer />
            {{ item.title }}
            <v-spacer />
          </v-card-title>
          <v-card-media :src="item.img.src" :alt="item.img.atl" :aspect-ratio="16 / 10" />
          <v-card-text class="text-xs-center">
            {{ item.desc }}
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
          title: 'Webtele',
          img: {
            src: '/webtele.jpg',
            alt: 'Webtelehd web image'
          },
          desc:
            'Watch all your favorites TV programs and series in anytime, anywhere, in any device.',
          href: 'https://www.webtelehd.com/'
        },
        {
          title: 'BALANCE OF THE FORCE',
          img: {
            src: '/sw.png',
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
          title: 'Responsive Youtube Iframe',
          img: {
            src: '/ri.png',
            alt: 'Responsive Youtube Iframe image'
          },
          desc:
            'How to insert a youtube responsive iframe in your web? Go to the following code example and watch it work.',
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
