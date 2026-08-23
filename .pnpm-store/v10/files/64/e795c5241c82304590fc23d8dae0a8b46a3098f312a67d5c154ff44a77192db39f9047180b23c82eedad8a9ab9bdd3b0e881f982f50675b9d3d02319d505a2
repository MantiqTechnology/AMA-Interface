import { mergeProps as _mergeProps, createVNode as _createVNode, createElementVNode as _createElementVNode, withDirectives as _withDirectives } from "vue";
// Styles
import "./VDatePickerYears.css";

// Components
import { VBtn } from "../VBtn/index.js"; // Composables
import { useDate } from "../../composables/date/index.js";
import { useGridSelection } from "../../composables/gridSelection.js";
import { useProxiedModel } from "../../composables/proxiedModel.js"; // Directives
import vIntersect from "../../directives/intersect/index.js"; // Utilities
import { computed, useId, watchEffect } from 'vue';
import { convertToUnit, createRange, genericComponent, propsFactory, templateRef, useRender } from "../../util/index.js"; // Types
// Types
export const makeVDatePickerYearsProps = propsFactory({
  color: String,
  columns: {
    type: Number,
    default: 3
  },
  height: [String, Number],
  min: null,
  max: null,
  modelValue: Number,
  allowedYears: [Array, Function]
}, 'VDatePickerYears');
export const VDatePickerYears = genericComponent()({
  name: 'VDatePickerYears',
  props: makeVDatePickerYearsProps(),
  directives: {
    vIntersect
  },
  emits: {
    'update:modelValue': year => true,
    escape: () => true
  },
  setup(props, {
    emit,
    slots
  }) {
    const adapter = useDate();
    const model = useProxiedModel(props, 'modelValue');
    const containerRef = templateRef();
    const uid = useId();
    const years = computed(() => {
      const year = adapter.getYear(adapter.date());
      let min = year - 100;
      let max = year + 52;
      if (props.min) {
        min = adapter.getYear(adapter.date(props.min));
      }
      if (props.max) {
        max = adapter.getYear(adapter.date(props.max));
      }
      let date = adapter.startOfYear(adapter.date());
      date = adapter.setYear(date, min);
      return createRange(max - min + 1, min).map(i => {
        const text = adapter.format(date, 'year');
        date = adapter.setYear(date, adapter.getYear(date) + 1);
        return {
          text,
          value: i,
          isDisabled: !isYearAllowed(i)
        };
      });
    });
    watchEffect(() => {
      model.value = model.value ?? adapter.getYear(adapter.date());
    });
    function isYearAllowed(year) {
      if (Array.isArray(props.allowedYears) && props.allowedYears.length) {
        return props.allowedYears.includes(year);
      }
      if (typeof props.allowedYears === 'function') {
        return props.allowedYears(year);
      }
      return true;
    }
    function onYearSelect(value) {
      if (model.value === value) emit('update:modelValue', value);else model.value = value;
    }
    const {
      containerProps,
      containerEl,
      selectItem
    } = useGridSelection({
      items: () => years.value,
      columns: () => props.columns,
      initialValue: current => current ?? model.value ?? adapter.getYear(adapter.date()),
      itemAttribute: 'data-v-year',
      onSelect: onYearSelect,
      onEscape: () => emit('escape')
    });
    function scrollToSelected() {
      const container = containerRef.el;
      const target = containerEl.value?.querySelector(`[data-v-year="${model.value}"]`);
      if (!container || !target) return;
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      container.scrollTop += targetRect.top - containerRect.top - container.clientHeight / 2 + targetRect.height / 2;
    }
    useRender(() => _withDirectives(_createElementVNode("div", {
      "class": "v-date-picker-years",
      "ref": containerRef,
      "tabindex": -1,
      "style": {
        height: convertToUnit(props.height)
      }
    }, [_createElementVNode("div", _mergeProps({
      "class": "v-date-picker-years__content",
      "style": {
        '--v-date-picker-years-columns': props.columns
      }
    }, containerProps.value), [years.value.map((year, i) => {
      const btnProps = {
        id: `${uid}-year-${year.value}`,
        active: model.value === year.value,
        color: model.value === year.value ? props.color : undefined,
        rounded: true,
        tabindex: -1,
        text: year.text,
        disabled: year.isDisabled,
        variant: model.value === year.value ? 'flat' : 'text',
        'data-v-year': year.value,
        onMousedown: e => e.preventDefault(),
        // preserve virtual focus
        onClick: () => selectItem(year.value)
      };
      return slots.year?.({
        year,
        i,
        props: btnProps
      }) ?? _createVNode(VBtn, _mergeProps({
        "key": "month"
      }, btnProps), null);
    })])]), [[vIntersect, {
      handler: scrollToSelected
    }, null, {
      once: true
    }]]));
    return {};
  }
});
//# sourceMappingURL=VDatePickerYears.js.map