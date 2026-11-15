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
var FEEDBACK_SHEET_NAME = "Website Feedback";

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
 * Formula Injection (CSV / Sheets Injection) Sanitizer:
 * Any cell value starting with '=', '+', '-', or '@' can execute as a dynamic formula
 * in Google Sheets or Excel. Prefixing with a single quote (') forces Google Sheets
 * to interpret and store the content strictly as literal plain text.
 */
function sanitizeFormulaInjection(val) {
  if (val === null || val === undefined) return "N/A";
  var str = String(val);
  var trimmed = str.trim();
  if (trimmed.length > 0) {
    var firstChar = trimmed.charAt(0);
    if (firstChar === "=" || firstChar === "+" || firstChar === "-" || firstChar === "@") {
      // If it doesn't already start with a single quote, prefix it
      if (str.charAt(0) !== "'") {
        return "'" + str;
      }
    }
  }
  return str;
}

/**
 * Handle HTTP GET requests (Health Check & API status)
 * Note: Sensitive details like spreadsheet_id are strictly excluded to protect internal assets.
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
 * ============================================================================
 * ENHANCED MULTILINGUAL SPAM & ABUSE INSPECTION ENGINE
 * Language coverage: English, Hindi (Devanagari + Hinglish), Bengali (Bengali + Banglish)
 * Policy: Never delete flagged comments/submissions. Preserves all data,
 * assigns high risk score, appends explicit flags, highlights in alert tint (#fee2e2),
 * and marks review status as "Flagged: Spam / Abusive" for club manual review.
 * ============================================================================
 */
function inspectMultilingualSpamAndAbuse(content) {
  if (!content) {
    return { isAbusive: false, isSpam: false, isFlagged: false, flags: [], score: 0 };
  }

  var text = String(content).toLowerCase();
  var flags = [];
  var isAbusive = false;
  var isSpam = false;
  var score = 0;

  // 1. English Profanity, Slurs & Toxic Language (with word boundaries)
  var enProfanities = [
    /\b(fuck|fucking|fucked|fucker|fck|f\*ck|f\*\*k)\b/i,
    /\b(bitch|bitches|b\*tch|b\!tch)\b/i,
    /\b(shit|bullshit|sh\*t)\b/i,
    /\b(asshole|arsehole|bastard|cunt|dick|dickhead|pussy|motherfucker|motherfucking)\b/i,
    /\b(cock|cocksucker|wanker|prick|whore|slut|faggot|fag|nigger|nigga|retard)\b/i,
    /\b(kill\s+yourself|go\s+die)\b/i
  ];
  for (var i = 0; i < enProfanities.length; i++) {
    if (enProfanities[i].test(text)) {
      isAbusive = true;
      if (flags.indexOf("ABUSIVE_LANG_EN") === -1) flags.push("ABUSIVE_LANG_EN");
      score = Math.max(score, 90);
    }
  }

  // 2. Hindi Profanity (Devanagari Script & Hinglish Transliteration)
  var hiDevWords = [
    "मादरचोद", "मादरचোদ", "भोसड़ी", "भोसडी", "भोसड़ीके", "भोसडीके", "गांडू", "गांडु",
    "चूतिया", "चूतिये", "चूत", "लौड़ा", "लौडे", "लौड़े", "लौडा", "रांड", "रंडी",
    "हरामी", "कमीने", "कमीना", "दल्ले", "दल्ला", "छिछोरे", "टट्टी", "झांट", "झाटू",
    "कुतिया", "बहनचोद", "बेटीचोद", "लंड", "बकचोद", "मादरजात"
  ];
  for (var j = 0; j < hiDevWords.length; j++) {
    if (text.indexOf(hiDevWords[j]) !== -1) {
      isAbusive = true;
      if (flags.indexOf("ABUSIVE_LANG_HI_DEV") === -1) flags.push("ABUSIVE_LANG_HI_DEV");
      score = Math.max(score, 95);
    }
  }
  if (/(?:^|[^\u0900-\u097F])(गांड|कुत्ता|साले|साला)(?:$|[^\u0900-\u097F])/i.test(text)) {
    isAbusive = true;
    if (flags.indexOf("ABUSIVE_LANG_HI_DEV") === -1) flags.push("ABUSIVE_LANG_HI_DEV");
    score = Math.max(score, 85);
  }

  var hiHinglishRegexes = [
    /\b(madarchod|madarchot|bhosdike|bhosadike|bhosdi|bhosada|bhenchod|behenchod|banchod)\b/i,
    /\b(gaand|gandu|gaandu|chutiya|chutiye|chutya|lauda|loda|lavda|chut|choot|randi|raand)\b/i,
    /\b(harami|kamine|kamina|dalle|dalla|tatti|jhaant|jhant|bakchod|madarjaat|bkl|mkc|bsdk|tmkc)\b/i,
    /\b(teri\s+maa\s+ki|tere\s+baap\s+ka|maa\s+ki\s+chut|chod\s+dunga)\b/i
  ];
  for (var k = 0; k < hiHinglishRegexes.length; k++) {
    if (hiHinglishRegexes[k].test(text)) {
      isAbusive = true;
      if (flags.indexOf("ABUSIVE_LANG_HI_ROMAN") === -1) flags.push("ABUSIVE_LANG_HI_ROMAN");
      score = Math.max(score, 95);
    }
  }

  // 3. Bengali Profanity (Bengali Script & Banglish Transliteration)
  var bnScriptWords = [
    "মাদারচোদ", "মাডারচোদ", "বোকাচোদা", "চোদা", "চোদনা", "চুদি", "চুদা",
    "খানকি", "খানকির", "মাগী", "মাগির", "ভোদাই", "বালছাল", "গাঁড়ু", "গাঁড়",
    "গাড়মারানি", "হারামজাদা", "হারামখোর", "শুয়োরের বাচ্চা", "বেশ্যা", "নটী",
    "লেবড়া", "কুত্তার বাচ্চা", "পোদমারানি", "বেজন্মা", "চোদানির"
  ];
  for (var m = 0; m < bnScriptWords.length; m++) {
    if (text.indexOf(bnScriptWords[m]) !== -1) {
      isAbusive = true;
      if (flags.indexOf("ABUSIVE_LANG_BN_SCRIPT") === -1) flags.push("ABUSIVE_LANG_BN_SCRIPT");
      score = Math.max(score, 95);
    }
  }
  if (/(?:^|[^\u0980-\u09FF])(বাল|কুত্তা|কুত্তি|শালা|শালি|পোদ|খচ্চর)(?:$|[^\u0980-\u09FF])/i.test(text)) {
    isAbusive = true;
    if (flags.indexOf("ABUSIVE_LANG_BN_SCRIPT") === -1) flags.push("ABUSIVE_LANG_BN_SCRIPT");
    score = Math.max(score, 85);
  }

  var bnBanglishRegexes = [
    /\b(madarchod|bokachoda|boka\s+choda|choda|chudi|chodna|khanki|khankir\s+pola|khankir\s+chele)\b/i,
    /\b(magir\s+pola|bhodai|balchal|bal\s+chhal|gaadmarani|haramzada|haramkhor)\b/i,
    /\b(shukorer\s+bachha|suorer\s+baccha|kuttar\s+bachha|podmarani|bejonma|chodanir)\b/i
  ];
  for (var n = 0; n < bnBanglishRegexes.length; n++) {
    if (bnBanglishRegexes[n].test(text)) {
      isAbusive = true;
      if (flags.indexOf("ABUSIVE_LANG_BN_ROMAN") === -1) flags.push("ABUSIVE_LANG_BN_ROMAN");
      score = Math.max(score, 95);
    }
  }

  // 4. Commercial Spam, Scams & Unsolicited Links
  var spamPatterns = [
    /\b(casino|viagra|crypto|free\s+bitcoin|forex\s+trading|escort\s+service|call\s+girls|porn|xxx)\b/i,
    /\b(backlink|seo\s+ranking|guest\s+post|buy\s+followers|guaranteed\s+profit|earn\s+money\s+fast)\b/i,
    /\b(loan\s+without\s+cibil|telegram\s+@|whatsapp\s+\+)/i
  ];
  for (var p = 0; p < spamPatterns.length; p++) {
    if (spamPatterns[p].test(text)) {
      isSpam = true;
      if (flags.indexOf("SPAM_SOLICITATION_KEYWORDS") === -1) flags.push("SPAM_SOLICITATION_KEYWORDS");
      score = Math.max(score, 75);
    }
  }

  // 5. Repetitive Gibberish Pattern (e.g. aaaaaaa or asdfasdfasdf)
  if (/(.)\1{6,}/.test(text)) {
    isSpam = true;
    if (flags.indexOf("REPETITIVE_CHAR_SEQUENCE") === -1) flags.push("REPETITIVE_CHAR_SEQUENCE");
    score = Math.max(score, 60);
  }

  return {
    isAbusive: isAbusive,
    isSpam: isSpam,
    isFlagged: (isAbusive || isSpam),
    flags: flags,
    score: score
  };
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

    // Check if this submission is Website Feedback
    var isFeedback = (
      data.intent === "website_feedback" ||
      data.intent === "feedback" ||
      data.target_sheet === "Website Feedback" ||
      data.sheet_name === "Website Feedback" ||
      data.sheet === "Website Feedback" ||
      data.action === "feedback" ||
      (data.reference_id && String(data.reference_id).indexOf("WFB-") === 0)
    );

    if (isFeedback) {
      return handleWebsiteFeedbackSubmission(ss, data);
    }

    var sheet = ss.getSheetByName(TARGET_SHEET_NAME);

    // If sheet doesn't exist or is blank, initialize columns
    if (!sheet) {
      sheet = ss.insertSheet(TARGET_SHEET_NAME);
      setupTableColumnsAndFormatting(sheet);
    } else if (sheet.getLastRow() === 0) {
      setupTableColumnsAndFormatting(sheet);
    }

    // Extract & sanitize payload fields (Formula Injection Defense)
    var refId = sanitizeFormulaInjection(data.reference_id || ("CCD-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000)));
    var submissionDate = sanitizeFormulaInjection(data.formatted_date || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
    var intent = sanitizeFormulaInjection(data.intent === "assistance" ? "Request Assistance" : "Collaborate With Us");
    var category = sanitizeFormulaInjection(data.category || "General");
    var name = sanitizeFormulaInjection(data.name || "N/A");
    var orgName = sanitizeFormulaInjection(data.org_name || "N/A");
    var rawPhone = String(data.phone || "N/A").trim();
    var phone = rawPhone.charAt(0) === "'" ? rawPhone : ("'" + rawPhone); // Prefix with ' to preserve plain-text and neutralize leading +
    var email = sanitizeFormulaInjection(data.email || "N/A");
    var location = sanitizeFormulaInjection(data.location || "N/A");
    var type = sanitizeFormulaInjection(data.applicant_type || data.org_type || "N/A");
    var beneficiaries = sanitizeFormulaInjection(data.beneficiaries || "N/A");
    var timeline = sanitizeFormulaInjection(data.timeline || "N/A");
    var description = sanitizeFormulaInjection(data.description || "N/A");
    var resourcesOffered = sanitizeFormulaInjection(data.resources_offered || "N/A");
    var riskScore = data.risk_score !== undefined ? data.risk_score : 0;
    var riskFlags = sanitizeFormulaInjection(data.risk_flags || "CLEAN");
    var status = "Pending Review";
    var boardRemarks = "";

    // Run Enhanced Multilingual Spam & Abuse Inspection (English, Hindi, Bengali)
    var scanTarget = [name, orgName, email, location, description, resourcesOffered].join(" ");
    var mod = inspectMultilingualSpamAndAbuse(scanTarget);

    var isFlaggedSpamOrAbuse = (
      mod.isFlagged ||
      riskScore >= 60 ||
      (riskFlags && (riskFlags.indexOf("ABUSIVE") !== -1 || riskFlags.indexOf("HONEYPOT") !== -1 || riskFlags.indexOf("SPAM") !== -1)) ||
      (data.review_status && data.review_status.indexOf("Flagged") !== -1)
    );

    if (isFlaggedSpamOrAbuse) {
      riskScore = Math.max(riskScore, mod.score, 85);
      var combinedFlags = [];
      if (riskFlags && riskFlags !== "CLEAN") {
        combinedFlags.push(riskFlags);
      }
      mod.flags.forEach(function (f) {
        if (combinedFlags.indexOf(f) === -1) combinedFlags.push(f);
      });
      riskFlags = combinedFlags.join(", ");
      status = "Flagged: Spam / Abusive";
      boardRemarks = "[SYSTEM MODERATION ALERT: Preserved for manual review. Flagged for suspected " +
        (mod.isAbusive ? "abusive/profane language" : "automated spam / bot activity") + "]";
    }

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
    "Declined / Ineligible",
    "Flagged: Spam / Abusive"
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
    .whenTextEqualTo("Flagged: Spam / Abusive")
    .setBackground("#fee2e2")
    .setFontColor("#991b1b")
    .setRanges([statusRange])
    .build());

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
  var isFlagged = (
    data.review_status === "Flagged: Spam / Abusive" ||
    (data.risk_score && data.risk_score >= 60) ||
    (data.risk_flags && (data.risk_flags.indexOf("ABUSIVE") !== -1 || data.risk_flags.indexOf("HONEYPOT") !== -1 || data.risk_flags.indexOf("SPAM") !== -1))
  );

  var subject = (isFlagged ? "[FLAGGED SPAM/ABUSE - MANUAL REVIEW] " : "[CARE CONNECT] ") +
    "New " + (isAssistance ? "Assistance Request" : "Collaboration Proposal") + " - " + refId;

  var body = 
    "Rotaract Club of Durgapur Central Presidency\n" +
    "RAC DCP CARE CONNECT — Official Notification\n\n" +
    (isFlagged ? "⚠️ MODERATION NOTICE: This submission has been flagged as potential SPAM or ABUSIVE content.\nPer policy, it has NOT been deleted, but preserved and quarantined for manual review in Google Sheets.\n\n" : "") +
    "A new request has been submitted on the Care Connect portal and logged into Secretary Documents 2026-27:\n\n" +
    "--------------------------------------------------\n" +
    "Reference ID:  " + refId + "\n" +
    "Timestamp:     " + (data.formatted_date || new Date().toISOString()) + "\n" +
    "Review Status: " + (isFlagged ? "Flagged: Spam / Abusive" : "Pending Review") + "\n" +
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
 * ONE-CLICK SETUP FUNCTION FOR WEBSITE FEEDBACK:
 * Run this function from the Apps Script editor to create the "Website Feedback" tab
 * with formatted columns, styling, dropdown validation, and column widths.
 */
function createWebsiteFeedbackTable() {
  var ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName(FEEDBACK_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(FEEDBACK_SHEET_NAME);
    Logger.log("Created new sheet tab: " + FEEDBACK_SHEET_NAME);
  } else {
    Logger.log("Configuring existing sheet tab: " + FEEDBACK_SHEET_NAME);
  }

  setupFeedbackTableColumnsAndFormatting(sheet);
  Logger.log("Website Feedback table and columns created successfully!");
}

/**
 * Handle Website Feedback Submissions (Dispatched from index.html feedback portal)
 */
function handleWebsiteFeedbackSubmission(ss, data) {
  var sheet = ss.getSheetByName(FEEDBACK_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(FEEDBACK_SHEET_NAME);
    setupFeedbackTableColumnsAndFormatting(sheet);
  } else if (sheet.getLastRow() === 0) {
    setupFeedbackTableColumnsAndFormatting(sheet);
  }

  // Extract & sanitize payload fields (Formula Injection Defense)
  var refId = sanitizeFormulaInjection(data.reference_id || ("WFB-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000)));
  var submissionDate = sanitizeFormulaInjection(data.formatted_date || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  var rating = data.rating || "5";
  var starsDisplay = sanitizeFormulaInjection(rating + " " + "★".repeat(parseInt(rating, 10) || 5));
  var sentiment = sanitizeFormulaInjection(data.sentiment || "Exceptional & Inspiring!");
  var focusTags = sanitizeFormulaInjection(data.tags || data.category || "General Feedback");
  var visitorName = sanitizeFormulaInjection(data.name || "Anonymous Visitor");
  var visitorRole = sanitizeFormulaInjection(data.role || "Community Guest");
  var visitorEmail = sanitizeFormulaInjection(data.email || "N/A");
  var message = sanitizeFormulaInjection(data.message || data.description || "N/A");
  var deviceInfo = sanitizeFormulaInjection(data.device_info || "Desktop / Mobile Web");
  var reviewStatus = "New Feedback";

  // Run Enhanced Multilingual Spam & Abuse Inspection (English, Hindi, Bengali)
  var combinedFeedbackText = [visitorName, visitorEmail, message].join(" ");
  var mod = inspectMultilingualSpamAndAbuse(combinedFeedbackText);

  var isFlaggedFeedback = (
    mod.isFlagged ||
    (data.risk_score !== undefined && data.risk_score >= 60) ||
    (data.risk_flags && (data.risk_flags.indexOf("ABUSIVE") !== -1 || data.risk_flags.indexOf("HONEYPOT") !== -1 || data.risk_flags.indexOf("SPAM") !== -1)) ||
    (data.review_status && data.review_status.indexOf("Flagged") !== -1)
  );

  if (isFlaggedFeedback) {
    reviewStatus = "Flagged: Spam / Abusive";
    var detectedFlags = [];
    if (data.risk_flags && data.risk_flags !== "CLEAN_FEEDBACK") {
      detectedFlags.push(data.risk_flags);
    }
    mod.flags.forEach(function (f) {
      if (detectedFlags.indexOf(f) === -1) detectedFlags.push(f);
    });
    focusTags = sanitizeFormulaInjection("[FLAGGED: " + (detectedFlags.join(", ") || "SPAM_OR_ABUSE") + "] " + focusTags);
  }

  // Append row (DO NOT DELETE: stored safely for manual review)
  sheet.appendRow([
    refId,
    submissionDate,
    starsDisplay,
    sentiment,
    focusTags,
    visitorName,
    visitorRole,
    visitorEmail,
    message,
    deviceInfo,
    reviewStatus
  ]);

  var newRow = sheet.getLastRow();
  var rowRange = sheet.getRange(newRow, 1, 1, 11);
  rowRange.setVerticalAlignment("middle");
  rowRange.setFontFamily("Arial");
  rowRange.setFontSize(10);
  sheet.setRowHeight(newRow, 28);

  // Center alignments
  sheet.getRange(newRow, 1).setHorizontalAlignment("center").setFontWeight("bold");
  sheet.getRange(newRow, 2).setHorizontalAlignment("center");
  sheet.getRange(newRow, 3).setHorizontalAlignment("center").setFontWeight("bold");
  sheet.getRange(newRow, 11).setHorizontalAlignment("center");

  // Visual alert highlighting for flagged comments
  if (isFlaggedFeedback) {
    rowRange.setBackground("#fee2e2"); // Light red alert tint
    sheet.getRange(newRow, 11).setFontColor("#991b1b").setFontWeight("bold");
  } else {
    rowRange.setBackground(newRow % 2 === 0 ? "#f8fafc" : "#ffffff");
  }

  // Send email alert to official club inbox if flagged for manual review
  if (isFlaggedFeedback && NOTIFICATION_EMAIL) {
    try {
      var alertSubject = "[WEBSITE FEEDBACK - FLAGGED SPAM/ABUSE] Manual Review Needed - " + refId;
      var alertBody =
        "Rotaract Club of Durgapur Central Presidency\n" +
        "Website Feedback — Automated Moderation Alert\n\n" +
        "⚠️ A feedback submission has been marked as potentially SPAM or ABUSIVE.\n" +
        "Per club policy, it has NOT been deleted. It has been recorded in the 'Website Feedback' tab for manual review.\n\n" +
        "Feedback ID:      " + refId + "\n" +
        "Timestamp:        " + submissionDate + "\n" +
        "Visitor Name:     " + visitorName + "\n" +
        "Email:            " + visitorEmail + "\n" +
        "Rating:           " + rating + " Stars (" + sentiment + ")\n" +
        "Moderation Flags: " + (mod.flags.join(", ") || data.risk_flags || "SUSPECTED_ABUSE") + "\n\n" +
        "Comment Text:\n" + message + "\n\n" +
        "Review in Google Sheets:\n" +
        "https://docs.google.com/spreadsheets/d/1M1PIsf5CTpsMzjVZmit2sStD7gFfPIY2aToMIHed6xg/edit\n\n" +
        "— RAC DCP Automated Moderation Engine\n";
      MailApp.sendEmail(NOTIFICATION_EMAIL, alertSubject, alertBody);
    } catch (emailErr) {
      Logger.log("Feedback alert email failed: " + emailErr.toString());
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    "status": "success",
    "reference_id": refId,
    "review_status": reviewStatus,
    "message": "Website feedback successfully recorded in Google Sheets."
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Configure 11 columns for the "Website Feedback" table
 */
function setupFeedbackTableColumnsAndFormatting(sheet) {
  var headers = [
    "Feedback ID",
    "Timestamp (IST)",
    "Rating (Stars)",
    "Sentiment",
    "Focus Areas / Tags",
    "Visitor Name",
    "Visitor Role",
    "Email Address",
    "Feedback Message",
    "Device / Platform",
    "Review Status"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#0b2e21"); // RAC DCP Forest Navy
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Arial");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");

  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);

  var widths = [130, 160, 110, 190, 220, 170, 160, 190, 360, 160, 160];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  // Wrap feedback message column
  sheet.getRange("I:I").setWrap(true);

  // Dropdown for Review Status (includes 'Flagged: Spam / Abusive' for manual review)
  var statusOptions = [
    "New Feedback",
    "Reviewed",
    "Action Item",
    "Compliment",
    "Addressed",
    "Flagged: Spam / Abusive"
  ];
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(statusOptions, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("K2:K500").setDataValidation(statusRule);

  // Conditional formatting for Review Status colors in Feedback sheet
  var feedbackStatusRange = sheet.getRange("K2:K500");
  var feedbackRules = sheet.getConditionalFormatRules() || [];

  feedbackRules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Flagged: Spam / Abusive")
    .setBackground("#fee2e2")
    .setFontColor("#991b1b")
    .setRanges([feedbackStatusRange])
    .build());

  feedbackRules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("New Feedback")
    .setBackground("#fef3c7")
    .setFontColor("#92400e")
    .setRanges([feedbackStatusRange])
    .build());

  feedbackRules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Reviewed")
    .setBackground("#d1fae5")
    .setFontColor("#065f46")
    .setRanges([feedbackStatusRange])
    .build());

  feedbackRules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Action Item")
    .setBackground("#e0f2fe")
    .setFontColor("#0369a1")
    .setRanges([feedbackStatusRange])
    .build());

  sheet.setConditionalFormatRules(feedbackRules);
}

/**
 * OPTIONAL TEST FUNCTIONS:
 * Run these from Apps Script editor to add sample rows and verify everything works!
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

function testAddSampleAbusiveRequest() {
  var sampleAbusive = {
    postData: {
      contents: JSON.stringify({
        reference_id: "CCD-2026-MODTEST",
        formatted_date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        intent: "assistance",
        category: "Community Welfare",
        name: "Abusive Tester",
        phone: "9876543210",
        email: "spamtest@example.com",
        location: "Durgapur",
        description: "This is a test with bad word: madarchod and spam crypto casino.",
        risk_score: 0,
        risk_flags: "CLEAN"
      })
    }
  };
  doPost(sampleAbusive);
  Logger.log("Sample abusive test submission added! Check that it is flagged in red and marked 'Flagged: Spam / Abusive'.");
}

function testAddSampleAbusiveFeedback() {
  var sampleAbusiveFeedback = {
    postData: {
      contents: JSON.stringify({
        reference_id: "WFB-2026-MODTEST",
        formatted_date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        intent: "website_feedback",
        target_sheet: "Website Feedback",
        rating: "1",
        name: "Angry Spammer",
        email: "troll@example.com",
        message: "You guys are bokachoda and mc, join my free crypto casino at https://spam.xyz"
      })
    }
  };
  doPost(sampleAbusiveFeedback);
  Logger.log("Sample abusive feedback added! Check 'Website Feedback' tab to see it quarantined in red for manual review.");
}
