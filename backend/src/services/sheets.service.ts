import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Creates a new spreadsheet and returns its details
 */
export async function createSpreadsheet(auth: OAuth2Client, title: string): Promise<{ id: string; url: string }> {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title
      }
    }
  });

  const id = response.data.spreadsheetId || '';
  const url = response.data.spreadsheetUrl || '';

  return { id, url };
}

/**
 * Read values from a spreadsheet range (e.g. "Sheet1!A1:D10")
 */
export async function readSpreadsheet(
  auth: OAuth2Client,
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  });

  return response.data.values || [];
}

/**
 * Write values to a spreadsheet range
 */
export async function writeSpreadsheet(
  auth: OAuth2Client,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values
    }
  });

  return response.data;
}

/**
 * Append rows of values to a sheet
 */
export async function appendSpreadsheet(
  auth: OAuth2Client,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values
    }
  });

  return response.data;
}

/**
 * Retrieve spreadsheet metadata, lists sheet names
 */
export async function getSpreadsheetMetadata(
  auth: OAuth2Client,
  spreadsheetId: string
): Promise<{ title: string; sheets: string[] }> {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.get({
    spreadsheetId
  });

  const title = response.data.properties?.title || 'Untitled Spreadsheet';
  const sheetsList = response.data.sheets?.map(s => s.properties?.title || '') || [];

  return { title, sheets: sheetsList.filter(Boolean) };
}
