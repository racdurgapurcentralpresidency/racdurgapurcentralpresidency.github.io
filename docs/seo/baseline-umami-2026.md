# RAC DCP Web Analytics — Initial Umami Cloud Baseline & Privacy Architecture (November 2026)

## 1. Document Metadata and Scope

* **Document Title:** Initial Umami Cloud Baseline & Privacy Architecture
* **Phase:** Phase 3.7D (Batch 1 Implementation & Verification)
* **Target Property:** `https://racdurgapurcentralpresidency.github.io/`
* **Verification Date:** 17 November 2026
* **Analytics Provider:** Umami Cloud (`https://cloud.umami.is/`)
* **Execution Classification:** Internal Technical, Privacy & Analytics Record
* **Implementation Mode:** Batch 1 — Basic Pageviews & Referrals (No custom events, no download tracking, no form instrumentation)

---

## 2. Purpose and Operational Scope

This document establishes the official technical record of the Batch 1 web analytics integration for the Rotaract Club of Durgapur Central Presidency (RAC DCP) official website.

It documents:
1. The privacy-preserving configuration deployed sitewide.
2. The strict tracking boundaries enforced between general public pages and the CARE CONNECT community platform.
3. The standalone privacy policy and footer navigation structure.
4. The live post-deployment verification observations recorded on 17 November 2026.
5. The technical boundaries, legal disclaimers, and operational limitations governing web analytics.

---

## 3. Umami Cloud Account and Site Configuration

| Configuration Property | Value | Notes / Verification Status |
| :--- | :--- | :--- |
| **Analytics Provider** | Umami Cloud | Hosted software-as-a-service (`cloud.umami.is`) |
| **Website Name** | RAC DCP Website | Primary public club web property |
| **Website ID** | `fd5fb81b-ab55-48ae-ad3a-6a3e2a661047` | Assigned production site identifier |
| **Configured Domain** | `racdurgapurcentralpresidency.github.io` | Primary production domain |
| **Analytics Storage Region** | European Union (EU) | Selected data storage location in Umami Cloud |

---

## 4. Deployed Tracking Configuration (Batch 1)

### A. Exact Tracker Snippet

The following exact snippet is embedded immediately preceding the closing `</head>` tag on all tracked canonical pages:

```html
<!-- Privacy-Preserving Web Analytics (Umami Cloud — Cookie-less, DNT Enabled) -->
<script defer src="https://cloud.umami.is/script.js" data-website-id="fd5fb81b-ab55-48ae-ad3a-6a3e2a661047" data-domains="racdurgapurcentralpresidency.github.io" data-do-not-track="true" data-exclude-search="true" data-exclude-hash="true"></script>
```

### B. Deployed Script Attributes Breakdown

| Attribute | Deployed Value | Technical Purpose & Privacy Function |
| :--- | :--- | :--- |
| `defer` | *Boolean attribute* | Defers execution until HTML parsing is complete; prevents render blocking. |
| `src` | `https://cloud.umami.is/script.js` | Loads the official hosted Umami tracking library. |
| `data-website-id` | `fd5fb81b-ab55-48ae-ad3a-6a3e2a661047` | Associates telemetry beacons with the registered RAC DCP website container. |
| `data-domains` | `racdurgapurcentralpresidency.github.io` | Restricts tracking execution exclusively to the official production domain. Prevents tracking from `localhost`, testing mirrors, or fork repositories. |
| `data-do-not-track` | `true` | Instructs the tracker to respect the visitor's browser `Do Not Track` (`navigator.doNotTrack`) preference. When set, tracking is completely aborted client-side. |
| `data-exclude-search` | `true` | Automatically strips query strings (`?key=val`) from the collected URL before beacon dispatch. Prevents accidental exposure of search parameters, campaign tags, or sensitive tokens. |
| `data-exclude-hash` | `true` | Automatically strips URL fragments (`#section`) from the collected URL before beacon dispatch. Ensures internal navigational state is omitted. |

* **Note on Pageview Tracking:** The attribute `data-auto-track="true"` is **not** present in the deployed script. Automatic pageview and referral recording is enabled by default behavior in Umami's standard tracker script when no custom overrides are configured.
* **Batch 1 Exclusions:** No custom event attributes (`data-umami-event`), no JavaScript tracking calls (`umami.track()`), and no document link/PDF tracking are deployed in this batch.

---

## 5. Tracked Pages vs. Excluded Scope

### A. Tracked Canonical Pages (Exactly 7 Pages)

The tracking script is deployed exclusively to the seven approved canonical HTML pages:

| # | File Path | Canonical URL Route | Page Type |
| :---: | :--- | :--- | :--- |
| 1 | `index.html` | `/` | Club Homepage |
| 2 | `our-work.html` | `/our-work.html` | Avenues of Service & Initiatives |
| 3 | `recognition.html` | `/recognition.html` | Awards, Citations & Accolades |
| 4 | `care-connect/index.html` | `/care-connect/` | Community Assistance Gateway |
| 5 | `ry-2025-26.html` | `/ry-2025-26.html` | Current Rotary Year Archive |
| 6 | `ry-2024-25.html` | `/ry-2024-25.html` | Historical Rotary Year Archive |
| 7 | `ry-2023-24.html` | `/ry-2023-24.html` | Historical Rotary Year Archive |

### B. Excluded Pages and Assets (Zero Tracking)

| Asset / File Path | Exclusion Rationale |
| :--- | :--- |
| `privacy.html` | Dedicated privacy policy page; excluded so visitors inspecting privacy disclosures are not tracked. |
| `404.html` | Custom error page; excluded from standard pageview tracking in Batch 1. |
| `google93ef8856cf3c273e.html` | Static Google Search Console verification token; contains no user content. |
| `publications/*.pdf` & `docs/**/*.pdf` | Static downloadable bulletin and report PDFs; direct file access is not instrumented in Batch 1. |

---

## 6. Privacy Safeguards and Technical Limitations

### A. Verified Privacy Safeguards

1. **Cookie-less Architecture:** During browser verification, no cookies (`document.cookie`) were observed being set or read by the analytics integration, and no persistent browser-storage identifiers (`localStorage` / `sessionStorage`) were identified during the implementation audit. This technical observation reflects the integration's observed execution behaviour and does not independently determine legal consent obligations under applicable privacy laws.
2. **Client-Side URL Sanitization:** Through `data-exclude-search="true"` and `data-exclude-hash="true"`, dynamic URL parameters and hash fragments are stripped on the client before network transmission.
3. **Respect for User Choice:** Through `data-do-not-track="true"`, any user with DNT enabled in their browser environment is entirely omitted from tracking.
4. **Data Minimization and Pseudonymous Identifiers:** Direct personal identifiers such as names, email addresses, and phone numbers are not deliberately collected through the analytics implementation. To calculate aggregate visitor metrics, Umami may process technical connection details to generate pseudonymous visitor identifiers or daily rotating hashes. In accordance with data protection principles, such pseudonymous identifiers should not be described as equivalent to zero personal-data processing.

### B. Technical Boundaries and Legal Disclaimers

In accordance with strict compliance and transparency standards, the following technical boundaries are explicitly recorded:

* **No Claim of Legal Certification:** The deployment of privacy-focused analytics does not constitute formal statutory certification or absolute immunity under data protection legislation (such as India's Digital Personal Data Protection Act, 2023 or the European Union GDPR).
* **Technical Connection Metadata:** Umami processes transient network connection metadata (including IP addresses and HTTP User-Agent strings) at its edge servers to generate aggregate metrics (such as daily unique visitor hashes and approximate geographic regions). Standard Umami analytical reports do not expose raw IP addresses to dashboard users.
* **Operational Infrastructure Logs:** RAC DCP makes no claim that raw IP addresses or network connection metadata are absent from low-level operational, security, CDN, or load-balancer logs maintained by Umami Cloud or its upstream infrastructure partners.
* **Geographic Processing Boundary:** While the primary analytics database is configured in the European Union (EU) region for data storage, supporting technical network operations (e.g., global edge routing, DDoS mitigation, DNS resolution) may execute outside the EU.

---

## 7. CARE CONNECT Data Separation

CARE CONNECT collects applicant information for its own community-assistance workflow. The Umami analytics implementation does not deliberately collect applicant form-field values or transmit applicant information as custom analytics event data.

The data separation architecture is governed by the following operational principles:

1. **Tracked Pageview Scope:** General pageviews on `care-connect/index.html` (`/care-connect/`) are tracked by the canonical page tracker, recording aggregate page visits and referral sources in the same manner as other public pages.
2. **No Form Instrumentation:** Form input fields, dropdown menus, text areas, file attachment elements, and submission triggers within `#application-form` carry no Umami-specific attributes (such as `data-umami-event`) or tracking event listeners.
3. **No Form Submission Tracking:** No custom form-submission events or completion milestones are configured in Umami for CARE CONNECT applications.
4. **Codebase and Endpoint Isolation:** The client-side form validation and submission logic in `care-connect/js/script.js` and the destination Google Apps Script backend remain completely uninstrumented and unmodified by the analytics implementation.

---

## 8. Privacy Notice and Sitewide Navigation

To ensure transparent public disclosure, Phase 3.7D introduced a dedicated privacy policy and sitewide navigation paths:

1. **Dedicated Privacy Page (`privacy.html`):**
   * Accessible at `https://racdurgapurcentralpresidency.github.io/privacy.html`.
   * Built with official RAC DCP visual branding (Deep Navy `#0b1f3a`, Brand Blue `#0876b9`, Accent Orange `#f5a623`).
   * Contains detailed disclosures across four sections: (1) About RAC DCP, (2) Website Analytics, (3) CARE CONNECT & Community Assistance, and (4) Contact.
   * Completely uninstrumented (zero analytics scripts).
2. **Root Pages Footer Integration:**
   * All six root pages (`index.html`, `our-work.html`, `recognition.html`, `ry-2023-24.html`, `ry-2024-25.html`, `ry-2025-26.html`) feature an accessible link in the `.footer-bottom` bar:
     ```html
     Part of Rotaract District 3240 &bull; <a href="privacy.html" class="footer-privacy-link" style="color: inherit; text-decoration: underline;">Privacy Policy &amp; Analytics Notice</a>
     ```
3. **CARE CONNECT Dual Navigation:**
   * `.footer-bottom-bar` provides links to both `Application Privacy Policy` (in-app modal) and `Website Privacy` (`../privacy.html`).
   * The in-app `#privacy-modal` includes an explicit cross-reference note directing visitors to the standalone Website Privacy Policy for web analytics details.

---

## 9. Live Verification Observations (17 November 2026)

Following deployment to GitHub Pages on 17 November 2026, an initial live functional verification was conducted across the production website and the Umami Cloud dashboard.

### A. Live Network Verification

| Verification Target | Test Method | HTTP Response | Result |
| :--- | :--- | :---: | :---: |
| **Tracking Script Delivery** | `https://cloud.umami.is/script.js` | `200 OK` | Script served successfully with active caching |
| **Telemetry Ingestion Endpoint** | `POST https://cloud.umami.is/api/send` | `200 OK` | Telemetry payload ingested successfully |

### B. Live Dashboard Verification Observation

During initial post-deployment testing on 17 November 2026, the Umami Cloud dashboard recorded:

| Dashboard Metric | Verified Value | Interpretive Nature |
| :--- | :---: | :--- |
| **Visitors** | 1 | Functional verification observation |
| **Visits** | 1 | Functional verification observation |
| **Pageviews** | 4 | Functional verification observation |

* **Important Data Integrity Clarification:**
  * These recorded figures represent a **point-in-time functional verification observation** confirming that telemetry beacons are successfully delivered and processed by Umami Cloud.
  * They do **NOT** represent an operational or representative traffic baseline for the RAC DCP website. Ongoing audience metrics will accumulate over time.

---

## 10. Known Technical Limitations

1. **Client-Side Ad-Blocking and Tracking Protection:** Privacy extensions (such as uBlock Origin, Privacy Badger, AdGuard) and built-in browser protections (such as Brave Shields, Safari Intelligent Tracking Prevention, and Firefox Enhanced Tracking Protection) may block requests to `cloud.umami.is`. Browser tracking protection, privacy extensions and network filtering may prevent some visits from being recorded. Consequently, dashboard figures may undercount actual website traffic.
2. **Initial Sample Size:** The 17 November 2026 verification data represents a test sample of 1 visitor and 4 pageviews, serving solely to confirm integration health.
3. **Approximate Geolocation:** Geographic metrics are derived at the ingestion edge from coarse IP blocks. Geolocation is approximate (typically limited to country or regional level) and lacks deterministic pinpoint precision.
4. **No Conversion or Asset Tracking:** Batch 1 deliberately excludes custom goals, link clicks, form submissions, and PDF downloads.

---

## 11. Maintenance and Governance Notes

1. **Configuration Stability:** The deployed script attributes (`data-website-id`, `data-domains`, `data-do-not-track`, `data-exclude-search`, `data-exclude-hash`) must not be modified or removed without prior governance review.
2. **Future Enhancements (Batch 2 Considerations):** Any future tracking enhancements (such as tracking publication PDF downloads or engagement milestones) require:
   * Explicit club leadership authorization.
   * Formal update to `privacy.html`.
   * Continued strict non-instrumentation of CARE CONNECT applicant inputs.
3. **Cross-Engine Context:** This document complements the existing search engine visibility baselines:
   * Google Search Console: `docs/seo/baseline-gsc-2026-10-18-to-2026-11-14.md`
   * Bing Webmaster Tools: `docs/seo/baseline-bing-2026.md`
