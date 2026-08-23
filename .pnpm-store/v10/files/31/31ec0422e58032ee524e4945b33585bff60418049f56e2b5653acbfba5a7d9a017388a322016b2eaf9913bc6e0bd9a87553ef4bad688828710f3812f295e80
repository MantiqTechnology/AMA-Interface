// Utilities
import { clamp } from "../../util/index.js"; // `increasing` / `decreasing` intentionally omitted
// linear-gradient disagrees with the color-mix
export function isLinearColorScale(scale) {
  return !!scale && !Array.isArray(scale) && 'from' in scale && 'to' in scale;
}
export function getInterpolationMethod(scale) {
  const space = scale.colorSpace ?? 'srgb';
  const hue = scale.hueInterpolation && 'hsl|hwb|lch|oklch'.includes(space) ? ` ${scale.hueInterpolation} hue` : '';
  return `in ${space}${hue}`;
}
export function getColorFromScale(value, scale) {
  if (isLinearColorScale(scale)) {
    const {
      from,
      to
    } = scale;
    const span = to.min - from.min;
    if (span === 0) {
      return value >= to.min ? to.color : from.color;
    }
    const percent = Number(clamp((value - from.min) / span).toFixed(2)) * 100;
    if (percent <= 0) return from.color;
    if (percent >= 100) return to.color;
    return `color-mix(${getInterpolationMethod(scale)}, ${to.color} ${percent}%, ${from.color})`;
  }
  return scale.findLast(({
    min
  }) => value >= min)?.color;
}
//# sourceMappingURL=colorScale.js.map