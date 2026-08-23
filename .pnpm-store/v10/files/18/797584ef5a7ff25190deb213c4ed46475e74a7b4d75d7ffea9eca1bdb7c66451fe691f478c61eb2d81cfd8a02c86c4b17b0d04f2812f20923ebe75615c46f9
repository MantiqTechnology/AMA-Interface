import type { Point } from './line.js';
/**
 * Monotone cubic Hermite interpolation (Fritsch-Carlson) converted to cubic Bezier.
 * Prevents overshoot at local extrema (e.g. consecutive equal min/max values)
 * by zeroing tangents at turning points and applying an alpha-beta constraint.
 *
 * `smooth` controls tension: 0 = straight lines, 8 (default true) = full curve.
 */
export declare function genMonotonePath(points: Point[], smooth: number, fill?: boolean, height?: number): string;
