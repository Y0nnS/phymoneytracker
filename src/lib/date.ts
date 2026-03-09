function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function dateToISO(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayDateId() {
  return dateToISO(new Date());
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

export function formatDateTime(date: Date) {
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDayLabel(dateId: string) {
  const date = new Date(`${dateId}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateId;
  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function weekDateRange(baseDate = new Date()) {
  const start = new Date(baseDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      id: dateToISO(date),
      label: formatDayLabel(dateToISO(date)),
      date,
    };
  });
}
