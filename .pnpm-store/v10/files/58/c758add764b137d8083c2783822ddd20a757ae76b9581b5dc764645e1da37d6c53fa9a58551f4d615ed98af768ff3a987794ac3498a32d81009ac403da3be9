import type { PropType } from 'vue';
import type { CalendarTimestamp } from '../types.js';
interface IntervalHighlightBase {
    intervals: {
        value: CalendarTimestamp[][];
    };
    getIntervalAtEvent: (e: Event) => number;
}
export declare const makeIntervalHighlightProps: <Defaults extends {
    intervalHighlight?: unknown;
} = {}>(defaults?: Defaults | undefined) => {
    intervalHighlight: unknown extends Defaults["intervalHighlight"] ? {
        type: PropType<boolean | string>;
        default: boolean;
    } : Omit<{
        type: PropType<boolean | string>;
        default: boolean;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["intervalHighlight"] ? string | boolean : string | boolean | Defaults["intervalHighlight"]>;
        default: unknown extends Defaults["intervalHighlight"] ? string | boolean : Defaults["intervalHighlight"] | NonNullable<string | boolean>;
    };
};
export declare function useIntervalHighlight(props: {
    intervalHighlight: boolean | string;
}, base: IntervalHighlightBase): {
    hoveredTime: import("vue").ShallowRef<string | null, string | null>;
    onMousemove: (e: MouseEvent) => void;
    onMouseleave: () => void;
    isHighlighted: (interval: CalendarTimestamp) => boolean;
    genUnderlay: () => JSX.Element | undefined;
};

