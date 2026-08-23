type GroupingOption = 'always' | 'auto' | 'min2' | boolean;
interface GroupedInputOptions {
    groupSeparator: string;
    decimalSeparator: string;
    precision: number | null;
    grouping: GroupingOption;
    locale: string;
    minusSign: string;
}
interface InputResult {
    text: string;
    cursor: number;
}
/**
 * Process a beforeinput event for plain (non-grouped) number input.
 * Returns { text, cursor } when the input needs correction, or null to let browser handle it.
 */
export declare function processPlainInput(data: string | null, value: string, selectionStart: number, selectionEnd: number, options: {
    decimalSeparator: string;
    precision: number | null;
    minusSign: string;
}): InputResult | null;
/**
 * Process a beforeinput event for grouped number input.
 * Returns { text, cursor } to apply, or null for interactions that do not need override
 */
export declare function processGroupedInput(inputType: string, data: string | null, value: string, selectionStart: number, selectionEnd: number, options: GroupedInputOptions): InputResult | null;

