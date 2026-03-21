export function getUserDisplayName(
  users: Array<{ uid: string; displayName?: string | null; email?: string | null }>,
  userId: string,
  fallback = 'Unknown'
): string {
  const user = users.find(u => u.uid === userId);
  return user?.displayName || user?.email || fallback;
}

export function createUserNamesMap(
  users: Array<{ uid: string; displayName?: string | null; email?: string | null }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const user of users) {
    if (user?.uid) {
      map.set(user.uid, user.displayName || user.email || user.uid.slice(0, 8) + '...');
    }
  }
  return map;
}