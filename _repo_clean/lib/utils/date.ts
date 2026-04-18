export function getTodayStr(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function getWeekAgoStr(): string {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
}

export function getMonthPrefix(): string {
  return getTodayStr().substring(0, 7);
}