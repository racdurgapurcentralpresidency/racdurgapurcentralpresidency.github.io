# RAC DCP CARE CONNECT &mdash; Backend Deployment Guide

This directory contains the Google Apps Script backend code for **RAC DCP CARE CONNECT**.

With Google Apps Script, you can collect submissions directly into a dedicated **Google Sheet** without needing any paid server hosting or database fees.

---

## 🚀 3-Minute Setup Guide

### Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.google.com/) while logged into your official club Google account (`rcdurgapurpresidency.3240@gmail.com`).
2. Create a new spreadsheet named:  
   **`RAC DCP Care Connect Submissions`**

---

### Step 2: Open Google Apps Script
1. Inside your newly created Google Sheet, click **Extensions** in the top menu &rarr; **Apps Script**.
2. An Apps Script editor tab will open.
3. Rename the project to **`RAC DCP Care Connect Web App`** at the top left.
4. Replace all code in `Code.gs` with the complete contents of [`Code.gs`](./Code.gs) in this directory.

---

### Step 3: Deploy as Web App
1. In the Apps Script editor, click the blue **Deploy** button at the top right &rarr; **New deployment**.
2. Click the gear icon (**Select type**) &rarr; choose **Web app**.
3. Fill in the fields:
   - **Description**: `RAC DCP Care Connect Web App`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone` *(Crucial: allows visitors on the website to submit their requests)*
4. Click **Deploy**.
5. Google will ask you to **Authorize access**:
   - Click *Review permissions*.
   - Choose your Google account.
   - Click *Advanced* (small link at bottom left) &rarr; *Go to RAC DCP Care Connect Web App (unsafe)*.
   - Click *Allow*.
6. Copy the **Web App URL** provided (it looks like `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 4: Link Web App to Website
1. Open `care-connect/js/script.js` in this repository.
2. Find line 33:
   ```javascript
   const CONFIG = {
       BACKEND_URL: '', // Paste your Web App URL here
   ```
3. Paste your URL between the quotes:
   ```javascript
   const CONFIG = {
       BACKEND_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
   ```
4. Save and commit to GitHub!

---

## 📊 Features Included in Backend
- **Automatic Sheet & Header Setup**: When the first submission arrives, the script automatically formats 18 professional columns with club navy colors and fixed column widths.
- **Reference ID Tracking**: Maintains the official `CCD-YYYY-XXXX` format.
- **Automated Email Notifications**: Instantly sends an alert email to `rcdurgapurpresidency.3240@gmail.com` with applicant details and request summary.
- **Risk Score Highlighting**: Submissions flagged with a risk score &ge; 60 are automatically highlighted with a light red tint for board review.
- **Concurrency Protection**: Uses Google Apps Script `LockService` to prevent lost rows when multiple people submit at the same time.
