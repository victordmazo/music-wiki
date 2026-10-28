// Re-exported so existing imports ('../../lib/use-current-profile') keep working.
// The actual state now lives in a single provider (lib/current-profile-context.tsx)
// mounted once in app/layout.tsx, instead of each page fetching /api/profile itself.
export { useCurrentProfile } from './current-profile-context';
