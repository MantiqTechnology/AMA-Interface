import { mergeProps as _mergeProps, createVNode as _createVNode } from "vue";
// Components
import { makeVBarlineProps, VBarline } from "./VBarline.js";
import { makeVTrendlineProps, VTrendline } from "./VTrendline.js"; // Composables
import { useTextColor } from "../../composables/color.js"; // Utilities
import { computed } from 'vue';
import { genericComponent, propsFactory, useRender } from "../../util/index.js"; // Types
export const makeVSparklineProps = propsFactory({
  type: {
    type: String,
    default: 'trend'
  },
  ...makeVBarlineProps(),
  ...makeVTrendlineProps()
}, 'VSparkline');
export const VSparkline = genericComponent()({
  name: 'VSparkline',
  props: makeVSparklineProps(),
  emits: {
    'update:currentIndex': _index => true
  },
  setup(props, {
    slots,
    emit
  }) {
    const {
      textColorClasses,
      textColorStyles
    } = useTextColor(() => props.color);
    const hasLabels = computed(() => {
      return Boolean(props.showLabels || props.labels.length > 0 || !!slots?.label);
    });
    const totalHeight = computed(() => {
      let height = parseInt(props.height, 10);
      if (hasLabels.value) height += parseInt(props.labelSize, 10) * 1.5;
      return height;
    });
    useRender(() => {
      const Tag = props.type === 'trend' ? VTrendline : VBarline;
      const lineProps = props.type === 'trend' ? VTrendline.filterProps(props) : VBarline.filterProps(props);
      return _createVNode(Tag, _mergeProps({
        "key": props.type,
        "class": textColorClasses.value,
        "style": textColorStyles.value,
        "viewBox": `0 0 ${props.width} ${totalHeight.value}`
      }, lineProps, {
        "onUpdate:currentIndex": v => emit('update:currentIndex', v)
      }), slots);
    });
  }
});
//# sourceMappingURL=VSparkline.js.map