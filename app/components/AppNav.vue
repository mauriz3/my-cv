<script setup lang="ts">
/**
 * Navegación única que cambia de forma por breakpoint (solo CSS, sin duplicar DOM):
 * móvil = barra inferior · tablet (md) = raíl de 88 px · escritorio (xl) = sidebar de 264 px,
 * que un botón puede colapsar al raíl de iconos (estado en localStorage, clase en `<html>`).
 */
import { readCollapsed, toggleCollapsed } from '~~/lib/sidebar'

const NAV_ID = 'main-nav'

const { t } = useI18n()
const localePath = useLocalePath()

const isCollapsed = ref(false)
const toggleLabel = computed(() => t(isCollapsed.value ? 'nav.expand' : 'nav.collapse'))
const toggleIcon = computed(() => (isCollapsed.value ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'))

function toggleSidebar() {
  isCollapsed.value = toggleCollapsed(localStorage, document.documentElement, isCollapsed.value)
}

onMounted(() => {
  isCollapsed.value = readCollapsed(localStorage)
})
</script>

<template>
  <nav
    :id="NAV_ID"
    :aria-label="t('nav.main')"
    class="fixed inset-x-0 bottom-0 z-40 flex h-(--size-bottom-bar) items-stretch justify-around border-t border-default bg-elevated md:inset-y-0 md:right-auto md:h-auto md:w-(--size-rail) md:flex-col md:items-stretch md:justify-start md:gap-1 md:border-t-0 md:border-r md:px-2 md:py-6 xl:w-(--size-sidebar-current) xl:px-4 xl:collapsed:px-2"
  >
    <NuxtLink
      v-for="item in NAV_ITEMS"
      :key="item.id"
      :to="localePath(item.path)"
      :data-testid="`nav-${item.id}`"
      :aria-label="isCollapsed ? t(`nav.${item.id}`) : undefined"
      :title="isCollapsed ? t(`nav.${item.id}`) : undefined"
      class="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg text-xs text-muted transition-colors hover:text-default focus-visible:outline-2 focus-visible:outline-primary md:flex-none md:py-3 xl:flex-row xl:justify-start xl:gap-3 xl:px-3 xl:text-sm xl:collapsed:justify-center xl:collapsed:px-0"
      active-class="bg-primary/12 text-primary! font-medium"
      exact-active-class="bg-primary/12 text-primary! font-medium"
    >
      <UIcon :name="item.icon" class="size-5 shrink-0" aria-hidden="true" />
      <span class="xl:collapsed:sr-only">{{ t(`nav.${item.id}`) }}</span>
    </NuxtLink>

    <button
      type="button"
      data-testid="sidebar-toggle"
      :aria-controls="NAV_ID"
      :aria-expanded="!isCollapsed"
      :aria-label="toggleLabel"
      :title="toggleLabel"
      class="mt-auto hidden items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted transition-colors hover:text-default focus-visible:outline-2 focus-visible:outline-primary xl:flex xl:collapsed:justify-center xl:collapsed:px-0"
      @click="toggleSidebar"
    >
      <UIcon :name="toggleIcon" class="size-5 shrink-0" aria-hidden="true" />
      <span class="xl:collapsed:sr-only">{{ toggleLabel }}</span>
    </button>
  </nav>
</template>
