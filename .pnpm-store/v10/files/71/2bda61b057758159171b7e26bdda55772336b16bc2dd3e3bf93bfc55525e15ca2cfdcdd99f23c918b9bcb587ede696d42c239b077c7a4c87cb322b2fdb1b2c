import type { Component, PropType, TransitionProps } from 'vue';
import type { Group, GroupSummary } from './composables/group.js';
import type { CellProps, DataTableItem, DataTableLoading, GroupHeaderSlot, GroupSummarySlot, ItemSlot, RowProps } from './types.js';
import type { VDataTableGroupHeaderRowSlots } from './VDataTableGroupHeaderRow.js';
import type { VDataTableRowSlots } from './VDataTableRow.js';
import type { GenericProps } from '../../util/index.js';
export type VDataTableRowsSlots<T> = VDataTableGroupHeaderRowSlots & VDataTableRowSlots<T> & {
    item: ItemSlot<T> & {
        props: Record<string, any>;
    };
    loading: never;
    'group-header': GroupHeaderSlot;
    'group-summary': GroupSummarySlot;
    'no-data': never;
    'expanded-row': ItemSlot<T>;
    expanded: ItemSlot<T>;
};
export declare const makeVDataTableRowsProps: <Defaults extends {
    mobile?: unknown;
    mobileBreakpoint?: unknown;
    density?: unknown;
    groupCollapseIcon?: unknown;
    groupExpandIcon?: unknown;
    collapseIcon?: unknown;
    expandIcon?: unknown;
    getMatches?: unknown;
    color?: unknown;
    loading?: unknown;
    loadingText?: unknown;
    hideNoData?: unknown;
    items?: unknown;
    noDataText?: unknown;
    rowProps?: unknown;
    cellProps?: unknown;
    expandTransition?: unknown;
} = {}>(defaults?: Defaults | undefined) => {
    mobile: unknown extends Defaults["mobile"] ? {
        type: PropType<boolean | null>;
        default: boolean;
    } : Omit<{
        type: PropType<boolean | null>;
        default: boolean;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["mobile"] ? boolean | null : boolean | Defaults["mobile"] | null>;
        default: unknown extends Defaults["mobile"] ? boolean | null : Defaults["mobile"] | NonNullable<boolean | null>;
    };
    mobileBreakpoint: unknown extends Defaults["mobileBreakpoint"] ? PropType<number | import("../../types.js").DisplayBreakpoint> : {
        type: PropType<unknown extends Defaults["mobileBreakpoint"] ? number | import("../../types.js").DisplayBreakpoint : number | Defaults["mobileBreakpoint"] | import("../../types.js").DisplayBreakpoint>;
        default: unknown extends Defaults["mobileBreakpoint"] ? number | import("../../types.js").DisplayBreakpoint : Defaults["mobileBreakpoint"] | NonNullable<number | import("../../types.js").DisplayBreakpoint>;
    };
    density: unknown extends Defaults["density"] ? {
        type: PropType<import("../../composables/density.js").Density>;
        default: string;
        validator: (v: any) => boolean;
    } : Omit<{
        type: PropType<import("../../composables/density.js").Density>;
        default: string;
        validator: (v: any) => boolean;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["density"] ? import("../../composables/density.js").Density : Defaults["density"] | import("../../composables/density.js").Density>;
        default: unknown extends Defaults["density"] ? import("../../composables/density.js").Density : Defaults["density"] | NonNullable<import("../../composables/density.js").Density>;
    };
    groupCollapseIcon: unknown extends Defaults["groupCollapseIcon"] ? {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    } : Omit<{
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["groupCollapseIcon"] ? import("../../composables/icons.js").IconValue : Defaults["groupCollapseIcon"] | import("../../composables/icons.js").IconValue>;
        default: unknown extends Defaults["groupCollapseIcon"] ? import("../../composables/icons.js").IconValue : Defaults["groupCollapseIcon"] | NonNullable<import("../../composables/icons.js").IconValue>;
    };
    groupExpandIcon: unknown extends Defaults["groupExpandIcon"] ? {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    } : Omit<{
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["groupExpandIcon"] ? import("../../composables/icons.js").IconValue : Defaults["groupExpandIcon"] | import("../../composables/icons.js").IconValue>;
        default: unknown extends Defaults["groupExpandIcon"] ? import("../../composables/icons.js").IconValue : Defaults["groupExpandIcon"] | NonNullable<import("../../composables/icons.js").IconValue>;
    };
    collapseIcon: unknown extends Defaults["collapseIcon"] ? {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    } : Omit<{
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["collapseIcon"] ? import("../../composables/icons.js").IconValue : Defaults["collapseIcon"] | import("../../composables/icons.js").IconValue>;
        default: unknown extends Defaults["collapseIcon"] ? import("../../composables/icons.js").IconValue : Defaults["collapseIcon"] | NonNullable<import("../../composables/icons.js").IconValue>;
    };
    expandIcon: unknown extends Defaults["expandIcon"] ? {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    } : Omit<{
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["expandIcon"] ? import("../../composables/icons.js").IconValue : Defaults["expandIcon"] | import("../../composables/icons.js").IconValue>;
        default: unknown extends Defaults["expandIcon"] ? import("../../composables/icons.js").IconValue : Defaults["expandIcon"] | NonNullable<import("../../composables/icons.js").IconValue>;
    };
    getMatches: unknown extends Defaults["getMatches"] ? PropType<(item: DataTableItem) => Record<string, import("../../composables/filter.js").FilterMatchArrayMultiple | undefined> | undefined> : {
        type: PropType<unknown extends Defaults["getMatches"] ? (item: DataTableItem) => Record<string, import("../../composables/filter.js").FilterMatchArrayMultiple | undefined> | undefined : ((item: DataTableItem) => Record<string, import("../../composables/filter.js").FilterMatchArrayMultiple | undefined> | undefined) | Defaults["getMatches"]>;
        default: unknown extends Defaults["getMatches"] ? (item: DataTableItem) => Record<string, import("../../composables/filter.js").FilterMatchArrayMultiple | undefined> | undefined : ((item: DataTableItem) => Record<string, import("../../composables/filter.js").FilterMatchArrayMultiple | undefined> | undefined) | Defaults["getMatches"];
    };
    color: unknown extends Defaults["color"] ? StringConstructor : {
        type: PropType<unknown extends Defaults["color"] ? string : string | Defaults["color"]>;
        default: unknown extends Defaults["color"] ? string : string | Defaults["color"];
    };
    loading: unknown extends Defaults["loading"] ? PropType<DataTableLoading> : {
        type: PropType<unknown extends Defaults["loading"] ? DataTableLoading : Defaults["loading"] | DataTableLoading>;
        default: unknown extends Defaults["loading"] ? DataTableLoading : Defaults["loading"] | NonNullable<DataTableLoading>;
    };
    loadingText: unknown extends Defaults["loadingText"] ? {
        type: StringConstructor;
        default: string;
    } : Omit<{
        type: StringConstructor;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["loadingText"] ? string : string | Defaults["loadingText"]>;
        default: unknown extends Defaults["loadingText"] ? string : string | Defaults["loadingText"];
    };
    hideNoData: unknown extends Defaults["hideNoData"] ? BooleanConstructor : {
        type: PropType<unknown extends Defaults["hideNoData"] ? boolean : boolean | Defaults["hideNoData"]>;
        default: unknown extends Defaults["hideNoData"] ? boolean : boolean | Defaults["hideNoData"];
    };
    items: unknown extends Defaults["items"] ? {
        type: PropType<readonly (DataTableItem | Group | GroupSummary)[]>;
        default: () => never[];
    } : Omit<{
        type: PropType<readonly (DataTableItem | Group | GroupSummary)[]>;
        default: () => never[];
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["items"] ? readonly (DataTableItem<any> | Group<any> | GroupSummary<any>)[] : readonly (DataTableItem<any> | Group<any> | GroupSummary<any>)[] | Defaults["items"]>;
        default: unknown extends Defaults["items"] ? readonly (DataTableItem<any> | Group<any> | GroupSummary<any>)[] : readonly (DataTableItem<any> | Group<any> | GroupSummary<any>)[] | Defaults["items"];
    };
    noDataText: unknown extends Defaults["noDataText"] ? {
        type: StringConstructor;
        default: string;
    } : Omit<{
        type: StringConstructor;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["noDataText"] ? string : string | Defaults["noDataText"]>;
        default: unknown extends Defaults["noDataText"] ? string : string | Defaults["noDataText"];
    };
    rowProps: unknown extends Defaults["rowProps"] ? PropType<RowProps<any>> : {
        type: PropType<unknown extends Defaults["rowProps"] ? RowProps<any> : Defaults["rowProps"] | RowProps<any>>;
        default: unknown extends Defaults["rowProps"] ? RowProps<any> : Defaults["rowProps"] | NonNullable<RowProps<any>>;
    };
    cellProps: unknown extends Defaults["cellProps"] ? PropType<CellProps<any>> : {
        type: PropType<unknown extends Defaults["cellProps"] ? CellProps<any> : Defaults["cellProps"] | CellProps<any>>;
        default: unknown extends Defaults["cellProps"] ? CellProps<any> : Defaults["cellProps"] | NonNullable<CellProps<any>>;
    };
    expandTransition: unknown extends Defaults["expandTransition"] ? {
        type: PropType<null | string | boolean | (TransitionProps & {
            component?: Component;
        })>;
        default: () => {
            component: {
                new (...args: any[]): import("vue").CreateComponentPublicInstanceWithMixins<{
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                } & {} & {
                    $children?: {
                        default?: (() => import("vue").VNodeChild) | undefined;
                    } | {
                        $stable?: boolean;
                    } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                    'v-slots'?: {
                        default?: false | (() => import("vue").VNodeChild) | undefined;
                    } | undefined;
                } & {
                    "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
                }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                }, true, {}, import("vue").SlotsType<Partial<{
                    default: () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                        [key: string]: any;
                    }>[];
                }>>, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, {}, any, import("vue").ComponentProvideOptions, {
                    P: {};
                    B: {};
                    D: {};
                    C: {};
                    M: {};
                    Defaults: {};
                }, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                } & {} & {
                    $children?: {
                        default?: (() => import("vue").VNodeChild) | undefined;
                    } | {
                        $stable?: boolean;
                    } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                    'v-slots'?: {
                        default?: false | (() => import("vue").VNodeChild) | undefined;
                    } | undefined;
                } & {
                    "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
                }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>, {}, {}, {}, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                }>;
                __isFragment?: never;
                __isTeleport?: never;
                __isSuspense?: never;
            } & import("vue").ComponentOptionsBase<{
                mode: "default" | "in-out" | "out-in";
                disabled: boolean;
                group: boolean;
                hideOnLeave: boolean;
            } & {} & {
                $children?: {
                    default?: (() => import("vue").VNodeChild) | undefined;
                } | {
                    $stable?: boolean;
                } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                'v-slots'?: {
                    default?: false | (() => import("vue").VNodeChild) | undefined;
                } | undefined;
            } & {
                "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
            }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                [key: string]: any;
            }>, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                mode: "default" | "in-out" | "out-in";
                disabled: boolean;
                group: boolean;
                hideOnLeave: boolean;
            }, {}, string, import("vue").SlotsType<Partial<{
                default: () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>[];
            }>>, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, import("vue").ComponentProvideOptions> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps & import("../../util/index.js").FilterPropsOptions<{
                mode: {
                    type: PropType<'in-out' | 'out-in' | 'default'>;
                    default: string;
                };
                disabled: {
                    type: BooleanConstructor;
                    default: boolean;
                };
                group: BooleanConstructor;
                hideOnLeave: BooleanConstructor;
            }, import("vue").ExtractPropTypes<{
                mode: {
                    type: PropType<'in-out' | 'out-in' | 'default'>;
                    default: string;
                };
                disabled: {
                    type: BooleanConstructor;
                    default: boolean;
                };
                group: BooleanConstructor;
                hideOnLeave: BooleanConstructor;
            }>>;
        };
        validator: (val: unknown) => boolean;
    } : Omit<{
        type: PropType<null | string | boolean | (TransitionProps & {
            component?: Component;
        })>;
        default: () => {
            component: {
                new (...args: any[]): import("vue").CreateComponentPublicInstanceWithMixins<{
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                } & {} & {
                    $children?: {
                        default?: (() => import("vue").VNodeChild) | undefined;
                    } | {
                        $stable?: boolean;
                    } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                    'v-slots'?: {
                        default?: false | (() => import("vue").VNodeChild) | undefined;
                    } | undefined;
                } & {
                    "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
                }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                }, true, {}, import("vue").SlotsType<Partial<{
                    default: () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                        [key: string]: any;
                    }>[];
                }>>, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, {}, any, import("vue").ComponentProvideOptions, {
                    P: {};
                    B: {};
                    D: {};
                    C: {};
                    M: {};
                    Defaults: {};
                }, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                } & {} & {
                    $children?: {
                        default?: (() => import("vue").VNodeChild) | undefined;
                    } | {
                        $stable?: boolean;
                    } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                    'v-slots'?: {
                        default?: false | (() => import("vue").VNodeChild) | undefined;
                    } | undefined;
                } & {
                    "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
                }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>, {}, {}, {}, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                }>;
                __isFragment?: never;
                __isTeleport?: never;
                __isSuspense?: never;
            } & import("vue").ComponentOptionsBase<{
                mode: "default" | "in-out" | "out-in";
                disabled: boolean;
                group: boolean;
                hideOnLeave: boolean;
            } & {} & {
                $children?: {
                    default?: (() => import("vue").VNodeChild) | undefined;
                } | {
                    $stable?: boolean;
                } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                'v-slots'?: {
                    default?: false | (() => import("vue").VNodeChild) | undefined;
                } | undefined;
            } & {
                "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
            }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                [key: string]: any;
            }>, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                mode: "default" | "in-out" | "out-in";
                disabled: boolean;
                group: boolean;
                hideOnLeave: boolean;
            }, {}, string, import("vue").SlotsType<Partial<{
                default: () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>[];
            }>>, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, import("vue").ComponentProvideOptions> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps & import("../../util/index.js").FilterPropsOptions<{
                mode: {
                    type: PropType<'in-out' | 'out-in' | 'default'>;
                    default: string;
                };
                disabled: {
                    type: BooleanConstructor;
                    default: boolean;
                };
                group: BooleanConstructor;
                hideOnLeave: BooleanConstructor;
            }, import("vue").ExtractPropTypes<{
                mode: {
                    type: PropType<'in-out' | 'out-in' | 'default'>;
                    default: string;
                };
                disabled: {
                    type: BooleanConstructor;
                    default: boolean;
                };
                group: BooleanConstructor;
                hideOnLeave: BooleanConstructor;
            }>>;
        };
        validator: (val: unknown) => boolean;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["expandTransition"] ? string | boolean | (TransitionProps & {
            component?: Component;
        }) | null : string | boolean | Defaults["expandTransition"] | (TransitionProps & {
            component?: Component;
        }) | null>;
        default: unknown extends Defaults["expandTransition"] ? string | boolean | (TransitionProps & {
            component?: Component;
        }) | null : Defaults["expandTransition"] | NonNullable<string | boolean | (TransitionProps & {
            component?: Component;
        }) | null>;
    };
};
export declare const VDataTableRows: {
    new (...args: any[]): import("vue").CreateComponentPublicInstanceWithMixins<{
        mobile: boolean | null;
        density: import("../../composables/density.js").Density;
        groupCollapseIcon: import("../../composables/icons.js").IconValue;
        groupExpandIcon: import("../../composables/icons.js").IconValue;
        collapseIcon: import("../../composables/icons.js").IconValue;
        expandIcon: import("../../composables/icons.js").IconValue;
        loadingText: string;
        hideNoData: boolean;
        noDataText: string;
        expandTransition: string | boolean | (TransitionProps & {
            component?: Component;
        }) | null;
    } & {
        mobileBreakpoint?: number | import("../../types.js").DisplayBreakpoint | undefined;
        getMatches?: ((item: DataTableItem) => Record<string, import("../../composables/filter.js").FilterMatchArrayMultiple | undefined> | undefined) | undefined;
        color?: string | undefined;
        loading?: DataTableLoading | undefined;
        rowProps?: RowProps<any> | undefined;
        cellProps?: CellProps<any> | undefined;
    }, {}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Omit<Record<string, any>, "$children" | "items" | "v-slot:data-table-group" | "v-slot:data-table-select" | "v-slot:expanded" | "v-slot:expanded-row" | "v-slot:group-header" | "v-slot:group-summary" | "v-slot:item" | "v-slot:loading" | "v-slot:no-data" | "v-slots" | `v-slot:header.${string}` | `v-slot:item.${string}`>, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, {
        mobile: boolean | null;
        density: import("../../composables/density.js").Density;
        groupCollapseIcon: import("../../composables/icons.js").IconValue;
        groupExpandIcon: import("../../composables/icons.js").IconValue;
        collapseIcon: import("../../composables/icons.js").IconValue;
        expandIcon: import("../../composables/icons.js").IconValue;
        loadingText: string;
        hideNoData: boolean;
        noDataText: string;
        expandTransition: string | boolean | (TransitionProps & {
            component?: Component;
        }) | null;
    }, true, {}, import("vue").SlotsType<Partial<{
        [x: `item.${string}`]: (arg: import("./types.js").ItemKeySlot<unknown>) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        [x: `header.${string}`]: (arg: import("./VDataTableHeaders.js").VDataTableHeaderCellColumnSlotProps) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'data-table-group': (arg: {
            item: Group;
            count: number;
            props: Record<string, unknown>;
        }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'data-table-select': (arg: {
            props: Record<string, unknown>;
        }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'item.data-table-select': (arg: import("./VDataTableRow.js").VDataTableItemCellColumnSlotProps<unknown>) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'item.data-table-expand': (arg: import("./VDataTableRow.js").VDataTableItemCellColumnSlotProps<unknown>) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'header.data-table-select': (arg: import("./VDataTableHeaders.js").VDataTableHeaderCellColumnSlotProps) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'header.data-table-expand': (arg: import("./VDataTableHeaders.js").VDataTableHeaderCellColumnSlotProps) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        item: (arg: {
            index: number;
            item: unknown;
            internalItem: DataTableItem<unknown>;
            isExpanded: ReturnType<typeof import("./composables/expand.js").provideExpanded>['isExpanded'];
            toggleExpand: ReturnType<typeof import("./composables/expand.js").provideExpanded>['toggleExpand'];
            isSelected: ReturnType<typeof import("./composables/select.js").provideSelection>['isSelected'];
            toggleSelect: ReturnType<typeof import("./composables/select.js").provideSelection>['toggleSelect'];
        } & {
            columns: import("./types.js").InternalDataTableHeader[];
        } & {
            props: Record<string, any>;
        }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        loading: () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'group-header': (arg: GroupHeaderSlot) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'group-summary': (arg: GroupSummarySlot) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'no-data': () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'expanded-row': (arg: ItemSlot<unknown>) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        expanded: (arg: ItemSlot<unknown>) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
    }>>, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, {}, any, import("vue").ComponentProvideOptions, {
        P: {};
        B: {};
        D: {};
        C: {};
        M: {};
        Defaults: {};
    }, {
        mobile: boolean | null;
        density: import("../../composables/density.js").Density;
        groupCollapseIcon: import("../../composables/icons.js").IconValue;
        groupExpandIcon: import("../../composables/icons.js").IconValue;
        collapseIcon: import("../../composables/icons.js").IconValue;
        expandIcon: import("../../composables/icons.js").IconValue;
        loadingText: string;
        hideNoData: boolean;
        noDataText: string;
        expandTransition: string | boolean | (TransitionProps & {
            component?: Component;
        }) | null;
    } & {
        mobileBreakpoint?: number | import("../../types.js").DisplayBreakpoint | undefined;
        getMatches?: ((item: DataTableItem) => Record<string, import("../../composables/filter.js").FilterMatchArrayMultiple | undefined> | undefined) | undefined;
        color?: string | undefined;
        loading?: DataTableLoading | undefined;
        rowProps?: RowProps<any> | undefined;
        cellProps?: CellProps<any> | undefined;
    }, {}, {}, {}, {}, {
        mobile: boolean | null;
        density: import("../../composables/density.js").Density;
        groupCollapseIcon: import("../../composables/icons.js").IconValue;
        groupExpandIcon: import("../../composables/icons.js").IconValue;
        collapseIcon: import("../../composables/icons.js").IconValue;
        expandIcon: import("../../composables/icons.js").IconValue;
        loadingText: string;
        hideNoData: boolean;
        noDataText: string;
        expandTransition: string | boolean | (TransitionProps & {
            component?: Component;
        }) | null;
    }>;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
} & import("vue").ComponentOptionsBase<{
    mobile: boolean | null;
    density: import("../../composables/density.js").Density;
    groupCollapseIcon: import("../../composables/icons.js").IconValue;
    groupExpandIcon: import("../../composables/icons.js").IconValue;
    collapseIcon: import("../../composables/icons.js").IconValue;
    expandIcon: import("../../composables/icons.js").IconValue;
    loadingText: string;
    hideNoData: boolean;
    noDataText: string;
    expandTransition: string | boolean | (TransitionProps & {
        component?: Component;
    }) | null;
} & {
    mobileBreakpoint?: number | import("../../types.js").DisplayBreakpoint | undefined;
    getMatches?: ((item: DataTableItem) => Record<string, import("../../composables/filter.js").FilterMatchArrayMultiple | undefined> | undefined) | undefined;
    color?: string | undefined;
    loading?: DataTableLoading | undefined;
    rowProps?: RowProps<any> | undefined;
    cellProps?: CellProps<any> | undefined;
}, {}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Omit<Record<string, any>, "$children" | "items" | "v-slot:data-table-group" | "v-slot:data-table-select" | "v-slot:expanded" | "v-slot:expanded-row" | "v-slot:group-header" | "v-slot:group-summary" | "v-slot:item" | "v-slot:loading" | "v-slot:no-data" | "v-slots" | `v-slot:header.${string}` | `v-slot:item.${string}`>, string, {
    mobile: boolean | null;
    density: import("../../composables/density.js").Density;
    groupCollapseIcon: import("../../composables/icons.js").IconValue;
    groupExpandIcon: import("../../composables/icons.js").IconValue;
    collapseIcon: import("../../composables/icons.js").IconValue;
    expandIcon: import("../../composables/icons.js").IconValue;
    loadingText: string;
    hideNoData: boolean;
    noDataText: string;
    expandTransition: string | boolean | (TransitionProps & {
        component?: Component;
    }) | null;
}, {}, string, import("vue").SlotsType<Partial<{
    [x: `item.${string}`]: (arg: import("./types.js").ItemKeySlot<unknown>) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    [x: `header.${string}`]: (arg: import("./VDataTableHeaders.js").VDataTableHeaderCellColumnSlotProps) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'data-table-group': (arg: {
        item: Group;
        count: number;
        props: Record<string, unknown>;
    }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'data-table-select': (arg: {
        props: Record<string, unknown>;
    }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'item.data-table-select': (arg: import("./VDataTableRow.js").VDataTableItemCellColumnSlotProps<unknown>) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'item.data-table-expand': (arg: import("./VDataTableRow.js").VDataTableItemCellColumnSlotProps<unknown>) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'header.data-table-select': (arg: import("./VDataTableHeaders.js").VDataTableHeaderCellColumnSlotProps) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'header.data-table-expand': (arg: import("./VDataTableHeaders.js").VDataTableHeaderCellColumnSlotProps) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    item: (arg: {
        index: number;
        item: unknown;
        internalItem: DataTableItem<unknown>;
        isExpanded: ReturnType<typeof import("./composables/expand.js").provideExpanded>['isExpanded'];
        toggleExpand: ReturnType<typeof import("./composables/expand.js").provideExpanded>['toggleExpand'];
        isSelected: ReturnType<typeof import("./composables/select.js").provideSelection>['isSelected'];
        toggleSelect: ReturnType<typeof import("./composables/select.js").provideSelection>['toggleSelect'];
    } & {
        columns: import("./types.js").InternalDataTableHeader[];
    } & {
        props: Record<string, any>;
    }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    loading: () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'group-header': (arg: GroupHeaderSlot) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'group-summary': (arg: GroupSummarySlot) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'no-data': () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'expanded-row': (arg: ItemSlot<unknown>) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    expanded: (arg: ItemSlot<unknown>) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
}>>, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, import("vue").ComponentProvideOptions> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps & (new <T>(props: {
    items?: readonly (DataTableItem<T> | Group<T> | GroupSummary<T>)[];
}, slots: VDataTableRowsSlots<T>) => GenericProps<typeof props, typeof slots>) & import("../../util/index.js").FilterPropsOptions<{
    mobile: {
        type: PropType<boolean | null>;
        default: boolean;
    };
    mobileBreakpoint: PropType<number | import("../../types.js").DisplayBreakpoint>;
    density: {
        type: PropType<import("../../composables/density.js").Density>;
        default: string;
        validator: (v: any) => boolean;
    };
    groupCollapseIcon: {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    };
    groupExpandIcon: {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    };
    collapseIcon: {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    };
    expandIcon: {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    };
    getMatches: PropType<(item: DataTableItem) => Record<string, import("../../composables/filter.js").FilterMatchArrayMultiple | undefined> | undefined>;
    color: StringConstructor;
    loading: PropType<DataTableLoading>;
    loadingText: {
        type: StringConstructor;
        default: string;
    };
    hideNoData: BooleanConstructor;
    items: {
        type: PropType<readonly (DataTableItem | Group | GroupSummary)[]>;
        default: () => never[];
    };
    noDataText: {
        type: StringConstructor;
        default: string;
    };
    rowProps: PropType<RowProps<any>>;
    cellProps: PropType<CellProps<any>>;
    expandTransition: {
        type: PropType<null | string | boolean | (TransitionProps & {
            component?: Component;
        })>;
        default: () => {
            component: {
                new (...args: any[]): import("vue").CreateComponentPublicInstanceWithMixins<{
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                } & {} & {
                    $children?: {
                        default?: (() => import("vue").VNodeChild) | undefined;
                    } | {
                        $stable?: boolean;
                    } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                    'v-slots'?: {
                        default?: false | (() => import("vue").VNodeChild) | undefined;
                    } | undefined;
                } & {
                    "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
                }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                }, true, {}, import("vue").SlotsType<Partial<{
                    default: () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                        [key: string]: any;
                    }>[];
                }>>, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, {}, any, import("vue").ComponentProvideOptions, {
                    P: {};
                    B: {};
                    D: {};
                    C: {};
                    M: {};
                    Defaults: {};
                }, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                } & {} & {
                    $children?: {
                        default?: (() => import("vue").VNodeChild) | undefined;
                    } | {
                        $stable?: boolean;
                    } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                    'v-slots'?: {
                        default?: false | (() => import("vue").VNodeChild) | undefined;
                    } | undefined;
                } & {
                    "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
                }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>, {}, {}, {}, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                }>;
                __isFragment?: never;
                __isTeleport?: never;
                __isSuspense?: never;
            } & import("vue").ComponentOptionsBase<{
                mode: "default" | "in-out" | "out-in";
                disabled: boolean;
                group: boolean;
                hideOnLeave: boolean;
            } & {} & {
                $children?: {
                    default?: (() => import("vue").VNodeChild) | undefined;
                } | {
                    $stable?: boolean;
                } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                'v-slots'?: {
                    default?: false | (() => import("vue").VNodeChild) | undefined;
                } | undefined;
            } & {
                "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
            }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                [key: string]: any;
            }>, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                mode: "default" | "in-out" | "out-in";
                disabled: boolean;
                group: boolean;
                hideOnLeave: boolean;
            }, {}, string, import("vue").SlotsType<Partial<{
                default: () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>[];
            }>>, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, import("vue").ComponentProvideOptions> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps & import("../../util/index.js").FilterPropsOptions<{
                mode: {
                    type: PropType<'in-out' | 'out-in' | 'default'>;
                    default: string;
                };
                disabled: {
                    type: BooleanConstructor;
                    default: boolean;
                };
                group: BooleanConstructor;
                hideOnLeave: BooleanConstructor;
            }, import("vue").ExtractPropTypes<{
                mode: {
                    type: PropType<'in-out' | 'out-in' | 'default'>;
                    default: string;
                };
                disabled: {
                    type: BooleanConstructor;
                    default: boolean;
                };
                group: BooleanConstructor;
                hideOnLeave: BooleanConstructor;
            }>>;
        };
        validator: (val: unknown) => boolean;
    };
}, import("vue").ExtractPropTypes<{
    mobile: {
        type: PropType<boolean | null>;
        default: boolean;
    };
    mobileBreakpoint: PropType<number | import("../../types.js").DisplayBreakpoint>;
    density: {
        type: PropType<import("../../composables/density.js").Density>;
        default: string;
        validator: (v: any) => boolean;
    };
    groupCollapseIcon: {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    };
    groupExpandIcon: {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    };
    collapseIcon: {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    };
    expandIcon: {
        type: PropType<import("../../composables/icons.js").IconValue>;
        default: string;
    };
    getMatches: PropType<(item: DataTableItem) => Record<string, import("../../composables/filter.js").FilterMatchArrayMultiple | undefined> | undefined>;
    color: StringConstructor;
    loading: PropType<DataTableLoading>;
    loadingText: {
        type: StringConstructor;
        default: string;
    };
    hideNoData: BooleanConstructor;
    items: {
        type: PropType<readonly (DataTableItem | Group | GroupSummary)[]>;
        default: () => never[];
    };
    noDataText: {
        type: StringConstructor;
        default: string;
    };
    rowProps: PropType<RowProps<any>>;
    cellProps: PropType<CellProps<any>>;
    expandTransition: {
        type: PropType<null | string | boolean | (TransitionProps & {
            component?: Component;
        })>;
        default: () => {
            component: {
                new (...args: any[]): import("vue").CreateComponentPublicInstanceWithMixins<{
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                } & {} & {
                    $children?: {
                        default?: (() => import("vue").VNodeChild) | undefined;
                    } | {
                        $stable?: boolean;
                    } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                    'v-slots'?: {
                        default?: false | (() => import("vue").VNodeChild) | undefined;
                    } | undefined;
                } & {
                    "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
                }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                }, true, {}, import("vue").SlotsType<Partial<{
                    default: () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                        [key: string]: any;
                    }>[];
                }>>, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, {}, any, import("vue").ComponentProvideOptions, {
                    P: {};
                    B: {};
                    D: {};
                    C: {};
                    M: {};
                    Defaults: {};
                }, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                } & {} & {
                    $children?: {
                        default?: (() => import("vue").VNodeChild) | undefined;
                    } | {
                        $stable?: boolean;
                    } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                    'v-slots'?: {
                        default?: false | (() => import("vue").VNodeChild) | undefined;
                    } | undefined;
                } & {
                    "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
                }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>, {}, {}, {}, {
                    mode: "default" | "in-out" | "out-in";
                    disabled: boolean;
                    group: boolean;
                    hideOnLeave: boolean;
                }>;
                __isFragment?: never;
                __isTeleport?: never;
                __isSuspense?: never;
            } & import("vue").ComponentOptionsBase<{
                mode: "default" | "in-out" | "out-in";
                disabled: boolean;
                group: boolean;
                hideOnLeave: boolean;
            } & {} & {
                $children?: {
                    default?: (() => import("vue").VNodeChild) | undefined;
                } | {
                    $stable?: boolean;
                } | (() => import("vue").VNodeChild) | import("vue").VNodeChild;
                'v-slots'?: {
                    default?: false | (() => import("vue").VNodeChild) | undefined;
                } | undefined;
            } & {
                "v-slot:default"?: false | (() => import("vue").VNodeChild) | undefined;
            }, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                [key: string]: any;
            }>, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                mode: "default" | "in-out" | "out-in";
                disabled: boolean;
                group: boolean;
                hideOnLeave: boolean;
            }, {}, string, import("vue").SlotsType<Partial<{
                default: () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }>[];
            }>>, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, import("vue").ComponentProvideOptions> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps & import("../../util/index.js").FilterPropsOptions<{
                mode: {
                    type: PropType<'in-out' | 'out-in' | 'default'>;
                    default: string;
                };
                disabled: {
                    type: BooleanConstructor;
                    default: boolean;
                };
                group: BooleanConstructor;
                hideOnLeave: BooleanConstructor;
            }, import("vue").ExtractPropTypes<{
                mode: {
                    type: PropType<'in-out' | 'out-in' | 'default'>;
                    default: string;
                };
                disabled: {
                    type: BooleanConstructor;
                    default: boolean;
                };
                group: BooleanConstructor;
                hideOnLeave: BooleanConstructor;
            }>>;
        };
        validator: (val: unknown) => boolean;
    };
}>>;
export type VDataTableRows = InstanceType<typeof VDataTableRows>;
