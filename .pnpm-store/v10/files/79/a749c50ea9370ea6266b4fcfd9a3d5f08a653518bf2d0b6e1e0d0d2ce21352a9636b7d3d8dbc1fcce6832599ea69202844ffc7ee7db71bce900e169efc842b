import type { Ref } from 'vue';
export interface MonthPickerProps {
    min?: string;
    max?: string;
    multiple?: boolean | 'range';
    allowedMonths?: number[] | ((date: number) => boolean);
}
export declare function useMonthPicker(props: MonthPickerProps, model: Ref<readonly string[]>): {
    year: import("vue").ShallowRef<number, number>;
    disablePrevYear: import("vue").ComputedRef<boolean>;
    disableNextYear: import("vue").ComputedRef<boolean>;
    selectMonth: (monthIndex: number) => void;
    prevYear: () => void;
    nextYear: () => void;
    getMonthValue: (monthIndex: number) => string;
    range: {
        isSelected: (value: string) => boolean;
        isRangeStart: (value: string) => boolean;
        isRangeEnd: (value: string) => boolean;
        isRangeMiddle: (value: string) => boolean;
        select: (value: string) => void;
        setPreview: (value: string | undefined) => void;
        clearPreview: () => void;
        isPreviewStart: (value: string) => boolean;
        isPreviewEnd: (value: string) => boolean;
        isPreviewMiddle: (value: string) => boolean;
        isInPreviewRange: (value: string) => boolean;
    };
};
