import { createElementVNode as _createElementVNode, createVNode as _createVNode, normalizeStyle as _normalizeStyle } from "vue";
// Components
import { VHeatmapLegendCell } from "./VHeatmapLegendCell.js"; // Composables
import { useLocale } from "../../composables/locale.js"; // Utilities
import { getInterpolationMethod } from "./colorScale.js";
import { isLinearScale } from "./heatmap.js";
import { convertToUnit, defineComponent, propsFactory, useRender } from "../../util/index.js"; // Types
export const makeVHeatmapLegendProps = propsFactory({
  cellSize: {
    type: [Number, String, Array],
    default: undefined
  },
  labels: {
    type: Array,
    default: () => ['$vuetify.heatmap.less', '$vuetify.heatmap.more']
  },
  thresholds: {
    type: [Array, Object],
    default: () => []
  },
  activeBuckets: {
    type: Array,
    required: true
  },
  rounded: [Number, String]
}, 'VHeatmapLegend');
export const VHeatmapLegend = defineComponent({
  name: 'VHeatmapLegend',
  props: makeVHeatmapLegendProps(),
  emits: {
    'click:threshold': index => true
  },
  setup(props, {
    emit
  }) {
    const {
      t
    } = useLocale();
    useRender(() => {
      const cellWidth = Array.isArray(props.cellSize) ? props.cellSize[0] : props.cellSize;
      const cellHeight = Array.isArray(props.cellSize) ? props.cellSize[1] : props.cellSize;
      const linear = isLinearScale(props.thresholds) ? props.thresholds : null;
      const buckets = !linear && Array.isArray(props.thresholds) ? props.thresholds : null;
      const style = {
        '--v-heatmap-cell-width': convertToUnit(cellWidth),
        '--v-heatmap-cell-height': convertToUnit(cellHeight)
      };
      if (linear) {
        style['--v-heatmap-color-start'] = linear.from.color;
        style['--v-heatmap-color-end'] = linear.to.color;
      }
      if (buckets) {
        buckets.forEach((stop, i) => {
          style[`--v-heatmap-color-bucket-${i}`] = stop.color;
        });
      }
      return _createElementVNode("div", {
        "class": "v-heatmap-legend",
        "style": _normalizeStyle(style)
      }, [props.labels[0] && _createElementVNode("div", {
        "key": "legend-label-start",
        "class": "v-heatmap-legend__label"
      }, [t(props.labels[0])]), linear ? _createElementVNode("div", {
        "key": "legend-gradient",
        "class": "v-heatmap-legend__gradient",
        "style": {
          background: `linear-gradient(${getInterpolationMethod(linear)} to right, var(--v-heatmap-color-start), var(--v-heatmap-color-end))`
        }
      }, null) : props.thresholds.map(({
        min
      }, i) => _createVNode(VHeatmapLegendCell, {
        "key": min,
        "class": "v-heatmap-legend__cell",
        "bucketIndex": i,
        "disabled": !props.activeBuckets.includes(i),
        "rounded": props.rounded,
        "width": cellWidth,
        "height": cellHeight,
        "onClick": () => emit('click:threshold', i)
      }, null)), props.labels[1] && _createElementVNode("div", {
        "key": "legend-label-end",
        "class": "v-heatmap-legend__label"
      }, [t(props.labels[1])])]);
    });
  }
});
//# sourceMappingURL=VHeatmapLegend.js.map