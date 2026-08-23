import { mergeProps as _mergeProps, createVNode as _createVNode, createElementVNode as _createElementVNode } from "vue";
// Styles
import "./VDatePickerMonths.css";

// Components
import { VBtn } from "../VBtn/index.js"; // Composables
import { useDate } from "../../composables/date/index.js";
import { useGridSelection } from "../../composables/gridSelection.js";
import { useProxiedModel } from "../../composables/proxiedModel.js"; // Utilities
import { computed, useId, watchEffect } from 'vue';
import { convertToUnit, createRange, genericComponent, propsFactory, useRender } from "../../util/index.js"; // Types
export const makeVDatePickerMonthsProps = propsFactory({
  color: String,
  columns: {
    type: Number,
    default: 2
  },
  height: [String, Number],
  min: null,
  max: null,
  modelValue: Number,
  year: Number,
  allowedMonths: [Array, Function]
}, 'VDatePickerMonths');
export const VDatePickerMonths = genericComponent()({
  name: 'VDatePickerMonths',
  props: makeVDatePickerMonthsProps(),
  emits: {
    'update:modelValue': date => true,
    escape: () => true
  },
  setup(props, {
    emit,
    slots
  }) {
    const adapter = useDate();
    const model = useProxiedModel(props, 'modelValue');
    const uid = useId();
    const months = computed(() => {
      let date = adapter.startOfYear(adapter.date());
      if (props.year) {
        date = adapter.setYear(date, props.year);
      }
      return createRange(12).map(i => {
        const text = adapter.format(date, 'monthShort');
        const label = adapter.format(date, 'month');
        const isDisabled = !!(!isMonthAllowed(i) || props.min && adapter.isAfter(adapter.startOfMonth(adapter.date(props.min)), date) || props.max && adapter.isAfter(date, adapter.startOfMonth(adapter.date(props.max))));
        date = adapter.getNextMonth(date);
        return {
          isDisabled,
          text,
          label,
          value: i
        };
      });
    });
    watchEffect(() => {
      model.value = model.value ?? adapter.getMonth(adapter.date());
    });
    function isMonthAllowed(month) {
      if (Array.isArray(props.allowedMonths) && props.allowedMonths.length) {
        return props.allowedMonths.includes(month);
      }
      if (typeof props.allowedMonths === 'function') {
        return props.allowedMonths(month);
      }
      return true;
    }
    function onMonthSelect(value) {
      if (model.value === value) emit('update:modelValue', value);else model.value = value;
    }
    const {
      containerProps,
      selectItem
    } = useGridSelection({
      items: () => months.value,
      columns: () => props.columns,
      initialValue: current => current ?? model.value ?? adapter.getMonth(adapter.date()),
      itemAttribute: 'data-v-month',
      onSelect: onMonthSelect,
      onEscape: () => emit('escape')
    });
    useRender(() => _createElementVNode("div", {
      "class": "v-date-picker-months",
      "style": {
        height: convertToUnit(props.height)
      }
    }, [_createElementVNode("div", _mergeProps({
      "class": "v-date-picker-months__content",
      "style": {
        '--v-date-picker-months-columns': props.columns
      }
    }, containerProps.value), [months.value.map((month, i) => {
      const btnProps = {
        id: `${uid}-month-${i}`,
        active: model.value === i,
        ariaLabel: month.label,
        color: model.value === i ? props.color : undefined,
        disabled: month.isDisabled,
        rounded: true,
        tabindex: -1,
        text: month.text,
        variant: model.value === month.value ? 'flat' : 'text',
        'data-v-month': month.value,
        onMousedown: e => e.preventDefault(),
        // preserve virtual focus
        onClick: () => selectItem(i)
      };
      return slots.month?.({
        month,
        i,
        props: btnProps
      }) ?? _createVNode(VBtn, _mergeProps({
        "key": "month"
      }, btnProps), null);
    })])]));
    return {};
  }
});
//# sourceMappingURL=VDatePickerMonths.js.map