import { Fragment as _Fragment, createVNode as _createVNode, createElementVNode as _createElementVNode, normalizeClass as _normalizeClass, mergeProps as _mergeProps } from "vue";
// Styles
import "./VDateRangePicker.css";

// Components
import { VBtn } from "../../components/VBtn/index.js";
import { makeVDatePickerProps, VDatePicker } from "../../components/VDatePicker/VDatePicker.js";
import { VSpacer } from "../../components/VGrid/index.js";
import { makeVPickerProps, VPicker } from "../../components/VPicker/VPicker.js"; // Composables
import { useDate } from "../../composables/date/index.js";
import { useProxiedModel } from "../../composables/proxiedModel.js"; // Utilities
import { computed, nextTick, shallowRef, watch } from 'vue';
import { genericComponent, pick, propsFactory, useRender } from "../../util/index.js"; // Types
const datePickerForwardedKeys = ['min', 'max', 'allowedDates', 'allowedMonths', 'allowedYears', 'weekdays', 'firstDayOfWeek', 'firstDayOfYear', 'weekdayFormat', 'weeksInMonth', 'hideWeekdays', 'showWeek', 'color', 'readonly', 'disabled', 'prevIcon', 'nextIcon', 'transition', 'reverseTransition', 'controlHeight'];
export const makeVDateRangePickerProps = propsFactory({
  independentMonths: Boolean,
  modelValue: null,
  ...makeVPickerProps({
    title: '$vuetify.datePicker.title'
  }),
  ...pick(makeVDatePickerProps(), datePickerForwardedKeys)
}, 'VDateRangePicker');
export const VDateRangePicker = genericComponent()({
  name: 'VDateRangePicker',
  props: makeVDateRangePickerProps(),
  emits: {
    'update:modelValue': _value => true
  },
  setup(props, {
    slots
  }) {
    const adapter = useDate();
    const model = useProxiedModel(props, 'modelValue', []);
    const today = adapter.date();
    const leftMonth = shallowRef(adapter.getMonth(today));
    const leftYear = shallowRef(adapter.getYear(today));
    const rightMonth = shallowRef(0);
    const rightYear = shallowRef(0);
    function shiftMonth(month, year, delta) {
      const total = month + delta + year * 12;
      return {
        month: (total % 12 + 12) % 12,
        year: Math.floor(total / 12)
      };
    }
    function syncRightFromLeft() {
      const next = shiftMonth(leftMonth.value, leftYear.value, 1);
      rightMonth.value = next.month;
      rightYear.value = next.year;
    }
    function syncLeftFromRight() {
      const previous = shiftMonth(rightMonth.value, rightYear.value, -1);
      leftMonth.value = previous.month;
      leftYear.value = previous.year;
    }
    const leftIndex = computed(() => leftYear.value * 12 + leftMonth.value);
    const rightIndex = computed(() => rightYear.value * 12 + rightMonth.value);
    const leftNextDisabled = computed(() => leftIndex.value + 1 >= rightIndex.value);
    const rightPrevDisabled = computed(() => rightIndex.value - 1 <= leftIndex.value);
    const rootRef = shallowRef();
    const leftPickerRef = shallowRef();
    const rightPickerRef = shallowRef();
    const previewValue = shallowRef();
    function panelContaining(iso) {
      if (leftPickerRef.value?.$el?.querySelector(`[data-v-date="${iso}"]`)) return leftPickerRef.value;
      if (rightPickerRef.value?.$el?.querySelector(`[data-v-date="${iso}"]`)) return rightPickerRef.value;
      return null;
    }
    function isMonthInView(date) {
      const month = adapter.getMonth(date);
      const year = adapter.getYear(date);
      return month === leftMonth.value && year === leftYear.value || month === rightMonth.value && year === rightYear.value;
    }
    function navigateToSelection() {
      const dates = model.value;
      if (!dates.length) return;
      const first = adapter.date(dates[0]);
      const last = adapter.date(dates[dates.length - 1]);
      leftMonth.value = adapter.getMonth(first);
      leftYear.value = adapter.getYear(first);
      if (!props.independentMonths) {
        syncRightFromLeft();
        return;
      }
      const firstIndex = leftIndex.value;
      const lastIndex = adapter.getYear(last) * 12 + adapter.getMonth(last);
      const targetRightIndex = Math.max(lastIndex, firstIndex + 1);
      rightYear.value = Math.floor(targetRightIndex / 12);
      rightMonth.value = targetRightIndex - rightYear.value * 12;
    }
    syncRightFromLeft();
    navigateToSelection();
    let syncing = false;
    watch([leftMonth, leftYear], () => {
      if (syncing || props.independentMonths) return;
      syncing = true;
      syncRightFromLeft();
      syncing = false;
    });
    watch([rightMonth, rightYear], () => {
      if (syncing || props.independentMonths) return;
      syncing = true;
      syncLeftFromRight();
      syncing = false;
    });

    // Re-pair the panels when independent-months turns OFF. Preserve the right panel if it
    // holds the range start; otherwise default to right = left + 1.
    watch(() => props.independentMonths, (value, oldValue) => {
      if (value || !oldValue) return;
      const start = model.value[0];
      if (start != null) {
        const startIndex = adapter.getYear(start) * 12 + adapter.getMonth(start);
        if (startIndex === rightIndex.value) {
          syncing = true;
          syncLeftFromRight();
          syncing = false;
          return;
        }
      }
      syncing = true;
      syncRightFromLeft();
      syncing = false;
    });
    watch(model, val => {
      const dates = val;
      if (!dates.length) return;
      const first = adapter.date(dates[0]);
      const last = adapter.date(dates[dates.length - 1]);
      if (isMonthInView(first) && isMonthInView(last)) return;
      navigateToSelection();
    });
    function focusCell(iso) {
      panelContaining(iso)?.focusDate(iso);
    }
    function onBoundaryNavigate({
      direction,
      targetIsoDate
    }) {
      if (panelContaining(targetIsoDate)) {
        focusCell(targetIsoDate);
        return;
      }

      // Outer boundary: shift whichever panel needs to move to bring the target into view.
      const target = adapter.date(targetIsoDate);
      const targetMonth = adapter.getMonth(target);
      const targetYear = adapter.getYear(target);
      const targetIndex = targetYear * 12 + targetMonth;
      if (targetIndex < leftIndex.value) {
        const wouldCollide = props.independentMonths && rightIndex.value <= targetIndex;
        leftMonth.value = targetMonth;
        leftYear.value = targetYear;
        if (wouldCollide) {
          const next = shiftMonth(targetMonth, targetYear, 1);
          rightMonth.value = next.month;
          rightYear.value = next.year;
        }
      } else if (targetIndex > rightIndex.value) {
        const wouldCollide = props.independentMonths && leftIndex.value >= targetIndex;
        rightMonth.value = targetMonth;
        rightYear.value = targetYear;
        if (wouldCollide) {
          const previous = shiftMonth(targetMonth, targetYear, -1);
          leftMonth.value = previous.month;
          leftYear.value = previous.year;
        }
      } else {
        // Target sits in the independent-months gap: direction tells us which panel to move.
        const goingBack = direction === 'left' || direction === 'up';
        if (goingBack) {
          rightMonth.value = targetMonth;
          rightYear.value = targetYear;
        } else {
          leftMonth.value = targetMonth;
          leftYear.value = targetYear;
        }
      }
      nextTick(() => focusCell(targetIsoDate));
    }
    useRender(() => {
      const pickerProps = VPicker.filterProps(props);
      const datePickerProps = pick(props, datePickerForwardedKeys);
      return _createVNode(VPicker, _mergeProps({
        "ref": rootRef
      }, pickerProps, {
        "class": ['v-date-range-picker', props.class],
        "style": props.style,
        "hideHeader": true
      }), {
        default: () => _createElementVNode(_Fragment, null, [_createVNode(VDatePicker, _mergeProps({
          "ref": leftPickerRef
        }, datePickerProps, {
          "modelValue": model.value,
          "onUpdate:modelValue": $event => model.value = $event,
          "month": leftMonth.value,
          "onUpdate:month": $event => leftMonth.value = $event,
          "year": leftYear.value,
          "onUpdate:year": $event => leftYear.value = $event,
          "class": "v-date-range-picker__panel",
          "multiple": "range",
          "noAutoNavigation": true,
          "showAdjacentMonths": false,
          "hideHeader": true,
          "previewValue": previewValue.value,
          "onUpdate:previewValue": value => previewValue.value = value,
          "onBoundaryNavigate": onBoundaryNavigate
        }), {
          controls: ({
            monthYearText,
            prevMonth,
            nextMonth,
            disabled
          }) => _createElementVNode(_Fragment, null, [_createVNode(VBtn, {
            "density": "comfortable",
            "disabled": disabled.includes('prev-month'),
            "icon": props.prevIcon,
            "variant": "text",
            "onClick": prevMonth
          }, null), _createVNode(VSpacer, null, null), _createElementVNode("div", null, [monthYearText]), _createVNode(VSpacer, null, null), _createVNode(VBtn, {
            "class": _normalizeClass({
              'v-date-range-picker__nav-hidden': !props.independentMonths
            }),
            "density": "comfortable",
            "disabled": !props.independentMonths || leftNextDisabled.value || disabled.includes('next-month'),
            "icon": props.nextIcon,
            "variant": "text",
            "onClick": nextMonth
          }, null)])
        }), _createElementVNode("div", {
          "class": "v-date-range-picker__divider",
          "role": "separator"
        }, null), _createVNode(VDatePicker, _mergeProps({
          "ref": rightPickerRef
        }, datePickerProps, {
          "modelValue": model.value,
          "onUpdate:modelValue": $event => model.value = $event,
          "month": rightMonth.value,
          "onUpdate:month": $event => rightMonth.value = $event,
          "year": rightYear.value,
          "onUpdate:year": $event => rightYear.value = $event,
          "class": "v-date-range-picker__panel",
          "multiple": "range",
          "noAutoNavigation": true,
          "showAdjacentMonths": false,
          "hideHeader": true,
          "previewValue": previewValue.value,
          "onUpdate:previewValue": value => previewValue.value = value,
          "onBoundaryNavigate": onBoundaryNavigate
        }), {
          controls: ({
            monthYearText,
            prevMonth,
            nextMonth,
            disabled
          }) => _createElementVNode(_Fragment, null, [_createVNode(VBtn, {
            "class": _normalizeClass({
              'v-date-range-picker__nav-hidden': !props.independentMonths
            }),
            "density": "comfortable",
            "disabled": !props.independentMonths || rightPrevDisabled.value || disabled.includes('prev-month'),
            "icon": props.prevIcon,
            "variant": "text",
            "onClick": prevMonth
          }, null), _createVNode(VSpacer, null, null), _createElementVNode("div", null, [monthYearText]), _createVNode(VSpacer, null, null), _createVNode(VBtn, {
            "density": "comfortable",
            "disabled": disabled.includes('next-month'),
            "icon": props.nextIcon,
            "variant": "text",
            "onClick": nextMonth
          }, null)])
        })]),
        actions: slots.footer
      });
    });
    return {};
  }
});
//# sourceMappingURL=VDateRangePicker.js.map