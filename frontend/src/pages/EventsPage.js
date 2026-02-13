import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Plus, ShieldCheck } from 'lucide-react';
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

const toEventKind = (event) => String(event?.entry_type || 'EVENT').toUpperCase();
const toAudience = (event) => String(event?.audience || 'ALL').toUpperCase();
const toStatus = (event) => String(event?.status || 'OPEN').toUpperCase();
const toRecurrence = (event) => String(event?.recurrence || 'NONE').toUpperCase();

const isMaintenance = (event) => toEventKind(event) === 'MAINTENANCE';
const isFamilyEvent = (event) => (
  toEventKind(event) === 'EVENT'
  && ['ALL', 'PARENTS', 'CHILDREN'].includes(toAudience(event))
);
const isPrivateDaycareItem = (event) => (
  toAudience(event) === 'PRIVATE'
  || toAudience(event) === 'STAFF'
  || isMaintenance(event)
);

const filterConfigs = [
  { key: 'all', label: 'All Items', match: () => true },
  { key: 'family', label: 'Family Events', match: isFamilyEvent },
  { key: 'private', label: 'Private Daycare', match: isPrivateDaycareItem },
  { key: 'maintenance', label: 'Maintenance', match: isMaintenance },
];

const recurrenceLabelMap = {
  NONE: 'One-Time',
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
};

const formatTimeLabel = (event) => {
  const startTime = event?.start_time;
  if (!startTime) return 'All day';
  return startTime.slice(0, 5);
};

export function EventsPage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [rsvpLoadingEventId, setRsvpLoadingEventId] = useState(null);

  const monthTitle = useMemo(
    () => currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [currentMonth]
  );

  const loadEvents = useCallback(async () => {
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
  }, [currentMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedEvent) {
      setRsvpLoadingEventId(null);
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent?.id) return undefined;

    const eventType = String(selectedEvent.entry_type || 'EVENT').toUpperCase();
    const audience = String(selectedEvent.audience || 'ALL').toUpperCase();
    const shouldLoadRsvps = (
      eventType === 'EVENT'
      && Boolean(selectedEvent.requires_rsvp)
      && ['ALL', 'PARENTS', 'CHILDREN'].includes(audience)
    );
    if (!shouldLoadRsvps) return undefined;

    const eventId = selectedEvent.id;
    let cancelled = false;

    const loadRsvpResponses = async () => {
      try {
        setRsvpLoadingEventId(eventId);
        const response = await api.get(`/events/${eventId}/rsvps`);
        if (cancelled) return;

        const summary = response.data?.totals || null;
        const responses = response.data?.responses || [];

        setSelectedEvent((prev) => {
          if (!prev || prev.id !== eventId) return prev;
          return {
            ...prev,
            rsvp_summary: summary,
            rsvp_responses: responses,
          };
        });

        setEvents((prev) => prev.map((item) => (
          item.id === eventId
            ? { ...item, rsvp_summary: summary, rsvp_responses: responses }
            : item
        )));
      } catch (error) {
        console.error('Failed to load event RSVP responses:', error);
      } finally {
        if (!cancelled) {
          setRsvpLoadingEventId(null);
        }
      }
    };

    loadRsvpResponses();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent?.id, selectedEvent?.requires_rsvp, selectedEvent?.entry_type, selectedEvent?.audience]);

  const activeFilterConfig = useMemo(
    () => filterConfigs.find((item) => item.key === activeFilter) || filterConfigs[0],
    [activeFilter]
  );

  const filterCounts = useMemo(() => {
    const counts = {};
    filterConfigs.forEach((config) => {
      counts[config.key] = events.filter(config.match).length;
    });
    return counts;
  }, [events]);

  const filteredEvents = useMemo(
    () => events.filter(activeFilterConfig.match),
    [events, activeFilterConfig]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((event) => {
      const key = event.event_date;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(event);
    });
    return map;
  }, [filteredEvents]);

  const selectedKey = formatDateKey(selectedDate);
  const selectedEvents = eventsByDate.get(selectedKey) || [];

  const toggleMaintenanceStatus = async (event, clickEvent) => {
    if (clickEvent?.stopPropagation) {
      clickEvent.stopPropagation();
    }
    const currentStatus = toStatus(event);
    const nextStatus = currentStatus === 'DONE' ? 'OPEN' : 'DONE';
    try {
      setStatusUpdatingId(event.id);
      const response = await api.patch(`/events/${event.id}`, { status: nextStatus });
      const updated = response.data.event || {};

      setEvents((prev) => prev.map((item) => {
        if (item.id !== updated.id) return item;
        // Preserve rendered occurrence date for recurring calendar instances.
        return { ...item, ...updated, event_date: item.event_date || updated.event_date };
      }));

      setSelectedEvent((prev) => {
        if (!prev || prev.id !== updated.id) return prev;
        return { ...prev, ...updated, event_date: prev.event_date || updated.event_date };
      });
    } catch (error) {
      console.error('Failed to update maintenance status:', error);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const deleteEvent = async (event) => {
    if (!event?.id) return;

    const confirmed = window.confirm(`Delete "${event.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingEventId(event.id);
      await api.delete(`/events/${event.id}`);
      setEvents((prev) => prev.filter((item) => item.id !== event.id));
      setSelectedEvent((prev) => (prev?.id === event.id ? null : prev));
    } catch (error) {
      console.error('Failed to delete event:', error);
    } finally {
      setDeletingEventId(null);
    }
  };

  return (
    <Layout title="Calendar" subtitle="Family events and private daycare compliance schedule">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl border themed-border bg-white">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="px-3 py-2 rounded-xl text-sm font-medium text-stone-600 hover:text-stone-800"
          >
            Prev
          </button>
          <div className="text-sm font-semibold text-stone-700 min-w-[160px] text-center">
            {monthTitle}
          </div>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="px-3 py-2 rounded-xl text-sm font-medium text-stone-600 hover:text-stone-800"
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
          Add Item
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {filterConfigs.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                isActive ? 'text-white' : 'text-stone-600'
              }`}
              style={
                isActive
                  ? { backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' }
                  : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }
              }
            >
              {filter.label}
              <span
                className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold"
                style={isActive ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { backgroundColor: 'var(--background)' }}
              >
                {filterCounts[filter.key] || 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
        <div className="themed-surface rounded-3xl p-5">
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
              <div key={label} className="calendar-header">{label}</div>
            ))}

            {buildCalendarGrid(currentMonth).map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="calendar-day calendar-day--empty" />;
              }
              const key = formatDateKey(day);
              const dayEvents = eventsByDate.get(key) || [];
              const isSelected = key === selectedKey;
              const isToday = key === formatDateKey(new Date());
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`calendar-day ${hasEvents ? 'calendar-day--scheduled' : ''} ${
                    isToday ? 'calendar-day--today' : ''
                  }`}
                  style={isSelected ? { borderColor: 'var(--primary)', backgroundColor: 'var(--background)' } : undefined}
                >
                  <div className="flex items-center justify-between calendar-day-header">
                    <span className="calendar-day-number">{day.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                        style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                      >
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  <div className="hidden md:flex flex-col gap-1 text-[11px] text-stone-600">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="truncate">
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
              <p className="text-[11px] text-stone-500 mt-1">
                {activeFilterConfig.label}
              </p>
            </div>
            <CalendarDays size={18} className="text-stone-400" />
          </div>

          {loading ? (
            <div className="text-sm text-stone-500">Loading calendar items...</div>
          ) : selectedEvents.length === 0 ? (
            <div className="text-sm text-stone-500">No items scheduled for this day.</div>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((event) => {
                const maintenance = isMaintenance(event);
                const status = toStatus(event);
                const done = status === 'DONE';
                const recurrence = recurrenceLabelMap[toRecurrence(event)] || 'One-Time';
                return (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedEvent(event)}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                        keyEvent.preventDefault();
                        setSelectedEvent(event);
                      }
                    }}
                    className="w-full text-left p-4 rounded-2xl border themed-border bg-white hover:bg-[var(--background)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-800 truncate">{event.title}</p>
                        <p className="text-xs text-stone-500 mt-1">{formatTimeLabel(event)}</p>
                        {event.location && (
                          <p className="text-xs text-stone-400 mt-1 truncate">{event.location}</p>
                        )}
                        {event.requires_rsvp ? (
                          <p className="mt-1 text-[11px] text-stone-500">
                            RSVP required
                            {event.rsvp_summary ? (
                              <span className="ml-2 font-semibold text-stone-600">
                                {event.rsvp_summary.going + event.rsvp_summary.notGoing}/{event.rsvp_summary.totalFamilies} replied
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: maintenance ? 'rgba(var(--accent-rgb), 0.24)' : 'var(--background)',
                            color: maintenance ? 'var(--primary-dark)' : 'var(--muted)',
                          }}
                        >
                          {maintenance ? 'Maintenance' : 'Event'}
                        </span>
                        {maintenance ? (
                          <span className="text-[10px] font-semibold text-stone-500">{recurrence}</span>
                        ) : null}
                      </div>
                    </div>
                    {maintenance ? (
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: done ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.14)',
                            color: done ? 'var(--success)' : '#92400e',
                          }}
                        >
                          {done ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
                          {done ? 'Done' : 'Open'}
                        </span>
                        <button
                          type="button"
                          onClick={(clickEvent) => toggleMaintenanceStatus(event, clickEvent)}
                          disabled={statusUpdatingId === event.id}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md border themed-border text-stone-600 hover:bg-[var(--background)] disabled:opacity-60"
                        >
                          <ShieldCheck size={12} />
                          {done ? 'Reopen' : 'Mark Done'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialDate={selectedDate}
        onSuccess={() => {
          setShowCreateModal(false);
          loadEvents();
        }}
      />

      <EventDetailsModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        onToggleStatus={toggleMaintenanceStatus}
        isStatusUpdating={Boolean(selectedEvent) && (statusUpdatingId === selectedEvent.id || rsvpLoadingEventId === selectedEvent.id)}
        onDelete={deleteEvent}
        isDeleting={Boolean(selectedEvent) && deletingEventId === selectedEvent.id}
      />
    </Layout>
  );
}

export default EventsPage;
