const MB = 1024 * 1024;
const GB = 1024 * MB;

// Consecutive-day cleanup streak from history timestamps.
export function computeStreak(history) {
  if (!history || !history.length) return 0;
  const days = new Set(history.map((h) => new Date(h.ts).toDateString()));
  const d = new Date();
  if (!days.has(d.toDateString())) {
    d.setDate(d.getDate() - 1);
    if (!days.has(d.toDateString())) return 0; // streak broken (nothing today or yesterday)
  }
  let streak = 0;
  while (days.has(d.toDateString())) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getAchievements(stats) {
  const freed = stats?.totalFreed || 0;
  const items = stats?.totalItems || 0;
  const cleanups = (stats?.history || []).length;
  const streak = computeStreak(stats?.history);
  const badges = [
    { id: 'first', name: 'First Clean', glyph: '✦', earned: cleanups >= 1, hint: 'Run a cleanup' },
    { id: 'saver', name: 'Storage Saver', glyph: '▾', earned: freed >= 1 * GB, hint: 'Free 1 GB' },
    { id: 'master', name: 'Storage Master', glyph: '❖', earned: freed >= 10 * GB, hint: 'Free 10 GB' },
    { id: 'slayer', name: 'Screenshot Slayer', glyph: '⛶', earned: items >= 100, hint: 'Remove 100 items' },
    { id: 'streak', name: 'On a Streak', glyph: '↺', earned: streak >= 3, hint: '3-day streak' },
    { id: 'devotee', name: 'Clean Freak', glyph: '★', earned: cleanups >= 15, hint: '15 cleanups' },
  ];
  return { badges, streak, earnedCount: badges.filter((b) => b.earned).length };
}
