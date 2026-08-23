import type { MaybeRefOrGetter, ShallowRef } from 'vue';
interface VirtualFocusItem {
    id: string | number;
    disabled?: MaybeRefOrGetter<boolean>;
    el?: MaybeRefOrGetter<HTMLElement | null | undefined>;
}
interface VirtualFocusOptions {
    /** Element that retains DOM focus and receives aria-activedescendant */
    control: MaybeRefOrGetter<HTMLElement | null | undefined>;
    /** Arrow key mapping — ignored when `columns` is set (grid uses all 4 arrows) */
    orientation?: 'horizontal' | 'vertical' | 'both';
    circular?: boolean;
    /**
     * Column count for grid navigation. Left/Right step ±1, Up/Down step ±columns,
     * Home/End go to row start/end, Ctrl+Home/End go to first/last overall.
     */
    columns?: MaybeRefOrGetter<number>;
    onHighlight?: (id: string | number) => void;
}
export interface VirtualFocusReturn {
    highlightedId: ShallowRef<string | number | undefined>;
    highlight: (id: string | number) => void;
    focusHighlighted: () => void;
    clear: () => void;
    next: () => void;
    prev: () => void;
    first: () => void;
    last: () => void;
    onKeydown: (e: KeyboardEvent) => void;
}
export declare function useVirtualFocus(items: () => VirtualFocusItem[], options: VirtualFocusOptions): VirtualFocusReturn;

