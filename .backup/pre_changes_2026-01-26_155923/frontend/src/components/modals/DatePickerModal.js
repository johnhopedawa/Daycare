import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BaseModal } from './BaseModal';

const DOW_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const toDateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const buildCalendarGrid = (monthCursor) => {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const startDate = new Date(year, month, 1 - startOffset);
  const days = [];

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    days.push(day);
  }
  return days;
};

export function DatePickerModal({
  isOpen,
  onClose,
  initialDate,
  onConfirm,
  onClear,
  title = 'Select start date',
  subtitle = 'Choose the first date to include in the range',
  confirmLabel = 'Apply date',
  clearLabel = 'Clear date',
}) {
  const [selectedDate, setSelectedDate] = useState(() => toDateOnly(initialDate || new Date()));
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  useEffect(() => {
    if (!isOpen) return;
    const baseDate = initialDate instanceof Date && !Number.isNaN(initialDate.getTime())
      ? initialDate
      : new Date();
    const dateOnly = toDateOnly(baseDate);
    setSelectedDate(dateOnly);
    setMonthCursor(new Date(dateOnly.getFullYear(), dateOnly.getMonth(), 1));
  }, [isOpen, initialDate]);

  const calendarDays = useMemo(() => buildCalendarGrid(monthCursor), [monthCursor]);
  const monthLabel = monthCursor.toLocaleDateString('en-US', { month: 'long' });
  const yearLabel = monthCursor.getFullYear();

  const handleSelectDay = (day) => {
    setSelectedDate(day);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(selectedDate);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-xl">
      <div className="space-y-4">
        <p className="text-xs text-stone-500">{subtitle}</p>

        <div className="rounded-2xl border border-[#FFE5D9] bg-[#FFF8F3] p-3">
          <div className="flex items-center justify-between px-1 py-2">
            <div className="text-sm font-bold text-stone-800">
              {monthLabel}
              <span className="ml-2 text-stone-400 font-semibold">{yearLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setMonthCursor(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                  )
                }
                className="w-9 h-9 rounded-full border border-[#FFE5D9] bg-white text-stone-600 hover:text-[#FF9B85] hover:border-[#FF9B85] transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={18} className="mx-auto" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const todayOnly = toDateOnly(today);
                  setSelectedDate(todayOnly);
                  setMonthCursor(new Date(todayOnly.getFullYear(), todayOnly.getMonth(), 1));
                }}
                className="h-9 px-3 rounded-full border border-[#FFE5D9] bg-white text-[#FF9B85] text-xs font-bold hover:bg-[#FFF8F3] transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() =>
                  setMonthCursor(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                  )
                }
                className="w-9 h-9 rounded-full border border-[#FFE5D9] bg-white text-stone-600 hover:text-[#FF9B85] hover:border-[#FF9B85] transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={18} className="mx-auto" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-[10px] font-bold text-stone-400 px-1">
            {DOW_LABELS.map((label) => (
              <span key={label} className="text-center tracking-wide">
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 p-2">
            {calendarDays.map((day) => {
              const isSameMonth = day.getMonth() === monthCursor.getMonth();
              const isSelected =
                day.getFullYear() === selectedDate.getFullYear() &&
                day.getMonth() === selectedDate.getMonth() &&
                day.getDate() === selectedDate.getDate();
              return (
                <button
                  key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  aria-selected={isSelected}
                  className={`h-10 rounded-full text-sm font-bold transition-colors ${
                    isSelected
                      ? 'bg-[#FFDCC8] text-[#7C2A22]'
                      : 'bg-transparent text-stone-600 hover:bg-[#FFE5D9]'
                  } ${isSameMonth ? '' : 'text-stone-300'}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 h-10 rounded-xl text-white font-bold shadow-lg shadow-[#FF9B85]/30 bg-[#FF9B85] hover:bg-[#E07A5F] transition-colors"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              if (onClear) {
                onClear();
              }
            }}
            className="h-10 px-4 rounded-xl border border-[#FFE5D9] text-stone-600 font-bold hover:bg-[#FFF8F3] transition-colors"
          >
            {clearLabel}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
