import type { Server } from 'node:http';
import { createApp } from './app';
import { config } from './config/env';
import { getIntegrationsReadiness, integrationConfig } from './config/integrations';
import { disconnectDatabase } from './database/connect';
import { logger } from './utils/logger';

let server: Server | null = null;
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info('Shutdown signal received', { signal });

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }

    await disconnectDatabase();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
}

async function start() {
  const app = await createApp();
  server = app.listen(config.port, () => {
    const integrations = getIntegrationsReadiness();
    logger.info('Backend server started', {
      port: config.port,
      environment: config.environment,
      integrations: {
        email: integrations.email.mode,
        sms: integrations.sms.mode,
        stripe: integrations.stripe,
        ai: integrations.ai,
        strict: integrationConfig.strictProduction,
        issues: integrations.issues
      }
    });
  });
}

start().catch((error) => {
  logger.error('Server startup failed', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception (server kept alive)', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection (server kept alive)', reason);
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
