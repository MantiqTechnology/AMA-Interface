import { normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle, createVNode as _createVNode } from "vue";
// Styles
import "./VExpansionPanel.css";

// Components
import { VExpansionPanelSymbol } from "./shared.js";
import { makeVExpansionPanelProps } from "./VExpansionPanel.js"; // Composables
import { makeComponentProps } from "../../composables/component.js";
import { provideDefaults } from "../../composables/defaults.js";
import { makeGroupProps, useGroup } from "../../composables/group.js";
import { useRounded } from "../../composables/rounded.js";
import { makeTagProps } from "../../composables/tag.js";
import { makeThemeProps, provideTheme } from "../../composables/theme.js"; // Utilities
import { toRef } from 'vue';
import { convertToUnit, genericComponent, pick, propsFactory, useRender } from "../../util/index.js"; // Types
const allowedVariants = ['default', 'accordion', 'inset', 'popout'];
export const makeVExpansionPanelsProps = propsFactory({
  flat: Boolean,
  gap: [String, Number],
  noDivider: Boolean,
  rounded: [Boolean, Number, String, Array],
  ...makeGroupProps(),
  ...pick(makeVExpansionPanelProps(), ['bgColor', 'collapseIcon', 'color', 'eager', 'elevation', 'expandIcon', 'focusable', 'hideActions', 'hover', 'readonly', 'ripple', 'static', 'tile']),
  ...makeThemeProps(),
  ...makeComponentProps(),
  ...makeTagProps(),
  variant: {
    type: String,
    default: 'default',
    validator: v => allowedVariants.includes(v)
  }
}, 'VExpansionPanels');
export const VExpansionPanels = genericComponent()({
  name: 'VExpansionPanels',
  props: makeVExpansionPanelsProps(),
  emits: {
    'update:modelValue': val => true
  },
  setup(props, {
    slots
  }) {
    const {
      next,
      prev
    } = useGroup(props, VExpansionPanelSymbol);
    const {
      themeClasses
    } = provideTheme(props);
    const outerRounded = toRef(() => Array.isArray(props.rounded) ? props.rounded[0] : props.rounded);
    const innerRounded = toRef(() => Array.isArray(props.rounded) ? props.rounded[1] : undefined);
    const {
      roundedClasses,
      roundedStyles
    } = useRounded(outerRounded);
    const variantClass = toRef(() => props.variant && `v-expansion-panels--variant-${props.variant}`);
    provideDefaults({
      VExpansionPanel: {
        bgColor: toRef(() => props.bgColor),
        collapseIcon: toRef(() => props.collapseIcon),
        color: toRef(() => props.color),
        eager: toRef(() => props.eager),
        elevation: toRef(() => props.elevation),
        expandIcon: toRef(() => props.expandIcon),
        focusable: toRef(() => props.focusable),
        hideActions: toRef(() => props.hideActions),
        hover: toRef(() => props.hover),
        readonly: toRef(() => props.readonly),
        ripple: toRef(() => props.ripple),
        static: toRef(() => props.static)
      }
    });
    useRender(() => _createVNode(props.tag, {
      "class": _normalizeClass(['v-expansion-panels', {
        'v-expansion-panels--flat': props.flat,
        'v-expansion-panels--tile': props.tile,
        'v-expansion-panels--no-divider': props.noDivider || !!props.gap
      }, themeClasses.value, roundedClasses.value, variantClass.value, props.class]),
      "style": _normalizeStyle([roundedStyles.value, {
        '--v-expansion-panels-inner-radius': convertToUnit(innerRounded.value),
        gap: props.gap ? convertToUnit(props.gap) : undefined
      }, props.style])
    }, {
      default: () => [slots.default?.({
        prev,
        next
      })]
    }));
    return {
      next,
      prev
    };
  }
});
//# sourceMappingURL=VExpansionPanels.js.map