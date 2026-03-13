import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

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
  getParentBilling,
  getParentChildren,
  getParentEvents,
  getParentHome,
  getParentInvoicePdfLink,
  getParentMessages,
  markParentMessageRead,
  sendParentMessage,
  submitParentRsvp,
} from '../services/mobileApi';
import { fonts } from '../theme/tokens';
import { ChildSummary, EventItem, ParentMessage } from '../types/domain';
import { formatCurrency, formatShortDate, formatTime } from '../utils/format';

export function ParentHomeScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [homeData, setHomeData] = useState<Awaited<ReturnType<typeof getParentHome>> | null>(null);

  async function loadHome() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextHomeData = await getParentHome(apiBaseUrl, session.token);
      setHomeData(nextHomeData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load parent home.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHome();
  }, []);

  return (
    <AppScreen
      role="PARENT"
      eyebrow="Family Visibility"
      title="Home"
      subtitle="Calm child updates, unread messages, and current billing status."
      action={loadHome}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.statGrid}>
        <StatCard role="PARENT" label="Children" value={homeData?.dashboard.children_count ?? 0} />
        <StatCard role="PARENT" label="Unread Messages" value={homeData?.dashboard.unread_messages_count ?? 0} />
        <StatCard role="PARENT" label="Outstanding" value={formatCurrency(homeData?.dashboard.outstanding_balance ?? 0)} />
      </View>

      <SurfaceCard role="PARENT">
        <SectionTitle role="PARENT" caption="Today’s Updates" title="Care Feed" />
        {loading ? (
          <Text style={styles.loadingText}>Loading updates...</Text>
        ) : !homeData || homeData.careLogs.length === 0 ? (
          <EmptyState role="PARENT" message="No care logs have been shared yet today." />
        ) : (
          <View style={styles.listStack}>
            {homeData.careLogs.map((log) => (
              <View key={log.id} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{log.child_name}</Text>
                    <Text style={styles.rowMeta}>{log.log_type}{log.occurred_at ? ` | ${formatTime(log.occurred_at)}` : ''}</Text>
                    {log.notes ? <Text style={styles.secondaryCopy}>{log.notes}</Text> : null}
                  </View>
                  <Badge role="PARENT" label={log.log_type} />
                </View>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>

      <SurfaceCard role="PARENT">
        <SectionTitle role="PARENT" caption="Published Updates" title="Newsletters" />
        {!homeData || homeData.newsletters.length === 0 ? (
          <EmptyState role="PARENT" message="No newsletters are available yet." />
        ) : (
          <View style={styles.listStack}>
            {homeData.newsletters.map((newsletter) => (
              <View key={newsletter.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{newsletter.title}</Text>
                <Text style={styles.secondaryCopy}>{newsletter.body}</Text>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>
    </AppScreen>
  );
}

export function ParentChildScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [children, setChildren] = useState<ChildSummary[]>([]);

  async function loadChildren() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextChildren = await getParentChildren(apiBaseUrl, session.token);
      setChildren(nextChildren.children);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load child details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadChildren();
  }, []);

  return (
    <AppScreen
      role="PARENT"
      eyebrow="Child Profile"
      title="Child"
      subtitle="Enrollment basics, allergies, and medical notes."
      action={loadChildren}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? (
        <SurfaceCard role="PARENT">
          <Text style={styles.loadingText}>Loading child profiles...</Text>
        </SurfaceCard>
      ) : children.length === 0 ? (
        <EmptyState role="PARENT" message="No children are linked to this parent account." />
      ) : (
        children.map((child) => (
          <SurfaceCard key={child.id} role="PARENT">
            <View style={styles.rowHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{child.first_name} {child.last_name}</Text>
                <Text style={styles.rowMeta}>{child.status}</Text>
              </View>
              <Badge role="PARENT" label={child.status} />
            </View>
            <View style={styles.listStack}>
              {child.date_of_birth ? <Text style={styles.secondaryCopy}>Date of birth: {formatShortDate(child.date_of_birth)}</Text> : null}
              {child.enrollment_start_date ? <Text style={styles.secondaryCopy}>Enrollment: {formatShortDate(child.enrollment_start_date)}</Text> : null}
              {child.allergies ? <Text style={styles.secondaryCopy}>Allergies: {child.allergies}</Text> : null}
              {child.medical_notes ? <Text style={styles.secondaryCopy}>Medical notes: {child.medical_notes}</Text> : null}
            </View>
          </SurfaceCard>
        ))
      )}
    </AppScreen>
  );
}

export function ParentMessagesScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ParentMessage[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [body, setBody] = useState('');

  async function loadMessages() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextMessages = await getParentMessages(apiBaseUrl, session.token);
      setMessages(nextMessages.messages);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load parent messages.');
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

    await markParentMessageRead(apiBaseUrl, session.token, messageId);
    setMessages((currentMessages) =>
      currentMessages.map((message) => (message.id === messageId ? { ...message, parent_read: true } : message))
    );
  }

  async function handleSendMessage() {
    if (!session) {
      return;
    }

    try {
      await sendParentMessage(apiBaseUrl, session.token, body.trim());
      setBody('');
      setComposerOpen(false);
      await loadMessages();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to send the message.');
    }
  }

  return (
    <AppScreen
      role="PARENT"
      eyebrow="Family Communication"
      title="Messages"
      subtitle="Read daycare updates and send a message back to staff."
      action={() => setComposerOpen(true)}
      actionLabel="Compose"
    >
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? (
        <SurfaceCard role="PARENT">
          <Text style={styles.loadingText}>Loading messages...</Text>
        </SurfaceCard>
      ) : messages.length === 0 ? (
        <EmptyState role="PARENT" message="No daycare messages are available yet." />
      ) : (
        messages.map((message) => (
          <Pressable key={message.id} onPress={() => void handleMarkRead(message.id)}>
            <SurfaceCard role="PARENT">
              <View style={styles.rowHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{message.subject}</Text>
                  <Text style={styles.rowMeta}>From {message.staff_first_name} {message.staff_last_name}</Text>
                  <Text style={styles.secondaryCopy}>{message.message}</Text>
                </View>
                <Badge role="PARENT" label={message.parent_read ? 'Read' : 'Unread'} tone={message.parent_read ? 'default' : 'warning'} />
              </View>
            </SurfaceCard>
          </Pressable>
        ))
      )}

      <SheetModal visible={composerOpen} onClose={() => setComposerOpen(false)}>
        <View style={{ gap: 14 }}>
          <Text style={styles.modalTitle}>Contact Daycare</Text>
          <FieldLabel label="Message" role="PARENT" />
          <AppTextField value={body} onChangeText={setBody} placeholder="Write your message" role="PARENT" multiline />
          <PrimaryButton label="Send Message" onPress={handleSendMessage} role="PARENT" />
        </View>
      </SheetModal>
    </AppScreen>
  );
}

export function ParentBillingScreen() {
  const { apiBaseUrl, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingData, setBillingData] = useState<Awaited<ReturnType<typeof getParentBilling>> | null>(null);

  async function loadBilling() {
    if (!session) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const nextBillingData = await getParentBilling(apiBaseUrl, session.token);
      setBillingData(nextBillingData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load billing.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBilling();
  }, []);

  async function openInvoice(invoiceId: number) {
    if (!session) {
      return;
    }

    const response = await getParentInvoicePdfLink(apiBaseUrl, session.token, invoiceId);
    await Linking.openURL(response.url);
  }

  return (
    <AppScreen
      role="PARENT"
      eyebrow="Billing"
      title="Billing"
      subtitle="Invoices, balances, and receipt history supported by the current backend."
      action={loadBilling}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.statGrid}>
        <StatCard role="PARENT" label="Credit" value={formatCurrency(billingData?.dashboard.credit_balance ?? 0)} />
        <StatCard role="PARENT" label="Outstanding" value={formatCurrency(billingData?.dashboard.outstanding_balance ?? 0)} />
        <StatCard role="PARENT" label="Upcoming" value={billingData?.dashboard.upcoming_invoices_count ?? 0} />
      </View>

      <SurfaceCard role="PARENT">
        <SectionTitle role="PARENT" caption="Invoices" title="Open Billing Items" />
        {loading ? (
          <Text style={styles.loadingText}>Loading invoices...</Text>
        ) : !billingData || billingData.invoices.length === 0 ? (
          <EmptyState role="PARENT" message="No invoices are available." />
        ) : (
          <View style={styles.listStack}>
            {billingData.invoices.map((invoice) => (
              <View key={invoice.id} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{invoice.invoice_number}</Text>
                    <Text style={styles.rowMeta}>{formatShortDate(invoice.invoice_date)} | Due {formatShortDate(invoice.due_date)}</Text>
                    <Text style={styles.secondaryCopy}>Balance due: {formatCurrency(invoice.balance_due)}</Text>
                  </View>
                  <Badge role="PARENT" label={invoice.status} />
                </View>
                <View style={{ marginTop: 12 }}>
                  <PrimaryButton label="Open PDF" onPress={() => void openInvoice(invoice.id)} role="PARENT" compact />
                </View>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>

      <SurfaceCard role="PARENT">
        <SectionTitle role="PARENT" caption="Receipts" title="Payment History" />
        {!billingData || billingData.payments.length === 0 ? (
          <EmptyState role="PARENT" message="No payment receipts are recorded yet." />
        ) : (
          <View style={styles.listStack}>
            {billingData.payments.map((payment) => (
              <View key={payment.id} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{payment.receipt_number || 'Receipt pending'}</Text>
                    <Text style={styles.rowMeta}>{formatShortDate(payment.payment_date)} | {formatCurrency(payment.amount)}</Text>
                  </View>
                  <Badge role="PARENT" label={payment.status} />
                </View>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>
    </AppScreen>
  );
}

export function ParentEventsScreen() {
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
      const nextEvents = await getParentEvents(apiBaseUrl, session.token);
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

  async function handleRsvp(eventId: number, status: 'GOING' | 'NOT_GOING') {
    if (!session) {
      return;
    }

    await submitParentRsvp(apiBaseUrl, session.token, eventId, status);
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === eventId ? { ...event, parent_rsvp_status: status } : event
      )
    );
  }

  return (
    <AppScreen
      role="PARENT"
      eyebrow="Events"
      title="Events"
      subtitle="Upcoming daycare events, reminders, and RSVP actions where available."
      action={loadEvents}
      actionLabel="Refresh"
    >
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? (
        <SurfaceCard role="PARENT">
          <Text style={styles.loadingText}>Loading events...</Text>
        </SurfaceCard>
      ) : events.length === 0 ? (
        <EmptyState role="PARENT" message="No upcoming events are available." />
      ) : (
        events.map((event) => (
          <SurfaceCard key={event.id} role="PARENT">
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
              <Badge role="PARENT" label={event.requires_rsvp ? 'RSVP' : 'Event'} />
            </View>
            {event.requires_rsvp ? (
              <View style={styles.buttonRow}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Going" onPress={() => void handleRsvp(event.id, 'GOING')} role="PARENT" compact />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Not Going" onPress={() => void handleRsvp(event.id, 'NOT_GOING')} role="PARENT" compact />
                </View>
              </View>
            ) : null}
            {event.parent_rsvp_status ? <Text style={styles.secondaryCopy}>Current RSVP: {event.parent_rsvp_status}</Text> : null}
          </SurfaceCard>
        ))
      )}
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
    backgroundColor: '#F5FBFB',
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
    color: '#5B6B6C',
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 4,
  },
  secondaryCopy: {
    color: '#425051',
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  loadingText: {
    color: '#5B6B6C',
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
});
