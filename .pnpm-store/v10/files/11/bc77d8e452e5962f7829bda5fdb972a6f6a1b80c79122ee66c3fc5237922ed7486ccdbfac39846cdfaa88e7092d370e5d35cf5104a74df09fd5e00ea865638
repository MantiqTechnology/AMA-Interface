
import type { PropType } from 'vue';
import type { HeatmapCell, HeatmapGroup, HeatmapThresholds } from './heatmap.js';
import type { SelectItemKey } from '../../util/index.js';
export interface HeatmapLegendOptions {
    labels?: string[];
    cellSize?: string | number | (string | number)[];
}
export type VHeatmapSlots = {
    cell: {
        item: HeatmapCell;
    };
    legend: {
        thresholds: HeatmapThresholds;
        activeBuckets: number[];
        toggle: (index: number) => void;
    };
    'row-header': {
        row: any;
        index: number;
        items: HeatmapCell[];
    };
    'column-header': {
        column: any;
        index: number;
        items: HeatmapCell[];
    };
    'group-header': {
        group: HeatmapGroup;
        items: HeatmapCell[];
    };
};
export declare const makeVHeatmapProps: <Defaults extends {
    theme?: unknown;
    cellSize?: unknown;
    gap?: unknown;
    groupGap?: unknown;
    rounded?: unknown;
    hideColumnHeaders?: unknown;
    hideRowHeaders?: unknown;
    legend?: unknown;
    hover?: unknown;
    hoverScale?: unknown;
    items?: unknown;
    itemValue?: unknown;
    itemRow?: unknown;
    itemColumn?: unknown;
    groupBy?: unknown;
    itemProps?: unknown;
    thresholds?: unknown;
    emptyColor?: unknown;
    rows?: unknown;
    columns?: unknown;
} = {}>(defaults?: Defaults | undefined) => {
    theme: unknown extends Defaults["theme"] ? StringConstructor : {
        type: PropType<unknown extends Defaults["theme"] ? string : string | Defaults["theme"]>;
        default: unknown extends Defaults["theme"] ? string : string | Defaults["theme"];
    };
    cellSize: unknown extends Defaults["cellSize"] ? {
        type: PropType<string | number | (string | number)[]>;
        default: number;
    } : Omit<{
        type: PropType<string | number | (string | number)[]>;
        default: number;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["cellSize"] ? string | number | (string | number)[] : string | number | (string | number)[] | Defaults["cellSize"]>;
        default: unknown extends Defaults["cellSize"] ? string | number | (string | number)[] : Defaults["cellSize"] | NonNullable<string | number | (string | number)[]>;
    };
    gap: unknown extends Defaults["gap"] ? {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    } : Omit<{
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["gap"] ? string | number : string | number | Defaults["gap"]>;
        default: unknown extends Defaults["gap"] ? string | number : Defaults["gap"] | NonNullable<string | number>;
    };
    groupGap: unknown extends Defaults["groupGap"] ? {
        type: PropType<number | string>;
        default: number;
    } : Omit<{
        type: PropType<number | string>;
        default: number;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["groupGap"] ? string | number : string | number | Defaults["groupGap"]>;
        default: unknown extends Defaults["groupGap"] ? string | number : Defaults["groupGap"] | NonNullable<string | number>;
    };
    rounded: unknown extends Defaults["rounded"] ? (NumberConstructor | StringConstructor)[] : {
        type: PropType<unknown extends Defaults["rounded"] ? string | number : string | number | Defaults["rounded"]>;
        default: unknown extends Defaults["rounded"] ? string | number : Defaults["rounded"] | NonNullable<string | number>;
    };
    hideColumnHeaders: unknown extends Defaults["hideColumnHeaders"] ? BooleanConstructor : {
        type: PropType<unknown extends Defaults["hideColumnHeaders"] ? boolean : boolean | Defaults["hideColumnHeaders"]>;
        default: unknown extends Defaults["hideColumnHeaders"] ? boolean : boolean | Defaults["hideColumnHeaders"];
    };
    hideRowHeaders: unknown extends Defaults["hideRowHeaders"] ? BooleanConstructor : {
        type: PropType<unknown extends Defaults["hideRowHeaders"] ? boolean : boolean | Defaults["hideRowHeaders"]>;
        default: unknown extends Defaults["hideRowHeaders"] ? boolean : boolean | Defaults["hideRowHeaders"];
    };
    legend: unknown extends Defaults["legend"] ? {
        type: PropType<boolean | HeatmapLegendOptions>;
        default: boolean;
    } : Omit<{
        type: PropType<boolean | HeatmapLegendOptions>;
        default: boolean;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["legend"] ? boolean | HeatmapLegendOptions : boolean | HeatmapLegendOptions | Defaults["legend"]>;
        default: unknown extends Defaults["legend"] ? boolean | HeatmapLegendOptions : Defaults["legend"] | NonNullable<boolean | HeatmapLegendOptions>;
    };
    hover: unknown extends Defaults["hover"] ? BooleanConstructor : {
        type: PropType<unknown extends Defaults["hover"] ? boolean : boolean | Defaults["hover"]>;
        default: unknown extends Defaults["hover"] ? boolean : boolean | Defaults["hover"];
    };
    hoverScale: unknown extends Defaults["hoverScale"] ? {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    } : Omit<{
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["hoverScale"] ? string | number : string | number | Defaults["hoverScale"]>;
        default: unknown extends Defaults["hoverScale"] ? string | number : Defaults["hoverScale"] | NonNullable<string | number>;
    };
    items: unknown extends Defaults["items"] ? {
        type: PropType<Record<string, any>[]>;
        default: () => never[];
    } : Omit<{
        type: PropType<Record<string, any>[]>;
        default: () => never[];
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["items"] ? Record<string, any>[] : Record<string, any>[] | Defaults["items"]>;
        default: unknown extends Defaults["items"] ? Record<string, any>[] : Record<string, any>[] | Defaults["items"];
    };
    itemValue: unknown extends Defaults["itemValue"] ? {
        type: PropType<SelectItemKey>;
        default: string;
    } : Omit<{
        type: PropType<SelectItemKey>;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["itemValue"] ? SelectItemKey : Defaults["itemValue"] | SelectItemKey>;
        default: unknown extends Defaults["itemValue"] ? SelectItemKey : Defaults["itemValue"] | NonNullable<SelectItemKey>;
    };
    itemRow: unknown extends Defaults["itemRow"] ? {
        type: PropType<SelectItemKey>;
        default: string;
    } : Omit<{
        type: PropType<SelectItemKey>;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["itemRow"] ? SelectItemKey : Defaults["itemRow"] | SelectItemKey>;
        default: unknown extends Defaults["itemRow"] ? SelectItemKey : Defaults["itemRow"] | NonNullable<SelectItemKey>;
    };
    itemColumn: unknown extends Defaults["itemColumn"] ? {
        type: PropType<SelectItemKey>;
        default: string;
    } : Omit<{
        type: PropType<SelectItemKey>;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["itemColumn"] ? SelectItemKey : Defaults["itemColumn"] | SelectItemKey>;
        default: unknown extends Defaults["itemColumn"] ? SelectItemKey : Defaults["itemColumn"] | NonNullable<SelectItemKey>;
    };
    groupBy: unknown extends Defaults["groupBy"] ? PropType<SelectItemKey> : {
        type: PropType<unknown extends Defaults["groupBy"] ? SelectItemKey : Defaults["groupBy"] | SelectItemKey>;
        default: unknown extends Defaults["groupBy"] ? SelectItemKey : Defaults["groupBy"] | NonNullable<SelectItemKey>;
    };
    itemProps: unknown extends Defaults["itemProps"] ? PropType<Record<string, any> | ((item: HeatmapCell) => Record<string, any>)> : {
        type: PropType<unknown extends Defaults["itemProps"] ? Record<string, any> | ((item: HeatmapCell) => Record<string, any>) : Record<string, any> | ((item: HeatmapCell) => Record<string, any>) | Defaults["itemProps"]>;
        default: unknown extends Defaults["itemProps"] ? Record<string, any> | ((item: HeatmapCell) => Record<string, any>) : Defaults["itemProps"] | NonNullable<Record<string, any> | ((item: HeatmapCell) => Record<string, any>)>;
    };
    thresholds: unknown extends Defaults["thresholds"] ? {
        type: PropType<HeatmapThresholds>;
        default: () => never[];
    } : Omit<{
        type: PropType<HeatmapThresholds>;
        default: () => never[];
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["thresholds"] ? import("./colorScale.js").ColorScale : Defaults["thresholds"] | import("./colorScale.js").ColorScale>;
        default: unknown extends Defaults["thresholds"] ? import("./colorScale.js").ColorScale : Defaults["thresholds"] | NonNullable<import("./colorScale.js").ColorScale>;
    };
    emptyColor: unknown extends Defaults["emptyColor"] ? StringConstructor : {
        type: PropType<unknown extends Defaults["emptyColor"] ? string : string | Defaults["emptyColor"]>;
        default: unknown extends Defaults["emptyColor"] ? string : string | Defaults["emptyColor"];
    };
    rows: unknown extends Defaults["rows"] ? PropType<any[]> : {
        type: PropType<unknown extends Defaults["rows"] ? any[] : any[] | Defaults["rows"]>;
        default: unknown extends Defaults["rows"] ? any[] : any[] | Defaults["rows"];
    };
    columns: unknown extends Defaults["columns"] ? PropType<any[]> : {
        type: PropType<unknown extends Defaults["columns"] ? any[] : any[] | Defaults["columns"]>;
        default: unknown extends Defaults["columns"] ? any[] : any[] | Defaults["columns"];
    };
};
export declare const VHeatmap: {
    new (...args: any[]): import("vue").CreateComponentPublicInstanceWithMixins<{
        cellSize: string | number | (string | number)[];
        gap: string | number;
        groupGap: string | number;
        hideColumnHeaders: boolean;
        hideRowHeaders: boolean;
        legend: boolean | HeatmapLegendOptions;
        hover: boolean;
        hoverScale: string | number;
        items: Record<string, any>[];
        itemValue: string | boolean | readonly (string | number)[] | ((item: Record<string, any>, fallback?: any) => any) | null;
        itemRow: string | boolean | readonly (string | number)[] | ((item: Record<string, any>, fallback?: any) => any) | null;
        itemColumn: string | boolean | readonly (string | number)[] | ((item: Record<string, any>, fallback?: any) => any) | null;
        thresholds: import("./colorScale.js").ColorScale;
    } & {
        theme?: string | undefined;
        rounded?: string | number | undefined;
        groupBy?: SelectItemKey;
        itemProps?: Record<string, any> | ((item: HeatmapCell) => Record<string, any>) | undefined;
        emptyColor?: string | undefined;
        rows?: any[] | undefined;
        columns?: any[] | undefined;
    } & {
        $children?: {
            cell?: ((arg: {
                item: HeatmapCell;
            }) => import("vue").VNodeChild) | undefined;
            legend?: ((arg: {
                thresholds: HeatmapThresholds;
                activeBuckets: number[];
                toggle: (index: number) => void;
            }) => import("vue").VNodeChild) | undefined;
            'row-header'?: ((arg: {
                row: any;
                index: number;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
            'column-header'?: ((arg: {
                column: any;
                index: number;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
            'group-header'?: ((arg: {
                group: HeatmapGroup;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
        } | {
            $stable?: boolean;
        } | {} | import("vue").VNodeChild;
        'v-slots'?: {
            cell?: false | ((arg: {
                item: HeatmapCell;
            }) => import("vue").VNodeChild) | undefined;
            legend?: false | ((arg: {
                thresholds: HeatmapThresholds;
                activeBuckets: number[];
                toggle: (index: number) => void;
            }) => import("vue").VNodeChild) | undefined;
            'row-header'?: false | ((arg: {
                row: any;
                index: number;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
            'column-header'?: false | ((arg: {
                column: any;
                index: number;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
            'group-header'?: false | ((arg: {
                group: HeatmapGroup;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
        } | undefined;
    } & {
        "v-slot:cell"?: false | ((arg: {
            item: HeatmapCell;
        }) => import("vue").VNodeChild) | undefined;
        "v-slot:column-header"?: false | ((arg: {
            column: any;
            index: number;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
        "v-slot:group-header"?: false | ((arg: {
            group: HeatmapGroup;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
        "v-slot:legend"?: false | ((arg: {
            thresholds: HeatmapThresholds;
            activeBuckets: number[];
            toggle: (index: number) => void;
        }) => import("vue").VNodeChild) | undefined;
        "v-slot:row-header"?: false | ((arg: {
            row: any;
            index: number;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
    }, void, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, {
        cellSize: string | number | (string | number)[];
        gap: string | number;
        groupGap: string | number;
        hideColumnHeaders: boolean;
        hideRowHeaders: boolean;
        legend: boolean | HeatmapLegendOptions;
        hover: boolean;
        hoverScale: string | number;
        items: Record<string, any>[];
        itemValue: SelectItemKey;
        itemRow: SelectItemKey;
        itemColumn: SelectItemKey;
        thresholds: import("./colorScale.js").ColorScale;
    }, true, {}, import("vue").SlotsType<Partial<{
        cell: (arg: {
            item: HeatmapCell;
        }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        legend: (arg: {
            thresholds: HeatmapThresholds;
            activeBuckets: number[];
            toggle: (index: number) => void;
        }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'row-header': (arg: {
            row: any;
            index: number;
            items: HeatmapCell[];
        }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'column-header': (arg: {
            column: any;
            index: number;
            items: HeatmapCell[];
        }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>[];
        'group-header': (arg: {
            group: HeatmapGroup;
            items: HeatmapCell[];
        }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
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
        cellSize: string | number | (string | number)[];
        gap: string | number;
        groupGap: string | number;
        hideColumnHeaders: boolean;
        hideRowHeaders: boolean;
        legend: boolean | HeatmapLegendOptions;
        hover: boolean;
        hoverScale: string | number;
        items: Record<string, any>[];
        itemValue: string | boolean | readonly (string | number)[] | ((item: Record<string, any>, fallback?: any) => any) | null;
        itemRow: string | boolean | readonly (string | number)[] | ((item: Record<string, any>, fallback?: any) => any) | null;
        itemColumn: string | boolean | readonly (string | number)[] | ((item: Record<string, any>, fallback?: any) => any) | null;
        thresholds: import("./colorScale.js").ColorScale;
    } & {
        theme?: string | undefined;
        rounded?: string | number | undefined;
        groupBy?: SelectItemKey;
        itemProps?: Record<string, any> | ((item: HeatmapCell) => Record<string, any>) | undefined;
        emptyColor?: string | undefined;
        rows?: any[] | undefined;
        columns?: any[] | undefined;
    } & {
        $children?: {
            cell?: ((arg: {
                item: HeatmapCell;
            }) => import("vue").VNodeChild) | undefined;
            legend?: ((arg: {
                thresholds: HeatmapThresholds;
                activeBuckets: number[];
                toggle: (index: number) => void;
            }) => import("vue").VNodeChild) | undefined;
            'row-header'?: ((arg: {
                row: any;
                index: number;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
            'column-header'?: ((arg: {
                column: any;
                index: number;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
            'group-header'?: ((arg: {
                group: HeatmapGroup;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
        } | {
            $stable?: boolean;
        } | {} | import("vue").VNodeChild;
        'v-slots'?: {
            cell?: false | ((arg: {
                item: HeatmapCell;
            }) => import("vue").VNodeChild) | undefined;
            legend?: false | ((arg: {
                thresholds: HeatmapThresholds;
                activeBuckets: number[];
                toggle: (index: number) => void;
            }) => import("vue").VNodeChild) | undefined;
            'row-header'?: false | ((arg: {
                row: any;
                index: number;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
            'column-header'?: false | ((arg: {
                column: any;
                index: number;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
            'group-header'?: false | ((arg: {
                group: HeatmapGroup;
                items: HeatmapCell[];
            }) => import("vue").VNodeChild) | undefined;
        } | undefined;
    } & {
        "v-slot:cell"?: false | ((arg: {
            item: HeatmapCell;
        }) => import("vue").VNodeChild) | undefined;
        "v-slot:column-header"?: false | ((arg: {
            column: any;
            index: number;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
        "v-slot:group-header"?: false | ((arg: {
            group: HeatmapGroup;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
        "v-slot:legend"?: false | ((arg: {
            thresholds: HeatmapThresholds;
            activeBuckets: number[];
            toggle: (index: number) => void;
        }) => import("vue").VNodeChild) | undefined;
        "v-slot:row-header"?: false | ((arg: {
            row: any;
            index: number;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
    }, {}, {}, {}, {}, {
        cellSize: string | number | (string | number)[];
        gap: string | number;
        groupGap: string | number;
        hideColumnHeaders: boolean;
        hideRowHeaders: boolean;
        legend: boolean | HeatmapLegendOptions;
        hover: boolean;
        hoverScale: string | number;
        items: Record<string, any>[];
        itemValue: SelectItemKey;
        itemRow: SelectItemKey;
        itemColumn: SelectItemKey;
        thresholds: import("./colorScale.js").ColorScale;
    }>;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
} & import("vue").ComponentOptionsBase<{
    cellSize: string | number | (string | number)[];
    gap: string | number;
    groupGap: string | number;
    hideColumnHeaders: boolean;
    hideRowHeaders: boolean;
    legend: boolean | HeatmapLegendOptions;
    hover: boolean;
    hoverScale: string | number;
    items: Record<string, any>[];
    itemValue: string | boolean | readonly (string | number)[] | ((item: Record<string, any>, fallback?: any) => any) | null;
    itemRow: string | boolean | readonly (string | number)[] | ((item: Record<string, any>, fallback?: any) => any) | null;
    itemColumn: string | boolean | readonly (string | number)[] | ((item: Record<string, any>, fallback?: any) => any) | null;
    thresholds: import("./colorScale.js").ColorScale;
} & {
    theme?: string | undefined;
    rounded?: string | number | undefined;
    groupBy?: SelectItemKey;
    itemProps?: Record<string, any> | ((item: HeatmapCell) => Record<string, any>) | undefined;
    emptyColor?: string | undefined;
    rows?: any[] | undefined;
    columns?: any[] | undefined;
} & {
    $children?: {
        cell?: ((arg: {
            item: HeatmapCell;
        }) => import("vue").VNodeChild) | undefined;
        legend?: ((arg: {
            thresholds: HeatmapThresholds;
            activeBuckets: number[];
            toggle: (index: number) => void;
        }) => import("vue").VNodeChild) | undefined;
        'row-header'?: ((arg: {
            row: any;
            index: number;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
        'column-header'?: ((arg: {
            column: any;
            index: number;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
        'group-header'?: ((arg: {
            group: HeatmapGroup;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
    } | {
        $stable?: boolean;
    } | {} | import("vue").VNodeChild;
    'v-slots'?: {
        cell?: false | ((arg: {
            item: HeatmapCell;
        }) => import("vue").VNodeChild) | undefined;
        legend?: false | ((arg: {
            thresholds: HeatmapThresholds;
            activeBuckets: number[];
            toggle: (index: number) => void;
        }) => import("vue").VNodeChild) | undefined;
        'row-header'?: false | ((arg: {
            row: any;
            index: number;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
        'column-header'?: false | ((arg: {
            column: any;
            index: number;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
        'group-header'?: false | ((arg: {
            group: HeatmapGroup;
            items: HeatmapCell[];
        }) => import("vue").VNodeChild) | undefined;
    } | undefined;
} & {
    "v-slot:cell"?: false | ((arg: {
        item: HeatmapCell;
    }) => import("vue").VNodeChild) | undefined;
    "v-slot:column-header"?: false | ((arg: {
        column: any;
        index: number;
        items: HeatmapCell[];
    }) => import("vue").VNodeChild) | undefined;
    "v-slot:group-header"?: false | ((arg: {
        group: HeatmapGroup;
        items: HeatmapCell[];
    }) => import("vue").VNodeChild) | undefined;
    "v-slot:legend"?: false | ((arg: {
        thresholds: HeatmapThresholds;
        activeBuckets: number[];
        toggle: (index: number) => void;
    }) => import("vue").VNodeChild) | undefined;
    "v-slot:row-header"?: false | ((arg: {
        row: any;
        index: number;
        items: HeatmapCell[];
    }) => import("vue").VNodeChild) | undefined;
}, void, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
    cellSize: string | number | (string | number)[];
    gap: string | number;
    groupGap: string | number;
    hideColumnHeaders: boolean;
    hideRowHeaders: boolean;
    legend: boolean | HeatmapLegendOptions;
    hover: boolean;
    hoverScale: string | number;
    items: Record<string, any>[];
    itemValue: SelectItemKey;
    itemRow: SelectItemKey;
    itemColumn: SelectItemKey;
    thresholds: import("./colorScale.js").ColorScale;
}, {}, string, import("vue").SlotsType<Partial<{
    cell: (arg: {
        item: HeatmapCell;
    }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    legend: (arg: {
        thresholds: HeatmapThresholds;
        activeBuckets: number[];
        toggle: (index: number) => void;
    }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'row-header': (arg: {
        row: any;
        index: number;
        items: HeatmapCell[];
    }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'column-header': (arg: {
        column: any;
        index: number;
        items: HeatmapCell[];
    }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
    'group-header': (arg: {
        group: HeatmapGroup;
        items: HeatmapCell[];
    }) => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
}>>, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, import("vue").ComponentProvideOptions> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps & import("../../util/index.js").FilterPropsOptions<{
    theme: StringConstructor;
    cellSize: {
        type: PropType<string | number | (string | number)[]>;
        default: number;
    };
    gap: {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    };
    groupGap: {
        type: PropType<number | string>;
        default: number;
    };
    rounded: (NumberConstructor | StringConstructor)[];
    hideColumnHeaders: BooleanConstructor;
    hideRowHeaders: BooleanConstructor;
    legend: {
        type: PropType<boolean | HeatmapLegendOptions>;
        default: boolean;
    };
    hover: BooleanConstructor;
    hoverScale: {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    };
    items: {
        type: PropType<Record<string, any>[]>;
        default: () => never[];
    };
    itemValue: {
        type: PropType<SelectItemKey>;
        default: string;
    };
    itemRow: {
        type: PropType<SelectItemKey>;
        default: string;
    };
    itemColumn: {
        type: PropType<SelectItemKey>;
        default: string;
    };
    groupBy: PropType<SelectItemKey>;
    itemProps: PropType<Record<string, any> | ((item: HeatmapCell) => Record<string, any>)>;
    thresholds: {
        type: PropType<HeatmapThresholds>;
        default: () => never[];
    };
    emptyColor: StringConstructor;
    rows: PropType<any[]>;
    columns: PropType<any[]>;
}, import("vue").ExtractPropTypes<{
    theme: StringConstructor;
    cellSize: {
        type: PropType<string | number | (string | number)[]>;
        default: number;
    };
    gap: {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    };
    groupGap: {
        type: PropType<number | string>;
        default: number;
    };
    rounded: (NumberConstructor | StringConstructor)[];
    hideColumnHeaders: BooleanConstructor;
    hideRowHeaders: BooleanConstructor;
    legend: {
        type: PropType<boolean | HeatmapLegendOptions>;
        default: boolean;
    };
    hover: BooleanConstructor;
    hoverScale: {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    };
    items: {
        type: PropType<Record<string, any>[]>;
        default: () => never[];
    };
    itemValue: {
        type: PropType<SelectItemKey>;
        default: string;
    };
    itemRow: {
        type: PropType<SelectItemKey>;
        default: string;
    };
    itemColumn: {
        type: PropType<SelectItemKey>;
        default: string;
    };
    groupBy: PropType<SelectItemKey>;
    itemProps: PropType<Record<string, any> | ((item: HeatmapCell) => Record<string, any>)>;
    thresholds: {
        type: PropType<HeatmapThresholds>;
        default: () => never[];
    };
    emptyColor: StringConstructor;
    rows: PropType<any[]>;
    columns: PropType<any[]>;
}>>;
export type VHeatmap = InstanceType<typeof VHeatmap>;
