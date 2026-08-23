// Utilities
import { genMonotonePath } from "./monotone.js";
import { genRoundedPath } from "./path.js";
import { propsFactory } from "../../../util/index.js"; // Types
export const makeLineProps = propsFactory({
  animation: {
    type: [Boolean, Object],
    default: false
  },
  autoDraw: {
    type: [Boolean, String],
    default: false
  },
  autoDrawDuration: [Number, String],
  autoDrawEasing: {
    type: String,
    default: 'ease'
  },
  color: String,
  gradient: {
    type: Array,
    default: () => []
  },
  gradientDirection: {
    type: String,
    validator: val => ['top', 'bottom', 'left', 'right'].includes(val),
    default: 'top'
  },
  height: {
    type: [String, Number],
    default: 75
  },
  labels: {
    type: Array,
    default: () => []
  },
  labelSize: {
    type: [Number, String],
    default: 7
  },
  lineWidth: {
    type: [String, Number],
    default: 4
  },
  id: String,
  itemValue: {
    type: String,
    default: 'value'
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  min: [String, Number],
  max: [String, Number],
  padding: {
    type: [String, Number],
    default: 8
  },
  markerSize: {
    type: [Number, String],
    default: 8
  },
  markerStroke: {
    type: String,
    default: '#fff'
  },
  inset: Boolean,
  showLabels: Boolean,
  showMarkers: Boolean,
  smooth: [Boolean, String, Number],
  smoothMode: {
    type: String,
    default: 'default'
  },
  interactive: Boolean,
  tooltip: {
    type: [Boolean, Object],
    default: false
  },
  width: {
    type: [Number, String],
    default: 300
  }
}, 'Line');
export function resample(values, targetCount) {
  const length = values.length;
  if (length === 0) return Array(targetCount).fill(0);
  if (length === 1) return Array(targetCount).fill(values[0]);
  const result = [];
  for (let i = 0; i < targetCount; i++) {
    const t = i / (targetCount - 1) * (length - 1);
    const low = Math.floor(t);
    const high = Math.min(low + 1, length - 1);
    const fraction = t - low;
    result.push(values[low] + (values[high] - values[low]) * fraction);
  }
  return result;
}
export function extendPoints(points, inset, totalWidth) {
  if (!inset || points.length < 2) return points;
  const first = points[0];
  const second = points[1];
  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  const slopeStart = (second.y - first.y) / (second.x - first.x);
  const slopeEnd = (last.y - secondLast.y) / (last.x - secondLast.x);
  const ghostStart = {
    x: 0,
    y: first.y - first.x * slopeStart,
    value: first.value
  };
  const ghostEnd = {
    x: totalWidth,
    y: last.y + (totalWidth - last.x) * slopeEnd,
    value: last.value
  };
  return [ghostStart, ...points, ghostEnd];
}
export function buildPath(points, options) {
  const smoothValue = typeof options.smooth === 'boolean' ? options.smooth ? 8 : 0 : Number(options.smooth ?? 0);

  // genRoundedPath mutates via shift(); slice defensively so callers don't have to
  const copy = points.slice();
  if (options.smoothMode === 'monotone') {
    return genMonotonePath(copy, smoothValue, options.fill, options.height);
  }
  return genRoundedPath(copy, smoothValue, options.fill, options.height, options.animation);
}
//# sourceMappingURL=line.js.map