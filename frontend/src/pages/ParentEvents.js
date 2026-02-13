import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, MapPin, Sparkles } from 'lucide-react';
import { ParentLayout } from '../components/ParentLayout';
import { EventDetailsModal } from '../components/modals/EventDetailsModal';
import api from '../utils/api';

const buildCalendarGrid = (monthDate) => {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay();
  const grid = [];
  for (let i = 0; i < startOffset; i += 1) {
    grid.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    grid.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }
  while (grid.length % 7 !== 0) {
    grid.push(null);
  }
  return grid;
};

const formatDateKey = (date) => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDateLabel = (value, options = { month: 'short', day: 'numeric' }) => {
  const parsed = value instanceof Date ? value : parseDateOnly(value);
  if (!parsed) return '';
  return parsed.toLocaleDateString('en-US', options);
};

const formatTimeLabel = (event) => {
  if (!event?.start_time) return 'All day';

  const toLabel = (timeValue) => {
    const [hours, minutes] = String(timeValue).split(':');
    const hourNum = Number(hours);
    if (!Number.isFinite(hourNum)) return timeValue;
    const hour12 = hourNum % 12 || 12;
    const suffix = hourNum >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${suffix}`;
  };

  if (!event.end_time) {
    return toLabel(event.start_time);
  }

  return `${toLabel(event.start_time)} - ${toLabel(event.end_time)}`;
};

const compareEvents = (left, right) => {
  const leftDate = String(left.event_date || '');
  const rightDate = String(right.event_date || '');
  if (leftDate !== rightDate) {
    return leftDate.localeCompare(rightDate);
  }
  const leftTime = String(left.start_time || '99:99:99');
  const rightTime = String(right.start_time || '99:99:99');
  if (leftTime !== rightTime) {
    return leftTime.localeCompare(rightTime);
  }
  return Number(left.id || 0) - Number(right.id || 0);
};

function ParentEvents() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rsvpUpdatingId, setRsvpUpdatingId] = useState(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const response = await api.get('/parent/events', {
          params: { from: formatDateKey(start), to: formatDateKey(end) },
        });
        setEvents(response.data.events || []);
      } catch (error) {
        console.error('Failed to load events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [currentMonth]);

  const sortedEvents = useMemo(
    () => [...events].sort(compareEvents),
    [events]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map();
    sortedEvents.forEach((event) => {
      const key = event.event_date;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(event);
    });
    return map;
  }, [sortedEvents]);

  const selectedKey = formatDateKey(selectedDate);
  const selectedEvents = eventsByDate.get(selectedKey) || [];
  const selectedDateStart = useMemo(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()),
    [selectedDate]
  );
  const upcomingEvents = useMemo(
    () => sortedEvents
      .filter((event) => {
        const eventDate = parseDateOnly(event.event_date);
        return eventDate && eventDate >= selectedDateStart;
      })
      .slice(0, 8),
    [sortedEvents, selectedDateStart]
  );
  const todayDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const monthLabel = useMemo(
    () => currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [currentMonth]
  );
  const selectedDateFullLabel = useMemo(
    () => selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    [selectedDate]
  );
  const monthEventCount = events.length;

  const submitRsvp = async (event, nextStatus) => {
    if (!event?.id || !nextStatus) return;

    try {
      setRsvpUpdatingId(event.id);
      const response = await api.post(`/parent/events/${event.id}/rsvp`, { status: nextStatus });
      const rsvp = response.data?.rsvp;
      if (!rsvp) return;

      setEvents((prev) => prev.map((item) => {
        if (item.id !== event.id) return item;
        return {
          ...item,
          parent_rsvp_status: rsvp.status,
          parent_rsvp_responded_at: rsvp.responded_at,
        };
      }));

      setSelectedEvent((prev) => {
        if (!prev || prev.id !== event.id) return prev;
        return {
          ...prev,
          parent_rsvp_status: rsvp.status,
          parent_rsvp_responded_at: rsvp.responded_at,
          event_date: prev.event_date || event.event_date,
        };
      });
    } catch (error) {
      console.error('Failed to submit RSVP:', error);
      alert(error.response?.data?.error || 'Failed to submit RSVP. Please try again.');
    } finally {
      setRsvpUpdatingId(null);
    }
  };

  return (
    <ParentLayout title="Events" subtitle="See what's happening at daycare and stay in the loop.">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="parent-button-soft px-3 py-2 rounded-xl text-sm font-semibold"
          >
            Prev
          </button>
          <div className="text-lg font-bold parent-text">
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="parent-button-soft px-3 py-2 rounded-xl text-sm font-semibold"
          >
            Next
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setCurrentMonth(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
            setSelectedDate(todayDate);
          }}
          className="parent-button-soft px-3.5 py-2 rounded-xl text-sm font-semibold"
        >
          Go to today
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="parent-card rounded-xl border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide font-semibold parent-text-muted">Selected day</p>
          <p className="mt-2 text-sm font-semibold parent-text">{selectedDateFullLabel}</p>
        </div>
        <div className="parent-card rounded-xl border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide font-semibold parent-text-muted">Items this month</p>
          <p className="mt-2 text-2xl font-bold parent-text">{monthEventCount}</p>
        </div>
        <div className="parent-card rounded-xl border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide font-semibold parent-text-muted">Coming up</p>
          <p className="mt-2 text-2xl font-bold parent-text">{upcomingEvents.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
        <div className="parent-card rounded-xl border border-gray-100 p-5 md:p-6">
          <div className="mb-4 rounded-2xl border border-[#d5efee] bg-gradient-to-r from-[#f4fbfb] to-[#eef8ff] px-4 py-3">
            <p className="text-xs font-semibold tracking-wide uppercase parent-text-muted">Family Calendar</p>
            <p className="text-sm mt-1 parent-text">Tap any day to focus your event feed.</p>
          </div>
          <div className="grid grid-cols-7 gap-2 text-xs font-semibold parent-text-muted mb-3 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {buildCalendarGrid(currentMonth).map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-20" />;
              }
              const key = formatDateKey(day);
              const dayEvents = eventsByDate.get(key) || [];
              const isSelected = key === selectedKey;
              const isToday = key === formatDateKey(todayDate);
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`h-20 rounded-xl border p-2 text-left transition-all ${
                    isSelected
                      ? 'bg-teal-50 border-teal-300 shadow-sm'
                      : hasEvents
                        ? 'bg-[#f9fdfd] border-[#d9ecec] hover:border-teal-200 hover:bg-[#f4fbfb]'
                        : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                  aria-label={`${day.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} with ${dayEvents.length} events`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isToday ? 'text-teal-700' : 'parent-text'}`}>
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-[10px] parent-text-muted truncate"
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] parent-text-muted">+ more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="parent-card rounded-xl border border-gray-100 p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold parent-text-muted uppercase tracking-wide inline-flex items-center gap-1.5">
                <Sparkles size={13} />
                Upcoming Events
              </p>
              <p className="text-lg font-bold parent-text">
                From {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <CalendarDays size={18} className="parent-text-muted" />
          </div>

          {loading ? (
            <div className="text-sm parent-text-muted">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d8e9e9] bg-[#fbfefe] p-4 text-sm parent-text-muted">
              No events are scheduled for this month yet.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide parent-text-muted mb-2">
                  On {formatDateLabel(selectedDate, { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                {selectedEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d8e9e9] bg-[#fbfefe] p-4 text-sm parent-text-muted">
                    Nothing scheduled for this day. Pick another date or check the next upcoming cards below.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedEvents.map((event) => (
                      <button
                        key={`selected-${event.id}-${event.event_date}`}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className="w-full text-left rounded-2xl border border-[#d6ecec] bg-[#f6fbfb] p-3.5 hover:border-teal-300 hover:bg-[#eff9f8] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold parent-text truncate">{event.title}</p>
                            <p className="text-xs parent-text-muted mt-1 inline-flex items-center gap-2">
                              <Clock3 size={12} />
                              {formatTimeLabel(event)}
                            </p>
                            {event.requires_rsvp ? (
                              <p className="text-[11px] mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#fff3e8] text-[#9a3412] font-semibold">
                                  RSVP required
                                </span>
                                <span className="ml-2 text-[#0f766e] font-semibold">
                                  {event.parent_rsvp_status
                                    ? `You replied: ${String(event.parent_rsvp_status).toUpperCase() === 'GOING' ? 'Going' : 'Not going'}`
                                    : 'No Reply'}
                                </span>
                              </p>
                            ) : null}
                            {event.location ? (
                              <p className="text-xs parent-text-muted mt-1 inline-flex items-center gap-1 truncate">
                                <MapPin size={11} />
                                {event.location}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-[#d8e9e9] text-teal-700">
                            {String(event.entry_type || 'EVENT').toUpperCase() === 'MAINTENANCE' ? 'Maintenance' : 'Event'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide parent-text-muted mb-2">Next up</p>
                {upcomingEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d8e9e9] bg-[#fbfefe] p-4 text-sm parent-text-muted">
                    No upcoming events from this date.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {upcomingEvents.map((event) => (
                      <button
                        key={`upcoming-${event.id}-${event.event_date}`}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className="w-full text-left rounded-2xl border border-gray-100 bg-white p-3.5 hover:border-teal-200 hover:bg-[#f7fbfb] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-[#f0f9fa] border border-[#d4ecec] px-2.5 py-1.5 text-center min-w-[58px]">
                            <p className="text-[10px] font-semibold uppercase text-teal-700 leading-none">
                              {formatDateLabel(event.event_date, { month: 'short' })}
                            </p>
                            <p className="text-sm font-bold text-teal-800 leading-tight mt-1">
                              {formatDateLabel(event.event_date, { day: 'numeric' })}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold parent-text truncate">{event.title}</p>
                            <p className="text-xs parent-text-muted mt-1 inline-flex items-center gap-2">
                              <Clock3 size={12} />
                              {formatTimeLabel(event)}
                            </p>
                            {event.requires_rsvp ? (
                              <p className="text-[11px] mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#fff3e8] text-[#9a3412] font-semibold">
                                  RSVP required
                                </span>
                                <span className="ml-2 text-[#0f766e] font-semibold">
                                  {event.parent_rsvp_status
                                    ? `You replied: ${String(event.parent_rsvp_status).toUpperCase() === 'GOING' ? 'Going' : 'Not going'}`
                                    : 'No Reply'}
                                </span>
                              </p>
                            ) : null}
                            {event.location ? (
                              <p className="text-xs parent-text-muted mt-1 inline-flex items-center gap-1 truncate">
                                <MapPin size={11} />
                                {event.location}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <EventDetailsModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        onRsvp={submitRsvp}
        isRsvpUpdating={Boolean(selectedEvent) && rsvpUpdatingId === selectedEvent.id}
        theme="parent"
      />
    </ParentLayout>
  );
}

export default ParentEvents;
