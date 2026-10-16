# Aurelia — Hotel Room Reservation (Front-End Demo)

A responsive, animated hotel room reservation website built with plain
**HTML, CSS and JavaScript** (no frameworks, no build step). This is the
application layer for the group project — the DevOps pipeline (Git,
Jenkins, Docker, AWS) will be added around this app in later weeks.

## Folder structure

```
hotel-reservation/
├── index.html        # All page sections (Home, Rooms, Book Now, My Bookings, Contact)
├── css/
│   └── style.css      # Theme, layout, responsive rules, animations
├── js/
│   └── app.js          # Room data, rendering, and CRUD booking logic
└── README.md
```

## How to run it

No installation is needed.

- **Quickest:** double-click `index.html` to open it in a browser.
- **Recommended (for correct relative paths every time):** serve the
  folder with a tiny local web server, e.g.:
  ```bash
  cd hotel-reservation
  python3 -m http.server 8080
  # then open http://localhost:8080
  ```

## Features (CRUD)

| Action | Where | What happens |
|---|---|---|
| **Create** | "Book Now" form | Validates the form, checks live room availability, calculates nights & total price, saves a new booking |
| **Read** | "My Bookings" table | Lists the signed-in guest's own bookings, newest first |
| **Update** | Pencil icon on a booking row | Opens a modal to change room, dates or guest count (re-checks availability) |
| **Delete** | Trash icon on a booking row | Confirms, then removes the booking with an animation |

Booking data is currently stored in the browser's `localStorage`, which
stands in for the real database this application will use once it is
deployed as a microservice on AWS.

## Pages & real photos

The menu drives the site: **Home / Rooms / Book Now / My Bookings** each open
their own page (Contact scrolls to the footer), and clicking a room opens its
detail page (photos, facts, what's included, 360° tour, Book). On mobile the
☰ button opens the menu. Back/forward buttons work.

Sign-up asks for a phone number (🇮🇳 IND +91, 🇵🇰 PAK +92, 🇬🇧 UK +44), checks its
length/format for that country, and switches the whole site to that country's
currency. The number is pre-filled in the booking form.

Each room page has gallery images, an interactive 360° panorama and a 360° video tour (`images/rooms`, `images/360`, `videos/360`). They are 3D renders; swap in your own photos/video with the same file names — see `images/README.md`.

## Validation & localisation

| Rule | Where | Behaviour |
|---|---|---|
| **Email** | Create account, sign in | Guests can type any email (Gmail, Yahoo, Outlook…). The site converts it to the same name on `@aurelie.com` (`jane@gmail.com` → `jane@aurelie.com`), shows a live preview while typing, and signing in works with either form. Two people whose names match on different providers cannot both register |
| **Phone by country** | Dial-code dropdown beside the Phone field on the **sign-up** form | Three markets are supported — 🇬🇧 UK `+44`, 🇮🇳 India `+91`, 🇵🇰 Pakistan `+92`. The number is normalised first (spaces, dashes, brackets, a leading `0` or an already-typed dial code are all stripped) and then checked against that country's format: UK = 10 digits; India = 10 digits starting 6–9; Pakistan = 10 digits starting 3. Stored as `+44 7700900123` |
| **Currency** | Header country picker (and the dial-code dropdown, which stays in sync) | Every price — room cards, the room dropdown, the booking summary and the My Bookings table — is shown in that country's currency: GBP `£`, INR `₹`, PKR `₨`. The choice is remembered in `localStorage` |

Room rates are **stored once, in GBP** (the hotel's base currency) and converted
for display only, so switching country never changes a saved booking total. The
conversion rates are fixed demo values in `COUNTRIES` — a production build would
fetch live rates instead.

## 360° room tours

Clicking a room card's image (or its "View 360° tour" button) opens a panoramic
tour of that room type:

- Drag, swipe, use the on-screen arrows or the ← / → keys to look around; there
  is also an auto-rotate toggle, and a live degree readout.
- Panning past the right-hand edge wraps seamlessly back to the left, so the
  turn is a genuine, endless 360°.
- Each panorama is **generated in code** as one wide SVG (`panoramaFor()` in
  `js/app.js`) — no image files to host, nothing to download, and each of the
  four room types gets its own layout, palette and furniture.
- The tour has a "Book this room" button that preselects that room in the
  booking form.

## Accounts & room inventory

- **Fixed inventory:** Aurelia has exactly **20 rooms** — 6 Standard,
  5 Deluxe, 5 Suite, 4 Executive. Every booking is checked against
  overlapping dates for that room type; once all rooms of a type are
  taken for a given date range, the form blocks new bookings for it
  and the room card / booking summary shows live availability.
- **Accounts:** guests must sign in or create a free account before
  confirming a reservation. Each account only ever sees, edits, or
  cancels **its own** bookings — "My Bookings" is filtered by the
  signed-in account.
- **Important:** this is a front-end coursework demo. Accounts and
  passwords are stored only in the browser's `localStorage`, run
  through a simple non-cryptographic hash purely so passwords aren't
  sitting in plain text — this is **not** secure authentication. A
  real deployment should hand sign-up/sign-in to a proper backend
  (e.g. AWS Cognito), which is out of scope for this prototype.

## Design notes

- **Theme:** boutique-hotel palette — deep forest green, brass gold accent,
  ivory background.
- **Fonts:** Fraunces (serif, headings) + Inter (sans, body), loaded from
  Google Fonts.
- **Animations:** a single orchestrated hero entrance, a drifting
  background glow, a staggered reveal for the room cards, and
  transition/hover states throughout. `prefers-reduced-motion` is
  respected.
- **Responsive:** breakpoints at 900px, 860px and 560px — the layout,
  navigation and search widget all adapt down to mobile.

## Next steps (later weeks)

- Add a `Dockerfile` to containerise the app.
- Push to Git / AWS CodeCommit.
- Set up Jenkins + AWS CodeBuild for automated build & test.
- Deploy via AWS Elastic Beanstalk with rolling deployment.
- Add AWS CloudWatch monitoring, logging and rollback.

## Registered contact is the default everywhere

The email and phone given at sign-up are saved on the account and used for every
booking. The Book Now form no longer asks for them — it only shows them as the
booking contact — and the same details appear in My Bookings and on the header
greeting (hover). The account's country also sets the currency.


## Publish the website for free with GitHub Pages

This project is a static HTML/CSS/JavaScript website, so the front end can be hosted on GitHub Pages without a server. Booking data is stored in the visitor's browser `localStorage`; it is a demo and does not share bookings between different users/devices.

1. Create a GitHub repository (for example, `hotel-reservation`).
2. Upload the **contents of this folder** to the repository root. Make sure `index.html` is at the top level, alongside `css/`, `js/`, `images/`, and `videos/`.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/(root)`, then save.
6. Wait for the deployment to finish. GitHub will show the published URL on the Pages settings screen.

If your default branch has a different name, select that branch instead. It can take a few minutes for the first deployment to appear.

### Important limitations

- GitHub Pages hosts the static front end only. It does not run the Docker container, Node.js server, Jenkins pipeline, or AWS deployment configuration.
- The current booking data is stored in each browser's local storage, not in a shared database.
- Do not commit passwords, `.env` files, AWS access keys, private keys, or other secrets. Configure credentials in your CI/CD provider's secret/credential store.
- The Docker, Jenkins, CodeBuild, and Elastic Beanstalk files are retained for the DevOps coursework and can be used separately when configuring that infrastructure.
