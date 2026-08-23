import { createVNode as _createVNode, createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle, mergeProps as _mergeProps } from "vue";
// Styles
import "./VDatePickerMonth.css";

// Components
import { VBadge } from "../VBadge/index.js";
import { VBtn } from "../VBtn/index.js"; // Composables
import { makeCalendarProps, useCalendar } from "../../composables/calendar.js";
import { useBackgroundColor } from "../../composables/color.js";
import { useDate } from "../../composables/date/date.js";
import { useGridSelection } from "../../composables/gridSelection.js";
import { useLocale } from "../../composables/locale.js";
import { useProxiedModel } from "../../composables/proxiedModel.js";
import { useRangePicker } from "../../composables/rangePicker.js";
import { MaybeTransition } from "../../composables/transition.js"; // Utilities
import { computed, nextTick, shallowRef, toRef, useId, watch } from 'vue';
import { chunkArray, genericComponent, omit, propsFactory, useRender, wrapInArray } from "../../util/index.js"; // Types
export const makeVDatePickerMonthProps = propsFactory({
  color: String,
  hideWeekdays: Boolean,
  multiple: [Boolean, Number, String],
  showWeek: Boolean,
  readonly: Boolean,
  transition: {
    type: String,
    default: 'picker-transition'
  },
  reverseTransition: {
    type: String,
    default: 'picker-reverse-transition'
  },
  events: {
    type: [Array, Function, Object],
    default: () => null
  },
  eventColor: {
    type: [Array, Function, Object, String],
    default: () => null
  },
  noAutoNavigation: Boolean,
  previewValue: null,
  ...omit(makeCalendarProps(), ['displayValue'])
}, 'VDatePickerMonth');
export const VDatePickerMonth = genericComponent()({
  name: 'VDatePickerMonth',
  props: makeVDatePickerMonthProps(),
  emits: {
    'update:modelValue': date => true,
    'update:month': date => true,
    'update:year': date => true,
    'update:previewValue': _value => true,
    'boundary-navigate': _payload => true
  },
  setup(props, {
    emit,
    slots
  }) {
    const uid = useId();
    const {
      t
    } = useLocale();
    const {
      daysInMonth,
      model,
      weekNumbers,
      weekdayLabels
    } = useCalendar(props);
    const adapter = useDate();
    const isReverse = shallowRef(false);
    const transition = toRef(() => {
      return !isReverse.value ? props.transition : props.reverseTransition;
    });
    function compareDays(a, b) {
      if (adapter.isSameDay(a, b)) return 0;
      return adapter.isBefore(a, b) ? -1 : 1;
    }
    const previewValue = useProxiedModel(props, 'previewValue');
    const range = useRangePicker({
      multiple: computed(() => {
        if (props.multiple === 'range') return 'range';
        return !!props.multiple;
      }),
      model,
      compare: compareDays,
      normalizeEnd: value => adapter.endOfDay(value),
      previewValue
    });
    const selectionColor = toRef(() => props.color || 'surface-variant');
    const {
      backgroundColorClasses: rangeColorClasses,
      backgroundColorStyles: rangeColorStyles
    } = useBackgroundColor(selectionColor);
    const atMax = computed(() => {
      const max = ['number', 'string'].includes(typeof props.multiple) ? Number(props.multiple) : Infinity;
      return model.value.length >= max;
    });
    const dayRows = computed(() => {
      return chunkArray(daysInMonth.value, props.weekdays.length);
    });
    function isSelectedDay(item) {
      return range.isSelected(item.date);
    }
    function isDayDisabled(item) {
      return item.isDisabled || item.isHidden || atMax.value && !isSelectedDay(item);
    }
    function getDateAriaLabel(item) {
      const fullDate = adapter.format(item.date, 'fullDateWithWeekday');
      const localeKey = item.isToday ? 'currentDate' : 'selectDate';
      return t(`$vuetify.datePicker.ariaLabel.${localeKey}`, fullDate);
    }
    function onClick(value) {
      range.select(adapter.startOfDay(value));
    }
    function initialFocusDate(current) {
      const isVisible = d => !d.isAdjacent && !d.isDisabled;

      // Preserve existing highlight if it's still pointing to a visible day in the current grid
      if (current != null) {
        const cur = daysInMonth.value.find(d => d.isoDate === current);
        if (cur && !cur.isAdjacent) return current;
      }
      const selected = daysInMonth.value.find(d => isVisible(d) && model.value.some(m => adapter.isSameDay(m, d.date)));
      return (selected ?? daysInMonth.value.find(isVisible))?.isoDate;
    }
    const {
      containerProps,
      containerEl,
      selectItem,
      focusItem,
      clear
    } = useGridSelection({
      items: () => daysInMonth.value.map(d => ({
        value: d.isoDate,
        isDisabled: isDayDisabled(d)
      })),
      columns: () => props.weekdays.length,
      initialValue: initialFocusDate,
      itemAttribute: 'data-v-date',
      onSelect: onDaySelect,
      onNavigation: onNavigationBoundary,
      onEscape
    });
    function onDaySelect(isoDate) {
      const item = daysInMonth.value.find(d => d.isoDate === isoDate);
      if (!item || isDayDisabled(item)) return;
      onClick(item.date);
      if (item.isAdjacent) {
        emit('update:month', adapter.getMonth(item.date));
        emit('update:year', adapter.getYear(item.date));
        nextTick(() => focusItem(isoDate));
      }
    }
    function onNavigationBoundary(direction, e, curId) {
      if (curId == null) return false;
      const cols = props.weekdays.length;
      const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';

      // stride = array-index delta; calendarDays = actual date offset for boundary crossing
      let stride;
      let calendarDays;
      if (direction === 'left') {
        stride = rtl ? 1 : -1;
        calendarDays = stride;
      } else if (direction === 'right') {
        stride = rtl ? -1 : 1;
        calendarDays = stride;
      } else if (direction === 'up') {
        stride = -cols;
        calendarDays = -7;
      } else {
        stride = cols;
        calendarDays = 7;
      }
      const all = daysInMonth.value;
      const curIndex = all.findIndex(d => d.isoDate === curId);
      if (curIndex < 0) return false;
      const targetItem = all[curIndex + stride];

      // isHidden = isAdjacent && !showAdjacentMonths — no button in DOM for this day
      if (targetItem && !targetItem.isHidden) return false;
      e.preventDefault();
      let targetIsoDate;
      if (targetItem) {
        targetIsoDate = targetItem.isoDate;
      } else {
        const step = calendarDays < 0 ? -1 : 1;
        let candidate = adapter.addDays(adapter.date(curId), calendarDays);
        while (!props.weekdays.includes(adapter.toJsDate(candidate).getDay())) {
          candidate = adapter.addDays(candidate, step);
        }
        targetIsoDate = adapter.toISO(candidate);
      }
      if (props.noAutoNavigation) {
        emit('boundary-navigate', {
          direction,
          targetIsoDate
        });
        return true;
      }
      const targetDate = adapter.date(targetIsoDate);
      emit('update:month', adapter.getMonth(targetDate));
      emit('update:year', adapter.getYear(targetDate));
      nextTick(() => focusItem(targetIsoDate));
      return true;
    }
    function onEscape() {
      const rawTarget = model.value[0] ?? adapter.date();
      const targetIso = adapter.toISO(adapter.date(rawTarget));
      const inCurrentMonth = daysInMonth.value.find(d => d.isoDate === targetIso && !d.isAdjacent);
      if (inCurrentMonth) {
        focusItem(targetIso);
        return;
      }
      const targetDate = adapter.date(rawTarget);
      emit('update:month', adapter.getMonth(targetDate));
      emit('update:year', adapter.getYear(targetDate));
      nextTick(() => focusItem(targetIso));
    }
    function onDayClick(item) {
      if (item.isAdjacent) {
        onDaySelect(item.isoDate);
      } else {
        selectItem(item.isoDate);
      }
    }
    function focusGrid() {
      containerEl.value?.focus();
    }
    watch(daysInMonth, (val, oldVal) => {
      if (!oldVal || val[0].isoDate === oldVal[0].isoDate) return; // only clear when the month actually changes

      isReverse.value = adapter.isBefore(val[0].date, oldVal[0].date);
      clear();
    });
    function getEventColors(date) {
      const {
        events,
        eventColor
      } = props;
      let eventData;
      let eventColors = [];
      if (Array.isArray(events)) {
        eventData = events.includes(date);
      } else if (events instanceof Function) {
        eventData = events(date) || false;
      } else if (events) {
        eventData = events[date] || false;
      } else {
        eventData = false;
      }
      if (!eventData) {
        return [];
      } else if (eventData !== true) {
        eventColors = wrapInArray(eventData);
      } else if (typeof eventColor === 'string') {
        eventColors = [eventColor];
      } else if (typeof eventColor === 'function') {
        eventColors = wrapInArray(eventColor(date));
      } else if (Array.isArray(eventColor)) {
        eventColors = eventColor;
      } else if (typeof eventColor === 'object' && eventColor !== null) {
        eventColors = wrapInArray(eventColor[date]);
      }

      // Fallback to default color if no color is found
      return !eventColors.length ? ['surface-variant'] : eventColors.filter(Boolean).map(color => typeof color === 'string' ? color : 'surface-variant');
    }
    function genEvents(date) {
      const eventColors = getEventColors(date);
      if (!eventColors.length) return null;
      return _createElementVNode("div", {
        "class": "v-date-picker-month__events"
      }, [eventColors.map(color => _createVNode(VBadge, {
        "dot": true,
        "color": color
      }, null))]);
    }
    useRender(() => _createElementVNode("div", {
      "class": "v-date-picker-month",
      "style": {
        '--v-date-picker-days-in-week': props.weekdays.length
      }
    }, [props.showWeek && _createElementVNode("div", {
      "key": "weeks",
      "class": "v-date-picker-month__weeks"
    }, [!props.hideWeekdays && _createElementVNode("div", {
      "key": "hide-week-days",
      "class": "v-date-picker-month__day"
    }, [_createTextVNode("\xA0")]), weekNumbers.value.map(week => _createElementVNode("div", {
      "class": _normalizeClass(['v-date-picker-month__day', 'v-date-picker-month__day--adjacent'])
    }, [week]))]), _createVNode(MaybeTransition, {
      "name": transition.value
    }, {
      default: () => [_createElementVNode("div", _mergeProps({
        "key": daysInMonth.value[0].date?.toString(),
        "class": "v-date-picker-month__days",
        "role": "grid",
        "onMouseleave": range.clearPreview
      }, containerProps.value), [!props.hideWeekdays && _createElementVNode("div", {
        "key": "weekday-labels",
        "class": "v-date-picker-month__days-row"
      }, [weekdayLabels.value.map(weekDay => _createElementVNode("div", {
        "class": _normalizeClass(['v-date-picker-month__day', 'v-date-picker-month__weekday'])
      }, [weekDay]))]), dayRows.value.map((row, rowIndex) => _createElementVNode("div", {
        "class": "v-date-picker-month__days-row",
        "role": "row"
      }, [row.map((item, colIndex) => {
        const i = rowIndex * props.weekdays.length + colIndex;
        const isSelected = isSelectedDay(item);
        const disabled = isDayDisabled(item);
        const rangeStart = range.isRangeStart(item.date);
        const rangeEnd = range.isRangeEnd(item.date);
        const rangeMiddle = range.isRangeMiddle(item.date);
        const previewStart = range.isPreviewStart(item.date);
        const previewEnd = range.isPreviewEnd(item.date);
        const previewMiddle = range.isPreviewMiddle(item.date);
        const slotProps = {
          props: {
            class: 'v-date-picker-month__day-btn',
            color: isSelected && !rangeMiddle || item.isToday ? props.color : undefined,
            disabled,
            readonly: props.readonly,
            icon: true,
            ripple: false,
            tabindex: -1,
            variant: isSelected && !rangeMiddle ? 'flat' : item.isToday ? 'outlined' : 'text',
            'aria-label': getDateAriaLabel(item),
            'aria-current': item.isToday ? 'date' : undefined,
            id: `${uid}-day-${item.isoDate}`,
            'data-v-date': !disabled ? item.isoDate : undefined,
            onMousedown: e => e.preventDefault(),
            // preserve virtual focus
            onClick: () => onDayClick(item),
            onMouseenter: () => range.setPreview(item.date),
            onFocus: () => range.setPreview(item.date),
            onBlur: range.clearPreview
          },
          item,
          i
        };
        const hasRangeBg = rangeStart || rangeEnd || rangeMiddle;
        const hasPreviewBg = previewStart || previewEnd || previewMiddle;
        return _createElementVNode("div", {
          "class": _normalizeClass(['v-date-picker-month__day', {
            'v-date-picker-month__day--adjacent': item.isAdjacent,
            'v-date-picker-month__day--hide-adjacent': item.isHidden,
            'v-date-picker-month__day--selected': isSelected,
            'v-date-picker-month__day--week-end': item.isWeekEnd,
            'v-date-picker-month__day--week-start': item.isWeekStart,
            'v-date-picker-month__day--range-start': rangeStart,
            'v-date-picker-month__day--range-end': rangeEnd,
            'v-date-picker-month__day--range-middle': rangeMiddle,
            'v-date-picker-month__day--preview-start': previewStart,
            'v-date-picker-month__day--preview-end': previewEnd,
            'v-date-picker-month__day--preview-middle': previewMiddle
          }]),
          "role": "gridcell"
        }, [(hasRangeBg || hasPreviewBg) && _createElementVNode("div", {
          "key": "range-bg",
          "class": _normalizeClass(['v-date-picker-month__range-bg', hasRangeBg ? 'v-date-picker-month__range-bg--range' : 'v-date-picker-month__range-bg--preview', rangeColorClasses.value]),
          "style": _normalizeStyle(rangeColorStyles.value)
        }, null), (props.showAdjacentMonths || !item.isAdjacent) && (slots.day?.(slotProps) ?? _createVNode(VBtn, slotProps.props, {
          default: () => [item.localized, genEvents(item.isoDate)]
        }))]);
      })]))])]
    })]));
    return {
      focusGrid,
      focusItem
    };
  }
});
//# sourceMappingURL=VDatePickerMonth.js.map