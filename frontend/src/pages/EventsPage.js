import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { Layout } from '../components/Layout';
import { CreateEventModal } from '../components/modals/CreateEventModal';
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

export function EventsPage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const response = await api.get('/events', {
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
    <Layout title="Events" subtitle="Plan and share daycare events">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="px-3 py-2 rounded-xl border themed-border text-sm font-semibold text-stone-600"
          >
            Prev
          </button>
          <div className="text-lg font-bold text-stone-800">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="px-3 py-2 rounded-xl border themed-border text-sm font-semibold text-stone-600"
          >
            Next
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-md"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <Plus size={16} />
          Create Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
        <div className="themed-surface rounded-3xl p-5">
          <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-stone-500 mb-3 text-center">
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
              const isToday = key === formatDateKey(new Date());

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`h-20 rounded-2xl border p-2 text-left transition-colors ${
                    isSelected ? 'border-[var(--primary)] bg-[var(--background)]' : 'themed-border bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isToday ? 'text-[var(--primary-dark)]' : 'text-stone-600'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-1)] text-[var(--card-text-1)]">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-[10px] text-stone-500 truncate"
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-stone-400">+ more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="themed-surface rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Agenda</p>
              <p className="text-lg font-bold text-stone-800">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
            </div>
            <CalendarDays size={18} className="text-stone-400" />
          </div>

          {loading ? (
            <div className="text-sm text-stone-500">Loading events...</div>
          ) : selectedEvents.length === 0 ? (
            <div className="text-sm text-stone-500">No events scheduled for this day.</div>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className="w-full text-left p-4 rounded-2xl border themed-border bg-white hover:bg-[var(--background)] transition-colors"
                >
                  <p className="text-sm font-semibold text-stone-800">{event.title}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    {event.start_time ? event.start_time.slice(0, 5) : 'All day'}
                  </p>
                  {event.location && (
                    <p className="text-xs text-stone-400 mt-1">{event.location}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          const reload = async () => {
            try {
              const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
              const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
              const response = await api.get('/events', {
                params: { from: formatDateKey(start), to: formatDateKey(end) },
              });
              setEvents(response.data.events || []);
            } catch (error) {
              console.error('Failed to refresh events:', error);
            }
          };
          reload();
        }}
      />

      <EventDetailsModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
      />
    </Layout>
  );
}

export default EventsPage;
