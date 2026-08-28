import { Router } from 'express';
import { query } from '../db.js';
const router = Router(); const userId = (req) => req.header('x-user-id') || 'local-user';
router.get('/push-config', (_req, res) => res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null }));
router.get('/accounts', async (req, res, next) => { try { const result = await query('SELECT id, provider, email_address, created_at FROM email_accounts WHERE user_id=$1', [userId(req)]); res.json(result.rows); } catch (error) { next(error); } });
router.get('/matches', async (req, res, next) => { try { const result = await query(`SELECT matches.*, monitors.registration_number FROM matches JOIN monitors ON monitors.id=matches.monitor_id WHERE monitors.user_id=$1 ORDER BY matches.created_at DESC LIMIT 100`, [userId(req)]); res.json(result.rows); } catch (error) { next(error); } });
router.post('/push-subscriptions', async (req, res, next) => { try { await query('INSERT INTO push_subscriptions (user_id, subscription) VALUES ($1,$2) ON CONFLICT (user_id, subscription) DO NOTHING', [userId(req), req.body]); res.sendStatus(201); } catch (error) { next(error); } });
export default router;
