import { addDays, format, isBefore, isValid, parseISO } from 'date-fns';
import type { Vaccination } from '@/types';

export type VaccinationStatus = 'current' | 'due-soon' | 'overdue';

export function getVaccinationStatus(vaccination: Vaccination): VaccinationStatus {
  const nextDueDate = vaccination.nextDueDate;

  if (!nextDueDate) return 'current';

  const dueDate = parseISO(nextDueDate);
  if (!isValid(dueDate)) return 'current';

  const today = new Date();
  const weekFromNow = addDays(today, 7);

  if (isBefore(dueDate, today)) return 'overdue';
  if (isBefore(dueDate, weekFromNow)) return 'due-soon';

  return 'current';
}

export function getVaccinationStatusLabel(status: VaccinationStatus) {
  if (status === 'overdue') return 'Overdue';
  if (status === 'due-soon') return 'Due Soon';
  return 'Current';
}

export function getVaccinationStatusVariant(status: VaccinationStatus) {
  return status === 'overdue' ? 'destructive' : status === 'due-soon' ? 'secondary' : 'outline';
}

export function formatVaccinationDate(dateValue?: string) {
  if (!dateValue) return '-';
  return isValid(parseISO(dateValue)) ? format(parseISO(dateValue), 'MMM d, yyyy') : dateValue;
}

export function getVaccinationDateSortValue(dateValue?: string) {
  if (!dateValue) return 0;

  const parsedDate = parseISO(dateValue);
  return isValid(parsedDate) ? parsedDate.getTime() : 0;
}
