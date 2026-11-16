import { useState } from 'react';
import type { CampagneFormState, WeeklyLeadSlots } from '../utils/scripts/index.ts';
import { buildLeadScheduleRows, toggleLeadScheduleSlot } from '../utils/scripts/index.ts';
import type { LeadBookingWeekday } from '../utils/types/index.ts';

export function useLeadBookingSchedule(form: CampagneFormState, apply: (slots: WeeklyLeadSlots, interval: 15 | 30 | 60, allowManual: boolean) => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [slots, setSlots] = useState<WeeklyLeadSlots>({});
  const [interval, setInterval] = useState<15 | 30 | 60>(60);
  const [allowManual, setAllowManual] = useState(false);
  const open = (): void => {
    setSlots(form.lead_booking_weekly_slots ?? {});
    setInterval(form.lead_booking_interval_minutes);
    setAllowManual(form.lead_booking_allow_manual_time);
    setIsOpen(true);
  };
  const close = (): void => setIsOpen(false);
  const toggleSlot = (day: LeadBookingWeekday, time: string): void => {
    setSlots((previous) => toggleLeadScheduleSlot(previous, day, time));
  };
  const confirm = (): void => { apply(slots, interval, allowManual); close(); };
  return { isOpen, slots, interval, allowManual, setAllowManual, open, close, setInterval, toggleSlot, confirm, rows: buildLeadScheduleRows(interval, slots) };
}
