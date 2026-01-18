import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DOW_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const getTodayStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const toDateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const pad2 = (value) => String(value).padStart(2, '0');

const toHour12 = (hours24) => {
  const hour = hours24 % 12 || 12;
  return hour;
};

const toAmPm = (hours24) => (hours24 >= 12 ? 'PM' : 'AM');

const to24Hour = (hour12, ampm) => {
  if (ampm === 'PM') return (hour12 % 12) + 12;
  return hour12 % 12;
};

const clampMinute = (minute, step) => {
  const safeStep = Math.max(1, step);
  return Math.floor(minute / safeStep) * safeStep;
};

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

const buildDateTime = (date, hour12, minute, ampm) => {
  const hour24 = to24Hour(hour12, ampm);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour24,
    minute,
    0,
    0
  );
};

const formatTimeLabel = (date) => {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${pad2(minute)} ${ampm}`;
};

const getFocusableElements = (container) => {
  if (!container) return [];
  const nodes = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(nodes).filter((node) => !node.disabled && node.offsetParent !== null);
};

const getInitialState = (initialValue, minuteStep, disablePast) => {
  const now = new Date();
  const baseDate = initialValue instanceof Date && !Number.isNaN(initialValue.getTime())
    ? initialValue
    : now;
  const todayStart = getTodayStart();
  const dateOnly = toDateOnly(baseDate);
  const safeDate = disablePast && dateOnly < todayStart ? todayStart : dateOnly;

  const startHour = 9;
  const endHour = 17;

  return {
    selectedDate: safeDate,
    monthCursor: new Date(safeDate.getFullYear(), safeDate.getMonth(), 1),
    start: {
      hour: toHour12(startHour),
      minute: clampMinute(0, minuteStep),
      ampm: toAmPm(startHour),
    },
    end: {
      hour: toHour12(endHour),
      minute: clampMinute(0, minuteStep),
      ampm: toAmPm(endHour),
    },
  };
};

function TimeSpinner({
  label,
  hour,
  minute,
  ampm,
  minuteStep,
  onHourChange,
  onMinuteChange,
  onAmPmChange,
}) {
  return (
    <div className="w-full rounded-2xl border border-[#FFE5D9] bg-white p-3">
      <div className="text-xs font-bold text-stone-400 mb-2">{label}</div>
      <div className="flex items-center justify-center gap-3">
        <div className="w-24 text-center">
          <button
            type="button"
            onClick={() => onHourChange(-1)}
            className="w-full h-8 rounded-xl border border-[#FFE5D9] bg-white text-stone-600 font-bold hover:text-[#FF9B85] hover:border-[#FF9B85] transition-colors"
          >
            ⌃
          </button>
          <div className="text-3xl font-extrabold text-stone-800 my-2">
            {pad2(hour)}
          </div>
          <div className="text-[11px] font-bold text-stone-400 mb-2">Hour</div>
          <button
            type="button"
            onClick={() => onHourChange(1)}
            className="w-full h-8 rounded-xl border border-[#FFE5D9] bg-white text-stone-600 font-bold hover:text-[#FF9B85] hover:border-[#FF9B85] transition-colors"
          >
            ⌄
          </button>
        </div>

        <div className="text-2xl font-extrabold text-stone-300 -mt-6">:</div>

        <div className="w-24 text-center">
          <button
            type="button"
            onClick={() => onMinuteChange(-1)}
            className="w-full h-8 rounded-xl border border-[#FFE5D9] bg-white text-stone-600 font-bold hover:text-[#FF9B85] hover:border-[#FF9B85] transition-colors"
          >
            ⌃
          </button>
          <div className="text-3xl font-extrabold text-stone-800 my-2">
            {pad2(minute)}
          </div>
          <div className="text-[11px] font-bold text-stone-400 mb-2">Minute</div>
          <button
            type="button"
            onClick={() => onMinuteChange(1)}
            className="w-full h-8 rounded-xl border border-[#FFE5D9] bg-white text-stone-600 font-bold hover:text-[#FF9B85] hover:border-[#FF9B85] transition-colors"
          >
            ⌄
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-3 mt-3">
        {['AM', 'PM'].map((period) => {
          const active = ampm === period;
          return (
            <button
              key={period}
              type="button"
              onClick={() => onAmPmChange(period)}
              className={`w-20 h-9 rounded-full border text-xs font-bold transition-colors ${
                active
                  ? 'bg-[#FFDCC8] border-[#FFC8BE] text-[#7C2A22]'
                  : 'bg-white border-[#FFE5D9] text-stone-500 hover:text-[#FF9B85]'
              }`}
            >
              {period}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateTimePickerModal({
  open,
  initialValue,
  onConfirm,
  onClose,
  onCancel,
  onSelectionChange,
  minuteStep = 5,
  disablePast = false,
  title = 'Select Time',
  subtitle = 'Choose a pickup or drop-off time',
  confirmLabel = 'Confirm Time',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  sideContent = null,
}) {
  const modalRef = useRef(null);
  const lastActiveRef = useRef(null);
  const [state, setState] = useState(() =>
    getInitialState(initialValue, minuteStep, disablePast)
  );

  useEffect(() => {
    if (!open) return undefined;
    setState(getInitialState(initialValue, minuteStep, disablePast));
    lastActiveRef.current = document.activeElement;
    const focusTimer = setTimeout(() => {
      const focusable = getFocusableElements(modalRef.current);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (onCancel) {
          onCancel();
        } else {
          onClose();
        }
      }
      if (event.key === 'Tab') {
        const focusable = getFocusableElements(modalRef.current);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, initialValue, minuteStep, disablePast, onClose]);

  useEffect(() => {
    if (open) return;
    const previous = lastActiveRef.current;
    if (previous && typeof previous.focus === 'function') {
      previous.focus();
    }
  }, [open]);

  const calendarDays = useMemo(() => buildCalendarGrid(state.monthCursor), [state.monthCursor]);
  const monthLabel = state.monthCursor.toLocaleDateString('en-US', { month: 'long' });
  const yearLabel = state.monthCursor.getFullYear();
  const todayStart = useMemo(() => getTodayStart(), []);

  const startDateTime = useMemo(
    () => buildDateTime(state.selectedDate, state.start.hour, state.start.minute, state.start.ampm),
    [state.selectedDate, state.start]
  );
  const endDateTime = useMemo(
    () => buildDateTime(state.selectedDate, state.end.hour, state.end.minute, state.end.ampm),
    [state.selectedDate, state.end]
  );
  const hoursValue = useMemo(() => {
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    if (diffMs <= 0) return 0;
    return diffMs / (1000 * 60 * 60);
  }, [startDateTime, endDateTime]);
  const isTimeValid = endDateTime.getTime() > startDateTime.getTime();

  useEffect(() => {
    if (!onSelectionChange) return;
    onSelectionChange({
      date: state.selectedDate,
      start: startDateTime,
      end: endDateTime,
      hours: hoursValue,
      isValid: isTimeValid,
    });
  }, [state.selectedDate, startDateTime, endDateTime, hoursValue, isTimeValid]);

  const handleSelectDay = (day) => {
    if (disablePast && day < todayStart) return;
    setState((prev) => ({
      ...prev,
      selectedDate: day,
      monthCursor: new Date(day.getFullYear(), day.getMonth(), 1),
    }));
  };

  const handleToday = () => {
    const today = getTodayStart();
    setState((prev) => ({
      ...prev,
      selectedDate: today,
      monthCursor: new Date(today.getFullYear(), today.getMonth(), 1),
    }));
  };

  const updateHour = (target, delta) => {
    setState((prev) => {
      const current = prev[target].hour;
      const next = current + delta;
      const wrapped = next > 12 ? 1 : next < 1 ? 12 : next;
      return { ...prev, [target]: { ...prev[target], hour: wrapped } };
    });
  };

  const updateMinute = (target, delta) => {
    const step = Math.max(1, minuteStep);
    setState((prev) => {
      const current = prev[target].minute;
      let nextMinute = current + delta * step;
      if (nextMinute >= 60) {
        nextMinute = 0;
      }
      if (nextMinute < 0) {
        nextMinute = 60 - step;
      }
      return {
        ...prev,
        [target]: { ...prev[target], minute: nextMinute },
      };
    });
  };

  const handleConfirm = () => {
    onConfirm({
      start: startDateTime,
      end: endDateTime,
      hours: hoursValue,
    });
  };

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[70]"
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dtpTitle"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[860px] bg-[#FFF8F3] border border-[#FFE5D9] rounded-2xl shadow-[0_18px_55px_rgba(0,0,0,0.16)] max-h-[90vh] flex flex-col"
        >
          <div className="px-4 sm:px-5 pt-4 pb-2">
            <div className="text-lg font-bold font-quicksand text-stone-800" id="dtpTitle">
              {title}
            </div>
            <div className="text-xs text-stone-500 mt-1">{subtitle}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.9fr] gap-4 px-4 sm:px-5 pb-5 overflow-hidden flex-1 min-h-0">
            <section className="p-1 sm:p-2 overflow-y-auto md:overflow-visible min-h-0 soft-scrollbar">
              <div className="flex items-center justify-between px-2 py-2">
                <div className="text-sm font-bold text-stone-800">
                  {monthLabel}
                  <span className="ml-2 text-stone-400 font-semibold">{yearLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        monthCursor: new Date(prev.monthCursor.getFullYear(), prev.monthCursor.getMonth() - 1, 1),
                      }))
                    }
                    className="w-9 h-9 rounded-full border border-[#FFE5D9] bg-white text-stone-600 hover:text-[#FF9B85] hover:border-[#FF9B85] transition-colors"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={18} className="mx-auto" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="h-9 px-3 rounded-full border border-[#FFE5D9] bg-white text-[#FF9B85] text-xs font-bold hover:bg-[#FFF8F3] transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        monthCursor: new Date(prev.monthCursor.getFullYear(), prev.monthCursor.getMonth() + 1, 1),
                      }))
                    }
                    className="w-9 h-9 rounded-full border border-[#FFE5D9] bg-white text-stone-600 hover:text-[#FF9B85] hover:border-[#FF9B85] transition-colors"
                    aria-label="Next month"
                  >
                    <ChevronRight size={18} className="mx-auto" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-[10px] font-bold text-stone-400 px-2">
                {DOW_LABELS.map((label) => (
                  <span key={label} className="text-center tracking-wide">
                    {label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 p-2">
                {calendarDays.map((day) => {
                  const isSameMonth = day.getMonth() === state.monthCursor.getMonth();
                  const isSelected =
                    day.getFullYear() === state.selectedDate.getFullYear() &&
                    day.getMonth() === state.selectedDate.getMonth() &&
                    day.getDate() === state.selectedDate.getDate();
                  const isDisabled = disablePast && day < todayStart;
                  return (
                    <button
                      key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      disabled={isDisabled}
                      aria-selected={isSelected}
                      className={`h-10 rounded-full text-sm font-bold transition-colors ${
                        isSelected
                          ? 'bg-[#FFDCC8] text-[#7C2A22]'
                          : 'bg-transparent text-stone-600 hover:bg-[#FFE5D9]'
                      } ${
                        isSameMonth ? '' : 'text-stone-300'
                      } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-2 pb-2">
                <TimeSpinner
                  label="Start Time"
                  hour={state.start.hour}
                  minute={state.start.minute}
                  ampm={state.start.ampm}
                  minuteStep={minuteStep}
                  onHourChange={(delta) => updateHour('start', delta)}
                  onMinuteChange={(delta) => updateMinute('start', delta)}
                  onAmPmChange={(period) =>
                    setState((prev) => ({
                      ...prev,
                      start: { ...prev.start, ampm: period },
                    }))
                  }
                />
                <TimeSpinner
                  label="End Time"
                  hour={state.end.hour}
                  minute={state.end.minute}
                  ampm={state.end.ampm}
                  minuteStep={minuteStep}
                  onHourChange={(delta) => updateHour('end', delta)}
                  onMinuteChange={(delta) => updateMinute('end', delta)}
                  onAmPmChange={(period) =>
                    setState((prev) => ({
                      ...prev,
                      end: { ...prev.end, ampm: period },
                    }))
                  }
                />
              </div>
            </section>

            <aside className="flex flex-col overflow-hidden min-h-0">
              <div className="w-full bg-white border border-[#FFE5D9] rounded-2xl p-4 flex flex-col overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto soft-scrollbar">
                  <div className="text-xs font-bold text-stone-400 mb-2">Selected Date</div>
                  <div className="bg-[#FFDCC8] rounded-xl py-3 text-center">
                    <div className="text-3xl font-extrabold text-[#5F2019]">
                      {state.selectedDate.getDate()}
                    </div>
                    <div className="text-xs font-bold text-[#7C2A22] mt-1">
                      {state.selectedDate.toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="text-xs font-bold text-stone-400 mt-4 mb-2">Selected Time</div>
                  <div className="bg-[#FFF1EE] rounded-xl py-3 text-center border border-[#FFDCC8]">
                    <div className="text-2xl font-extrabold text-[#7C2A22]">
                      {formatTimeLabel(startDateTime)} - {formatTimeLabel(endDateTime)}
                    </div>
                    <div className="text-[11px] font-bold text-[#9B6B66] mt-1">
                      {isTimeValid ? `${hoursValue.toFixed(2)} hrs` : 'End time must be after start time'}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-bold text-stone-400 mb-2">Hours</div>
                    <div className="px-3 py-2.5 rounded-2xl border border-[#FFE5D9] bg-[#FFF8F3] text-sm font-bold text-stone-700 text-center">
                      {hoursValue.toFixed(2)}
                    </div>
                  </div>

                  {sideContent}
                </div>

                <div className="flex-shrink-0 pt-4 border-t border-[#FFE5D9] mt-4">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={confirmDisabled || !isTimeValid}
                    className={`w-full h-10 rounded-xl text-white font-bold shadow-lg shadow-[#FF9B85]/30 transition-colors ${
                      confirmDisabled || !isTimeValid
                        ? 'bg-[#FFB7AC] cursor-not-allowed'
                        : 'bg-[#FF9B85] hover:bg-[#E07A5F]'
                    }`}
                  >
                    {confirmLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onCancel || onClose}
                    className="w-full h-10 mt-3 rounded-xl border border-[#FFE5D9] text-stone-600 font-bold hover:bg-[#FFF8F3] transition-colors"
                  >
                    {cancelLabel}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
