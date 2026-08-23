// Utilities
import { computed, Fragment, inject, normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle, createElementVNode as _createElementVNode } from 'vue';
import { genericComponent, propsFactory, useRender } from "../../util/index.js"; // Shared
import { VOtpInputSymbol } from "./shared.js"; // Types
function countSlotChildren(vnodes) {
  let count = 0;
  for (const vnode of vnodes) {
    if (vnode.type === Fragment && Array.isArray(vnode.children)) {
      count += countSlotChildren(vnode.children);
    } else {
      count++;
    }
  }
  return count;
}
export const makeVOtpGroupProps = propsFactory({
  merged: {
    type: Boolean,
    default: null
  }
}, 'VOtpGroup');
export const VOtpGroup = genericComponent()({
  name: 'VOtpGroup',
  props: makeVOtpGroupProps(),
  setup(props, {
    slots
  }) {
    const otpInput = inject(VOtpInputSymbol);
    const isMerged = computed(() => props.merged ?? otpInput?.merged.value ?? false);
    useRender(() => {
      const children = slots.default?.() ?? [];
      return _createElementVNode("div", {
        "class": _normalizeClass(['v-otp-group', {
          'v-otp-group--merged': isMerged.value
        }]),
        "style": _normalizeStyle(isMerged.value ? {
          flex: countSlotChildren(children)
        } : undefined)
      }, [children]);
    });
  }
});
//# sourceMappingURL=VOtpGroup.js.map