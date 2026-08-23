// Composables
import { useDate } from "../../composables/date/index.js";
import { useRangePicker } from "../../composables/rangePicker.js"; // Utilities
import { computed, shallowRef, toRef, watch } from 'vue';

// Types

function toISO(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}
function compareISO(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
export function useMonthPicker(props, model) {
  const adapter = useDate();
  const year = shallowRef(adapter.getYear(adapter.date()));
  const range = useRangePicker({
    multiple: toRef(() => props.multiple),
    model,
    compare: compareISO
  });
  function getMonthValue(monthIndex) {
    return toISO(year.value, monthIndex);
  }
  function selectMonth(monthIndex) {
    range.select(getMonthValue(monthIndex));
  }
  const disablePrevYear = computed(() => {
    if (!props.min) return false;
    const minYear = parseInt(props.min.split('-')[0], 10);
    return year.value <= minYear;
  });
  const disableNextYear = computed(() => {
    if (!props.max) return false;
    const maxYear = parseInt(props.max.split('-')[0], 10);
    return year.value >= maxYear;
  });
  function prevYear() {
    if (disablePrevYear.value) return;
    year.value--;
  }
  function nextYear() {
    if (disableNextYear.value) return;
    year.value++;
  }
  watch(model, val => {
    if (val.length === 0) return;
    const last = val[val.length - 1];
    const [y] = last.split('-').map(v => parseInt(v, 10));
    year.value = y;
  }, {
    immediate: true
  });
  return {
    year,
    disablePrevYear,
    disableNextYear,
    selectMonth,
    prevYear,
    nextYear,
    getMonthValue,
    range
  };
}
//# sourceMappingURL=month-picker.js.map