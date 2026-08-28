import crypto from 'node:crypto';
import { Router } from 'express';
import { encrypt } from '../crypto.js';
import { query } from '../db.js';
import { providers } from '../providers/index.js';

const router = Router();
router.get('/:provider/start', async (req, res, next) => {
  try {
    const provider = providers[req.params.provider]; if (!provider) return res.status(404).json({ error: 'Unknown email provider' });
    const state = crypto.randomBytes(32).toString('base64url'); const userId = req.header('x-user-id') || 'local-user';
    await query('INSERT INTO oauth_states (state, user_id, provider, expires_at) VALUES ($1,$2,$3,NOW() + interval \'10 minutes\')', [state, userId, req.params.provider]);
    res.redirect(provider.authorizationUrl(state));
  } catch (error) { next(error); }
});
router.get('/:provider/callback', async (req, res, next) => {
  try {
    const provider = providers[req.params.provider]; const state = String(req.query.state || ''); const code = String(req.query.code || '');
    const stateResult = await query('DELETE FROM oauth_states WHERE state = $1 AND provider = $2 AND expires_at > NOW() RETURNING user_id', [state, req.params.provider]);
    if (!provider || !code || !stateResult.rowCount) return res.status(400).send('Invalid or expired OAuth request.');
    const tokens = await provider.exchange(code);
    const emailAddress = await provider.identity(tokens);
    await query(`INSERT INTO email_accounts (user_id, provider, email_address, encrypted_tokens) VALUES ($1,$2,$3,$4)
      ON CONFLICT (user_id, provider) DO UPDATE SET encrypted_tokens = EXCLUDED.encrypted_tokens, email_address = EXCLUDED.email_address, updated_at = NOW()`, [stateResult.rows[0].user_id, req.params.provider, emailAddress, encrypt(JSON.stringify(tokens))]);
    res.redirect(`${process.env.APP_URL || 'http://localhost:5173'}?connected=${req.params.provider}`);
  } catch (error) { next(error); }
});
export default router;
