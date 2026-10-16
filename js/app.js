/* ===================================================================
   AURELIA — app.js
   Room data, dynamic rendering, and full CRUD booking management
   Data storage: browser localStorage (stands in for the database /
   AWS-hosted backend that the DevOps pipeline will later deploy).
=================================================================== */
(() => {
  "use strict";

  const STORAGE_KEY = "aureliaBookings";

  /* ----------------------------------------------------------------
     Room catalogue
  ---------------------------------------------------------------- */
  const ROOMS = [
    {
      id: "standard",
      photos: ["images/rooms/standard.jpg", "images/rooms/standard-2.jpg", "images/rooms/standard-3.jpg"],
      pano: "images/360/standard.jpg",
      video: "videos/360/standard.mp4",
      sleeps: "2 guests",
      view: "Courtyard view",
      amenities: ["Queen bed with premium linen", "Rain shower", "Smart TV", "Work desk", "Tea & coffee station", "Breakfast included"],
      name: "Standard Room",
      price: 89,
      qty: 6,
      desc: "Bright and comfortable, perfect for a solo traveller or a short stay.",
      features: ["1 Queen Bed", "Free WiFi", "24 m²"],
      visualClass: "visual-standard",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18h18"/><path d="M5 10V7a2 2 0 0 1 2-2h3v5"/></svg>`
    },
    {
      id: "deluxe",
      photos: ["images/rooms/deluxe.jpg", "images/rooms/deluxe-2.jpg", "images/rooms/deluxe-3.jpg"],
      pano: "images/360/deluxe.jpg",
      video: "videos/360/deluxe.mp4",
      sleeps: "2 guests",
      view: "Garden balcony",
      amenities: ["King bed with premium linen", "Private balcony", "Rain shower & bathtub", "Smart TV", "Mini bar", "Breakfast included"],
      name: "Deluxe Room",
      price: 139,
      qty: 5,
      desc: "Extra space with a private balcony overlooking the courtyard garden.",
      features: ["1 King Bed", "Balcony", "32 m²"],
      visualClass: "visual-deluxe",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18h18"/><path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/></svg>`
    },
    {
      id: "suite",
      photos: ["images/rooms/suite.jpg", "images/rooms/suite-2.jpg", "images/rooms/suite-3.jpg"],
      pano: "images/360/suite.jpg",
      video: "videos/360/suite.mp4",
      sleeps: "3 guests",
      view: "Garden view",
      amenities: ["King bed + sofa bed", "Separate living area", "Bathtub & rain shower", "Smart TV", "Nespresso machine", "Breakfast included"],
      name: "Garden Suite",
      price: 219,
      qty: 5,
      desc: "A separate living area with garden views — ideal for longer stays.",
      features: ["1 King Bed + Sofa", "Living area", "48 m²"],
      visualClass: "visual-suite",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="9" rx="1.5"/><path d="M3 13h18"/><path d="M7 9V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg>`
    },
    {
      id: "executive",
      photos: ["images/rooms/executive.jpg", "images/rooms/executive-2.jpg", "images/rooms/executive-3.jpg"],
      pano: "images/360/executive.jpg",
      video: "videos/360/executive.mp4",
      sleeps: "4 guests",
      view: "Skyline view",
      amenities: ["King bed with premium linen", "Freestanding soaking tub", "Lounge & dining area", "Smart TV", "Mini bar & espresso bar", "Breakfast included"],
      name: "Executive Suite",
      price: 329,
      qty: 4,
      desc: "Our most spacious room, with a soaking tub and skyline views.",
      features: ["1 King Bed", "Soaking Tub", "65 m²"],
      visualClass: "visual-executive",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3Z"/><path d="M5 12V7a2 2 0 0 1 4 0"/><path d="M2 12v2M22 12v2"/></svg>`
    }
  ];

  const roomById = (id) => ROOMS.find((r) => r.id === id);
  const currency = (n) => `£${n.toLocaleString("en-GB")}`;
  const todayISO = () => new Date().toISOString().split("T")[0];

  /* ----------------------------------------------------------------
     Countries — dialling-code validation + local currency display
     Aurelia takes bookings from three markets. Each entry drives BOTH
     the phone-number rules for that country AND the currency every
     price on the page is shown in. Room rates are stored once, in GBP
     (the hotel's base currency); everything else is converted for
     display only, so no stored booking total ever changes meaning.
     Rates are fixed demo values — a live site would pull these from a
     rates API at load time.
  ---------------------------------------------------------------- */
  const COUNTRIES = [
    {
      code: "GB", name: "United Kingdom", flag: "🇬🇧", dial: "+44",
      currency: "GBP", symbol: "£", rate: 1, locale: "en-GB",
      example: "7700 900123",
      rule: "10 digits after +44 (e.g. 7700 900123)",
      test: (d) => /^[1-9]\d{9}$/.test(d)
    },
    {
      code: "IN", name: "India", flag: "🇮🇳", dial: "+91",
      currency: "INR", symbol: "₹", rate: 112, locale: "en-IN",
      example: "98765 43210",
      rule: "10 digits starting with 6, 7, 8 or 9 (e.g. 98765 43210)",
      test: (d) => /^[6-9]\d{9}$/.test(d)
    },
    {
      code: "PK", name: "Pakistan", flag: "🇵🇰", dial: "+92",
      currency: "PKR", symbol: "₨", rate: 355, locale: "en-PK",
      example: "301 2345678",
      rule: "10 digits starting with 3 (e.g. 301 2345678)",
      test: (d) => /^3\d{9}$/.test(d)
    }
  ];

  const COUNTRY_KEY = "aureliaCountry";
  const countryByCode = (code) => COUNTRIES.find((c) => c.code === code);

  function storedCountryCode() {
    try {
      return localStorage.getItem(COUNTRY_KEY);
    } catch {
      return null; // non-browser context (e.g. the CI test runner)
    }
  }

  let activeCountry = countryByCode(storedCountryCode()) || COUNTRIES[0];

  /* Base GBP amount -> the active country's currency, formatted. */
  function money(gbpAmount, country) {
    const c = country || activeCountry;
    const value = Math.round(gbpAmount * c.rate);
    return `${c.symbol}${value.toLocaleString(c.locale)}`;
  }

  /* Shown under a converted price so the guest can always see the
     original rate the hotel charges in. Empty when already in GBP. */
  function baseNote(gbpAmount) {
    return activeCountry.rate === 1 ? "" : `≈ ${currency(gbpAmount)}`;
  }

  function setCountry(code) {
    const c = countryByCode(code);
    if (!c) return;
    activeCountry = c;
    try { localStorage.setItem(COUNTRY_KEY, c.code); } catch { /* storage unavailable */ }


    // Sign-up form: same country, same rules, and the currency it will use.
    const crSel = document.getElementById("cr-country");
    if (crSel && crSel.value !== c.code) crSel.value = c.code;
    const crPhone = document.getElementById("cr-phone");
    if (crPhone) crPhone.placeholder = c.example;
    const crHint = document.getElementById("crPhoneHint");
    if (crHint) crHint.textContent = `${c.dial} — ${c.rule}`;
    const crCur = document.getElementById("crCurrencyHint");
    if (crCur) crCur.textContent = `Prices will be shown in ${c.currency} (${c.symbol}) for ${c.name}.`;

    // Every price on the page is re-rendered in the new currency.
    renderRooms();
    populateRoomSelects();
    renderBookings();
    updateSummary();
  }

  function initCountrySelectors() {
    // Currency is no longer switchable from the page header: it follows the
    // country chosen at sign-up / sign-in (or the dial code in the booking form).
    const crSel = document.getElementById("cr-country");
    crSel.innerHTML = COUNTRIES.map(
      (c) => `<option value="${c.code}">${c.flag} ${c.code === "GB" ? "UK" : c.code === "IN" ? "IND" : "PAK"} ${c.dial}</option>`
    ).join("");
    crSel.value = activeCountry.code;

    crSel.addEventListener("change", () => setCountry(crSel.value));

    setCountry(activeCountry.code);
  }

  /* ----------------------------------------------------------------
     Email rule — guests may type any email (Gmail, Yahoo, Outlook...).
     The site turns it into their Aurelia address: same name before the @,
     domain replaced with aurelie.com  (jane.doe@gmail.com -> jane.doe@aurelie.com).
     Signing in works with either form.
  ---------------------------------------------------------------- */
  const EMAIL_DOMAIN = "aurelie.com";
  const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function toAureliaEmail(raw) {
    const email = (raw || "").trim().toLowerCase();
    if (!EMAIL_SHAPE.test(email)) return null;
    return `${email.slice(0, email.lastIndexOf("@"))}@${EMAIL_DOMAIN}`;
  }
  function isAllowedEmail(email) {          // true only for an address already on our domain
    const e = (email || "").trim().toLowerCase();
    return EMAIL_SHAPE.test(e) && e.endsWith(`@${EMAIL_DOMAIN}`);
  }
  const EMAIL_ERROR = "Please enter a valid email address (for example name@gmail.com).";

  /* ----------------------------------------------------------------
     Phone rule — validated against the selected country's format.
     Accepts the number however the guest types it: with or without
     the dial code, a leading 0, spaces, dashes or brackets.
  ---------------------------------------------------------------- */
  function normalisePhone(raw, country) {
    let digits = String(raw || "").replace(/\D/g, "");
    const dialDigits = country.dial.replace("+", "");
    if (digits.startsWith("00" + dialDigits)) digits = digits.slice(2 + dialDigits.length);
    else if (digits.startsWith(dialDigits) && digits.length > 10) digits = digits.slice(dialDigits.length);
    while (digits.startsWith("0")) digits = digits.slice(1);
    return digits;
  }

  function validatePhone(raw, country) {
    const digits = normalisePhone(raw, country);
    if (!digits) return { ok: false, message: "Please enter a phone number." };
    if (!country.test(digits)) {
      return {
        ok: false,
        message: `That isn't a valid ${country.name} number. ${country.rule}`
      };
    }
    return { ok: true, value: `${country.dial} ${digits}`, digits };
  }

  function nightsBetween(checkin, checkout) {
    const a = new Date(checkin);
    const b = new Date(checkout);
    const diff = Math.round((b - a) / 86400000);
    return diff > 0 ? diff : 0;
  }

  /* ----------------------------------------------------------------
     Room availability — Aurelia has a fixed inventory of 20 rooms
     (6 Standard + 5 Deluxe + 5 Suite + 4 Executive). A room type is
     only bookable for a given date range while at least one physical
     room of that type is free across every guest's bookings.
  ---------------------------------------------------------------- */
  function bookedCountOverlap(roomId, checkin, checkout, excludeBookingId) {
    return getBookings().filter((b) => {
      if (b.room !== roomId) return false;
      if (excludeBookingId && b.id === excludeBookingId) return false;
      // Two date ranges overlap when one starts before the other ends, both ways.
      return checkin < b.checkout && checkout > b.checkin;
    }).length;
  }

  function availableRooms(roomId, checkin, checkout, excludeBookingId) {
    const room = roomById(roomId);
    if (!room || !checkin || !checkout) return room ? room.qty : 0;
    return room.qty - bookedCountOverlap(roomId, checkin, checkout, excludeBookingId);
  }

  /* Keeps the little availability line on every room card in the "Rooms"
     section in sync with whichever dates are currently picked in the
     booking form, and refreshes automatically after every booking is
     created, edited or cancelled. Falls back to the plain hotel-wide
     total when no dates are selected yet. */
  function refreshRoomAvailabilityDisplay() {
    const checkinEl = document.getElementById("b-checkin");
    const checkoutEl = document.getElementById("b-checkout");
    const checkin = checkinEl ? checkinEl.value : "";
    const checkout = checkoutEl ? checkoutEl.value : "";
    const hasDates = checkin && checkout && nightsBetween(checkin, checkout) > 0;

    ROOMS.forEach((r) => {
      const el = document.getElementById(`qty-${r.id}`);
      if (!el) return;
      if (hasDates) {
        const avail = availableRooms(r.id, checkin, checkout);
        el.textContent = avail > 0
          ? `${avail} of ${r.qty} rooms available for your dates`
          : "Fully booked for your dates";
        el.classList.toggle("avail-low", avail <= 0);
      } else {
        el.textContent = `${r.qty} rooms hotel-wide`;
        el.classList.remove("avail-low");
      }
    });
  }

  /* ----------------------------------------------------------------
     Accounts — every guest has their own account, stored locally.
     NOTE: this is a coursework front-end demo only. Passwords are
     run through a simple non-cryptographic hash purely so they are
     not sitting in localStorage as plain text; it is NOT secure
     authentication. Once this app is deployed for real, sign-up and
     sign-in should be handled by a proper backend (e.g. AWS Cognito),
     which is out of scope for this front-end prototype.
  ---------------------------------------------------------------- */
  const USERS_KEY = "aureliaUsers";
  const SESSION_KEY = "aureliaSession";

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16);
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  }
  function saveUsers(list) {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  }
  function findUserByEmail(email) {
    const normalised = (email || "").trim().toLowerCase();
    return getUsers().find((u) => u.email === normalised);
  }
  function getSessionEmail() {
    return localStorage.getItem(SESSION_KEY);
  }
  function setSessionEmail(email) {
    localStorage.setItem(SESSION_KEY, email);
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }
  function getCurrentUser() {
    const email = getSessionEmail();
    return email ? findUserByEmail(email) : null;
  }
  function isLoggedIn() {
    return !!getCurrentUser();
  }

  /* ----------------------------------------------------------------
     Storage helpers (Create / Read / Update / Delete)
  ---------------------------------------------------------------- */
  function getBookings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }
  function saveBookings(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  function addBooking(booking) {
    const list = getBookings();
    list.push(booking);
    saveBookings(list);
  }
  function updateBooking(id, changes) {
    const list = getBookings().map((b) => (b.id === id ? { ...b, ...changes } : b));
    saveBookings(list);
  }
  function deleteBooking(id) {
    saveBookings(getBookings().filter((b) => b.id !== id));
  }

  /* ----------------------------------------------------------------
     Render: Rooms grid
  ---------------------------------------------------------------- */
  let roomsRenderedOnce = false;

  function renderRooms() {
    const grid = document.getElementById("roomsGrid");
    grid.innerHTML = ROOMS.map(
      (r) => `
      <article class="room-card">
        <button type="button" class="room-visual ${r.visualClass} open-room" data-room="${r.id}"
                aria-label="See photos, 360 view and details of the ${r.name}" title="Click for photos, 360° view and details">
          <img class="room-photo" src="${r.photos[0]}" alt="${r.name} interior" loading="lazy">
          ${r.icon}
        </button>
        <div class="room-body">
          <h3>${r.name}</h3>
          <p>${r.desc}</p>
          <p class="room-price">${money(r.price)} <span>/ night</span></p>
          <p class="room-qty" id="qty-${r.id}">${r.qty} rooms hotel-wide</p>
          <ul class="room-features">
            ${r.features.map((f) => `<li>${f}</li>`).join("")}
          </ul>
          <a href="#book" class="btn btn-forest choose-room" data-room="${r.id}">Book this room</a>
        </div>
      </article>`
    ).join("");

    const cards = grid.querySelectorAll(".room-card");

    if (roomsRenderedOnce) {
      // Re-render (e.g. after a currency change) — skip the entrance
      // animation so prices swap over instantly instead of fading in.
      cards.forEach((c) => c.classList.add("in-view"));
    } else {
      // Staggered reveal-on-scroll, once
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
              setTimeout(() => entry.target.classList.add("in-view"), i * 90);
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      cards.forEach((c) => io.observe(c));

      // Delegated once on the grid itself, so re-rendering the cards
      // never stacks duplicate listeners.
      grid.addEventListener("click", (e) => {
        const detailBtn = e.target.closest(".open-room");
        if (detailBtn) {
          navigate(`room/${detailBtn.dataset.room}`);
          return;
        }
        // "Book" is a normal #book link: pick the room, the router opens the form.
        const btn = e.target.closest(".choose-room");
        if (!btn) return;
        document.getElementById("b-room").value = btn.dataset.room;
        updateSummary();
      });
      roomsRenderedOnce = true;
    }

    wirePhotos(grid);
    refreshRoomAvailabilityDisplay();
  }

  /* Real photos are optional files in images/rooms/. When one loads it
     covers the gradient + icon; when it is missing the card simply keeps
     its generated look — nothing breaks. */
  function wirePhotos(root) {
    root.querySelectorAll("img.room-photo, img.detail-photo").forEach((img) => {
      const host = img.parentElement;
      const ok = () => host.classList.add("has-photo");
      const fail = () => { img.remove(); };
      if (img.complete) {
        (img.naturalWidth > 0 ? ok : fail)();
      } else {
        img.addEventListener("load", ok, { once: true });
        img.addEventListener("error", fail, { once: true });
      }
    });
  }

  /* ----------------------------------------------------------------
     Populate room <select> elements
  ---------------------------------------------------------------- */
  function populateRoomSelects() {
    const options = ROOMS.map(
      (r) => `<option value="${r.id}">${r.name} — ${money(r.price)}/night</option>`
    ).join("");
    document.getElementById("b-room").innerHTML = options;
    document.getElementById("e-room").innerHTML = options;
  }

  /* ----------------------------------------------------------------
     Render: Bookings table
  ---------------------------------------------------------------- */
  function renderBookings() {
    const body = document.getElementById("bookingsBody");
    const table = document.getElementById("bookingsTable");
    const empty = document.getElementById("emptyState");
    const currentEmail = getSessionEmail();
    const list = getBookings()
      .filter((b) => currentEmail && b.accountEmail === currentEmail)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (list.length === 0) {
      table.style.display = "none";
      empty.style.display = "flex";
      empty.hidden = false;
      return;
    }
    table.style.display = "table";
    empty.style.display = "none";
    empty.hidden = true;

    body.innerHTML = list
      .map((b) => {
        const room = roomById(b.room);
        return `
        <tr data-id="${b.id}">
          <td><span class="guest-name">${escapeHTML(b.name)}</span><span class="guest-email">${escapeHTML(b.email)}</span></td>
          <td>${room ? room.name : b.room}</td>
          <td>${formatDate(b.checkin)}</td>
          <td>${formatDate(b.checkout)}</td>
          <td>${b.guests}</td>
          <td>${money(b.total)}</td>
          <td><span class="status-pill">${b.status}</span></td>
          <td>
            <div class="row-actions">
              <button class="icon-btn edit-btn" title="Edit booking" aria-label="Edit booking">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
              <button class="icon-btn danger delete-btn" title="Cancel booking" aria-label="Cancel booking">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
      })
      .join("");
  }

  function formatDate(iso) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ----------------------------------------------------------------
     Toast
  ---------------------------------------------------------------- */
  let toastTimer;
  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  /* ----------------------------------------------------------------
     Page router — the site answers every button.
       #home  #rooms  #book  #bookings  -> that page only
       #room/<id>                       -> that room's detail page
       #contact                         -> scrolls to the footer
     Menu (☰ on mobile) -> menu items -> the page for the item you pick.
     history.pushState is wrapped in try/catch so it also works when the
     file is opened straight from disk (file://).
  ---------------------------------------------------------------- */
  const VIEWS = ["home", "rooms", "book", "bookings"];
  let currentView = "home";

  function setActiveNav(key) {
    document.querySelectorAll("[data-nav]").forEach((a) =>
      a.classList.toggle("active", a.dataset.nav === key)
    );
  }

  function showView(view) {
    currentView = view;
    document.body.dataset.view = view;
    document.querySelectorAll("[data-view]").forEach((el) => {
      if (el === document.body) return;
      el.hidden = !el.dataset.view.split(" ").includes(view);
    });
    setActiveNav(view === "room" ? "rooms" : view);
    if (view !== "room") panoStop();
    const header = document.getElementById("siteHeader");
    if (header) header.classList.toggle("scrolled", view !== "home" || window.scrollY > 40);
    try { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } catch { /* no-op */ }
  }

  function navigate(route, { push = true } = {}) {
    route = (route || "home").replace(/^#/, "") || "home";

    if (route === "contact") {
      const footer = document.getElementById("contact");
      if (footer) footer.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // On the Home page every section is already there (exactly as the
    // original page): menu items scroll to their section.
    if (currentView === "home" && (route === "home" || ["rooms", "book", "bookings"].includes(route))) {
      const target = document.getElementById(route);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveNav(route);
      return;
    }

    if (route.startsWith("room/")) {
      const room = roomById(route.slice(5));
      if (!room) return navigate("rooms", { push });
      renderRoomDetail(room);
      showView("room");
    } else if (VIEWS.includes(route)) {
      showView(route);
      if (route === "rooms") refreshRoomAvailabilityDisplay();
    } else {
      return navigate("home", { push });
    }

    if (push) {
      try { history.pushState({ route }, "", `#${route}`); } catch { /* file:// or sandbox */ }
    }
  }

  function initRouter() {
    // Every in-page link (#rooms, #book, footer links, logo...) goes through the router.
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const route = link.getAttribute("href").slice(1);
      if (!route) return;
      e.preventDefault();
      navigate(route);
    });
    window.addEventListener("popstate", () => {
      navigate((location.hash || "#home").slice(1), { push: false });
    });
    const first = (location.hash || "#home").slice(1);
    // Landing on #room/<id> opens that room; anything else starts on Home.
    if (first.startsWith("room/")) navigate(first, { push: false });
    else showView("home");
  }

  /* ----------------------------------------------------------------
     Room detail page
  ---------------------------------------------------------------- */
  function renderRoomDetail(room) {
    const body = document.getElementById("roomDetailBody");
    body.innerHTML = `
      <a href="#rooms" class="back-link">&#8592; All rooms</a>
      <div class="detail-grid">
        <div class="detail-media">
          <div class="detail-hero ${room.visualClass}">
            <img class="detail-photo" id="detailMainPhoto" src="${room.photos[0]}" alt="${room.name} interior">
            ${room.icon}
          </div>
          <div class="detail-thumbs">
            ${room.photos.map((src, i) =>
              `<button type="button" class="thumb" data-src="${src}" aria-label="Photo ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`
            ).join("")}
          </div>
        </div>
        <div class="detail-info">
          <p class="tour-kicker">${room.view}</p>
          <h2>${room.name}</h2>
          <p class="detail-desc">${room.desc}</p>
          <p class="room-price">${money(room.price)} <span>/ night</span></p>
          <p class="room-qty" id="detailQty"></p>
          <ul class="detail-facts">
            <li><strong>Sleeps</strong>${room.sleeps}</li>
            <li><strong>Bed</strong>${room.features[0]}</li>
            <li><strong>Size</strong>${room.features[2]}</li>
            <li><strong>View</strong>${room.view}</li>
          </ul>
          <h3>What's included</h3>
          <ul class="room-features detail-amenities">
            ${room.amenities.map((a) => `<li>${a}</li>`).join("")}
          </ul>
          <a href="#book" class="btn btn-forest choose-room" data-room="${room.id}">Book this room</a>
        </div>
      </div>

      <div class="detail-360">
        <h3>Look around the ${room.name} in 360°</h3>
        <div class="detail-360-grid">
          <div>
            <div class="pano-stage" id="panoStage" tabindex="0" role="img"
                 aria-label="360 degree view of the ${room.name}. Drag, or use the left and right arrow keys, to look around.">
              <div class="pano-img" id="panoImg"></div>
              <div class="pano-vignette" aria-hidden="true"></div>
              <span class="pano-badge">360°</span>
              <span class="pano-deg" id="panoDeg">0°</span>
              <button type="button" class="pano-arrow pano-left" id="panoLeft" aria-label="Look left">&#8249;</button>
              <button type="button" class="pano-arrow pano-right" id="panoRight" aria-label="Look right">&#8250;</button>
              <p class="pano-hint" id="panoHint">Drag to look around</p>
              <div class="pano-bar" aria-hidden="true"><div class="pano-bar-fill" id="panoBarFill"></div></div>
            </div>
          </div>
          <figure class="tour-video-wrap" id="tourVideoWrap" hidden>
            <video class="tour-video" id="tourVideo" muted loop playsinline controls preload="metadata">
              <source src="${room.video}" type="video/mp4">
              <source src="${room.video.replace(/\.mp4$/, ".webm")}" type="video/webm">
            </video>
            <figcaption>360° video tour</figcaption>
          </figure>
        </div>
      </div>`;

    // availability for whichever dates are picked in the booking form
    const ci = document.getElementById("b-checkin").value;
    const co = document.getElementById("b-checkout").value;
    const qty = body.querySelector("#detailQty");
    if (ci && co && nightsBetween(ci, co) > 0) {
      const avail = availableRooms(room.id, ci, co);
      qty.textContent = avail > 0 ? `${avail} of ${room.qty} rooms available for your dates` : "Fully booked for your dates";
      qty.classList.toggle("avail-low", avail <= 0);
    } else {
      qty.textContent = `${room.qty} rooms hotel-wide`;
    }

    wirePhotos(body);
    body.querySelectorAll(".thumb img").forEach((img) => {
      img.addEventListener("error", () => img.parentElement.remove(), { once: true });
    });
    body.querySelector(".detail-thumbs").addEventListener("click", (e) => {
      const t = e.target.closest(".thumb");
      const main = body.querySelector("#detailMainPhoto");
      if (!t || !main) return;
      main.src = t.dataset.src;
      main.parentElement.classList.add("has-photo");
    });
    body.querySelector(".choose-room").addEventListener("click", () => {
      document.getElementById("b-room").value = room.id;
      updateSummary();
    });

    // The video block only appears when the file exists.
    const video = body.querySelector("#tourVideo");
    video.addEventListener("loadeddata", () => {
      body.querySelector("#tourVideoWrap").hidden = false;
      const play = video.play && video.play();
      if (play && play.catch) play.catch(() => {});
    }, { once: true });

    mountPano(room);
  }

  /* ----------------------------------------------------------------
     Header: solid-on-scroll + mobile nav
  ---------------------------------------------------------------- */
  function initHeader() {
    const header = document.getElementById("siteHeader");
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");

    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40 || currentView !== "home");
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ----------------------------------------------------------------
     Hero search widget -> jumps to Rooms
  ---------------------------------------------------------------- */
  function initSearchWidget() {
    const form = document.getElementById("searchForm");
    const checkin = document.getElementById("s-checkin");
    const checkout = document.getElementById("s-checkout");
    checkin.min = todayISO();
    checkout.min = todayISO();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (checkin.value) document.getElementById("b-checkin").value = checkin.value;
      if (checkout.value) document.getElementById("b-checkout").value = checkout.value;
      document.getElementById("b-guests").value = document.getElementById("s-guests").value;
      updateSummary();
      navigate("rooms");
    });
  }

  /* ----------------------------------------------------------------
     Booking form (CREATE)
  ---------------------------------------------------------------- */
  function updateSummary() {
    const roomSelect = document.getElementById("b-room");
    if (!roomSelect) return null;
    const room = roomById(roomSelect.value);
    const checkin = document.getElementById("b-checkin").value;
    const checkout = document.getElementById("b-checkout").value;
    const summary = document.getElementById("bookingSummary");
    const nights = nightsBetween(checkin, checkout);

    refreshRoomAvailabilityDisplay();

    if (!room || nights <= 0) {
      summary.hidden = true;
      return null;
    }
    const total = nights * room.price;
    const avail = availableRooms(room.id, checkin, checkout);

    document.getElementById("summaryNights").textContent = `${nights} night${nights > 1 ? "s" : ""} · ${room.name}`;
    document.getElementById("summaryTotal").textContent = money(total);
    document.getElementById("summaryBase").textContent = baseNote(total);

    const availEl = document.getElementById("summaryAvail");
    availEl.textContent = avail > 0 ? `${avail} of ${room.qty} rooms available` : "Fully booked for these dates";
    availEl.classList.toggle("avail-low", avail <= 0);

    summary.hidden = false;
    return { nights, total, avail };
  }

  function initBookingForm() {
    const form = document.getElementById("bookingForm");
    const checkinEl = document.getElementById("b-checkin");
    const checkoutEl = document.getElementById("b-checkout");
    const errorEl = document.getElementById("formError");

    checkinEl.min = todayISO();
    checkoutEl.min = todayISO();

    ["b-room", "b-checkin", "b-checkout"].forEach((id) =>
      document.getElementById(id).addEventListener("change", updateSummary)
    );
    checkinEl.addEventListener("change", () => {
      checkoutEl.min = checkinEl.value;
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      errorEl.hidden = true;

      // Guard: the form is hidden behind the sign-in gate when logged out,
      // but this protects against any stray submit (e.g. pressing Enter).
      if (!isLoggedIn()) {
        return showFormError(errorEl, "Please sign in to confirm a reservation.");
      }

      const account = getCurrentUser();
      const name = document.getElementById("b-name").value.trim();
      // Email, phone and country always come from the registered account.
      const email = account.email;
      const phone = account.phone;
      const country = countryByCode(account.country) || activeCountry;
      const roomId = document.getElementById("b-room").value;
      const checkin = checkinEl.value;
      const checkout = checkoutEl.value;
      const guests = Number(document.getElementById("b-guests").value);
      const requests = document.getElementById("b-requests").value.trim();
      const nights = nightsBetween(checkin, checkout);

      if (!name || !checkin || !checkout) {
        return showFormError(errorEl, "Please fill in every required field.");
      }
      if (!phone) {
        return showFormError(errorEl, "Your account has no phone number saved. Please create a new account with your phone number.");
      }

      if (nights <= 0) {
        return showFormError(errorEl, "Check-out date must be after the check-in date.");
      }
      if (guests < 1 || guests > 6) {
        return showFormError(errorEl, "Guests must be between 1 and 6.");
      }

      const room = roomById(roomId);
      const avail = availableRooms(roomId, checkin, checkout);
      if (avail <= 0) {
        return showFormError(
          errorEl,
          `Sorry, all ${room.qty} ${room.name} rooms are already booked for those dates. Try different dates or another room type.`
        );
      }

      const booking = {
        id: `bk_${Date.now()}`,
        accountEmail: getSessionEmail(),
        name, email, phone,
        country: country.code,
        room: roomId,
        checkin, checkout,
        guests,
        requests,
        nights,
        total: nights * room.price,
        status: "Confirmed",
        createdAt: Date.now()
      };

      addBooking(booking);
      renderBookings();
      refreshRoomAvailabilityDisplay();
      showToast(`Booking confirmed for ${room.name}`);
      form.reset();
      document.getElementById("bookingSummary").hidden = true;
      document.getElementById("b-guests").value = 2;
      // Re-apply the signed-in guest's name/email after form.reset() clears them.
      const user = getCurrentUser();
      if (user) {
        document.getElementById("b-name").value = user.name;
        refreshBookContact();
      }
      setTimeout(() => navigate("bookings"), 300);
    });
  }

  function showFormError(el, message) {
    el.textContent = message;
    el.hidden = false;
  }

  /* ----------------------------------------------------------------
     Edit modal (UPDATE) + Delete confirm modal (DELETE)
  ---------------------------------------------------------------- */
  function initBookingsTableActions() {
    const body = document.getElementById("bookingsBody");
    const editOverlay = document.getElementById("modalOverlay");
    const confirmOverlay = document.getElementById("confirmOverlay");
    let pendingDeleteId = null;

    body.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      if (!row) return;
      const id = row.dataset.id;
      const booking = getBookings().find((b) => b.id === id);
      if (!booking) return;

      if (e.target.closest(".edit-btn")) {
        document.getElementById("e-id").value = booking.id;
        document.getElementById("e-name").value = booking.name;
        document.getElementById("e-room").value = booking.room;
        document.getElementById("e-checkin").value = booking.checkin;
        document.getElementById("e-checkout").value = booking.checkout;
        document.getElementById("e-guests").value = booking.guests;
        document.getElementById("editError").hidden = true;
        openModal(editOverlay);
      }

      if (e.target.closest(".delete-btn")) {
        pendingDeleteId = id;
        document.getElementById("confirmBody").textContent =
          `Cancel the booking for ${booking.name} (${formatDate(booking.checkin)})? This can't be undone.`;
        openModal(confirmOverlay);
      }
    });

    // Edit form submit
    document.getElementById("editForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("e-id").value;
      const roomId = document.getElementById("e-room").value;
      const checkin = document.getElementById("e-checkin").value;
      const checkout = document.getElementById("e-checkout").value;
      const guests = Number(document.getElementById("e-guests").value);
      const nights = nightsBetween(checkin, checkout);
      const errorEl = document.getElementById("editError");

      if (nights <= 0) {
        errorEl.textContent = "Check-out date must be after the check-in date.";
        errorEl.hidden = false;
        return;
      }
      const room = roomById(roomId);
      const avail = availableRooms(roomId, checkin, checkout, id);
      if (avail <= 0) {
        errorEl.textContent = `Sorry, all ${room.qty} ${room.name} rooms are already booked for those dates.`;
        errorEl.hidden = false;
        return;
      }
      updateBooking(id, {
        name: document.getElementById("e-name").value.trim(),
        room: roomId,
        checkin, checkout, guests,
        nights,
        total: nights * room.price
      });
      renderBookings();
      refreshRoomAvailabilityDisplay();
      closeModal(editOverlay);
      showToast("Booking updated");
    });

    document.getElementById("modalClose").addEventListener("click", () => closeModal(editOverlay));
    document.getElementById("cancelEdit").addEventListener("click", () => closeModal(editOverlay));
    editOverlay.addEventListener("click", (e) => { if (e.target === editOverlay) closeModal(editOverlay); });

    // Delete confirm
    document.getElementById("confirmYes").addEventListener("click", () => {
      const idToDelete = pendingDeleteId; // capture now — pendingDeleteId is reset below
      const row = body.querySelector(`tr[data-id="${idToDelete}"]`);
      if (row) {
        row.classList.add("row-exit");
        setTimeout(() => {
          deleteBooking(idToDelete);
          renderBookings();
          refreshRoomAvailabilityDisplay();
        }, 260);
      } else {
        deleteBooking(idToDelete);
        renderBookings();
        refreshRoomAvailabilityDisplay();
      }
      closeModal(confirmOverlay);
      showToast("Booking cancelled");
      pendingDeleteId = null;
    });
    document.getElementById("confirmNo").addEventListener("click", () => closeModal(confirmOverlay));
    confirmOverlay.addEventListener("click", (e) => { if (e.target === confirmOverlay) closeModal(confirmOverlay); });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal(editOverlay);
        closeModal(confirmOverlay);
      }
    });
  }

  function openModal(overlay) {
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal(overlay) {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  /* ----------------------------------------------------------------
     Account UI — header greeting, auth gates, sign in / create account
  ---------------------------------------------------------------- */
  function refreshAccountUI() {
    const area = document.getElementById("accountArea");
    const user = getCurrentUser();

    if (user) {
      const firstName = user.name.trim().split(" ")[0] || user.name;
      area.innerHTML = `
        <span class="account-greeting" title="${escapeHTML(user.email)}${user.phone ? " · " + escapeHTML(user.phone) : ""}">Hi, ${escapeHTML(firstName)}</span>
        <button type="button" class="account-signout" id="signOutBtn">Sign out</button>`;
      document.getElementById("signOutBtn").addEventListener("click", () => {
        clearSession();
        refreshAccountUI();
        refreshAuthGates();
        renderBookings();
        showToast("Signed out");
      });
    } else {
      area.innerHTML = `<button type="button" class="btn btn-ghost btn-small account-btn" id="signInBtn">Sign in</button>`;
      document.getElementById("signInBtn").addEventListener("click", () => openAccountModal("signin"));
    }
  }

  function refreshAuthGates() {
    const loggedIn = isLoggedIn();

    document.getElementById("bookGate").hidden = loggedIn;
    document.getElementById("bookingForm").hidden = !loggedIn;
    document.getElementById("bookingsGate").hidden = loggedIn;
    document.getElementById("bookingsCard").hidden = !loggedIn;

    if (loggedIn) {
      const user = getCurrentUser();
      document.getElementById("b-name").value = user.name;
      refreshBookContact();
    }
  }

  /* The registered email + phone are shown (not asked for) on the booking form. */
  function refreshBookContact() {
    const el = document.getElementById("bookContact");
    const user = getCurrentUser();
    if (!el || !user) return;
    el.innerHTML = `Booking contact (your account): <strong>${escapeHTML(user.email)}</strong>` +
      (user.phone ? ` &middot; <strong>${escapeHTML(user.phone)}</strong>` : "");
  }

  function switchAuthTab(which) {
    const isSignIn = which !== "create";
    document.getElementById("signInForm").hidden = !isSignIn;
    document.getElementById("createForm").hidden = isSignIn;
    document.getElementById("signInError").hidden = true;
    document.getElementById("createError").hidden = true;
  }

  function openAccountModal(which) {
    switchAuthTab(which);
    openModal(document.getElementById("accountOverlay"));
  }

  function showAuthError(el, message) {
    el.textContent = message;
    el.hidden = false;
  }

  function initAccountSystem() {
    refreshAccountUI();

    const overlay = document.getElementById("accountOverlay");

    document.getElementById("goToCreate").addEventListener("click", () => switchAuthTab("create"));
    document.getElementById("goToSignIn").addEventListener("click", () => switchAuthTab("signin"));
    document.getElementById("accountClose").addEventListener("click", () => closeModal(overlay));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(overlay); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(overlay); });

    // Buttons inside the "sign in to continue" gates on Book Now / My Bookings
    ["gateSignIn", "bookingsGateSignIn"].forEach((id) =>
      document.getElementById(id).addEventListener("click", () => openAccountModal("signin"))
    );
    ["gateCreate", "bookingsGateCreate"].forEach((id) =>
      document.getElementById(id).addEventListener("click", () => openAccountModal("create"))
    );

    // live preview of the address the site will create
    document.getElementById("cr-email").addEventListener("input", (e) => {
      const preview = document.getElementById("crEmailPreview");
      const converted = toAureliaEmail(e.target.value);
      preview.innerHTML = converted
        ? `Your Aurelia email will be <strong>${escapeHTML(converted)}</strong>`
        : "Use any email (Gmail, Yahoo, Outlook…). It becomes your <strong>@aurelie.com</strong> address automatically.";
    });

    document.getElementById("signInForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = toAureliaEmail(document.getElementById("si-email").value);
      const password = document.getElementById("si-password").value;
      const errorEl = document.getElementById("signInError");

      if (!email) {
        return showAuthError(errorEl, EMAIL_ERROR);
      }

      const user = findUserByEmail(email);
      if (!user || user.passwordHash !== simpleHash(password)) {
        return showAuthError(errorEl, "Email or password is incorrect.");
      }

      setSessionEmail(user.email);
      if (user.country) setCountry(user.country);
      document.getElementById("signInForm").reset();
      closeModal(overlay);
      refreshAccountUI();
      refreshAuthGates();
      renderBookings();
      showToast(`Welcome back, ${user.name.split(" ")[0]}`);
    });

    document.getElementById("createForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("cr-name").value.trim();
      const email = toAureliaEmail(document.getElementById("cr-email").value);
      const password = document.getElementById("cr-password").value;
      const password2 = document.getElementById("cr-password2").value;
      const errorEl = document.getElementById("createError");

      if (!name || !email || !password) {
        return showAuthError(errorEl, "Please fill in every field.");
      }
      if (!email) {
        return showAuthError(errorEl, EMAIL_ERROR);
      }
      if (password.length < 6) {
        return showAuthError(errorEl, "Password must be at least 6 characters.");
      }
      if (password !== password2) {
        return showAuthError(errorEl, "Passwords don't match.");
      }
      if (findUserByEmail(email)) {
        return showAuthError(errorEl, "An account with that email already exists — sign in instead.");
      }

      // Phone is checked against the chosen country (India / Pakistan / UK).
      const country = countryByCode(document.getElementById("cr-country").value) || activeCountry;
      const phoneCheck = validatePhone(document.getElementById("cr-phone").value, country);
      if (!phoneCheck.ok) {
        return showAuthError(errorEl, phoneCheck.message);
      }

      const user = {
        id: `usr_${Date.now()}`, name, email, passwordHash: simpleHash(password),
        phone: phoneCheck.value, country: country.code
      };
      const users = getUsers();
      users.push(user);
      saveUsers(users);
      setSessionEmail(user.email);
      setCountry(country.code);          // currency follows the country code

      document.getElementById("createForm").reset();
      document.getElementById("cr-country").value = country.code;
      closeModal(overlay);
      refreshAccountUI();
      refreshAuthGates();
      renderBookings();
      showToast(`Welcome, ${name.split(" ")[0]} — your email is ${email}`);
    });
  }

  /* ==================================================================
     360° ROOM TOUR
     Every room type gets its own panorama, drawn as a single wide SVG
     (2400 x 760) that is built in code — no image files, so it stays
     self-contained and loads instantly. The SVG is tiled horizontally
     inside the viewer and panned by moving the background position, so
     scrolling past the right edge wraps seamlessly back to the left:
     a true, endless 360° turn around the room.
  ================================================================== */
  const PANO_W = 2400;
  const PANO_H = 760;
  const BAY = 400;

  const PANO_THEMES = {
    standard: {
      wall: "#EAE3D5", wallDark: "#DCD3C1", ceiling: "#F4EFE4",
      floor: "#9A7A54", floorDark: "#7E6244", accent: "#2F4A3A",
      textile: "#3B5B47", trim: "#C9A15A", ink: "#2B2B26",
      bays: ["window", "bed", "art", "door", "plant", "window"]
    },
    deluxe: {
      wall: "#F2E8D5", wallDark: "#E5D8BF", ceiling: "#FBF5E9",
      floor: "#A8834F", floorDark: "#8A6C43", accent: "#B98A46",
      textile: "#C9A15A", trim: "#8A6C43", ink: "#3A3229",
      bays: ["window", "bed", "art", "balcony", "desk", "plant"]
    },
    suite: {
      wall: "#E8ECE2", wallDark: "#D9DFD1", ceiling: "#F5F8F1",
      floor: "#947C56", floorDark: "#786344", accent: "#7C9273",
      textile: "#8FA688", trim: "#5F7357", ink: "#2C332B",
      bays: ["window", "bed", "sofa", "art", "window", "plant"]
    },
    executive: {
      wall: "#33322D", wallDark: "#2A2925", ceiling: "#3C3A34",
      floor: "#3E362C", floorDark: "#2F2921", accent: "#C9A15A",
      textile: "#5A4C3B", trim: "#C9A15A", ink: "#EFE7D6",
      bays: ["window", "bed", "tub", "art", "desk", "window"]
    }
  };
  /* --- individual pieces of furniture / architecture, drawn per bay --- */
  const BAY_ART = {
    window(x, t) {
      return `
        <rect x="${x + 70}" y="200" width="260" height="290" rx="6" fill="url(#sky)" stroke="${t.trim}" stroke-width="7"/>
        <rect x="${x + 196}" y="200" width="8" height="290" fill="${t.trim}"/>
        <rect x="${x + 70}" y="340" width="260" height="8" fill="${t.trim}"/>
        <circle cx="${x + 140}" cy="420" r="48" fill="#6E8F63" opacity=".85"/>
        <circle cx="${x + 245}" cy="435" r="36" fill="#87A578" opacity=".85"/>
        <rect x="${x + 70}" y="452" width="260" height="38" fill="#5E7B54" opacity=".8"/>
        <rect x="${x + 44}" y="186" width="34" height="318" fill="${t.textile}" opacity=".9"/>
        <rect x="${x + 322}" y="186" width="34" height="318" fill="${t.textile}" opacity=".9"/>
        <rect x="${x + 60}" y="492" width="280" height="14" rx="4" fill="${t.wallDark}"/>`;
    },
    balcony(x, t) {
      return `
        <rect x="${x + 90}" y="150" width="220" height="410" rx="4" fill="url(#sky)" stroke="${t.trim}" stroke-width="8"/>
        <rect x="${x + 196}" y="150" width="8" height="410" fill="${t.trim}"/>
        <rect x="${x + 90}" y="430" width="220" height="130" fill="#6E8F63" opacity=".55"/>
        <g stroke="${t.trim}" stroke-width="5">
          <line x1="${x + 100}" y1="420" x2="${x + 300}" y2="420"/>
          <line x1="${x + 130}" y1="420" x2="${x + 130}" y2="500"/>
          <line x1="${x + 200}" y1="420" x2="${x + 200}" y2="500"/>
          <line x1="${x + 270}" y1="420" x2="${x + 270}" y2="500"/>
        </g>`;
    },
    bed(x, t) {
      return `
        <rect x="${x + 60}" y="230" width="280" height="180" rx="10" fill="${t.accent}" opacity=".9"/>
        <g opacity=".25" stroke="#FFFFFF" stroke-width="2">
          <line x1="${x + 130}" y1="230" x2="${x + 130}" y2="410"/>
          <line x1="${x + 200}" y1="230" x2="${x + 200}" y2="410"/>
          <line x1="${x + 270}" y1="230" x2="${x + 270}" y2="410"/>
        </g>
        <rect x="${x + 30}" y="400" width="340" height="120" rx="12" fill="${t.textile}"/>
        <rect x="${x + 30}" y="400" width="340" height="36" rx="10" fill="#F7F2E6"/>
        <rect x="${x + 62}" y="372" width="120" height="48" rx="14" fill="#FBF7EF"/>
        <rect x="${x + 214}" y="372" width="120" height="48" rx="14" fill="#FBF7EF"/>
        <rect x="${x + 30}" y="470" width="340" height="18" rx="6" fill="${t.trim}" opacity=".75"/>
        <rect x="${x + 44}" y="516" width="26" height="40" fill="${t.floorDark}"/>
        <rect x="${x + 330}" y="516" width="26" height="40" fill="${t.floorDark}"/>
        <circle cx="${x + 24}" cy="300" r="16" fill="${t.trim}" opacity=".9"/>
        <circle cx="${x + 376}" cy="300" r="16" fill="${t.trim}" opacity=".9"/>`;
    },
    art(x, t) {
      return `
        <rect x="${x + 90}" y="230" width="110" height="140" rx="3" fill="${t.wallDark}" stroke="${t.trim}" stroke-width="5"/>
        <path d="M${x + 100} 350 L${x + 140} 280 L${x + 170} 330 L${x + 190} 305 L${x + 190} 360 Z" fill="${t.accent}" opacity=".8"/>
        <rect x="${x + 225}" y="255" width="90" height="115" rx="3" fill="${t.wallDark}" stroke="${t.trim}" stroke-width="5"/>
        <circle cx="${x + 270}" cy="300" r="24" fill="${t.textile}" opacity=".85"/>
        <rect x="${x + 110}" y="440" width="190" height="16" rx="6" fill="${t.floorDark}"/>
        <rect x="${x + 128}" y="456" width="12" height="60" fill="${t.floorDark}"/>
        <rect x="${x + 270}" y="456" width="12" height="60" fill="${t.floorDark}"/>
        <circle cx="${x + 200}" cy="424" r="14" fill="${t.trim}"/>`;
    },
    door(x, t) {
      return `
        <rect x="${x + 120}" y="180" width="170" height="340" rx="4" fill="${t.wallDark}" stroke="${t.trim}" stroke-width="6"/>
        <rect x="${x + 142}" y="208" width="126" height="130" rx="3" fill="${t.wall}" opacity=".7"/>
        <rect x="${x + 142}" y="356" width="126" height="130" rx="3" fill="${t.wall}" opacity=".7"/>
        <circle cx="${x + 268}" cy="352" r="9" fill="${t.trim}"/>`;
    },
    desk(x, t) {
      return `
        <rect x="${x + 80}" y="400" width="240" height="14" rx="5" fill="${t.floorDark}"/>
        <rect x="${x + 92}" y="414" width="12" height="105" fill="${t.floorDark}"/>
        <rect x="${x + 296}" y="414" width="12" height="105" fill="${t.floorDark}"/>
        <rect x="${x + 150}" y="330" width="26" height="70" fill="${t.trim}" opacity=".8"/>
        <path d="M${x + 132} 330 h62 l-14 -40 h-34 Z" fill="${t.trim}"/>
        <rect x="${x + 214}" y="366" width="76" height="34" rx="4" fill="${t.accent}" opacity=".85"/>
        <rect x="${x + 196}" y="440" width="70" height="12" rx="4" fill="${t.textile}"/>
        <rect x="${x + 226}" y="452" width="10" height="66" fill="${t.textile}"/>
        <rect x="${x + 110}" y="230" width="180" height="110" rx="4" fill="${t.wallDark}" stroke="${t.trim}" stroke-width="4"/>`;
    },
    sofa(x, t) {
      return `
        <rect x="${x + 70}" y="380" width="260" height="90" rx="16" fill="${t.textile}"/>
        <rect x="${x + 70}" y="350" width="260" height="46" rx="14" fill="${t.accent}" opacity=".9"/>
        <rect x="${x + 56}" y="366" width="34" height="104" rx="14" fill="${t.accent}"/>
        <rect x="${x + 310}" y="366" width="34" height="104" rx="14" fill="${t.accent}"/>
        <rect x="${x + 84}" y="470" width="16" height="42" fill="${t.floorDark}"/>
        <rect x="${x + 300}" y="470" width="16" height="42" fill="${t.floorDark}"/>
        <rect x="${x + 150}" y="500" width="110" height="10" rx="4" fill="${t.floorDark}"/>
        <rect x="${x + 130}" y="250" width="140" height="90" rx="4" fill="${t.wallDark}" stroke="${t.trim}" stroke-width="4"/>`;
    },
    tub(x, t) {
      return `
        <rect x="${x + 70}" y="390" width="260" height="120" rx="58" fill="#F3EFE6"/>
        <rect x="${x + 94}" y="410" width="212" height="76" rx="40" fill="#CFE0E4"/>
        <rect x="${x + 190}" y="330" width="12" height="62" fill="${t.trim}"/>
        <path d="M${x + 196} 330 h48 v18 h-30" fill="none" stroke="${t.trim}" stroke-width="10"/>
        <circle cx="${x + 130}" cy="440" r="10" fill="#FFFFFF" opacity=".7"/>
        <circle cx="${x + 168}" cy="452" r="7" fill="#FFFFFF" opacity=".6"/>
        <rect x="${x + 60}" y="230" width="280" height="80" rx="6" fill="${t.wallDark}" stroke="${t.trim}" stroke-width="4"/>
        <rect x="${x + 76}" y="506" width="248" height="12" rx="5" fill="${t.floorDark}"/>`;
    },
    plant(x, t) {
      return `
        <path d="M${x + 200} 470 C${x + 140} 400 ${x + 150} 330 ${x + 186} 288" fill="none" stroke="#5E7B54" stroke-width="9"/>
        <path d="M${x + 200} 470 C${x + 262} 406 ${x + 256} 336 ${x + 224} 300" fill="none" stroke="#6E8F63" stroke-width="9"/>
        <ellipse cx="${x + 178}" cy="282" rx="40" ry="24" fill="#6E8F63" transform="rotate(-24 ${x + 178} 282)"/>
        <ellipse cx="${x + 234}" cy="296" rx="38" ry="22" fill="#87A578" transform="rotate(22 ${x + 234} 296)"/>
        <ellipse cx="${x + 202}" cy="242" rx="34" ry="22" fill="#5E7B54"/>
        <path d="M${x + 164} 470 h72 l-12 76 h-48 Z" fill="${t.trim}" opacity=".9"/>
        <rect x="${x + 158}" y="462" width="84" height="16" rx="6" fill="${t.trim}"/>`;
    }
  };

  /* Builds the whole panorama for one room type. */
  function panoramaFor(room) {
    const t = PANO_THEMES[room.id] || PANO_THEMES.standard;
    const bays = t.bays
      .map((kind, i) => (BAY_ART[kind] ? BAY_ART[kind](i * BAY, t) : ""))
      .join("");

    // Vertical wall joins between bays keep the eye oriented while turning.
    const joins = t.bays
      .map((_, i) => `<rect x="${i * BAY - 3}" y="150" width="6" height="410" fill="${t.wallDark}" opacity=".7"/>`)
      .join("");

    // A pendant light over every bay, and a soft contact shadow under
    // anything standing on the floor — both cheap, but they stop the
    // furniture looking like it is floating in front of the wall.
    const GROUNDED = ["bed", "sofa", "tub", "desk", "plant", "art"];
    const lights = t.bays
      .map((_, i) => {
        const cx = i * BAY + BAY / 2;
        return `<g opacity=".9">
          <line x1="${cx}" y1="0" x2="${cx}" y2="58" stroke="${t.trim}" stroke-width="3"/>
          <path d="M${cx - 26} 92 L${cx} 56 L${cx + 26} 92 Z" fill="${t.trim}"/>
          <ellipse cx="${cx}" cy="96" rx="26" ry="7" fill="#FFF3D4" opacity=".85"/>
          <ellipse cx="${cx}" cy="128" rx="54" ry="26" fill="#FFF3D4" opacity=".18"/>
        </g>`;
      })
      .join("");
    const shadows = t.bays
      .map((kind, i) =>
        GROUNDED.includes(kind)
          ? `<ellipse cx="${i * BAY + BAY / 2}" cy="556" rx="150" ry="16" fill="#000000" opacity=".16"/>`
          : ""
      )
      .join("");

    const floorLines = Array.from({ length: 13 }, (_, i) =>
      `<line x1="${i * 200}" y1="560" x2="${i * 200 - 60}" y2="760" stroke="${t.floorDark}" stroke-width="3" opacity=".45"/>`
    ).join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PANO_W} ${PANO_H}" width="${PANO_W}" height="${PANO_H}">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#BBD6E8"/><stop offset="60%" stop-color="#DCEAF0"/><stop offset="100%" stop-color="#E9F0E2"/>
        </linearGradient>
        <linearGradient id="ceil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${t.ceiling}"/><stop offset="100%" stop-color="${t.wallDark}"/>
        </linearGradient>
        <linearGradient id="wallg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${t.wall}"/><stop offset="100%" stop-color="${t.wallDark}"/>
        </linearGradient>
        <linearGradient id="floorg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${t.floorDark}"/><stop offset="100%" stop-color="${t.floor}"/>
        </linearGradient>
      </defs>
      <rect width="${PANO_W}" height="150" fill="url(#ceil)"/>
      <rect y="150" width="${PANO_W}" height="410" fill="url(#wallg)"/>
      <rect y="560" width="${PANO_W}" height="200" fill="url(#floorg)"/>
      ${floorLines}
      <rect y="546" width="${PANO_W}" height="18" fill="${t.trim}" opacity=".55"/>
      <rect y="142" width="${PANO_W}" height="14" fill="${t.trim}" opacity=".45"/>
      ${joins}
      ${shadows}
      ${bays}
      ${lights}
    </svg>`;

    // Brackets are escaped as well as everything encodeURIComponent covers:
    // the markup contains fill="url(#sky)" references, and an unescaped
    // bracket inside a CSS url(...) value breaks some CSS parsers.
    const encoded = encodeURIComponent(svg).replace(/\(/g, "%28").replace(/\)/g, "%29");
    return `url("data:image/svg+xml;charset=utf-8,${encoded}")`;
  }

  /* Animation frame with a timer fallback, so the viewer also works in
     environments without requestAnimationFrame (e.g. the jsdom test run). */
  const raf = (fn) =>
    typeof requestAnimationFrame === "function" ? requestAnimationFrame(fn) : setTimeout(() => fn(Date.now()), 16);
  const caf = (id) =>
    typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(id) : clearTimeout(id);
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  /* ------------------ the 360 viewer on the room page ------------------ */
  const pano = {
    room: null,
    photo: false,   // true once a real/rendered 360 image has replaced the generated one
    offset: 0,      // how far we have turned, in rendered pixels
    width: 1,       // rendered width of one full 360 loop
    dragging: false,
    lastX: 0,
    velocity: 0,
    auto: true,     // turns slowly until the visitor takes over
    frame: null
  };
  const byId = (id) => document.getElementById(id);

  function panoMeasure() {
    const stage = byId("panoStage");
    const img = byId("panoImg");
    if (!stage || !img) return;
    if (pano.photo) {
      // 2:1 equirectangular image: one full turn is ~3.6 screens wide, so you
      // see roughly a 100 degree window and look around inside it.
      pano.width = Math.max(1, stage.clientWidth * 3.6);
      img.style.backgroundSize = `${pano.width}px auto`;
    } else {
      pano.width = Math.max(1, stage.clientHeight * (PANO_W / PANO_H));
      img.style.backgroundSize = `${pano.width}px 100%`;
    }
    img.style.backgroundPositionY = "center";
    panoApply();
  }

  function panoApply() {
    const img = byId("panoImg");
    if (!img) return;
    pano.offset = ((pano.offset % pano.width) + pano.width) % pano.width;
    img.style.backgroundPositionX = `${-pano.offset}px`;
    const deg = Math.round((pano.offset / pano.width) * 360);
    byId("panoDeg").textContent = `${deg}°`;
    byId("panoBarFill").style.width = `${(pano.offset / pano.width) * 100}%`;
  }

  /* Runs only while something is moving, and stops by itself when the
     viewer leaves the page. */
  function panoLoop() {
    if (!byId("panoStage") || currentView !== "room") { pano.frame = null; return; }
    if (pano.auto && !pano.dragging) {
      pano.offset += 0.35;
    } else if (Math.abs(pano.velocity) > 0.05) {
      pano.offset += pano.velocity;
      pano.velocity *= 0.94;          // gentle glide after a flick
    } else if (!pano.auto) {
      pano.frame = null;
      return;
    }
    panoApply();
    pano.frame = raf(panoLoop);
  }
  function panoStart() { if (!pano.frame) pano.frame = raf(panoLoop); }
  function panoStop() {
    if (pano.frame) caf(pano.frame);
    pano.frame = null;
  }

  /* Smoothly swing the view by a fixed amount (arrow buttons / keys). */
  function panoNudge(px) {
    pano.auto = false;
    pano.velocity = 0;
    const from = pano.offset;
    const start = now();
    const dur = 420;
    const step = (t) => {
      const k = Math.min(1, (t - start) / dur);
      pano.offset = from + px * (1 - Math.pow(1 - k, 3));
      panoApply();
      if (k < 1) raf(step);
    };
    raf(step);
  }

  /* Called every time a room page is drawn: the stage is a fresh element,
     so listeners are attached to it directly (no duplicates). */
  function mountPano(room) {
    const stage = byId("panoStage");
    if (!stage) return;
    pano.room = room;
    pano.photo = false;
    pano.offset = 0;
    pano.velocity = 0;
    pano.auto = true;
    pano.dragging = false;

    // generated panorama first, swapped for the real/rendered 360 image when found
    byId("panoImg").style.backgroundImage = panoramaFor(room);
    const probe = new Image();
    probe.onload = () => {
      if (pano.room !== room || !probe.naturalWidth || !byId("panoImg")) return;
      pano.photo = true;
      byId("panoImg").style.backgroundImage = `url("${room.pano}")`;
      panoMeasure();
    };
    probe.src = room.pano;

    const hint = byId("panoHint");
    stage.addEventListener("pointerdown", (e) => {
      pano.dragging = true;
      pano.auto = false;
      pano.velocity = 0;
      pano.lastX = e.clientX;
      try { stage.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
      stage.classList.add("grabbing");
      hint.classList.add("fade");
    });
    stage.addEventListener("pointermove", (e) => {
      if (!pano.dragging) return;
      const dx = e.clientX - pano.lastX;
      pano.lastX = e.clientX;
      pano.offset -= dx;              // drag right -> turn left
      pano.velocity = -dx * 0.6;
      panoApply();
    });
    const endDrag = (e) => {
      if (!pano.dragging) return;
      pano.dragging = false;
      stage.classList.remove("grabbing");
      try { stage.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      panoStart();
    };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("pointerleave", endDrag);

    byId("panoLeft").addEventListener("click", () => { hint.classList.add("fade"); panoNudge(-pano.width / 8); });
    byId("panoRight").addEventListener("click", () => { hint.classList.add("fade"); panoNudge(pano.width / 8); });

    raf(() => { panoMeasure(); panoStart(); });
  }

  function initPanoGlobal() {
    document.addEventListener("keydown", (e) => {
      if (currentView !== "room" || !byId("panoStage")) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); panoNudge(-pano.width / 8); }
      if (e.key === "ArrowRight") { e.preventDefault(); panoNudge(pano.width / 8); }
    });
    window.addEventListener("resize", () => { if (currentView === "room") panoMeasure(); });
  }

  /* ----------------------------------------------------------------
     Amenity details — click any item in the strip under the hero
  ---------------------------------------------------------------- */
  const AMENITIES = {
    wifi: {
      title: "Free WiFi throughout",
      lead: "Fast, complimentary WiFi in every room and every shared space.",
      items: [
        "Fibre-backed connection, fast enough for video calls and streaming",
        "Covers all rooms, the lobby, the restaurant and the courtyard garden",
        "Up to 5 devices per guest at no charge",
        "Network name and password are on your key card sleeve at check-in",
        "Need a hand connecting? The front desk can help any time, day or night"
      ],
      note: "No sign-up pages, no time limits, no extra fees."
    },
    breakfast: {
      title: "Breakfast included",
      lead: "A freshly prepared breakfast comes with every room rate.",
      items: [
        "Served daily in the courtyard restaurant, 6:30 – 10:30",
        "Continental and cooked options, fresh fruit, pastries and bread baked each morning",
        "Vegetarian, vegan, halal and gluten-free choices every day",
        "Prefer your room? Order in-room breakfast until 10:00 at no extra cost",
        "Children's portions available on request"
      ],
      note: "Included for every guest on the booking."
    },
    spa: {
      title: "Garden courtyard spa",
      lead: "A quiet spa tucked into the courtyard garden, open to all guests.",
      items: [
        "Open daily, 9:00 – 21:00",
        "Steam room, sauna and a relaxation lounge overlooking the garden",
        "Massage and skin treatments by appointment",
        "Book at the front desk or ask for a time slot when you check in",
        "Robes and slippers are provided in your room"
      ],
      note: "Steam room and sauna are complimentary; treatments are charged separately."
    },
    desk: {
      title: "24/7 front desk",
      lead: "Someone is always at the desk — whatever time you arrive or need help.",
      items: [
        "Check-in from 14:00, check-out until 11:00; late arrivals welcome at any hour",
        "Free luggage storage before check-in and after check-out",
        "Taxi and airport transfer bookings",
        "Local recommendations, restaurant reservations and wake-up calls",
        "In-room safe and spare chargers on request"
      ],
      note: "Call the desk any time on +44 20 7946 0000."
    },
    cancel: {
      title: "Free cancellation",
      lead: "Plans change — cancelling a reservation costs you nothing.",
      items: [
        "Cancel free of charge up to 48 hours before arrival",
        "Cancel from My Bookings with the bin icon — the room is released straight away",
        "Change your dates or room type from the pencil icon, also free of charge",
        "No booking fees and no hidden charges at any point"
      ],
      note: "Your confirmation is instant, and so is your cancellation."
    }
  };

  function openAmenity(key, sourceEl) {
    const info = AMENITIES[key];
    if (!info) return;
    byId("amenityTitle").textContent = info.title;
    byId("amenityLead").textContent = info.lead;
    byId("amenityList").innerHTML = info.items.map((t) => `<li>${t}</li>`).join("");
    byId("amenityNote").textContent = info.note;
    const svg = sourceEl && sourceEl.querySelector("svg");
    byId("amenityIcon").innerHTML = svg ? svg.outerHTML : "";
    openModal(byId("amenityOverlay"));
  }

  function initAmenities() {
    const overlay = byId("amenityOverlay");
    document.querySelectorAll(".amenity[data-amenity]").forEach((el) => {
      el.addEventListener("click", () => openAmenity(el.dataset.amenity, el));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openAmenity(el.dataset.amenity, el); }
      });
    });
    byId("amenityClose").addEventListener("click", () => closeModal(overlay));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(overlay); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(overlay); });
  }

  /* ----------------------------------------------------------------
     Init
  ---------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("year").textContent = new Date().getFullYear();
    renderRooms();
    populateRoomSelects();
    initAccountSystem();
    refreshAuthGates();
    renderBookings();
    initCountrySelectors();
    refreshRoomAvailabilityDisplay();
    initHeader();
    initRouter();
    initSearchWidget();
    initBookingForm();
    initBookingsTableActions();
    initPanoGlobal();
    initAmenities();
  });

  /* Exposes the pure, DOM-free logic for the automated test suite
     (tests/unit.test.js). Has zero effect in the browser — "module"
     doesn't exist there, so this block never runs on the live site. */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      ROOMS, nightsBetween, bookedCountOverlap, availableRooms, simpleHash, currency,
      COUNTRIES, countryByCode, isAllowedEmail, toAureliaEmail, normalisePhone, validatePhone, money
    };
  }
})();
