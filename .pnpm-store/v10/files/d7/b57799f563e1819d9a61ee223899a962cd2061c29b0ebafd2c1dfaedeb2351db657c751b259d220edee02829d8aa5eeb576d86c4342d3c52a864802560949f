// Composables
import { useProxiedModel } from "../../../composables/proxiedModel.js"; // Utilities
import { computed, inject, provide, ref, shallowRef, toRef, toValue, watch } from 'vue';
import { getObjectValueByPath, propsFactory } from "../../../util/index.js"; // Types
export const makeDataTableGroupProps = propsFactory({
  groupBy: {
    type: Array,
    default: () => []
  },
  opened: {
    type: Array,
    default: () => []
  },
  openAll: Boolean,
  groupKey: Function
}, 'DataTable-group');
const VDataTableGroupSymbol = Symbol.for('vuetify:data-table-group');
export function createGroupBy(props) {
  const groupBy = useProxiedModel(props, 'groupBy');
  const opened = useProxiedModel(props, 'opened');
  const openAll = toRef(() => props.openAll);
  const groupKey = toRef(() => props.groupKey);
  return {
    groupBy,
    opened,
    openAll,
    groupKey
  };
}
export function provideGroupBy(options) {
  const {
    disableSort,
    groupBy,
    sortBy
  } = options;
  const openedModel = options.opened ?? ref([]);

  // Keep a Set mirror for O(1) lookups; the v-model carries the string[] form.
  const localOpened = shallowRef(new Set(openedModel.value));
  watch(openedModel, val => {
    localOpened.value = new Set(val);
  });
  const opened = computed({
    get: () => localOpened.value,
    set: v => {
      localOpened.value = v;
      openedModel.value = [...v.values()];
    }
  });
  const sortByWithGroups = computed(() => {
    return groupBy.value.map(val => ({
      ...val,
      order: val.order ?? false
    })).concat(disableSort?.value ? [] : sortBy.value);
  });
  function isGroupOpen(group) {
    return opened.value.has(group.id);
  }
  function toggleGroup(group) {
    const newOpened = new Set(opened.value);
    if (isGroupOpen(group)) newOpened.delete(group.id);else newOpened.add(group.id);
    opened.value = newOpened;
  }
  function extractRows(items) {
    function dive(group) {
      const arr = [];
      for (const item of group.items) {
        if ('type' in item && item.type === 'group') {
          arr.push(...dive(item));
        } else {
          arr.push(item);
        }
      }
      return [...new Set(arr)];
    }
    return dive({
      type: 'group',
      items,
      id: 'dummy',
      key: 'dummy',
      value: 'dummy',
      depth: 0
    });
  }
  const data = {
    sortByWithGroups,
    toggleGroup,
    opened,
    groupBy,
    extractRows,
    isGroupOpen
  };
  provide(VDataTableGroupSymbol, data);
  return data;
}
export function useGroupBy() {
  const data = inject(VDataTableGroupSymbol);
  if (!data) throw new Error('Missing group!');
  return data;
}
function groupItemsByProperty(items, groupBy) {
  if (!items.length) return [];
  const groups = new Map();
  for (const item of items) {
    const value = getObjectValueByPath(item.raw, groupBy);
    if (!groups.has(value)) {
      groups.set(value, []);
    }
    groups.get(value).push(item);
  }
  return groups;
}
const defaultGroupId = (key, value, parentKey) => `${parentKey}_${key}_${value}`;
function groupItems(items, groupBy, groupKey, depth = 0, parentKey = 'root') {
  if (!groupBy.length) return [];
  const groupedItems = groupItemsByProperty(items, groupBy[0]);
  const groups = [];
  const rest = groupBy.slice(1);
  groupedItems.forEach((items, value) => {
    const key = groupBy[0];
    const id = groupKey ? groupKey({
      key,
      value,
      parentKey: depth === 0 ? null : parentKey
    }) : defaultGroupId(key, value, parentKey);
    groups.push({
      depth,
      id,
      key,
      value,
      items: rest.length ? groupItems(items, rest, groupKey, depth + 1, id) : items,
      type: 'group'
    });
  });
  return groups;
}
function collectGroupIds(groups) {
  return groups.flatMap(group => [group.id, ...collectGroupIds(group.items.filter(item => 'type' in item && item.type === 'group'))]);
}
export function useOpenAllGroups(opened, openAll, items, groupBy, groupKey) {
  const allIds = computed(() => {
    if (!toValue(openAll) || !groupBy.value.length) return new Set();
    return new Set(collectGroupIds(groupItems(toValue(items), groupBy.value.map(group => group.key), toValue(groupKey))));
  });
  watch(allIds, (newIds, oldIds) => {
    if (!toValue(openAll)) return;
    const current = new Set(opened.value);
    let changed = false;
    for (const id of newIds) {
      if (!oldIds?.has(id) && !current.has(id)) {
        current.add(id);
        changed = true;
      }
    }
    for (const id of oldIds ?? []) {
      if (!newIds.has(id) && current.has(id)) {
        current.delete(id);
        changed = true;
      }
    }
    if (changed) opened.value = current;
  }, {
    immediate: true
  });
}
function flattenItems(items, isOpen, hasSummary) {
  const flatItems = [];
  for (const item of items) {
    // TODO: make this better
    if ('type' in item && item.type === 'group') {
      if (item.value != null) {
        flatItems.push(item);
      }
      if (isOpen(item) || item.value == null) {
        flatItems.push(...flattenItems(item.items, isOpen, hasSummary));
        if (hasSummary) {
          flatItems.push({
            ...item,
            type: 'group-summary'
          });
        }
      }
    } else {
      flatItems.push(item);
    }
  }
  return flatItems;
}
export function useGroupedItems(items, groupBy, opened, hasSummary, isGroupOpen, groupKey) {
  const groups = computed(() => {
    if (!groupBy.value.length) return [];
    return groupItems(toValue(items), groupBy.value.map(item => item.key), toValue(groupKey));
  });
  const isOpen = isGroupOpen ?? (group => opened.value.has(group.id));
  const flatItems = computed(() => {
    if (!groupBy.value.length) return toValue(items);
    return flattenItems(groups.value, isOpen, toValue(hasSummary));
  });
  return {
    groups,
    flatItems
  };
}
//# sourceMappingURL=group.js.map