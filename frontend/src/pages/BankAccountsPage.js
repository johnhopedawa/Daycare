import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '../components/Layout';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  DollarSign,
  Filter,
  Search,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import api from '../utils/api';
import { BaseModal } from '../components/modals/BaseModal';
import { DatePickerModal } from '../components/modals/DatePickerModal';

const DEFAULT_REPORTING_YEAR = new Date().getFullYear();
const DEFAULT_LIMIT = 1000;
const CHART_HEIGHT = 120;

const RULE_FIELDS = [
  { value: 'description', label: 'Description' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'both', label: 'Description or vendor' },
];

const RULE_TYPES = [
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'both', label: 'Both' },
];

const FILTER_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
];

const PERIOD_VIEWS = [
  { value: 'month', label: 'Months' },
  { value: 'term', label: 'Terms' },
];

const RANGE_OPTIONS = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'year', label: 'Reporting year' },
  { value: 'custom', label: 'From date' },
];

const ACCOUNT_TYPES = [
  { value: 'credit', label: 'Credit card' },
  { value: 'debit', label: 'Debit or bank' },
];

const TERM_BUCKETS = [
  { key: 'winter', label: 'Winter', months: [0, 1, 2] },
  { key: 'spring', label: 'Spring', months: [3, 4, 5] },
  { key: 'summer', label: 'Summer', months: [6, 7, 8] },
  { key: 'fall', label: 'Fall', months: [9, 10, 11] },
];

const VIEW_CONFIG = {
  dashboard: {
    title: 'Finance Dashboard',
    subtitle: 'Track income, expenses, and balances across your accounts',
    sections: {
      stats: true,
      reporting: true,
      chart: true,
      topCategories: true,
      accounts: false,
      transactions: false,
      rules: false,
    },
  },
  transactions: {
    title: 'Transactions',
    subtitle: 'Manage and categorize your income and expenses',
    sections: {
      stats: false,
      reporting: true,
      chart: false,
      topCategories: false,
      accounts: false,
      transactions: true,
      rules: false,
    },
  },
  accounts: {
    title: 'Bank Accounts',
    subtitle: 'Manage connected bank feeds and balances',
    sections: {
      stats: false,
      reporting: false,
      chart: false,
      topCategories: false,
      accounts: true,
      transactions: false,
      rules: false,
    },
  },
  categories: {
    title: 'Categories',
    subtitle: 'Manage categories and auto-categorization rules',
    sections: {
      stats: false,
      reporting: false,
      chart: false,
      topCategories: true,
      accounts: false,
      transactions: false,
      rules: true,
    },
  },
};

const parseAmount = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const normalizeCategoryName = (value) => {
  if (!value) {
    return '';
  }
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => (
      word ? `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}` : ''
    ))
    .join(' ');
};

const formatDateInput = (value) => {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toISOString().split('T')[0];
};

const formatDateKeyLabel = (value) => {
  if (!value) {
    return '';
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const toDateKey = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null;
  }
  return value.toISOString().split('T')[0];
};

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const buildYearRange = (year) => ({
  start: new Date(year, 0, 1),
  end: new Date(year, 11, 31),
});

export function BankAccountsPage({ view = 'dashboard' }) {
  const [connections, setConnections] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncLimit, setSyncLimit] = useState(null);
  const [reportingYear, setReportingYear] = useState(DEFAULT_REPORTING_YEAR);
  const [periodView, setPeriodView] = useState('month');
  const [tableRange, setTableRange] = useState('year');
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [accountName, setAccountName] = useState('');
  const [simplefinAccounts, setSimplefinAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [pendingClaimToken, setPendingClaimToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [editingConnection, setEditingConnection] = useState(null);
  const [savingConnection, setSavingConnection] = useState(false);
  const [categorizeTransaction, setCategorizeTransaction] = useState(null);
  const [categorizeCategory, setCategorizeCategory] = useState('');
  const [categorizeMode, setCategorizeMode] = useState('existing');
  const [categorizeNewCategory, setCategorizeNewCategory] = useState('');
  const [categorizeDropdownOpen, setCategorizeDropdownOpen] = useState(false);
  const [categorizeSubmitting, setCategorizeSubmitting] = useState(false);
  const [categorizeError, setCategorizeError] = useState('');
  const [editForm, setEditForm] = useState({
    accountName: '',
    accountType: 'credit',
    openingBalance: '',
    openingBalanceDate: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transactionsError, setTransactionsError] = useState('');
  const [rulesError, setRulesError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState([]);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newRule, setNewRule] = useState({
    keyword: '',
    category: '',
    matchField: 'description',
    transactionType: 'expense',
  });
  const categorizeDropdownRef = useRef(null);
  const selectAllRef = useRef(null);

  const viewConfig = VIEW_CONFIG[view] || VIEW_CONFIG.dashboard;
  const { title, subtitle, sections } = viewConfig;

  const resetConnectForm = () => {
    setSetupToken('');
    setAccountName('');
    setSimplefinAccounts([]);
    setSelectedAccountId('');
    setPendingClaimToken('');
    setError('');
  };

  const loadBankingData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      setError('');
      setSuccess('');
      setTransactionsError('');
      setRulesError('');
      const yearRange = buildYearRange(reportingYear);
      const rangeStart = yearRange.start.toISOString().split('T')[0];
      const rangeEnd = yearRange.end.toISOString().split('T')[0];
      const [connectionsRes, transactionsRes, rulesRes] = await Promise.allSettled([
        api.get('/business-expenses/connections'),
        api.get('/business-expenses', {
          params: {
            start: rangeStart,
            end: rangeEnd,
            limit: DEFAULT_LIMIT,
          },
        }),
        api.get('/business-expenses/rules'),
      ]);

      if (connectionsRes.status === 'fulfilled') {
        const payload = connectionsRes.value.data || {};
        setConnections(payload.connections || []);
        setSyncLimit(payload.syncLimit || null);
      } else {
        console.error('Failed to load connections:', connectionsRes.reason);
        setConnections([]);
        setSyncLimit(null);
        setError('Failed to load connected accounts.');
      }

      if (transactionsRes.status === 'fulfilled') {
        const data = transactionsRes.value.data || {};
        const transactionData = data.transactions || data.expenses || [];
        setTransactions(transactionData);
      } else {
        console.error('Failed to load transactions:', transactionsRes.reason);
        setTransactions([]);
        setTransactionsError('Transaction feed unavailable.');
      }

      if (rulesRes.status === 'fulfilled') {
        setRules(rulesRes.value.data.rules || []);
      } else {
        console.error('Failed to load rules:', rulesRes.reason);
        setRules([]);
        setRulesError('Failed to load rules.');
      }
    } catch (error) {
      console.error('Failed to load banking data:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [reportingYear]);

  useEffect(() => {
    loadBankingData();
  }, [loadBankingData]);

  useEffect(() => {
    setSelectedAccountIds((prev) => prev.filter(
      (id) => connections.some((connection) => connection.id === id)
    ));
  }, [connections]);

  useEffect(() => {
    if (!categorizeDropdownOpen) {
      return;
    }

    const handleClick = (event) => {
      if (!categorizeDropdownRef.current) {
        return;
      }
      if (!categorizeDropdownRef.current.contains(event.target)) {
        setCategorizeDropdownOpen(false);
      }
    };

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setCategorizeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [categorizeDropdownOpen]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const cardStyles = [
    { backgroundColor: 'var(--card-1)', color: 'var(--card-text-1)' },
    { backgroundColor: 'var(--card-2)', color: 'var(--card-text-2)' },
    { backgroundColor: 'var(--card-3)', color: 'var(--card-text-3)' },
    { backgroundColor: 'var(--card-4)', color: 'var(--card-text-4)' },
  ];
  const categoryIndexMap = {
    supplies: 0,
    utilities: 1,
    payroll: 2,
    rent: 3,
  };
  const hashString = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  };
  const getCategoryStyle = (category) => {
    const normalized = (category || '').toLowerCase().trim();
    if (!normalized) {
      return cardStyles[0];
    }
    const mappedIndex = categoryIndexMap[normalized];
    const index = Number.isInteger(mappedIndex)
      ? mappedIndex
      : hashString(normalized) % cardStyles.length;
    return cardStyles[index];
  };

  const scopedTransactions = useMemo(() => {
    if (!selectedAccountIds.length) {
      return transactions;
    }
    return transactions.filter((txn) => selectedAccountIds.includes(txn.connection_id));
  }, [transactions, selectedAccountIds]);

  const availableCategories = useMemo(() => {
    const categorySet = new Set();
    rules.forEach((rule) => {
      if (rule.category) {
        categorySet.add(normalizeCategoryName(rule.category));
      }
    });
    transactions.forEach((txn) => {
      if (txn.category) {
        categorySet.add(normalizeCategoryName(txn.category));
      }
    });
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
  }, [rules, transactions]);

  const reportingRange = useMemo(() => {
    const range = buildYearRange(reportingYear);
    return {
      ...range,
      startKey: range.start.toISOString().split('T')[0],
      endKey: range.end.toISOString().split('T')[0],
    };
  }, [reportingYear]);

  const reportingTransactions = useMemo(() => (
    scopedTransactions.filter((txn) => {
      const dateKey = txn.transaction_date;
      if (!dateKey) {
        return false;
      }
      if (reportingRange.startKey && dateKey < reportingRange.startKey) {
        return false;
      }
      if (reportingRange.endKey && dateKey > reportingRange.endKey) {
        return false;
      }
      return true;
    })
  ), [scopedTransactions, reportingRange]);

  const stats = useMemo(() => {
    const totals = reportingTransactions.reduce(
      (acc, txn) => {
        const amount = parseAmount(txn.amount);
        if (txn.direction === 'income') {
          acc.totalIncome += amount;
        } else if (txn.direction === 'expense') {
          acc.totalExpenses += amount;
        }
        acc.transactionCount += 1;
        if (!txn.category) {
          acc.uncategorizedCount += 1;
        }
        return acc;
      },
      {
        totalExpenses: 0,
        totalIncome: 0,
        transactionCount: 0,
        uncategorizedCount: 0,
      }
    );

    return {
      ...totals,
      net: totals.totalIncome - totals.totalExpenses,
    };
  }, [reportingTransactions]);

  const rangeFilteredTransactions = useMemo(() => {
    if (tableRange === 'year') {
      return reportingTransactions;
    }
    if (tableRange === 'custom') {
      if (!customStartDate) {
        return reportingTransactions;
      }
      return scopedTransactions.filter((txn) => {
        if (!txn.transaction_date) {
          return false;
        }
        return txn.transaction_date >= customStartDate;
      });
    }
    const days = Number.parseInt(tableRange, 10);
    if (!Number.isFinite(days)) {
      return reportingTransactions;
    }
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return scopedTransactions.filter((txn) => {
      if (!txn.transaction_date) {
        return false;
      }
      const date = new Date(txn.transaction_date);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      return date >= startDate;
    });
  }, [reportingTransactions, scopedTransactions, tableRange, customStartDate]);

  const filteredTransactions = useMemo(() => {
    let data = [...rangeFilteredTransactions];

    if (filterType !== 'all') {
      data = data.filter((txn) => (txn.direction || 'expense') === filterType);
    }

    if (showUncategorizedOnly) {
      data = data.filter((txn) => !txn.category);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      data = data.filter((txn) => (
        (txn.description || '').toLowerCase().includes(term)
        || (txn.vendor || '').toLowerCase().includes(term)
        || (txn.category || '').toLowerCase().includes(term)
        || (txn.account_name || '').toLowerCase().includes(term)
      ));
    }

    return data;
  }, [rangeFilteredTransactions, filterType, showUncategorizedOnly, searchTerm]);

  const visibleTransactionIds = useMemo(
    () => filteredTransactions.map((txn) => txn.id),
    [filteredTransactions]
  );
  const selectedIdSet = useMemo(
    () => new Set(selectedTransactionIds),
    [selectedTransactionIds]
  );
  const allVisibleSelected = visibleTransactionIds.length > 0
    && visibleTransactionIds.every((id) => selectedIdSet.has(id));
  const someVisibleSelected = visibleTransactionIds.some((id) => selectedIdSet.has(id));

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }
    selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected]);

  useEffect(() => {
    setSelectedTransactionIds((prev) => prev.filter((id) => visibleTransactionIds.includes(id)));
  }, [visibleTransactionIds]);

  const toggleTransactionSelection = (transactionId) => {
    setSelectedTransactionIds((prev) => (
      prev.includes(transactionId)
        ? prev.filter((id) => id !== transactionId)
        : [...prev, transactionId]
    ));
  };

  const toggleSelectAllVisible = () => {
    setSelectedTransactionIds((prev) => {
      const next = new Set(prev);
      const shouldClear = visibleTransactionIds.length > 0
        && visibleTransactionIds.every((id) => next.has(id));
      if (shouldClear) {
        visibleTransactionIds.forEach((id) => next.delete(id));
      } else {
        visibleTransactionIds.forEach((id) => next.add(id));
      }
      return Array.from(next);
    });
  };

  const handleQuickYearSelect = (year) => {
    setReportingYear(year);
    setTableRange('year');
    setCustomStartDate(null);
  };

  const selectedTotals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, txn) => {
        if (!selectedIdSet.has(txn.id)) {
          return acc;
        }
        const amount = parseAmount(txn.amount);
        if (txn.direction === 'income') {
          acc.income += amount;
          acc.net += amount;
        } else if (txn.direction === 'expense') {
          acc.expenses += amount;
          acc.net -= amount;
        }
        return acc;
      },
      { income: 0, expenses: 0, net: 0 }
    );
  }, [filteredTransactions, selectedIdSet]);

  const selectedTotalLabel = useMemo(() => {
    if (!selectedTotals.net) {
      return formatCurrency(0);
    }
    const absValue = Math.abs(selectedTotals.net);
    const sign = selectedTotals.net < 0 ? '-' : '+';
    return `${sign}${formatCurrency(absValue)}`;
  }, [selectedTotals.net]);

  const rangeLabel = useMemo(() => {
    if (tableRange === 'custom' && customStartDate) {
      return `From ${formatDateKeyLabel(customStartDate)} to today`;
    }
    if (tableRange === 'year') {
      return `Reporting year ${reportingYear}`;
    }
    const days = Number.parseInt(tableRange, 10);
    if (Number.isFinite(days)) {
      return `Last ${days} days`;
    }
    return `Reporting year ${reportingYear}`;
  }, [tableRange, customStartDate, reportingYear]);

  const datePickerInitialDate = useMemo(() => {
    if (customStartDate) {
      const parsed = new Date(`${customStartDate}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date(reportingYear, 0, 1);
  }, [customStartDate, reportingYear]);

  useEffect(() => {
    if (!customStartDate) {
      return;
    }
    const yearStart = `${reportingYear}-01-01`;
    const yearEnd = `${reportingYear}-12-31`;
    if (customStartDate < yearStart || customStartDate > yearEnd) {
      setCustomStartDate(null);
      if (tableRange === 'custom') {
        setTableRange('year');
      }
    }
  }, [customStartDate, reportingYear, tableRange]);

  const monthlySummary = useMemo(() => {
    const buckets = periodView === 'term'
      ? TERM_BUCKETS.map((term) => ({
        key: term.key,
        label: term.label,
        income: 0,
        expenses: 0,
        months: term.months,
      }))
      : Array.from({ length: 12 }, (_, index) => ({
        key: `${reportingYear}-${index}`,
        label: new Date(reportingYear, index, 1).toLocaleDateString('en-US', { month: 'short' }),
        income: 0,
        expenses: 0,
        months: [index],
      }));

    reportingTransactions.forEach((txn) => {
      if (!txn.transaction_date) {
        return;
      }
      const date = new Date(txn.transaction_date);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const month = date.getMonth();
      const bucket = buckets.find((entry) => entry.months.includes(month));
      if (!bucket) {
        return;
      }
      const amount = parseAmount(txn.amount);
      if (txn.direction === 'income') {
        bucket.income += amount;
      } else if (txn.direction === 'expense') {
        bucket.expenses += amount;
      }
    });

    const maxValue = Math.max(
      1,
      ...buckets.flatMap((bucket) => [bucket.income, bucket.expenses])
    );

    return { buckets, maxValue };
  }, [periodView, reportingTransactions, reportingYear]);

  const topCategories = useMemo(() => {
    const totals = {};
    reportingTransactions.forEach((txn) => {
      if (txn.direction !== 'expense') {
        return;
      }
      const category = txn.category || 'Uncategorized';
      totals[category] = (totals[category] || 0) + parseAmount(txn.amount);
    });

    const entries = Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const total = entries.reduce((sum, entry) => sum + entry.amount, 0) || 1;

    return { entries, total };
  }, [reportingTransactions]);

  const availableYears = useMemo(() => {
    const yearSet = new Set([DEFAULT_REPORTING_YEAR, reportingYear]);
    for (let offset = 1; offset <= 3; offset += 1) {
      yearSet.add(DEFAULT_REPORTING_YEAR - offset);
    }
    transactions.forEach((txn) => {
      if (!txn.transaction_date) {
        return;
      }
      const date = new Date(txn.transaction_date);
      if (!Number.isNaN(date.getTime())) {
        yearSet.add(date.getFullYear());
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [transactions, reportingYear]);

  const balanceByConnection = useMemo(() => {
    const balances = new Map();

    connections.forEach((connection) => {
      if (connection.opening_balance === null || connection.opening_balance === undefined) {
        return;
      }

      const openingBalance = parseAmount(connection.opening_balance);
      const openingDate = parseDateValue(connection.opening_balance_date);
      let delta = 0;

      transactions.forEach((txn) => {
        if (txn.connection_id !== connection.id) {
          return;
        }

        if (!txn.transaction_date) {
          return;
        }

        const txnDate = parseDateValue(txn.transaction_date);
        if (!txnDate) {
          return;
        }

        if (openingDate && txnDate < openingDate) {
          return;
        }

        const amount = parseAmount(txn.amount);
        if (!amount) {
          return;
        }

        if (connection.account_type === 'credit') {
          if (txn.direction === 'income') {
            delta -= amount;
          } else if (txn.direction === 'expense') {
            delta += amount;
          }
          return;
        }

        if (txn.direction === 'income') {
          delta += amount;
        } else if (txn.direction === 'expense') {
          delta -= amount;
        }
      });

      balances.set(connection.id, openingBalance + delta);
    });

    return balances;
  }, [connections, transactions]);

  const showChart = sections.chart;
  const showTopCategories = sections.topCategories;
  const showSummaryGrid = showChart || showTopCategories;
  const summaryGridClass = showChart && showTopCategories ? 'lg:grid-cols-3' : '';
  const chartSpanClass = showChart && showTopCategories ? 'lg:col-span-2' : '';
  const syncLimitReached = syncLimit && syncLimit.remaining <= 0;
  const syncLimitText = syncLimit
    ? `Daily sync limit: ${syncLimit.remaining} of ${syncLimit.limit} remaining today.`
    : '';

  const toggleAccountFilter = (connectionId) => {
    setSelectedAccountIds((prev) => {
      if (!prev.length) {
        return [connectionId];
      }
      if (prev.includes(connectionId)) {
        const next = prev.filter((id) => id !== connectionId);
        return next;
      }
      return [...prev, connectionId];
    });
  };

  const openEditModal = (connection) => {
    setEditingConnection(connection);
    setEditForm({
      accountName: connection.account_name || '',
      accountType: connection.account_type || 'credit',
      openingBalance: connection.opening_balance !== null && connection.opening_balance !== undefined
        ? String(connection.opening_balance)
        : '',
      openingBalanceDate: formatDateInput(connection.opening_balance_date),
    });
  };

  const closeEditModal = () => {
    setEditingConnection(null);
    setEditForm({
      accountName: '',
      accountType: 'credit',
      openingBalance: '',
      openingBalanceDate: '',
    });
  };

  const openCategorizeModal = (transaction) => {
    const normalized = normalizeCategoryName(transaction?.category || '');
    setCategorizeTransaction(transaction);
    setCategorizeCategory(normalized);
    if (normalized) {
      setCategorizeMode('existing');
      setCategorizeNewCategory('');
    } else {
      setCategorizeMode('new');
      setCategorizeNewCategory('');
    }
    setCategorizeDropdownOpen(false);
    setCategorizeError('');
  };

  const closeCategorizeModal = () => {
    setCategorizeTransaction(null);
    setCategorizeCategory('');
    setCategorizeMode('existing');
    setCategorizeNewCategory('');
    setCategorizeDropdownOpen(false);
    setCategorizeError('');
  };

  const handleConnectAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setConnecting(true);

    try {
      if (pendingClaimToken && !selectedAccountId) {
        setError('Please choose an account to connect.');
        return;
      }

      const payload = pendingClaimToken
        ? {
          claimToken: pendingClaimToken,
          accountName,
          simplefinAccountId: selectedAccountId,
        }
        : {
          setupToken,
          accountName,
        };

      const response = await api.post('/business-expenses/simplefin/claim', payload);

      if (response.data?.requiresAccountSelection) {
        const accounts = response.data.accounts || [];
        setSimplefinAccounts(accounts);
        setPendingClaimToken(response.data.claimToken || '');
        if (accounts.length === 1) {
          setSelectedAccountId(accounts[0].id);
        }
        return;
      }

      setSuccess('Bank account connected successfully.');
      resetConnectForm();
      setShowConnectModal(false);
      loadBankingData(false);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to connect account.';
      setError(message);
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async (connectionId) => {
    setError('');
    setSuccess('');
    setSyncingId(connectionId);

    try {
      const res = await api.post(`/business-expenses/sync/${connectionId}`);
      const limitInfo = res.data?.syncLimit || null;
      if (limitInfo) {
        setSyncLimit(limitInfo);
      }
      const imported = Number(res.data?.imported || 0);
      const skipped = Number(res.data?.skipped || 0);
      const total = Number.isFinite(res.data?.total) ? res.data.total : imported + skipped;
      const remainingText = limitInfo
        ? ` (${limitInfo.remaining} of ${limitInfo.limit} left today)`
        : '';

      if (total === 0) {
        setSuccess(`Sync complete. No transactions returned.${remainingText}`);
      } else if (imported === 0) {
        setSuccess(`Sync complete. No new transactions (${skipped} already synced).${remainingText}`);
      } else {
        setSuccess(`Sync complete. Imported ${imported} transaction(s), skipped ${skipped}.${remainingText}`);
      }
      loadBankingData(false);
    } catch (err) {
      const limitInfo = err.response?.data?.syncLimit || null;
      if (limitInfo) {
        setSyncLimit(limitInfo);
      }
      const message = err.response?.data?.error || 'Sync failed.';
      const remainingText = limitInfo
        ? ` (${limitInfo.remaining} of ${limitInfo.limit} left today)`
        : '';
      setError(`${message}${remainingText}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (connectionId) => {
    if (!window.confirm('Disconnect this bank account? Historical data will remain.')) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await api.delete(`/business-expenses/connections/${connectionId}`);
      setSuccess('Account disconnected.');
      loadBankingData(false);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to disconnect account.';
      setError(message);
    }
  };

  const handleSaveConnection = async (event) => {
    event.preventDefault();
    if (!editingConnection) {
      return;
    }
    setSavingConnection(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        accountName: editForm.accountName.trim(),
        accountType: editForm.accountType,
        openingBalance: editForm.openingBalance === '' ? null : editForm.openingBalance,
        openingBalanceDate: editForm.openingBalanceDate || null,
      };

      await api.patch(`/business-expenses/connections/${editingConnection.id}`, payload);
      setSuccess('Account settings updated.');
      closeEditModal();
      loadBankingData(false);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update account.';
      setError(message);
    } finally {
      setSavingConnection(false);
    }
  };

  const handleCreateRule = async (event) => {
    event.preventDefault();
    setRulesError('');
    setSuccess('');

    try {
      const normalizedCategory = normalizeCategoryName(newRule.category);
      if (!normalizedCategory) {
        setRulesError('Category is required.');
        return;
      }
      const payload = {
        keyword: newRule.keyword.trim(),
        category: normalizedCategory,
        matchField: newRule.matchField,
        transactionType: newRule.transactionType,
      };

      await api.post('/business-expenses/rules', payload);
      setSuccess('Rule saved. Transactions will update with the new category.');
      setNewRule({
        keyword: '',
        category: '',
        matchField: 'description',
        transactionType: 'expense',
      });
      loadBankingData(false);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to create rule.';
      setRulesError(message);
    }
  };

  const handleCategorizeSave = async (event) => {
    event.preventDefault();
    if (!categorizeTransaction) {
      return;
    }

    const rawCategory = categorizeMode === 'new'
      ? categorizeNewCategory
      : categorizeCategory;
    const category = normalizeCategoryName(rawCategory);
    if (!category) {
      setCategorizeError('Please choose or enter a category.');
      return;
    }

    const description = (categorizeTransaction.description || '').trim();
    const vendor = (categorizeTransaction.vendor || '').trim();
    let keyword = description;
    let matchField = 'description';

    if (!keyword) {
      keyword = vendor;
      matchField = 'vendor';
    }

    if (!keyword) {
      setCategorizeError('This transaction does not have a description or vendor to match on.');
      return;
    }

    const transactionType = categorizeTransaction.direction === 'income' ? 'income' : 'expense';

    setCategorizeSubmitting(true);
    setCategorizeError('');

    try {
      await api.post('/business-expenses/rules', {
        keyword,
        category,
        matchField,
        transactionType,
      });
      setSuccess(`Category saved. "${keyword}" will map to ${category}.`);
      closeCategorizeModal();
      loadBankingData(false);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to save category.';
      setCategorizeError(message);
    } finally {
      setCategorizeSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Delete this rule? Existing categories will not be removed.')) {
      return;
    }

    setRulesError('');
    setSuccess('');
    try {
      await api.delete(`/business-expenses/rules/${ruleId}`);
      setSuccess('Rule removed.');
      loadBankingData(false);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete rule.';
      setRulesError(message);
    }
  };

  if (loading) {
    return (
      <Layout title={title} subtitle={subtitle}>
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={title} subtitle={subtitle}>
      <div className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm">
            {success}
          </div>
        )}

        {/* Stats Overview */}
        {sections.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="themed-surface p-6 rounded-3xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: cardStyles[3].backgroundColor }}
                >
                  <TrendingDown size={20} style={{ color: cardStyles[3].color }} />
                </div>
                <div>
                  <p className="text-stone-500 text-sm">Total Expenses</p>
                  <p className="font-bold text-2xl text-stone-800">
                    {formatCurrency(stats.totalExpenses)}
                  </p>
                  <p className="text-xs text-stone-400">Reporting year {reportingYear}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="themed-surface p-6 rounded-3xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: cardStyles[1].backgroundColor }}
                >
                  <TrendingUp size={20} style={{ color: cardStyles[1].color }} />
                </div>
                <div>
                  <p className="text-stone-500 text-sm">Total Income</p>
                  <p className="font-bold text-2xl text-stone-800">
                    {formatCurrency(stats.totalIncome)}
                  </p>
                  <p className="text-xs text-stone-400">Reporting year {reportingYear}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="themed-surface p-6 rounded-3xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: cardStyles[2].backgroundColor }}
                >
                  <Wallet size={20} style={{ color: cardStyles[2].color }} />
                </div>
                <div>
                  <p className="text-stone-500 text-sm">Net Cash Flow</p>
                  <p className="font-bold text-2xl text-stone-800">
                    {formatCurrency(stats.net)}
                  </p>
                  <p className="text-xs text-stone-400">Income minus expenses</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="themed-surface p-6 rounded-3xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: cardStyles[0].backgroundColor }}
                >
                  <Tag size={20} style={{ color: cardStyles[0].color }} />
                </div>
                <div>
                  <p className="text-stone-500 text-sm">Uncategorized</p>
                  <p className="font-bold text-2xl text-stone-800">
                    {stats.uncategorizedCount}
                  </p>
                  <p className="text-xs text-stone-400">
                    {stats.transactionCount} total transactions
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {sections.reporting && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="themed-surface p-6 rounded-3xl"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Calendar size={16} />
                  Reporting settings
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-2">
                    Reporting year
                  </label>
                  <select
                    value={reportingYear}
                    onChange={(event) => setReportingYear(Number(event.target.value))}
                    className="w-full px-4 py-2 rounded-2xl border themed-border bg-white text-sm focus:outline-none focus:ring-2"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-2">
                    Grouping
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PERIOD_VIEWS.map((viewOption) => (
                      <button
                        key={viewOption.value}
                        onClick={() => setPeriodView(viewOption.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          periodView === viewOption.value
                            ? 'bg-stone-800 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {viewOption.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-stone-400">
                  Term view uses winter, spring, summer, and fall groupings.
                </div>
              </div>

              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Building2 size={16} />
                  Account focus
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedAccountIds([])}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      selectedAccountIds.length === 0
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    All accounts
                  </button>
                  {connections.map((connection) => (
                    <button
                      key={connection.id}
                      onClick={() => toggleAccountFilter(connection.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        selectedAccountIds.includes(connection.id)
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {connection.account_name}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-stone-400">
                  Use All accounts to see totals across your cards.
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {showSummaryGrid && (
          <div className={`grid grid-cols-1 ${summaryGridClass} gap-6`}>
            {showChart && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`themed-surface p-6 rounded-3xl ${chartSpanClass}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={20} className="text-stone-400" />
                    <h3 className="font-quicksand font-bold text-lg text-stone-800">
                      Cash Flow Snapshot
                    </h3>
                  </div>
                  <span className="text-xs text-stone-400">Reporting year {reportingYear}</span>
                </div>
                <div
                  className="grid gap-3 items-end"
                  style={{
                    height: CHART_HEIGHT,
                    gridTemplateColumns: `repeat(${monthlySummary.buckets.length}, minmax(0, 1fr))`,
                  }}
                >
                  {monthlySummary.buckets.map((bucket) => (
                    <div key={bucket.key} className="flex flex-col items-center gap-2">
                      <div className="flex items-end gap-1 h-full">
                        <div
                          className="w-3 rounded-full"
                          style={{
                            height: `${(bucket.expenses / monthlySummary.maxValue) * CHART_HEIGHT}px`,
                            backgroundColor: 'var(--primary)',
                          }}
                          title={`Expenses: ${formatCurrency(bucket.expenses)}`}
                        />
                        <div
                          className="w-3 rounded-full"
                          style={{
                            height: `${(bucket.income / monthlySummary.maxValue) * CHART_HEIGHT}px`,
                            backgroundColor: 'var(--accent)',
                          }}
                          title={`Income: ${formatCurrency(bucket.income)}`}
                        />
                      </div>
                      <span className="text-xs text-stone-500">{bucket.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-6 text-xs text-stone-500">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
                    Expenses
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                    Income
                  </span>
                </div>
              </motion.div>
            )}

            {showTopCategories && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="themed-surface p-6 rounded-3xl"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Tag size={20} className="text-stone-400" />
                  <h3 className="font-quicksand font-bold text-lg text-stone-800">
                    Top Categories
                  </h3>
                </div>
                {topCategories.entries.length === 0 ? (
                  <p className="text-sm text-stone-500">No expense categories yet.</p>
                ) : (
                  <div className="space-y-4">
                    {topCategories.entries.map((entry) => {
                      const share = (entry.amount / topCategories.total) * 100;
                      return (
                        <div key={entry.category} className="space-y-2">
                          <div className="flex justify-between text-sm text-stone-700">
                            <span className="font-medium">{entry.category}</span>
                            <span>{formatCurrency(entry.amount)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-stone-100">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, share)}%`,
                                backgroundColor: 'var(--primary)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Connected Accounts */}
        {sections.accounts && (
          <motion.section
            id="bank-accounts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-quicksand font-bold text-xl text-stone-800">
                Connected Accounts
              </h3>
              <button
                onClick={() => setShowConnectModal(true)}
                className="px-4 py-2 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                Connect Account
              </button>
            </div>

            {syncLimit && (
              <div className="mb-4 p-3 bg-sky-50 border border-sky-200 rounded-2xl text-sky-700 text-sm">
                {syncLimitText}
              </div>
            )}

            {connections.length === 0 ? (
              <div className="themed-surface rounded-3xl p-12 text-center">
                <Building2 size={48} className="mx-auto mb-4 text-stone-300" />
                <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-2">
                  No Connected Accounts
                </h3>
                <p className="text-stone-500">
                  Connect your bank account to automatically track business expenses
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="themed-surface p-6 rounded-3xl"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: cardStyles[0].backgroundColor }}
                        >
                          <Building2 size={20} style={{ color: cardStyles[0].color }} />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-800">
                            {connection.account_name}
                          </h4>
                          <p className="text-stone-500 text-xs">
                            {connection.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          connection.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {connection.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Last synced:</span>
                      <span className="font-medium text-stone-700">
                        {formatDateTime(connection.last_sync_at)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-stone-500">Account type:</span>
                      <span className="font-medium text-stone-700">
                        {connection.account_type === 'debit' ? 'Debit' : 'Credit'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-stone-500">Current balance:</span>
                      <span className="font-medium text-stone-700">
                        {connection.opening_balance !== null && connection.opening_balance !== undefined
                          ? formatCurrency(balanceByConnection.get(connection.id))
                          : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-stone-500">Balance as of:</span>
                      <span className="font-medium text-stone-700">
                        {connection.opening_balance_date
                          ? formatDate(connection.opening_balance_date)
                          : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-stone-500">Opening balance:</span>
                      <span className="font-medium text-stone-700">
                        {connection.opening_balance !== null && connection.opening_balance !== undefined
                          ? formatCurrency(connection.opening_balance)
                          : 'Not set'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-2">
                      {connection.account_type === 'debit'
                        ? 'Debit balances reflect cash on hand.'
                        : 'Credit balances reflect amount owed.'}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      Current balance is estimated from transactions shown in this dashboard.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleSync(connection.id)}
                        disabled={syncingId === connection.id || !connection.is_active || syncLimitReached}
                        className="flex-1 px-3 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
                        style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                      >
                        {syncingId === connection.id ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        onClick={() => openEditModal(connection)}
                        className="px-3 py-2 rounded-xl border themed-border text-stone-600 text-sm font-bold hover:bg-stone-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDisconnect(connection.id)}
                        className="flex-1 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* Transactions */}
        {sections.transactions && (
          <motion.section
            id="transactions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex flex-col gap-4 mb-4">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by description, vendor, category, or account"
                  className="w-full pl-10 pr-4 py-2 rounded-2xl border themed-border bg-white text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-2 text-xs text-stone-500">
                    <Filter size={14} />
                    Filters
                  </span>
                  <select
                    value={tableRange}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTableRange(value);
                      if (value === 'custom') {
                        setShowDatePicker(true);
                      }
                    }}
                    className="px-3 py-1 rounded-full text-xs font-semibold border themed-border bg-white text-stone-600"
                  >
                    {RANGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setTableRange('custom');
                      setShowDatePicker(true);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 ${
                      tableRange === 'custom'
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <Calendar size={12} />
                    From date
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                      Year
                    </span>
                    {availableYears.map((year) => (
                      <button
                        key={year}
                        onClick={() => handleQuickYearSelect(year)}
                        className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                          reportingYear === year && tableRange === 'year'
                            ? 'bg-stone-800 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                  {FILTER_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFilterType(type.value)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        filterType === type.value
                          ? 'bg-stone-800 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowUncategorizedOnly((prev) => !prev)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      showUncategorizedOnly
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Uncategorized only
                  </button>
                  <span className="text-xs text-stone-500">
                    Range: {rangeLabel}
                  </span>
                  {tableRange === 'custom' && customStartDate && (
                    <span className="text-xs text-stone-500">
                      {formatDateKeyLabel(customStartDate)} to today
                    </span>
                  )}
                </div>
                {selectedTransactionIds.length > 0 && (
                  <div className="text-xs text-stone-500">
                    Selected {selectedTransactionIds.length} • Total{' '}
                    <span className={selectedTotals.net < 0 ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                      {selectedTotalLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {transactionsError && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm">
                {transactionsError}
              </div>
            )}

            {filteredTransactions.length === 0 ? (
              <div className="themed-surface rounded-3xl p-12 text-center">
                <DollarSign size={48} className="mx-auto mb-4 text-stone-300" />
                <p className="text-stone-500">No transactions match your filters yet</p>
              </div>
            ) : (
              <div className="themed-surface rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: 'var(--background)' }}>
                      <tr>
                        <th className="px-4 py-4 text-left text-sm font-bold text-stone-700 w-10">
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAllVisible}
                            aria-label="Select all transactions"
                          />
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                          Description
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                          Category
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-stone-700">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y themed-border">
                      {filteredTransactions.map((txn) => (
                        <tr key={txn.id} className="themed-row transition-colors">
                          <td className="px-4 py-4 text-sm text-stone-600">
                            <input
                              type="checkbox"
                              checked={selectedIdSet.has(txn.id)}
                              onChange={() => toggleTransactionSelection(txn.id)}
                              aria-label={`Select transaction ${txn.description || txn.id}`}
                            />
                          </td>
                          <td className="px-6 py-4 text-sm text-stone-600">
                            {formatDate(txn.transaction_date)}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-stone-800">
                              {txn.description}
                            </p>
                            {txn.vendor && (
                              <p className="text-xs text-stone-500">{txn.vendor}</p>
                            )}
                            {txn.account_name && (
                              <p className="text-xs text-stone-400">{txn.account_name}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                (txn.direction || 'expense') === 'income'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {(txn.direction || 'expense') === 'income' ? 'Income' : 'Expense'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => openCategorizeModal(txn)}
                              className="group"
                            >
                              <span
                                className="inline-flex items-center justify-center w-36 px-2 py-1 rounded-full text-xs font-bold truncate transition-colors group-hover:opacity-90"
                                style={getCategoryStyle(normalizeCategoryName(txn.category))}
                              >
                                {normalizeCategoryName(txn.category) || 'Uncategorized'}
                              </span>
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`font-bold ${
                                (txn.direction || 'expense') === 'income'
                                  ? 'text-emerald-700'
                                  : 'text-stone-800'
                              }`}
                            >
                              {(txn.direction || 'expense') === 'income' ? '+' : '-'}
                              {formatCurrency(parseAmount(txn.amount))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {/* Rules */}
        {sections.rules && (
          <motion.section
            id="categories"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Tag size={20} className="text-stone-400" />
              <h3 className="font-quicksand font-bold text-xl text-stone-800">
                Auto-Categorization Rules
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 themed-surface p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Calendar size={16} />
                  Set rules once and they will tag transactions in this dashboard.
                </div>
                {rulesError && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm">
                    {rulesError}
                  </div>
                )}
                {rules.length === 0 ? (
                  <div className="text-sm text-stone-500">
                    No rules yet. Add a keyword like "payment" or "uber" to auto-tag expenses.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-2xl border themed-border bg-white"
                      >
                        <div>
                          <p className="font-semibold text-stone-800">{rule.keyword}</p>
                          <p className="text-xs text-stone-500">
                            Category: {rule.category} / {rule.transaction_type} / {rule.match_field}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="themed-surface p-6 rounded-3xl">
                <h4 className="font-quicksand font-bold text-lg text-stone-800 mb-4">
                  Create Rule
                </h4>
                <form onSubmit={handleCreateRule} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-2">
                      Keyword
                    </label>
                    <input
                      type="text"
                      value={newRule.keyword}
                      onChange={(event) => setNewRule((prev) => ({ ...prev, keyword: event.target.value }))}
                      placeholder="payment, uber, walmart"
                      required
                      className="w-full px-4 py-2 rounded-2xl border themed-border bg-white text-sm focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={newRule.category}
                      onChange={(event) => setNewRule((prev) => ({ ...prev, category: event.target.value }))}
                      onBlur={(event) => setNewRule((prev) => ({
                        ...prev,
                        category: normalizeCategoryName(event.target.value),
                      }))}
                      placeholder="Supplies"
                      required
                      className="w-full px-4 py-2 rounded-2xl border themed-border bg-white text-sm focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-2">
                        Match field
                      </label>
                      <select
                        value={newRule.matchField}
                        onChange={(event) => setNewRule((prev) => ({ ...prev, matchField: event.target.value }))}
                        className="w-full px-4 py-2 rounded-2xl border themed-border bg-white text-sm focus:outline-none focus:ring-2"
                      >
                        {RULE_FIELDS.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-2">
                        Applies to
                      </label>
                      <select
                        value={newRule.transactionType}
                        onChange={(event) => setNewRule((prev) => ({ ...prev, transactionType: event.target.value }))}
                        className="w-full px-4 py-2 rounded-2xl border themed-border bg-white text-sm focus:outline-none focus:ring-2"
                      >
                        {RULE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full px-4 py-3 rounded-2xl text-white text-sm font-bold shadow-lg transition-all"
                    style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
                  >
                    Save Rule
                  </button>
                </form>
              </div>
            </div>
          </motion.section>
        )}
      </div>

      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        initialDate={datePickerInitialDate}
        onConfirm={(date) => {
          const dateKey = toDateKey(date);
          if (dateKey) {
            setCustomStartDate(dateKey);
            setTableRange('custom');
          }
          setShowDatePicker(false);
        }}
        onClear={() => {
          setCustomStartDate(null);
          setTableRange('year');
          setShowDatePicker(false);
        }}
        title="Select start date"
        subtitle="Filters transactions from this date to today"
        confirmLabel="Apply date"
        clearLabel="Clear date"
      />

      <BaseModal
        isOpen={showConnectModal}
        onClose={() => {
          resetConnectForm();
          setShowConnectModal(false);
        }}
        title="Connect Bank Account"
      >
        <form onSubmit={handleConnectAccount} className="space-y-5">
          <div className="text-sm text-stone-600 space-y-2">
            <p>
              Get a SimpleFIN connection token at{' '}
              <a
                href="https://bridge.simplefin.org/simplefin/create"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline"
                style={{ color: 'var(--primary-dark)' }}
              >
                SimpleFIN Bridge
              </a>.
            </p>
            <p className="text-xs text-stone-500">
              This token is used once to establish the connection. Credentials are not stored.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Account Name
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Main Business Checking"
              maxLength={255}
              required
              className="w-full px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 bg-white"
            />
          </div>

          {pendingClaimToken ? (
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Choose Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 bg-white"
              >
                <option value="">Select an account</option>
                {simplefinAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName || account.name || account.id}
                  </option>
                ))}
              </select>
              <p className="text-xs text-stone-500 mt-2">
                Pick the specific account you want to sync into Firefly.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Connection Token
              </label>
              <input
                type="text"
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                placeholder="Paste your SimpleFIN token"
                required
                className="w-full px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 bg-white"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                resetConnectForm();
                setShowConnectModal(false);
              }}
              disabled={connecting}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connecting}
              className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg transition-all disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
            >
              {connecting ? 'Connecting...' : pendingClaimToken ? 'Confirm Account' : 'Connect Account'}
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={!!editingConnection}
        onClose={closeEditModal}
        title="Account Settings"
      >
        <form onSubmit={handleSaveConnection} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Account name
            </label>
            <input
              type="text"
              value={editForm.accountName}
              onChange={(event) => setEditForm((prev) => ({ ...prev, accountName: event.target.value }))}
              maxLength={255}
              required
              className="w-full px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Account type
            </label>
            <select
              value={editForm.accountType}
              onChange={(event) => setEditForm((prev) => ({ ...prev, accountType: event.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 bg-white"
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-500 mt-2">
              Credit balances are amounts owed. Debit balances are cash on hand.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Balance as of date
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                value={editForm.openingBalance}
                onChange={(event) => setEditForm((prev) => ({ ...prev, openingBalance: event.target.value }))}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 bg-white"
              />
              <input
                type="date"
                value={editForm.openingBalanceDate}
                onChange={(event) => setEditForm((prev) => ({ ...prev, openingBalanceDate: event.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 bg-white"
              />
            </div>
            <p className="text-xs text-stone-500 mt-2">
              Set this to your statement balance (credit) or bank balance (debit).
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeEditModal}
              disabled={savingConnection}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingConnection}
              className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg transition-all disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
            >
              {savingConnection ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={!!categorizeTransaction}
        onClose={closeCategorizeModal}
        title="Categorize Transaction"
      >
        <form onSubmit={handleCategorizeSave} className="space-y-5">
          {categorizeTransaction && (
            <div className="rounded-2xl border themed-border bg-white p-4 text-sm">
              <div className="font-semibold text-stone-800">
                {categorizeTransaction.description || 'Transaction'}
              </div>
              {categorizeTransaction.vendor && (
                <div className="text-xs text-stone-500">{categorizeTransaction.vendor}</div>
              )}
              <div className="mt-2 text-xs text-stone-500">
                Rule will match on {categorizeTransaction.description ? 'description' : 'vendor'}:
                <span className="ml-1 font-semibold text-stone-700">
                  {categorizeTransaction.description || categorizeTransaction.vendor || 'Unknown'}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Category
            </label>
            <div className="space-y-3">
              <div ref={categorizeDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setCategorizeDropdownOpen((prev) => !prev)}
                  className="w-full px-4 py-3 rounded-2xl border themed-border text-sm font-semibold flex items-center justify-between themed-ring"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                  aria-expanded={categorizeDropdownOpen}
                >
                  <span style={{ color: categorizeMode === 'new' ? 'var(--muted)' : 'var(--text)' }}>
                    {categorizeMode === 'new'
                      ? 'Create a new category...'
                      : (categorizeCategory || 'Choose a category')}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${categorizeDropdownOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--muted)' }}
                  />
                </button>

                {categorizeDropdownOpen && (
                  <div
                    className="absolute z-20 mt-2 w-full rounded-2xl border themed-border"
                    style={{ backgroundColor: 'var(--surface)', boxShadow: 'var(--panel-shadow-soft)' }}
                  >
                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-2 space-y-1">
                      {availableCategories.length === 0 && (
                        <div className="text-xs px-2 py-2" style={{ color: 'var(--muted)' }}>
                          No categories yet.
                        </div>
                      )}
                      {availableCategories.map((category) => {
                        const isSelected = categorizeMode === 'existing' && category === categorizeCategory;
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setCategorizeMode('existing');
                              setCategorizeCategory(category);
                              setCategorizeDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors themed-hover"
                            style={{
                              color: isSelected ? 'var(--on-accent)' : 'var(--text)',
                              backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                            }}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t themed-border p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCategorizeMode('new');
                          setCategorizeCategory('');
                          setCategorizeDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold themed-hover"
                        style={{ color: 'var(--text)' }}
                      >
                        Create a new category...
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {categorizeMode === 'new' && (
                <input
                  type="text"
                  value={categorizeNewCategory}
                  onChange={(event) => setCategorizeNewCategory(event.target.value)}
                  onBlur={(event) => setCategorizeNewCategory(normalizeCategoryName(event.target.value))}
                  placeholder="Type a new category"
                  className="w-full px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 themed-ring"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                  maxLength={120}
                  required
                />
              )}
              <div className="text-xs text-stone-500">
                Category names are saved with capitalization (e.g., Food, Office Supplies).
              </div>
            </div>
          </div>

          {categorizeError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm">
              {categorizeError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeCategorizeModal}
              disabled={categorizeSubmitting}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={categorizeSubmitting}
              className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg transition-all disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
            >
              {categorizeSubmitting ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </BaseModal>
    </Layout>
  );
}

