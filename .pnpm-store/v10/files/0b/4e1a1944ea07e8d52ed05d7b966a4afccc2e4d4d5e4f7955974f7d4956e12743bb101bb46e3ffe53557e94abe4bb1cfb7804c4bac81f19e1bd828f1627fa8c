import type { PropType } from 'vue';
import type { ClassValue } from '../../../composables/component.js';
export type SparklineItem = number | {
    value: number;
};
export type SparklineText = {
    x: number;
    value: string;
};
export interface Boundary {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export interface Point {
    x: number;
    y: number;
    value: number;
}
export type SparklineAnimationConfig = {
    duration?: number;
    easing?: string;
};
export type SparklineTooltipConfig = {
    titleFormat?: (item: {
        index: number;
        value: number;
    }) => string;
    offset?: number;
    class?: ClassValue;
    showCrosshair?: boolean;
};
export declare const makeLineProps: <Defaults extends {
    animation?: unknown;
    autoDraw?: unknown;
    autoDrawDuration?: unknown;
    autoDrawEasing?: unknown;
    color?: unknown;
    gradient?: unknown;
    gradientDirection?: unknown;
    height?: unknown;
    labels?: unknown;
    labelSize?: unknown;
    lineWidth?: unknown;
    id?: unknown;
    itemValue?: unknown;
    modelValue?: unknown;
    min?: unknown;
    max?: unknown;
    padding?: unknown;
    markerSize?: unknown;
    markerStroke?: unknown;
    inset?: unknown;
    showLabels?: unknown;
    showMarkers?: unknown;
    smooth?: unknown;
    smoothMode?: unknown;
    interactive?: unknown;
    tooltip?: unknown;
    width?: unknown;
} = {}>(defaults?: Defaults | undefined) => {
    animation: unknown extends Defaults["animation"] ? {
        type: PropType<boolean | SparklineAnimationConfig>;
        default: boolean;
    } : Omit<{
        type: PropType<boolean | SparklineAnimationConfig>;
        default: boolean;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["animation"] ? boolean | SparklineAnimationConfig : boolean | SparklineAnimationConfig | Defaults["animation"]>;
        default: unknown extends Defaults["animation"] ? boolean | SparklineAnimationConfig : Defaults["animation"] | NonNullable<boolean | SparklineAnimationConfig>;
    };
    autoDraw: unknown extends Defaults["autoDraw"] ? {
        type: PropType<boolean | 'once'>;
        default: boolean;
    } : Omit<{
        type: PropType<boolean | 'once'>;
        default: boolean;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["autoDraw"] ? "once" | boolean : "once" | boolean | Defaults["autoDraw"]>;
        default: unknown extends Defaults["autoDraw"] ? "once" | boolean : Defaults["autoDraw"] | NonNullable<"once" | boolean>;
    };
    autoDrawDuration: unknown extends Defaults["autoDrawDuration"] ? (NumberConstructor | StringConstructor)[] : {
        type: PropType<unknown extends Defaults["autoDrawDuration"] ? string | number : string | number | Defaults["autoDrawDuration"]>;
        default: unknown extends Defaults["autoDrawDuration"] ? string | number : Defaults["autoDrawDuration"] | NonNullable<string | number>;
    };
    autoDrawEasing: unknown extends Defaults["autoDrawEasing"] ? {
        type: StringConstructor;
        default: string;
    } : Omit<{
        type: StringConstructor;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["autoDrawEasing"] ? string : string | Defaults["autoDrawEasing"]>;
        default: unknown extends Defaults["autoDrawEasing"] ? string : string | Defaults["autoDrawEasing"];
    };
    color: unknown extends Defaults["color"] ? StringConstructor : {
        type: PropType<unknown extends Defaults["color"] ? string : string | Defaults["color"]>;
        default: unknown extends Defaults["color"] ? string : string | Defaults["color"];
    };
    gradient: unknown extends Defaults["gradient"] ? {
        type: PropType<string[]>;
        default: () => never[];
    } : Omit<{
        type: PropType<string[]>;
        default: () => never[];
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["gradient"] ? string[] : string[] | Defaults["gradient"]>;
        default: unknown extends Defaults["gradient"] ? string[] : string[] | Defaults["gradient"];
    };
    gradientDirection: unknown extends Defaults["gradientDirection"] ? {
        type: PropType<'top' | 'bottom' | 'left' | 'right'>;
        validator: (val: string) => boolean;
        default: string;
    } : Omit<{
        type: PropType<'top' | 'bottom' | 'left' | 'right'>;
        validator: (val: string) => boolean;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["gradientDirection"] ? "bottom" | "left" | "right" | "top" : "bottom" | "left" | "right" | "top" | Defaults["gradientDirection"]>;
        default: unknown extends Defaults["gradientDirection"] ? "bottom" | "left" | "right" | "top" : Defaults["gradientDirection"] | NonNullable<"bottom" | "left" | "right" | "top">;
    };
    height: unknown extends Defaults["height"] ? {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    } : Omit<{
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["height"] ? string | number : string | number | Defaults["height"]>;
        default: unknown extends Defaults["height"] ? string | number : Defaults["height"] | NonNullable<string | number>;
    };
    labels: unknown extends Defaults["labels"] ? {
        type: PropType<(string | SparklineItem)[]>;
        default: () => never[];
    } : Omit<{
        type: PropType<(string | SparklineItem)[]>;
        default: () => never[];
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["labels"] ? (string | SparklineItem)[] : (string | SparklineItem)[] | Defaults["labels"]>;
        default: unknown extends Defaults["labels"] ? (string | SparklineItem)[] : (string | SparklineItem)[] | Defaults["labels"];
    };
    labelSize: unknown extends Defaults["labelSize"] ? {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    } : Omit<{
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["labelSize"] ? string | number : string | number | Defaults["labelSize"]>;
        default: unknown extends Defaults["labelSize"] ? string | number : Defaults["labelSize"] | NonNullable<string | number>;
    };
    lineWidth: unknown extends Defaults["lineWidth"] ? {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    } : Omit<{
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["lineWidth"] ? string | number : string | number | Defaults["lineWidth"]>;
        default: unknown extends Defaults["lineWidth"] ? string | number : Defaults["lineWidth"] | NonNullable<string | number>;
    };
    id: unknown extends Defaults["id"] ? StringConstructor : {
        type: PropType<unknown extends Defaults["id"] ? string : string | Defaults["id"]>;
        default: unknown extends Defaults["id"] ? string : string | Defaults["id"];
    };
    itemValue: unknown extends Defaults["itemValue"] ? {
        type: StringConstructor;
        default: string;
    } : Omit<{
        type: StringConstructor;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["itemValue"] ? string : string | Defaults["itemValue"]>;
        default: unknown extends Defaults["itemValue"] ? string : string | Defaults["itemValue"];
    };
    modelValue: unknown extends Defaults["modelValue"] ? {
        type: PropType<SparklineItem[]>;
        default: () => never[];
    } : Omit<{
        type: PropType<SparklineItem[]>;
        default: () => never[];
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["modelValue"] ? SparklineItem[] : SparklineItem[] | Defaults["modelValue"]>;
        default: unknown extends Defaults["modelValue"] ? SparklineItem[] : SparklineItem[] | Defaults["modelValue"];
    };
    min: unknown extends Defaults["min"] ? (NumberConstructor | StringConstructor)[] : {
        type: PropType<unknown extends Defaults["min"] ? string | number : string | number | Defaults["min"]>;
        default: unknown extends Defaults["min"] ? string | number : Defaults["min"] | NonNullable<string | number>;
    };
    max: unknown extends Defaults["max"] ? (NumberConstructor | StringConstructor)[] : {
        type: PropType<unknown extends Defaults["max"] ? string | number : string | number | Defaults["max"]>;
        default: unknown extends Defaults["max"] ? string | number : Defaults["max"] | NonNullable<string | number>;
    };
    padding: unknown extends Defaults["padding"] ? {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    } : Omit<{
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["padding"] ? string | number : string | number | Defaults["padding"]>;
        default: unknown extends Defaults["padding"] ? string | number : Defaults["padding"] | NonNullable<string | number>;
    };
    markerSize: unknown extends Defaults["markerSize"] ? {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    } : Omit<{
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["markerSize"] ? string | number : string | number | Defaults["markerSize"]>;
        default: unknown extends Defaults["markerSize"] ? string | number : Defaults["markerSize"] | NonNullable<string | number>;
    };
    markerStroke: unknown extends Defaults["markerStroke"] ? {
        type: StringConstructor;
        default: string;
    } : Omit<{
        type: StringConstructor;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["markerStroke"] ? string : string | Defaults["markerStroke"]>;
        default: unknown extends Defaults["markerStroke"] ? string : string | Defaults["markerStroke"];
    };
    inset: unknown extends Defaults["inset"] ? BooleanConstructor : {
        type: PropType<unknown extends Defaults["inset"] ? boolean : boolean | Defaults["inset"]>;
        default: unknown extends Defaults["inset"] ? boolean : boolean | Defaults["inset"];
    };
    showLabels: unknown extends Defaults["showLabels"] ? BooleanConstructor : {
        type: PropType<unknown extends Defaults["showLabels"] ? boolean : boolean | Defaults["showLabels"]>;
        default: unknown extends Defaults["showLabels"] ? boolean : boolean | Defaults["showLabels"];
    };
    showMarkers: unknown extends Defaults["showMarkers"] ? BooleanConstructor : {
        type: PropType<unknown extends Defaults["showMarkers"] ? boolean : boolean | Defaults["showMarkers"]>;
        default: unknown extends Defaults["showMarkers"] ? boolean : boolean | Defaults["showMarkers"];
    };
    smooth: unknown extends Defaults["smooth"] ? (BooleanConstructor | NumberConstructor | StringConstructor)[] : {
        type: PropType<unknown extends Defaults["smooth"] ? string | number | boolean : string | number | boolean | Defaults["smooth"]>;
        default: unknown extends Defaults["smooth"] ? string | number | boolean : Defaults["smooth"] | NonNullable<string | number | boolean>;
    };
    smoothMode: unknown extends Defaults["smoothMode"] ? {
        type: PropType<'default' | 'monotone'>;
        default: string;
    } : Omit<{
        type: PropType<'default' | 'monotone'>;
        default: string;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["smoothMode"] ? "default" | "monotone" : "default" | "monotone" | Defaults["smoothMode"]>;
        default: unknown extends Defaults["smoothMode"] ? "default" | "monotone" : Defaults["smoothMode"] | NonNullable<"default" | "monotone">;
    };
    interactive: unknown extends Defaults["interactive"] ? BooleanConstructor : {
        type: PropType<unknown extends Defaults["interactive"] ? boolean : boolean | Defaults["interactive"]>;
        default: unknown extends Defaults["interactive"] ? boolean : boolean | Defaults["interactive"];
    };
    tooltip: unknown extends Defaults["tooltip"] ? {
        type: PropType<boolean | SparklineTooltipConfig>;
        default: boolean;
    } : Omit<{
        type: PropType<boolean | SparklineTooltipConfig>;
        default: boolean;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["tooltip"] ? boolean | SparklineTooltipConfig : boolean | SparklineTooltipConfig | Defaults["tooltip"]>;
        default: unknown extends Defaults["tooltip"] ? boolean | SparklineTooltipConfig : Defaults["tooltip"] | NonNullable<boolean | SparklineTooltipConfig>;
    };
    width: unknown extends Defaults["width"] ? {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    } : Omit<{
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["width"] ? string | number : string | number | Defaults["width"]>;
        default: unknown extends Defaults["width"] ? string | number : Defaults["width"] | NonNullable<string | number>;
    };
};
export declare function resample(values: number[], targetCount: number): number[];
export declare function extendPoints(points: Point[], inset: boolean, totalWidth: number): Point[];
export interface BuildPathOptions {
    smooth: boolean | string | number | undefined;
    smoothMode: 'default' | 'monotone';
    height: number;
    fill: boolean;
    animation: boolean;
}
export declare function buildPath(points: Point[], options: BuildPathOptions): string;
