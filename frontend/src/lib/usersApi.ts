// usersApi.ts
// Simple API for fetching user display name by user_id

export async function getUserDisplayName(userId: number): Promise<string> {
  if (!userId) return 'unknown';
  try {
    const res = await fetch(`/api/users/check/${userId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch user');
    const user = await res.json();
    if (user.display_name) return user.display_name;
    if (user.first_name || user.last_name) return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return `user_${userId}`;
  } catch {
    return `user_${userId}`;
  }
}
