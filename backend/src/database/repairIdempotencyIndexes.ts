import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const COLLECTIONS_WITH_IDEMPOTENCY = ['payments', 'loans', 'loan_repayments'] as const;

/**
 * MongoDB sparse unique indexes still index explicit `null` values, so a second
 * document with idempotencyKey:null raises E11000. Clear nulls and rebuild as a
 * partial unique index that only covers real string keys.
 */
export async function repairIdempotencyKeyIndexes() {
  const db = mongoose.connection.db;
  if (!db) return;

  for (const collectionName of COLLECTIONS_WITH_IDEMPOTENCY) {
    const collection = db.collection(collectionName);
    try {
      const unsetResult = await collection.updateMany({}, [
        {
          $set: {
            idempotencyKey: {
              $cond: [{ $eq: [{ $type: '$idempotencyKey' }, 'string'] }, '$idempotencyKey', '$$REMOVE']
            }
          }
        }
      ]);

      try {
        await collection.dropIndex('idempotencyKey_1');
      } catch (error: any) {
        if (error?.codeName !== 'IndexNotFound' && error?.code !== 27) {
          throw error;
        }
      }

      await collection.createIndex(
        { idempotencyKey: 1 },
        {
          unique: true,
          name: 'idempotencyKey_1',
          partialFilterExpression: { idempotencyKey: { $type: 'string' } }
        }
      );

      if (unsetResult.modifiedCount > 0) {
        logger.info('Repaired idempotencyKey nulls', {
          collection: collectionName,
          cleared: unsetResult.modifiedCount
        });
      }
    } catch (error) {
      logger.warn('Failed to repair idempotencyKey index', {
        collection: collectionName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
