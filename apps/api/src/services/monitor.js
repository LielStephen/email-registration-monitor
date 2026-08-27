import { decrypt, encrypt } from '../crypto.js';
import { query, transaction } from '../db.js';
import { findIdentifier } from '../matching.js';
import { scanAttachment } from '../document-pipeline/index.js';
import { providers } from '../providers/index.js';
import { notifyMatch } from './notifications.js';

function stripHtml(value) { return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
async function saveMatch(client, monitor, email, item) {
  const result = await client.query(
    `INSERT INTO matches (monitor_id, provider_message_id, subject, sender, received_at, filename, location, location_key, excerpt, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (monitor_id, provider_message_id, location_key) DO NOTHING RETURNING id`,
    [monitor.id, email.id, email.subject, email.from, email.receivedAt, item.filename || null, item.location, item.locationKey, item.excerpt || null, item.status || null],
  );
  return result.rows[0];
}
export async function scanMonitor(monitorId) {
  const loaded = await query(`SELECT m.*, a.provider, a.encrypted_tokens, a.user_id FROM monitors m JOIN email_accounts a ON a.id = m.email_account_id WHERE m.id = $1 AND m.enabled = true`, [monitorId]);
  const monitor = loaded.rows[0]; if (!monitor) return { skipped: true };
  const provider = providers[monitor.provider]; if (!provider) throw new Error(`Unsupported provider ${monitor.provider}`);
  const refreshedTokens = await provider.refresh(JSON.parse(decrypt(monitor.encrypted_tokens)));
  await query('UPDATE email_accounts SET encrypted_tokens = $2, updated_at = NOW() WHERE id = $1', [monitor.email_account_id, encrypt(JSON.stringify(refreshedTokens))]);
  const emails = await provider.listMessages(refreshedTokens, monitor.last_scanned_at);
  let created = 0;
  for (const email of emails) {
    const known = await query('SELECT 1 FROM processed_messages WHERE monitor_id = $1 AND provider_message_id = $2', [monitor.id, email.id]);
    if (known.rowCount) continue;
    const subjectMatch = findIdentifier(email.subject, monitor.registration_number);
    const body = stripHtml(email.body);
    const bodyMatch = findIdentifier(body, monitor.registration_number);
    const locations = [];
    if (subjectMatch) locations.push({ location: 'Email subject', locationKey: 'email:subject', excerpt: email.subject });
    if (bodyMatch) locations.push({ location: 'Email body', locationKey: 'email:body', excerpt: body.slice(Math.max(0, bodyMatch.index - 100), bodyMatch.index + 200) });
    for (const attachment of email.attachments) locations.push(...await scanAttachment(attachment, monitor.registration_number));
    const pendingNotifications = await transaction(async (client) => {
      const pending = [];
      for (const item of locations) {
        const match = await saveMatch(client, monitor, email, item);
        if (match) { created += 1; pending.push({ ...match, registrationNumber: monitor.registration_number, subject: email.subject, filename: item.filename }); }
      }
      await client.query('INSERT INTO processed_messages (monitor_id, provider_message_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [monitor.id, email.id]);
      return pending;
    });
    await Promise.all(pendingNotifications.map((match) => notifyMatch(monitor.user_id, match)));
  }
  await query('UPDATE monitors SET last_scanned_at = NOW(), last_error = NULL WHERE id = $1', [monitor.id]);
  return { scanned: emails.length, created };
}
