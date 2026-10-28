// Pure, dependency-free permission checks shared by both server code
// (lib/api-auth.ts) and client code (lib/current-profile-context.tsx), so the
// definition of "is this account a moderator" exists in exactly one place.

export type Role = 'user' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'banned';

type ModeratorCheckable = { role: Role; status: UserStatus } | null | undefined;

/** True when the account is a moderator whose own account is in good standing. */
export function isModerator(profile: ModeratorCheckable): boolean {
  return profile?.role === 'moderator' && profile?.status === 'active';
}
