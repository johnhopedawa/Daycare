import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BaseModal } from './BaseModal';

const DOW_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const YEAR_PAGE_SIZE = 12;

const toDateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const getYearPageStart = (year) => year - 5;
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

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

const buildYearGrid = (startYear) => Array.from({ length: YEAR_PAGE_SIZE }, (_, index) => startYear + index);

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
  const [pickerMode, setPickerMode] = useState('calendar');
  const [yearPageStart, setYearPageStart] = useState(() => getYearPageStart(selectedDate.getFullYear()));

  useEffect(() => {
    if (!isOpen) return;
    const baseDate = initialDate instanceof Date && !Number.isNaN(initialDate.getTime())
      ? initialDate
      : new Date();
    const dateOnly = toDateOnly(baseDate);
    setSelectedDate(dateOnly);
    setMonthCursor(new Date(dateOnly.getFullYear(), dateOnly.getMonth(), 1));
    setPickerMode('calendar');
    setYearPageStart(getYearPageStart(dateOnly.getFullYear()));
  }, [isOpen, initialDate]);

  const calendarDays = useMemo(() => buildCalendarGrid(monthCursor), [monthCursor]);
  const yearOptions = useMemo(() => buildYearGrid(yearPageStart), [yearPageStart]);
  const monthLabel = monthCursor.toLocaleDateString('en-US', { month: 'long' });
  const yearLabel = monthCursor.getFullYear();
  const yearRangeLabel = `${yearPageStart} - ${yearPageStart + YEAR_PAGE_SIZE - 1}`;

  const handleSelectDay = (day) => {
    setSelectedDate(day);
  };

  const handleSelectYear = (year) => {
    const month = monthCursor.getMonth();
    const nextDate = new Date(
      year,
      month,
      Math.min(selectedDate.getDate(), getDaysInMonth(year, month))
    );

    setSelectedDate(toDateOnly(nextDate));
    setMonthCursor(new Date(year, month, 1));
    setPickerMode('calendar');
    setYearPageStart(getYearPageStart(year));
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
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-3 py-2 text-sm font-bold text-stone-800 shadow-sm shadow-[#FFE5D9]/70">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={() => {
                  setYearPageStart(getYearPageStart(yearLabel));
                  setPickerMode((current) => (current === 'year' ? 'calendar' : 'year'));
                }}
                className={`rounded-full px-3 py-2 text-sm font-bold transition-colors ${
                  pickerMode === 'year'
                    ? 'bg-[#FF9B85] text-white shadow-lg shadow-[#FF9B85]/30'
                    : 'border border-[#FFE5D9] bg-white text-stone-600 hover:border-[#FF9B85] hover:text-[#FF9B85]'
                }`}
                aria-pressed={pickerMode === 'year'}
              >
                {yearLabel}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (pickerMode === 'year') {
                    setYearPageStart((prev) => prev - YEAR_PAGE_SIZE);
                    return;
                  }
                  setMonthCursor(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                  );
                }}
                className="w-9 h-9 rounded-full border border-[#FFE5D9] bg-white text-stone-600 hover:text-[#FF9B85] hover:border-[#FF9B85] transition-colors"
                aria-label={pickerMode === 'year' ? 'Previous years' : 'Previous month'}
              >
                <ChevronLeft size={18} className="mx-auto" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pickerMode === 'year') {
                    setPickerMode('calendar');
                    return;
                  }
                  const today = new Date();
                  const todayOnly = toDateOnly(today);
                  setSelectedDate(todayOnly);
                  setMonthCursor(new Date(todayOnly.getFullYear(), todayOnly.getMonth(), 1));
                  setYearPageStart(getYearPageStart(todayOnly.getFullYear()));
                }}
                className="h-9 px-3 rounded-full border border-[#FFE5D9] bg-white text-[#FF9B85] text-xs font-bold hover:bg-[#FFF8F3] transition-colors"
              >
                {pickerMode === 'year' ? 'Calendar' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pickerMode === 'year') {
                    setYearPageStart((prev) => prev + YEAR_PAGE_SIZE);
                    return;
                  }
                  setMonthCursor(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                  );
                }}
                className="w-9 h-9 rounded-full border border-[#FFE5D9] bg-white text-stone-600 hover:text-[#FF9B85] hover:border-[#FF9B85] transition-colors"
                aria-label={pickerMode === 'year' ? 'Next years' : 'Next month'}
              >
                <ChevronRight size={18} className="mx-auto" />
              </button>
            </div>
          </div>

          {pickerMode === 'year' ? (
            <div className="space-y-3 p-2">
              <div className="px-1 text-[11px] font-bold uppercase tracking-[0.24em] text-stone-400">
                {yearRangeLabel}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {yearOptions.map((year) => {
                  const isSelectedYear = year === selectedDate.getFullYear();
                  const isVisibleYear = year === monthCursor.getFullYear();
                  const yearStateClass = isSelectedYear
                    ? 'bg-[#FFDCC8] text-[#7C2A22] shadow-sm shadow-[#FFCFBF]/80'
                    : isVisibleYear
                      ? 'border border-[#FFB39C] bg-white text-[#C05A46]'
                      : 'border border-transparent bg-white text-stone-600 hover:border-[#FFB39C] hover:text-[#FF9B85]';
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleSelectYear(year)}
                      aria-pressed={isSelectedYear}
                      className={`h-12 rounded-2xl text-sm font-bold transition-colors ${yearStateClass}`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
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
                  const stateClass = isSelected
                    ? 'bg-[#FFDCC8] text-[#7C2A22]'
                    : isSameMonth
                      ? 'bg-transparent text-stone-600 hover:bg-[#FFE5D9]'
                      : 'bg-stone-100 text-stone-300 hover:bg-stone-200';
                  return (
                    <button
                      key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      aria-pressed={isSelected}
                      className={`h-10 rounded-full text-sm font-bold transition-colors ${stateClass}`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
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
