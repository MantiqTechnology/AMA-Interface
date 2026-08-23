import { createElementVNode as _createElementVNode, mergeProps as _mergeProps } from "vue";
// Utilities
import { genericComponent, propsFactory, useRender } from "../../util/index.js"; // Types
export const makeVHeatmapCellProps = propsFactory({
  item: {
    type: Object,
    required: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  disabled: Boolean,
  cellProps: Object
}, 'VHeatmapCell');
export const VHeatmapCell = genericComponent()({
  name: 'VHeatmapCell',
  props: makeVHeatmapCellProps(),
  setup(props, {
    slots
  }) {
    useRender(() => {
      const {
        title,
        ...cellAttrs
      } = props.cellProps ?? {};
      return _createElementVNode("g", _mergeProps({
        "class": ['v-heatmap__cell', {
          'v-heatmap__cell--disabled': props.disabled
        }],
        "transform": `translate(${props.x},${props.y})`,
        "style": {
          '--v-heatmap-cell-color': props.item.color
        }
      }, cellAttrs), [title && _createElementVNode("title", {
        "key": "title"
      }, [title]), _createElementVNode("rect", {
        "class": "v-heatmap__cell-underlay",
        "width": props.width,
        "height": props.height,
        "fill": "transparent"
      }, null), _createElementVNode("g", {
        "class": "v-heatmap__cell-content"
      }, [_createElementVNode("rect", {
        "class": "v-heatmap__cell-rect",
        "width": props.width,
        "height": props.height
      }, null), slots.default && _createElementVNode("foreignObject", {
        "class": "v-heatmap__cell-overlay",
        "width": props.width,
        "height": props.height
      }, [_createElementVNode("div", null, [slots.default({
        item: props.item
      })])])])]);
    });
  }
});
//# sourceMappingURL=VHeatmapCell.js.map