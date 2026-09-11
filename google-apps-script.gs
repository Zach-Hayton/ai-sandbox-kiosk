/**
 * AI Sandbox check-in receiver for Google Sheets.
 * Bind this script to the Sheet that should receive submissions.
 */

const SHEET_NAME = 'Check-ins';
const HEADERS = ['Timestamp', 'Baylor Email', 'Name', 'Purpose', 'Station', 'Kiosk ID', 'User Agent'];

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    validatePayload_(payload);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
    ensureHeaders_(sheet);
    sheet.appendRow([
      new Date(payload.timestamp || Date.now()),
      clean_(payload.email, 160),
      clean_(payload.name, 80),
      clean_(payload.purpose, 100),
      clean_(payload.station, 4),
      clean_(payload.kioskId, 60),
      clean_(payload.userAgent, 500)
    ]);

    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function validatePayload_(payload) {
  if (!payload.email || !/@baylor\.edu$/i.test(String(payload.email))) throw new Error('A Baylor email is required.');
  if (!payload.purpose) throw new Error('Purpose is required.');
  if (!['1', '2', '3', '4'].includes(String(payload.station))) throw new Error('A valid station is required.');
}

function clean_(value, maxLength) {
  const text = String(value || '').trim().slice(0, maxLength);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() !== 0) return;
  sheet.appendRow(HEADERS);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
