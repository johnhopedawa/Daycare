const safeNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundCurrency = (value) => (
  Math.round(((safeNumber(value, 0) || 0) + Number.EPSILON) * 100) / 100
);

const PAY_PERIODS_BY_FREQUENCY = {
  BI_WEEKLY: 26,
  MONTHLY: 12,
  SEMI_MONTHLY: 24,
};

const TAX_PROFILES = {
  2025: {
    federal: {
      thresholds: [0, 57375, 114750, 177882, 253414],
      rates: [0.15, 0.205, 0.26, 0.29, 0.33],
      constants: [0, 3157, 9468, 14804, 24941],
      lowestRate: 0.15,
      employmentAmount: 1471,
      basicPersonalAmount: {
        max: 16129,
        min: 14538,
        phaseOutStart: 177882,
        phaseOutEnd: 253414,
      },
    },
    britishColumbia: {
      thresholds: [0, 49279, 98560, 113158, 137407, 186306, 259829],
      rates: [0.0506, 0.077, 0.105, 0.1229, 0.147, 0.168, 0.205],
      constants: [0, 1301, 4061, 6086, 9398, 13310, 22924],
      lowestRate: 0.0506,
      basicPersonalAmount: 12932,
      taxReduction: {
        max: 562,
        phaseOutStart: 25020,
        phaseOutEnd: 40807,
        reductionRate: 0.0356,
      },
    },
    cpp: {
      yearlyBasicExemption: 3500,
      totalRate: 0.0595,
      totalMax: 4034.10,
      baseRate: 0.0495,
      baseMax: 3356.10,
      ympe: 71300,
      yampe: 81200,
      cpp2Rate: 0.04,
      cpp2Max: 396.00,
    },
    ei: {
      maxInsurableEarnings: 65700,
      rate: 0.0164,
      maxPremium: 1077.48,
    },
  },
  2026: {
    federal: {
      thresholds: [0, 58523, 117045, 181440, 258482],
      rates: [0.14, 0.205, 0.26, 0.29, 0.33],
      constants: [0, 3804, 10241, 15685, 26024],
      lowestRate: 0.14,
      employmentAmount: 1501,
      basicPersonalAmount: {
        max: 16452,
        min: 14829,
        phaseOutStart: 181440,
        phaseOutEnd: 258482,
      },
    },
    britishColumbia: {
      thresholds: [0, 50363, 100728, 115648, 140430, 190405, 265545],
      rates: [0.0506, 0.077, 0.105, 0.1229, 0.147, 0.168, 0.205],
      constants: [0, 1330, 4150, 6220, 9604, 13603, 23428],
      lowestRate: 0.0506,
      basicPersonalAmount: 13216,
      taxReduction: {
        max: 575,
        phaseOutStart: 25570,
        phaseOutEnd: 41722,
        reductionRate: 0.0356,
      },
    },
    cpp: {
      yearlyBasicExemption: 3500,
      totalRate: 0.0595,
      totalMax: 4230.45,
      baseRate: 0.0495,
      baseMax: 3519.45,
      ympe: 74600,
      yampe: 85000,
      cpp2Rate: 0.04,
      cpp2Max: 416.00,
    },
    ei: {
      maxInsurableEarnings: 68900,
      rate: 0.0163,
      maxPremium: 1123.07,
    },
  },
};

const getPayPeriodsPerYear = ({ payFrequency, periodStart, periodEnd } = {}) => {
  const normalizedFrequency = String(payFrequency || '').toUpperCase();
  if (PAY_PERIODS_BY_FREQUENCY[normalizedFrequency]) {
    return PAY_PERIODS_BY_FREQUENCY[normalizedFrequency];
  }

  if (periodStart && periodEnd) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
      if (diffDays >= 27) {
        return 12;
      }
      if (diffDays >= 14) {
        return 24;
      }
    }
  }

  return 26;
};

const getTaxProfile = (dateValue) => {
  const parsedDate = dateValue ? new Date(dateValue) : null;
  const year = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.getFullYear()
    : 2026;

  return TAX_PROFILES[year] || TAX_PROFILES[2026];
};

const getBracketIndex = (value, thresholds) => {
  let index = 0;
  thresholds.forEach((threshold, candidateIndex) => {
    if (value >= threshold) {
      index = candidateIndex;
    }
  });
  return index;
};

const getDynamicFederalBasicPersonalAmount = (annualTaxableIncome, federalProfile) => {
  const {
    max,
    min,
    phaseOutStart,
    phaseOutEnd,
  } = federalProfile.basicPersonalAmount;

  if (annualTaxableIncome <= phaseOutStart) {
    return max;
  }
  if (annualTaxableIncome >= phaseOutEnd) {
    return min;
  }

  const reduction = (annualTaxableIncome - phaseOutStart) * ((max - min) / (phaseOutEnd - phaseOutStart));
  return roundCurrency(max - reduction);
};

const getBritishColumbiaTaxReduction = (annualTaxableIncome, baseProvincialTax, bcProfile) => {
  const reduction = bcProfile.taxReduction;

  if (annualTaxableIncome <= reduction.phaseOutStart) {
    return Math.min(baseProvincialTax, reduction.max);
  }

  if (annualTaxableIncome <= reduction.phaseOutEnd) {
    const reducedAmount = reduction.max - ((annualTaxableIncome - reduction.phaseOutStart) * reduction.reductionRate);
    return Math.min(baseProvincialTax, Math.max(0, roundCurrency(reducedAmount)));
  }

  return 0;
};

const calculateEstimatedPayrollDeductions = ({
  grossPay,
  payDate,
  payFrequency,
  periodStart,
  periodEnd,
  ytdGross = 0,
  ytdCpp = 0,
  ytdEi = 0,
  ytdCpp2 = 0,
}) => {
  const gross = Math.max(0, roundCurrency(grossPay));
  if (gross <= 0) {
    return {
      incomeTax: 0,
      ei: 0,
      cpp: 0,
      cpp2: 0,
      total: 0,
      payPeriodsPerYear: getPayPeriodsPerYear({ payFrequency, periodStart, periodEnd }),
      taxYear: (new Date(payDate || Date.now())).getFullYear(),
    };
  }

  const payPeriodsPerYear = getPayPeriodsPerYear({ payFrequency, periodStart, periodEnd });
  const profile = getTaxProfile(payDate || periodEnd || periodStart);
  const annualTaxableIncome = gross * payPeriodsPerYear;
  const basicExemptionPerPeriod = profile.cpp.yearlyBasicExemption / payPeriodsPerYear;
  const rawCpp = Math.max(0, (gross - basicExemptionPerPeriod) * profile.cpp.totalRate);
  const estimatedYtdCppBefore = Math.max(0, roundCurrency(ytdCpp) - roundCurrency(rawCpp));
  const cpp = roundCurrency(
    Math.min(
      rawCpp,
      Math.max(0, profile.cpp.totalMax - estimatedYtdCppBefore)
    )
  );

  const rawEi = Math.max(0, gross * profile.ei.rate);
  const estimatedYtdEiBefore = Math.max(0, roundCurrency(ytdEi) - roundCurrency(rawEi));
  const ei = roundCurrency(
    Math.min(
      rawEi,
      Math.max(0, profile.ei.maxPremium - estimatedYtdEiBefore)
    )
  );

  const estimatedYtdGrossBefore = Math.max(0, roundCurrency(ytdGross) - gross);
  const cpp2Base = Math.max(
    0,
    estimatedYtdGrossBefore + gross - Math.max(estimatedYtdGrossBefore, profile.cpp.ympe)
  );
  const rawCpp2 = cpp2Base * profile.cpp.cpp2Rate;
  const estimatedYtdCpp2Before = Math.max(0, roundCurrency(ytdCpp2) - roundCurrency(rawCpp2));
  const cpp2 = roundCurrency(
    Math.min(
      rawCpp2,
      Math.max(0, profile.cpp.cpp2Max - estimatedYtdCpp2Before)
    )
  );

  const federalBracketIndex = getBracketIndex(annualTaxableIncome, profile.federal.thresholds);
  const federalRate = profile.federal.rates[federalBracketIndex];
  const federalConstant = profile.federal.constants[federalBracketIndex];
  const federalBpa = getDynamicFederalBasicPersonalAmount(annualTaxableIncome, profile.federal);
  const annualBaseCppForCredit = Math.min(
    profile.cpp.baseMax,
    Math.max(0, (annualTaxableIncome - profile.cpp.yearlyBasicExemption) * profile.cpp.baseRate)
  );
  const annualEiForCredit = Math.min(
    profile.ei.maxPremium,
    Math.max(0, annualTaxableIncome * profile.ei.rate)
  );
  const federalTax = Math.max(
    0,
    (federalRate * annualTaxableIncome)
      - federalConstant
      - (profile.federal.lowestRate * federalBpa)
      - (profile.federal.lowestRate * (annualBaseCppForCredit + annualEiForCredit))
      - (profile.federal.lowestRate * Math.min(annualTaxableIncome, profile.federal.employmentAmount))
  );

  const provincialBracketIndex = getBracketIndex(annualTaxableIncome, profile.britishColumbia.thresholds);
  const provincialRate = profile.britishColumbia.rates[provincialBracketIndex];
  const provincialConstant = profile.britishColumbia.constants[provincialBracketIndex];
  const provincialBaseTax = Math.max(
    0,
    (provincialRate * annualTaxableIncome)
      - provincialConstant
      - (profile.britishColumbia.lowestRate * profile.britishColumbia.basicPersonalAmount)
      - (profile.britishColumbia.lowestRate * (annualBaseCppForCredit + annualEiForCredit))
  );
  const bcTaxReduction = getBritishColumbiaTaxReduction(
    annualTaxableIncome,
    provincialBaseTax,
    profile.britishColumbia
  );
  const provincialTax = Math.max(0, provincialBaseTax - bcTaxReduction);

  const incomeTax = roundCurrency((federalTax + provincialTax) / payPeriodsPerYear);
  const total = roundCurrency(incomeTax + ei + cpp + cpp2);

  return {
    incomeTax,
    ei,
    cpp,
    cpp2,
    total,
    payPeriodsPerYear,
    taxYear: (new Date(payDate || Date.now())).getFullYear(),
  };
};

const resolvePaystubPayout = ({ payout, user, payPeriod }) => {
  const resolved = { ...payout };
  const grossAmount = roundCurrency(resolved.gross_amount);
  const totalHours = roundCurrency(resolved.total_hours);

  const nonRegularHours = [
    resolved.sick_hours,
    resolved.vacation_hours,
    resolved.stat_hours,
    resolved.bonus_hours,
    resolved.retro_hours,
  ].reduce((sum, value) => sum + roundCurrency(value), 0);
  const nonRegularCurrent = [
    resolved.sick_pay_current,
    resolved.vacation_pay_current,
    resolved.stat_pay_current,
    resolved.bonus_pay_current,
    resolved.retro_payment_current,
  ].reduce((sum, value) => sum + roundCurrency(value), 0);

  const explicitRegularCurrent = safeNumber(resolved.regular_pay_current, 0);
  const explicitRegularHours = safeNumber(resolved.regular_hours, 0);

  if (grossAmount > 0 && explicitRegularCurrent <= 0 && nonRegularCurrent < grossAmount) {
    resolved.regular_pay_current = roundCurrency(grossAmount - nonRegularCurrent);
  }

  if (totalHours > 0 && explicitRegularHours <= 0 && nonRegularHours < totalHours) {
    resolved.regular_hours = roundCurrency(totalHours - nonRegularHours);
  }

  if (safeNumber(resolved.regular_rate, 0) <= 0) {
    resolved.regular_rate = roundCurrency(
      safeNumber(resolved.hourly_rate, safeNumber(user?.profile_hourly_rate, 0))
    );
  }

  const computed = calculateEstimatedPayrollDeductions({
    grossPay: grossAmount,
    payDate: payPeriod?.pay_date || payPeriod?.end_date,
    payFrequency: user?.pay_frequency || payPeriod?.frequency,
    periodStart: payPeriod?.start_date,
    periodEnd: payPeriod?.end_date,
    ytdGross: user?.ytd_gross,
    ytdCpp: user?.ytd_cpp,
    ytdEi: user?.ytd_ei,
    ytdCpp2: user?.ytd_cpp2,
  });

  const storedDeductions = safeNumber(resolved.deductions, 0);
  const hasStoredBreakdown = [
    resolved.income_tax_current,
    resolved.ei_current,
    resolved.cpp_current,
    resolved.cpp2_current,
  ].some((value) => safeNumber(value) !== null);

  resolved.deductions = storedDeductions > 0 ? roundCurrency(storedDeductions) : computed.total;

  if (!hasStoredBreakdown) {
    const fallbackCpp = computed.cpp;
    const fallbackEi = computed.ei;
    const fallbackCpp2 = computed.cpp2;
    const fallbackIncomeTax = storedDeductions > 0
      ? Math.max(0, roundCurrency(resolved.deductions - fallbackCpp - fallbackEi - fallbackCpp2))
      : computed.incomeTax;

    resolved.income_tax_current = fallbackIncomeTax;
    resolved.ei_current = fallbackEi;
    resolved.cpp_current = fallbackCpp;
    resolved.cpp2_current = fallbackCpp2;
  } else {
    resolved.income_tax_current = roundCurrency(resolved.income_tax_current);
    resolved.ei_current = roundCurrency(resolved.ei_current);
    resolved.cpp_current = roundCurrency(resolved.cpp_current);
    resolved.cpp2_current = roundCurrency(resolved.cpp2_current);
  }

  resolved.net_amount = roundCurrency(grossAmount - resolved.deductions);
  return resolved;
};

module.exports = {
  calculateEstimatedPayrollDeductions,
  getPayPeriodsPerYear,
  resolvePaystubPayout,
};
