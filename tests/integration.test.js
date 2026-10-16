/* ===================================================================
   Integration tests — full page, real clicks/submits via jsdom.
   These exercise the actual HTML + CSS + JS together, the same way a
   person clicking through the site would, and specifically guard
   against three real bugs found during development:
     1. Cancelling a booking didn't actually remove it (stale closure).
     2. [hidden] elements stayed visible (CSS specificity clash).
     3. Form fields were missing autocomplete attributes.
=================================================================== */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const js = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "css/style.css"), "utf8");

function boot() {
  const dom = new JSDOM(html, { runScripts: "outside-only", resources: "usable", url: "http://localhost/" });
  const { window } = dom;
  // jsdom has no layout engine or IntersectionObserver; these are only
  // used for cosmetic scroll animations, so harmless no-op stubs are fine.
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.HTMLElement.prototype.scrollIntoView = () => {};
  dom.window.eval(js);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
  return dom;
}

function fire(el, type) {
  el.ownerDocument.defaultView.dispatchEvent
    ? el.dispatchEvent(new el.ownerDocument.defaultView.Event(type, { bubbles: true }))
    : el.dispatchEvent(new Event(type, { bubbles: true }));
}

function signUp(d, { name, email, password, country, phone }) {
  d.getElementById("signInBtn").click();
  d.getElementById("goToCreate").click();
  d.getElementById("cr-name").value = name;
  d.getElementById("cr-email").value = email;
  d.getElementById("cr-password").value = password;
  d.getElementById("cr-password2").value = password;
  d.getElementById("cr-country").value = country || "GB";
  fire(d.getElementById("cr-country"), "change");
  d.getElementById("cr-phone").value = phone || "07700900123";
  fire(d.getElementById("createForm"), "submit");
}

function fillAndSubmitBooking(d, { room, checkin, checkout, guests }) {
  d.getElementById("b-room").value = room;
  fire(d.getElementById("b-room"), "change");
  d.getElementById("b-checkin").value = checkin;
  fire(d.getElementById("b-checkin"), "change");
  d.getElementById("b-checkout").value = checkout;
  fire(d.getElementById("b-checkout"), "change");
  d.getElementById("b-guests").value = String(guests || 2);
  fire(d.getElementById("bookingForm"), "submit");
}

test("signed-out visitor sees the sign-in gate, not the booking form", () => {
  const dom = boot();
  const d = dom.window.document;
  assert.equal(d.getElementById("bookGate").hidden, false);
  assert.equal(d.getElementById("bookingForm").hidden, true);
});

test("creating an account signs the guest in and reveals the booking form", () => {
  const dom = boot();
  const d = dom.window.document;
  signUp(d, { name: "Ada Lovelace", email: "ada@aurelie.com", password: "password1" });

  assert.equal(dom.window.localStorage.getItem("aureliaSession"), "ada@aurelie.com");
  assert.equal(d.getElementById("bookGate").hidden, true);
  assert.equal(d.getElementById("bookingForm").hidden, false);
  assert.match(d.getElementById("accountArea").textContent, /Hi, Ada/);
});

test("a confirmed booking appears in My Bookings for that account only", () => {
  const dom = boot();
  const d = dom.window.document;
  signUp(d, { name: "Grace Hopper", email: "grace@aurelie.com", password: "password1" });
  fillAndSubmitBooking(d, { room: "standard", checkin: "2026-10-10", checkout: "2026-10-12" });

  const stored = JSON.parse(dom.window.localStorage.getItem("aureliaBookings"));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].accountEmail, "grace@aurelie.com");
  assert.match(d.getElementById("bookingsBody").textContent, /Grace Hopper/);
});

test("cancelling a booking actually removes it (regression: stale-id bug)", async () => {
  const dom = boot();
  const d = dom.window.document;
  signUp(d, { name: "Alan Turing", email: "alan@aurelie.com", password: "password1" });
  fillAndSubmitBooking(d, { room: "deluxe", checkin: "2026-10-10", checkout: "2026-10-12" });

  assert.equal(JSON.parse(dom.window.localStorage.getItem("aureliaBookings")).length, 1);

  d.querySelector(".delete-btn").click();
  d.getElementById("confirmYes").click();

  // the delete is deliberately delayed ~260ms for a fade-out animation
  await new Promise((resolve) => setTimeout(resolve, 400));

  const remaining = JSON.parse(dom.window.localStorage.getItem("aureliaBookings"));
  assert.equal(remaining.length, 0, "the booking should be gone from storage after confirming cancellation");
});

test("the 4th booking of a 4-room type on the same dates is rejected", () => {
  const dom = boot();
  const d = dom.window.document;
  signUp(d, { name: "Test Guest", email: "guest@aurelie.com", password: "password1" });

  for (let i = 0; i < 4; i++) {
    fillAndSubmitBooking(d, { room: "executive", checkin: "2026-12-24", checkout: "2026-12-26" });
  }
  assert.equal(JSON.parse(dom.window.localStorage.getItem("aureliaBookings")).length, 4);

  // 5th attempt for the same dates should be blocked with a visible error
  fillAndSubmitBooking(d, { room: "executive", checkin: "2026-12-24", checkout: "2026-12-26" });
  const stillFour = JSON.parse(dom.window.localStorage.getItem("aureliaBookings")).length;
  assert.equal(stillFour, 4, "a 5th Executive booking on the same dates must not be saved");
  assert.equal(d.getElementById("formError").hidden, false);
});

test("[hidden] elements are actually invisible (regression: CSS specificity bug)", () => {
  // The bug: classes like .auth-form / .booking-form / .auth-gate set
  // "display: flex", which silently beat the browser default
  // "[hidden]{display:none}" rule. Guard against that regressing by
  // asserting the override rule is present and wins for every class
  // that also sets its own "display".
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/,
    "style.css must force [hidden] elements to actually be hidden");
});

test("every text/email/tel/password/number/date form field has an autocomplete attribute", () => {
  const dom = boot();
  const d = dom.window.document;
  const fields = [...d.querySelectorAll("input, select, textarea")];
  const missing = fields
    .filter((el) => el.tagName !== "INPUT" || !["hidden", "submit", "button"].includes(el.type))
    .filter((el) => !el.hasAttribute("autocomplete"))
    .map((el) => el.id || el.name || el.outerHTML.slice(0, 40));

  assert.deepEqual(missing, [], `these fields are missing autocomplete: ${missing.join(", ")}`);
});

/* ===================================================================
   New feature coverage: @aurelie.com sign-up rule, per-country phone
   validation, local-currency pricing and the 360° room tour.
=================================================================== */

test("any email (gmail etc.) is accepted at sign-up and converted to @aurelie.com", () => {
  const dom = boot();
  const d = dom.window.document;
  signUp(d, { name: "Sana Khan", email: "Sana.Khan@Gmail.com", password: "password1" });

  assert.equal(dom.window.localStorage.getItem("aureliaSession"), "sana.khan@aurelie.com");
  const user = JSON.parse(dom.window.localStorage.getItem("aureliaUsers"))[0];
  assert.equal(user.email, "sana.khan@aurelie.com");
  assert.match(d.getElementById("accountArea").innerHTML, /sana\.khan@aurelie\.com/);
});

test("the sign-up form previews the converted email while typing", () => {
  const dom = boot();
  const d = dom.window.document;
  d.getElementById("cr-email").value = "jane.doe@yahoo.com";
  fire(d.getElementById("cr-email"), "input");
  assert.match(d.getElementById("crEmailPreview").textContent, /jane\.doe@aurelie\.com/);
});

test("signing in works with the original email or the @aurelie.com one", () => {
  const dom = boot();
  const d = dom.window.document;
  signUp(d, { name: "Sana Khan", email: "sana@gmail.com", password: "password1" });
  d.getElementById("signOutBtn").click();

  [ "sana@gmail.com", "sana@aurelie.com" ].forEach((typed) => {
    d.getElementById("signInBtn").click();
    d.getElementById("si-email").value = typed;
    d.getElementById("si-password").value = "password1";
    fire(d.getElementById("signInForm"), "submit");
    assert.equal(dom.window.localStorage.getItem("aureliaSession"), "sana@aurelie.com", `${typed} signs in`);
    d.getElementById("signOutBtn").click();
  });
});

test("two different mail providers with the same name cannot both register", () => {
  const dom = boot();
  const d = dom.window.document;
  signUp(d, { name: "Sana One", email: "sana@gmail.com", password: "password1" });
  d.getElementById("signOutBtn").click();
  signUp(d, { name: "Sana Two", email: "sana@yahoo.com", password: "password1" });
  assert.equal(JSON.parse(dom.window.localStorage.getItem("aureliaUsers")).length, 1);
  assert.equal(d.getElementById("createError").hidden, false);
});

test("the booking form has no email or phone fields", () => {
  const dom = boot();
  const d = dom.window.document;
  assert.equal(d.getElementById("b-email"), null);
  assert.equal(d.getElementById("b-phone"), null);
  assert.equal(d.getElementById("b-country"), null);
});

test("a booking always uses the registered email and phone", () => {
  const dom = boot();
  const d = dom.window.document;
  signUp(d, { name: "Asha Rao", email: "asha@outlook.com", password: "password1", country: "IN", phone: "98765 43210" });

  assert.match(d.getElementById("bookContact").textContent, /asha@aurelie\.com/);
  assert.match(d.getElementById("bookContact").textContent, /\+91 9876543210/);

  fillAndSubmitBooking(d, { room: "standard", checkin: "2026-10-10", checkout: "2026-10-12" });
  const stored = JSON.parse(dom.window.localStorage.getItem("aureliaBookings"));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].email, "asha@aurelie.com");
  assert.equal(stored[0].phone, "+91 9876543210");
  assert.equal(stored[0].country, "IN");
});

/* ===================================================================
   Sign-up phone (IND / PAK / UK), currency by country, page routing
=================================================================== */

test("sign-up rejects a phone number that is the wrong length for the country", () => {
  const dom = boot();
  const d = dom.window.document;
  signUp(d, { name: "Ali Raza", email: "ali@aurelie.com", password: "password1", country: "PK", phone: "0301 23456" });

  assert.equal(dom.window.localStorage.getItem("aureliaSession"), null, "no account for a 7-digit Pakistani number");
  assert.equal(d.getElementById("createError").hidden, false);
  assert.match(d.getElementById("createError").textContent, /Pakistan/);
});

test("sign-up rejects an Indian number that does not start with 6-9", () => {
  const dom = boot();
  const d = dom.window.document;
  signUp(d, { name: "Asha Rao", email: "asha@aurelie.com", password: "password1", country: "IN", phone: "12345 67890" });
  assert.equal(dom.window.localStorage.getItem("aureliaSession"), null);
});

test("a valid Pakistani sign-up stores +92, switches prices to rupees and shows it as the booking contact", () => {
  const dom = boot();
  const d = dom.window.document;
  signUp(d, { name: "Ali Raza", email: "ali@aurelie.com", password: "password1", country: "PK", phone: "0301 2345678" });

  const user = JSON.parse(dom.window.localStorage.getItem("aureliaUsers"))[0];
  assert.equal(user.phone, "+92 3012345678");
  assert.equal(user.country, "PK");
  assert.match(d.querySelector(".room-price").textContent, /₨/, "currency follows the sign-up country");
  assert.match(d.getElementById("bookContact").textContent, /\+92 3012345678/);
});

test("a valid Indian sign-up shows rupees (INR) and a valid UK one shows pounds", () => {
  let dom = boot();
  signUp(dom.window.document, { name: "Asha Rao", email: "asha@aurelie.com", password: "password1", country: "IN", phone: "98765 43210" });
  assert.match(dom.window.document.querySelector(".room-price").textContent, /₹/);

  dom = boot();
  signUp(dom.window.document, { name: "Tom Hill", email: "tom@aurelie.com", password: "password1", country: "GB", phone: "07700 900123" });
  assert.match(dom.window.document.querySelector(".room-price").textContent, /£/);
});


/* ===================================================================
   Round 3: untouched home, amenity details, room pages with 360
=================================================================== */

test("Home keeps every original section and has no currency picker or extra card buttons", () => {
  const dom = boot();
  const d = dom.window.document;
  ["home", "rooms", "book", "bookings"].forEach((id) =>
    assert.equal(d.getElementById(id).hidden, false, `${id} is visible on Home`)
  );
  assert.equal(d.getElementById("countrySelect"), null, "no currency converter on the page");
  d.querySelectorAll(".room-card").forEach((card) => {
    assert.equal(card.querySelectorAll(".room-body .btn").length, 1, "each card has only its one Book button");
  });
});

test("every amenity opens its own details and closes again", () => {
  const dom = boot();
  const d = dom.window.document;
  const overlay = d.getElementById("amenityOverlay");
  const expected = {
    wifi: /WiFi/i, breakfast: /breakfast/i, spa: /spa/i, desk: /front desk/i, cancel: /cancel/i
  };
  const seen = new Set();
  Object.entries(expected).forEach(([key, re]) => {
    d.querySelector(`.amenity[data-amenity="${key}"]`).click();
    assert.ok(overlay.classList.contains("open"), `${key} opens`);
    assert.match(d.getElementById("amenityTitle").textContent, re);
    assert.ok(d.querySelectorAll("#amenityList li").length >= 4, "shows a list of details");
    seen.add(d.getElementById("amenityTitle").textContent);
    d.getElementById("amenityClose").click();
    assert.equal(overlay.classList.contains("open"), false);
  });
  assert.equal(seen.size, 5, "each amenity shows different details");
});

test("clicking a room opens its page; menu items then switch pages", () => {
  const dom = boot();
  const d = dom.window.document;

  d.querySelector('.room-card .open-room[data-room="deluxe"]').click();
  assert.equal(d.getElementById("roomDetail").hidden, false);
  assert.equal(d.getElementById("home").hidden, true);
  assert.match(d.getElementById("roomDetailBody").textContent, /Deluxe Room/);
  assert.match(d.getElementById("roomDetailBody").textContent, /Private balcony/);

  d.querySelector('.main-nav a[data-nav="rooms"]').click();
  assert.equal(d.getElementById("rooms").hidden, false);
  assert.equal(d.getElementById("roomDetail").hidden, true);

  d.querySelector('.main-nav a[data-nav="book"]').click();
  assert.equal(d.getElementById("book").hidden, false);
  assert.equal(d.getElementById("rooms").hidden, true);

  d.querySelector('.main-nav a[data-nav="home"]').click();
  assert.equal(d.getElementById("rooms").hidden, false, "Home shows everything again");
});

test("each room page mounts its own 360 view, and Book from there preselects the room", () => {
  const dom = boot();
  const d = dom.window.document;
  const seen = new Set();
  ["standard", "deluxe", "suite", "executive"].forEach((id) => {
    d.querySelector(`.room-card .open-room[data-room="${id}"]`).click();
    const bg = d.getElementById("panoImg").style.backgroundImage;
    assert.match(bg, /^url\("data:image\/svg\+xml/);
    seen.add(bg);
    d.querySelector('.main-nav a[data-nav="home"]').click();
  });
  assert.equal(seen.size, 4, "four distinct panoramas");

  d.querySelector('.room-card .open-room[data-room="suite"]').click();
  d.querySelector("#roomDetailBody .choose-room").click();
  assert.equal(d.getElementById("book").hidden, false);
  assert.equal(d.getElementById("b-room").value, "suite");
});

test("the header shows the Aurelia logo emblem and wordmark", () => {
  const dom = boot();
  const d = dom.window.document;
  assert.ok(d.querySelector(".site-header .logo .logo-mark"));
  assert.match(d.querySelector(".site-header .logo-text").textContent, /Aurelia/);
});

test("every room ships its photos, 360 panorama and video tour", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.join(__dirname, "..");
  ["standard", "deluxe", "suite", "executive"].forEach((id) => {
    ["images/rooms/%s.jpg", "images/rooms/%s-2.jpg", "images/rooms/%s-3.jpg", "images/360/%s.jpg", "videos/360/%s.mp4", "videos/360/%s.webm"].forEach((tpl) => {
      const f = path.join(root, tpl.replace("%s", id));
      assert.ok(fs.existsSync(f) && fs.statSync(f).size > 20000, `${tpl.replace("%s", id)} exists`);
    });
  });
});
