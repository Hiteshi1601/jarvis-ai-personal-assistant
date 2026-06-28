import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface CalendarEvent {
  id?: string;
  summary: string;
  location?: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
}

/**
 * List events within a specific time window
 */
export async function listEvents(
  auth: OAuth2Client,
  timeMin = new Date().toISOString(),
  timeMax?: string,
  maxResults = 10
): Promise<CalendarEvent[]> {
  const calendar = google.calendar({ version: 'v3', auth });
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    ...(timeMax && { timeMax }),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime'
  });

  const items = response.data.items || [];
  return items.map(item => ({
    id: item.id || undefined,
    summary: item.summary || 'No Title',
    location: item.location || undefined,
    description: item.description || undefined,
    start: {
      dateTime: item.start?.dateTime || undefined,
      date: item.start?.date || undefined,
      timeZone: item.start?.timeZone || undefined
    },
    end: {
      dateTime: item.end?.dateTime || undefined,
      date: item.end?.date || undefined,
      timeZone: item.end?.timeZone || undefined
    },
    attendees: item.attendees?.map(att => ({ email: att.email || '' }))
  }));
}

/**
 * Create a new calendar event
 */
export async function createEvent(
  auth: OAuth2Client,
  eventData: CalendarEvent
): Promise<CalendarEvent> {
  const calendar = google.calendar({ version: 'v3', auth });
  
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: eventData.summary,
      location: eventData.location,
      description: eventData.description,
      start: eventData.start,
      end: eventData.end,
      attendees: eventData.attendees
    }
  });

  const item = response.data;
  return {
    id: item.id || undefined,
    summary: item.summary || '',
    location: item.location || undefined,
    description: item.description || undefined,
    start: {
      dateTime: item.start?.dateTime || undefined,
      date: item.start?.date || undefined
    },
    end: {
      dateTime: item.end?.dateTime || undefined,
      date: item.end?.date || undefined
    }
  };
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(
  auth: OAuth2Client,
  eventId: string,
  eventData: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const calendar = google.calendar({ version: 'v3', auth });
  
  // Fetch existing event first to merge
  const existing = await calendar.events.get({
    calendarId: 'primary',
    eventId
  });

  const merged = {
    ...existing.data,
    summary: eventData.summary ?? existing.data.summary,
    location: eventData.location ?? existing.data.location,
    description: eventData.description ?? existing.data.description,
    start: eventData.start ?? existing.data.start,
    end: eventData.end ?? existing.data.end,
    attendees: eventData.attendees ?? existing.data.attendees
  };

  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId,
    requestBody: merged
  });

  const item = response.data;
  return {
    id: item.id || undefined,
    summary: item.summary || '',
    location: item.location || undefined,
    description: item.description || undefined,
    start: {
      dateTime: item.start?.dateTime || undefined,
      date: item.start?.date || undefined
    },
    end: {
      dateTime: item.end?.dateTime || undefined,
      date: item.end?.date || undefined
    }
  };
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(auth: OAuth2Client, eventId: string): Promise<void> {
  const calendar = google.calendar({ version: 'v3', auth });
  await calendar.events.delete({
    calendarId: 'primary',
    eventId
  });
}

/**
 * Check user free/busy status
 */
export async function checkAvailability(
  auth: OAuth2Client,
  timeMin: string,
  timeMax: string
): Promise<boolean> {
  const calendar = google.calendar({ version: 'v3', auth });
  
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: 'primary' }]
    }
  });

  const busyTimes = response.data.calendars?.['primary']?.busy || [];
  return busyTimes.length === 0;
}
