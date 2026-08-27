import webpush from 'web-push';
import { query } from '../db.js';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

export async function notifyMatch(userId, match) {
  const title = 'Registration Number Found';
  const body = `${match.registrationNumber} found in ${match.subject}${match.filename ? `: ${match.filename}` : ''}`;
  const record = await query('INSERT INTO notifications (user_id, match_id, title, body) VALUES ($1, $2, $3, $4) RETURNING id', [userId, match.id, title, body]);
  if (!process.env.VAPID_PUBLIC_KEY) return record.rows[0];
  const subscriptions = await query('SELECT id, subscription FROM push_subscriptions WHERE user_id = $1', [userId]);
  await Promise.all(subscriptions.rows.map(async (subscription) => {
    try { await webpush.sendNotification(subscription.subscription, JSON.stringify({ title, body, matchId: match.id })); }
    catch (error) { if (error.statusCode === 404 || error.statusCode === 410) await query('DELETE FROM push_subscriptions WHERE id = $1', [subscription.id]); else console.error('Push delivery failed', error.message); }
  }));
  return record.rows[0];
}
