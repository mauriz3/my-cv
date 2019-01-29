<template>
  <v-layout
    column
    justify-center
    align-center
  >
    <v-flex
      xs12
      sm8
      md6
    >
      <div class="ext-xs-center">
        <card />
      </div>
    </v-flex>
  </v-layout>
</template>

<script>
import Card from '~/components/Card.vue'

export default {
  components: {
    Card
  }
}
</script>
