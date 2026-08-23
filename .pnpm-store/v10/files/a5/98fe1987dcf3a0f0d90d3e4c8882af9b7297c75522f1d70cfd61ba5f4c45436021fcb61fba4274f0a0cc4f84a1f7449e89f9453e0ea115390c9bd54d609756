import { normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle, createElementVNode as _createElementVNode } from "vue";
// Composables
import { useTextColor } from "../../../composables/color.js"; // Utilities
import { shallowRef } from 'vue';
import { propsFactory } from "../../../util/index.js"; // Types
export const makeIntervalHighlightProps = propsFactory({
  intervalHighlight: {
    type: [Boolean, String],
    default: false
  }
}, 'interval-highlight');
export function useIntervalHighlight(props, base) {
  const hoveredTime = shallowRef(null);

  // The underlay paints `background: currentColor`, so we only need a text color.
  const {
    textColorClasses,
    textColorStyles
  } = useTextColor(() => typeof props.intervalHighlight === 'string' && props.intervalHighlight ? props.intervalHighlight : 'surface-variant');

  // Day columns can overlay the intervals, so snap the cursor to an interval row.
  function getHoveredTimeFromEvent(e) {
    const index = Math.floor(base.getIntervalAtEvent(e));
    const intervals = base.intervals.value[0];
    if (!intervals || index < 0 || index >= intervals.length) return null;
    return intervals[index].time;
  }
  function onMousemove(e) {
    if (!props.intervalHighlight) return;
    hoveredTime.value = getHoveredTimeFromEvent(e);
  }
  function onMouseleave() {
    if (!props.intervalHighlight) return;
    hoveredTime.value = null;
  }
  function isHighlighted(interval) {
    return !!props.intervalHighlight && hoveredTime.value === interval.time;
  }
  function genUnderlay() {
    if (!props.intervalHighlight) return undefined;
    return _createElementVNode("div", {
      "class": _normalizeClass(['v-calendar-daily__day-interval__underlay', textColorClasses.value]),
      "style": _normalizeStyle(textColorStyles.value)
    }, null);
  }
  return {
    hoveredTime,
    onMousemove,
    onMouseleave,
    isHighlighted,
    genUnderlay
  };
}
//# sourceMappingURL=intervalHighlight.js.map