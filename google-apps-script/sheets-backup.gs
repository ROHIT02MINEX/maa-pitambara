/**
 * Google Sheets backup endpoint for the Maa Pitambra ITI Skill Portal.
 *
 * ---------------------------------------------------------------------------
 * SETUP (about 3 minutes, no API keys or service accounts needed)
 * ---------------------------------------------------------------------------
 * 1. Create a new Google Sheet. Name the first tab "Results".
 * 2. Extensions → Apps Script. Delete the placeholder and paste this file.
 * 3. Edit SHARED_SECRET below to any long random string of your choosing.
 * 4. Deploy → New deployment → type "Web app".
 *      Execute as:        Me
 *      Who has access:    Anyone
 *    ("Anyone" is required because the portal's server calls it without a
 *     Google login. The SHARED_SECRET is what actually protects it.)
 * 5. Copy the Web app URL, then set these in the portal's environment:
 *      GOOGLE_SHEETS_WEBHOOK_URL="<the /exec URL>"
 *      GOOGLE_SHEETS_SHARED_SECRET="<the same secret as below>"
 *
 * Re-deploy as a NEW VERSION after any edit, or the old code keeps running.
 * ---------------------------------------------------------------------------
 */

var SHARED_SECRET = 'change-me-to-a-long-random-string';
var SHEET_NAME = 'Results';

var HEADERS = [
  'Test ID', 'Name', 'Email', 'Phone', 'Occupation',
  'Score', 'Out Of', 'Percentage', 'Correct', 'Wrong', 'Unanswered',
  'Time Taken', 'Status', 'Submitted At', 'Backed Up At',
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'Empty request body' });
    }

    var payload = JSON.parse(e.postData.contents);

    if (SHARED_SECRET && payload.secret !== SHARED_SECRET) {
      return json({ ok: false, error: 'Unauthorised' });
    }

    var rows = payload.rows;
    if (!rows || !rows.length) return json({ ok: true, written: 0 });

    var sheet = getSheet();
    var existing = existingTestIds(sheet);
    var toAppend = [];
    var now = new Date();

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      // Idempotent: re-running a full sync must not duplicate rows.
      if (existing[r.testId]) continue;
      existing[r.testId] = true;

      toAppend.push([
        r.testId, r.name, r.email, r.phone, r.occupation,
        r.score, r.totalQuestions, r.percentage, r.correct, r.wrong, r.unanswered,
        r.timeTaken, r.status, r.submittedAt, now,
      ]);
    }

    if (toAppend.length) {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, toAppend.length, HEADERS.length)
        .setValues(toAppend);
    }

    return json({ ok: true, written: toAppend.length, skipped: rows.length - toAppend.length });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** Lets you confirm the deployment is reachable from a browser. */
function doGet() {
  return json({ ok: true, service: 'Maa Pitambra ITI — results backup' });
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function existingTestIds(sheet) {
  var lastRow = sheet.getLastRow();
  var seen = {};
  if (lastRow < 2) return seen;

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0]) seen[ids[i][0]] = true;
  }
  return seen;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
