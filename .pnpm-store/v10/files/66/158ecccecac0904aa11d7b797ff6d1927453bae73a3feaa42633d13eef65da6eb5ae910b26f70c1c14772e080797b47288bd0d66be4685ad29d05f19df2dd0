import { createElementVNode as _createElementVNode, normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle, Fragment as _Fragment, createVNode as _createVNode, mergeProps as _mergeProps } from "vue";
// Styles
import "./VSwitch.css";

// Components
import { VScaleTransition } from "../transitions/index.js";
import { VDefaultsProvider } from "../VDefaultsProvider/VDefaultsProvider.js";
import { VIcon } from "../VIcon/index.js";
import { makeVInputProps, VInput } from "../VInput/VInput.js";
import { VProgressCircular } from "../VProgressCircular/index.js";
import { makeVSelectionControlProps, VSelectionControl } from "../VSelectionControl/VSelectionControl.js"; // Composables
import { useBackgroundColor } from "../../composables/color.js";
import { useFocus } from "../../composables/focus.js";
import { forwardRefs } from "../../composables/forwardRefs.js";
import { LoaderSlot, useLoader } from "../../composables/loader.js";
import { useProxiedModel } from "../../composables/proxiedModel.js";
import { makeSizeProps } from "../../composables/size.js"; // Utilities
import { ref, toRef, useId } from 'vue';
import { filterInputAttrs, genericComponent, omit, propsFactory, SUPPORTS_MATCH_MEDIA, useRender } from "../../util/index.js"; // Types
export const makeVSwitchProps = propsFactory({
  inset: {
    type: [Boolean, String],
    default: false
  },
  flat: Boolean,
  thumbColor: String,
  loading: {
    type: [Boolean, String],
    default: false
  },
  ...omit(makeVInputProps(), ['glow']),
  ...makeVSelectionControlProps(),
  ...makeSizeProps()
}, 'VSwitch');
const predefinedSizes = ['x-small', 'small', 'default', 'large', 'x-large'];
const iconSizes = {
  'x-small': 11,
  small: 14,
  default: 16,
  large: 18,
  'x-large': 22
};
export const VSwitch = genericComponent()({
  name: 'VSwitch',
  inheritAttrs: false,
  props: makeVSwitchProps(),
  emits: {
    'update:focused': focused => true,
    'update:modelValue': value => true,
    'update:indeterminate': value => true
  },
  setup(props, {
    attrs,
    slots
  }) {
    const indeterminate = useProxiedModel(props, 'indeterminate');
    const model = useProxiedModel(props, 'modelValue');
    const {
      loaderClasses
    } = useLoader(props);
    const {
      isFocused,
      focus,
      blur
    } = useFocus(props);
    const {
      backgroundColorClasses: thumbColorClasses,
      backgroundColorStyles: thumbColorStyles
    } = useBackgroundColor(() => props.thumbColor);
    const control = ref();
    const inputRef = ref();
    const isForcedColorsModeActive = SUPPORTS_MATCH_MEDIA && window.matchMedia('(forced-colors: active)').matches;
    const loaderColor = toRef(() => {
      return typeof props.loading === 'string' && props.loading !== '' ? props.loading : props.color;
    });
    const uid = useId();
    const id = toRef(() => props.id || `switch-${uid}`);
    const isPredefinedSize = toRef(() => predefinedSizes.includes(props.size));
    const iconSize = toRef(() => {
      return isPredefinedSize.value ? iconSizes[props.size] : Math.round(16 * Number(props.size) / 32);
    });
    function onChange() {
      if (indeterminate.value) {
        indeterminate.value = false;
      }
    }
    function onTrackClick(e) {
      e.stopPropagation();
      e.preventDefault();
      control.value?.input?.click();
    }
    useRender(() => {
      const [rootAttrs, controlAttrs] = filterInputAttrs(attrs);
      const inputProps = VInput.filterProps(props);
      const controlProps = VSelectionControl.filterProps(props);
      const isMaterial = ['material', 'square'].includes(String(props.inset));
      const hasThumbColor = !isForcedColorsModeActive && !!props.thumbColor;
      return _createVNode(VInput, _mergeProps({
        "ref": inputRef,
        "class": ['v-switch', {
          'v-switch--flat': props.flat
        }, {
          'v-switch--inset': !!props.inset
        }, {
          'v-switch--inset-material': isMaterial
        }, {
          'v-switch--inset-square': props.inset === 'square'
        }, {
          'v-switch--indeterminate': indeterminate.value
        }, isPredefinedSize.value ? `v-switch--size-${props.size}` : undefined, loaderClasses.value, props.class]
      }, rootAttrs, inputProps, {
        "modelValue": model.value,
        "onUpdate:modelValue": $event => model.value = $event,
        "id": id.value,
        "focused": isFocused.value,
        "style": [{
          '--v-switch-scale': isPredefinedSize.value ? undefined : Number(props.size) / 32
        }, props.style]
      }), {
        ...slots,
        default: ({
          id,
          messagesId,
          isDisabled,
          isReadonly,
          isValid
        }) => {
          const slotProps = {
            model,
            isValid
          };
          return _createVNode(VSelectionControl, _mergeProps({
            "ref": control
          }, controlProps, {
            "modelValue": model.value,
            "onUpdate:modelValue": [$event => model.value = $event, onChange],
            "id": id.value,
            "aria-describedby": messagesId.value,
            "type": "checkbox",
            "aria-checked": indeterminate.value ? 'mixed' : undefined,
            "disabled": isDisabled.value,
            "readonly": isReadonly.value,
            "onFocus": focus,
            "onBlur": blur
          }, controlAttrs), {
            ...slots,
            default: ({
              backgroundColorClasses,
              backgroundColorStyles
            }) => _createElementVNode("div", {
              "class": _normalizeClass(['v-switch__track', !isForcedColorsModeActive ? backgroundColorClasses.value : undefined]),
              "style": _normalizeStyle(backgroundColorStyles.value),
              "onClick": onTrackClick
            }, [slots['track-true'] && _createElementVNode("div", {
              "key": "prepend",
              "class": "v-switch__track-true"
            }, [slots['track-true'](slotProps)]), slots['track-false'] && _createElementVNode("div", {
              "key": "append",
              "class": "v-switch__track-false"
            }, [slots['track-false'](slotProps)])]),
            input: ({
              inputNode,
              icon,
              model: isSelected,
              backgroundColorClasses,
              backgroundColorStyles,
              textColorClasses,
              textColorStyles
            }) => _createElementVNode(_Fragment, null, [inputNode, _createElementVNode("div", {
              "class": _normalizeClass(['v-switch__thumb', {
                'v-switch__thumb--filled': icon || props.loading
              }, isForcedColorsModeActive ? undefined : hasThumbColor && isSelected.value ? thumbColorClasses.value : isMaterial ? backgroundColorClasses.value : props.inset ? undefined : backgroundColorClasses.value]),
              "style": _normalizeStyle([hasThumbColor && isSelected.value ? thumbColorStyles.value : isMaterial ? backgroundColorClasses.value.length || backgroundColorStyles.value.backgroundColor ? {
                backgroundColor: 'currentColor'
              } : undefined : props.inset ? undefined : backgroundColorStyles.value])
            }, [slots.thumb ? _createVNode(VDefaultsProvider, {
              "defaults": {
                VIcon: {
                  icon,
                  size: isMaterial ? iconSize.value : 'x-small'
                }
              }
            }, {
              default: () => [slots.thumb({
                ...slotProps,
                icon
              })]
            }) : _createVNode(VScaleTransition, null, {
              default: () => [!props.loading ? icon && _createVNode(VIcon, {
                "key": String(icon),
                "class": _normalizeClass(isMaterial ? textColorClasses.value : undefined),
                "style": _normalizeStyle(isMaterial ? textColorStyles.value : undefined),
                "icon": icon,
                "size": isMaterial ? iconSize.value : 'x-small'
              }, null) : _createVNode(LoaderSlot, {
                "name": "v-switch",
                "active": true,
                "color": isValid.value === false ? undefined : loaderColor.value
              }, {
                default: slotProps => slots.loader ? slots.loader(slotProps) : _createVNode(VProgressCircular, {
                  "active": slotProps.isActive,
                  "color": slotProps.color,
                  "indeterminate": true,
                  "size": iconSize.value,
                  "width": "2"
                }, null)
              })]
            })])])
          });
        }
      });
    });
    return forwardRefs({}, inputRef);
  }
});
//# sourceMappingURL=VSwitch.js.map