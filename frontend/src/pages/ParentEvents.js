import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
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

function ParentEvents() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

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

  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const key = event.event_date;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(event);
    });
    return map;
  }, [events]);

  const selectedKey = formatDateKey(selectedDate);
  const selectedEvents = eventsByDate.get(selectedKey) || [];

  return (
    <ParentLayout title="Events" subtitle="Upcoming daycare activities">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="parent-button-soft px-3 py-2 rounded-xl text-sm font-semibold"
          >
            Prev
          </button>
          <div className="text-lg font-bold parent-text">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="parent-button-soft px-3 py-2 rounded-xl text-sm font-semibold"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
        <div className="parent-card rounded-xl border border-gray-100 p-5">
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

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`h-20 rounded-xl border p-2 text-left transition-colors ${
                    isSelected ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-semibold parent-text"
                    >
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-2)] text-[var(--card-text-2)]">
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

        <div className="parent-card rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold parent-text-muted uppercase tracking-wide">Agenda</p>
              <p className="text-lg font-bold parent-text">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
            </div>
            <CalendarDays size={18} className="parent-text-muted" />
          </div>

          {loading ? (
            <div className="text-sm parent-text-muted">Loading events...</div>
          ) : selectedEvents.length === 0 ? (
            <div className="text-sm parent-text-muted">No events scheduled for this day.</div>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50 transition-colors"
                >
                  <p className="text-sm font-semibold parent-text">{event.title}</p>
                  <p className="text-xs parent-text-muted mt-1">
                    {event.start_time ? event.start_time.slice(0, 5) : 'All day'}
                  </p>
                  {event.location && (
                    <p className="text-xs parent-text-muted mt-1">{event.location}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <EventDetailsModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
      />
    </ParentLayout>
  );
}

export default ParentEvents;
