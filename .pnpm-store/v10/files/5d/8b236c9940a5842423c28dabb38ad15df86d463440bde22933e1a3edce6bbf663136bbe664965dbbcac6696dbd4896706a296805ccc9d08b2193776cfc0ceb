export interface ColorScaleStop {
    min: number;
    color: string;
}
export type ColorMixSpace = 'srgb' | 'srgb-linear' | 'hsl' | 'hwb' | 'lab' | 'lch' | 'oklab' | 'oklch';
export type HueInterpolation = 'shorter' | 'longer';
export interface LinearColorScale {
    from: ColorScaleStop;
    to: ColorScaleStop;
    colorSpace?: ColorMixSpace;
    hueInterpolation?: HueInterpolation;
}
export type ColorScale = ColorScaleStop[] | LinearColorScale;
export declare function isLinearColorScale(scale: ColorScale | undefined): scale is LinearColorScale;
export declare function getInterpolationMethod(scale: LinearColorScale): string;
export declare function getColorFromScale(value: number, scale: ColorScale): string | undefined;
