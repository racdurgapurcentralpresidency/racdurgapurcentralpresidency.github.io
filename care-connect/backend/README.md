# RAC DCP CARE CONNECT &mdash; Google Sheets Integration Guide

This guide connects all Care Connect website request submissions directly to your official Google Sheet:  
📊 **[Secretary Documents 2026-27](https://docs.google.com/spreadsheets/d/1M1PIsf5CTpsMzjVZmit2sStD7gFfPIY2aToMIHed6xg/edit)**  
📑 **Sheet Tab Name:** `Website Requests`

---

## ⚡ 2-Minute Setup Instructions

### Step 1: Open Apps Script inside Secretary Documents 2026-27
1. Open the spreadsheet in your browser:  
   👉 **[Secretary Documents 2026-27](https://docs.google.com/spreadsheets/d/1M1PIsf5CTpsMzjVZmit2sStD7gFfPIY2aToMIHed6xg/edit)**
2. In the top menu, click **Extensions** &rarr; **Apps Script**.
3. A new Apps Script editor tab will open.
4. Delete any default code in `Code.gs` and paste the entire code from [`care-connect/backend/Code.gs`](./Code.gs).
5. Click the **Save** icon (diskette icon) or press `Ctrl + S`.

---

### Step 2: One-Click Table & Column Creation
1. In the toolbar at the top of Apps Script, find the function dropdown (it usually says `myFunction` or `doGet`).
2. Select **`createWebsiteRequestsTable`**.
3. Click **Run**.
4. Google will ask for permission on your first run:
   - Click **Review permissions** &rarr; choose your account (`rcdurgapurpresidency.3240@gmail.com`).
   - Click **Advanced** (small link at bottom left) &rarr; **Go to Untitled project (unsafe)**.
   - Click **Allow**.
5. Return to your spreadsheet: **You will immediately see the new `Website Requests` tab created with all 18 formatted columns, deep navy header, dropdowns, and formatting!**

*(Optional test)*: In the Apps Script dropdown, select **`testAddSampleSubmission`** and click **Run** to see an immediate sample submission appear in the sheet!

---

### Step 3: Deploy as Web App for the Website
1. In the Apps Script editor, click the blue **Deploy** button (top right) &rarr; **New deployment**.
2. Click the gear icon next to *Select type* &rarr; choose **Web app**.
3. Fill in the fields:
   - **Description:** `RAC DCP Care Connect Web App`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone` *(Crucial: allows visitors on the website to submit forms)*
4. Click **Deploy**.
5. Copy the **Web App URL** generated (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 4: Link Web App to Website
1. Open `care-connect/js/script.js` in this repository.
2. Find line 33:
   ```javascript
   const CONFIG = {
       BACKEND_URL: '', // Paste your Web App URL here
   ```
3. Paste your Web App URL between the quotes:
   ```javascript
   const CONFIG = {
       BACKEND_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
   ```
4. Save and push to GitHub!

---

## 📋 Table Structure in "Website Requests"

| # | Column Header | Description |
|---|---|---|
| **A** | `Reference ID` | Unique ID format (`CCD-2026-XXXX`), bold centered |
| **B** | `Timestamp (IST)` | Indian Standard Time of submission |
| **C** | `Intent` | `Request Assistance` or `Collaborate With Us` |
| **D** | `Category` | Education, Healthcare, Food, NGO Collab, CSR, etc. |
| **E** | `Applicant / Contact Person` | Full name of applicant or representative |
| **F** | `Organisation / Entity Name` | Organisation name (or N/A for individuals) |
| **G** | `Mobile Number` | 10-digit phone number (plain text preserved) |
| **H** | `Email Address` | Email address (or N/A) |
| **I** | `Location / Locality` | City, District & State |
| **J** | `Applicant / Org Type` | Individual, Family, NGO, College, Corporate, etc. |
| **K** | `People Benefited` | Approximate beneficiary count |
| **L** | `Preferred Timeline / Urgency` | Flexible / Within 2-3 weeks / Urgent / Critical |
| **M** | `Requirement / Proposal Description` | Detailed description (with text wrapping) |
| **N** | `Resources / Support Offered` | Resources offered for collaboration |
| **O** | `Risk Score` | Anti-spam heuristic risk score (0 - 100) |
| **P** | `Risk Flags` | Bot detection flags or `CLEAN` |
| **Q** | `Review Status` | Interactive color-coded dropdown: *Pending Review, Under Ground Verification, Approved - Action In Progress, Collaboration Finalized, Closed / Completed, Declined / Ineligible* |
| **R** | `Board Remarks & Assigned Director` | Notes for board review & follow-ups |
