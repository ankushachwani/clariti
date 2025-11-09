import { format, isToday, isTomorrow, isThisWeek, isPast, differenceInDays } from 'date-fns';

export function getGreeting(timezone: string = 'America/New_York'): string {
  // Get the current time in the user's timezone
  const userTime = new Date().toLocaleString('en-US', { 
    timeZone: timezone,
    hour12: false,
    hour: 'numeric'
  });
  
  const hour = parseInt(userTime);

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatDueDate(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isThisWeek(date)) return format(date, 'EEEE'); // Day name
  return format(date, 'MMM d'); // e.g., "Nov 8"
}

export function getUrgencyLabel(date: Date | null | undefined): string {
  if (!date) return 'No deadline';

  const days = differenceInDays(date, new Date());

  if (isPast(date)) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 7) return `Due in ${days} days`;

  return formatDueDate(date);
}

export function isOverdue(date: Date | null | undefined): boolean {
  if (!date) return false;
  return isPast(date) && !isToday(date);
}

export function isDueToday(date: Date | null | undefined): boolean {
  if (!date) return false;
  return isToday(date);
}

export function isDueThisWeek(date: Date | null | undefined): boolean {
  if (!date) return false;
  return isThisWeek(date);
}
