import type { MaybeRef, MaybeRefOrGetter } from 'vue';
import type { SelectItemKey } from '../../util/index.js';
export interface PivotCell<T = Record<string, any>> {
    value: any;
    raw: T;
    row: any;
    column: any;
    groupKey: string;
}
export interface PivotColumn<C> {
    key: string;
    cells: (C | null)[];
    items: C[];
}
export interface PivotGroup<C> {
    key: string;
    label: string;
    columns: PivotColumn<C>[];
    items: C[];
}
export interface PivotProps<T = Record<string, any>> {
    items: MaybeRefOrGetter<T[]>;
    itemValue: MaybeRef<SelectItemKey>;
    itemRow: MaybeRef<SelectItemKey>;
    itemColumn: MaybeRef<SelectItemKey>;
    groupBy: MaybeRef<SelectItemKey>;
    rows: MaybeRefOrGetter<any[] | undefined>;
    columns: MaybeRefOrGetter<any[] | undefined>;
}
export interface PivotOptions<T, C extends PivotCell<T>> {
    transformCell?: (cell: PivotCell<T>) => C;
}
export declare function usePivot<T extends Record<string, any> = Record<string, any>, C extends PivotCell<T> = PivotCell<T>>(props: PivotProps<T>, options?: PivotOptions<T, C>): {
    rows: import("vue").ComputedRef<any[]>;
    hasExplicitColumns: import("vue").ComputedRef<boolean>;
    groups: Readonly<import("vue").Ref<PivotGroup<C>[], PivotGroup<C>[]>>;
    rowItems: Readonly<import("vue").Ref<Map<any, C[]>, Map<any, C[]>>>;
};
