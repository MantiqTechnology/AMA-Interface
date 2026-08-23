import type { MaybeRefOrGetter, ShallowRef } from 'vue';
import type { ColorScale } from './colorScale.js';
import type { PivotCell, PivotGroup, PivotProps } from './pivot.js';
export { isLinearColorScale as isLinearScale } from './colorScale.js';
export type HeatmapThresholds = ColorScale;
export interface HeatmapCell extends PivotCell {
    value: number;
    bucketIndex: number;
    mixPercentage?: number;
    readonly color: string | undefined;
}
export interface HeatmapGroup extends PivotGroup<HeatmapCell> {
    x: number;
    width: number;
    hasOverlap: boolean;
    labelOffset: number;
}
export interface HeatmapProps extends PivotProps {
    thresholds: MaybeRefOrGetter<HeatmapThresholds>;
    cellSize?: string | number | (string | number)[];
    gap?: string | number;
    groupGap?: string | number;
}
interface LinearColors {
    from: string;
    to: string;
    method: string;
}
export declare function useHeatmap(props: HeatmapProps): {
    rows: import("vue").ComputedRef<any[]>;
    rowItems: Readonly<import("vue").Ref<Map<any, HeatmapCell[]>, Map<any, HeatmapCell[]>>>;
    groups: import("vue").ComputedRef<HeatmapGroup[]>;
    hasExplicitColumns: import("vue").ComputedRef<boolean>;
    cellWidth: Readonly<import("vue").Ref<number, number>>;
    cellHeight: Readonly<import("vue").Ref<number, number>>;
    gap: Readonly<import("vue").Ref<number, number>>;
    cellStep: Readonly<import("vue").Ref<number, number>>;
    rowStep: Readonly<import("vue").Ref<number, number>>;
    totalWidth: Readonly<import("vue").Ref<number, number>>;
    totalHeight: Readonly<import("vue").Ref<number, number>>;
    bucketBoundaries: ShallowRef<number[], number[]>;
    bucketColors: ShallowRef<string[], string[]>;
    linearColors: ShallowRef<LinearColors | null, LinearColors | null>;
    colorSpaceClass: ShallowRef<string, string>;
};
