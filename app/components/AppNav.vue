<script setup lang="ts">
/**
 * Navegación única que cambia de forma por breakpoint (solo CSS, sin duplicar DOM):
 * móvil = barra inferior · tablet (md) = raíl de 88 px · escritorio (lg) = sidebar de 264 px.
 */
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <nav
    :aria-label="t('nav.main')"
    class="fixed inset-x-0 bottom-0 z-40 flex h-(--size-bottom-bar) items-stretch justify-around border-t border-default bg-elevated md:inset-y-0 md:right-auto md:h-auto md:w-(--size-rail) md:flex-col md:items-stretch md:justify-start md:gap-1 md:border-t-0 md:border-r md:px-2 md:py-6 lg:w-(--size-sidebar) lg:px-4"
  >
    <NuxtLink
      v-for="item in NAV_ITEMS"
      :key="item.id"
      :to="localePath(item.path)"
      :data-testid="`nav-${item.id}`"
      class="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg text-xs text-muted transition-colors hover:text-default focus-visible:outline-2 focus-visible:outline-primary md:flex-none md:py-3 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm"
      active-class="bg-primary/12 text-primary! font-medium"
      exact-active-class="bg-primary/12 text-primary! font-medium"
    >
      <UIcon :name="item.icon" class="size-5 shrink-0" aria-hidden="true" />
      <span>{{ t(`nav.${item.id}`) }}</span>
    </NuxtLink>
  </nav>
</template>
