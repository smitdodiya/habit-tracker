/**
 * Generates a VAPID key pair for Web Push.
 *
 * VAPID keys are self-issued — they identify this server to the browser push
 * services, and no account or third-party signup is involved. Run once, paste
 * the output into server/.env, restart.
 *
 *   npm run generate:vapid --workspace=server
 */

import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

process.stdout.write(
  [
    '',
    'Add these to server/.env:',
    '',
    `VAPID_PUBLIC_KEY=${publicKey}`,
    `VAPID_PRIVATE_KEY=${privateKey}`,
    '',
    'Keep the private key secret — it is the credential that authorises pushes',
    'from this server. Regenerating the pair invalidates existing subscriptions,',
    'so browsers will need to re-subscribe.',
    '',
  ].join('\n'),
);
