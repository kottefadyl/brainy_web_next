// Date parsing and calendar arithmetic across time zones. No browser or server needed:
// node --experimental-strip-types --no-warnings scripts/visual/phase-two-b/date-logic.mjs
import assert from "node:assert/strict";
import { addDays, addMonths, formatDateText as f, formatTimeText as ft, localInputFromIso, monthWeeks, parseDateText as p, parseTimeText as t, todayLocalIso, weekBounds, weekdayLabels } from "../../../lib/date-input.ts";

const zones = ["UTC", "Pacific/Kiritimati", "Pacific/Pago_Pago", "Europe/Paris", "America/New_York"];
const offsets = new Set();
for (const zone of zones) {
  process.env.TZ = zone;
  offsets.add(new Date(2026, 0, 1).getTimezoneOffset());
  const now = new Date(2026, 10, 8, 12);
  assert.equal(p("08/11/2026", "fr"), "2026-11-08");
  assert.equal(p("08/11/2026", "en"), "2026-08-11");
  assert.equal(p("2026-11-08", "en"), "2026-11-08");
  assert.equal(p("8.11.26", "fr", false, now), "2026-11-08");
  assert.equal(p("08112026", "fr"), "2026-11-08");
  assert.equal(p("081126", "fr", false, now), "2026-11-08");
  assert.equal(p("8/11", "fr", false, now), "2026-11-08");
  assert.equal(p("8/11", "fr", true, now), null, "no year while typing");
  assert.equal(p("31/02/2026", "fr"), null);
  assert.equal(p("29/02/2024", "fr"), "2024-02-29");
  assert.equal(p("29/02/2023", "fr"), null);
  assert.equal(p("13/13/2026", "en"), null);
  assert.equal(p("abc", "fr"), null);
  assert.equal(p("1/1/85", "fr", false, now), "1985-01-01");
  assert.equal(f("2026-03-04", "fr"), "04/03/2026");
  assert.equal(f("2026-03-04", "en"), "03/04/2026");
  for (const [input, expected] of [["14:30", "14:30"], ["14h30", "14:30"], ["14h", "14:00"], ["1430", "14:30"], ["930", "09:30"], ["9", "09:00"], ["2:30 PM", "14:30"], ["12:00 am", "00:00"], ["12 pm", "12:00"], ["24:00", null], ["13:00 pm", null], ["9:75", null]]) assert.equal(t(input), expected, input);
  assert.equal(t("14", true), null, "no minutes while typing");
  assert.equal(ft("14:05", "en"), "2:05 PM");
  assert.equal(ft("00:05", "en"), "12:05 AM");
  assert.equal(ft("14:05", "fr"), "14:05");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2024-01-31", 1), "2024-02-29");
  assert.equal(addMonths("2026-12-15", 1), "2027-01-15");
  assert.equal(addMonths("2024-02-29", 12), "2025-02-28");
  // Daylight-saving changes in Europe and the United States.
  assert.equal(addDays("2026-03-29", 1), "2026-03-30");
  assert.equal(addDays("2026-10-25", 1), "2026-10-26");
  assert.equal(addDays("2026-03-08", 1), "2026-03-09");
  assert.equal(monthWeeks("2026-11-08", "fr")[0][0], "2026-10-26");
  assert.equal(monthWeeks("2026-11-08", "en")[0][0], "2026-11-01");
  assert.equal(monthWeeks("2026-11-08", "fr").flat().length, 42);
  assert.deepEqual(weekBounds("2026-11-08", "fr"), ["2026-11-02", "2026-11-08"]);
  assert.equal(weekdayLabels("fr")[0].long, "lundi");
  assert.equal(weekdayLabels("en")[0].long, "Sunday");
  // The local calendar day, never the UTC one.
  assert.equal(todayLocalIso(new Date(2026, 0, 1, 0, 30)), "2026-01-01");
  assert.equal(todayLocalIso(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
  const instant = new Date(2026, 5, 15, 14, 30);
  assert.equal(localInputFromIso(instant.toISOString()), "2026-06-15T14:30");
  assert.equal(localInputFromIso("2026-06-15T14:30"), "2026-06-15T14:30");
  assert.equal(new Date("2026-06-15T14:30").getTime(), instant.getTime(), "a local value goes back to the same instant");
}
assert(offsets.size === zones.length, "the time zones were not applied");
console.log(`PASS: date logic in ${zones.length} time zones.`);
