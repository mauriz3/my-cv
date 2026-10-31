<script setup lang="ts">
/** Tabla simple y accesible (alternativa a una gráfica): la primera celda de cada fila es su encabezado. */
defineProps<{ caption: string; columns: readonly string[]; rows: readonly (readonly string[])[] }>()
</script>

<template>
  <table class="w-full text-sm">
    <caption class="mb-2 text-left text-xs text-muted">
      {{
        caption
      }}
    </caption>
    <thead>
      <tr class="border-b border-default">
        <th
          v-for="(column, index) in columns"
          :key="column"
          scope="col"
          class="py-2 font-medium text-muted"
          :class="index === 0 ? 'text-left' : 'text-right'"
        >
          {{ column }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row[0]" class="border-b border-default last:border-0">
        <template v-for="(cell, index) in row" :key="index">
          <th v-if="index === 0" scope="row" class="py-1.5 pr-3 text-left font-normal">{{ cell }}</th>
          <td v-else class="py-1.5 text-right tabular-nums">{{ cell }}</td>
        </template>
      </tr>
    </tbody>
  </table>
</template>
