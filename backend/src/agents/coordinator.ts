import Groq from 'groq-sdk';
import { getOAuth2ClientForUser } from '../services/oauth.service';
import prisma from '../config/db';

// Services
import * as gmailService from '../services/gmail.service';
import * as calendarService from '../services/calendar.service';
import * as sheetsService from '../services/sheets.service';
import * as driveService from '../services/drive.service';
import * as docsService from '../services/docs.service';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Define status logs structure
export interface ExecutionLog {
  id: string;
  status: 'info' | 'success' | 'error';
  message: string;
}

/**
 * Helper to build tool definitions for Gemini
 */
const workspaceTools = {
  functionDeclarations: [
    // --- GMAIL TOOLS ---
    {
      name: 'gmail_list_emails',
      description: 'List emails in the user\'s Gmail inbox, optionally filtered by search query.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          query: { type: 'STRING' as any, description: 'Query string (e.g., "is:unread category:primary")' },
          maxResults: { type: 'NUMBER' as any, description: 'Maximum number of emails to retrieve (default: 5)' }
        }
      }
    },
    {
      name: 'gmail_get_email_details',
      description: 'Retrieve full email details including headers and body text.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          id: { type: 'STRING' as any, description: 'The unique message ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'gmail_send_email',
      description: 'Compose and send a new email.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          to: { type: 'STRING' as any, description: 'Recipient email address' },
          subject: { type: 'STRING' as any, description: 'Email subject line' },
          body: { type: 'STRING' as any, description: 'HTML or plain text body content' },
          threadId: { type: 'STRING' as any, description: 'Optional thread ID to reply to an existing email thread' }
        },
        required: ['to', 'subject', 'body']
      }
    },
    {
      name: 'gmail_archive_email',
      description: 'Archive an email by removing it from the INBOX.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          id: { type: 'STRING' as any, description: 'The message ID to archive' }
        },
        required: ['id']
      }
    },
    {
      name: 'gmail_modify_email_labels',
      description: 'Modify labels on an email (e.g. archive it by removing INBOX or apply labels).',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          id: { type: 'STRING' as any, description: 'The unique message ID' },
          addLabelIds: {
            type: 'ARRAY' as any,
            description: 'Array of label IDs to add (e.g. STARRED, UNREAD, INBOX)',
            items: { type: 'STRING' as any }
          },
          removeLabelIds: {
            type: 'ARRAY' as any,
            description: 'Array of label IDs to remove',
            items: { type: 'STRING' as any }
          }
        },
        required: ['id', 'addLabelIds', 'removeLabelIds']
      }
    },

    // --- CALENDAR TOOLS ---
    {
      name: 'calendar_list_events',
      description: 'List calendar events for the user.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          timeMin: { type: 'STRING' as any, description: 'ISO date string for start window (default: now)' },
          timeMax: { type: 'STRING' as any, description: 'ISO date string for end window' },
          maxResults: { type: 'NUMBER' as any, description: 'Maximum events to return (default: 10)' }
        }
      }
    },
    {
      name: 'calendar_create_event',
      description: 'Schedule a new event on the user\'s primary calendar.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          summary: { type: 'STRING' as any, description: 'Event title' },
          location: { type: 'STRING' as any, description: 'Location of the event' },
          description: { type: 'STRING' as any, description: 'Event description' },
          startTime: { type: 'STRING' as any, description: 'ISO start date-time string (e.g. 2026-06-29T10:00:00Z)' },
          endTime: { type: 'STRING' as any, description: 'ISO end date-time string' },
          attendees: {
            type: 'ARRAY' as any,
            description: 'Array of attendee emails',
            items: { type: 'STRING' as any }
          }
        },
        required: ['summary', 'startTime', 'endTime']
      }
    },
    {
      name: 'calendar_update_event',
      description: 'Update/modify an existing calendar event details.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          eventId: { type: 'STRING' as any, description: 'The unique calendar event ID' },
          summary: { type: 'STRING' as any, description: 'Updated event title' },
          location: { type: 'STRING' as any, description: 'Updated event location' },
          description: { type: 'STRING' as any, description: 'Updated event description' },
          startTime: { type: 'STRING' as any, description: 'Updated ISO start date-time string' },
          endTime: { type: 'STRING' as any, description: 'Updated ISO end date-time string' },
          attendees: {
            type: 'ARRAY' as any,
            description: 'Updated array of attendee emails',
            items: { type: 'STRING' as any }
          }
        },
        required: ['eventId']
      }
    },
    {
      name: 'calendar_check_availability',
      description: 'Check availability/freebusy status for a time window.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          timeMin: { type: 'STRING' as any, description: 'ISO start date-time string' },
          timeMax: { type: 'STRING' as any, description: 'ISO end date-time string' }
        },
        required: ['timeMin', 'timeMax']
      }
    },
    {
      name: 'calendar_delete_event',
      description: 'Cancel/delete an event from the user\'s calendar.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          eventId: { type: 'STRING' as any, description: 'The unique event ID' }
        },
        required: ['eventId']
      }
    },

    // --- SHEETS TOOLS ---
    {
      name: 'sheets_create_spreadsheet',
      description: 'Create a brand new Google Spreadsheet.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          title: { type: 'STRING' as any, description: 'Spreadsheet title' }
        },
        required: ['title']
      }
    },
    {
      name: 'sheets_read_spreadsheet',
      description: 'Read cell data from a spreadsheet.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          spreadsheetId: { type: 'STRING' as any, description: 'ID of the spreadsheet' },
          range: { type: 'STRING' as any, description: 'A1 Range notation (e.g. "Sheet1!A1:D10")' }
        },
        required: ['spreadsheetId', 'range']
      }
    },
    {
      name: 'sheets_write_spreadsheet',
      description: 'Write/update cell data in a spreadsheet range.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          spreadsheetId: { type: 'STRING' as any, description: 'ID of the spreadsheet' },
          range: { type: 'STRING' as any, description: 'A1 Range notation (e.g. "Sheet1!A1:D10")' },
          values: {
            type: 'ARRAY' as any,
            description: '2D array of values to write',
            items: { type: 'ARRAY' as any, items: { type: 'STRING' as any } }
          }
        },
        required: ['spreadsheetId', 'range', 'values']
      }
    },
    {
      name: 'sheets_append_spreadsheet',
      description: 'Append rows/values to an existing spreadsheet.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          spreadsheetId: { type: 'STRING' as any, description: 'ID of the spreadsheet' },
          range: { type: 'STRING' as any, description: 'A1 Range notation (e.g. "Sheet1!A1")' },
          values: {
            type: 'ARRAY' as any,
            description: '2D array of values to append',
            items: { type: 'ARRAY' as any, items: { type: 'STRING' as any } }
          }
        },
        required: ['spreadsheetId', 'range', 'values']
      }
    },

    // --- DRIVE & DOCS TOOLS ---
    {
      name: 'drive_list_files',
      description: 'Search files and folders on Google Drive.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          query: { type: 'STRING' as any, description: 'Drive query string (e.g., "name contains \'report\' and mimeType = \'application/vnd.google-apps.spreadsheet\'")' },
          maxResults: { type: 'NUMBER' as any, description: 'Max search results' }
        }
      }
    },
    {
      name: 'drive_create_folder',
      description: 'Create a new folder in Google Drive.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          name: { type: 'STRING' as any, description: 'Folder name' },
          parentId: { type: 'STRING' as any, description: 'Optional parent folder ID' }
        },
        required: ['name']
      }
    },
    {
      name: 'drive_upload_file',
      description: 'Upload a file (text or binary content) to Google Drive.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          name: { type: 'STRING' as any, description: 'File name' },
          mimeType: { type: 'STRING' as any, description: 'Mime type of the file (e.g. text/plain, text/html)' },
          content: { type: 'STRING' as any, description: 'File content string' },
          parentId: { type: 'STRING' as any, description: 'Optional parent folder ID' }
        },
        required: ['name', 'mimeType', 'content']
      }
    },
    {
      name: 'drive_delete_file',
      description: 'Delete/remove a file or folder from Google Drive.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          fileId: { type: 'STRING' as any, description: 'The unique file or folder ID' }
        },
        required: ['fileId']
      }
    },
    {
      name: 'docs_create_document',
      description: 'Create a new Google Document.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          title: { type: 'STRING' as any, description: 'Document title' }
        },
        required: ['title']
      }
    },
    {
      name: 'docs_get_document_text',
      description: 'Fetch the text content of a Google Document.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          documentId: { type: 'STRING' as any, description: 'The unique document ID' }
        },
        required: ['documentId']
      }
    },
    {
      name: 'docs_append_text',
      description: 'Append text/paragraphs to the end of an existing Google Document.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          documentId: { type: 'STRING' as any, description: 'The unique document ID' },
          text: { type: 'STRING' as any, description: 'The content string to append' }
        },
        required: ['documentId', 'text']
      }
    },

    // --- TASK MANAGER TOOLS ---
    {
      name: 'tasks_list_pending',
      description: 'List user tasks stored in the assistant database.',
      parameters: { type: 'OBJECT' as any, properties: {} }
    },
    {
      name: 'tasks_create_task',
      description: 'Create a new task reminder in the database.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          title: { type: 'STRING' as any, description: 'Task title' },
          priority: { type: 'STRING' as any, description: 'Priority level: high, medium, low' },
          dueDate: { type: 'STRING' as any, description: 'ISO date string' }
        },
        required: ['title']
      }
    },
    {
      name: 'tasks_complete_task',
      description: 'Mark a specific task as completed or incomplete.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          taskId: { type: 'STRING' as any, description: 'ID of the task' },
          completed: { type: 'BOOLEAN' as any, description: 'Completion status' }
        },
        required: ['taskId', 'completed']
      }
    },

    // --- MEMORY SYSTEM TOOLS ---
    {
      name: 'memory_get_preference',
      description: 'Retrieve user preferences or stored details by key.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          key: { type: 'STRING' as any, description: 'The preference key' }
        },
        required: ['key']
      }
    },
    {
      name: 'memory_set_preference',
      description: 'Store a user preference or detail in persistent memory.',
      parameters: {
        type: 'OBJECT' as any,
        properties: {
          key: { type: 'STRING' as any, description: 'The preference key' },
          value: { type: 'STRING' as any, description: 'The value to associate with key' }
        },
        required: ['key', 'value']
      }
    }
  ]
};

/**
 * Dynamic adapter to convert Gemini workspace tool definitions into Groq/OpenAI compatible tools format.
 * Dynamically filters tools to respect Groq free tier token rate limits (TPM).
 */
function getGroqTools(userMessage: string, recentHistory: any[] = []) {
  // Combine userMessage with history to detect intent contextually
  const contextText = (userMessage + ' ' + recentHistory.map(h => h.content || '').join(' ')).toLowerCase();

  const hasKeywords = (keywords: string[]) => keywords.some(k => contextText.includes(k));

  const isGmail = hasKeywords(['email', 'mail', 'gmail', 'inbox', 'unread', 'send', 'reply', 'message', 'thread']);
  const isCalendar = hasKeywords(['calendar', 'meeting', 'schedule', 'event', 'appointment', 'slot', 'date', 'time', 'free', 'busy', 'availability']);
  const isSheets = hasKeywords(['sheet', 'spreadsheet', 'excel', 'row', 'column', 'cell']);
  const isDrive = hasKeywords(['drive', 'folder', 'file', 'upload', 'delete', 'download']);
  const isDocs = hasKeywords(['document', 'doc', 'text', 'paragraph', 'write', 'append']);
  const isTasks = hasKeywords(['task', 'todo', 'checklist', 'remind', 'reminder', 'pending']);
  const isMemory = hasKeywords(['remember', 'preference', 'habit', 'interest', 'profile', 'saved', 'memory', 'forget']);

  const filteredDecls = workspaceTools.functionDeclarations.filter(decl => {
    const name = decl.name;
    if (name.startsWith('gmail_')) return isGmail;
    if (name.startsWith('calendar_')) return isCalendar;
    if (name.startsWith('sheets_')) return isSheets;
    if (name.startsWith('drive_')) return isDrive;
    if (name.startsWith('docs_')) return isDocs;
    if (name.startsWith('tasks_')) return isTasks;
    if (name.startsWith('memory_')) return isMemory;
    return true;
  });

  // Default baseline if no matches found
  let finalDecls = filteredDecls;
  if (finalDecls.length === 0) {
    finalDecls = workspaceTools.functionDeclarations.filter(decl => 
      decl.name.startsWith('memory_') || decl.name.startsWith('tasks_') || decl.name.startsWith('gmail_')
    );
  }

  return finalDecls.map(decl => {
    const properties: any = {};
    if (decl.parameters && decl.parameters.properties) {
      for (const [key, prop] of Object.entries(decl.parameters.properties as any)) {
        const typedProp = prop as any;
        properties[key] = {
          type: typedProp.type.toLowerCase(),
          description: typedProp.description
        };
        if (typedProp.items) {
          properties[key].items = {
            type: typedProp.items.type.toLowerCase()
          };
        }
      }
    }

    return {
      type: 'function' as const,
      function: {
        name: decl.name,
        description: decl.description,
        parameters: decl.parameters ? {
          type: decl.parameters.type.toLowerCase(),
          properties,
          required: decl.parameters.required
        } : undefined
      }
    };
  });
}

/**
 * Coordinator class managing Groq/Llama tool-execution loop
 */
export class AgentCoordinator {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Run one interaction session
   */
  async chat(userMessage: string, history: any[] = []): Promise<{ response: string; logs: ExecutionLog[] }> {
    const logs: ExecutionLog[] = [];
    const addLog = (status: 'info' | 'success' | 'error', message: string) => {
      logs.push({ id: Math.random().toString(36).substring(7), status, message });
    };

    addLog('info', 'Analyzing prompt intent');

    // 1. Fetch user memory for system injection
    let systemInstruction = `You are JARVIS AI, a futuristic and cinematic Personal Executive Assistant.
Your core directive is to help the user manage Gmail, Google Calendar, Sheets, Docs, and Google Drive.
Respond in a premium, elegant, concise tone. Use Markdown formatting.
Always explain the actions you took clearly in your final response.`;

    try {
      const memories = await prisma.memory.findMany({ where: { userId: this.userId } });
      if (memories.length > 0) {
        systemInstruction += '\n\nHere are some stored user preferences and patterns:\n';
        memories.forEach(m => {
          systemInstruction += `- ${m.key}: ${m.value}\n`;
        });
      }
    } catch (e) {
      console.error('Failed to load user memory:', e);
    }

    // 2. Fetch Google Client
    let oauth2Client;
    try {
      oauth2Client = await getOAuth2ClientForUser(this.userId);
      addLog('success', 'Google Workspace connected');
    } catch (err) {
      addLog('error', 'Google Authentication needed. Please log in.');
      return {
        response: 'Google authorization is required to access your workspace. Please connect your Google account in Settings.',
        logs
      };
    }

    // 3. Setup Groq Client
    const groq = new Groq({ apiKey: GROQ_API_KEY });

    // Format chat history for Groq
    const messages: any[] = [];
    
    // Add system instruction
    messages.push({
      role: 'system',
      content: systemInstruction
    });

    // Add past history (limit to last 6 messages for token savings)
    const recentHistory = history.slice(-6);
    recentHistory.forEach(h => {
      messages.push({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content
      });
    });

    // Add current user prompt
    messages.push({
      role: 'user',
      content: userMessage
    });

    let currentResponseText = '';
    let loopCount = 0;
    const maxLoops = 5;

    // Start communication loop
    while (loopCount < maxLoops) {
      loopCount++;
      
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools: getGroqTools(userMessage, recentHistory),
        tool_choice: 'auto'
      });

      const choice = completion.choices[0];
      const message = choice.message;

      // Add assistant response to messages history
      messages.push(message);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        // No functions to call, we have the final output
        currentResponseText = message.content || 'Process complete.';
        break;
      }

      // We have tool calls, execute them
      for (const toolCall of message.tool_calls) {
        const name = toolCall.function.name;
        addLog('info', `Executing tool: ${name}`);

        let toolResult: any;
        let args: any = {};
        try {
          args = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {
          console.error('Failed to parse tool arguments:', e);
        }

        try {
          switch (name) {
            // --- GMAIL ---
            case 'gmail_list_emails':
              addLog('info', 'Gmail: Searching messages...');
              toolResult = await gmailService.listEmails(oauth2Client, args.query, args.maxResults);
              addLog('success', `Gmail: Found ${toolResult.length} emails`);
              break;

            case 'gmail_get_email_details':
              addLog('info', 'Gmail: Reading full content...');
              toolResult = await gmailService.getEmailDetails(oauth2Client, args.id);
              addLog('success', 'Gmail: Read email successfully');
              break;

            case 'gmail_send_email':
              addLog('info', `Gmail: Sending email to ${args.to}...`);
              toolResult = await gmailService.sendEmail(oauth2Client, args.to, args.subject, args.body, args.threadId);
              addLog('success', `Gmail: Email sent to ${args.to}`);
              break;

            case 'gmail_archive_email':
              addLog('info', 'Gmail: Archiving email...');
              toolResult = await gmailService.archiveEmail(oauth2Client, args.id);
              addLog('success', 'Gmail: Email archived');
              break;

            case 'gmail_modify_email_labels':
              addLog('info', 'Gmail: Modifying labels...');
              toolResult = await gmailService.modifyEmailLabels(oauth2Client, args.id, args.addLabelIds, args.removeLabelIds);
              addLog('success', 'Gmail: Email labels modified');
              break;

            // --- CALENDAR ---
            case 'calendar_list_events':
              addLog('info', 'Calendar: Listing events...');
              toolResult = await calendarService.listEvents(oauth2Client, args.timeMin, args.timeMax, args.maxResults);
              addLog('success', `Calendar: Found ${toolResult.length} events`);
              break;

            case 'calendar_create_event':
              addLog('info', `Calendar: Scheduling "${args.summary}"...`);
              const attendeesList = args.attendees ? args.attendees.map((email: string) => ({ email })) : undefined;
              toolResult = await calendarService.createEvent(oauth2Client, {
                summary: args.summary,
                location: args.location,
                description: args.description,
                start: { dateTime: args.startTime },
                end: { dateTime: args.endTime },
                attendees: attendeesList
              });
              addLog('success', `Calendar: Scheduled "${args.summary}"`);
              break;

            case 'calendar_delete_event':
              addLog('info', 'Calendar: Deleting event...');
              await calendarService.deleteEvent(oauth2Client, args.eventId);
              toolResult = { status: 'deleted' };
              addLog('success', 'Calendar: Event deleted');
              break;

            case 'calendar_update_event':
              addLog('info', `Calendar: Updating event "${args.eventId}"...`);
              const updateAttendeesList = args.attendees ? args.attendees.map((email: string) => ({ email })) : undefined;
              toolResult = await calendarService.updateEvent(oauth2Client, args.eventId, {
                summary: args.summary,
                location: args.location,
                description: args.description,
                start: args.startTime ? { dateTime: args.startTime } : undefined,
                end: args.endTime ? { dateTime: args.endTime } : undefined,
                attendees: updateAttendeesList
              });
              addLog('success', `Calendar: Updated event details`);
              break;

            case 'calendar_check_availability':
              addLog('info', `Calendar: Checking availability between ${args.timeMin} and ${args.timeMax}...`);
              const available = await calendarService.checkAvailability(oauth2Client, args.timeMin, args.timeMax);
              toolResult = { available };
              addLog('success', `Calendar: Availability checked - ${available ? 'FREE' : 'BUSY'}`);
              break;

            // --- SHEETS ---
            case 'sheets_create_spreadsheet':
              addLog('info', `Sheets: Creating spreadsheet "${args.title}"...`);
              toolResult = await sheetsService.createSpreadsheet(oauth2Client, args.title);
              addLog('success', `Sheets: Spreadsheet created: "${args.title}"`);
              break;

            case 'sheets_read_spreadsheet':
              addLog('info', 'Sheets: Reading rows...');
              toolResult = await sheetsService.readSpreadsheet(oauth2Client, args.spreadsheetId, args.range);
              addLog('success', `Sheets: Retrieved ${toolResult.length} rows`);
              break;

            case 'sheets_write_spreadsheet':
              addLog('info', 'Sheets: Updating range values...');
              toolResult = await sheetsService.writeSpreadsheet(oauth2Client, args.spreadsheetId, args.range, args.values);
              addLog('success', 'Sheets: Spreadsheet updated');
              break;

            case 'sheets_append_spreadsheet':
              addLog('info', 'Sheets: Appending rows...');
              toolResult = await sheetsService.appendSpreadsheet(oauth2Client, args.spreadsheetId, args.range, args.values);
              addLog('success', 'Sheets: Rows appended successfully');
              break;

            // --- DRIVE & DOCS ---
            case 'drive_list_files':
              addLog('info', 'Drive: Searching files...');
              toolResult = await driveService.listFiles(oauth2Client, args.query, args.maxResults);
              addLog('success', `Drive: Found ${toolResult.length} items`);
              break;

            case 'drive_create_folder':
              addLog('info', `Drive: Creating folder "${args.name}"...`);
              toolResult = await driveService.createFolder(oauth2Client, args.name, args.parentId);
              addLog('success', `Drive: Folder created successfully`);
              break;

            case 'drive_upload_file':
              addLog('info', `Drive: Uploading file "${args.name}"...`);
              toolResult = await driveService.uploadFile(oauth2Client, args.name, args.mimeType, args.content, args.parentId);
              addLog('success', `Drive: File uploaded successfully`);
              break;

            case 'drive_delete_file':
              addLog('info', `Drive: Deleting file "${args.fileId}"...`);
              await driveService.deleteFile(oauth2Client, args.fileId);
              toolResult = { status: 'deleted' };
              addLog('success', `Drive: File deleted successfully`);
              break;

            case 'docs_create_document':
              addLog('info', `Docs: Creating document "${args.title}"...`);
              toolResult = await docsService.createDocument(oauth2Client, args.title);
              addLog('success', `Docs: Created document "${args.title}"`);
              break;

            case 'docs_get_document_text':
              addLog('info', 'Docs: Fetching document body text...');
              toolResult = await docsService.getDocumentText(oauth2Client, args.documentId);
              addLog('success', 'Docs: Read document body');
              break;

            case 'docs_append_text':
              addLog('info', `Docs: Appending text to document...`);
              toolResult = await docsService.appendDocumentText(oauth2Client, args.documentId, args.text);
              addLog('success', `Docs: Text appended successfully`);
              break;

            // --- LOCAL TASKS ---
            case 'tasks_list_pending':
              addLog('info', 'Tasks: Reading pending checklist...');
              toolResult = await prisma.task.findMany({
                where: { userId: this.userId, completed: false },
                orderBy: { createdAt: 'desc' }
              });
              addLog('success', `Tasks: Loaded ${toolResult.length} tasks`);
              break;

            case 'tasks_create_task':
              addLog('info', 'Tasks: Inserting task...');
              toolResult = await prisma.task.create({
                data: {
                  userId: this.userId,
                  title: args.title,
                  priority: args.priority || 'medium',
                  dueDate: args.dueDate ? new Date(args.dueDate) : null
                }
              });
              addLog('success', `Tasks: Added "${args.title}"`);
              break;

            case 'tasks_complete_task':
              addLog('info', 'Tasks: Modifying complete state...');
              toolResult = await prisma.task.update({
                where: { id: args.taskId },
                data: { completed: args.completed }
              });
              addLog('success', 'Tasks: Marked complete');
              break;

            // --- MEMORY SYSTEM ---
            case 'memory_get_preference':
              addLog('info', `Memory: Retrieving key "${args.key}"`);
              const mem = await prisma.memory.findUnique({
                where: { userId_key: { userId: this.userId, key: args.key } }
              });
              toolResult = mem ? { key: args.key, value: mem.value } : { key: args.key, value: 'None' };
              addLog('success', 'Memory: Found preference');
              break;

            case 'memory_set_preference':
              addLog('info', `Memory: Updating key "${args.key}"`);
              toolResult = await prisma.memory.upsert({
                where: { userId_key: { userId: this.userId, key: args.key } },
                update: { value: args.value },
                create: { userId: this.userId, key: args.key, value: args.value }
              });
              addLog('success', `Memory: Preference saved: "${args.key}"`);
              break;

            default:
              throw new Error(`Tool ${name} is not implemented`);
          }
        } catch (error: any) {
          console.error(`Error executing tool ${name}:`, error);
          toolResult = { error: error.message || 'Unknown tool execution failure' };
          addLog('error', `Tool error: ${name} failed - ${error.message || 'Unknown error'}`);
        }

        // Add tool response to message list
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name,
          content: JSON.stringify({ result: toolResult })
        });
      }
    }

    addLog('success', 'Action complete');

    // 4. Save Conversation Logs in DB
    try {
      // Save User Message
      await prisma.chatHistory.create({
        data: { userId: this.userId, role: 'user', content: userMessage }
      });
      // Save Assistant Message
      await prisma.chatHistory.create({
        data: {
          userId: this.userId,
          role: 'model',
          content: currentResponseText,
          toolsCalled: JSON.stringify(logs.filter(l => l.status === 'success').map(l => l.message))
        }
      });
    } catch (dbErr) {
      console.error('Failed to log chat in DB:', dbErr);
    }

    return {
      response: currentResponseText,
      logs
    };
  }
}
