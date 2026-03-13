import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import {
  AppScreen,
  AppTextField,
  Badge,
  EmptyState,
  ErrorBanner,
  FieldLabel,
  PrimaryButton,
  SectionTitle,
  SheetModal,
  StatCard,
  SurfaceCard,
} from '../components/ui';
import {
  acceptSchedule,
  checkInChild,
  checkOutChild,
  createCareLog,
  declineSchedule,
  getEducatorCare,
  getEducatorHome,
  getEducatorSchedule,
  getStaffAttendance,
  getStaffMessages,
  markChildAbsent,
  markStaffMessageRead,
  sendStaffMessage,
} from '../services/mobileApi';
import { fonts } from '../theme/tokens';
import { ChildSummary, ScheduleItem, StaffMessage } from '../types/domain';
import { formatShortDate, formatTime } from '../utils/format';

type AttendanceActionMode = 'check-in' | 'check-out' | 'absent';

export function EducatorHomeScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [homeData, setHomeData] = useState<Awaited<ReturnType<typeof getEducatorHome>> | null>(null);

  async function loadHome() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextHomeData = await getEducatorHome(apiBaseUrl, session.token);
      setHomeData(nextHomeData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load educator home.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHome();
  }, []);

  const nextShift = homeData?.schedules.find((schedule) => schedule.status !== 'DECLINED');

  return (
    <AppScreen
      role="EDUCATOR"
      eyebrow="Classroom Overview"
      title="Home"
      subtitle="Fast classroom context for attendance, care, and shifts."
      action={loadHome}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.statGrid}>
        <StatCard role="EDUCATOR" label="Children" value={homeData?.children.length ?? 0} />
        <StatCard role="EDUCATOR" label="Care Logs" value={homeData?.careLogs.length ?? 0} />
        <StatCard role="EDUCATOR" label="Upcoming Shifts" value={homeData?.schedules.length ?? 0} />
      </View>

      <SurfaceCard role="EDUCATOR">
        <SectionTitle role="EDUCATOR" caption="Next Shift" title="Schedule Preview" />
        {loading ? (
          <Text style={styles.loadingText}>Loading schedule preview...</Text>
        ) : nextShift ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.rowTitle}>{formatShortDate(nextShift.shift_date)}</Text>
            <Text style={styles.secondaryCopy}>
              {formatTime(nextShift.start_time)} - {formatTime(nextShift.end_time)} | {nextShift.hours}h
            </Text>
            <Badge role="EDUCATOR" label={nextShift.status} />
          </View>
        ) : (
          <EmptyState role="EDUCATOR" message="No upcoming shifts are scheduled." />
        )}
      </SurfaceCard>

      <SurfaceCard role="EDUCATOR">
        <SectionTitle role="EDUCATOR" caption="Children in Attendance" title="Today’s Roster" />
        {!homeData || homeData.children.length === 0 ? (
          <EmptyState role="EDUCATOR" message="No active children are available for today’s classroom list." />
        ) : (
          <View style={styles.listStack}>
            {homeData.children.slice(0, 5).map((child) => (
              <View key={child.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{child.first_name} {child.last_name}</Text>
                <Text style={styles.rowMeta}>
                  {child.allergies ? 'Allergy info available' : 'No allergy flag'}
                  {child.medical_notes ? ' | Medical notes available' : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>
    </AppScreen>
  );
}

export function EducatorAttendanceScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [attendance, setAttendance] = useState<Awaited<ReturnType<typeof getStaffAttendance>>['attendance']>([]);
  const [activeChild, setActiveChild] = useState<ChildSummary | null>(null);
  const [actionMode, setActionMode] = useState<AttendanceActionMode | null>(null);
  const [contactName, setContactName] = useState('');
  const [notes, setNotes] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [absenceType, setAbsenceType] = useState<'ABSENT' | 'SICK' | 'VACATION'>('ABSENT');

  async function loadAttendance() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextAttendanceData = await getStaffAttendance(apiBaseUrl, session.token);
      setChildren(nextAttendanceData.children);
      setAttendance(nextAttendanceData.attendance);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAttendance();
  }, []);

  const presentCount = attendance.filter((record) => record.check_in_time && !record.check_out_time).length;
  const absentCount = attendance.filter((record) => ['ABSENT', 'SICK', 'VACATION'].includes(record.status)).length;

  function openAction(child: ChildSummary, mode: AttendanceActionMode) {
    const defaultParent = child.parents?.find((parent) => parent.is_primary_contact) || child.parents?.[0];
    setActiveChild(child);
    setActionMode(mode);
    setContactName(defaultParent ? `${defaultParent.first_name} ${defaultParent.last_name}` : '');
    setNotes('');
    setManualTime('');
    setAbsenceType('ABSENT');
  }

  async function submitAttendanceAction() {
    if (!session || !activeChild || !actionMode) {
      return;
    }

    try {
      if (actionMode === 'check-in') {
        await checkInChild(apiBaseUrl, session.token, activeChild.id, contactName.trim(), notes.trim(), manualTime || undefined);
      }
      if (actionMode === 'check-out') {
        await checkOutChild(apiBaseUrl, session.token, activeChild.id, contactName.trim(), notes.trim(), manualTime || undefined);
      }
      if (actionMode === 'absent') {
        await markChildAbsent(apiBaseUrl, session.token, activeChild.id, absenceType, notes.trim());
      }
      setActionMode(null);
      setActiveChild(null);
      await loadAttendance();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update attendance.');
    }
  }

  return (
    <AppScreen
      role="EDUCATOR"
      eyebrow="Fast Classroom Actions"
      title="Attendance"
      subtitle="Check children in, check them out, or mark absence for today."
      action={loadAttendance}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.statGrid}>
        <StatCard role="EDUCATOR" label="Present" value={presentCount} />
        <StatCard role="EDUCATOR" label="Absent" value={absentCount} />
        <StatCard role="EDUCATOR" label="Roster" value={children.length} />
      </View>

      {loading ? (
        <SurfaceCard role="EDUCATOR">
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </SurfaceCard>
      ) : children.length === 0 ? (
        <EmptyState role="EDUCATOR" message="No children are available for attendance today." />
      ) : (
        children.map((child) => {
          const record = attendance.find((entry) => entry.child_id === child.id);
          const canCheckOut = Boolean(record?.check_in_time) && !record?.check_out_time;
          return (
            <SurfaceCard key={child.id} role="EDUCATOR">
              <View style={styles.rowHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{child.first_name} {child.last_name}</Text>
                  <Text style={styles.rowMeta}>
                    {record?.status || 'Not recorded'}
                    {record?.check_in_time ? ` | In ${formatTime(record.check_in_time)}` : ''}
                    {record?.check_out_time ? ` | Out ${formatTime(record.check_out_time)}` : ''}
                  </Text>
                </View>
                <Badge role="EDUCATOR" label={record?.status || 'Pending'} />
              </View>
              <View style={styles.buttonRow}>
                {!record ? (
                  <>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton label="Check In" onPress={() => openAction(child, 'check-in')} role="EDUCATOR" compact />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton label="Mark Absent" onPress={() => openAction(child, 'absent')} role="EDUCATOR" compact />
                    </View>
                  </>
                ) : (
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label={canCheckOut ? 'Check Out' : 'Already Completed'}
                      onPress={() => openAction(child, 'check-out')}
                      role="EDUCATOR"
                      compact
                      disabled={!canCheckOut}
                    />
                  </View>
                )}
              </View>
            </SurfaceCard>
          );
        })
      )}

      <SheetModal visible={Boolean(activeChild && actionMode)} onClose={() => setActionMode(null)}>
        <View style={{ gap: 14 }}>
          <Text style={styles.modalTitle}>
            {actionMode === 'check-in' ? 'Check In' : actionMode === 'check-out' ? 'Check Out' : 'Mark Absence'}
          </Text>
          <Text style={styles.secondaryCopy}>{activeChild?.first_name} {activeChild?.last_name}</Text>
          {actionMode === 'absent' ? (
            <View style={styles.choiceRow}>
              {(['ABSENT', 'SICK', 'VACATION'] as const).map((value) => (
                <Pressable key={value} onPress={() => setAbsenceType(value)} style={[styles.choiceChip, absenceType === value ? styles.choiceChipActive : null]}>
                  <Text style={styles.choiceChipText}>{value}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <>
              <FieldLabel label="Parent or Guardian" role="EDUCATOR" />
              <AppTextField value={contactName} onChangeText={setContactName} placeholder="Parent or guardian name" role="EDUCATOR" />
              <FieldLabel label="Optional Manual Time (HH:MM)" role="EDUCATOR" />
              <AppTextField value={manualTime} onChangeText={setManualTime} placeholder="08:30" role="EDUCATOR" autoCapitalize="none" />
            </>
          )}
          <FieldLabel label="Notes" role="EDUCATOR" />
          <AppTextField value={notes} onChangeText={setNotes} placeholder="Add a quick note" role="EDUCATOR" multiline />
          <PrimaryButton label="Save" onPress={submitAttendanceAction} role="EDUCATOR" />
        </View>
      </SheetModal>
    </AppScreen>
  );
}

export function EducatorCareScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [careLogs, setCareLogs] = useState<Awaited<ReturnType<typeof getEducatorCare>>['careLogs']>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [selectedLogType, setSelectedLogType] = useState<'NAP' | 'PEE' | 'POO'>('NAP');
  const [occurredAt, setOccurredAt] = useState('');
  const [notes, setNotes] = useState('');

  async function loadCare() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextCareData = await getEducatorCare(apiBaseUrl, session.token);
      setChildren(nextCareData.children);
      setCareLogs(nextCareData.careLogs);
      setSelectedChildId((currentId) => currentId || nextCareData.children[0]?.id || null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load care logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCare();
  }, []);

  async function handleCreateCareLog() {
    if (!session || !selectedChildId) {
      setError('Select a child before saving a care log.');
      return;
    }

    try {
      await createCareLog(apiBaseUrl, session.token, {
        childId: selectedChildId,
        logType: selectedLogType,
        occurredAt: occurredAt || undefined,
        notes: notes.trim() || undefined,
      });
      setOccurredAt('');
      setNotes('');
      await loadCare();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to create the care log.');
    }
  }

  return (
    <AppScreen
      role="EDUCATOR"
      eyebrow="Care Logging"
      title="Care"
      subtitle="Only supported care actions: nap, pee, and poo."
      action={loadCare}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <SurfaceCard role="EDUCATOR">
        <SectionTitle role="EDUCATOR" caption="New Entry" title="Post a Care Log" />
        <View style={styles.choiceRow}>
          {children.map((child) => (
            <Pressable
              key={child.id}
              onPress={() => setSelectedChildId(child.id)}
              style={[styles.choiceChip, selectedChildId === child.id ? styles.choiceChipActive : null]}
            >
              <Text style={styles.choiceChipText}>{child.first_name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.choiceRow}>
          {(['NAP', 'PEE', 'POO'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setSelectedLogType(value)}
              style={[styles.choiceChip, selectedLogType === value ? styles.choiceChipActive : null]}
            >
              <Text style={styles.choiceChipText}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <FieldLabel label="Optional Time (HH:MM)" role="EDUCATOR" />
        <AppTextField value={occurredAt} onChangeText={setOccurredAt} placeholder="10:15" role="EDUCATOR" autoCapitalize="none" />
        <FieldLabel label="Notes" role="EDUCATOR" />
        <AppTextField value={notes} onChangeText={setNotes} placeholder="Optional note" role="EDUCATOR" multiline />
        <PrimaryButton label="Save Care Log" onPress={handleCreateCareLog} role="EDUCATOR" />
      </SurfaceCard>

      <SurfaceCard role="EDUCATOR">
        <SectionTitle role="EDUCATOR" caption="Today’s Feed" title="Recent Logs" />
        {loading ? (
          <Text style={styles.loadingText}>Loading care logs...</Text>
        ) : careLogs.length === 0 ? (
          <EmptyState role="EDUCATOR" message="No care logs have been posted yet today." />
        ) : (
          <View style={styles.listStack}>
            {careLogs.map((log) => (
              <View key={log.id} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{log.child_name}</Text>
                    <Text style={styles.rowMeta}>{log.log_type}{log.occurred_at ? ` | ${formatTime(log.occurred_at)}` : ''}</Text>
                    {log.notes ? <Text style={styles.secondaryCopy}>{log.notes}</Text> : null}
                  </View>
                  <Badge role="EDUCATOR" label={log.log_type} />
                </View>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>
    </AppScreen>
  );
}

export function EducatorMessagesScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [recipients, setRecipients] = useState<Awaited<ReturnType<typeof getStaffMessages>>['recipients']>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [subject, setSubject] = useState('Message from Educator');
  const [body, setBody] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  async function loadMessages() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextData = await getStaffMessages(apiBaseUrl, session.token);
      setMessages(nextData.messages);
      setRecipients(nextData.recipients);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMessages();
  }, []);

  async function handleMarkRead(messageId: number) {
    if (!session) {
      return;
    }

    await markStaffMessageRead(apiBaseUrl, session.token, messageId);
    setMessages((currentMessages) =>
      currentMessages.map((message) => (message.id === messageId ? { ...message, is_read: true } : message))
    );
  }

  async function handleSendMessage() {
    if (!session) {
      return;
    }

    try {
      if (sendToAll) {
        await sendStaffMessage(apiBaseUrl, session.token, {
          recipientType: 'all',
          subject,
          message: body.trim(),
        });
      } else {
        for (const id of selectedIds) {
          await sendStaffMessage(apiBaseUrl, session.token, {
            recipientType: 'parent',
            parentId: id,
            subject,
            message: body.trim(),
          });
        }
      }
      setComposerOpen(false);
      setBody('');
      setSelectedIds([]);
      await loadMessages();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to send the message.');
    }
  }

  return (
    <AppScreen
      role="EDUCATOR"
      eyebrow="Family Communication"
      title="Messages"
      subtitle="Send quick family updates from the classroom."
      action={() => setComposerOpen(true)}
      actionLabel="Compose"
    >
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? (
        <SurfaceCard role="EDUCATOR">
          <Text style={styles.loadingText}>Loading messages...</Text>
        </SurfaceCard>
      ) : messages.length === 0 ? (
        <EmptyState role="EDUCATOR" message="No family messages yet." />
      ) : (
        messages.map((message) => (
          <Pressable key={message.id} onPress={() => void handleMarkRead(message.id)}>
            <SurfaceCard role="EDUCATOR">
              <View style={styles.rowHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{message.parent_name || 'Parent'}</Text>
                  <Text style={styles.rowMeta}>{message.subject}</Text>
                  <Text style={styles.secondaryCopy}>{message.message}</Text>
                </View>
                <Badge role="EDUCATOR" label={message.is_read ? 'Read' : 'Unread'} tone={message.is_read ? 'default' : 'warning'} />
              </View>
            </SurfaceCard>
          </Pressable>
        ))
      )}

      <SheetModal visible={composerOpen} onClose={() => setComposerOpen(false)}>
        <View style={{ gap: 14 }}>
          <Text style={styles.modalTitle}>Compose Message</Text>
          <FieldLabel label="Subject" role="EDUCATOR" />
          <AppTextField value={subject} onChangeText={setSubject} placeholder="Subject" role="EDUCATOR" />
          <FieldLabel label="Message" role="EDUCATOR" />
          <AppTextField value={body} onChangeText={setBody} placeholder="Write your message" role="EDUCATOR" multiline />
          <Pressable onPress={() => setSendToAll((value) => !value)} style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{sendToAll ? 'Sending to all families' : 'Pick individual families'}</Text>
            <Badge role="EDUCATOR" label={sendToAll ? 'All' : 'Selected'} />
          </Pressable>
          {!sendToAll ? (
            <View style={styles.listStack}>
              {recipients.map((recipient) => {
                const selected = selectedIds.includes(recipient.id);
                return (
                  <Pressable
                    key={recipient.id}
                    onPress={() =>
                      setSelectedIds((currentIds) =>
                        selected ? currentIds.filter((id) => id !== recipient.id) : [...currentIds, recipient.id]
                      )
                    }
                    style={[styles.recipientItem, selected ? styles.recipientItemSelected : null]}
                  >
                    <Text style={styles.rowTitle}>{recipient.first_name} {recipient.last_name}</Text>
                    <Text style={styles.rowMeta}>{recipient.children || 'No children listed'}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <PrimaryButton label="Send Message" onPress={handleSendMessage} role="EDUCATOR" />
        </View>
      </SheetModal>
    </AppScreen>
  );
}

export function EducatorScheduleScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineType, setDeclineType] = useState<'SICK_DAY' | 'VACATION_DAY' | 'UNPAID'>('UNPAID');

  async function loadSchedules() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextSchedules = await getEducatorSchedule(apiBaseUrl, session.token);
      setSchedules(nextSchedules.schedules);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSchedules();
  }, []);

  async function handleAccept(scheduleId: number) {
    if (!session) {
      return;
    }

    await acceptSchedule(apiBaseUrl, session.token, scheduleId);
    await loadSchedules();
  }

  async function handleDecline() {
    if (!session || !selectedSchedule) {
      return;
    }

    await declineSchedule(apiBaseUrl, session.token, selectedSchedule.id, declineReason || 'Declined from native mobile app', declineType);
    setSelectedSchedule(null);
    setDeclineReason('');
    setDeclineType('UNPAID');
    await loadSchedules();
  }

  const pendingCount = useMemo(() => schedules.filter((schedule) => schedule.status === 'PENDING').length, [schedules]);

  return (
    <AppScreen
      role="EDUCATOR"
      eyebrow="Schedule"
      title="Schedule"
      subtitle="Review upcoming shifts and respond to pending ones."
      action={loadSchedules}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.statGrid}>
        <StatCard role="EDUCATOR" label="Shifts" value={schedules.length} />
        <StatCard role="EDUCATOR" label="Pending" value={pendingCount} />
        <StatCard role="EDUCATOR" label="Vacation Hours" value={session?.user.vacation_days_remaining ?? 0} />
      </View>

      {loading ? (
        <SurfaceCard role="EDUCATOR">
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </SurfaceCard>
      ) : schedules.length === 0 ? (
        <EmptyState role="EDUCATOR" message="No upcoming shifts are scheduled." />
      ) : (
        schedules.map((schedule) => (
          <SurfaceCard key={schedule.id} role="EDUCATOR">
            <View style={styles.rowHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{formatShortDate(schedule.shift_date)}</Text>
                <Text style={styles.rowMeta}>
                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)} | {schedule.hours}h
                </Text>
                {schedule.decline_reason ? <Text style={styles.secondaryCopy}>{schedule.decline_reason}</Text> : null}
              </View>
              <Badge role="EDUCATOR" label={schedule.status} />
            </View>
            {schedule.status === 'PENDING' ? (
              <View style={styles.buttonRow}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Accept" onPress={() => void handleAccept(schedule.id)} role="EDUCATOR" compact />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Decline" onPress={() => setSelectedSchedule(schedule)} role="EDUCATOR" compact />
                </View>
              </View>
            ) : null}
          </SurfaceCard>
        ))
      )}

      <SheetModal visible={Boolean(selectedSchedule)} onClose={() => setSelectedSchedule(null)}>
        <View style={{ gap: 14 }}>
          <Text style={styles.modalTitle}>Decline Shift</Text>
          <Text style={styles.secondaryCopy}>
            {selectedSchedule ? `${formatShortDate(selectedSchedule.shift_date)} | ${formatTime(selectedSchedule.start_time)} - ${formatTime(selectedSchedule.end_time)}` : ''}
          </Text>
          <View style={styles.choiceRow}>
            {(['UNPAID', 'SICK_DAY', 'VACATION_DAY'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setDeclineType(value)}
                style={[styles.choiceChip, declineType === value ? styles.choiceChipActive : null]}
              >
                <Text style={styles.choiceChipText}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <FieldLabel label="Reason" role="EDUCATOR" />
          <AppTextField value={declineReason} onChangeText={setDeclineReason} placeholder="Reason for declining" role="EDUCATOR" multiline />
          <PrimaryButton label="Submit Decline" onPress={handleDecline} role="EDUCATOR" />
        </View>
      </SheetModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  listStack: {
    gap: 12,
  },
  rowCard: {
    backgroundColor: '#FFF8F3',
    borderRadius: 22,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowHeader: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  rowTitle: {
    color: '#1C1917',
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
  },
  rowMeta: {
    color: '#78716C',
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 4,
  },
  secondaryCopy: {
    color: '#57534E',
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  loadingText: {
    color: '#78716C',
    fontFamily: fonts.body,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalTitle: {
    color: '#1C1917',
    fontFamily: fonts.heading,
    fontSize: 24,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    backgroundColor: '#FFF8F3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceChipActive: {
    borderColor: '#E07A5F',
    borderWidth: 1,
  },
  choiceChipText: {
    color: '#1C1917',
    fontFamily: fonts.bodyStrong,
    fontSize: 12,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleLabel: {
    color: '#1C1917',
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  recipientItem: {
    backgroundColor: '#FFF8F3',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recipientItemSelected: {
    borderColor: '#E07A5F',
    borderWidth: 1,
  },
});
