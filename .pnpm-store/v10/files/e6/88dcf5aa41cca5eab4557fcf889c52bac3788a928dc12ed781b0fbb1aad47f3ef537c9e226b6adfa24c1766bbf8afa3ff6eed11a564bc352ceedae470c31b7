import { createElementVNode as _createElementVNode, createVNode as _createVNode, normalizeClass as _normalizeClass } from "vue";
// Styles
import "./VHeatmap.css";

// Components
import { VHeatmapCell } from "./VHeatmapCell.js";
import { VHeatmapLegend } from "./VHeatmapLegend.js"; // Composables
import { useHeatmap } from "./heatmap.js";
import { makeThemeProps, provideTheme } from "../../composables/theme.js"; // Utilities
import { computed, ref, watch } from 'vue';
import { convertToUnit, genericComponent, propsFactory, useRender } from "../../util/index.js"; // Types
export const makeVHeatmapProps = propsFactory({
  cellSize: {
    type: [Number, String, Array],
    default: 26
  },
  gap: {
    type: [Number, String],
    default: 6
  },
  groupGap: {
    type: [Number, String],
    default: 0
  },
  rounded: [Number, String],
  hideColumnHeaders: Boolean,
  hideRowHeaders: Boolean,
  legend: {
    type: [Boolean, Object],
    default: false
  },
  hover: Boolean,
  hoverScale: {
    type: [Number, String],
    default: 0.85
  },
  items: {
    type: Array,
    default: () => []
  },
  itemValue: {
    type: [String, Array, Function],
    default: 'value'
  },
  itemRow: {
    type: [String, Array, Function],
    default: 'row'
  },
  itemColumn: {
    type: [String, Array, Function],
    default: 'column'
  },
  groupBy: [String, Array, Function],
  itemProps: [Object, Function],
  thresholds: {
    type: [Array, Object],
    default: () => []
  },
  emptyColor: String,
  rows: Array,
  columns: Array,
  ...makeThemeProps()
}, 'VHeatmap');
export const VHeatmap = genericComponent()({
  name: 'VHeatmap',
  props: makeVHeatmapProps(),
  setup(props, {
    slots
  }) {
    const {
      themeClasses
    } = provideTheme(props);
    const {
      rows,
      rowItems,
      groups,
      hasExplicitColumns,
      cellWidth,
      cellHeight,
      gap,
      cellStep,
      rowStep,
      totalWidth,
      totalHeight,
      bucketColors,
      linearColors,
      colorSpaceClass,
      bucketBoundaries
    } = useHeatmap(props);
    const activeBuckets = ref([]);
    const colorProperties = computed(() => {
      const style = {};
      const buckets = bucketColors.value;
      const linear = linearColors.value;
      for (let i = 0; i < buckets.length; i++) {
        style[`--v-heatmap-color-bucket-${i}`] = buckets[i];
      }
      if (linear) {
        style['--v-heatmap-color-start'] = linear.from;
        style['--v-heatmap-color-end'] = linear.to;
      }
      return style;
    });
    watch(bucketBoundaries, val => {
      activeBuckets.value = val.map((_, i) => i);
    }, {
      immediate: true
    });
    function toggle(index) {
      const position = activeBuckets.value.indexOf(index);
      if (position >= 0) activeBuckets.value.splice(position, 1);else activeBuckets.value.push(index);
    }
    function isDisabled(cell) {
      if (cell.bucketIndex < 0) return false;
      return !activeBuckets.value.includes(cell.bucketIndex);
    }
    useRender(() => {
      const radius = convertToUnit(props.rounded);
      const hasGroupLabels = !props.hideColumnHeaders && (!!slots['group-header'] || groups.value.some(group => group.label));
      const hasColumnHeaders = !props.hideColumnHeaders && hasExplicitColumns.value;
      const itemProps = props.itemProps;
      const hasCellSlot = !!slots.cell;
      const space = colorSpaceClass.value;
      return _createElementVNode("div", {
        "class": _normalizeClass(['v-heatmap', {
          'v-heatmap--hover': props.hover,
          'v-heatmap--hide-column-headers': props.hideColumnHeaders,
          'v-heatmap--hide-row-headers': props.hideRowHeaders,
          'v-heatmap--has-group-labels': hasGroupLabels,
          'v-heatmap--has-column-headers': hasColumnHeaders
        }, space && `v-heatmap--color-space-${space}`, themeClasses.value]),
        "style": {
          '--v-heatmap-cell-width': `${cellWidth.value}px`,
          '--v-heatmap-cell-height': `${cellHeight.value}px`,
          '--v-heatmap-cell-gap': `${gap.value}px`,
          '--v-heatmap-cell-radius': radius,
          '--v-heatmap-hover-scale': props.hover ? Number(props.hoverScale) : undefined,
          '--v-heatmap-rows-count': rows.value.length,
          '--v-heatmap-empty-color': props.emptyColor,
          ...colorProperties.value
        }
      }, [_createElementVNode("div", {
        "class": "v-heatmap__body"
      }, [hasGroupLabels && _createElementVNode("div", {
        "class": "v-heatmap__group-labels",
        "key": "group-labels",
        "style": {
          width: `${totalWidth.value}px`
        }
      }, [groups.value.map(group => _createElementVNode("div", {
        "key": group.key,
        "class": "v-heatmap__group-label",
        "style": {
          insetInlineStart: `${group.x}px`,
          width: `${group.width}px`,
          paddingInlineStart: group.labelOffset ? `${group.labelOffset}px` : undefined
        }
      }, [slots['group-header']?.({
        group,
        items: group.items
      }) ?? group.label]))]), hasColumnHeaders && _createElementVNode("div", {
        "class": "v-heatmap__column-headers",
        "key": "column-headers",
        "style": {
          width: `${totalWidth.value}px`
        }
      }, [groups.value.flatMap(group => group.columns.map((col, index) => _createElementVNode("div", {
        "key": `column-header-${group.key}-${col.key}`,
        "class": "v-heatmap__column-header",
        "style": {
          insetInlineStart: `${group.x + index * cellStep.value}px`,
          width: `${cellWidth.value}px`
        }
      }, [slots['column-header']?.({
        column: col.key,
        index,
        items: col.items
      }) ?? col.key])))]), !props.hideRowHeaders && _createElementVNode("div", {
        "class": "v-heatmap__row-headers",
        "key": "row-headers"
      }, [rows.value.map((row, index) => _createElementVNode("div", {
        "key": `row-header-${index}`,
        "class": "v-heatmap__row-header"
      }, [slots['row-header']?.({
        row,
        index,
        items: rowItems.value.get(row) ?? []
      }) ?? row]))]), _createElementVNode("svg", {
        "class": "v-heatmap__grid",
        "width": totalWidth.value,
        "height": totalHeight.value,
        "viewBox": `0 0 ${totalWidth.value} ${totalHeight.value}`
      }, [groups.value.flatMap(group => group.columns.flatMap((col, columnIndex) => col.cells.map((cell, rowIndex) => {
        if (!cell) return null;
        const cellProps = (typeof itemProps === 'function' ? itemProps(cell) : itemProps) ?? {};
        return _createVNode(VHeatmapCell, {
          "key": `${group.key}-${columnIndex}-${rowIndex}`,
          "item": cell,
          "x": group.x + columnIndex * cellStep.value,
          "y": rowIndex * rowStep.value,
          "width": cellWidth.value,
          "height": cellHeight.value,
          "disabled": isDisabled(cell),
          "cellProps": cellProps
        }, hasCellSlot ? {
          default: () => slots.cell({
            item: cell
          })
        } : undefined);
      })))])]), props.legend && (slots.legend?.({
        thresholds: props.thresholds,
        activeBuckets: activeBuckets.value,
        toggle
      }) ?? _createVNode(VHeatmapLegend, {
        "cellSize": (typeof props.legend === 'object' ? props.legend.cellSize : undefined) ?? props.cellSize,
        "thresholds": props.thresholds,
        "activeBuckets": activeBuckets.value,
        "rounded": props.rounded,
        "labels": typeof props.legend === 'object' ? props.legend.labels : undefined,
        "onClick:threshold": toggle
      }, null))]);
    });
  }
});
//# sourceMappingURL=VHeatmap.js.map