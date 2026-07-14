<!-- ExpandedTable.vue -->
<script setup lang="ts" generic="T extends object">
import type { DataTableHeader } from 'vuetify';
import { VDataTableServer, VProgressLinear } from 'vuetify/components';

interface CacheEntry {
  data: unknown;
  fetchedAt: number;
}

interface Props {
  items: T[];
  headers: DataTableHeader[];
  itemValue?: string;
  fetchDetail: (item: T) => Promise<unknown>;
  cacheTtl?: number;
  /** set true kalau kamu manual mau paksa mode server, opsional */
  serverItemsLength?: number;
}

const props = withDefaults(defineProps<Props>(), {
  itemValue: 'id',
  cacheTtl: undefined,
  serverItemsLength: undefined
});

defineOptions({ inheritAttrs: false });

const expanded = ref<string[]>([]);
const cache = new Map<string, CacheEntry>();
const loadingKeys = ref<Set<string>>(new Set());
const detailData = reactive<Record<string, unknown>>({});

function getKey(item: T): string {
  return String(Reflect.get(item, props.itemValue));
}

function findItemByKey(key: string): T | undefined {
  return props.items.find((i: T) => getKey(i) === key);
}

function isStale(entry: CacheEntry): boolean {
  if (!props.cacheTtl) return false;
  return Date.now() - entry.fetchedAt > props.cacheTtl;
}

async function loadDetail(item: T, force = false) {
  const key = getKey(item);
  const cached = cache.get(key);

  if (!force && cached && !isStale(cached)) {
    detailData[key] = cached.data;
    return;
  }

  if (loadingKeys.value.has(key)) return;

  loadingKeys.value.add(key);
  try {
    const data = await props.fetchDetail(item);
    cache.set(key, { data, fetchedAt: Date.now() });
    detailData[key] = data;
  } finally {
    loadingKeys.value.delete(key);
  }
}

async function refreshRow(item: T) {
  await loadDetail(item, true);
}

async function refreshAllExpanded() {
  const items = expanded.value.map(findItemByKey).filter((i): i is T => i !== undefined);

  await Promise.all(items.map((item) => loadDetail(item, true)));
}

watch(expanded, (newVal, oldVal) => {
  const opened = newVal.filter((k) => !oldVal.includes(k));
  for (const key of opened) {
    const item = findItemByKey(key);
    if (item) loadDetail(item);
  }
});

function invalidate(itemKey: string) {
  cache.delete(itemKey);
  delete detailData[itemKey];
}
function invalidateAll() {
  cache.clear();
  Object.keys(detailData).forEach((k) => delete detailData[k]);
}

defineExpose({ invalidate, invalidateAll, refreshRow, refreshAllExpanded });
</script>

<template>
  <VDataTableServer
    v-model:expanded="expanded"
    density="default"
    :headers="headers"
    :items="items"
    :item-value="itemValue"
    show-expand
    v-bind="$attrs"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps" />
    </template>

    <template #[`item.data-table-expand`]="{ internalItem, isExpanded, toggleExpand }">
      <VBtn
        :aria-label="isExpanded(internalItem) ? 'Collapse row details' : 'Expand row details'"
        :icon="isExpanded(internalItem) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        size="small"
        variant="text"
        @click="toggleExpand(internalItem)"
      />
    </template>

    <template #expanded-row="{ columns, item }">
      <tr>
        <td :colspan="columns.length" class="pa-4 bg-grey-lighten-4">
          <div class="expanded-table__detail d-flex justify-space-between align-start">
            <div class="grow">
              <VProgressLinear v-if="loadingKeys.has(getKey(item))" indeterminate size="24" />
              <slot v-else name="detail" :item="item" :detail="detailData[getKey(item)]" />
            </div>
            <VBtn
              aria-label="Refresh row details"
              icon="mdi-refresh"
              size="small"
              variant="text"
              :loading="loadingKeys.has(getKey(item))"
              @click="refreshRow(item)"
            />
          </div>
        </td>
      </tr>
    </template>
  </VDataTableServer>
</template>
<style scoped>
:deep(.v-data-table__td) {
  padding-block: 12px;
  padding-inline: 16px;
}

:deep(.v-data-table__th) {
  padding-inline: 16px;
}

@media (max-width: 600px) {
  .expanded-table__detail {
    position: sticky;
    inset-inline-start: 0;
    width: calc(100vw - 64px);
  }
}
</style>
