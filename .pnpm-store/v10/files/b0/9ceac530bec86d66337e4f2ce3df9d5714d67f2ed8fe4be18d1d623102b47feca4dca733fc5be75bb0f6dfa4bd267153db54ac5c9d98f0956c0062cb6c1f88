// Utilities
import { computed, toRef, toValue, unref } from 'vue';
import { getPropertyFromItem } from "../../util/index.js"; // Types
export function usePivot(props, options = {}) {
  const transformCell = options.transformCell ?? (cell => cell);
  const rows = computed(() => {
    const rowsProp = toValue(props.rows);
    if (rowsProp) return [...rowsProp];
    const items = toValue(props.items);
    const itemRow = unref(props.itemRow);
    const set = new Set();
    for (const item of items) set.add(getPropertyFromItem(item, itemRow));
    return [...set];
  });

  // True when itemColumn resolves to a value for at least one item — i.e. columns are
  // explicit. When false, columns are inferred from row-key wrapping (calendar-style).
  const hasExplicitColumns = computed(() => {
    const itemColumn = unref(props.itemColumn);
    if (itemColumn == null) return false;
    const columnsProp = toValue(props.columns);
    if (columnsProp?.length) return true;
    const items = toValue(props.items);
    return items.some(item => getPropertyFromItem(item, itemColumn) != null);
  });

  // groups and rowItems are co-derived (pushToRow runs inline while columns build),
  // so they share a single internal computed.
  const grouped = computed(() => {
    const items = toValue(props.items);
    const itemRow = unref(props.itemRow);
    const itemColumn = unref(props.itemColumn);
    const itemValue = unref(props.itemValue);
    const groupBy = unref(props.groupBy);
    const columnsProp = toValue(props.columns);
    const rowKeys = rows.value;
    const explicit = hasExplicitColumns.value;
    const rowIndexByKey = new Map(rowKeys.map((k, i) => [k, i]));
    const groupMap = new Map();
    for (const item of items) {
      const rawKey = groupBy != null ? getPropertyFromItem(item, groupBy) : '';
      const key = String(rawKey ?? '');
      if (!groupMap.has(key)) groupMap.set(key, {
        label: key,
        items: []
      });
      groupMap.get(key).items.push(item);
    }
    const groups = [];
    const rowItems = new Map();
    function makeCell(item, rowKey, columnKey, groupKey) {
      const cell = transformCell({
        value: getPropertyFromItem(item, itemValue),
        raw: item,
        row: rowKey,
        column: columnKey,
        groupKey
      });
      if (!rowItems.has(rowKey)) rowItems.set(rowKey, []);
      rowItems.get(rowKey).push(cell);
      return cell;
    }
    function buildExplicitColumns(sourceItems, groupKey) {
      const groupItems = [];
      const columnKeys = columnsProp ? [...columnsProp] : [...new Set(sourceItems.map(item => getPropertyFromItem(item, itemColumn)))];
      const columns = columnKeys.map(key => ({
        key: String(key),
        cells: Array(rowKeys.length).fill(null),
        items: []
      }));
      const columnIndexByKey = new Map(columnKeys.map((k, i) => [k, i]));
      for (const item of sourceItems) {
        const rowKey = getPropertyFromItem(item, itemRow);
        const columnKey = getPropertyFromItem(item, itemColumn);
        const rowIndex = rowIndexByKey.get(rowKey);
        const columnIndex = columnIndexByKey.get(columnKey);
        if (rowIndex === undefined || columnIndex === undefined) continue;
        const cell = makeCell(item, rowKey, columnKey, groupKey);
        columns[columnIndex].cells[rowIndex] = cell;
        columns[columnIndex].items.push(cell);
        groupItems.push(cell);
      }
      return {
        columns,
        groupItems
      };
    }

    // Start a new column whenever the row key wraps
    function buildInferredColumns(sourceItems, groupKey) {
      const columns = [];
      const groupItems = [];
      let currentCells = Array(rowKeys.length).fill(null);
      let currentItems = [];
      let columnIndex = 0;
      let lastRowIndex = -1;
      for (const item of sourceItems) {
        const rowKey = getPropertyFromItem(item, itemRow);
        const rowIndex = rowIndexByKey.get(rowKey);
        if (rowIndex === undefined) continue;
        if (rowIndex <= lastRowIndex) {
          columns.push({
            key: String(columnIndex),
            cells: currentCells,
            items: currentItems
          });
          columnIndex++;
          currentCells = Array(rowKeys.length).fill(null);
          currentItems = [];
        }
        const cell = makeCell(item, rowKey, columnIndex, groupKey);
        currentCells[rowIndex] = cell;
        currentItems.push(cell);
        groupItems.push(cell);
        lastRowIndex = rowIndex;
      }
      if (currentCells.some(c => c !== null)) {
        columns.push({
          key: String(columnIndex),
          cells: currentCells,
          items: currentItems
        });
      }
      return {
        columns,
        groupItems
      };
    }
    for (const [groupKey, {
      label,
      items: sourceItems
    }] of groupMap) {
      const {
        columns,
        groupItems
      } = explicit ? buildExplicitColumns(sourceItems, groupKey) : buildInferredColumns(sourceItems, groupKey);
      groups.push({
        key: groupKey,
        label,
        columns,
        items: groupItems
      });
    }
    return {
      groups,
      rowItems
    };
  });
  return {
    rows,
    hasExplicitColumns,
    groups: toRef(() => grouped.value.groups),
    rowItems: toRef(() => grouped.value.rowItems)
  };
}
//# sourceMappingURL=pivot.js.map