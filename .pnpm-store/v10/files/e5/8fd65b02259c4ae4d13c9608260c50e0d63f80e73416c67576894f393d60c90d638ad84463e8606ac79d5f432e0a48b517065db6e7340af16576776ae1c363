// Utilities
import { toRef, createElementVNode as _createElementVNode, normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle } from 'vue';
import { convertToUnit, defineComponent, propsFactory, useRender } from "../../util/index.js"; // Types
export const makeVHeatmapLegendCellProps = propsFactory({
  color: String,
  bucketIndex: Number,
  disabled: Boolean,
  width: {
    type: [Number, String],
    default: 24
  },
  height: {
    type: [Number, String],
    default: 24
  },
  rounded: [Number, String]
}, 'VHeatmapLegendCell');
function toPx(value, defaultValue) {
  if (value == null || value === '') return defaultValue;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}
export const VHeatmapLegendCell = defineComponent({
  name: 'VHeatmapLegendCell',
  props: makeVHeatmapLegendCellProps(),
  setup(props, {
    slots,
    attrs
  }) {
    const width = toRef(() => toPx(props.width, 24));
    const height = toRef(() => toPx(props.height, 24));
    useRender(() => {
      const hasBucket = props.bucketIndex != null && props.bucketIndex >= 0;
      const style = {
        '--v-heatmap-cell-radius': convertToUnit(props.rounded)
      };
      if (hasBucket) {
        style['--v-heatmap-cell-color'] = `var(--v-heatmap-color-bucket-${props.bucketIndex})`;
      } else if (props.color) {
        style['--v-heatmap-cell-color'] = props.color;
      }
      return _createElementVNode("svg", {
        "class": _normalizeClass(['v-heatmap__cell', 'v-heatmap__cell--standalone', {
          'v-heatmap__cell--disabled': props.disabled
        }]),
        "width": width.value,
        "height": height.value,
        "viewBox": `0 0 ${width.value} ${height.value}`,
        "style": _normalizeStyle([style, attrs.style])
      }, [_createElementVNode("rect", {
        "class": "v-heatmap__cell-rect",
        "width": width.value,
        "height": height.value
      }, null), slots.default && _createElementVNode("foreignObject", {
        "class": "v-heatmap__cell-overlay",
        "width": width.value,
        "height": height.value
      }, [_createElementVNode("div", null, [slots.default()])])]);
    });
  }
});
//# sourceMappingURL=VHeatmapLegendCell.js.map