import type { MaybeRefOrGetter } from 'vue';
export type MatchRange = readonly [number, number];
export interface HighlightChunk {
    text: string;
    match: boolean;
}
export interface ToHighlightOptions {
    matches?: MaybeRefOrGetter<readonly MatchRange[] | undefined>;
    matchAll?: MaybeRefOrGetter<boolean>;
    ignoreCase?: MaybeRefOrGetter<boolean>;
}
export declare function toHighlight(text: MaybeRefOrGetter<string>, query?: MaybeRefOrGetter<string | string[] | undefined>, options?: ToHighlightOptions): HighlightChunk[];
