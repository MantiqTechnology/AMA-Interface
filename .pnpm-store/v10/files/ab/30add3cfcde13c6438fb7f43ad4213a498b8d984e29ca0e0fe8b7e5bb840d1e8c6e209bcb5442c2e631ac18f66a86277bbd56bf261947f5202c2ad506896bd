// Utilities
import { computed, isRef } from 'vue';
import { convertToUnit, getCurrentInstanceName, propsFactory } from "../util/index.js"; // Types
// Composables
export const makeRoundedProps = propsFactory({
  rounded: {
    type: [Boolean, Number, String],
    default: undefined
  },
  tile: Boolean
}, 'rounded');
export function useRounded(props, name = getCurrentInstanceName()) {
  const roundedClasses = computed(() => {
    const rounded = isRef(props) ? props.value : props.rounded;
    const tile = isRef(props) ? false : props.tile;
    const classes = [];
    if (tile || rounded === false) {
      classes.push('rounded-0');
    } else if (rounded === true || rounded === '') {
      classes.push(`${name}--rounded`);
    } else if (rounded === 0 || typeof rounded === 'string' && (rounded === '0' || !/[0-9%]/.test(rounded) || /\d*xl$/.test(rounded))) {
      for (const value of String(rounded).split(' ')) {
        classes.push(`rounded-${value}`);
      }
    }
    return classes;
  });
  const roundedStyles = computed(() => {
    const rounded = isRef(props) ? props.value : props.rounded;
    const roundedText = String(rounded);
    if (!/[0-9]/.test(roundedText) || roundedText.includes('xl') || roundedText === '0') {
      return {};
    }
    return {
      borderRadius: convertToUnit(roundedText)
    };
  });
  return {
    roundedClasses,
    roundedStyles
  };
}
//# sourceMappingURL=rounded.js.map