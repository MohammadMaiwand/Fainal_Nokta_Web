import crypto from 'node:crypto';

function secret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

const output = {
  JWT_SECRET: secret(),
  REFRESH_SECRET: secret(),
  CSRF_SECRET: secret(),
  STRIPE_WEBHOOK_SECRET: `whsec_${secret(24)}`
};

console.log('# Paste into your production secret manager (do not commit):');
for (const [key, value] of Object.entries(output)) {
  console.log(`${key}=${value}`);
}
