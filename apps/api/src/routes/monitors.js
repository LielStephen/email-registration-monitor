import { Router } from 'express';
import { query } from '../db.js';
import { identifierRegex } from '../matching.js';
import { scheduleScan } from '../jobs/queue.js';

const router = Router();
const userId = (req) => req.header('x-user-id') || 'local-user';
router.get('/', async (req, res, next) => { try { const result = await query(`SELECT m.*, a.provider, a.email_address FROM monitors m JOIN email_accounts a ON a.id=m.email_account_id WHERE m.user_id=$1 ORDER BY m.created_at DESC`, [userId(req)]); res.json(result.rows); } catch (error) { next(error); } });
router.post('/', async (req, res, next) => {
  try { const { emailAccountId, registrationNumber, pollIntervalSeconds = 60 } = req.body; identifierRegex(registrationNumber); const account = await query('SELECT id FROM email_accounts WHERE id=$1 AND user_id=$2', [emailAccountId, userId(req)]); if (!account.rowCount) return res.status(400).json({ error: 'Connect and select an email account first' });
    const result = await query('INSERT INTO monitors (user_id,email_account_id,registration_number,poll_interval_seconds) VALUES ($1,$2,$3,$4) RETURNING *', [userId(req), emailAccountId, registrationNumber.trim(), Math.max(30, Number(pollIntervalSeconds))]); await scheduleScan(result.rows[0].id); res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});
router.post('/:id/toggle', async (req, res, next) => { try { const result = await query('UPDATE monitors SET enabled=NOT enabled WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, userId(req)]); if (!result.rowCount) return res.sendStatus(404); if (result.rows[0].enabled) await scheduleScan(result.rows[0].id); res.json(result.rows[0]); } catch (error) { next(error); } });
router.post('/:id/scan', async (req, res, next) => { try { await scheduleScan(req.params.id); res.status(202).json({ queued: true }); } catch (error) { next(error); } });
export default router;
