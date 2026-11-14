/**
 * ============================================================================
 * RAC DCP CARE CONNECT — GOOGLE APPS SCRIPT WEB APP & DISPATCHER
 * Connected Spreadsheet: Secretary Documents 2026-27
 * Sheet Tab Name: "Website Requests"
 * Rotaract Club of Durgapur Central Presidency | RI District 3240
 * ============================================================================
 * 
 * Target Google Sheet:
 * Name: Secretary Documents 2026-27
 * URL: https://docs.google.com/spreadsheets/d/1M1PIsf5CTpsMzjVZmit2sStD7gFfPIY2aToMIHed6xg/edit
 * Sheet Tab: "Website Requests"
 * 
 * QUICK SETUP INSTRUCTIONS:
 * 1. Open the spreadsheet: https://docs.google.com/spreadsheets/d/1M1PIsf5CTpsMzjVZmit2sStD7gFfPIY2aToMIHed6xg/edit
 * 2. In Google Sheets top menu, click Extensions -> Apps Script.
 * 3. Delete any default code in Code.gs and paste this entire file.
 * 4. To instantly create the "Website Requests" tab with all 18 formatted columns and dropdowns:
 *    - In the toolbar dropdown select: "createWebsiteRequestsTable"
 *    - Click "Run" (Authorize permissions once when prompted).
 * 5. To deploy the live Web App for the website:
 *    - Click "Deploy" (top right) -> "New deployment".
 *    - Click the Gear icon (Select type) -> "Web app".
 *    - Description: "RAC DCP Care Connect Web App"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (allows form submissions from visitors)
 *    - Click "Deploy" and copy the Web App URL.
 * 6. Paste your Web App URL into `care-connect/js/script.js` (CONFIG.BACKEND_URL).
 * ============================================================================
 */

// Target Spreadsheet ID & Sheet Configuration
var TARGET_SPREADSHEET_ID = "1M1PIsf5CTpsMzjVZmit2sStD7gFfPIY2aToMIHed6xg";
var TARGET_SHEET_NAME = "Website Requests";

// Club Notification Email for instant alerts
var NOTIFICATION_EMAIL = "rcdurgapurpresidency.3240@gmail.com";

/**
 * Helper: Safely open the target spreadsheet by ID or active context
 */
function getTargetSpreadsheet() {
  if (TARGET_SPREADSHEET_ID && TARGET_SPREADSHEET_ID.trim() !== "") {
    try {
      return SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    } catch (err) {
      Logger.log("Failed to open by ID, falling back to active spreadsheet: " + err.toString());
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * ONE-CLICK SETUP FUNCTION:
 * Run this function from the Apps Script editor to create the "Website Requests" tab
 * with formatted columns, styling, dropdown validation, and column widths.
 */
function createWebsiteRequestsTable() {
  var ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName(TARGET_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(TARGET_SHEET_NAME);
    Logger.log("Created new sheet tab: " + TARGET_SHEET_NAME);
  } else {
    Logger.log("Configuring existing sheet tab: " + TARGET_SHEET_NAME);
  }

  setupTableColumnsAndFormatting(sheet);
  Logger.log("Website Requests table and columns created successfully!");
}

/**
 * Handle HTTP GET requests (Health Check & API status)
 */
function doGet(e) {
  var response = {
    "status": "active",
    "service": "RAC DCP CARE CONNECT Dispatcher",
    "club": "Rotaract Club of Durgapur Central Presidency",
    "district": "Rotary International District 3240",
    "spreadsheet_id": TARGET_SPREADSHEET_ID,
    "sheet_tab": TARGET_SHEET_NAME,
    "timestamp": new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle HTTP POST requests (Submissions from care-connect website form)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 30 seconds for concurrent writes
  lock.tryLock(30000);

  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    var ss = getTargetSpreadsheet();
    var sheet = ss.getSheetByName(TARGET_SHEET_NAME);

    // If sheet doesn't exist or is blank, initialize columns
    if (!sheet) {
      sheet = ss.insertSheet(TARGET_SHEET_NAME);
      setupTableColumnsAndFormatting(sheet);
    } else if (sheet.getLastRow() === 0) {
      setupTableColumnsAndFormatting(sheet);
    }

    // Extract payload fields
    var refId = data.reference_id || ("CCD-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000));
    var submissionDate = data.formatted_date || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    var intent = data.intent === "assistance" ? "Request Assistance" : "Collaborate With Us";
    var category = data.category || "General";
    var name = data.name || "N/A";
    var orgName = data.org_name || "N/A";
    var phone = "'" + (data.phone || "N/A"); // Prefix with ' to preserve plain-text 10-digit mobile number
    var email = data.email || "N/A";
    var location = data.location || "N/A";
    var type = data.applicant_type || data.org_type || "N/A";
    var beneficiaries = data.beneficiaries || "N/A";
    var timeline = data.timeline || "N/A";
    var description = data.description || "N/A";
    var resourcesOffered = data.resources_offered || "N/A";
    var riskScore = data.risk_score !== undefined ? data.risk_score : 0;
    var riskFlags = data.risk_flags || "CLEAN";
    var status = "Pending Review";
    var boardRemarks = "";

    // Append submission row
    sheet.appendRow([
      refId,
      submissionDate,
      intent,
      category,
      name,
      orgName,
      phone,
      email,
      location,
      type,
      beneficiaries,
      timeline,
      description,
      resourcesOffered,
      riskScore,
      riskFlags,
      status,
      boardRemarks
    ]);

    var newRow = sheet.getLastRow();

    // Style the new row
    var rowRange = sheet.getRange(newRow, 1, 1, 18);
    rowRange.setVerticalAlignment("middle");
    rowRange.setFontFamily("Arial");
    rowRange.setFontSize(10);
    sheet.setRowHeight(newRow, 28);

    // Center specific columns
    sheet.getRange(newRow, 1).setHorizontalAlignment("center").setFontWeight("bold"); // Reference ID
    sheet.getRange(newRow, 2).setHorizontalAlignment("center"); // Timestamp
    sheet.getRange(newRow, 7).setHorizontalAlignment("center"); // Phone
    sheet.getRange(newRow, 11).setHorizontalAlignment("center"); // Beneficiaries
    sheet.getRange(newRow, 15).setHorizontalAlignment("center"); // Risk Score
    sheet.getRange(newRow, 17).setHorizontalAlignment("center"); // Review Status

    // Background tinting
    if (riskScore >= 60) {
      rowRange.setBackground("#fee2e2"); // Light red alert for high risk spam
    } else {
      rowRange.setBackground(newRow % 2 === 0 ? "#f8fafc" : "#ffffff");
    }

    // Send email alert to official club inbox
    try {
      sendEmailNotification(data, refId);
    } catch (emailErr) {
      Logger.log("Email dispatch failed: " + emailErr.toString());
    }

    var result = {
      "status": "success",
      "reference_id": refId,
      "message": "Submission successfully logged into Website Requests sheet."
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("Error in doPost: " + err.toString());
    var errorResult = {
      "status": "error",
      "message": err.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

/**
 * Configure 18 table columns, styling, column widths, and dropdown data validation
 */
function setupTableColumnsAndFormatting(sheet) {
  var headers = [
    "Reference ID",
    "Timestamp (IST)",
    "Intent",
    "Category",
    "Applicant / Contact Person",
    "Organisation / Entity Name",
    "Mobile Number",
    "Email Address",
    "Location / Locality",
    "Applicant / Org Type",
    "People Benefited",
    "Preferred Timeline / Urgency",
    "Requirement / Proposal Description",
    "Resources / Support Offered",
    "Risk Score",
    "Risk Flags",
    "Review Status",
    "Board Remarks & Assigned Director"
  ];

  // Write header row
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Style header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#0b1f3a"); // RAC DCP Deep Navy
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Arial");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  headerRange.setWrap(false);

  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);

  // Column width optimizations (px)
  sheet.setColumnWidth(1, 140); // Reference ID
  sheet.setColumnWidth(2, 165); // Timestamp (IST)
  sheet.setColumnWidth(3, 150); // Intent
  sheet.setColumnWidth(4, 190); // Category
  sheet.setColumnWidth(5, 180); // Contact Person
  sheet.setColumnWidth(6, 180); // Org Name
  sheet.setColumnWidth(7, 130); // Mobile Number
  sheet.setColumnWidth(8, 200); // Email Address
  sheet.setColumnWidth(9, 170); // Location
  sheet.setColumnWidth(10, 150); // Type
  sheet.setColumnWidth(11, 110); // People Benefited
  sheet.setColumnWidth(12, 160); // Timeline / Urgency
  sheet.setColumnWidth(13, 360); // Description
  sheet.setColumnWidth(14, 250); // Resources Offered
  sheet.setColumnWidth(15, 90);  // Risk Score
  sheet.setColumnWidth(16, 180); // Risk Flags
  sheet.setColumnWidth(17, 170); // Review Status
  sheet.setColumnWidth(18, 240); // Board Remarks

  // Wrap text for description and remarks
  sheet.getRange("M:M").setWrap(true);
  sheet.getRange("N:N").setWrap(true);
  sheet.getRange("R:R").setWrap(true);

  // Format Mobile Number column as plain text to prevent leading zero loss
  sheet.getRange("G:G").setNumberFormat("@");

  // Setup Data Validation Dropdown for Review Status (Column 17, Q2:Q1000)
  var statusOptions = [
    "Pending Review",
    "Under Ground Verification",
    "Approved - Action In Progress",
    "Collaboration Finalized",
    "Closed / Completed",
    "Declined / Ineligible"
  ];
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(statusOptions, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 17, 999, 1).setDataValidation(statusRule);

  // Conditional formatting for Review Status colors
  var statusRange = sheet.getRange("Q2:Q1000");
  var rules = sheet.getConditionalFormatRules() || [];

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Pending Review")
    .setBackground("#fef3c7")
    .setFontColor("#92400e")
    .setRanges([statusRange])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Under Ground Verification")
    .setBackground("#e0f2fe")
    .setFontColor("#0369a1")
    .setRanges([statusRange])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Approved - Action In Progress")
    .setBackground("#d1fae5")
    .setFontColor("#065f46")
    .setRanges([statusRange])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Collaboration Finalized")
    .setBackground("#ede9fe")
    .setFontColor("#5b21b6")
    .setRanges([statusRange])
    .build());

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Declined / Ineligible")
    .setBackground("#ffe4e6")
    .setFontColor("#9f1239")
    .setRanges([statusRange])
    .build());

  sheet.setConditionalFormatRules(rules);
}

/**
 * Send email notification to official club inbox
 */
function sendEmailNotification(data, refId) {
  if (!NOTIFICATION_EMAIL) return;

  var isAssistance = data.intent === "assistance";
  var subject = "[CARE CONNECT] New " + (isAssistance ? "Assistance Request" : "Collaboration Proposal") + " - " + refId;

  var body = 
    "Rotaract Club of Durgapur Central Presidency\n" +
    "RAC DCP CARE CONNECT — Official Notification\n\n" +
    "A new request has been submitted on the Care Connect portal and logged into Secretary Documents 2026-27:\n\n" +
    "--------------------------------------------------\n" +
    "Reference ID:  " + refId + "\n" +
    "Timestamp:     " + (data.formatted_date || new Date().toISOString()) + "\n" +
    "Type:          " + (isAssistance ? "Request Assistance" : "Collaboration Proposal") + "\n" +
    "Category:      " + (data.category || "General") + "\n" +
    "Contact Person: " + (data.name || "N/A") + "\n" +
    "Organisation:  " + (data.org_name || "N/A") + "\n" +
    "Mobile Number: " + (data.phone || "N/A") + "\n" +
    "Email Address: " + (data.email || "N/A") + "\n" +
    "Location:      " + (data.location || "N/A") + "\n" +
    "Timeline:      " + (data.timeline || "N/A") + "\n" +
    "Risk Score:    " + (data.risk_score || 0) + "/100 (" + (data.risk_flags || "CLEAN") + ")\n" +
    "--------------------------------------------------\n\n" +
    "Requirement Details:\n" +
    (data.description || "N/A") + "\n\n" +
    (data.resources_offered && data.resources_offered !== "N/A" ? ("Resources Offered:\n" + data.resources_offered + "\n\n") : "") +
    "View & Review in Google Sheet:\n" +
    "https://docs.google.com/spreadsheets/d/1M1PIsf5CTpsMzjVZmit2sStD7gFfPIY2aToMIHed6xg/edit\n\n" +
    "— RAC DCP CARE CONNECT Automated Dispatcher\n" +
    "Rotary International District 3240";

  MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
}

/**
 * OPTIONAL TEST FUNCTION:
 * Run this from Apps Script editor to add a sample row and verify everything works!
 */
function testAddSampleSubmission() {
  var sampleData = {
    postData: {
      contents: JSON.stringify({
        reference_id: "CCD-2026-TEST01",
        formatted_date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        intent: "assistance",
        category: "Education Support",
        name: "Test Community Applicant",
        phone: "9876543210",
        email: "test@example.com",
        location: "City Centre, Durgapur",
        applicant_type: "Individual",
        beneficiaries: "1",
        timeline: "Within 2-3 weeks",
        description: "Sample test request from RAC DCP Care Connect automated test runner.",
        resources_offered: "N/A",
        risk_score: 5,
        risk_flags: "CLEAN, GENUINE_HUMAN_PACE"
      })
    }
  };
  doPost(sampleData);
  Logger.log("Test submission added successfully! Check your 'Website Requests' tab.");
}
