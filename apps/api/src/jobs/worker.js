import { Worker } from 'bullmq';
import { config } from '../config.js';
import { query } from '../db.js';
import { scheduleScan } from './queue.js';
import { scanMonitor } from '../services/monitor.js';

new Worker('monitor-scans', async (job) => {
  const monitor = await query('SELECT id, poll_interval_seconds FROM monitors WHERE id = $1 AND enabled = true', [job.data.monitorId]);
  if (!monitor.rowCount) return { stopped: true };
  try { const result = await scanMonitor(job.data.monitorId); await scheduleScan(job.data.monitorId, monitor.rows[0].poll_interval_seconds * 1000); return result; }
  catch (error) { await query('UPDATE monitors SET last_error = $2 WHERE id = $1', [job.data.monitorId, error.message]); throw error; }
}, { connection: { url: config().redisUrl }, concurrency: 4 });
