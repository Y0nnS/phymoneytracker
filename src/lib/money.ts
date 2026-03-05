export function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatIDRCompact(amount: number) {
  const sign = amount < 0 ? '-' : '';
  const formatted = new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(Math.abs(amount));
  return `${sign}Rp${formatted}`;
}
