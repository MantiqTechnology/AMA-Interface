import type { Ref } from 'vue';
export interface RangePickerOptions<T> {
    multiple: Readonly<Ref<boolean | 'range' | undefined>>;
    model: Ref<readonly T[]>;
    compare: (a: T, b: T) => number;
    normalizeEnd?: (value: T) => T;
    previewValue?: Ref<T | undefined>;
}
export declare function useRangePicker<T>({ multiple, model, compare, normalizeEnd, previewValue: externalPreview }: RangePickerOptions<T>): {
    isSelected: (value: T) => boolean;
    isRangeStart: (value: T) => boolean;
    isRangeEnd: (value: T) => boolean;
    isRangeMiddle: (value: T) => boolean;
    select: (value: T) => void;
    setPreview: (value: T | undefined) => void;
    clearPreview: () => void;
    isPreviewStart: (value: T) => boolean;
    isPreviewEnd: (value: T) => boolean;
    isPreviewMiddle: (value: T) => boolean;
    isInPreviewRange: (value: T) => boolean;
};
