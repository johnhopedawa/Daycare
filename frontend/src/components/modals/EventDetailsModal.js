import React from 'react';
import { BaseModal } from './BaseModal';

const formatTime = (timeValue) => {
  if (!timeValue) return null;
  const [hours, minutes] = timeValue.split(':');
  const hourNum = parseInt(hours, 10);
  if (Number.isNaN(hourNum)) return timeValue;
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  const hour12 = hourNum % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export function EventDetailsModal({ event, isOpen, onClose }) {
  if (!event) {
    return null;
  }

  const entryType = String(event.entry_type || 'EVENT').toUpperCase();
  const audience = String(event.audience || 'ALL').toUpperCase();
  const status = String(event.status || 'OPEN').toUpperCase();
  const recurrence = String(event.recurrence || 'NONE').toUpperCase();
  const timeLabel = event.start_time
    ? `${formatTime(event.start_time)}${event.end_time ? ` - ${formatTime(event.end_time)}` : ''}`
    : 'All day';
  const audienceLabelMap = {
    ALL: 'All Families',
    PARENTS: 'All Families',
    CHILDREN: 'All Families',
    STAFF: 'Daycare (Admins + Staff)',
    PRIVATE: 'Admin Only (Self)',
  };
  const recurrenceLabelMap = {
    NONE: 'One-Time',
    MONTHLY: 'Monthly',
    ANNUAL: 'Annual',
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={event.title}>
      <div className="space-y-4">
        <div className="grid gap-3 text-sm text-stone-600">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Type</p>
            <p>{entryType === 'MAINTENANCE' ? 'Maintenance/Compliance' : 'Event'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Date</p>
            <p>{new Date(event.event_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Time</p>
            <p>{timeLabel}</p>
          </div>
          {event.location && (
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Location</p>
              <p>{event.location}</p>
            </div>
          )}
          {event.audience && (
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Audience</p>
              <p>{audienceLabelMap[audience] || audience}</p>
            </div>
          )}
          {entryType === 'MAINTENANCE' ? (
            <>
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Recurrence</p>
                <p>{recurrenceLabelMap[recurrence] || 'One-Time'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</p>
                <p>{status === 'DONE' ? 'Done' : 'Open'}</p>
              </div>
            </>
          ) : null}
        </div>
        {event.description && (
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Details</p>
            <p className="text-sm text-stone-600 whitespace-pre-line">{event.description}</p>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
