// Utilities
import { computed } from 'vue';

// Types

export function useLoadingConfig(loading, fallbackColor) {
  const active = computed(() => {
    const v = loading();
    return v != null && v !== false && v !== 'false';
  });
  const side = computed(() => {
    const v = loading();
    if (typeof v === 'object' && v !== null && v.side) return v.side;
    return 'start';
  });
  const color = computed(() => {
    const v = loading();
    if (typeof v === 'object' && v !== null && v.color) return v.color;
    if (typeof v === 'string' && v !== 'true') return v;
    return fallbackColor();
  });
  return {
    active,
    side,
    color
  };
}
//# sourceMappingURL=loading.js.map