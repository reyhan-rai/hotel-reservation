/* ===================================================================
   Unit tests — pure logic (room inventory, availability, hashing)
   Run by: npm test  ->  node --test tests/
   This is the suite the CI pipeline (AWS CodeBuild / Jenkins) runs
   automatically on every commit, before anything is ever deployed.
=================================================================== */
const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

// app.js expects a browser-like `document`/`window` to exist before it
// runs (it registers a DOMContentLoaded listener at load time). A bare
// jsdom document is enough — we don't need the real page markup for
// these pure-logic tests.
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;

const {
  ROOMS, nightsBetween, availableRooms, currency,
  COUNTRIES, countryByCode, isAllowedEmail, toAureliaEmail, normalisePhone, validatePhone, money
} = require("../js/app.js");

test("room inventory totals exactly 20 rooms", () => {
  const total = ROOMS.reduce((sum, r) => sum + r.qty, 0);
  assert.equal(total, 20);
});

test("nightsBetween calculates whole nights correctly", () => {
  assert.equal(nightsBetween("2026-10-10", "2026-10-12"), 2);
  assert.equal(nightsBetween("2026-10-10", "2026-10-10"), 0);
  assert.equal(nightsBetween("2026-10-12", "2026-10-10"), 0); // checkout before checkin -> invalid, treated as 0
});

test("currency formats pounds with thousands separators", () => {
  assert.equal(currency(89), "£89");
  assert.equal(currency(1250), "£1,250");
});

test("availability starts at full room count with no existing bookings", () => {
  localStorage.clear();
  const avail = availableRooms("standard", "2026-11-01", "2026-11-03");
  assert.equal(avail, 6);
});

test("availability decreases by one for each overlapping booking", () => {
  localStorage.clear();
  const bookings = [
    { id: "bk_1", room: "standard", checkin: "2026-11-01", checkout: "2026-11-03" },
    { id: "bk_2", room: "standard", checkin: "2026-11-01", checkout: "2026-11-03" },
    { id: "bk_3", room: "standard", checkin: "2026-11-01", checkout: "2026-11-03" }
  ];
  localStorage.setItem("aureliaBookings", JSON.stringify(bookings));

  const avail = availableRooms("standard", "2026-11-01", "2026-11-03");
  assert.equal(avail, 3, "6 total minus 3 overlapping bookings should leave 3");
});

test("a room type cannot go below zero available once fully booked", () => {
  localStorage.clear();
  // Executive has only 4 rooms — book all 4 for the same dates.
  const bookings = Array.from({ length: 4 }, (_, i) => ({
    id: `bk_ex_${i}`,
    room: "executive",
    checkin: "2026-12-24",
    checkout: "2026-12-26"
  }));
  localStorage.setItem("aureliaBookings", JSON.stringify(bookings));

  assert.equal(availableRooms("executive", "2026-12-24", "2026-12-26"), 0);
});

test("bookings on non-overlapping dates do not reduce availability", () => {
  localStorage.clear();
  const bookings = [
    { id: "bk_1", room: "suite", checkin: "2026-11-01", checkout: "2026-11-03" }
  ];
  localStorage.setItem("aureliaBookings", JSON.stringify(bookings));

  // A completely different date range should be unaffected.
  const avail = availableRooms("suite", "2026-12-01", "2026-12-03");
  assert.equal(avail, 5);
});

test("partially overlapping date ranges still count as a conflict", () => {
  localStorage.clear();
  const bookings = [
    { id: "bk_1", room: "deluxe", checkin: "2026-11-05", checkout: "2026-11-10" }
  ];
  localStorage.setItem("aureliaBookings", JSON.stringify(bookings));

  // New stay overlaps the tail end of the existing one (Nov 8-9 inside Nov 5-10).
  const avail = availableRooms("deluxe", "2026-11-08", "2026-11-12");
  assert.equal(avail, 4, "5 total minus 1 overlapping booking should leave 4");
});

test("cancelling a booking (removing it from storage) restores its room", () => {
  localStorage.clear();
  const bookings = [
    { id: "bk_1", room: "standard", checkin: "2026-11-01", checkout: "2026-11-03" }
  ];
  localStorage.setItem("aureliaBookings", JSON.stringify(bookings));
  assert.equal(availableRooms("standard", "2026-11-01", "2026-11-03"), 5);

  // Regression test: an earlier version of the cancel handler cleared its
  // tracked booking ID before the delayed delete ran, so the booking was
  // never actually removed from storage. Guard against that regressing.
  localStorage.setItem("aureliaBookings", JSON.stringify([]));
  assert.equal(availableRooms("standard", "2026-11-01", "2026-11-03"), 6);
});

test("editing a booking excludes itself from its own availability count", () => {
  localStorage.clear();
  const bookings = [
    { id: "bk_1", room: "standard", checkin: "2026-11-01", checkout: "2026-11-03" }
  ];
  localStorage.setItem("aureliaBookings", JSON.stringify(bookings));

  // Without excluding its own id, editing a booking's own dates would
  // wrongly see itself as "already booked" and block the save.
  const availIncludingSelf = availableRooms("standard", "2026-11-01", "2026-11-03");
  const availExcludingSelf = availableRooms("standard", "2026-11-01", "2026-11-03", "bk_1");
  assert.equal(availIncludingSelf, 5);
  assert.equal(availExcludingSelf, 6);
});

/* ------------------------------------------------------------------
   Email domain rule
------------------------------------------------------------------ */
test("only @aurelie.com email addresses are accepted", () => {
  assert.equal(isAllowedEmail("ada@aurelie.com"), true);
  assert.equal(isAllowedEmail("ADA@AURELIE.COM"), true, "the check is case-insensitive");
  assert.equal(isAllowedEmail(" ada@aurelie.com "), true, "surrounding spaces are trimmed");
  assert.equal(isAllowedEmail("ada@gmail.com"), false);
  assert.equal(isAllowedEmail("ada@aurelie.com.co"), false, "look-alike domains are rejected");
  assert.equal(isAllowedEmail("ada@mail.aurelie.com"), false, "subdomains are rejected");
  assert.equal(isAllowedEmail("@aurelie.com"), false);
  assert.equal(isAllowedEmail(""), false);
});

/* ------------------------------------------------------------------
   Phone validation — UK / India / Pakistan
------------------------------------------------------------------ */
test("the three supported dialling codes are configured", () => {
  assert.deepEqual(COUNTRIES.map((c) => c.dial), ["+44", "+91", "+92"]);
  assert.deepEqual(COUNTRIES.map((c) => c.currency), ["GBP", "INR", "PKR"]);
});

test("normalisePhone strips formatting, dial codes and leading zeros", () => {
  const gb = countryByCode("GB");
  assert.equal(normalisePhone("07700 900123", gb), "7700900123");
  assert.equal(normalisePhone("+44 (7700) 900-123", gb), "7700900123");
  assert.equal(normalisePhone("00447700900123", gb), "7700900123");
});

test("UK numbers must be 10 digits after +44", () => {
  const gb = countryByCode("GB");
  assert.equal(validatePhone("07700 900123", gb).value, "+44 7700900123");
  assert.equal(validatePhone("7700900", gb).ok, false, "too short");
  assert.equal(validatePhone("", gb).ok, false, "empty");
});

test("Indian numbers must be 10 digits starting 6-9", () => {
  const india = countryByCode("IN");
  assert.equal(validatePhone("98765 43210", india).value, "+91 9876543210");
  assert.equal(validatePhone("+91 7012345678", india).ok, true);
  assert.equal(validatePhone("12345 67890", india).ok, false, "must not start with 1");
  assert.equal(validatePhone("987654321", india).ok, false, "9 digits is too short");
});

test("Pakistani mobile numbers must be 10 digits starting with 3", () => {
  const pk = countryByCode("PK");
  assert.equal(validatePhone("0301 2345678", pk).value, "+92 3012345678");
  assert.equal(validatePhone("+92 3452345678", pk).ok, true);
  assert.equal(validatePhone("0201 2345678", pk).ok, false, "must not start with 2");
});

test("a number valid in one country is rejected in another", () => {
  assert.equal(validatePhone("020 7946 0000", countryByCode("IN")).ok, false, "a UK landline is not a valid Indian mobile");
  assert.equal(validatePhone("3012345678", countryByCode("GB")).ok, true, "GB accepts any 10 digits");
  assert.equal(validatePhone("9876543210", countryByCode("PK")).ok, false);
});

/* ------------------------------------------------------------------
   Currency conversion — GBP is the stored base, the rest is display
------------------------------------------------------------------ */
test("prices convert from the GBP base into each local currency", () => {
  assert.equal(money(89, countryByCode("GB")), "£89");
  assert.equal(money(89, countryByCode("IN")), "₹9,968");
  assert.equal(money(89, countryByCode("PK")), "₨31,595");
});

test("converting never changes the stored GBP rate itself", () => {
  const standard = ROOMS.find((r) => r.id === "standard");
  money(standard.price, countryByCode("PK"));
  assert.equal(standard.price, 89, "room rates stay in GBP no matter what is displayed");
  assert.equal(currency(standard.price), "£89");
});

test("any email is converted to the same name on @aurelie.com", () => {
  assert.equal(toAureliaEmail("jane.doe@gmail.com"), "jane.doe@aurelie.com");
  assert.equal(toAureliaEmail("  Jane.Doe@Yahoo.CO.UK "), "jane.doe@aurelie.com");
  assert.equal(toAureliaEmail("ada@aurelie.com"), "ada@aurelie.com", "already ours stays unchanged");
  assert.equal(toAureliaEmail("first+tag@outlook.com"), "first+tag@aurelie.com");
  assert.equal(toAureliaEmail("not-an-email"), null);
  assert.equal(toAureliaEmail("a@b"), null);
  assert.equal(toAureliaEmail(""), null);
});
