import type { MaybeRefOrGetter, PropType, Ref } from 'vue';
import type { SortItem } from './sort.js';
import type { DataTableItem } from '../types.js';
export interface GroupableItem<T = any> {
    type: 'item';
    raw: T;
}
export interface Group<T = any> {
    type: 'group';
    depth: number;
    id: string;
    key: string;
    value: any;
    items: readonly (T | Group<T> | GroupSummary<T>)[];
}
export interface GroupSummary<T = any> {
    type: 'group-summary';
    depth: number;
    id: string;
    key: string;
    value: any;
    items: readonly (T | Group<T> | GroupSummary<T>)[];
}
export type GroupKeyFunction = (options: {
    key: string;
    value: any;
    parentKey: string | null;
}) => string;
export declare const makeDataTableGroupProps: <Defaults extends {
    groupBy?: unknown;
    opened?: unknown;
    openAll?: unknown;
    groupKey?: unknown;
} = {}>(defaults?: Defaults | undefined) => {
    groupBy: unknown extends Defaults["groupBy"] ? {
        type: PropType<readonly SortItem[]>;
        default: () => never[];
    } : Omit<{
        type: PropType<readonly SortItem[]>;
        default: () => never[];
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["groupBy"] ? readonly SortItem[] : readonly SortItem[] | Defaults["groupBy"]>;
        default: unknown extends Defaults["groupBy"] ? readonly SortItem[] : readonly SortItem[] | Defaults["groupBy"];
    };
    opened: unknown extends Defaults["opened"] ? {
        type: PropType<readonly string[]>;
        default: () => never[];
    } : Omit<{
        type: PropType<readonly string[]>;
        default: () => never[];
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["opened"] ? readonly string[] : readonly string[] | Defaults["opened"]>;
        default: unknown extends Defaults["opened"] ? readonly string[] : readonly string[] | Defaults["opened"];
    };
    openAll: unknown extends Defaults["openAll"] ? BooleanConstructor : {
        type: PropType<unknown extends Defaults["openAll"] ? boolean : boolean | Defaults["openAll"]>;
        default: unknown extends Defaults["openAll"] ? boolean : boolean | Defaults["openAll"];
    };
    groupKey: unknown extends Defaults["groupKey"] ? PropType<GroupKeyFunction> : {
        type: PropType<unknown extends Defaults["groupKey"] ? GroupKeyFunction : GroupKeyFunction | Defaults["groupKey"]>;
        default: unknown extends Defaults["groupKey"] ? GroupKeyFunction : GroupKeyFunction | Defaults["groupKey"];
    };
};
type GroupProps = {
    groupBy: readonly SortItem[];
    'onUpdate:groupBy': ((value: SortItem[]) => void) | undefined;
    opened: readonly string[];
    'onUpdate:opened': ((value: string[]) => void) | undefined;
    openAll: boolean;
    groupKey: GroupKeyFunction | undefined;
};
export declare function createGroupBy(props: GroupProps): {
    groupBy: Ref<readonly SortItem[], readonly SortItem[]> & {
        readonly externalValue: readonly SortItem[];
    };
    opened: Ref<readonly string[], readonly string[]> & {
        readonly externalValue: readonly string[];
    };
    openAll: Readonly<Ref<boolean, boolean>>;
    groupKey: Readonly<Ref<GroupKeyFunction | undefined, GroupKeyFunction | undefined>>;
};
export declare function provideGroupBy(options: {
    groupBy: Ref<readonly SortItem[]>;
    sortBy: Ref<readonly SortItem[]>;
    disableSort?: Ref<boolean>;
    opened?: Ref<readonly string[]>;
}): {
    sortByWithGroups: import("vue").ComputedRef<SortItem[]>;
    toggleGroup: (group: Group) => void;
    opened: import("vue").WritableComputedRef<Set<string>, Set<string>>;
    groupBy: Ref<readonly SortItem[], readonly SortItem[]>;
    extractRows: <T extends GroupableItem>(items: readonly (T | Group<T> | GroupSummary<T>)[]) => T[];
    isGroupOpen: (group: Group) => boolean;
};
export declare function useGroupBy(): {
    opened: Ref<Set<string>>;
    toggleGroup: (group: Group) => void;
    isGroupOpen: (group: Group) => boolean;
    sortByWithGroups: Ref<SortItem[]>;
    groupBy: Ref<readonly SortItem[]>;
    extractRows: (items: (DataTableItem | Group<DataTableItem>)[]) => DataTableItem[];
};
export declare function useOpenAllGroups(opened: Ref<Set<string>>, openAll: MaybeRefOrGetter<boolean>, items: MaybeRefOrGetter<readonly GroupableItem[]>, groupBy: Ref<readonly SortItem[]>, groupKey?: MaybeRefOrGetter<GroupKeyFunction | undefined>): void;
export declare function useGroupedItems<T extends GroupableItem>(items: MaybeRefOrGetter<readonly T[]>, groupBy: Ref<readonly SortItem[]>, opened: Ref<Set<string>>, hasSummary: MaybeRefOrGetter<boolean>, isGroupOpen?: (group: Group) => boolean, groupKey?: MaybeRefOrGetter<GroupKeyFunction | undefined>): {
    groups: import("vue").ComputedRef<Group<T>[]>;
    flatItems: import("vue").ComputedRef<readonly (T | Group<T> | GroupSummary<T>)[]>;
};

