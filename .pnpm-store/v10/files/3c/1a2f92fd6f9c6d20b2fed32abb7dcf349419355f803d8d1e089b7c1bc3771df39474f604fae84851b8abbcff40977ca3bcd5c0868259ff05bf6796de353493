import { Fragment as _Fragment, createElementVNode as _createElementVNode, normalizeClass as _normalizeClass, createVNode as _createVNode } from "vue";
// Components
import { VField } from "../VField/VField.js"; // Utilities
import { computed, inject } from 'vue';
import { genericComponent, propsFactory, useRender } from "../../util/index.js"; // Shared
import { VOtpInputSymbol } from "./shared.js";
export const makeVOtpFieldProps = propsFactory({
  index: {
    type: Number,
    required: true
  }
}, 'VOtpField');
export const VOtpField = genericComponent()({
  name: 'VOtpField',
  props: makeVOtpFieldProps(),
  setup(props) {
    const otpInput = inject(VOtpInputSymbol);
    if (!otpInput) {
      throw new Error('[Vuetify] VOtpField must be used inside VOtpInput');
    }
    const slot = computed(() => otpInput.otpSlots.value[props.index]);
    const isHighlighted = computed(() => otpInput.isFocused.value && otpInput.focusAll.value && !slot.value?.isActive);
    useRender(() => {
      if (!slot.value) return _createElementVNode(_Fragment, null, null);
      return _createVNode(VField, {
        "data-otp-index": props.index,
        "focused": slot.value.isActive || isHighlighted.value,
        "class": _normalizeClass({
          'v-otp-input__field--highlighted': isHighlighted.value
        }),
        "onMousedown": e => e.preventDefault(),
        "onClick": () => otpInput.focusAt(props.index)
      }, {
        loader: undefined,
        default: () => _createElementVNode("div", {
          "class": "v-otp-input__field"
        }, [_createElementVNode("input", {
          "class": "v-otp-input__spacer",
          "aria-hidden": "true",
          "tabindex": "-1"
        }, null), slot.value.compositionChar ? _createElementVNode("span", {
          "class": "v-otp-input__composition"
        }, [slot.value.compositionChar]) : slot.value.hasFakeCaret ? _createElementVNode("span", {
          "class": "v-otp-input__caret"
        }, null) : _createElementVNode("span", {
          "class": _normalizeClass(!slot.value.char ? 'v-otp-input__placeholder' : undefined)
        }, [slot.value.char ?? slot.value.placeholderChar ?? ''])])
      });
    });
  }
});
//# sourceMappingURL=VOtpField.js.map