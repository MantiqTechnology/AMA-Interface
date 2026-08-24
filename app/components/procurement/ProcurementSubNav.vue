<script setup lang="ts">
// Horizontal sub-navigation used at the top of every /procurement/* page,
// mirroring the tab pattern already used on Asset Maintenance and
// CRM & Marketing screens (Overview | Suppliers | Purchase Requisition | ...).
// It reads the active tab from the current route so it always highlights
// correctly no matter whether the user arrived via the sidebar or a tab click.

const route = useRoute();

const tabs = [
  { label: 'Overview', to: '/procurement', icon: 'mdi-view-dashboard-outline' },
  { label: 'Suppliers & Vendors', to: '/procurement/suppliers', icon: 'mdi-domain' },
  { label: 'Purchase Requisition', to: '/procurement/requisitions', icon: 'mdi-clipboard-text-outline' },
  { label: 'Sourcing & Tender', to: '/procurement/sourcing', icon: 'mdi-gavel' },
  { label: 'Purchase Orders', to: '/procurement/purchase-orders', icon: 'mdi-file-sign' },
  { label: 'Receiving & Returns', to: '/procurement/receiving', icon: 'mdi-truck-check-outline' },
  { label: 'Vendor Performance', to: '/procurement/vendor-performance', icon: 'mdi-chart-line' },
  { label: 'Approval & Control', to: '/procurement/approval-control', icon: 'mdi-shield-check-outline' }
];

const activeTab = computed(() => {
  const exact = tabs.find((tab) => tab.to === route.path);
  if (exact) return exact.to;
  // Fallback: longest prefix match, so nested/detail routes still highlight
  // the right parent tab.
  const match = tabs
    .filter((tab) => tab.to !== '/procurement' && route.path.startsWith(tab.to))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.to ?? '/procurement';
});

// --- Scroll-by-button behaviour (replaces native scrollbar) ---
const scrollerRef = ref<HTMLElement | null>(null);
const canScrollPrev = ref(false);
const canScrollNext = ref(false);

function updateScrollState() {
  const el = scrollerRef.value;
  if (!el) return;
  canScrollPrev.value = el.scrollLeft > 2;
  canScrollNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
}

function scrollByAmount(direction: 1 | -1) {
  const el = scrollerRef.value;
  if (!el) return;
  el.scrollBy({ left: direction * (el.clientWidth * 0.6), behavior: 'smooth' });
}

onMounted(() => {
  updateScrollState();
  scrollerRef.value?.addEventListener('scroll', updateScrollState, { passive: true });
  window.addEventListener('resize', updateScrollState);
});

onBeforeUnmount(() => {
  scrollerRef.value?.removeEventListener('scroll', updateScrollState);
  window.removeEventListener('resize', updateScrollState);
});
</script>

<template>
  <nav class="proc-subnav" aria-label="Procurement sections">
    <button
      type="button"
      class="proc-subnav__arrow"
      :disabled="!canScrollPrev"
      aria-label="Scroll tabs left"
      @click="scrollByAmount(-1)"
    >
      <VIcon icon="mdi-chevron-left" size="20" />
    </button>

    <div ref="scrollerRef" class="proc-subnav__track">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="proc-subnav__item"
        :class="{ 'proc-subnav__item--active': activeTab === tab.to }"
      >
        <VIcon :icon="tab.icon" size="16" class="proc-subnav__icon" />
        <span>{{ tab.label }}</span>
      </NuxtLink>
    </div>

    <button
      type="button"
      class="proc-subnav__arrow"
      :disabled="!canScrollNext"
      aria-label="Scroll tabs right"
      @click="scrollByAmount(1)"
    >
      <VIcon icon="mdi-chevron-right" size="20" />
    </button>
  </nav>
</template>

<style scoped>
.proc-subnav {
  display: flex;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid #e2e8f0;
  padding: 8px 0;
}

.proc-subnav__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.proc-subnav__arrow:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f4c81;
}

.proc-subnav__arrow:disabled {
  opacity: 0.3;
  cursor: default;
}

.proc-subnav__track {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: hidden;
  scroll-behavior: smooth;
  flex: 1;
}

.proc-subnav__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  white-space: nowrap;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 500;
  color: #6e7379;
  text-decoration: none;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.proc-subnav__item:hover {
  color: #082b49;
  background: #f5f7f9;
}

.proc-subnav__item--active {
  color: #082b49;
  background: #ffffff;
  border-color: #d9e0e6;
  box-shadow: 0 1px 2px rgba(15, 76, 129, 0.06);
}

.proc-subnav__icon {
  color: inherit;
}
</style>