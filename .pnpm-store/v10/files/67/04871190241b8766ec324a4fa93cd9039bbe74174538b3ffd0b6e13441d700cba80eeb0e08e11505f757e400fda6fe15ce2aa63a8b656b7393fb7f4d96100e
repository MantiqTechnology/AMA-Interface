import type { InjectionKey, Ref } from 'vue';
import type { OtpSlotData } from './useOtpInput.js';
export interface VOtpInputContext {
    otpSlots: Readonly<Ref<OtpSlotData[]>>;
    isFocused: Ref<boolean>;
    focusAll: Ref<boolean>;
    divider: Ref<string | undefined>;
    merged: Ref<boolean>;
    focusAt: (index: number) => void;
}
export declare const VOtpInputSymbol: InjectionKey<VOtpInputContext>;
