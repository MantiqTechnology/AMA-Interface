import type { MaybeRefOrGetter, PropType } from 'vue';
export interface ChunksProps {
    chunkCount: number | string | null;
    chunkWidth: number | string | null;
    chunkGap: number | string;
    variant: 'split' | undefined;
}
export declare const makeChunksProps: <Defaults extends {
    chunkCount?: unknown;
    chunkWidth?: unknown;
    chunkGap?: unknown;
    variant?: unknown;
} = {}>(defaults?: Defaults | undefined) => {
    chunkCount: unknown extends Defaults["chunkCount"] ? {
        type: (NumberConstructor | StringConstructor)[];
        default: null;
    } : Omit<{
        type: (NumberConstructor | StringConstructor)[];
        default: null;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["chunkCount"] ? string | number : string | number | Defaults["chunkCount"]>;
        default: unknown extends Defaults["chunkCount"] ? string | number : Defaults["chunkCount"] | NonNullable<string | number>;
    };
    chunkWidth: unknown extends Defaults["chunkWidth"] ? {
        type: (NumberConstructor | StringConstructor)[];
        default: null;
    } : Omit<{
        type: (NumberConstructor | StringConstructor)[];
        default: null;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["chunkWidth"] ? string | number : string | number | Defaults["chunkWidth"]>;
        default: unknown extends Defaults["chunkWidth"] ? string | number : Defaults["chunkWidth"] | NonNullable<string | number>;
    };
    chunkGap: unknown extends Defaults["chunkGap"] ? {
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    } : Omit<{
        type: (NumberConstructor | StringConstructor)[];
        default: number;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["chunkGap"] ? string | number : string | number | Defaults["chunkGap"]>;
        default: unknown extends Defaults["chunkGap"] ? string | number : Defaults["chunkGap"] | NonNullable<string | number>;
    };
    variant: unknown extends Defaults["variant"] ? {
        type: PropType<'split'>;
        default: undefined;
        validator: (v: string) => boolean;
    } : Omit<{
        type: PropType<'split'>;
        default: undefined;
        validator: (v: string) => boolean;
    }, "default" | "type"> & {
        type: PropType<unknown extends Defaults["variant"] ? "split" : "split" | Defaults["variant"]>;
        default: unknown extends Defaults["variant"] ? "split" : "split" | Defaults["variant"];
    };
};
export declare function useChunks(props: ChunksProps, containerWidth: MaybeRefOrGetter<number | undefined>, value: MaybeRefOrGetter<number>, bufferValue: MaybeRefOrGetter<number>, reversed: MaybeRefOrGetter<boolean>): {
    hasChunks: Readonly<import("vue").Ref<boolean, boolean>>;
    isSplit: Readonly<import("vue").Ref<boolean, boolean>>;
    chunkCount: Readonly<import("vue").Ref<number, number>>;
    chunksMaskStyles: import("vue").ComputedRef<{
        maskRepeat?: undefined;
        maskImage?: undefined;
        maskSize?: undefined;
    } | {
        maskRepeat: string;
        maskImage: string;
        maskSize: string;
    }>;
    splitStyles: import("vue").ComputedRef<{
        bar: {
            width: string;
        };
        buffer: {
            [x: string]: string;
            width: string;
        } | undefined;
        background: {
            [x: string]: string;
            width: string;
        };
    } | undefined>;
    snapValueToChunk: (val: number) => number;
};
