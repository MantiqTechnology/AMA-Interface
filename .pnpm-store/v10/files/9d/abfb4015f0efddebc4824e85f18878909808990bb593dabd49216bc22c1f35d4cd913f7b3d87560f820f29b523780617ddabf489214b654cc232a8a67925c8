// Composables
import { makeDelayProps, useDelay } from "../../composables/delay.js";
import { useProxiedModel } from "../../composables/proxiedModel.js"; // Utilities
import { shallowRef, watch } from 'vue';
import { genericComponent, propsFactory } from "../../util/index.js";
export const makeVHoverProps = propsFactory({
  disabled: Boolean,
  modelValue: {
    type: Boolean,
    default: null
  },
  ...makeDelayProps()
}, 'VHover');
export const VHover = genericComponent()({
  name: 'VHover',
  props: makeVHoverProps(),
  emits: {
    'update:modelValue': value => true
  },
  setup(props, {
    slots
  }) {
    const isHovering = useProxiedModel(props, 'modelValue');

    // track hover state regardless of disabled, so we can reconcile
    const internal = shallowRef(false);
    const {
      runOpenDelay,
      runCloseDelay
    } = useDelay(props, value => {
      internal.value = value;
      if (!props.disabled) {
        isHovering.value = value;
      }
    });
    watch(() => props.disabled, (val, old) => {
      if (old && !val) {
        isHovering.value = internal.value;
      }
    });
    return () => slots.default?.({
      isHovering: isHovering.value,
      props: {
        onMouseenter: runOpenDelay,
        onMouseleave: runCloseDelay
      }
    });
  }
});
//# sourceMappingURL=VHover.js.map