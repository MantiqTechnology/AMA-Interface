import type { MaybeRefOrGetter } from 'vue';
export type GridDirection = 'up' | 'down' | 'left' | 'right';
export declare function keyToDirection(key: string): GridDirection | null;
export interface GridSelectionItem<T extends string | number> {
    value: T;
    isDisabled?: boolean;
}
export interface GridSelectionOptions<T extends string | number> {
    items: () => GridSelectionItem<T>[];
    columns: MaybeRefOrGetter<number>;
    initialValue: (current: T | undefined) => T | undefined;
    itemAttribute: string;
    onSelect: (value: T) => void;
    onNavigation?: (direction: GridDirection, e: KeyboardEvent, currentValue: T | undefined) => boolean;
    onHighlight?: (value: T | undefined) => void;
    onEscape?: () => void;
}
export declare function useGridSelection<T extends string | number>({ items, columns, initialValue, itemAttribute, onSelect, onNavigation, onHighlight, onEscape }: GridSelectionOptions<T>): {
    containerProps: import("vue").ComputedRef<{
        ref: (el: any) => HTMLElement;
        tabindex: number;
        onKeydown: (e: KeyboardEvent) => void;
        onFocusin: (e: FocusEvent) => void;
        onFocusout: (e: FocusEvent) => void;
    }>;
    containerEl: import("vue").ShallowRef<HTMLElement | undefined, HTMLElement | undefined>;
    selectItem: (value: T) => void;
    focusItem: (value: T) => void;
    clear: () => void;
};
