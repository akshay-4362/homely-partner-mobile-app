export const IST_TIME_ZONE = 'Asia/Kolkata';

function normalizeDate(input: string | Date): Date {
  return input instanceof Date ? input : new Date(input);
}

export function formatDateIST(
  input: string | Date,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
  locale = 'en-IN'
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIME_ZONE,
    ...options
  }).format(normalizeDate(input));
}

export function formatTimeIST(
  input: string | Date,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
  locale = 'en-IN'
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIME_ZONE,
    ...options
  }).format(normalizeDate(input));
}

export function formatDateTimeIST(input: string | Date, locale = 'en-IN'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(normalizeDate(input));
}

export function toISTDateKey(input: string | Date): string {
  const date = normalizeDate(input);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  return `${year}-${month}-${day}`;
}

export function isSameISTDate(a: string | Date, b: string | Date): boolean {
  return toISTDateKey(a) === toISTDateKey(b);
}
