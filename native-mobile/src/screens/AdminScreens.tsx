import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

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
  getAdminAttendance,
  getAdminMore,
  getAdminToday,
  getStaffEvents,
  getStaffMessages,
  markStaffMessageRead,
  sendStaffMessage,
} from '../services/mobileApi';
import { fonts, getRolePalette } from '../theme/tokens';
import { EventItem, ParentRecipient, StaffMessage } from '../types/domain';
import { formatShortDate, formatTime } from '../utils/format';

export function AdminTodayScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getAdminToday>> | null>(null);

  async function loadSummary() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextSummary = await getAdminToday(apiBaseUrl, session.token);
      setSummary(nextSummary);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load admin overview.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  return (
    <AppScreen
      role="ADMIN"
      eyebrow="Operational Oversight"
      title="Today"
      subtitle="Live attendance, care activity, messages, and event readiness."
      action={loadSummary}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.statGrid}>
        <StatCard role="ADMIN" label="Present" value={summary?.compliance.kids_present ?? 0} />
        <StatCard role="ADMIN" label="Staff Scheduled" value={summary?.compliance.staff_scheduled ?? 0} />
        <StatCard role="ADMIN" label="Care Logs" value={summary?.careLogs.length ?? 0} />
        <StatCard role="ADMIN" label="Unread Messages" value={summary?.unreadCount ?? 0} />
      </View>

      <SurfaceCard role="ADMIN">
        <SectionTitle role="ADMIN" caption="Compliance" title="Staffing Ratio" />
        {loading ? (
          <Text style={styles.loadingText}>Loading ratio status...</Text>
        ) : summary ? (
          <View style={{ gap: 12 }}>
            <Badge
              role="ADMIN"
              label={summary.compliance.in_compliance ? 'In Compliance' : 'Needs Coverage'}
              tone={summary.compliance.in_compliance ? 'success' : 'warning'}
            />
            <Text style={styles.primaryCopy}>
              {summary.compliance.staff_scheduled} staff scheduled, {summary.compliance.required_staff} required.
            </Text>
            <Text style={styles.secondaryCopy}>
              Ratio target: {summary.compliance.ratio?.kids || 4}:{summary.compliance.ratio?.staff || 1}
            </Text>
          </View>
        ) : (
          <EmptyState role="ADMIN" message="No compliance data is available yet." />
        )}
      </SurfaceCard>

      <SurfaceCard role="ADMIN">
        <SectionTitle role="ADMIN" caption="Daily Activity" title="Latest Care Logs" />
        {!summary || summary.careLogs.length === 0 ? (
          <EmptyState role="ADMIN" message="No care logs have been posted yet today." />
        ) : (
          <View style={styles.listStack}>
            {summary.careLogs.slice(0, 4).map((log) => (
              <View key={log.id} style={styles.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{log.child_name}</Text>
                  <Text style={styles.rowMeta}>{log.log_type}{log.occurred_at ? ` | ${formatTime(log.occurred_at)}` : ''}</Text>
                </View>
                <Badge role="ADMIN" label={log.log_type} />
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>

      <SurfaceCard role="ADMIN">
        <SectionTitle role="ADMIN" caption="Events" title="Upcoming Dates" />
        {!summary || summary.events.length === 0 ? (
          <EmptyState role="ADMIN" message="No upcoming events are scheduled." />
        ) : (
          <View style={styles.listStack}>
            {summary.events.slice(0, 4).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </View>
        )}
      </SurfaceCard>
    </AppScreen>
  );
}

export function AdminAttendanceScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendanceData, setAttendanceData] = useState<Awaited<ReturnType<typeof getAdminAttendance>> | null>(null);

  async function loadAttendance() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextAttendanceData = await getAdminAttendance(apiBaseUrl, session.token);
      setAttendanceData(nextAttendanceData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAttendance();
  }, []);

  return (
    <AppScreen
      role="ADMIN"
      eyebrow="Attendance Visibility"
      title="Attendance"
      subtitle="Read-only center-wide view for today."
      action={loadAttendance}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? (
        <SurfaceCard role="ADMIN">
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </SurfaceCard>
      ) : !attendanceData ? (
        <EmptyState role="ADMIN" message="Attendance data is unavailable." />
      ) : (
        attendanceData.children.map((child) => {
          const record = attendanceData.attendance.find((entry) => entry.child_id === child.id);
          return (
            <SurfaceCard key={child.id} role="ADMIN">
              <View style={styles.rowHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{child.first_name} {child.last_name}</Text>
                  <Text style={styles.rowMeta}>
                    {record?.status || 'Not recorded'}
                    {record?.check_in_time ? ` | In ${formatTime(record.check_in_time)}` : ''}
                    {record?.check_out_time ? ` | Out ${formatTime(record.check_out_time)}` : ''}
                  </Text>
                </View>
                <Badge
                  role="ADMIN"
                  label={record?.status || 'Pending'}
                  tone={
                    record?.status === 'ABSENT' || record?.status === 'SICK' || record?.status === 'VACATION'
                      ? 'warning'
                      : record?.check_out_time
                        ? 'default'
                        : 'success'
                  }
                />
              </View>
            </SurfaceCard>
          );
        })
      )}
    </AppScreen>
  );
}

export function AdminMessagesScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [recipients, setRecipients] = useState<ParentRecipient[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [subject, setSubject] = useState('Message from Admin');
  const [body, setBody] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sending, setSending] = useState(false);

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

    if (!body.trim()) {
      setError('Message body is required.');
      return;
    }

    if (!sendToAll && selectedIds.length === 0) {
      setError('Choose at least one parent or send to all.');
      return;
    }

    try {
      setSending(true);
      setError('');
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
      setSendToAll(true);
      await loadMessages();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to send the message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <AppScreen
      role="ADMIN"
      eyebrow="Center Inbox"
      title="Messages"
      subtitle="Family communication from the admin workspace."
      action={() => setComposerOpen(true)}
      actionLabel="Compose"
    >
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? (
        <SurfaceCard role="ADMIN">
          <Text style={styles.loadingText}>Loading messages...</Text>
        </SurfaceCard>
      ) : messages.length === 0 ? (
        <EmptyState role="ADMIN" message="No staff-parent messages yet." />
      ) : (
        messages.map((message) => (
          <Pressable key={message.id} onPress={() => void handleMarkRead(message.id)}>
            <SurfaceCard role="ADMIN">
              <View style={styles.rowHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{message.parent_name || 'Parent'}</Text>
                  <Text style={styles.rowMeta}>{message.subject}</Text>
                  <Text style={styles.secondaryCopy}>{message.message}</Text>
                </View>
                <Badge role="ADMIN" label={message.is_read ? 'Read' : 'Unread'} tone={message.is_read ? 'default' : 'warning'} />
              </View>
            </SurfaceCard>
          </Pressable>
        ))
      )}

      <SheetModal visible={composerOpen} onClose={() => setComposerOpen(false)}>
        <View style={{ gap: 14 }}>
          <Text style={styles.modalTitle}>Compose Message</Text>
          <FieldLabel label="Subject" role="ADMIN" />
          <AppTextField value={subject} onChangeText={setSubject} placeholder="Subject" role="ADMIN" />
          <FieldLabel label="Message" role="ADMIN" />
          <AppTextField value={body} onChangeText={setBody} placeholder="Write your message" role="ADMIN" multiline />
          <Pressable onPress={() => setSendToAll((value) => !value)} style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{sendToAll ? 'Sending to all families' : 'Pick individual families'}</Text>
            <Badge role="ADMIN" label={sendToAll ? 'All' : 'Selected'} />
          </Pressable>
          {!sendToAll ? (
            <View style={styles.recipientList}>
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
          <PrimaryButton label={sending ? 'Sending...' : 'Send Message'} onPress={handleSendMessage} role="ADMIN" disabled={sending} />
        </View>
      </SheetModal>
    </AppScreen>
  );
}

export function AdminEventsScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<EventItem[]>([]);

  async function loadEvents() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextEvents = await getStaffEvents(apiBaseUrl, session.token);
      setEvents(nextEvents.events);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  return (
    <AppScreen
      role="ADMIN"
      eyebrow="Calendar"
      title="Events"
      subtitle="Upcoming parent, staff, and operations dates."
      action={loadEvents}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? (
        <SurfaceCard role="ADMIN">
          <Text style={styles.loadingText}>Loading events...</Text>
        </SurfaceCard>
      ) : events.length === 0 ? (
        <EmptyState role="ADMIN" message="No upcoming events are scheduled." />
      ) : (
        events.map((event) => (
          <SurfaceCard key={event.id} role="ADMIN">
            <EventRow event={event} />
          </SurfaceCard>
        ))
      )}
    </AppScreen>
  );
}

export function AdminMoreScreen() {
  const navigation = useNavigation();
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [families, setFamilies] = useState<Awaited<ReturnType<typeof getAdminMore>>['families']>([]);
  const [newsletters, setNewsletters] = useState<Awaited<ReturnType<typeof getAdminMore>>['newsletters']>([]);

  async function loadMoreData() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextData = await getAdminMore(apiBaseUrl, session.token);
      setFamilies(nextData.families);
      setNewsletters(nextData.newsletters);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load operations summary.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMoreData();
  }, []);

  const familyCount = families.length;
  const parentCount = families.reduce((count, family) => count + family.parents.length, 0);
  const childCount = families.reduce((count, family) => count + family.children.length, 0);

  return (
    <AppScreen
      role="ADMIN"
      eyebrow="Operations"
      title="More"
      subtitle="Family counts, newsletters, and account settings."
      action={loadMoreData}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.statGrid}>
        <StatCard role="ADMIN" label="Families" value={familyCount} />
        <StatCard role="ADMIN" label="Parents" value={parentCount} />
        <StatCard role="ADMIN" label="Children" value={childCount} />
      </View>

      <SurfaceCard role="ADMIN">
        <SectionTitle role="ADMIN" caption="Published Updates" title="Newsletters" />
        {loading ? (
          <Text style={styles.loadingText}>Loading newsletters...</Text>
        ) : newsletters.length === 0 ? (
          <EmptyState role="ADMIN" message="No newsletters have been published yet." />
        ) : (
          <View style={styles.listStack}>
            {newsletters.map((newsletter) => (
              <View key={newsletter.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{newsletter.title}</Text>
                <Text style={styles.secondaryCopy}>{newsletter.body}</Text>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>

      <PrimaryButton label="Open Settings" onPress={() => navigation.navigate('Settings' as never)} role="ADMIN" />
    </AppScreen>
  );
}

function EventRow({ event }: { event: EventItem }) {
  return (
    <View style={styles.rowHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{event.title}</Text>
        <Text style={styles.rowMeta}>
          {formatShortDate(event.event_date)}
          {event.start_time ? ` | ${formatTime(event.start_time)}` : ''}
          {event.location ? ` | ${event.location}` : ''}
        </Text>
        {event.description ? <Text style={styles.secondaryCopy}>{event.description}</Text> : null}
      </View>
      <Badge role="ADMIN" label={event.entry_type || 'EVENT'} />
    </View>
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
  primaryCopy: {
    color: '#1C1917',
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
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
  modalTitle: {
    color: '#1C1917',
    fontFamily: fonts.heading,
    fontSize: 24,
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
  recipientList: {
    gap: 10,
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
