export function getTodayStr(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function getWeekAgoStr(): string {
  const weekAgo = new Date();
  // Inclusive 7-day window [today-6, today]
  weekAgo.setDate(weekAgo.getDate() - 6);
  return `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
}

export function getMonthPrefix(): string {
  return getTodayStr().substring(0, 7);
}
