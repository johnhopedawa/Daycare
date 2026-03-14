import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/Layout';
import { Calendar, Check, CheckCircle, ChevronDown, Clock, DollarSign, Download, Eye, FileText, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { BaseModal } from '../components/modals/BaseModal';
import { DatePickerModal } from '../components/modals/DatePickerModal';
import api from '../utils/api';

const FREQUENCY_OPTIONS = [
  { value: 'BI_WEEKLY', label: 'Bi-Weekly (Every 2 weeks)' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'SEMI_MONTHLY', label: 'Semi-Monthly (1st-15th, 16th-end)' },
];

const PAYSTUB_LINE_ITEMS = [
  { key: 'regular', label: 'Regular Pay', hoursKey: 'regular_hours', rateKey: 'regular_rate', currentKey: 'regular_pay_current', ytdKey: 'regular_pay_ytd', aggregateYtdKey: 'ytd_gross' },
  { key: 'sick', label: 'Sick Pay', hoursKey: 'sick_hours', rateKey: 'sick_rate', currentKey: 'sick_pay_current', ytdKey: 'sick_pay_ytd' },
  { key: 'vacation', label: 'Vacation Pay', hoursKey: 'vacation_hours', rateKey: 'vacation_rate', currentKey: 'vacation_pay_current', ytdKey: 'vacation_pay_ytd' },
  { key: 'stat', label: 'Stat Pay', hoursKey: 'stat_hours', rateKey: 'stat_rate', currentKey: 'stat_pay_current', ytdKey: 'stat_pay_ytd' },
  { key: 'bonus', label: 'Bonus', hoursKey: 'bonus_hours', rateKey: 'bonus_rate', currentKey: 'bonus_pay_current', ytdKey: 'bonus_pay_ytd' },
  { key: 'retro', label: 'Retro Payment', hoursKey: 'retro_hours', rateKey: 'retro_rate', currentKey: 'retro_payment_current', ytdKey: 'retro_payment_ytd', usesExplicitCurrent: true },
];

const DEFAULT_VACATION_ACCRUAL_RATE = 0.04;

export function PayPeriodsPage() {
  const [payPeriods, setPayPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState('review');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFrequencyMenuOpen, setIsFrequencyMenuOpen] = useState(false);
  const [datePickerState, setDatePickerState] = useState({ isOpen: false, scope: 'create', field: 'startDate' });
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryPreviewPeriod, setSummaryPreviewPeriod] = useState(null);
  const [summaryPreviewPayouts, setSummaryPreviewPayouts] = useState([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isDownloadingSummaryPdf, setIsDownloadingSummaryPdf] = useState(false);
  const [isPaystubsOpen, setIsPaystubsOpen] = useState(false);
  const [selectedPayPeriod, setSelectedPayPeriod] = useState(null);
  const [paystubPayouts, setPaystubPayouts] = useState([]);
  const [isPaystubsLoading, setIsPaystubsLoading] = useState(false);
  const [paystubActionId, setPaystubActionId] = useState(null);
  const [isPaystubPreviewOpen, setIsPaystubPreviewOpen] = useState(false);
  const [isPaystubPreviewLoading, setIsPaystubPreviewLoading] = useState(false);
  const [isDownloadingPaystubPdf, setIsDownloadingPaystubPdf] = useState(false);
  const [paystubPreview, setPaystubPreview] = useState(null);
  const [isEditPayoutOpen, setIsEditPayoutOpen] = useState(false);
  const [editingPayout, setEditingPayout] = useState(null);
  const [editingPayoutContext, setEditingPayoutContext] = useState('closed');
  const [editPayoutForm, setEditPayoutForm] = useState({});
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', payDate: '' });
  const [generateData, setGenerateData] = useState({ frequency: 'BI_WEEKLY', startDate: '' });
  const frequencyMenuRef = useRef(null);

  const loadPayPeriods = useCallback(async () => {
    try {
      const response = await api.get('/pay-periods');
      setPayPeriods(response.data.payPeriods || []);
    } catch (error) {
      console.error('Failed to load pay periods:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayPeriods();
  }, [loadPayPeriods]);

  useEffect(() => {
    if (!isFrequencyMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (frequencyMenuRef.current && !frequencyMenuRef.current.contains(event.target)) {
        setIsFrequencyMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsFrequencyMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFrequencyMenuOpen]);

  useEffect(() => {
    if (!isGenerateOpen) {
      setIsFrequencyMenuOpen(false);
    }
  }, [isGenerateOpen]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const parseDateInput = (value) => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const formatDateInput = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateLabel = (value, fallback) => {
    if (!value) return fallback;
    return formatDate(value);
  };

  const cardStyles = [
    { backgroundColor: 'var(--card-1)', color: 'var(--card-text-1)' },
    { backgroundColor: 'var(--card-2)', color: 'var(--card-text-2)' },
    { backgroundColor: 'var(--card-3)', color: 'var(--card-text-3)' },
    { backgroundColor: 'var(--card-4)', color: 'var(--card-text-4)' },
  ];
  const statusStyles = {
    OPEN: cardStyles[0],
    PROCESSING: cardStyles[2],
    PAID: cardStyles[1],
    CLOSED: { backgroundColor: 'var(--background)', color: 'var(--muted)' },
  };
  const getStatusStyle = (status) => statusStyles[status] || {
    backgroundColor: 'var(--background)',
    color: 'var(--muted)',
  };
  const formatCurrency = (value) => `$${parseFloat(value || 0).toFixed(2)}`;
  const formatHours = (value) => parseFloat(value || 0).toFixed(2);
  const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const roundCurrency = (value) => Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;
  const formatEditorNumber = (value) => roundCurrency(value).toFixed(2);
  const usesExplicitCurrentLineItem = (item) => Boolean(item?.usesExplicitCurrent);
  const normalizeEditableYtdValue = (inputValue, currentValue, fallbackValue = null) => {
    const current = roundCurrency(safeNumber(currentValue));
    const parsed = Number(inputValue);
    const baseValue = Number.isFinite(parsed)
      ? roundCurrency(parsed)
      : roundCurrency(safeNumber(fallbackValue, current));
    return roundCurrency(baseValue < current ? baseValue + current : baseValue);
  };
  const getDisplayedYearToDateValue = (storedValue, currentValue) => normalizeEditableYtdValue(null, currentValue, storedValue);
  const getLineYearToDateValue = (item, payout, user, current) => {
    const storedLineYtd = payout?.[item.ytdKey];
    const aggregateYtd = item.aggregateYtdKey ? user?.[item.aggregateYtdKey] ?? payout?.[item.aggregateYtdKey] : null;
    return getDisplayedYearToDateValue(storedLineYtd ?? aggregateYtd, current);
  };
  const getResolvedCurrentDeductions = (payout) => {
    const explicit = roundCurrency(safeNumber(payout?.deductions));
    if (explicit > 0) {
      return explicit;
    }
    return roundCurrency(
      safeNumber(payout?.income_tax_current)
      + safeNumber(payout?.ei_current)
      + safeNumber(payout?.cpp_current)
      + safeNumber(payout?.cpp2_current)
    );
  };
  const getPaymentTypeLabel = (paymentType) => (paymentType === 'SALARY' ? 'Salary' : 'Hourly');
  const getCompensationLabel = (payout) => (
    payout?.payment_type === 'SALARY'
      ? `${formatCurrency(payout.profile_salary_amount)} per pay period`
      : `${formatCurrency(payout.hourly_rate || payout.profile_hourly_rate)}/hr`
  );
  const isFullTimePayout = (payout, user) => (
    String(user?.employment_type || payout?.employment_type || '').toUpperCase() === 'FULL_TIME'
  );
  const isPartTimePayout = (payout, user) => (
    String(user?.employment_type || payout?.employment_type || '').toUpperCase() === 'PART_TIME'
  );
  const hasVacationAccrual = (payout, user) => (
    Boolean(user?.vacation_accrual_enabled || payout?.vacation_accrual_enabled)
  );
  const getVacationAccrualRate = (payout, user) => {
    const rawRate = safeNumber(
      user?.vacation_accrual_rate,
      safeNumber(payout?.vacation_accrual_rate, DEFAULT_VACATION_ACCRUAL_RATE)
    );
    if (rawRate > 1) {
      return rawRate / 100;
    }
    return rawRate >= 0 ? rawRate : DEFAULT_VACATION_ACCRUAL_RATE;
  };
  const getBaseHourlyRate = (payout, user) => roundCurrency(safeNumber(
    payout?.regular_rate,
    safeNumber(
      payout?.hourly_rate,
      safeNumber(
        payout?.profile_hourly_rate,
        user?.profile_hourly_rate
      )
    )
  ));
  const getDefaultLineRate = (lineKey, payout, user) => {
    const baseHourlyRate = getBaseHourlyRate(payout, user);

    switch (lineKey) {
      case 'regular':
      case 'sick':
      case 'vacation':
        return baseHourlyRate;
      default:
        return 0;
    }
  };
  const getVacationAccrualHours = (regularHours, payout, user) => roundCurrency(
    safeNumber(regularHours) * getVacationAccrualRate(payout, user)
  );
  const shouldPayoutVacationAccrual = (payout, user, formOverrides = null) => {
    if (!hasVacationAccrual(payout, user)) {
      return false;
    }
    if (isPartTimePayout(payout, user)) {
      return true;
    }
    if (!isFullTimePayout(payout, user)) {
      return false;
    }
    if (formOverrides) {
      return Boolean(formOverrides.payoutVacationAccrual);
    }
    return safeNumber(payout?.vacation_hours) > 0;
  };
  const getVisiblePaystubLineItems = (payout, user) => (
    PAYSTUB_LINE_ITEMS.filter((item) => item.key !== 'stat' || isFullTimePayout(payout, user))
  );
  const createPayoutEditForm = (payout) => {
    const regularHours = safeNumber(payout?.regular_hours, payout?.total_hours);
    const vacationAccrualEnabled = hasVacationAccrual(payout, payout);
    const payoutVacationAccrual = vacationAccrualEnabled
      ? shouldPayoutVacationAccrual(payout, payout)
      : false;
    const accrualVacationHours = vacationAccrualEnabled
      ? getVacationAccrualHours(regularHours, payout, payout)
      : safeNumber(payout?.vacation_hours);
    const accrualVacationRate = getDefaultLineRate('vacation', payout, payout);
    const defaultValues = {
      regular_hours: regularHours,
      regular_rate: safeNumber(payout?.regular_rate, getDefaultLineRate('regular', payout, payout)),
      sick_hours: safeNumber(payout?.sick_hours),
      sick_rate: safeNumber(payout?.sick_rate, getDefaultLineRate('sick', payout, payout)),
      vacation_hours: vacationAccrualEnabled ? (payoutVacationAccrual ? accrualVacationHours : 0) : safeNumber(payout?.vacation_hours),
      vacation_rate: vacationAccrualEnabled ? accrualVacationRate : safeNumber(payout?.vacation_rate, accrualVacationRate),
      stat_hours: safeNumber(payout?.stat_hours),
      stat_rate: safeNumber(payout?.stat_rate),
      bonus_hours: safeNumber(payout?.bonus_hours),
      bonus_rate: safeNumber(payout?.bonus_rate),
      retro_hours: safeNumber(payout?.retro_hours),
      retro_rate: safeNumber(payout?.retro_rate),
      retro_payment_current: safeNumber(payout?.retro_payment_current, payout?.retro_payment_amount),
      regular_pay_ytd: getLineYearToDateValue(PAYSTUB_LINE_ITEMS[0], payout, payout, safeNumber(payout?.regular_pay_current, payout?.gross_amount)),
      sick_pay_ytd: getLineYearToDateValue(PAYSTUB_LINE_ITEMS[1], payout, payout, safeNumber(payout?.sick_pay_current)),
      vacation_pay_ytd: getLineYearToDateValue(PAYSTUB_LINE_ITEMS[2], payout, payout, safeNumber(payout?.vacation_pay_current)),
      stat_pay_ytd: getLineYearToDateValue(PAYSTUB_LINE_ITEMS[3], payout, payout, safeNumber(payout?.stat_pay_current)),
      bonus_pay_ytd: getLineYearToDateValue(PAYSTUB_LINE_ITEMS[4], payout, payout, safeNumber(payout?.bonus_pay_current)),
      retro_payment_ytd: getLineYearToDateValue(PAYSTUB_LINE_ITEMS[5], payout, payout, safeNumber(payout?.retro_payment_current, payout?.retro_payment_amount)),
      ytd_gross: getDisplayedYearToDateValue(payout?.ytd_gross, payout?.gross_amount),
      ytd_hours: getDisplayedYearToDateValue(payout?.ytd_hours, payout?.total_hours),
      ytd_cpp: getDisplayedYearToDateValue(payout?.ytd_cpp, payout?.cpp_current),
      ytd_ei: getDisplayedYearToDateValue(payout?.ytd_ei, payout?.ei_current),
      ytd_tax: getDisplayedYearToDateValue(payout?.ytd_tax, payout?.income_tax_current),
      payoutVacationAccrual,
    };

    return Object.entries(defaultValues).reduce((accumulator, [key, value]) => ({
      ...accumulator,
      [key]: key === 'payoutVacationAccrual' ? value : formatEditorNumber(value),
    }), {});
  };
  const buildPaystubPreview = (payout, user, formOverrides = null, options = {}) => {
    const paymentType = payout?.payment_type === 'SALARY' || user?.payment_type === 'SALARY' ? 'SALARY' : 'HOURLY';
    const includeZeroBonus = Boolean(options.includeZeroBonus);
    const regularHours = formOverrides
      ? roundCurrency(safeNumber(formOverrides.regular_hours))
      : roundCurrency(safeNumber(payout?.regular_hours, payout?.total_hours));
    const vacationAccrualEnabled = hasVacationAccrual(payout, user);
    const vacationAccrualHours = vacationAccrualEnabled
      ? getVacationAccrualHours(regularHours, payout, user)
      : 0;
    const vacationPayoutEnabled = shouldPayoutVacationAccrual(payout, user, formOverrides);
    const rows = getVisiblePaystubLineItems(payout, user).map((item) => {
      const fallbackHours = item.key === 'regular' ? safeNumber(payout?.total_hours) : 0;
      const fallbackRate = getDefaultLineRate(item.key, payout, user);
      let hours = formOverrides
        ? roundCurrency(safeNumber(formOverrides[item.hoursKey]))
        : roundCurrency(safeNumber(payout?.[item.hoursKey], fallbackHours));
      let rate = formOverrides
        ? roundCurrency(safeNumber(formOverrides[item.rateKey]))
        : roundCurrency(safeNumber(payout?.[item.rateKey], fallbackRate));
      let current = formOverrides
        ? roundCurrency(
          usesExplicitCurrentLineItem(item)
            ? safeNumber(formOverrides[item.currentKey], safeNumber(payout?.[item.currentKey], hours * rate))
            : (hours * rate)
        )
        : roundCurrency(safeNumber(
          payout?.[item.currentKey],
          item.key === 'regular' ? safeNumber(payout?.gross_amount) : hours * rate
        ));

      if (item.key === 'vacation' && vacationAccrualEnabled) {
        hours = vacationPayoutEnabled ? vacationAccrualHours : 0;
        rate = getDefaultLineRate('vacation', payout, user);
        current = roundCurrency(hours * rate);
      }

      if (paymentType === 'SALARY' && item.key === 'regular' && current === 0) {
        current = roundCurrency(
          safeNumber(payout?.regular_pay_current, safeNumber(user?.salary_amount, payout?.gross_amount))
        );
      }

      return {
        ...item,
        hours,
        rate,
        current,
        ytd: formOverrides
          ? normalizeEditableYtdValue(formOverrides[item.ytdKey], current, getLineYearToDateValue(item, payout, user, current))
          : getLineYearToDateValue(item, payout, user, current),
      };
    }).filter((row) => (
      row.key !== 'bonus'
        || includeZeroBonus
        || row.hours > 0
        || row.current > 0
        || row.rate > 0
    ));

    const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
    const grossAmount = rows.reduce((sum, row) => sum + row.current, 0);
    const hourlyRate = rows.find((row) => row.key === 'regular')?.rate || 0;
    const deductions = getResolvedCurrentDeductions(payout);
    const ytdSummary = {
      gross: formOverrides
        ? normalizeEditableYtdValue(formOverrides.ytd_gross, grossAmount, user?.ytd_gross ?? payout?.ytd_gross)
        : getDisplayedYearToDateValue(user?.ytd_gross ?? payout?.ytd_gross, grossAmount),
      hours: formOverrides
        ? normalizeEditableYtdValue(formOverrides.ytd_hours, totalHours, user?.ytd_hours ?? payout?.ytd_hours)
        : getDisplayedYearToDateValue(user?.ytd_hours ?? payout?.ytd_hours, totalHours),
      cpp: formOverrides
        ? normalizeEditableYtdValue(formOverrides.ytd_cpp, payout?.cpp_current, user?.ytd_cpp ?? payout?.ytd_cpp)
        : getDisplayedYearToDateValue(user?.ytd_cpp ?? payout?.ytd_cpp, payout?.cpp_current),
      ei: formOverrides
        ? normalizeEditableYtdValue(formOverrides.ytd_ei, payout?.ei_current, user?.ytd_ei ?? payout?.ytd_ei)
        : getDisplayedYearToDateValue(user?.ytd_ei ?? payout?.ytd_ei, payout?.ei_current),
      tax: formOverrides
        ? normalizeEditableYtdValue(formOverrides.ytd_tax, payout?.income_tax_current, user?.ytd_tax ?? payout?.ytd_tax)
        : getDisplayedYearToDateValue(user?.ytd_tax ?? payout?.ytd_tax, payout?.income_tax_current),
    };

    return {
      paymentType,
      rows,
      totalHours: roundCurrency(totalHours),
      hourlyRate: roundCurrency(hourlyRate),
      grossAmount: roundCurrency(grossAmount),
      deductions,
      netAmount: roundCurrency(grossAmount - deductions),
      vacationAccrualEnabled,
      vacationAccrualHours,
      vacationPayoutEnabled,
      ytdSummary,
    };
  };
  const selectedFrequencyLabel = FREQUENCY_OPTIONS.find(
    (option) => option.value === generateData.frequency
  )?.label || 'Select frequency';
  const summaryTotals = summaryPreviewPayouts.reduce((totals, payout) => ({
    totalHours: totals.totalHours + parseFloat(payout.total_hours || 0),
    grossAmount: totals.grossAmount + parseFloat(payout.gross_amount || 0),
    deductions: totals.deductions + parseFloat(payout.deductions || 0),
    netAmount: totals.netAmount + parseFloat(payout.net_amount || 0),
  }), {
    totalHours: 0,
    grossAmount: 0,
    deductions: 0,
    netAmount: 0,
  });
  const editedPayoutPreview = editingPayout
    ? buildPaystubPreview(editingPayout, editingPayout, editPayoutForm, { includeZeroBonus: true })
    : null;
  const getBreakdownFromPreviewState = (payoutPreview, formState = editPayoutForm) => {
    const rowsByKey = new Map((payoutPreview?.rows || []).map((row) => [row.key, row]));

    return PAYSTUB_LINE_ITEMS.reduce((accumulator, item) => {
      const row = rowsByKey.get(item.key);
      const hours = row ? row.hours : roundCurrency(safeNumber(formState[item.hoursKey]));
      const rate = row ? row.rate : roundCurrency(safeNumber(formState[item.rateKey]));
      const current = row
        ? row.current
        : roundCurrency(
          usesExplicitCurrentLineItem(item)
            ? safeNumber(formState[item.currentKey], hours * rate)
            : (hours * rate)
        );

      accumulator[item.hoursKey] = hours;
      accumulator[item.rateKey] = rate;
      accumulator[item.currentKey] = current;
      return accumulator;
    }, {});
  };
  const getYtdBreakdownFromPreviewState = (payoutPreview, formState = editPayoutForm) => {
    const rowsByKey = new Map((payoutPreview?.rows || []).map((row) => [row.key, row]));

    return PAYSTUB_LINE_ITEMS.reduce((accumulator, item) => {
      const row = rowsByKey.get(item.key);
      accumulator[item.ytdKey] = row
        ? row.ytd
        : normalizeEditableYtdValue(formState[item.ytdKey], formState[item.currentKey], formState[item.currentKey]);
      return accumulator;
    }, {});
  };
  const applyEditedPreviewPayout = (payout, payoutPreview, formState = editPayoutForm) => ({
    ...payout,
    ...getBreakdownFromPreviewState(payoutPreview, formState),
    ...getYtdBreakdownFromPreviewState(payoutPreview, formState),
    total_hours: payoutPreview.totalHours,
    hourly_rate: payoutPreview.hourlyRate,
    gross_amount: payoutPreview.grossAmount,
    deductions: payoutPreview.deductions,
    net_amount: payoutPreview.netAmount,
    ytd_gross: payoutPreview.ytdSummary.gross,
    ytd_hours: payoutPreview.ytdSummary.hours,
    ytd_cpp: payoutPreview.ytdSummary.cpp,
    ytd_ei: payoutPreview.ytdSummary.ei,
    ytd_tax: payoutPreview.ytdSummary.tax,
    payoutVacationAccrual: Boolean(formState.payoutVacationAccrual),
  });
  const buildClosePayoutOverrides = () => (
    preview
      ? [...(preview.hourly_employees || []), ...(preview.salaried_employees || [])].map((employee) => ({
        userId: employee.id,
        payoutVacationAccrual: Boolean(employee.payoutVacationAccrual),
        breakdown: PAYSTUB_LINE_ITEMS.reduce((accumulator, item) => {
          accumulator[item.hoursKey] = roundCurrency(safeNumber(employee[item.hoursKey]));
          accumulator[item.rateKey] = roundCurrency(safeNumber(employee[item.rateKey]));
          accumulator[item.currentKey] = roundCurrency(safeNumber(employee[item.currentKey]));
          return accumulator;
        }, {}),
        ytdBreakdown: PAYSTUB_LINE_ITEMS.reduce((accumulator, item) => {
          accumulator[item.ytdKey] = roundCurrency(safeNumber(employee[item.ytdKey]));
          return accumulator;
        }, {}),
        ytd: {
          gross: roundCurrency(safeNumber(employee.ytd_gross)),
          hours: roundCurrency(safeNumber(employee.ytd_hours)),
          cpp: roundCurrency(safeNumber(employee.ytd_cpp)),
          ei: roundCurrency(safeNumber(employee.ytd_ei)),
          tax: roundCurrency(safeNumber(employee.ytd_tax)),
        },
      }))
      : []
  );
  const editingPayoutHasVacationAccrual = editingPayout
    ? hasVacationAccrual(editingPayout, editingPayout)
    : false;
  const editingPayoutVacationAccrualIsAuto = editingPayout
    ? editingPayoutHasVacationAccrual && isPartTimePayout(editingPayout, editingPayout)
    : false;
  const editingPayoutVacationAccrualCanToggle = editingPayout
    ? editingPayoutHasVacationAccrual && isFullTimePayout(editingPayout, editingPayout)
    : false;
  const paystubHtmlPreview = paystubPreview
    ? buildPaystubPreview(paystubPreview.payout, paystubPreview.user)
    : null;
  const previewTotals = preview ? [...(preview.hourly_employees || []), ...(preview.salaried_employees || [])].reduce((totals, employee) => ({
    totalHours: totals.totalHours + safeNumber(employee.total_hours),
    grossAmount: totals.grossAmount + safeNumber(employee.gross_amount),
    deductions: totals.deductions + safeNumber(employee.deductions),
    netAmount: totals.netAmount + safeNumber(employee.net_amount),
  }), {
    totalHours: 0,
    grossAmount: 0,
    deductions: 0,
    netAmount: 0,
  }) : null;

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pay-periods', formData);
      setIsCreateOpen(false);
      setFormData({ name: '', startDate: '', endDate: '', payDate: '' });
      loadPayPeriods();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create pay period');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/pay-periods/generate', generateData);
      alert(response.data.message);
      setIsGenerateOpen(false);
      setIsFrequencyMenuOpen(false);
      setGenerateData({ frequency: 'BI_WEEKLY', startDate: '' });
      loadPayPeriods();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to generate pay periods');
    }
  };

  const handleOpenPeriodPreview = async (id, mode = 'review') => {
    try {
      const response = await api.get(`/pay-periods/${id}/close-preview`);
      setPreviewMode(mode);
      setPreview(response.data);
      setIsPreviewOpen(true);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to load preview');
    }
  };

  const handleConfirmClose = async () => {
    if (!preview?.period?.id) return;
    try {
      await api.post(`/pay-periods/${preview.period.id}/close`, {
        payoutOverrides: buildClosePayoutOverrides(),
      });
      setIsPreviewOpen(false);
      setPreviewMode('review');
      setPreview(null);
      loadPayPeriods();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to close pay period');
    }
  };

  const closePreviewModal = () => {
    setIsPreviewOpen(false);
    setPreviewMode('review');
    setPreview(null);
  };

  const openDeleteModal = (period) => {
    setDeleteTarget(period);
    setIsDeleteOpen(true);
  };

  const openDatePicker = (scope, field) => {
    setDatePickerState({ isOpen: true, scope, field });
  };

  const closeDatePicker = () => {
    setDatePickerState((current) => ({ ...current, isOpen: false }));
  };

  const handleDateConfirm = (date) => {
    const nextValue = formatDateInput(date);

    if (datePickerState.scope === 'create') {
      setFormData((current) => ({ ...current, [datePickerState.field]: nextValue }));
    } else {
      setGenerateData((current) => ({ ...current, [datePickerState.field]: nextValue }));
    }

    closeDatePicker();
  };

  const handleDateClear = () => {
    if (datePickerState.scope === 'create') {
      setFormData((current) => ({ ...current, [datePickerState.field]: '' }));
    } else {
      setGenerateData((current) => ({ ...current, [datePickerState.field]: '' }));
    }

    closeDatePicker();
  };

  const getDateFieldConfig = () => {
    if (datePickerState.scope === 'create') {
      switch (datePickerState.field) {
        case 'startDate':
          return {
            value: formData.startDate,
            title: 'Select Start Date',
            subtitle: 'Choose the first date included in this pay period.',
            confirmLabel: 'Save start date',
          };
        case 'endDate':
          return {
            value: formData.endDate,
            title: 'Select End Date',
            subtitle: 'Choose the last working date included in this pay period.',
            confirmLabel: 'Save end date',
          };
        case 'payDate':
          return {
            value: formData.payDate,
            title: 'Select Pay Date',
            subtitle: 'Choose when employees are paid for this period.',
            confirmLabel: 'Save pay date',
          };
        default:
          break;
      }
    }

    return {
      value: generateData.startDate,
      title: 'Select Generation Start Date',
      subtitle: 'Choose the first date used when generating upcoming pay periods.',
      confirmLabel: 'Save start date',
    };
  };

  const currentDateField = getDateFieldConfig();

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      setIsDeleting(true);
      await api.delete(`/pay-periods/${deleteTarget.id}`);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      await loadPayPeriods();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete pay period');
    } finally {
      setIsDeleting(false);
    }
  };

  const downloadBlob = async (endpoint, filename, errorMessage, setLoading) => {
    try {
      if (setLoading) {
        setLoading(true);
      }
      const response = await api.get(endpoint, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.response?.data?.error || errorMessage);
    } finally {
      if (setLoading) {
        setLoading(false);
      }
    }
  };

  const closeSummaryModal = () => {
    setIsSummaryOpen(false);
    setSummaryPreviewPeriod(null);
    setSummaryPreviewPayouts([]);
  };

  const handleOpenPayrollSummary = async (period) => {
    try {
      setSummaryPreviewPeriod(period);
      setIsSummaryOpen(true);
      setIsSummaryLoading(true);
      const response = await api.get(`/pay-periods/${period.id}/payouts`);
      setSummaryPreviewPayouts(response.data.payouts || []);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to open payroll summary');
      setIsSummaryOpen(false);
      setSummaryPreviewPeriod(null);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleDownloadPayrollSummaryPdf = async () => {
    if (!summaryPreviewPeriod) return;
    await downloadBlob(
      `/documents/pay-periods/${summaryPreviewPeriod.id}/export-pdf`,
      `payroll-${summaryPreviewPeriod.name || `period-${summaryPreviewPeriod.id}`}.pdf`,
      'Failed to download payroll PDF',
      setIsDownloadingSummaryPdf
    );
  };

  const closePaystubsModal = () => {
    if (paystubActionId || isSavingPayout) return;
    setIsPaystubsOpen(false);
    setSelectedPayPeriod(null);
    setPaystubPayouts([]);
  };

  const refreshSelectedPayPeriodPayouts = useCallback(async (periodId) => {
    const response = await api.get(`/pay-periods/${periodId}/payouts`);
    return response.data.payouts || [];
  }, []);

  const handleOpenPaystubs = async (period) => {
    try {
      setSelectedPayPeriod(period);
      setIsPaystubsOpen(true);
      setIsPaystubsLoading(true);
      const payouts = await refreshSelectedPayPeriodPayouts(period.id);
      setPaystubPayouts(payouts);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to load paystubs for this pay period');
      setIsPaystubsOpen(false);
      setSelectedPayPeriod(null);
    } finally {
      setIsPaystubsLoading(false);
    }
  };

  const handleOpenPaystub = async (payout) => {
    try {
      setPaystubActionId(payout.id);
      setIsPaystubPreviewLoading(true);
      let paystubId = payout.paystub_id;
      let stubNumber = payout.stub_number;

      if (!paystubId) {
        const response = await api.post(`/documents/payouts/${payout.id}/generate-paystub`);
        paystubId = response.data.paystubId;
        stubNumber = response.data.stubNumber;
        setPaystubPayouts((current) => current.map((item) => (
          item.id === payout.id
            ? { ...item, paystub_id: paystubId, stub_number: stubNumber }
            : item
        )));
      }

      const detailResponse = await api.get(`/documents/paystubs/${paystubId}/details`);
      setPaystubPreview({
        ...detailResponse.data,
        paystubId,
        stubNumber: stubNumber || detailResponse.data.paystub?.stub_number,
      });
      setIsPaystubsOpen(false);
      setIsPaystubPreviewOpen(true);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to open paystub');
    } finally {
      setIsPaystubPreviewLoading(false);
      setPaystubActionId(null);
    }
  };

  const closePaystubPreview = () => {
    if (isSavingPayout) return;
    setIsPaystubPreviewOpen(false);
    setPaystubPreview(null);
  };

  const handleDownloadPaystubPdf = async () => {
    if (!paystubPreview?.paystubId) return;
    await downloadBlob(
      `/documents/paystubs/${paystubPreview.paystubId}/pdf`,
      `paystub-${paystubPreview.stubNumber}.pdf`,
      'Failed to download paystub PDF',
      setIsDownloadingPaystubPdf
    );
  };

  const openEditPayout = (payout, context = 'closed') => {
    setEditingPayout(payout);
    setEditingPayoutContext(context);
    setEditPayoutForm(createPayoutEditForm(payout));
    setIsEditPayoutOpen(true);
  };

  const closeEditPayout = () => {
    if (isSavingPayout) return;
    setIsEditPayoutOpen(false);
    setEditingPayout(null);
    setEditingPayoutContext('closed');
    setEditPayoutForm({});
  };

  const handleSavePayout = async (e) => {
    e.preventDefault();
    if (!editingPayout?.id) return;

    try {
      setIsSavingPayout(true);

      if (editingPayoutContext === 'preview') {
        const updatedPreviewPayout = applyEditedPreviewPayout(editingPayout, editedPayoutPreview);
        setPreview((current) => {
          if (!current) return current;

          return {
            ...current,
            hourly_employees: (current.hourly_employees || []).map((item) => (
              item.id === updatedPreviewPayout.id ? updatedPreviewPayout : item
            )),
            salaried_employees: (current.salaried_employees || []).map((item) => (
              item.id === updatedPreviewPayout.id ? updatedPreviewPayout : item
            )),
          };
        });
        closeEditPayout();
        return;
      }

      if (!selectedPayPeriod?.id) {
        return;
      }

      const response = await api.patch(`/pay-periods/payouts/${editingPayout.id}`, {
        breakdown: editPayoutForm,
        ytdBreakdown: PAYSTUB_LINE_ITEMS.reduce((accumulator, item) => {
          accumulator[item.ytdKey] = roundCurrency(
            normalizeEditableYtdValue(editPayoutForm[item.ytdKey], editPayoutForm[item.currentKey], editPayoutForm[item.currentKey])
          );
          return accumulator;
        }, {}),
        payoutVacationAccrual: Boolean(editPayoutForm.payoutVacationAccrual),
        ytd: {
          gross: roundCurrency(normalizeEditableYtdValue(editPayoutForm.ytd_gross, editedPayoutPreview.grossAmount, editingPayout.ytd_gross)),
          hours: roundCurrency(normalizeEditableYtdValue(editPayoutForm.ytd_hours, editedPayoutPreview.totalHours, editingPayout.ytd_hours)),
          cpp: roundCurrency(normalizeEditableYtdValue(editPayoutForm.ytd_cpp, editingPayout.cpp_current, editingPayout.ytd_cpp)),
          ei: roundCurrency(normalizeEditableYtdValue(editPayoutForm.ytd_ei, editingPayout.ei_current, editingPayout.ytd_ei)),
          tax: roundCurrency(normalizeEditableYtdValue(editPayoutForm.ytd_tax, editingPayout.income_tax_current, editingPayout.ytd_tax)),
        },
      });

      const updatedPayout = response.data.payout;
      setPaystubPayouts((current) => current.map((item) => (
        item.id === updatedPayout.id ? { ...item, ...updatedPayout } : item
      )));
      setSummaryPreviewPayouts((current) => current.map((item) => (
        item.id === updatedPayout.id ? { ...item, ...updatedPayout } : item
      )));

      if (paystubPreview?.paystub?.payout_id === updatedPayout.id && paystubPreview.paystubId) {
        const detailResponse = await api.get(`/documents/paystubs/${paystubPreview.paystubId}/details`);
        setPaystubPreview((current) => ({
          ...detailResponse.data,
          paystubId: current?.paystubId || detailResponse.data.paystub?.id,
          stubNumber: current?.stubNumber || detailResponse.data.paystub?.stub_number,
        }));
      }

      closeEditPayout();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update payout');
    } finally {
      setIsSavingPayout(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Pay Periods" subtitle="Manage payroll cycles and payments">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Pay Periods" subtitle="Manage payroll cycles and payments">
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setIsGenerateOpen(true)}
          className="px-4 py-2 rounded-xl font-medium text-sm themed-hover transition-colors"
          style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
        >
          Auto-Generate Periods
        </button>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-colors shadow-lg flex items-center gap-2"
          style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
        >
          <Plus size={16} /> Create Period
        </button>
      </div>

      {payPeriods.length === 0 ? (
        <div className="themed-surface rounded-3xl p-12 text-center">
          <Calendar size={48} className="mx-auto mb-4 text-stone-300" />
          <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-2">
            No Pay Periods Yet
          </h3>
          <p className="text-stone-500 mb-6">
            Create your first pay period to start tracking payroll
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-6 py-3 text-white font-bold rounded-xl shadow-md hover:opacity-90 transition-colors"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            Create Pay Period
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {payPeriods.map((period, i) => (
            <div
              key={period.id}
              className="themed-surface p-6 rounded-3xl"
            >
              <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="font-quicksand font-bold text-xl text-stone-800">
                      {period.name || `${formatDate(period.start_date)} - ${formatDate(period.end_date)}`}
                    </h3>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={getStatusStyle(period.status)}
                    >
                      {period.status}
                    </span>
                  </div>
                  <p className="text-stone-500 text-sm">
                    {formatDate(period.start_date)} - {formatDate(period.end_date)}
                  </p>
                  <p className="text-stone-500 text-sm">
                    Pay date: {formatDate(period.pay_date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {period.status === 'OPEN' && (
                    <>
                      <button
                        onClick={() => handleOpenPeriodPreview(period.id, 'review')}
                        className="px-4 py-2 font-bold text-sm rounded-xl themed-hover transition-colors flex items-center gap-2"
                        style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                      >
                        <Eye size={16} /> Open
                      </button>
                      <button
                        onClick={() => handleOpenPeriodPreview(period.id, 'close')}
                        className="px-4 py-2 text-white font-bold text-sm rounded-xl shadow-md hover:opacity-90 transition-colors"
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        Close Period
                      </button>
                    </>
                  )}
                  {period.status === 'CLOSED' && (
                    <>
                      <button
                        onClick={() => handleOpenPayrollSummary(period)}
                        disabled={isSummaryLoading && summaryPreviewPeriod?.id === period.id}
                        className="px-4 py-2 font-bold text-sm rounded-xl themed-hover transition-colors flex items-center gap-2 disabled:opacity-60"
                        style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                      >
                        <Eye size={16} /> Open
                      </button>
                      <button
                        onClick={() => handleOpenPaystubs(period)}
                        disabled={isPaystubsLoading && selectedPayPeriod?.id === period.id}
                        className="px-4 py-2 font-bold text-sm rounded-xl themed-hover transition-colors flex items-center gap-2 disabled:opacity-60"
                        style={{ backgroundColor: '#FFF8F3', color: 'var(--primary-dark)' }}
                      >
                        <FileText size={16} /> Paystubs
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => openDeleteModal(period)}
                    className="px-4 py-2 font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
                    style={{ backgroundColor: '#FFF1ED', color: '#C2410C' }}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl" style={cardStyles[0]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[0].color }}>
                    <DollarSign size={16} />
                    <span>Total Amount</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[0].color }}>
                    ${period.total_amount ? parseFloat(period.total_amount).toFixed(2) : '0.00'}
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={cardStyles[1]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[1].color }}>
                    <Users size={16} />
                    <span>Employees</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[1].color }}>
                    {period.employee_count || 0}
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={cardStyles[2]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[2].color }}>
                    <Clock size={16} />
                    <span>Total Hours</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[2].color }}>
                    {period.total_hours ? parseFloat(period.total_hours).toFixed(1) : '0.0'}
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={cardStyles[3]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[3].color }}>
                    <CheckCircle size={16} />
                    <span>{period.status === 'OPEN' ? 'Scheduled Shifts' : 'Approved Entries'}</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[3].color }}>
                    {period.status === 'OPEN' ? (period.scheduled_shifts || 0) : (period.approved_entries || 0)}
                  </p>
                </div>
              </div>

              {period.notes && (
                <div
                  className="mt-4 p-4 rounded-xl border themed-border"
                  style={{ backgroundColor: 'var(--background)' }}
                >
                  <p className="text-sm text-stone-600">{period.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <BaseModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Pay Period"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., March 2024"
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Start Date *
            </label>
            <button
              type="button"
              onClick={() => openDatePicker('create', 'startDate')}
              className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white hover:border-[#FF9B85]"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} className="text-stone-400" />
                <span className={formData.startDate ? 'text-stone-800' : 'text-stone-400'}>
                  {formatDateLabel(formData.startDate, 'Select start date')}
                </span>
              </span>
              <ChevronDown size={16} className="text-stone-400" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              End Date *
            </label>
            <button
              type="button"
              onClick={() => openDatePicker('create', 'endDate')}
              className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white hover:border-[#FF9B85]"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} className="text-stone-400" />
                <span className={formData.endDate ? 'text-stone-800' : 'text-stone-400'}>
                  {formatDateLabel(formData.endDate, 'Select end date')}
                </span>
              </span>
              <ChevronDown size={16} className="text-stone-400" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Pay Date *
            </label>
            <button
              type="button"
              onClick={() => openDatePicker('create', 'payDate')}
              className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white hover:border-[#FF9B85]"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} className="text-stone-400" />
                <span className={formData.payDate ? 'text-stone-800' : 'text-stone-400'}>
                  {formatDateLabel(formData.payDate, 'Select pay date')}
                </span>
              </span>
              <ChevronDown size={16} className="text-stone-400" />
            </button>
          </div>
          <div className="flex gap-3 pt-4 border-t themed-border">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:opacity-90 transition-all"
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
            >
              Create
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isGenerateOpen}
        onClose={() => {
          setIsGenerateOpen(false);
          setIsFrequencyMenuOpen(false);
        }}
        title="Auto-Generate Pay Periods"
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          <p className="text-sm text-stone-500">
            This will generate the next 6 months of pay periods based on the frequency you select.
          </p>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Frequency *
            </label>
            <div ref={frequencyMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsFrequencyMenuOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white text-sm text-left text-stone-700"
                aria-haspopup="listbox"
                aria-expanded={isFrequencyMenuOpen}
              >
                <span>{selectedFrequencyLabel}</span>
                <ChevronDown
                  size={16}
                  className={`text-stone-400 transition-transform ${isFrequencyMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isFrequencyMenuOpen && (
                <div className="absolute z-30 mt-2 w-full rounded-2xl border border-[#FFE5D9] bg-white shadow-lg shadow-[#FF9B85]/10">
                  <div className="max-h-56 overflow-y-auto p-2 space-y-1" role="listbox">
                    {FREQUENCY_OPTIONS.map((option) => {
                      const isSelected = generateData.frequency === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setGenerateData((prev) => ({ ...prev, frequency: option.value }));
                            setIsFrequencyMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between gap-2 ${
                            isSelected ? 'bg-[#FF9B85] text-white' : 'text-stone-700 hover:bg-[#FFF8F3]'
                          }`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <span>{option.label}</span>
                          {isSelected && <Check size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Start Date *
            </label>
            <button
              type="button"
              onClick={() => openDatePicker('generate', 'startDate')}
              className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white hover:border-[#FF9B85]"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} className="text-stone-400" />
                <span className={generateData.startDate ? 'text-stone-800' : 'text-stone-400'}>
                  {formatDateLabel(generateData.startDate, 'Select generation start date')}
                </span>
              </span>
              <ChevronDown size={16} className="text-stone-400" />
            </button>
          </div>
          <div className="flex gap-3 pt-4 border-t themed-border">
            <button
              type="button"
              onClick={() => setIsGenerateOpen(false)}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:opacity-90 transition-all"
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
            >
              Generate
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isPreviewOpen}
        onClose={closePreviewModal}
        title={previewMode === 'close' ? 'Close Pay Period Preview' : 'Open Pay Period Preview'}
        maxWidth="max-w-5xl"
      >
        {preview ? (
          <div className="space-y-6">
            <div>
              <p className="text-stone-600">
                <span className="font-bold text-stone-800">{preview.period.name}</span> ({formatDate(preview.period.start_date)} - {formatDate(preview.period.end_date)})
              </p>
              <p className="text-sm text-stone-500">Pay Date: {formatDate(preview.period.pay_date)}</p>
              <p className="text-sm text-stone-500">Total Employees: {preview.total_count}</p>
              {previewMode === 'close' ? (
                <p className="mt-2 text-sm text-stone-500">
                  Use <span className="font-semibold text-stone-700">Edit Paystub</span> to review and adjust each employee's draft paystub before you confirm close.
                </p>
              ) : null}
            </div>

            {previewTotals && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl" style={cardStyles[0]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[0].color }}>
                    <Users size={16} />
                    <span>Employees</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[0].color }}>
                    {preview.total_count || 0}
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={cardStyles[1]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[1].color }}>
                    <Clock size={16} />
                    <span>Total Hours</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[1].color }}>
                    {formatHours(previewTotals.totalHours)}
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={cardStyles[2]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[2].color }}>
                    <DollarSign size={16} />
                    <span>Gross Payroll</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[2].color }}>
                    {formatCurrency(previewTotals.grossAmount)}
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={cardStyles[3]}>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[3].color }}>
                    <FileText size={16} />
                    <span>Net Payroll</span>
                  </div>
                  <p className="font-bold text-lg" style={{ color: cardStyles[3].color }}>
                    {formatCurrency(previewTotals.netAmount)}
                  </p>
                </div>
              </div>
            )}

            {preview.hourly_employees?.length > 0 && (
              <div>
                <h4 className="font-bold text-stone-700 mb-2">Hourly Employees</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: 'var(--background)' }}>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Hours</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Gross</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Deductions</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Net</th>
                        {previewMode === 'close' ? (
                          <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Action</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y themed-border">
                      {preview.hourly_employees.map((emp) => (
                        <tr key={emp.id} className="themed-row">
                          <td className="px-4 py-2 text-sm text-stone-700">{emp.first_name} {emp.last_name}</td>
                          <td className="px-4 py-2 text-sm text-stone-600">{parseFloat(emp.total_hours || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-stone-600">${parseFloat(emp.hourly_rate || 0).toFixed(2)}/hr</td>
                          <td className="px-4 py-2 text-sm text-stone-700">${parseFloat(emp.gross_amount || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-stone-600">${parseFloat(emp.deductions || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm font-semibold text-stone-700">${parseFloat(emp.net_amount || 0).toFixed(2)}</td>
                          {previewMode === 'close' ? (
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => openEditPayout(emp, 'preview')}
                                disabled={isSavingPayout}
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold themed-hover transition-colors disabled:opacity-60"
                                style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                              >
                                <Pencil size={16} />
                                Edit Paystub
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview.salaried_employees?.length > 0 && (
              <div>
                <h4 className="font-bold text-stone-700 mb-2">Salaried Employees</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: 'var(--background)' }}>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Hours</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Gross</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Deductions</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Net</th>
                        {previewMode === 'close' ? (
                          <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Action</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y themed-border">
                      {preview.salaried_employees.map((emp) => (
                        <tr key={emp.id} className="themed-row">
                          <td className="px-4 py-2 text-sm text-stone-700">{emp.first_name} {emp.last_name}</td>
                          <td className="px-4 py-2 text-sm text-stone-600">{parseFloat(emp.total_hours || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-stone-700">${parseFloat(emp.gross_amount || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-stone-600">${parseFloat(emp.deductions || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm font-semibold text-stone-700">${parseFloat(emp.net_amount || 0).toFixed(2)}</td>
                          {previewMode === 'close' ? (
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => openEditPayout(emp, 'preview')}
                                disabled={isSavingPayout}
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold themed-hover transition-colors disabled:opacity-60"
                                style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                              >
                                <Pencil size={16} />
                                Edit Paystub
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t themed-border">
              <button
                type="button"
                onClick={closePreviewModal}
                className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors"
              >
                {previewMode === 'close' ? 'Cancel' : 'Close'}
              </button>
              {previewMode === 'close' && (
                <button
                  type="button"
                  onClick={handleConfirmClose}
                  className="flex-1 px-6 py-3 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all"
                >
                  Confirm & Close Period
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-stone-500">Loading preview...</div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={isPaystubsOpen}
        onClose={closePaystubsModal}
        title={selectedPayPeriod ? `Paystubs for ${selectedPayPeriod.name || `Period ${selectedPayPeriod.id}`}` : 'Paystubs'}
        maxWidth="max-w-5xl"
      >
        {selectedPayPeriod ? (
          <div className="space-y-5">
            <div>
              <p className="text-stone-600">
                {formatDate(selectedPayPeriod.start_date)} - {formatDate(selectedPayPeriod.end_date)}
              </p>
              <p className="text-sm text-stone-500">
                Pay Date: {formatDate(selectedPayPeriod.pay_date)}
              </p>
            </div>

            {isPaystubsLoading ? (
              <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
                Loading paystubs...
              </div>
            ) : paystubPayouts.length === 0 ? (
              <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
                No employee payouts exist for this pay period yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--background)' }}>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Hours</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Compensation</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Net Pay</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Paystub</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-border">
                    {paystubPayouts.map((payout) => (
                      <tr key={payout.id} className="themed-row">
                        <td className="px-4 py-3 text-sm text-stone-700">
                          {payout.first_name} {payout.last_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {parseFloat(payout.total_hours || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {getCompensationLabel(payout)}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-700">
                          {formatCurrency(payout.net_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {payout.stub_number || 'Not generated'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditPayout(payout)}
                              disabled={paystubActionId === payout.id || isPaystubPreviewLoading || isSavingPayout}
                              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold themed-hover transition-colors disabled:opacity-60"
                              style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                            >
                              <Pencil size={16} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenPaystub(payout)}
                              disabled={paystubActionId === payout.id || isPaystubPreviewLoading || isSavingPayout}
                              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-md hover:opacity-90 disabled:opacity-60"
                              style={{ backgroundColor: 'var(--primary)' }}
                            >
                              <Eye size={16} />
                              {paystubActionId === payout.id ? 'Opening...' : (payout.paystub_id ? 'Open' : 'Create & Open')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t themed-border">
              <button
                type="button"
                onClick={closePaystubsModal}
                disabled={!!paystubActionId}
                className="px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors disabled:opacity-60"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-stone-500">Loading...</div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={isSummaryOpen}
        onClose={closeSummaryModal}
        title={summaryPreviewPeriod ? `${summaryPreviewPeriod.name || `Pay Period ${summaryPreviewPeriod.id}`} Summary` : 'Payroll Summary'}
        maxWidth="max-w-6xl"
      >
        {summaryPreviewPeriod ? (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="text-stone-700 font-bold">
                  {formatDate(summaryPreviewPeriod.start_date)} - {formatDate(summaryPreviewPeriod.end_date)}
                </p>
                <p className="text-sm text-stone-500">Pay Date: {formatDate(summaryPreviewPeriod.pay_date)}</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadPayrollSummaryPdf}
                disabled={isDownloadingSummaryPdf}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold themed-hover transition-colors disabled:opacity-60"
                style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
              >
                <Download size={16} /> {isDownloadingSummaryPdf ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>

            {isSummaryLoading ? (
              <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
                Loading payroll summary...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl" style={cardStyles[0]}>
                    <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[0].color }}>
                      <Users size={16} />
                      <span>Employees</span>
                    </div>
                    <p className="font-bold text-lg" style={{ color: cardStyles[0].color }}>
                      {summaryPreviewPayouts.length}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={cardStyles[1]}>
                    <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[1].color }}>
                      <Clock size={16} />
                      <span>Total Hours</span>
                    </div>
                    <p className="font-bold text-lg" style={{ color: cardStyles[1].color }}>
                      {formatHours(summaryTotals.totalHours)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={cardStyles[2]}>
                    <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[2].color }}>
                      <DollarSign size={16} />
                      <span>Gross Payroll</span>
                    </div>
                    <p className="font-bold text-lg" style={{ color: cardStyles[2].color }}>
                      {formatCurrency(summaryTotals.grossAmount)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={cardStyles[3]}>
                    <div className="flex items-center gap-2 text-sm mb-1" style={{ color: cardStyles[3].color }}>
                      <FileText size={16} />
                      <span>Net Payroll</span>
                    </div>
                    <p className="font-bold text-lg" style={{ color: cardStyles[3].color }}>
                      {formatCurrency(summaryTotals.netAmount)}
                    </p>
                  </div>
                </div>

                {summaryPreviewPayouts.length === 0 ? (
                  <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
                    No payouts were found for this pay period yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: 'var(--background)' }}>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Employee</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Hours</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Rate</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Gross</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Deductions</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y themed-border">
                        {summaryPreviewPayouts.map((payout) => (
                          <tr key={payout.id} className="themed-row">
                            <td className="px-4 py-3 text-sm text-stone-700">{payout.first_name} {payout.last_name}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">{formatHours(payout.total_hours)}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">
                              {getCompensationLabel(payout)}
                            </td>
                            <td className="px-4 py-3 text-sm text-stone-700">{formatCurrency(payout.gross_amount)}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">{formatCurrency(payout.deductions)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-stone-700">{formatCurrency(payout.net_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
            Loading payroll summary...
          </div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={isPaystubPreviewOpen}
        onClose={closePaystubPreview}
        title={paystubPreview ? `${paystubPreview.user.first_name} ${paystubPreview.user.last_name} Paystub` : 'Paystub Preview'}
        maxWidth="max-w-5xl"
      >
        {paystubPreview && paystubHtmlPreview ? (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-bold text-stone-800">{paystubPreview.payPeriod.name}</p>
                <p className="text-sm text-stone-500">
                  {formatDate(paystubPreview.payPeriod.start_date)} - {formatDate(paystubPreview.payPeriod.end_date)}
                </p>
                <p className="text-sm text-stone-500">Pay Date: {formatDate(paystubPreview.payPeriod.pay_date)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-stone-700">Stub #{paystubPreview.paystub.stub_number}</p>
                <div className="mt-3 inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditPayout({
                      ...paystubPreview.payout,
                      first_name: paystubPreview.user.first_name,
                      last_name: paystubPreview.user.last_name,
                      email: paystubPreview.user.email,
                      payment_type: paystubPreview.user.payment_type,
                      profile_hourly_rate: paystubPreview.user.profile_hourly_rate,
                      profile_salary_amount: paystubPreview.user.salary_amount,
                      employment_type: paystubPreview.user.employment_type,
                      ytd_gross: paystubPreview.user.ytd_gross,
                      ytd_hours: paystubPreview.user.ytd_hours,
                      ytd_cpp: paystubPreview.user.ytd_cpp,
                      ytd_ei: paystubPreview.user.ytd_ei,
                      ytd_tax: paystubPreview.user.ytd_tax,
                      paystub_id: paystubPreview.paystubId,
                      stub_number: paystubPreview.stubNumber,
                    })}
                    disabled={isSavingPayout}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold themed-hover transition-colors disabled:opacity-60"
                    style={{ backgroundColor: '#FFF8F3', color: 'var(--primary-dark)' }}
                  >
                    <Pencil size={16} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPaystubPdf}
                    disabled={isDownloadingPaystubPdf || isSavingPayout}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold themed-hover transition-colors disabled:opacity-60"
                    style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                  >
                    <Download size={16} /> {isDownloadingPaystubPdf ? 'Downloading...' : 'Download PDF'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl" style={cardStyles[0]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[0].color }}>Hours</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[0].color }}>{formatHours(paystubHtmlPreview.totalHours)}</p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[1]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[1].color }}>Rate</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[1].color }}>
                  {paystubHtmlPreview.paymentType === 'SALARY'
                    ? getCompensationLabel({
                      payment_type: paystubPreview.user.payment_type,
                      profile_hourly_rate: paystubPreview.user.profile_hourly_rate,
                      profile_salary_amount: paystubPreview.user.salary_amount,
                      hourly_rate: paystubPreview.payout.hourly_rate,
                    })
                    : `${formatCurrency(paystubHtmlPreview.hourlyRate)}/hr`}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[2]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[2].color }}>Gross Pay</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[2].color }}>{formatCurrency(paystubHtmlPreview.grossAmount)}</p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[3]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[3].color }}>Net Pay</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[3].color }}>{formatCurrency(paystubHtmlPreview.netAmount)}</p>
              </div>
            </div>

            <div className="rounded-2xl border themed-border p-4" style={{ backgroundColor: 'var(--background)' }}>
              <div className="flex items-center justify-between gap-4 mb-3">
                <h4 className="font-bold text-stone-800">Paystub Preview</h4>
                <p className="text-sm text-stone-500">HTML preview of the pay table used for the PDF.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--background)' }}>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Pay</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Hours</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Rate</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Current</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-border">
                    {paystubHtmlPreview.rows.map((row) => (
                      <tr key={row.key} className="themed-row">
                        <td className="px-4 py-3 text-sm text-stone-700">{row.label}</td>
                        <td className="px-4 py-3 text-sm text-right text-stone-600">{formatHours(row.hours)}</td>
                        <td className="px-4 py-3 text-sm text-right text-stone-600">{formatCurrency(row.rate)}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-stone-700">{formatCurrency(row.current)}</td>
                        <td className="px-4 py-3 text-sm text-right text-stone-600">{formatCurrency(row.ytd)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t themed-border">
                      <td className="px-4 py-3 text-sm font-bold text-stone-700">Totals</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-stone-700">{formatHours(paystubHtmlPreview.totalHours)}</td>
                      <td className="px-4 py-3 text-sm text-right text-stone-500">Deductions {formatCurrency(paystubHtmlPreview.deductions)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-stone-700">{formatCurrency(paystubHtmlPreview.grossAmount)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-stone-700">{formatCurrency(paystubHtmlPreview.ytdSummary.gross)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border themed-border p-4" style={{ backgroundColor: 'var(--background)' }}>
                <h4 className="font-bold text-stone-800 mb-3">Employee</h4>
                <div className="space-y-1 text-sm text-stone-600">
                  <p>{paystubPreview.user.first_name} {paystubPreview.user.last_name}</p>
                  <p>{paystubPreview.user.email}</p>
                  <p>{getPaymentTypeLabel(paystubPreview.user.payment_type)} compensation</p>
                  <p>{paystubPreview.user.employment_type || 'Employment type not set'}</p>
                  <p>Default Retro Payment: {formatCurrency(paystubPreview.user.retro_payment_amount || 0)}</p>
                  {paystubPreview.user.vacation_accrual_enabled ? (
                    <p>Vacation accrual: {(safeNumber(paystubPreview.user.vacation_accrual_rate, DEFAULT_VACATION_ACCRUAL_RATE) * 100).toFixed(2)}%</p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl border themed-border p-4" style={{ backgroundColor: 'var(--background)' }}>
                <h4 className="font-bold text-stone-800 mb-3">Year To Date</h4>
                <div className="grid grid-cols-2 gap-3 text-sm text-stone-600">
                  <p>Gross: {formatCurrency(paystubHtmlPreview.ytdSummary.gross)}</p>
                  <p>Hours: {formatHours(paystubHtmlPreview.ytdSummary.hours)}</p>
                  <p>CPP: {formatCurrency(paystubHtmlPreview.ytdSummary.cpp)}</p>
                  <p>EI: {formatCurrency(paystubHtmlPreview.ytdSummary.ei)}</p>
                  <p>Tax: {formatCurrency(paystubHtmlPreview.ytdSummary.tax)}</p>
                </div>
                <p className="mt-3 text-xs text-stone-500">
                  Deductions include Income Tax, EI, CPP, and CPP2 when applicable.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border themed-border p-4" style={{ backgroundColor: 'var(--background)' }}>
              <h4 className="font-bold text-stone-800 mb-3">Balances</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-stone-600">
                <p>Vacation Annual: {formatHours(paystubPreview.user.annual_vacation_days)}</p>
                <p>Vacation Remaining: {formatHours(paystubPreview.user.vacation_days_remaining)}</p>
                <p>Sick Annual: {formatHours(paystubPreview.user.annual_sick_days)}</p>
                <p>Sick Remaining: {formatHours(paystubPreview.user.sick_days_remaining)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
            Loading paystub preview...
          </div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={isEditPayoutOpen}
        onClose={closeEditPayout}
        title={editingPayout ? `${editingPayoutContext === 'preview' ? 'Review Draft Paystub' : 'Edit'} ${editingPayout.first_name} ${editingPayout.last_name} Payout` : 'Edit Payout'}
        maxWidth="max-w-3xl"
      >
        {editingPayout && editedPayoutPreview ? (
          <form onSubmit={handleSavePayout} className="space-y-6">
            <div className="rounded-2xl border themed-border p-4" style={{ backgroundColor: 'var(--background)' }}>
              <p className="font-bold text-stone-800">{editingPayout.first_name} {editingPayout.last_name}</p>
              <p className="text-sm text-stone-600">{editingPayout.email}</p>
              <p className="mt-2 text-sm text-stone-500">
                {editingPayoutContext === 'preview'
                  ? 'Edit the draft paystub before closing. Current values update live in HTML and these draft values are what closing the pay period will store.'
                  : 'Edit the paystub rows below. Current values update live in HTML and the saved data is what the PDF download uses.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl" style={cardStyles[0]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[0].color }}>Hours</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[0].color }}>
                  {formatHours(editedPayoutPreview.totalHours)}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[1]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[1].color }}>Rate</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[1].color }}>
                  {editedPayoutPreview.paymentType === 'SALARY'
                    ? getCompensationLabel(editingPayout)
                    : `${formatCurrency(editedPayoutPreview.hourlyRate)}/hr`}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[2]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[2].color }}>Gross Pay</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[2].color }}>
                  {formatCurrency(editedPayoutPreview.grossAmount)}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={cardStyles[3]}>
                <div className="text-sm mb-1" style={{ color: cardStyles[3].color }}>Net Pay</div>
                <p className="font-bold text-lg" style={{ color: cardStyles[3].color }}>
                  {formatCurrency(editedPayoutPreview.netAmount)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border themed-border p-4" style={{ backgroundColor: 'var(--background)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="font-bold text-stone-800">Paystub HTML Preview</h4>
                  <p className="text-sm text-stone-500">Edit hours, rate, and YTD for each line. If a YTD entry is lower than Current, the preview treats it as prior YTD and adds Current on top.</p>
                </div>
                <div className="text-sm text-stone-500">
                  Paystub: {editingPayout.stub_number || 'Not generated yet'}
                </div>
              </div>
              {editingPayoutVacationAccrualCanToggle ? (
                <div className="mb-4 rounded-2xl border border-[#FFE5D9] bg-white px-4 py-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editPayoutForm.payoutVacationAccrual)}
                      onChange={(event) => setEditPayoutForm((current) => ({
                        ...current,
                        payoutVacationAccrual: event.target.checked,
                      }))}
                      className="mt-1 h-4 w-4 rounded themed-border text-[var(--primary)] themed-ring"
                    />
                    <span>
                      <span className="block text-sm font-bold text-stone-700">
                        Pay out accrued vacation on this pay period
                      </span>
                      <span className="block text-sm text-stone-500">
                        Available this period: {formatHours(editedPayoutPreview?.vacationAccrualHours)} hours at {formatCurrency(getBaseHourlyRate(editingPayout, editingPayout))}/hr
                      </span>
                    </span>
                  </label>
                </div>
              ) : null}
              {editingPayoutVacationAccrualIsAuto ? (
                <div className="mb-4 rounded-2xl border border-[#FFE5D9] bg-white px-4 py-3 text-sm text-stone-600">
                  Part-time vacation accrual is paid out automatically for this pay period.
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--background)' }}>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Pay</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Hours</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Rate</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Current</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-border">
                    {editedPayoutPreview.rows.map((row) => (
                      <tr key={row.key} className="themed-row">
                        <td className="px-4 py-3 text-sm font-medium text-stone-700">{row.label}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editPayoutForm[row.hoursKey] || '0.00'}
                            onChange={(event) => setEditPayoutForm((current) => ({
                              ...current,
                              [row.hoursKey]: event.target.value,
                            }))}
                            className={`ml-auto block w-28 rounded-xl border themed-border px-3 py-2 text-right text-sm themed-ring ${
                              (row.key === 'vacation' && editingPayoutHasVacationAccrual) || usesExplicitCurrentLineItem(row)
                                ? 'bg-stone-100 text-stone-500 cursor-not-allowed'
                                : 'bg-white'
                            }`}
                            disabled={(row.key === 'vacation' && editingPayoutHasVacationAccrual) || usesExplicitCurrentLineItem(row)}
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editPayoutForm[row.rateKey] || '0.00'}
                            onChange={(event) => setEditPayoutForm((current) => ({
                              ...current,
                              [row.rateKey]: event.target.value,
                            }))}
                            className={`ml-auto block w-28 rounded-xl border themed-border px-3 py-2 text-right text-sm themed-ring ${
                              (row.key === 'vacation' && editingPayoutHasVacationAccrual) || usesExplicitCurrentLineItem(row)
                                ? 'bg-stone-100 text-stone-500 cursor-not-allowed'
                                : 'bg-white'
                            }`}
                            disabled={(row.key === 'vacation' && editingPayoutHasVacationAccrual) || usesExplicitCurrentLineItem(row)}
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          {usesExplicitCurrentLineItem(row) ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editPayoutForm[row.currentKey] || formatEditorNumber(row.current)}
                              onChange={(event) => setEditPayoutForm((current) => ({
                                ...current,
                                [row.currentKey]: event.target.value,
                              }))}
                              className="ml-auto block w-32 rounded-xl border themed-border bg-white px-3 py-2 text-right text-sm themed-ring"
                              required
                            />
                          ) : (
                            <div className="text-sm text-right font-semibold text-stone-700">
                              {formatCurrency(row.current)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editPayoutForm[row.ytdKey] || formatEditorNumber(row.ytd)}
                            onChange={(event) => setEditPayoutForm((current) => ({
                              ...current,
                              [row.ytdKey]: event.target.value,
                            }))}
                            className="ml-auto block w-32 rounded-xl border themed-border bg-white px-3 py-2 text-right text-sm themed-ring"
                            required
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t themed-border">
                      <td className="px-4 py-3 text-sm font-bold text-stone-700">Totals</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-stone-700">{formatHours(editedPayoutPreview.totalHours)}</td>
                      <td className="px-4 py-3 text-sm text-right text-stone-500">Deductions {formatCurrency(editedPayoutPreview.deductions)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-stone-700">{formatCurrency(editedPayoutPreview.grossAmount)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-stone-700">{formatCurrency(editedPayoutPreview.ytdSummary.gross)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border themed-border p-4 text-sm text-stone-600" style={{ backgroundColor: 'var(--background)' }}>
              <div className="mb-3">
                <h4 className="font-bold text-stone-800">Year To Date</h4>
                <p className="text-sm text-stone-500">YTD defaults to at least the current paystub values and can be adjusted here when needed.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">Gross</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPayoutForm.ytd_gross || '0.00'}
                    onChange={(event) => setEditPayoutForm((current) => ({ ...current, ytd_gross: event.target.value }))}
                    className="block w-full rounded-xl border themed-border bg-white px-3 py-2 text-right text-sm themed-ring"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">Hours</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPayoutForm.ytd_hours || '0.00'}
                    onChange={(event) => setEditPayoutForm((current) => ({ ...current, ytd_hours: event.target.value }))}
                    className="block w-full rounded-xl border themed-border bg-white px-3 py-2 text-right text-sm themed-ring"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">CPP</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPayoutForm.ytd_cpp || '0.00'}
                    onChange={(event) => setEditPayoutForm((current) => ({ ...current, ytd_cpp: event.target.value }))}
                    className="block w-full rounded-xl border themed-border bg-white px-3 py-2 text-right text-sm themed-ring"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">EI</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPayoutForm.ytd_ei || '0.00'}
                    onChange={(event) => setEditPayoutForm((current) => ({ ...current, ytd_ei: event.target.value }))}
                    className="block w-full rounded-xl border themed-border bg-white px-3 py-2 text-right text-sm themed-ring"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">Tax</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPayoutForm.ytd_tax || '0.00'}
                    onChange={(event) => setEditPayoutForm((current) => ({ ...current, ytd_tax: event.target.value }))}
                    className="block w-full rounded-xl border themed-border bg-white px-3 py-2 text-right text-sm themed-ring"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border themed-border p-4 text-sm text-stone-600" style={{ backgroundColor: 'var(--background)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <p>Compensation Type: {getPaymentTypeLabel(editingPayout.payment_type)}</p>
                <p>Employment: {editingPayout.employment_type || 'Employment type not set'}</p>
                <p>Profile Rate: {formatCurrency(editingPayout.profile_hourly_rate || 0)}/hr</p>
                <p>Deductions: {formatCurrency(editedPayoutPreview.deductions)}</p>
                <p>YTD Gross: {formatCurrency(editedPayoutPreview.ytdSummary.gross)}</p>
                <p>YTD Hours: {formatHours(editedPayoutPreview.ytdSummary.hours)}</p>
                {editingPayoutHasVacationAccrual ? (
                  <p>Vacation Accrual: {(getVacationAccrualRate(editingPayout, editingPayout) * 100).toFixed(2)}%</p>
                ) : null}
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t themed-border">
              <button
                type="button"
                onClick={closeEditPayout}
                disabled={isSavingPayout}
                className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingPayout}
                className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-60"
                style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
              >
                {isSavingPayout ? 'Saving...' : (editingPayoutContext === 'preview' ? 'Save Draft' : 'Save Payout')}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border themed-border px-4 py-8 text-center text-stone-500">
            Loading payout editor...
          </div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={isDeleteOpen}
        onClose={closeDeleteModal}
        title="Delete Pay Period"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4">
            <p className="font-bold text-red-900">
              Delete {deleteTarget?.name || 'this pay period'}?
            </p>
            <p className="mt-2 text-sm text-red-800">
              This permanently removes the pay period. If it is closed, its stored payouts and paystubs are deleted with it.
            </p>
          </div>

          {deleteTarget && (
            <div
              className="rounded-2xl border themed-border px-4 py-4 text-sm text-stone-600"
              style={{ backgroundColor: 'var(--background)' }}
            >
              {formatDate(deleteTarget.start_date)} - {formatDate(deleteTarget.end_date)}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t themed-border">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={isDeleting}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 px-6 py-3 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Delete Pay Period'}
            </button>
          </div>
        </div>
      </BaseModal>

      <DatePickerModal
        isOpen={datePickerState.isOpen}
        onClose={closeDatePicker}
        initialDate={parseDateInput(currentDateField.value) || undefined}
        onConfirm={handleDateConfirm}
        onClear={handleDateClear}
        title={currentDateField.title}
        subtitle={currentDateField.subtitle}
        confirmLabel={currentDateField.confirmLabel}
        clearLabel="Clear date"
      />
    </Layout>
  );
}
