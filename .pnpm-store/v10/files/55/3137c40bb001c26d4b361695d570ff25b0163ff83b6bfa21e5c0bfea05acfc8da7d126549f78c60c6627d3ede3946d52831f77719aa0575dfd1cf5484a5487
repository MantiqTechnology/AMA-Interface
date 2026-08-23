// Composables
import { useVirtualFocus } from "./virtualFocus.js"; // Utilities
import { computed, shallowRef, watch } from 'vue';

// Types

export function keyToDirection(key) {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}
export function useGridSelection({
  items,
  columns,
  initialValue,
  itemAttribute,
  onSelect,
  onNavigation,
  onHighlight,
  onEscape
}) {
  const hasFocusIn = shallowRef(false);
  const containerEl = shallowRef();
  const virtualFocus = useVirtualFocus(() => items().map(item => ({
    id: item.value,
    disabled: item.isDisabled,
    el: () => containerEl.value?.querySelector(`[${itemAttribute}="${item.value}"]`)
  })), {
    control: containerEl,
    columns
  });
  if (onHighlight) {
    watch(virtualFocus.highlightedId, id => onHighlight(id));
  }
  function onFocusin(e) {
    const grid = containerEl.value;
    if (!grid || grid.contains(e.relatedTarget)) return;
    hasFocusIn.value = true;
    const targetEl = e.target;
    const targetId = targetEl?.getAttribute?.(itemAttribute);
    if (targetId != null && items().some(item => String(item.value) === targetId)) {
      virtualFocus.highlight(targetId);
      return;
    }
    const initial = initialValue(virtualFocus.highlightedId.value);
    if (initial != null) virtualFocus.highlight(initial);
    virtualFocus.focusHighlighted();
  }
  function onFocusout(e) {
    if (containerEl.value?.contains(e.relatedTarget)) return;
    hasFocusIn.value = false;
    virtualFocus.clear();
  }
  function onActivate() {
    const id = virtualFocus.highlightedId.value;
    if (id == null) return;
    const item = items().find(x => x.value === id);
    if (item && !item.isDisabled) {
      onSelect(id);
    }
  }
  function selectItem(value) {
    virtualFocus.highlight(value);
    virtualFocus.focusHighlighted();
    onSelect(value);
  }
  function focusItem(value) {
    virtualFocus.highlight(value);
    if (virtualFocus.highlightedId.value == null) virtualFocus.first();
    virtualFocus.focusHighlighted();
  }
  function onContainerKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape?.();
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && virtualFocus.highlightedId.value != null) {
      e.preventDefault();
      onActivate();
      return;
    }
    const direction = keyToDirection(e.key);
    if (direction && onNavigation?.(direction, e, virtualFocus.highlightedId.value)) return;
    virtualFocus.onKeydown(e);
    virtualFocus.focusHighlighted();
  }
  const containerProps = computed(() => ({
    ref: el => containerEl.value = el ?? undefined,
    tabindex: hasFocusIn.value ? -1 : 0,
    onKeydown: onContainerKeydown,
    onFocusin,
    onFocusout
  }));
  return {
    containerProps,
    containerEl,
    selectItem,
    focusItem,
    clear: virtualFocus.clear
  };
}
//# sourceMappingURL=gridSelection.js.map