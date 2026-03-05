function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function monthIdFromDate(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${pad2(month)}`;
}

export function isSameMonth(date: Date, monthId: string) {
  return monthIdFromDate(date) === monthId;
}

export function formatDateShort(date: Date) {
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

