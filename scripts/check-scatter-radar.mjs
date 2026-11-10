// Pure logic of the scatter plot and radar (T23/1): node scripts/check-scatter-radar.mjs
import assert from "node:assert/strict";
import { canRadar, correlationWords, linearFit, pearson, radarPoint, scatterCsv, scatterPoints } from "../lib/chart-scatter-radar.ts";

const entry = (id, x, y, title) => ({ id, values: [{ fieldId: "x", value: x }, { fieldId: "y", value: y }, { fieldId: "t", value: title }] });
const { points, skipped } = scatterPoints([entry("1", "1", "2", "A"), entry("2", "2", "4", "B"), entry("3", "3", "6.5", "C"), entry("4", "", "1", "D"), entry("5", "abc", "1", "E")], "x", "y", "t");
assert.equal(points.length, 3);
assert.equal(skipped, 2, "an empty or non-numeric value is skipped, not read as zero");
assert.deepEqual(points[0], { entryId: "1", x: 1, y: 2, label: "A" });

const line = [{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }, { x: 4, y: 9 }];
assert.equal(pearson(line), 1);
assert.deepEqual(linearFit(line), { slope: 2, intercept: 1 });
assert.equal(pearson(line.map(({ x, y }) => ({ x, y: -y }))), -1);
assert.equal(pearson(line.slice(0, 2)), null, "fewer than 3 points");
assert.equal(pearson([{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }]), null, "a flat axis has no correlation");
assert.equal(linearFit([{ x: 2, y: 1 }, { x: 2, y: 5 }]), null, "a vertical cloud has no slope");
const noisy = [{ x: 1, y: 2 }, { x: 2, y: 1 }, { x: 3, y: 4 }, { x: 4, y: 3 }, { x: 5, y: 6 }];
// Σdx·dy = 10, Σdx² = 10, Σdy² = 14.8, so r = 10 / √148 ≈ 0.822.
assert.ok(Math.abs(pearson(noisy) - 10 / Math.sqrt(148)) < 1e-9, "r of a known sample");

assert.match(correlationWords(0.85, "fr"), /^Lien fort : quand l’un augmente, l’autre augmente aussi\.$/);
assert.match(correlationWords(-0.5, "en"), /^Moderate link: when one rises, the other tends to fall\.$/);
assert.match(correlationWords(0.1, "fr"), /faible ou absent/);
assert.match(correlationWords(null, "en"), /Not enough/);

const top = radarPoint(0, 4, 1, 100, 100, 50);
assert.ok(Math.abs(top.x - 100) < 1e-9 && Math.abs(top.y - 50) < 1e-9, "the first axis points up");
const right = radarPoint(1, 4, 0.5, 100, 100, 50);
assert.ok(Math.abs(right.x - 125) < 1e-9 && Math.abs(right.y - 100) < 1e-9, "axes turn clockwise, at the ratio of the radius");

assert.equal(canRadar([1, 2, 3], "CATEGORY"), true);
assert.equal(canRadar([1, 2], "CATEGORY"), false, "at least 3 axes");
assert.equal(canRadar(Array(13).fill(1), "OBJECT"), false, "at most 12 axes");
assert.equal(canRadar([1, -2, 3], "CATEGORY"), false, "no negative value");
assert.equal(canRadar([0, 0, 0], "CATEGORY"), false, "something above zero");
assert.equal(canRadar([1, 2, 3], "MONTH"), false, "periods are lines, not radars");

const csv = scatterCsv([{ entryId: "1", x: 1.5, y: -2, label: "=cmd()" }], "Distance", "Calories", "fr").split("\r\n");
assert.equal(csv[0], '"Entrée","Distance","Calories"');
assert.equal(csv[1], `"'=cmd()",1.5,-2`, "a label cannot run as a formula and numbers stay numbers");
// Regression: the API sends comparisonRows: null without a compared period; the chart crashed on it.
const { alignSeries } = await import("../lib/chart-math.ts");
assert.equal(alignSeries([{ group: "A", label: "A", value: "1", count: 1, sources: [], sourcesHasMore: false }], null).length, 1);
console.log("Scatter and radar logic: all checks passed.");
