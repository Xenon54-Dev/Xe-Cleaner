// CEO / Admin configuration — SEPARATED from the normal user auth flow.
//
// Only a *salted hash* of the admin password is stored here — never plaintext.
// Override at build time with EXPO_PUBLIC_ADMIN_* (e.g. EAS env vars / a local
// .env) so credentials aren't committed to source.
//
// SECURITY NOTE: in a client-only app these values are still embedded in the
// shipped bundle and can be extracted, and the role check can be patched. This
// is the secure-as-possible *client seam*. For real tamper-resistance, verify
// the admin login against a backend and have it issue a signed token.
export const ADMIN_CONFIG = {
  email: (process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'ceo@xecleaner.app').toLowerCase(),
  salt: process.env.EXPO_PUBLIC_ADMIN_SALT || 'e6ea88b0d1078c5a7addf0fd973700a9',
  hash: process.env.EXPO_PUBLIC_ADMIN_HASH || 'fe157b7b8f250207dcc4135ae33c254413aa43efd479d940902dbc837c15aa64',
  name: 'CEO',
  role: 'admin',
};
