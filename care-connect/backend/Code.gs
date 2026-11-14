/**
 * ============================================================================
 * RAC DCP CARE CONNECT — GOOGLE APPS SCRIPT BACKEND
 * Rotaract Club of Durgapur Central Presidency | RI District 3240
 * ============================================================================
 * 
 * Instructions:
 * 1. Create a new Google Sheet (e.g. "RAC DCP Care Connect Submissions").
 * 2. In Google Sheets, click Extensions -> Apps Script.
 * 3. Delete any default code in Code.gs and paste this entire file.
 * 4. (Optional) Customize NOTIFICATION_EMAIL below if you'd like instant alerts.
 * 5. Click "Deploy" -> "New deployment".
 * 6. Select Type: "Web app".
 *    - Description: "RAC DCP Care Connect Web App"
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone" (allows submissions from website visitors)
 * 7. Click Deploy, Authorize access, and copy the Web App URL.
 * 8. Paste the Web App URL into `care-connect/js/script.js` (CONFIG.BACKEND_URL).
 * ============================================================================
 */

// Official notification email for club directors
var NOTIFICATION_EMAIL = "rcdurgapurpresidency.3240@gmail.com";
var SHEET_NAME = "Submissions";

/**
 * Handle HTTP GET requests (Health Check & API status)
 */
function doGet(e) {
  var response = {
    "status": "active",
    "service": "RAC DCP CARE CONNECT Dispatcher",
    "club": "Rotaract Club of Durgapur Central Presidency",
    "district": "Rotary International District 3240",
    "timestamp": new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle HTTP POST requests (Form Submissions)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 30 seconds for concurrent writes
  lock.tryLock(30000);

  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    // If sheet doesn't exist, create it and set up column headers
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      setupSheetHeaders(sheet);
    } else if (sheet.getLastRow() === 0) {
      setupSheetHeaders(sheet);
    }

    var refId = data.reference_id || ("CCD-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000));
    var submissionDate = data.formatted_date || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    var intent = data.intent === "assistance" ? "Request Assistance" : "Collaborate With Us";
    var category = data.category || "General";
    var name = data.name || "N/A";
    var phone = "'" + (data.phone || "N/A"); // Prefix with single quote to preserve 10-digit mobile number format
    var email = data.email || "N/A";
    var location = data.location || "N/A";
    var type = data.applicant_type || data.org_type || "N/A";
    var orgName = data.org_name || "N/A";
    var description = data.description || "N/A";
    var timeline = data.timeline || "N/A";
    var beneficiaries = data.beneficiaries || "N/A";
    var resourcesOffered = data.resources_offered || "N/A";
    var riskScore = data.risk_score !== undefined ? data.risk_score : 0;
    var riskFlags = data.risk_flags || "CLEAN";
    var status = "Pending Review";
    var boardRemarks = "";

    // Append new row to Google Sheet
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

    // Format new row colors and borders
    var newRow = sheet.getLastRow();
    if (riskScore >= 60) {
      // Highlight high risk rows in subtle orange/red
      sheet.getRange(newRow, 1, 1, 18).setBackground("#fee2e2");
    } else {
      sheet.getRange(newRow, 1, 1, 18).setBackground(newRow % 2 === 0 ? "#f8fafc" : "#ffffff");
    }

    // Send instant email notification to club directors (asynchronously safe)
    try {
      sendEmailNotification(data, refId);
    } catch (emailErr) {
      Logger.log("Email dispatch failed: " + emailErr.toString());
    }

    var result = {
      "status": "success",
      "reference_id": refId,
      "message": "Submission recorded successfully in RAC DCP Care Connect registry."
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("Error processing Care Connect submission: " + err.toString());
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
 * Configure and format professional header columns
 */
function setupSheetHeaders(sheet) {
  var headers = [
    "Reference ID",
    "Timestamp (IST)",
    "Intent",
    "Category",
    "Contact Person",
    "Organisation Name",
    "Phone Number",
    "Email Address",
    "Location",
    "Applicant / Org Type",
    "Beneficiaries",
    "Timeline / Urgency",
    "Description / Requirement",
    "Resources Offered",
    "Risk Score",
    "Risk Flags",
    "Review Status",
    "Board Remarks"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Style header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#0b1f3a");
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Arial");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);

  // Column width optimizations
  sheet.setColumnWidth(1, 150); // Reference ID
  sheet.setColumnWidth(2, 160); // Timestamp
  sheet.setColumnWidth(3, 160); // Intent
  sheet.setColumnWidth(4, 180); // Category
  sheet.setColumnWidth(5, 170); // Contact Person
  sheet.setColumnWidth(6, 180); // Org Name
  sheet.setColumnWidth(7, 130); // Phone
  sheet.setColumnWidth(8, 200); // Email
  sheet.setColumnWidth(9, 160); // Location
  sheet.setColumnWidth(10, 150); // Type
  sheet.setColumnWidth(11, 110); // Beneficiaries
  sheet.setColumnWidth(12, 160); // Timeline
  sheet.setColumnWidth(13, 350); // Description
  sheet.setColumnWidth(14, 250); // Resources
  sheet.setColumnWidth(15, 90);  // Risk Score
  sheet.setColumnWidth(16, 180); // Flags
  sheet.setColumnWidth(17, 130); // Status
  sheet.setColumnWidth(18, 200); // Remarks
}

/**
 * Send email notification to official club inbox
 */
function sendEmailNotification(data, refId) {
  if (!NOTIFICATION_EMAIL) return;

  var subject = "[CARE CONNECT] New " + (data.intent === "assistance" ? "Assistance Request" : "Collaboration Proposal") + " - " + refId;
  var body = 
    "Rotaract Club of Durgapur Central Presidency\n" +
    "RAC DCP CARE CONNECT — Official Notification\n\n" +
    "A new request has been submitted on the Care Connect portal:\n\n" +
    "--------------------------------------------------\n" +
    "Reference ID: " + refId + "\n" +
    "Date & Time:  " + (data.formatted_date || new Date().toISOString()) + "\n" +
    "Category:     " + (data.category || "General") + "\n" +
    "Name/Contact: " + (data.name || "N/A") + "\n" +
    "Phone Number: " + (data.phone || "N/A") + "\n" +
    "Email:        " + (data.email || "N/A") + "\n" +
    "Location:     " + (data.location || "N/A") + "\n" +
    "Timeline:     " + (data.timeline || "N/A") + "\n" +
    "Risk Score:   " + (data.risk_score || 0) + "/100 (" + (data.risk_flags || "CLEAN") + ")\n" +
    "--------------------------------------------------\n\n" +
    "Requirement Details:\n" +
    (data.description || "N/A") + "\n\n" +
    "Please open your Care Connect Google Sheet to review and assign for ground verification.\n\n" +
    "— RAC DCP CARE CONNECT Automated Dispatcher\n" +
    "Rotary International District 3240";

  MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
}
