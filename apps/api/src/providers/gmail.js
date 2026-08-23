import { google } from 'googleapis';

function client(credentials) {
  return new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, `${process.env.API_URL || 'http://localhost:4100'}/api/auth/gmail/callback`);
}
function decode(value = '') { return Buffer.from(value, 'base64url').toString('utf8'); }
function headers(parts = []) { return Object.fromEntries(parts.map((part) => [part.mimeType, part.body?.data ? decode(part.body.data) : ''])); }
function flatten(part, all = []) { all.push(part); (part.parts || []).forEach((child) => flatten(child, all)); return all; }

export const gmailProvider = {
  authorizationUrl(state) { return client().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: ['https://www.googleapis.com/auth/gmail.readonly'], state }); },
  async exchange(code) { const { tokens } = await client().getToken(code); return { ...tokens, expires_at: tokens.expiry_date }; },
  async refresh(tokens) { const auth = client(); auth.setCredentials(tokens); await auth.getAccessToken(); return { ...auth.credentials, expires_at: auth.credentials.expiry_date }; },
  async identity(tokens) { const auth = client(); auth.setCredentials(tokens); const profile = await google.gmail({ version: 'v1', auth }).users.getProfile({ userId: 'me' }); return profile.data.emailAddress; },
  async listMessages(tokens, after) {
    const auth = client(); auth.setCredentials(tokens); const api = google.gmail({ version: 'v1', auth });
    const { data } = await api.users.messages.list({ userId: 'me', q: after ? `after:${Math.floor(new Date(after).getTime() / 1000)}` : '', maxResults: 50 });
    return Promise.all((data.messages || []).map(async ({ id }) => this.getMessage(tokens, id)));
  },
  async getMessage(tokens, id) {
    const auth = client(); auth.setCredentials(tokens); const api = google.gmail({ version: 'v1', auth });
    const { data } = await api.users.messages.get({ userId: 'me', id, format: 'full' }); const parts = flatten(data.payload); const byName = Object.fromEntries((data.payload.headers || []).map((h) => [h.name.toLowerCase(), h.value]));
    const attachments = await Promise.all(parts.filter((part) => part.filename && part.body?.attachmentId).map(async (part) => { const result = await api.users.messages.attachments.get({ userId: 'me', messageId: id, id: part.body.attachmentId }); return { filename: part.filename, mimeType: part.mimeType, content: Buffer.from(result.data.data, 'base64url') }; }));
    const bodies = headers(parts); return { id, subject: byName.subject || '', from: byName.from || '', receivedAt: new Date(Number(data.internalDate)).toISOString(), body: bodies['text/plain'] || bodies['text/html'] || '', attachments };
  },
};
