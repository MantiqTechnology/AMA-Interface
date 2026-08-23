// to be replaced by v0 implementation in v5.0

// Utilities
import { computed, shallowRef, toRef, toValue } from 'vue';

// Types

export const OtpInputPatterns = {
  numeric: /[0-9]/,
  alpha: /[a-zA-Z]/,
  alphanumeric: /[a-zA-Z0-9]/,
  'unicode-alpha': /\p{L}/u,
  'unicode-alphanumeric': /[\p{L}\p{N}]/u
};
const IME_SCRIPT_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}]/u;
const graphemeSegmenter = /* @__PURE__ */new Intl.Segmenter(undefined, {
  granularity: 'grapheme'
});
export function useOtpInput(options) {
  const {
    value,
    length: _length = 6,
    pattern,
    type = 'number',
    masked = false,
    placeholder,
    isFocused = shallowRef(false)
  } = options;
  const selection = shallowRef(null);
  const composition = shallowRef('');
  const isComposing = shallowRef(false);
  let prevSelection = null;
  // Shift+Arrow anchor/focus tracked in grapheme space.
  let anchorG = null;
  let focusG = null;
  const length = toRef(() => Number(toValue(_length)));
  const isMasked = toRef(() => toValue(masked) || toValue(type) === 'password');
  const effectivePattern = toRef(() => {
    const p = toValue(pattern);
    if (p instanceof RegExp) return p;
    if (p != null) return OtpInputPatterns[p] ?? null;
    if (toValue(type) === 'number') return OtpInputPatterns.numeric;
    return null;
  });
  const inputMode = toRef(() => effectivePattern.value === OtpInputPatterns.numeric ? 'numeric' : 'text');

  // Selection is stored in code units (for `setSelectionRange`), but every slot
  // boundary works in grapheme space so emoji, ZWJ sequences and skin-tone
  // modifiers each occupy one slot.
  function graphemes(s) {
    return Array.from(graphemeSegmenter.segment(s), seg => seg.segment);
  }
  function codeUnitsToGraphemeIndex(s, pos) {
    let count = 0;
    for (const seg of graphemeSegmenter.segment(s)) {
      if (seg.index >= pos) break;
      count++;
    }
    return count;
  }
  function graphemeIndexToCodeUnits(s, gIndex) {
    if (gIndex <= 0) return 0;
    let count = 0;
    for (const seg of graphemeSegmenter.segment(s)) {
      if (count === gIndex) return seg.index;
      count++;
    }
    return s.length;
  }
  const slots = computed(() => {
    const chars = graphemes(value.value);
    const compositionChars = graphemes(composition.value);
    const placeholderChar = toValue(placeholder) ?? null;
    const currentSelection = selection.value;
    const startG = currentSelection ? codeUnitsToGraphemeIndex(value.value, currentSelection.start) : null;
    const endG = currentSelection ? codeUnitsToGraphemeIndex(value.value, currentSelection.end) : null;
    const compositionStart = startG ?? chars.length;
    return Array.from({
      length: length.value
    }, (_, i) => {
      const char = chars[i] ?? null;
      const displayChar = char !== null && isMasked.value ? '•' : char;
      let compositionChar = null;
      if (composition.value && i >= compositionStart) {
        const offset = i - compositionStart;
        const c = compositionChars[offset];
        if (c != null) compositionChar = isMasked.value ? '•' : c;
      }
      const isActive = isFocused.value && startG !== null && endG !== null && (startG === endG && i === startG || i >= startG && i < endG);
      return {
        char: displayChar,
        compositionChar,
        placeholderChar,
        isActive,
        hasFakeCaret: isActive && char === null && compositionChar === null
      };
    });
  });
  function filter(text) {
    const re = effectivePattern.value;
    if (!re) return text;
    return graphemes(text).filter(c => re.test(c)).join('');
  }
  function clampGraphemes(text, max) {
    const chars = graphemes(text);
    if (chars.length <= max) return text;
    return chars.slice(0, max).join('');
  }
  function isImeText(text) {
    return IME_SCRIPT_RE.test(text);
  }
  function setValue(text) {
    const next = clampGraphemes(filter(text), length.value);
    value.value = next;
    return next;
  }
  function insert(text, range) {
    const current = value.value;
    const start = range?.start ?? current.length;
    const end = range?.end ?? current.length;
    const filtered = filter(text);
    const next = clampGraphemes(current.slice(0, start) + filtered + current.slice(end), length.value);
    value.value = next;
    const insertEnd = Math.min(start + filtered.length, next.length);
    const insertEndG = codeUnitsToGraphemeIndex(next, insertEnd);
    const cursorG = Math.min(insertEndG, length.value - 1);
    const cursor = graphemeIndexToCodeUnits(next, cursorG);
    setSelection(cursor, insertEnd, 'forward');
    return next;
  }
  function deleteRange(start, end) {
    const current = value.value;
    const next = current.slice(0, start) + current.slice(end);
    value.value = next;
    const newEnd = Math.min(start + 1, next.length);
    setSelection(start, newEnd, 'forward');
    return next;
  }
  function bulkDelete(isBackward) {
    const current = value.value;
    const currentSelection = selection.value;
    const next = isBackward ? current.slice(currentSelection?.end ?? current.length) : current.slice(0, currentSelection?.start ?? 0);
    value.value = next;
    if (next.length === 0) setSelection(0, 0, 'none');else if (isBackward) setSelection(0, 1, 'forward');else setSelection(next.length, next.length, 'none');
    return next;
  }
  function setSelection(start, end, direction = 'none') {
    if (start === null || end === null) {
      selection.value = null;
      anchorG = null;
      focusG = null;
      return;
    }
    const next = {
      start,
      end,
      direction
    };
    selection.value = next;
    prevSelection = next;
    const startG = codeUnitsToGraphemeIndex(value.value, start);
    anchorG = startG;
    focusG = startG;
  }
  function clearSelection() {
    selection.value = null;
    anchorG = null;
    focusG = null;
  }
  function selectAtEnd() {
    const current = value.value;
    const graphemeCount = graphemes(current).length;
    let start;
    let end;
    if (graphemeCount >= length.value) {
      // Full: range over the last slot so it renders as active.
      start = graphemeIndexToCodeUnits(current, length.value - 1);
      end = current.length;
    } else {
      // Partial: single caret at the end of the typed content.
      start = current.length;
      end = current.length;
    }
    const next = {
      start,
      end,
      direction: 'forward'
    };
    selection.value = next;
    prevSelection = next;
    anchorG = graphemeCount >= length.value ? length.value - 1 : graphemeCount;
    focusG = anchorG;
    return next;
  }
  function selectSlot(index) {
    const current = value.value;
    const graphemeCount = graphemes(current).length;
    const clamped = Math.min(index, graphemeCount);
    const start = graphemeIndexToCodeUnits(current, clamped);
    const end = clamped < graphemeCount ? graphemeIndexToCodeUnits(current, clamped + 1) : current.length;
    const next = {
      start,
      end,
      direction: 'forward'
    };
    selection.value = next;
    prevSelection = next;
    anchorG = clamped;
    focusG = clamped;
    return next;
  }
  function moveCaret(direction) {
    const current = value.value;
    if (graphemes(current).length === 0) return null;
    const currentSelection = selection.value;
    const currentG = currentSelection ? codeUnitsToGraphemeIndex(current, currentSelection.start) : 0;
    return selectSlot(Math.max(0, currentG + direction));
  }
  function extendSelection(direction) {
    const current = value.value;
    const valueG = graphemes(current).length;
    if (valueG === 0) return null;
    const maxFocus = Math.min(length.value - 1, valueG);

    // Fallback when Shift+Arrow fires before anchor/focus were tracked.
    if (anchorG === null || focusG === null) {
      const currentSelection = selection.value;
      if (!currentSelection) return null;
      const selectionStartG = codeUnitsToGraphemeIndex(current, currentSelection.start);
      const selectionEndG = codeUnitsToGraphemeIndex(current, currentSelection.end);
      if (selectionEndG - selectionStartG <= 1) {
        anchorG = selectionStartG;
        focusG = selectionStartG;
      } else if (currentSelection.direction === 'backward') {
        anchorG = selectionEndG - 1;
        focusG = selectionStartG;
      } else {
        anchorG = selectionStartG;
        focusG = selectionEndG - 1;
      }
    }
    const newFocus = Math.max(0, Math.min(maxFocus, focusG + direction));
    focusG = newFocus;
    const minG = Math.min(anchorG, newFocus);
    const maxG = Math.max(anchorG, newFocus);
    const start = graphemeIndexToCodeUnits(current, minG);
    const end = maxG + 1 >= valueG ? current.length : graphemeIndexToCodeUnits(current, maxG + 1);
    const newDirection = newFocus < anchorG ? 'backward' : 'forward';
    const next = {
      start,
      end,
      direction: newDirection
    };
    selection.value = next;
    prevSelection = next;
    return next;
  }

  // Force the rendered selection to always cover at least one slot, so a slot
  // stays "active" when a caret would otherwise be between two.
  function syncSelection(raw) {
    if (isComposing.value) return selection.value;
    const {
      value: inputValue,
      selectionStart,
      selectionEnd,
      selectionDirection,
      maxLength
    } = raw;
    if (selectionStart === null || selectionEnd === null) {
      selection.value = null;
      prevSelection = null;
      return null;
    }
    const valueG = graphemes(inputValue).length;
    const startG = codeUnitsToGraphemeIndex(inputValue, selectionStart);
    const endG = codeUnitsToGraphemeIndex(inputValue, selectionEnd);
    let outStartG = -1;
    let outEndG = -1;
    let direction;
    if (valueG !== 0) {
      const isSingleCaret = startG === endG;
      const isInsertMode = startG === valueG && valueG < maxLength;
      if (isSingleCaret && !isInsertMode) {
        if (startG === 0) {
          outStartG = 0;
          outEndG = 1;
          direction = 'forward';
        } else if (startG === maxLength) {
          outStartG = startG - 1;
          outEndG = startG;
          direction = 'backward';
        } else if (maxLength > 1 && valueG > 1) {
          let offset = 0;
          if (prevSelection !== null) {
            const prevStartG = codeUnitsToGraphemeIndex(inputValue, prevSelection.start);
            const prevEndG = codeUnitsToGraphemeIndex(inputValue, prevSelection.end);
            direction = startG < prevEndG ? 'backward' : 'forward';
            const wasPreviouslyInserting = prevStartG === prevEndG && prevStartG < maxLength;
            // Multi-slot collapse: caret landed at an edge of the prior range,
            // user didn't navigate between slots, so don't shift the slot back.
            const wasMultiSlot = prevEndG - prevStartG > 1;
            if (direction === 'backward' && !wasPreviouslyInserting && !wasMultiSlot) {
              offset = -1;
            }
          }
          outStartG = offset + startG;
          outEndG = offset + startG + 1;
        }
      }
    }
    const finalStartG = outStartG !== -1 ? outStartG : startG;
    const finalEndG = outEndG !== -1 ? outEndG : endG;
    const finalStart = graphemeIndexToCodeUnits(inputValue, finalStartG);
    const finalEnd = graphemeIndexToCodeUnits(inputValue, finalEndG);
    const finalDirection = direction ?? selectionDirection ?? 'none';
    const next = {
      start: finalStart,
      end: finalEnd,
      direction: finalDirection
    };
    selection.value = next;
    prevSelection = next;
    // Reset anchor on plain navigation; preserve it during extendSelection's round-trip.
    if (finalEndG - finalStartG <= 1) {
      anchorG = finalStartG;
      focusG = finalStartG;
    }
    return next;
  }
  function startComposition() {
    isComposing.value = true;
    composition.value = '';
  }
  function updateComposition(data) {
    composition.value = IME_SCRIPT_RE.test(data) ? data : '';
  }
  function endComposition() {
    isComposing.value = false;
    composition.value = '';
  }
  function reset() {
    value.value = '';
    selection.value = null;
    composition.value = '';
    isComposing.value = false;
    prevSelection = null;
    anchorG = null;
    focusG = null;
  }
  return {
    value,
    length,
    slots,
    selection,
    composition,
    isComposing,
    isFocused,
    effectivePattern,
    inputMode,
    filter,
    isImeText,
    setValue,
    insert,
    deleteRange,
    bulkDelete,
    syncSelection,
    setSelection,
    clearSelection,
    selectAtEnd,
    selectSlot,
    moveCaret,
    extendSelection,
    startComposition,
    updateComposition,
    endComposition,
    reset
  };
}
//# sourceMappingURL=useOtpInput.js.map