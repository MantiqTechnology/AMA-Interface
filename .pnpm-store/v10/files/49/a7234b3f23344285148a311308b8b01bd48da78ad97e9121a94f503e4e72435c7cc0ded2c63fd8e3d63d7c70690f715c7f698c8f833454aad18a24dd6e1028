// Utilities
import { computed, shallowRef } from 'vue';

// Types

export function useRangePicker({
  multiple,
  model,
  compare,
  normalizeEnd = v => v,
  previewValue: externalPreview
}) {
  const rangeStart = computed(() => model.value.length >= 1 ? model.value[0] : undefined);
  const rangeEnd = computed(() => model.value.length >= 2 ? model.value[model.value.length - 1] : undefined);
  const previewValue = externalPreview ?? shallowRef();
  const previewRange = computed(() => {
    if (multiple.value !== 'range') return null;
    if (!rangeStart.value || rangeEnd.value) return null;
    if (!previewValue.value) return null;
    const start = rangeStart.value;
    const preview = previewValue.value;
    if (compare(start, preview) === 0) return null;
    return compare(start, preview) < 0 ? [start, preview] : [preview, start];
  });
  function isSelected(value) {
    if (multiple.value === 'range' && model.value.length === 2) {
      return isWithinRange(value);
    }
    for (const v of model.value) {
      if (compare(v, value) === 0) return true;
    }
    return false;
  }
  function isWithinRange(value) {
    if (multiple.value !== 'range' || model.value.length < 2) return false;
    const [start, end] = [model.value[0], model.value[model.value.length - 1]];
    return compare(value, start) >= 0 && compare(value, end) <= 0;
  }
  function isRangeStart(value) {
    if (multiple.value !== 'range' || model.value.length < 2) return false;
    return compare(value, model.value[0]) === 0;
  }
  function isRangeEnd(value) {
    if (multiple.value !== 'range' || model.value.length < 2) return false;
    return compare(value, model.value[model.value.length - 1]) === 0;
  }
  function isRangeMiddle(value) {
    return isWithinRange(value) && !isRangeStart(value) && !isRangeEnd(value);
  }
  function select(value) {
    if (multiple.value === 'range') {
      onRangeSelect(value);
    } else if (multiple.value) {
      onMultipleSelect(value);
    } else {
      model.value = [value];
    }
  }
  function onRangeSelect(value) {
    if (model.value.length === 0) {
      model.value = [value];
    } else if (model.value.length === 1) {
      const start = model.value[0];
      if (compare(value, start) === 0) {
        model.value = [];
      } else if (compare(value, start) < 0) {
        model.value = [value, normalizeEnd(start)];
      } else {
        model.value = [start, normalizeEnd(value)];
      }
    } else {
      model.value = [value];
    }
  }
  function setPreview(value) {
    previewValue.value = value;
  }
  function clearPreview() {
    previewValue.value = undefined;
  }
  function isPreviewStart(value) {
    const range = previewRange.value;
    if (!range) return false;
    return compare(value, range[0]) === 0;
  }
  function isPreviewEnd(value) {
    const range = previewRange.value;
    if (!range) return false;
    return compare(value, range[1]) === 0;
  }
  function isPreviewMiddle(value) {
    const range = previewRange.value;
    if (!range) return false;
    return compare(value, range[0]) > 0 && compare(value, range[1]) < 0;
  }
  function isInPreviewRange(value) {
    return isPreviewStart(value) || isPreviewEnd(value) || isPreviewMiddle(value);
  }
  function onMultipleSelect(value) {
    const index = model.value.findIndex(v => compare(v, value) === 0);
    if (index === -1) {
      model.value = [...model.value, value];
    } else {
      const copy = [...model.value];
      copy.splice(index, 1);
      model.value = copy;
    }
  }
  return {
    isSelected,
    isRangeStart,
    isRangeEnd,
    isRangeMiddle,
    select,
    setPreview,
    clearPreview,
    isPreviewStart,
    isPreviewEnd,
    isPreviewMiddle,
    isInPreviewRange
  };
}
//# sourceMappingURL=rangePicker.js.map