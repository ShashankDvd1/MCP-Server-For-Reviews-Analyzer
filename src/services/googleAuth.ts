import { google } from 'googleapis';
import { env } from '../utils/env';

const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  // Redirect URI is not strictly needed for offline refresh token usage
  'http://localhost' 
);

oauth2Client.setCredentials({
  refresh_token: env.GOOGLE_REFRESH_TOKEN,
});

export const getGoogleAuth = () => oauth2Client;
export const docs = google.docs({ version: 'v1', auth: oauth2Client });
export const drive = google.drive({ version: 'v3', auth: oauth2Client });
export const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
export const forms = google.forms({ version: 'v1', auth: oauth2Client });
export const slides = google.slides({ version: 'v1', auth: oauth2Client });
