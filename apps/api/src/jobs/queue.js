import { Queue } from 'bullmq';
import { config } from '../config.js';

export const monitorQueue = new Queue('monitor-scans', { connection: { url: config().redisUrl } });
export async function scheduleScan(monitorId, delay = 0) {
  // A unique id lets a worker schedule its successor before its active job is removed.
  return monitorQueue.add('scan-monitor', { monitorId }, { jobId: `monitor:${monitorId}:${Date.now()}`, delay, removeOnComplete: true, removeOnFail: 100 });
}
