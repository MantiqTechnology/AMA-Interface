import type { MaybeRefOrGetter, Ref } from 'vue';
export interface OtpSlotData {
    char: string | null;
    compositionChar: string | null;
    placeholderChar: string | null;
    isActive: boolean;
    hasFakeCaret: boolean;
}
export interface OtpSelection {
    start: number;
    end: number;
    direction: 'forward' | 'backward' | 'none';
}
export interface OtpSelectionInput {
    value: string;
    selectionStart: number | null;
    selectionEnd: number | null;
    selectionDirection: 'forward' | 'backward' | 'none' | null;
    maxLength: number;
}
export declare const OtpInputPatterns: {
    readonly numeric: RegExp;
    readonly alpha: RegExp;
    readonly alphanumeric: RegExp;
    readonly 'unicode-alpha': RegExp;
    readonly 'unicode-alphanumeric': RegExp;
};
export type OtpInputPattern = keyof typeof OtpInputPatterns;
export interface OtpInputOptions {
    value: Ref<string>;
    length?: MaybeRefOrGetter<number>;
    pattern?: MaybeRefOrGetter<OtpInputPattern | RegExp | null | undefined>;
    type?: MaybeRefOrGetter<'text' | 'password' | 'number'>;
    masked?: MaybeRefOrGetter<boolean>;
    placeholder?: MaybeRefOrGetter<string | null | undefined>;
    isFocused?: Ref<boolean>;
}
export interface OtpInputContext {
    value: Ref<string>;
    length: Readonly<Ref<number>>;
    slots: Readonly<Ref<OtpSlotData[]>>;
    selection: Readonly<Ref<OtpSelection | null>>;
    composition: Readonly<Ref<string>>;
    isComposing: Readonly<Ref<boolean>>;
    isFocused: Ref<boolean>;
    effectivePattern: Readonly<Ref<RegExp | null>>;
    inputMode: Readonly<Ref<'numeric' | 'text'>>;
    filter: (text: string) => string;
    isImeText: (text: string) => boolean;
    setValue: (text: string) => string;
    insert: (text: string, range?: {
        start: number;
        end: number;
    }) => string;
    deleteRange: (start: number, end: number) => string;
    bulkDelete: (isBackward: boolean) => string;
    syncSelection: (raw: OtpSelectionInput) => OtpSelection | null;
    setSelection: (start: number | null, end: number | null, direction?: 'forward' | 'backward' | 'none') => void;
    clearSelection: () => void;
    selectAtEnd: () => OtpSelection;
    selectSlot: (index: number) => OtpSelection;
    moveCaret: (direction: -1 | 1) => OtpSelection | null;
    extendSelection: (direction: -1 | 1) => OtpSelection | null;
    startComposition: () => void;
    updateComposition: (data: string) => void;
    endComposition: () => void;
    reset: () => void;
}
export declare function useOtpInput(options: OtpInputOptions): OtpInputContext;
