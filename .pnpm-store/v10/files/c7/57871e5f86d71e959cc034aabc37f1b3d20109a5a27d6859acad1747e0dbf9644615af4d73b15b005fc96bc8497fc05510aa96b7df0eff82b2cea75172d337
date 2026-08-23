import type { PropType } from 'vue';
import type { HeatmapThresholds } from './heatmap.js';
export declare const makeVHeatmapLegendProps: <Defaults extends {
    cellSize?: unknown;
    labels?: unknown;
    thresholds?: unknown;
    activeBuckets?: unknown;
    rounded?: unknown;
} = {}>(defaults?: Defaults | undefined) => {
    cellSize: unknown extends Defaults["cellSize"] ? {
        type: PropType<string | number | (string | number)[]>;
        default: undefined;
    } : Omit<{
        type: PropType<string | number | (string | number)[]>;
        default: undefined;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["cellSize"] ? string | number | (string | number)[] : string | number | (string | number)[] | Defaults["cellSize"]>;
        default: unknown extends Defaults["cellSize"] ? string | number | (string | number)[] : Defaults["cellSize"] | NonNullable<string | number | (string | number)[]>;
    };
    labels: unknown extends Defaults["labels"] ? {
        type: PropType<string[]>;
        default: () => string[];
    } : Omit<{
        type: PropType<string[]>;
        default: () => string[];
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["labels"] ? string[] : string[] | Defaults["labels"]>;
        default: unknown extends Defaults["labels"] ? string[] : string[] | Defaults["labels"];
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
    activeBuckets: unknown extends Defaults["activeBuckets"] ? {
        type: PropType<number[]>;
        required: true;
    } : Omit<{
        type: PropType<number[]>;
        required: true;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["activeBuckets"] ? number[] : number[] | Defaults["activeBuckets"]>;
        default: unknown extends Defaults["activeBuckets"] ? number[] : number[] | Defaults["activeBuckets"];
    };
    rounded: unknown extends Defaults["rounded"] ? (NumberConstructor | StringConstructor)[] : {
        type: PropType<unknown extends Defaults["rounded"] ? string | number : string | number | Defaults["rounded"]>;
        default: unknown extends Defaults["rounded"] ? string | number : Defaults["rounded"] | NonNullable<string | number>;
    };
};
export declare const VHeatmapLegend: {
    new (...args: any[]): import("vue").CreateComponentPublicInstanceWithMixins<Readonly<import("vue").ExtractPropTypes<{
        cellSize: {
            type: PropType<string | number | (string | number)[]>;
            default: undefined;
        };
        labels: {
            type: PropType<string[]>;
            default: () => string[];
        };
        thresholds: {
            type: PropType<HeatmapThresholds>;
            default: () => never[];
        };
        activeBuckets: {
            type: PropType<number[]>;
            required: true;
        };
        rounded: (NumberConstructor | StringConstructor)[];
    }>> & {
        "onClick:threshold"?: ((index: number) => any) | undefined;
    }, void, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
        'click:threshold': (index: number) => true;
    }, import("vue").PublicProps, {
        cellSize: string | number | (string | number)[];
        labels: string[];
        thresholds: import("./colorScale.js").ColorScale;
    }, true, {}, {}, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, {}, any, import("vue").ComponentProvideOptions, {
        P: {};
        B: {};
        D: {};
        C: {};
        M: {};
        Defaults: {};
    }, Readonly<import("vue").ExtractPropTypes<{
        cellSize: {
            type: PropType<string | number | (string | number)[]>;
            default: undefined;
        };
        labels: {
            type: PropType<string[]>;
            default: () => string[];
        };
        thresholds: {
            type: PropType<HeatmapThresholds>;
            default: () => never[];
        };
        activeBuckets: {
            type: PropType<number[]>;
            required: true;
        };
        rounded: (NumberConstructor | StringConstructor)[];
    }>> & {
        "onClick:threshold"?: ((index: number) => any) | undefined;
    }, {}, {}, {}, {}, {
        cellSize: string | number | (string | number)[];
        labels: string[];
        thresholds: import("./colorScale.js").ColorScale;
    }>;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
} & import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
    cellSize: {
        type: PropType<string | number | (string | number)[]>;
        default: undefined;
    };
    labels: {
        type: PropType<string[]>;
        default: () => string[];
    };
    thresholds: {
        type: PropType<HeatmapThresholds>;
        default: () => never[];
    };
    activeBuckets: {
        type: PropType<number[]>;
        required: true;
    };
    rounded: (NumberConstructor | StringConstructor)[];
}>> & {
    "onClick:threshold"?: ((index: number) => any) | undefined;
}, void, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    'click:threshold': (index: number) => true;
}, string, {
    cellSize: string | number | (string | number)[];
    labels: string[];
    thresholds: import("./colorScale.js").ColorScale;
}, {}, string, {}, import("vue").GlobalComponents, import("vue").GlobalDirectives, string, import("vue").ComponentProvideOptions> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps & import("../../util/index.js").FilterPropsOptions<{
    cellSize: {
        type: PropType<string | number | (string | number)[]>;
        default: undefined;
    };
    labels: {
        type: PropType<string[]>;
        default: () => string[];
    };
    thresholds: {
        type: PropType<HeatmapThresholds>;
        default: () => never[];
    };
    activeBuckets: {
        type: PropType<number[]>;
        required: true;
    };
    rounded: (NumberConstructor | StringConstructor)[];
}, import("vue").ExtractPropTypes<{
    cellSize: {
        type: PropType<string | number | (string | number)[]>;
        default: undefined;
    };
    labels: {
        type: PropType<string[]>;
        default: () => string[];
    };
    thresholds: {
        type: PropType<HeatmapThresholds>;
        default: () => never[];
    };
    activeBuckets: {
        type: PropType<number[]>;
        required: true;
    };
    rounded: (NumberConstructor | StringConstructor)[];
}>>;
