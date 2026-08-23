import { createVNode as _createVNode, Fragment as _Fragment, createElementVNode as _createElementVNode, mergeProps as _mergeProps, normalizeStyle as _normalizeStyle } from "vue";
// Styles
import "./VOtpInput.css";

// Components
import { VOtpField } from "./VOtpField.js";
import { VOtpGroup } from "./VOtpGroup.js";
import { VOtpSeparator } from "./VOtpSeparator.js";
import { makeVFieldProps } from "../VField/VField.js";
import { VOverlay } from "../VOverlay/VOverlay.js";
import { VProgressCircular } from "../VProgressCircular/VProgressCircular.js"; // Composables
import { useOtpInput } from "./useOtpInput.js";
import { provideDefaults } from "../../composables/defaults.js";
import { makeDensityProps, useDensity } from "../../composables/density.js";
import { makeDimensionProps, useDimension } from "../../composables/dimensions.js";
import { makeFocusProps, useFocus } from "../../composables/focus.js";
import { useIntersectionObserver } from "../../composables/intersectionObserver.js";
import { useLocale, useRtl } from "../../composables/locale.js";
import { useProxiedModel } from "../../composables/proxiedModel.js";
import { useToggleScope } from "../../composables/toggleScope.js"; // Utilities
import { effectScope, provide, ref, toRef, watch, watchEffect } from 'vue';
import { filterInputAttrs, genericComponent, pick, propsFactory, useRender } from "../../util/index.js"; // Shared
import { VOtpInputSymbol } from "./shared.js"; // Types
export { VOtpInputSymbol } from "./shared.js";
export const makeVOtpInputProps = propsFactory({
  autofocus: Boolean,
  divider: String,
  focusAll: Boolean,
  merged: Boolean,
  label: {
    type: String,
    default: '$vuetify.input.otp'
  },
  length: {
    type: [Number, String],
    default: 6
  },
  masked: Boolean,
  modelValue: {
    type: [Number, String],
    default: undefined
  },
  pattern: {
    type: [String, Object],
    default: undefined
  },
  placeholder: String,
  type: {
    type: String,
    default: 'number'
  },
  ...makeDensityProps(),
  ...makeDimensionProps(),
  ...makeFocusProps(),
  ...pick(makeVFieldProps({
    variant: 'outlined'
  }), ['baseColor', 'bgColor', 'class', 'color', 'disabled', 'error', 'loading', 'rounded', 'style', 'theme', 'variant'])
}, 'VOtpInput');
export const VOtpInput = genericComponent()({
  name: 'VOtpInput',
  props: makeVOtpInputProps(),
  emits: {
    finish: value => true,
    'update:focused': value => true,
    'update:modelValue': value => true
  },
  setup(props, {
    attrs,
    emit,
    slots
  }) {
    const {
      densityClasses
    } = useDensity(props);
    const {
      dimensionStyles
    } = useDimension(props);
    const {
      isFocused
    } = useFocus(props);
    const {
      t
    } = useLocale();
    const {
      isRtl
    } = useRtl();
    const model = useProxiedModel(props, 'modelValue', '', val => val == null ? '' : String(val));
    const inputRef = ref();
    const length = toRef(() => Number(props.length));
    let focusAtPending = false;
    const otp = useOtpInput({
      value: model,
      length,
      pattern: () => props.pattern,
      type: () => props.type,
      masked: () => props.masked,
      placeholder: () => props.placeholder,
      isFocused
    });
    function applySelection() {
      const input = inputRef.value;
      const selection = otp.selection.value;
      if (!input || !selection) return;
      input.setSelectionRange(selection.start, selection.end, selection.direction);
    }
    function syncDOM() {
      const input = inputRef.value;
      if (!input) return;
      if (input.value !== otp.value.value) input.value = otp.value.value;
      applySelection();
    }
    function onSelectionChange() {
      const input = inputRef.value;
      if (!input) {
        otp.clearSelection();
        return;
      }
      const result = otp.syncSelection({
        value: input.value,
        selectionStart: input.selectionStart,
        selectionEnd: input.selectionEnd,
        selectionDirection: input.selectionDirection,
        // Slot count, not `input.maxLength` (code units).
        maxLength: length.value
      });
      if (!result) return;
      if (input.selectionStart !== result.start || input.selectionEnd !== result.end) {
        input.setSelectionRange(result.start, result.end, result.direction);
      }
    }
    function onInput(e) {
      const ev = e;
      const target = e.target;
      const composing = ev.isComposing || otp.isComposing.value;

      // CJK composition renders via the overlay until compositionend.
      if (composing && otp.isImeText(target.value)) return;

      // Non-CJK composition (dead keys, Samsung predictive, Chrome OTP autofill)
      // commits into the model now; don't end composition early or selection
      // will advance past the model length on the next selectionchange.
      const next = otp.setValue(target.value);
      if (target.value !== next) target.value = next;
    }
    function onCompositionstart() {
      otp.startComposition();
    }
    function onCompositionupdate(e) {
      otp.updateComposition(e.data ?? '');
    }
    function onCompositionend(e) {
      otp.endComposition();
      onInput(e);
    }
    function onFocus() {
      isFocused.value = true;
      if (focusAtPending) return;
      if (!inputRef.value) return;
      otp.selectAtEnd();
      applySelection();
    }
    function onBlur() {
      isFocused.value = false;
      otp.clearSelection();
    }
    function onKeydown(e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const direction = (e.key === 'ArrowLeft' ? -1 : 1) * (isRtl.value ? -1 : 1);
        const moved = e.shiftKey ? otp.extendSelection(direction) : otp.moveCaret(direction);
        if (moved) {
          e.preventDefault();
          syncDOM();
        }
        return;
      }
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      if (!e.metaKey && !e.ctrlKey && !e.altKey) return;
      e.preventDefault();
      otp.bulkDelete(e.key === 'Backspace');
      syncDOM();
    }
    function onBeforeinput(e) {
      if (e.inputType === 'insertText' && e.data && otp.effectivePattern.value && !otp.effectivePattern.value.test(e.data)) {
        e.preventDefault();
        return;
      }
      if (e.inputType === 'deleteContentForward') {
        e.preventDefault();
        const input = inputRef.value;
        if (!input) return;
        const selection = otp.selection.value;
        const start = selection?.start ?? 0;
        const end = selection?.end ?? input.value.length;
        otp.deleteRange(start, end);
        syncDOM();
        return;
      }
      const isBackward = ['deleteWordBackward', 'deleteSoftLineBackward', 'deleteHardLineBackward'].includes(e.inputType);
      const isForward = ['deleteWordForward', 'deleteSoftLineForward', 'deleteHardLineForward'].includes(e.inputType);
      if (!isBackward && !isForward) return;
      e.preventDefault();
      otp.bulkDelete(isBackward);
      syncDOM();
    }
    function onPaste(e) {
      e.preventDefault();
      const input = inputRef.value;
      if (!input) return;
      const text = e.clipboardData?.getData('text/plain').trim() ?? '';
      const selection = otp.selection.value;
      otp.insert(text, {
        start: selection?.start ?? 0,
        end: selection?.end ?? input.value.length
      });
      syncDOM();
    }
    function focusAt(index) {
      const input = inputRef.value;
      if (!input) return;
      focusAtPending = true;
      input.focus();
      focusAtPending = false;
      otp.selectSlot(index);
      applySelection();
    }
    function slotIndexAtPoint(x, y) {
      const slot = document.elementsFromPoint(x, y).find(el => el.hasAttribute('data-otp-index'));
      const index = slot ? Number(slot.getAttribute('data-otp-index')) : NaN;
      return Number.isNaN(index) ? null : index;
    }
    function onClick(e) {
      const index = slotIndexAtPoint(e.clientX, e.clientY);
      if (index != null) focusAt(index);
    }

    // selectionchange is not in InputHTMLAttributes types
    watch(inputRef, (input, _, onCleanup) => {
      if (!input) return;
      input.addEventListener('selectionchange', onSelectionChange);
      onCleanup(() => input.removeEventListener('selectionchange', onSelectionChange));
    }, {
      immediate: true
    });
    useToggleScope(() => props.autofocus, () => {
      const intersectScope = effectScope();
      intersectScope.run(() => {
        const {
          intersectionRef,
          isIntersecting
        } = useIntersectionObserver();
        watchEffect(() => {
          intersectionRef.value = inputRef.value;
        });
        watch(isIntersecting, v => {
          if (!v) return;
          intersectionRef.value?.focus();
          intersectScope.stop();
        });
      });
    });
    watch(model, val => {
      if (otp.isComposing.value) return;
      if (val.length === length.value) emit('finish', val);
    });
    provideDefaults({
      VField: {
        color: toRef(() => props.color),
        bgColor: toRef(() => props.color),
        baseColor: toRef(() => props.baseColor),
        disabled: toRef(() => props.disabled),
        error: toRef(() => props.error),
        variant: toRef(() => props.variant),
        rounded: toRef(() => props.rounded)
      }
    }, {
      scoped: true
    });
    provide(VOtpInputSymbol, {
      otpSlots: otp.slots,
      isFocused,
      focusAll: toRef(() => props.focusAll),
      divider: toRef(() => props.divider),
      merged: toRef(() => props.merged),
      focusAt
    });
    useRender(() => {
      const [rootAttrs, inputAttrs] = filterInputAttrs(attrs);
      return _createElementVNode("div", _mergeProps({
        "class": ['v-otp-input', {
          'v-otp-input--divided': !!props.divider
        }, densityClasses.value, props.class],
        "style": [props.style]
      }, rootAttrs), [_createElementVNode("div", {
        "class": "v-otp-input__content",
        "style": _normalizeStyle([dimensionStyles.value])
      }, [slots.fields ? slots.fields() : props.merged ? _createVNode(VOtpGroup, {
        "merged": true
      }, {
        default: () => [Array.from({
          length: length.value
        }, (_, i) => _createVNode(VOtpField, {
          "index": i,
          "key": i
        }, null))]
      }) : Array.from({
        length: length.value
      }, (_, i) => _createElementVNode(_Fragment, null, [(props.divider || slots.divider) && i !== 0 && _createVNode(VOtpSeparator, {
        "key": `d-${i}`
      }, {
        default: () => [slots.divider?.({
          index: i - 1
        }) ?? props.divider]
      }), _createVNode(VOtpField, {
        "index": i,
        "key": i
      }, null)])), _createElementVNode("input", _mergeProps({
        "ref": inputRef,
        "class": "v-otp-input__input",
        "type": "text",
        "inputmode": otp.inputMode.value,
        "dir": isRtl.value ? 'rtl' : 'ltr',
        "autocomplete": "one-time-code",
        "autocorrect": "off",
        "autocapitalize": "off",
        "spellcheck": false,
        "disabled": props.disabled,
        "aria-label": t(props.label),
        "value": model.value
      }, inputAttrs, {
        "onClick": onClick,
        "onInput": onInput,
        "onKeydown": onKeydown,
        "onBeforeinput": onBeforeinput,
        "onFocus": onFocus,
        "onBlur": onBlur,
        "onPaste": onPaste,
        "onCompositionstart": onCompositionstart,
        "onCompositionupdate": onCompositionupdate,
        "onCompositionend": onCompositionend
      }), null), _createVNode(VOverlay, {
        "contained": true,
        "contentClass": "v-otp-input__loader",
        "modelValue": !!props.loading,
        "persistent": true
      }, {
        default: () => [slots.loader?.() ?? _createVNode(VProgressCircular, {
          "color": typeof props.loading === 'boolean' ? undefined : props.loading,
          "indeterminate": true,
          "size": "24",
          "width": "2"
        }, null)]
      }), slots.default?.()])]);
    });
    return {
      blur: () => {
        inputRef.value?.blur();
      },
      focus: () => {
        inputRef.value?.focus();
      },
      reset: otp.reset,
      isFocused
    };
  }
});
export { useOtpInput, OtpInputPatterns } from "./useOtpInput.js";
//# sourceMappingURL=VOtpInput.js.map