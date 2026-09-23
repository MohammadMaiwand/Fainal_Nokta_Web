/**
 * One-shot cleanup: soft-delete noisy middleware/routine audit rows
 * so security dashboards stop counting operational spam.
 *
 * Usage: npx tsx src/scripts/cleanup_noisy_audit_logs.ts
 */
import mongoose from 'mongoose';
import { config } from '../config/env';
import { AuditService } from '../services/auditService';
import '../models/AuditLog';

async function main() {
  await mongoose.connect(config.mongoUri);
  const auditService = new AuditService();
  const softDeleted = await auditService.softDeleteNoisyLogs();
  const purged = await auditService.purgeOldLogs(90, 365);
  console.log(
    JSON.stringify(
      {
        softDeleted,
        infoPurged: purged.infoPurged,
        securityPurged: purged.securityPurged
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
