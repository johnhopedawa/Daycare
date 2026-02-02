import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { BaseModal } from '../components/modals/BaseModal';
import api from '../utils/api';

const REQUEST_BATCH_WINDOW_MS = 10 * 60 * 1000;
const HOURS_PER_DAY = 8;

const normalizeDateKey = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const raw = String(value);
  if (raw.includes('T')) {
    return raw.split('T')[0];
  }
  if (raw.length === 10 && raw[4] === '-' && raw[7] === '-') {
    return raw;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDateLabel = (dateKey) => {
  const date = parseDateKey(dateKey);
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatRequestRange = (startKey, endKey) => {
  if (!startKey || !endKey) return '';
  if (startKey === endKey) {
    return formatDateLabel(startKey);
  }
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  if (!start || !end) return `${startKey} - ${endKey}`;
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${formatDateLabel(startKey)} - ${formatDateLabel(endKey)}`;
};

const formatRequestType = (type) => {
  const value = String(type || '').toUpperCase();
  if (value === 'SICK') return 'Sick';
  if (value === 'VACATION') return 'Vacation';
  if (value === 'UNPAID') return 'Unpaid';
  return value || 'Time Off';
};

const calculateDays = (startKey, endKey) => {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  if (!start || !end) return 0;
  const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : 0;
};

const getHoursForRequest = (request) => {
  if (request.hours !== null && request.hours !== undefined && request.hours !== '') {
    const parsed = parseFloat(request.hours);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const startKey = normalizeDateKey(request.start_date);
  const endKey = normalizeDateKey(request.end_date);
  return calculateDays(startKey, endKey) * HOURS_PER_DAY;
};

const groupRequests = (requests) => {
  const sorted = [...requests].sort((a, b) => {
    const aStart = normalizeDateKey(a.start_date) || '';
    const bStart = normalizeDateKey(b.start_date) || '';
    if (aStart !== bStart) return aStart.localeCompare(bStart);
    const aCreated = new Date(a.created_at || 0).getTime();
    const bCreated = new Date(b.created_at || 0).getTime();
    return aCreated - bCreated;
  });

  const groups = [];
  sorted.forEach((request) => {
    const startKey = normalizeDateKey(request.start_date);
    const endKey = normalizeDateKey(request.end_date);
    if (!startKey || !endKey) return;

    const createdAt = new Date(request.created_at || 0).getTime();
    const groupKey = [
      request.user_id,
      request.request_type,
      request.status,
      request.hours ?? '',
      request.reason ?? '',
    ].join('|');
    const isSingleDay = startKey === endKey;

    const last = groups[groups.length - 1];
    const canMerge =
      last &&
      last.key === groupKey &&
      last.isSingleDay &&
      isSingleDay &&
      Math.abs(createdAt - last.lastCreatedAt) <= REQUEST_BATCH_WINDOW_MS;

    if (canMerge) {
      const lastEnd = parseDateKey(last.endKey);
      const nextStart = parseDateKey(startKey);
      const isConsecutive =
        lastEnd && nextStart && (nextStart - lastEnd) / (1000 * 60 * 60 * 24) === 1;
      if (isConsecutive) {
        last.endKey = endKey;
        last.ids.push(request.id);
        last.lastCreatedAt = createdAt;
        last.totalHours += getHoursForRequest(request);
        last.count += 1;
        return;
      }
    }

    groups.push({
      key: groupKey,
      ids: [request.id],
      startKey,
      endKey,
      request_type: request.request_type,
      status: request.status,
      first_name: request.first_name,
      last_name: request.last_name,
      hours: request.hours,
      reason: request.reason,
      lastCreatedAt: createdAt,
      isSingleDay,
      totalHours: getHoursForRequest(request),
      count: 1,
    });
  });

  return groups;
};

export function TimeEntriesApprovalPage() {
  const [educators, setEducators] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEducators, setLoadingEducators] = useState(true);
  const [activeEducator, setActiveEducator] = useState(null);
  const [rejectingBatch, setRejectingBatch] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const avatarStyles = [
    { backgroundColor: 'var(--card-1)', color: 'var(--card-text-1)' },
    { backgroundColor: 'var(--card-2)', color: 'var(--card-text-2)' },
    { backgroundColor: 'var(--card-3)', color: 'var(--card-text-3)' },
    { backgroundColor: 'var(--card-4)', color: 'var(--card-text-4)' },
  ];

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/time-off-requests', { params: { status: 'ALL' } });
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to load time off requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEducators = useCallback(async () => {
    try {
      setLoadingEducators(true);
      const response = await api.get('/admin/users?role=EDUCATOR');
      setEducators(response.data.users || []);
    } catch (error) {
      console.error('Failed to load educators:', error);
      setEducators([]);
    } finally {
      setLoadingEducators(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    loadEducators();
  }, [loadEducators]);

  const getInitials = (firstName, lastName) =>
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  const getAvatarStyle = (index) => avatarStyles[index % avatarStyles.length];

  const educatorSummaries = useMemo(() => {
    const map = new Map();
    educators.forEach((educator) => {
      map.set(String(educator.id), {
        user_id: educator.id,
        first_name: educator.first_name,
        last_name: educator.last_name,
        approvedHours: 0,
        pendingHours: 0,
        approvedCount: 0,
        pendingCount: 0,
        requests: [],
      });
    });

    requests.forEach((request) => {
      const key = String(request.user_id);
      if (!map.has(key)) {
        map.set(key, {
          user_id: request.user_id,
          first_name: request.first_name,
          last_name: request.last_name,
          approvedHours: 0,
          pendingHours: 0,
          approvedCount: 0,
          pendingCount: 0,
          requests: [],
        });
      }
      const entry = map.get(key);
      const status = String(request.status || '').toUpperCase();
      const hours = getHoursForRequest(request);
      if (status === 'APPROVED') {
        entry.approvedHours += hours;
        entry.approvedCount += 1;
      } else if (status === 'PENDING') {
        entry.pendingHours += hours;
        entry.pendingCount += 1;
      }
      entry.requests.push(request);
    });

    return Array.from(map.values()).sort((a, b) => {
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [educators, requests]);

  const activeGroups = useMemo(() => {
    if (!activeEducator) return { approved: [], pending: [], rejected: [] };
    const approved = [];
    const pending = [];
    const rejected = [];
    const grouped = groupRequests(activeEducator.requests);
    grouped.forEach((group) => {
      const status = String(group.status || '').toUpperCase();
      if (status === 'APPROVED') approved.push(group);
      if (status === 'PENDING') pending.push(group);
      if (status === 'REJECTED') rejected.push(group);
    });
    return { approved, pending, rejected };
  }, [activeEducator]);

  const handleApproveBatch = async (ids) => {
    if (!ids || ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => api.post(`/time-off-requests/${id}/approve`)));
      loadRequests();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to approve request(s)');
    }
  };

  const handleRejectBatch = async () => {
    if (!rejectingBatch) return;
    try {
      await Promise.all(
        rejectingBatch.ids.map((id) =>
          api.post(`/time-off-requests/${id}/reject`, {
            reason: rejectReason || null,
          })
        )
      );
      setRejectingBatch(null);
      setRejectReason('');
      loadRequests();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reject request(s)');
    }
  };

  const isLoading = loading || loadingEducators;

  return (
    <Layout title="Time Off Requests" subtitle="Review approved and pending educator time off">
      <div className="themed-surface rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-quicksand font-bold text-xl text-stone-800">Educator Summaries</h3>
            <p className="text-xs text-stone-500">
              Approved vs pending time off totals. Click an educator to see details.
            </p>
          </div>
          <div className="text-xs text-stone-500">
            {isLoading ? 'Loading...' : `${educatorSummaries.length} educators`}
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-stone-500">Loading time off requests...</div>
        ) : educatorSummaries.length === 0 ? (
          <div className="p-10 text-center text-stone-500">No time off requests found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {educatorSummaries.map((educator, index) => (
              <button
                key={educator.user_id}
                type="button"
                onClick={() => setActiveEducator(educator)}
                className="bg-white p-6 rounded-3xl shadow-[0_12px_20px_-12px_var(--menu-shadow)] border themed-border flex flex-col items-center text-center hover:translate-y-[-4px] transition-transform duration-300"
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold mb-4 shadow-inner"
                  style={getAvatarStyle(index)}
                >
                  {getInitials(educator.first_name, educator.last_name)}
                </div>
                <h3 className="font-quicksand font-bold text-lg text-stone-800 mb-2">
                  {educator.first_name} {educator.last_name}
                </h3>
                <div
                  className="text-[10px] font-semibold px-2 py-1 rounded-full mb-4"
                  style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                >
                  {educator.requests.length} total
                </div>

                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[var(--background)] rounded-xl">
                    <div className="text-left">
                      <div className="text-[10px] uppercase tracking-wide text-stone-500">Approved</div>
                      <div className="text-[11px] text-stone-500">
                        {educator.approvedCount} request{educator.approvedCount === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-stone-800">
                      {educator.approvedHours.toFixed(1)}h
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--background)] rounded-xl">
                    <div className="text-left">
                      <div className="text-[10px] uppercase tracking-wide text-stone-500">Pending</div>
                      <div className="text-[11px] text-stone-500">
                        {educator.pendingCount} request{educator.pendingCount === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-stone-800">
                      {educator.pendingHours.toFixed(1)}h
                    </div>
                  </div>
                </div>

                <div
                  className="mt-4 w-full py-2 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}
                >
                  View Requests
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BaseModal
        isOpen={Boolean(activeEducator)}
        onClose={() => setActiveEducator(null)}
        title={
          activeEducator
            ? `Time Off Details - ${activeEducator.first_name} ${activeEducator.last_name}`
            : 'Time Off Details'
        }
      >
        {activeEducator && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border themed-border p-3 bg-[color:var(--background)]">
                <div className="text-[10px] uppercase tracking-wide text-stone-500">Approved</div>
                <div className="text-lg font-semibold text-stone-800">
                  {activeEducator.approvedHours.toFixed(1)}h
                </div>
              </div>
              <div className="rounded-2xl border themed-border p-3 bg-white">
                <div className="text-[10px] uppercase tracking-wide text-stone-500">Pending</div>
                <div className="text-lg font-semibold text-stone-800">
                  {activeEducator.pendingHours.toFixed(1)}h
                </div>
              </div>
              <div className="rounded-2xl border themed-border p-3 bg-white">
                <div className="text-[10px] uppercase tracking-wide text-stone-500">Total</div>
                <div className="text-lg font-semibold text-stone-800">
                  {(activeEducator.approvedHours + activeEducator.pendingHours).toFixed(1)}h
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">Pending Requests</p>
              {activeGroups.pending.length === 0 ? (
                <div className="text-sm text-stone-500">No pending requests.</div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto_auto] gap-3 text-[10px] uppercase tracking-wide text-stone-400 px-3">
                    <span>Type</span>
                    <span>Date Range</span>
                    <span>Hours</span>
                    <span className="text-right">Actions</span>
                  </div>
                  {activeGroups.pending.map((group) => (
                    <div
                      key={`pending-${group.ids.join('-')}`}
                      className="rounded-2xl border themed-border bg-white p-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto_auto] gap-3 items-center">
                        <div className="text-sm font-semibold text-stone-800">
                          {formatRequestType(group.request_type)}
                        </div>
                        <div className="text-sm text-stone-600">
                          {formatRequestRange(group.startKey, group.endKey)}
                        </div>
                        <div className="text-xs font-semibold text-stone-600">
                          {group.totalHours.toFixed(1)}h
                        </div>
                        <div className="flex items-center justify-start sm:justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveBatch(group.ids)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                            style={{ backgroundColor: 'var(--primary)' }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingBatch(group);
                              setRejectReason('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border themed-border text-stone-600"
                          >
                            Reject
                          </button>
                        </div>
                        {group.reason && (
                          <div className="text-xs text-stone-500 sm:col-span-4">
                            {group.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">Approved Requests</p>
              {activeGroups.approved.length === 0 ? (
                <div className="text-sm text-stone-500">No approved requests.</div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] gap-3 text-[10px] uppercase tracking-wide text-stone-400 px-3">
                    <span>Type</span>
                    <span>Date Range</span>
                    <span>Hours</span>
                  </div>
                  {activeGroups.approved.map((group) => (
                    <div
                      key={`approved-${group.ids.join('-')}`}
                      className="rounded-2xl border themed-border bg-[color:var(--background)] p-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] gap-3 items-center">
                        <div className="text-sm font-semibold text-stone-800">
                          {formatRequestType(group.request_type)}
                        </div>
                        <div className="text-sm text-stone-600">
                          {formatRequestRange(group.startKey, group.endKey)}
                        </div>
                        <div className="text-xs font-semibold text-stone-600">
                          {group.totalHours.toFixed(1)}h
                        </div>
                        {group.reason && (
                          <div className="text-xs text-stone-500 sm:col-span-3">
                            {group.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeGroups.rejected.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">Rejected Requests</p>
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] gap-3 text-[10px] uppercase tracking-wide text-stone-400 px-3">
                    <span>Type</span>
                    <span>Date Range</span>
                    <span>Status</span>
                  </div>
                  {activeGroups.rejected.map((group) => (
                    <div
                      key={`rejected-${group.ids.join('-')}`}
                      className="rounded-2xl border themed-border bg-white p-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] gap-3 items-center">
                        <div className="text-sm font-semibold text-stone-800">
                          {formatRequestType(group.request_type)}
                        </div>
                        <div className="text-sm text-stone-600">
                          {formatRequestRange(group.startKey, group.endKey)}
                        </div>
                        <div className="text-xs font-semibold text-stone-500">{group.status}</div>
                        {group.reason && (
                          <div className="text-xs text-stone-500 sm:col-span-3">
                            {group.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={Boolean(rejectingBatch)}
        onClose={() => {
          setRejectingBatch(null);
          setRejectReason('');
        }}
        title="Reject Time Off Request"
      >
        <div className="space-y-4">
          {rejectingBatch && (
            <p className="text-sm text-stone-600">
              Rejecting {rejectingBatch.first_name} {rejectingBatch.last_name} -{' '}
              {formatRequestRange(rejectingBatch.startKey, rejectingBatch.endKey)}
            </p>
          )}
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white resize-none"
            placeholder="Reason for rejection (optional)"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setRejectingBatch(null);
                setRejectReason('');
              }}
              className="flex-1 px-4 py-2 rounded-xl border themed-border text-stone-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectBatch}
              className="flex-1 px-4 py-2 rounded-xl text-white font-semibold"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Reject Request{rejectingBatch && rejectingBatch.ids.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </BaseModal>
    </Layout>
  );
}
