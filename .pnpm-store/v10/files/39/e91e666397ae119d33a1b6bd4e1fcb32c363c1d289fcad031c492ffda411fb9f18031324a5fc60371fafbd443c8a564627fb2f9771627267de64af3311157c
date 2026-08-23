import { createVNode as _createVNode } from "vue";
// Components
import { VTooltip } from "../VTooltip/VTooltip.js"; // Utilities
import { genericComponent, propsFactory } from "../../util/index.js"; // Types
export const makeVSparklineTooltipProps = propsFactory({
  modelValue: Boolean,
  target: Object,
  index: {
    type: Number,
    default: null
  },
  value: {
    type: Number,
    default: 0
  },
  titleFormat: {
    type: Function,
    default: item => String(item.value)
  },
  offset: Number,
  contentClass: null,
  location: String
}, 'VSparklineTooltip');
export const VSparklineTooltip = genericComponent()({
  name: 'VSparklineTooltip',
  props: makeVSparklineTooltipProps(),
  emits: {
    afterLeave: () => true
  },
  setup(props, {
    slots,
    emit
  }) {
    return () => _createVNode(VTooltip, {
      "modelValue": props.modelValue,
      "target": props.target,
      "offset": props.offset,
      "contentClass": props.contentClass,
      "location": props.location,
      "onAfterLeave": () => emit('afterLeave')
    }, {
      default: () => [props.index !== null && (slots.default?.({
        index: props.index,
        value: props.value
      }) ?? props.titleFormat({
        index: props.index,
        value: props.value
      }))]
    });
  }
});
//# sourceMappingURL=VSparklineTooltip.js.map