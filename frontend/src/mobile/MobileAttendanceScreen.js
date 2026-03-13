import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  UserRound,
  X,
} from 'lucide-react';
import api from '../utils/api';

const ABSENT_STATUSES = ['ABSENT', 'SICK', 'VACATION'];

const SHEET_TITLE = {
  checkin: 'Check In',
  checkout: 'Check Out',
  absent: 'Mark Absence',
};

const timeOptions = Array.from({ length: 96 }, (_, index) => {
  const totalMinutes = index * 15;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  const hour = Number(hours);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return {
    value: `${hours}:${minutes}`,
    label: `${hour12}:${minutes} ${suffix}`,
  };
});

function formatDateForApi(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateInput(date) {
  return formatDateForApi(date);
}

function parseDateInput(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatTime(value) {
  if (!value) return '-';
  const [hours, minutes] = String(value).split(':');
  const hour = Number.parseInt(hours, 10);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

function parseAttendanceNotes(rawNotes) {
  const parsed = { dropOff: '', pickUp: '', general: '' };
  const value = String(rawNotes || '').trim();
  if (!value) return parsed;

  const generalLines = [];
  value.split('\n').forEach((line) => {
    const entry = line.trim();
    if (!entry) return;
    if (entry.startsWith('DROP_OFF_NOTE::')) {
      parsed.dropOff = entry.replace('DROP_OFF_NOTE::', '').trim();
      return;
    }
    if (entry.startsWith('PICK_UP_NOTE::')) {
      parsed.pickUp = entry.replace('PICK_UP_NOTE::', '').trim();
      return;
    }
    generalLines.push(entry);
  });

  parsed.general = generalLines.join('\n').trim();
  return parsed;
}

function buildAttendanceNotes({ dropOff = '', pickUp = '', general = '' }) {
  const lines = [];
  if (dropOff) lines.push(`DROP_OFF_NOTE::${dropOff}`);
  if (pickUp) lines.push(`PICK_UP_NOTE::${pickUp}`);
  if (general) lines.push(general);
  return lines.join('\n').trim() || null;
}

function getStatusTone(record) {
  if (!record) return 'idle';
  if (record.check_in_time && !record.check_out_time) return 'present';
  if (record.check_out_time) return 'checkedout';
  if (record.status === 'ABSENT') return 'absent';
  if (record.status === 'SICK') return 'warning';
  if (record.status === 'VACATION') return 'info';
  return 'idle';
}

function getStatusLabel(record) {
  if (!record) return 'Not recorded';
  if (record.check_in_time && !record.check_out_time) return 'Checked in';
  if (record.check_out_time) return 'Checked out';
  if (record.status === 'ABSENT') return 'Absent';
  if (record.status === 'SICK') return 'Sick';
  if (record.status === 'VACATION') return 'Vacation';
  return 'Not recorded';
}

function getParentChoicesForChild(children, childId) {
  const child = children.find((entry) => String(entry.id) === String(childId));
  const rawParents = Array.isArray(child?.parents) ? child.parents : [];
  const uniqueParents = Array.from(
    new Map(
      rawParents
        .filter((parent) => parent && parent.id)
        .map((parent) => [String(parent.id), parent])
    ).values()
  );

  const sortedParents = [...uniqueParents].sort((a, b) => {
    const aPrimary = Boolean(a.is_primary_contact);
    const bPrimary = Boolean(b.is_primary_contact);
    if (aPrimary !== bPrimary) {
      return aPrimary ? -1 : 1;
    }
    const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
    const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
    return aName.localeCompare(bName);
  });

  return sortedParents.map((parent) => ({
    value: String(parent.id),
    label: `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || `Parent ${parent.id}`,
    isPrimary: Boolean(parent.is_primary_contact),
  }));
}

function StatusChip({ record }) {
  const tone = getStatusTone(record);
  const styles = {
    present: 'bg-emerald-100 text-emerald-700',
    checkedout: 'bg-amber-100 text-amber-700',
    absent: 'bg-rose-100 text-rose-700',
    warning: 'bg-orange-100 text-orange-700',
    info: 'bg-sky-100 text-sky-700',
    idle: 'bg-stone-100 text-stone-500',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[tone]}`}>
      {tone === 'present' ? <CheckCircle2 size={12} /> : tone === 'checkedout' ? <Clock3 size={12} /> : tone === 'absent' ? <AlertCircle size={12} /> : <UserRound size={12} />}
      {getStatusLabel(record)}
    </span>
  );
}

function AttendanceActionSheet({
  mode,
  child,
  parentOptions,
  selectedParentValue,
  onParentChange,
  customParentName,
  onCustomParentChange,
  note,
  onNoteChange,
  manualTime,
  onManualTimeChange,
  absentStatus,
  onAbsentStatusChange,
  attendanceMode,
  onClose,
  onSubmit,
  submitting,
}) {
  if (!mode || !child) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
        aria-label="Close attendance action"
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[32px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 shadow-[0_-18px_48px_rgba(15,23,42,0.18)]">
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-stone-200" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Attendance</p>
            <h3 className="font-quicksand text-2xl font-bold text-stone-900">{SHEET_TITLE[mode]}</h3>
            <p className="mt-1 text-sm text-stone-500">{child.first_name} {child.last_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500"
          >
            <X size={18} />
          </button>
        </div>

        {(mode === 'checkin' || mode === 'checkout') && (
          <>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Parent / Guardian
            </label>
            <select
              value={selectedParentValue}
              onChange={(event) => onParentChange(event.target.value)}
              className="mb-3 w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
            >
              {parentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}{option.isPrimary ? ' (Primary)' : ''}
                </option>
              ))}
              <option value="custom">Custom / Other...</option>
            </select>

            {selectedParentValue === 'custom' && (
              <input
                value={customParentName}
                onChange={(event) => onCustomParentChange(event.target.value)}
                placeholder="Enter parent or guardian name"
                className="mb-3 w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
              />
            )}
          </>
        )}

        {mode === 'absent' ? (
          <>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Absence Type
            </label>
            <select
              value={absentStatus}
              onChange={(event) => onAbsentStatusChange(event.target.value)}
              className="mb-3 w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
            >
              <option value="ABSENT">Absent</option>
              <option value="SICK">Sick</option>
              <option value="VACATION">Vacation</option>
            </select>
          </>
        ) : null}

        <div className="mb-3 rounded-[26px] bg-[var(--background)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            {attendanceMode === 'manual' ? 'Manual Time' : 'Automatic Time'}
          </p>
          {attendanceMode === 'manual' ? (
            <select
              value={manualTime}
              onChange={(event) => onManualTimeChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
            >
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-2 text-sm font-semibold text-stone-700">
              {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>

        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          {mode === 'checkout' ? 'Pick-Up Notes' : mode === 'checkin' ? 'Drop-Off Notes' : 'Notes'}
        </label>
        <textarea
          rows={3}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Add a short note..."
          className="mb-4 w-full resize-none rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Saving...' : SHEET_TITLE[mode]}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileAttendanceScreen({ role = 'ADMIN', title = 'Attendance', subtitle = 'Track today\'s check-ins and absences' }) {
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceMode, setAttendanceMode] = useState(() => localStorage.getItem('attendanceMode') || 'automatic');
  const [attendanceError, setAttendanceError] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [parentOptions, setParentOptions] = useState([]);
  const [selectedParentValue, setSelectedParentValue] = useState('custom');
  const [customParentName, setCustomParentName] = useState('');
  const [manualTime, setManualTime] = useState('07:00');
  const [note, setNote] = useState('');
  const [absentStatus, setAbsentStatus] = useState('ABSENT');
  const [submitting, setSubmitting] = useState(false);

  const dateKey = useMemo(() => formatDateForApi(selectedDate), [selectedDate]);

  const stats = useMemo(() => {
    const present = attendance.filter((item) => item.check_in_time && !item.check_out_time).length;
    const checkedOut = attendance.filter((item) => item.check_out_time).length;
    const absent = attendance.filter((item) => ABSENT_STATUSES.includes(item.status)).length;
    return {
      total: children.length,
      present,
      checkedOut,
      absent,
      recorded: present + checkedOut + absent,
    };
  }, [attendance, children.length]);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setAttendanceError('');
      const [attendanceRes, childrenRes] = await Promise.all([
        api.get('/attendance', { params: { start_date: dateKey, end_date: dateKey } }),
        api.get('/attendance/children', { params: { status: 'ACTIVE', date: dateKey } }),
      ]);

      setAttendance(attendanceRes.data.attendance || []);
      setChildren(childrenRes.data.children || []);
    } catch (error) {
      if (error.response?.status === 403) {
        setAttendanceError(error.response?.data?.error || 'You are not scheduled for this day.');
      } else {
        setAttendanceError('Failed to load attendance.');
      }
      setAttendance([]);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const getAttendanceRecord = (childId) => {
    return attendance.find((record) => record.child_id === childId) || null;
  };

  const openSheet = (mode, child) => {
    const options = getParentChoicesForChild(children, child.id);
    const defaultOption = options.find((option) => option.isPrimary)?.value || options[0]?.value || 'custom';
    setSelectedChild(child);
    setActiveAction(mode);
    setParentOptions(options);
    setSelectedParentValue(defaultOption);
    setCustomParentName('');
    setNote('');
    setAbsentStatus('ABSENT');
    setManualTime(mode === 'checkout' ? '18:00' : '07:00');
  };

  const closeSheet = () => {
    setActiveAction(null);
    setSelectedChild(null);
    setParentOptions([]);
    setSelectedParentValue('custom');
    setCustomParentName('');
    setNote('');
    setSubmitting(false);
  };

  const resolveParentName = () => {
    if (selectedParentValue === 'custom') {
      return customParentName.trim();
    }
    return parentOptions.find((option) => option.value === selectedParentValue)?.label || '';
  };

  const submitAction = async () => {
    if (!selectedChild) return;

    const existingRecord = getAttendanceRecord(selectedChild.id);
    const existingNotes = parseAttendanceNotes(existingRecord?.notes);

    try {
      setSubmitting(true);

      if (activeAction === 'checkin') {
        const parentName = resolveParentName();
        if (!parentName) {
          setAttendanceError('Select or enter a parent or guardian name.');
          setSubmitting(false);
          return;
        }

        await api.post('/attendance/check-in', {
          child_id: selectedChild.id,
          parent_name: parentName,
          attendance_date: dateKey,
          check_in_time: attendanceMode === 'manual' ? `${manualTime}:00` : undefined,
          notes: buildAttendanceNotes({
            dropOff: note.trim() || existingNotes.dropOff,
            pickUp: existingNotes.pickUp,
            general: existingNotes.general,
          }),
        });
      }

      if (activeAction === 'checkout') {
        const parentName = resolveParentName();
        if (!parentName) {
          setAttendanceError('Select or enter a parent or guardian name.');
          setSubmitting(false);
          return;
        }

        await api.post('/attendance/check-out', {
          child_id: selectedChild.id,
          parent_name: parentName,
          attendance_date: dateKey,
          check_out_time: attendanceMode === 'manual' ? `${manualTime}:00` : undefined,
          notes: buildAttendanceNotes({
            dropOff: existingNotes.dropOff,
            pickUp: note.trim() || existingNotes.pickUp,
            general: existingNotes.general,
          }),
        });
      }

      if (activeAction === 'absent') {
        await api.post('/attendance/mark-absent', {
          child_id: selectedChild.id,
          attendance_date: dateKey,
          status: absentStatus,
          notes: note.trim() || null,
        });
      }

      closeSheet();
      await loadAttendance();
    } catch (error) {
      setAttendanceError(error.response?.data?.error || 'Failed to update attendance.');
      setSubmitting(false);
    }
  };

  const roster = useMemo(() => {
    return [...children].sort((left, right) => {
      const leftRecord = attendance.find((record) => record.child_id === left.id) || null;
      const rightRecord = attendance.find((record) => record.child_id === right.id) || null;
      const leftWeight = leftRecord ? (leftRecord.check_out_time ? 2 : ABSENT_STATUSES.includes(leftRecord.status) ? 3 : 1) : 0;
      const rightWeight = rightRecord ? (rightRecord.check_out_time ? 2 : ABSENT_STATUSES.includes(rightRecord.status) ? 3 : 1) : 0;
      if (leftWeight !== rightWeight) return leftWeight - rightWeight;
      return `${left.first_name} ${left.last_name}`.localeCompare(`${right.first_name} ${right.last_name}`);
    });
  }, [children, attendance]);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{role === 'EDUCATOR' ? 'Classroom Attendance' : 'Attendance Overview'}</p>
            <h1 className="mt-1 font-quicksand text-3xl font-bold text-stone-900">{title}</h1>
            <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setAttendanceMode((prev) => {
              const next = prev === 'automatic' ? 'manual' : 'automatic';
              localStorage.setItem('attendanceMode', next);
              return next;
            })}
            className="rounded-full bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--primary-dark)]"
          >
            {attendanceMode === 'automatic' ? 'Auto time' : 'Manual time'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 rounded-[24px] bg-[var(--background)] px-4 py-3">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              <CalendarDays size={13} />
              Date
            </span>
            <input
              type="date"
              value={formatDateInput(selectedDate)}
              onChange={(event) => setSelectedDate(parseDateInput(event.target.value))}
              className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-stone-700 outline-none"
            />
          </label>
          <div className="rounded-[24px] bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Present</p>
            <p className="mt-1 text-2xl font-black text-emerald-900">{stats.present}</p>
          </div>
          <div className="rounded-[24px] bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Checked Out</p>
            <p className="mt-1 text-2xl font-black text-amber-900">{stats.checkedOut}</p>
          </div>
          <div className="rounded-[24px] bg-rose-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Absent</p>
            <p className="mt-1 text-2xl font-black text-rose-900">{stats.absent}</p>
          </div>
          <div className="rounded-[24px] bg-stone-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Recorded</p>
            <p className="mt-1 text-2xl font-black text-stone-900">{stats.recorded}/{stats.total}</p>
          </div>
        </div>

        {attendanceError ? (
          <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {attendanceError}
          </div>
        ) : null}
      </section>

      {loading ? (
        <div className="rounded-[28px] bg-white px-5 py-10 text-center text-sm text-stone-500 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
          Loading attendance workspace...
        </div>
      ) : roster.length === 0 ? (
        <div className="rounded-[28px] bg-white px-5 py-10 text-center text-sm text-stone-500 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
          No active children found for this date.
        </div>
      ) : (
        <section className="space-y-3">
          {roster.map((child) => {
            const record = getAttendanceRecord(child.id);
            const parsedNotes = parseAttendanceNotes(record?.notes);
            const displayNote = parsedNotes.pickUp || parsedNotes.dropOff || parsedNotes.general;
            const canCheckOut = Boolean(record?.check_in_time) && !record?.check_out_time && !ABSENT_STATUSES.includes(record?.status);

            return (
              <article
                key={child.id}
                className="rounded-[28px] bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[var(--accent)] text-[var(--primary-dark)]">
                    <span className="text-lg font-bold">{child.first_name?.charAt(0) || '?'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-stone-900">{child.first_name} {child.last_name}</h3>
                        <p className="mt-1 text-xs text-stone-500">
                          {record?.check_in_time ? `In ${formatTime(record.check_in_time)}` : 'No check-in yet'}
                          {record?.check_out_time ? ` | Out ${formatTime(record.check_out_time)}` : ''}
                        </p>
                      </div>
                      <StatusChip record={record} />
                    </div>

                    {(child.allergies || child.medical_notes) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {child.allergies ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                            Allergy info
                          </span>
                        ) : null}
                        {child.medical_notes ? (
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-800">
                            Medical notes
                          </span>
                        ) : null}
                      </div>
                    )}

                    {displayNote ? (
                      <p className="mt-3 rounded-[20px] bg-stone-50 px-3 py-2 text-xs text-stone-600">
                        {displayNote}
                      </p>
                    ) : null}

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {!record ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openSheet('checkin', child)}
                            className="rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white"
                          >
                            Check In
                          </button>
                          <button
                            type="button"
                            onClick={() => openSheet('absent', child)}
                            className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                          >
                            Absent
                          </button>
                          <div className="rounded-full bg-stone-50 px-3 py-2 text-center text-xs font-semibold text-stone-400">
                            Waiting
                          </div>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => canCheckOut && openSheet('checkout', child)}
                            disabled={!canCheckOut}
                            className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 disabled:opacity-40"
                          >
                            Check Out
                          </button>
                          <div className="col-span-2 rounded-full bg-stone-50 px-3 py-2 text-center text-xs font-semibold text-stone-500">
                            {record.parent_dropped_off || record.parent_picked_up || 'Family contact not recorded'}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <AttendanceActionSheet
        mode={activeAction}
        child={selectedChild}
        parentOptions={parentOptions}
        selectedParentValue={selectedParentValue}
        onParentChange={setSelectedParentValue}
        customParentName={customParentName}
        onCustomParentChange={setCustomParentName}
        note={note}
        onNoteChange={setNote}
        manualTime={manualTime}
        onManualTimeChange={setManualTime}
        absentStatus={absentStatus}
        onAbsentStatusChange={setAbsentStatus}
        attendanceMode={attendanceMode}
        onClose={closeSheet}
        onSubmit={submitAction}
        submitting={submitting}
      />
    </div>
  );
}
