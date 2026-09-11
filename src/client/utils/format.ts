export function formatDuration(days: number, hours: number): string {
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || parts.length === 0) parts.push(`${hours}h`);

  return parts.join(" ");
}

export function formatMoney(value: number, currency: string): string {
  return `${value.toLocaleString()} ${currency}`;
}
