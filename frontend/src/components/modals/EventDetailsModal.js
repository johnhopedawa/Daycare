import React from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  Repeat2,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
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

const formatDate = (value) => {
  if (!value) return '-';
  const [year, month, day] = String(value).split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-US');
};

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export function EventDetailsModal({
  event,
  isOpen,
  onClose,
  onToggleStatus,
  isStatusUpdating = false,
  onDelete,
  isDeleting = false,
  onRsvp,
  isRsvpUpdating = false,
  theme = 'default',
}) {
  if (!event) {
    return null;
  }

  const isParentTheme = theme === 'parent';
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
  const typeLabel = entryType === 'MAINTENANCE' ? 'Maintenance/Compliance' : 'Event';
  const statusLabel = status === 'DONE' ? 'Done' : 'Open';
  const canToggleStatus = entryType === 'MAINTENANCE' && typeof onToggleStatus === 'function';
  const canDelete = typeof onDelete === 'function';
  const rsvpRequired = entryType !== 'MAINTENANCE' && Boolean(event.requires_rsvp);
  const parentRsvpStatus = String(event.parent_rsvp_status || '').toUpperCase();
  const hasParentRsvp = parentRsvpStatus === 'GOING' || parentRsvpStatus === 'NOT_GOING';
  const canRsvp = rsvpRequired && typeof onRsvp === 'function';
  const rsvpResponses = Array.isArray(event.rsvp_responses) ? event.rsvp_responses : [];
  const rsvpSummary = event.rsvp_summary || null;
  const respondedFamilies = rsvpSummary
    ? (Number(rsvpSummary.going || 0) + Number(rsvpSummary.notGoing || 0))
    : 0;
  const doneAtLabel = status === 'DONE' ? formatDateTime(event.completed_at) : null;
  const detailFieldClasses = isParentTheme
    ? 'rounded-2xl border p-3'
    : 'rounded-2xl border border-[#FFE5D9] bg-[#FFFDFB] p-3';
  const detailFieldStyle = isParentTheme
    ? {
      borderColor: 'var(--parent-card-border)',
      backgroundColor: 'var(--parent-soft-bg)',
      color: 'var(--parent-text)',
    }
    : undefined;
  const headingStyle = isParentTheme ? { color: 'var(--parent-text-muted)' } : undefined;
  const valueStyle = isParentTheme ? { color: 'var(--parent-text)' } : undefined;
  const iconStyle = isParentTheme ? { color: 'var(--parent-text-muted)' } : undefined;
  const detailsContainerStyle = isParentTheme
    ? {
      borderColor: 'var(--parent-card-border)',
      backgroundColor: 'var(--parent-card-bg)',
    }
    : undefined;
  const detailsTextStyle = isParentTheme ? { color: 'var(--parent-text)' } : undefined;
  const actionButtonStyle = isParentTheme
    ? {
      borderColor: 'var(--parent-button-soft-border)',
      color: 'var(--parent-button-soft-text)',
      backgroundColor: 'var(--parent-button-soft-bg)',
    }
    : undefined;
  const deleteButtonStyle = isParentTheme
    ? {
      borderColor: '#efbcbc',
      color: '#b42318',
      backgroundColor: '#fff5f5',
    }
    : undefined;
  const rsvpStatusTone = hasParentRsvp
    ? (parentRsvpStatus === 'GOING'
      ? {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        color: isParentTheme ? 'var(--parent-button-soft-text)' : '#065f46',
      }
      : {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        color: '#991b1b',
      })
    : {
      backgroundColor: isParentTheme ? 'var(--parent-soft-bg)' : 'rgba(59, 130, 246, 0.1)',
      color: isParentTheme ? 'var(--parent-text-muted)' : '#1e3a8a',
    };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={event.title}
      maxWidth="max-w-3xl"
      theme={isParentTheme ? 'parent' : 'default'}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold"
            style={{
              backgroundColor: entryType === 'MAINTENANCE'
                ? (isParentTheme ? 'var(--parent-soft-bg)' : 'rgba(var(--accent-rgb), 0.22)')
                : (isParentTheme ? 'var(--parent-card-bg)' : 'var(--background)'),
              color: entryType === 'MAINTENANCE'
                ? (isParentTheme ? 'var(--parent-button-soft-text)' : 'var(--primary-dark)')
                : (isParentTheme ? 'var(--parent-text-muted)' : 'var(--muted)'),
              border: isParentTheme ? '1px solid var(--parent-pill-border)' : 'none',
            }}
          >
            <ShieldCheck size={13} />
            {typeLabel}
          </span>
          {entryType === 'MAINTENANCE' ? (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold"
              style={{
                backgroundColor: status === 'DONE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.14)',
                color: status === 'DONE' ? 'var(--success)' : '#92400e',
                border: isParentTheme ? '1px solid var(--parent-pill-border)' : 'none',
              }}
            >
              {status === 'DONE' ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
              {statusLabel}
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 text-sm text-stone-700">
          <div className={detailFieldClasses} style={detailFieldStyle}>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide" style={headingStyle}>Type</p>
            <p className="mt-1 font-semibold text-stone-800" style={valueStyle}>{typeLabel}</p>
          </div>
          <div className={detailFieldClasses} style={detailFieldStyle}>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide" style={headingStyle}>Date</p>
            <p className="mt-1 font-semibold text-stone-800 inline-flex items-center gap-1.5" style={valueStyle}>
              <CalendarDays size={14} className="text-stone-400" style={iconStyle} />
              {formatDate(event.event_date)}
            </p>
          </div>
          <div className={detailFieldClasses} style={detailFieldStyle}>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide" style={headingStyle}>Time</p>
            <p className="mt-1 font-semibold text-stone-800 inline-flex items-center gap-1.5" style={valueStyle}>
              <Clock3 size={14} className="text-stone-400" style={iconStyle} />
              {timeLabel}
            </p>
          </div>
          <div className={detailFieldClasses} style={detailFieldStyle}>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide" style={headingStyle}>Audience</p>
            <p className="mt-1 font-semibold text-stone-800 inline-flex items-center gap-1.5" style={valueStyle}>
              <Users size={14} className="text-stone-400" style={iconStyle} />
              {audienceLabelMap[audience] || audience}
            </p>
          </div>
          {entryType !== 'MAINTENANCE' ? (
            <div className={detailFieldClasses} style={detailFieldStyle}>
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide" style={headingStyle}>RSVP</p>
              <p className="mt-1 font-semibold text-stone-800" style={valueStyle}>
                {rsvpRequired ? 'Required' : 'Not required'}
              </p>
              {isParentTheme ? (
                <p className="mt-1 text-xs text-stone-500" style={headingStyle}>
                  Response: {hasParentRsvp ? (parentRsvpStatus === 'GOING' ? 'Going' : 'Not going') : 'No Reply'}
                </p>
              ) : rsvpRequired ? (
                <p className="mt-1 text-xs text-stone-500" style={headingStyle}>
                  Families replied: {rsvpSummary ? `${respondedFamilies}/${rsvpSummary.totalFamilies}` : 'Loading...'}
                </p>
              ) : null}
            </div>
          ) : null}
          {event.location ? (
            <div className={detailFieldClasses} style={detailFieldStyle}>
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide" style={headingStyle}>Location</p>
              <p className="mt-1 font-semibold text-stone-800 inline-flex items-center gap-1.5" style={valueStyle}>
                <MapPin size={14} className="text-stone-400" style={iconStyle} />
                {event.location}
              </p>
            </div>
          ) : null}
          {entryType === 'MAINTENANCE' ? (
            <>
              <div className={detailFieldClasses} style={detailFieldStyle}>
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide" style={headingStyle}>Recurrence</p>
                <p className="mt-1 font-semibold text-stone-800 inline-flex items-center gap-1.5" style={valueStyle}>
                  <Repeat2 size={14} className="text-stone-400" style={iconStyle} />
                  {recurrenceLabelMap[recurrence] || 'One-Time'}
                </p>
              </div>
              <div className={detailFieldClasses} style={detailFieldStyle}>
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide" style={headingStyle}>Status</p>
                <p className="mt-1 font-semibold text-stone-800" style={valueStyle}>{statusLabel}</p>
                {doneAtLabel ? (
                  <p className="mt-1 text-xs text-stone-500" style={headingStyle}>Completed: {doneAtLabel}</p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {event.description && (
          <div className="rounded-2xl border border-[#FFE5D9] bg-white p-4" style={detailsContainerStyle}>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2 inline-flex items-center gap-1.5" style={headingStyle}>
              <FileText size={13} className="text-stone-400" style={iconStyle} />
              Details
            </p>
            <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed" style={detailsTextStyle}>{event.description}</p>
          </div>
        )}

        {rsvpRequired ? (
          <div className="rounded-2xl border border-[#FFE5D9] bg-white p-4" style={detailsContainerStyle}>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2" style={headingStyle}>
              RSVP
            </p>
            {isParentTheme ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={rsvpStatusTone}
                >
                  {hasParentRsvp
                    ? `You replied: ${parentRsvpStatus === 'GOING' ? 'Going' : 'Not going'}`
                    : 'No Reply'}
                </span>
                {canRsvp ? (
                  <>
                    <button
                      type="button"
                      disabled={isRsvpUpdating}
                      onClick={() => onRsvp(event, 'GOING')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-60 ${
                        parentRsvpStatus === 'GOING'
                          ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                          : 'border-[#FFE5D9] bg-[#FFF8F3] text-stone-700 hover:bg-[#FFEFE6]'
                      }`}
                    >
                      Going
                    </button>
                    <button
                      type="button"
                      disabled={isRsvpUpdating}
                      onClick={() => onRsvp(event, 'NOT_GOING')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-60 ${
                        parentRsvpStatus === 'NOT_GOING'
                          ? 'border-rose-300 bg-rose-100 text-rose-800'
                          : 'border-[#FFE5D9] bg-[#FFF8F3] text-stone-700 hover:bg-[#FFEFE6]'
                      }`}
                    >
                      Can&apos;t make it
                    </button>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Going: {rsvpSummary ? rsvpSummary.going : 0}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 text-rose-800">
                    Not going: {rsvpSummary ? rsvpSummary.notGoing : 0}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-100 text-sky-800">
                    No reply: {rsvpSummary ? rsvpSummary.noReply : 0}
                  </span>
                </div>
                {rsvpResponses.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-[#FFE5D9]">
                    {rsvpResponses.map((response) => {
                      const responseStatus = String(response.status || 'NO_REPLY').toUpperCase();
                      const statusLabel = responseStatus === 'GOING'
                        ? 'Going'
                        : (responseStatus === 'NOT_GOING' ? 'Not going' : 'No Reply');
                      const statusClasses = responseStatus === 'GOING'
                        ? 'bg-emerald-100 text-emerald-800'
                        : (responseStatus === 'NOT_GOING'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-sky-100 text-sky-800');
                      const parentName = [response.first_name, response.last_name]
                        .filter(Boolean)
                        .join(' ')
                        .trim() || response.email || 'Family';

                      return (
                        <div
                          key={response.parent_id}
                          className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#FFEFE6] last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-700 truncate">{parentName}</p>
                            {response.email ? (
                              <p className="text-xs text-stone-500 truncate">{response.email}</p>
                            ) : null}
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${statusClasses}`}>
                            {statusLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">
                    {rsvpSummary ? 'No active families found for RSVP tracking.' : 'Loading RSVP responses...'}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}

        {canToggleStatus || canDelete ? (
          <div className="pt-1 flex flex-wrap items-center gap-2">
            {canToggleStatus ? (
              <button
                type="button"
                disabled={isStatusUpdating || isDeleting || isRsvpUpdating}
                onClick={() => onToggleStatus(event)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#FFE5D9] text-sm font-semibold text-stone-700 hover:bg-[#FFF8F3] disabled:opacity-60"
                style={actionButtonStyle}
              >
                <ShieldCheck size={15} />
                {status === 'DONE' ? 'Reopen Item' : 'Mark Done'}
              </button>
            ) : null}

            {canDelete ? (
              <button
                type="button"
                disabled={isDeleting || isStatusUpdating || isRsvpUpdating}
                onClick={() => onDelete(event)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-60"
                style={deleteButtonStyle}
              >
                <Trash2 size={15} />
                {isDeleting ? 'Deleting...' : 'Delete Event'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </BaseModal>
  );
}
