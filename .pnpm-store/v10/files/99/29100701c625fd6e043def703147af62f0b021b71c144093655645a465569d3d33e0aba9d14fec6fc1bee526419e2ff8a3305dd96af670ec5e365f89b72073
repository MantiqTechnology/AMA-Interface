import { normalizeProps as _normalizeProps, guardReactiveProps as _guardReactiveProps, createElementVNode as _createElementVNode, mergeProps as _mergeProps, createVNode as _createVNode } from "vue";
// Styles
import "./VTable.css";

// Composables
import { makeComponentProps } from "../../composables/component.js";
import { makeDensityProps, useDensity } from "../../composables/density.js";
import { makeTagProps } from "../../composables/tag.js";
import { makeThemeProps, provideTheme } from "../../composables/theme.js"; // Utilities
import { computed } from 'vue';
import { convertToUnit, genericComponent, pickWithRest, propsFactory, useRender } from "../../util/index.js"; // Types
export const makeVTableProps = propsFactory({
  gridlines: {
    type: [Boolean, String],
    default: 'horizontal',
    validator: v => typeof v === 'boolean' || ['horizontal', 'vertical', 'all'].includes(v)
  },
  fixedHeader: Boolean,
  fixedFooter: Boolean,
  height: [Number, String],
  hover: Boolean,
  striped: {
    type: String,
    default: null,
    validator: v => ['even', 'odd'].includes(v)
  },
  ...makeComponentProps(),
  ...makeDensityProps(),
  ...makeTagProps(),
  ...makeThemeProps()
}, 'VTable');
export const VTable = genericComponent()({
  name: 'VTable',
  inheritAttrs: false,
  props: makeVTableProps(),
  setup(props, {
    attrs,
    slots,
    emit
  }) {
    const {
      themeClasses
    } = provideTheme(props);
    const {
      densityClasses
    } = useDensity(props);
    const gridlinesVariant = computed(() => {
      if (props.gridlines === false) return 'none';
      if (props.gridlines === true) return 'all';
      return props.gridlines;
    });
    useRender(() => {
      const [tableAttrs, rootAttrs] = pickWithRest(attrs, [/^aria-label/]);
      return _createVNode(props.tag, _mergeProps(rootAttrs, {
        "class": ['v-table', `v-table--gridlines-${gridlinesVariant.value}`, {
          'v-table--fixed-height': !!props.height,
          'v-table--fixed-header': props.fixedHeader,
          'v-table--fixed-footer': props.fixedFooter,
          'v-table--has-top': !!slots.top,
          'v-table--has-bottom': !!slots.bottom,
          'v-table--hover': props.hover,
          'v-table--striped-even': props.striped === 'even',
          'v-table--striped-odd': props.striped === 'odd'
        }, themeClasses.value, densityClasses.value, props.class],
        "style": props.style
      }), {
        default: () => [slots.top?.(), slots.default ? _createElementVNode("div", {
          "class": "v-table__wrapper",
          "style": {
            height: convertToUnit(props.height)
          }
        }, [_createElementVNode("table", _normalizeProps(_guardReactiveProps(tableAttrs)), [slots.caption?.(), slots.default()])]) : slots.wrapper?.(), slots.bottom?.()]
      });
    });
    return {};
  }
});
//# sourceMappingURL=VTable.js.map