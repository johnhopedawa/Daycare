const DEFAULT_VACATION_ACCRUAL_RATE = 0.04;

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundHours = (value) => Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;

const normalizeAccrualRate = (value, fallback = DEFAULT_VACATION_ACCRUAL_RATE) => {
  let parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    parsed = fallback;
  }

  if (parsed > 1) {
    parsed /= 100;
  }

  if (parsed < 0) {
    parsed = 0;
  }

  return Math.round((parsed + Number.EPSILON) * 10000) / 10000;
};

const getTodayIsoDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Vancouver',
}).format(new Date());

const isVacationAccrualEnabled = (user) => Boolean(user?.vacation_accrual_enabled);

const getVacationAccrualHours = ({ workedHours, accrualRate }) => (
  roundHours(safeNumber(workedHours) * normalizeAccrualRate(accrualRate))
);

const getVacationAccrualSnapshotMap = async (db, users, options = {}) => {
  const normalizedUsers = (Array.isArray(users) ? users : [users])
    .filter((user) => user && Number.isInteger(Number(user.id)));

  if (!normalizedUsers.length) {
    return new Map();
  }

  const userIds = normalizedUsers.map((user) => Number(user.id));
  const asOfDate = options.asOfDate || getTodayIsoDate();

  const [workedSchedulesResult, declinedSchedulesResult, approvedRequestsResult] = await Promise.all([
    db.query(
      `SELECT user_id, COALESCE(SUM(hours), 0) AS worked_hours
       FROM schedules
       WHERE user_id = ANY($1)
         AND status <> 'DECLINED'
         AND shift_date <= $2::date
       GROUP BY user_id`,
      [userIds, asOfDate]
    ),
    db.query(
      `SELECT user_id, COALESCE(SUM(hours), 0) AS used_hours
       FROM schedules
       WHERE user_id = ANY($1)
         AND status = 'DECLINED'
         AND decline_type = 'VACATION_DAY'
         AND shift_date <= $2::date
       GROUP BY user_id`,
      [userIds, asOfDate]
    ),
    db.query(
      `SELECT user_id,
              COALESCE(SUM(
                COALESCE(
                  hours,
                  (GREATEST(0, LEAST(end_date, $2::date) - start_date + 1) * 8)::numeric
                )
              ), 0) AS used_hours
       FROM time_off_requests
       WHERE user_id = ANY($1)
         AND status = 'APPROVED'
         AND request_type = 'VACATION'
         AND start_date <= $2::date
       GROUP BY user_id`,
      [userIds, asOfDate]
    ),
  ]);

  const workedHoursByUser = new Map(
    workedSchedulesResult.rows.map((row) => [Number(row.user_id), safeNumber(row.worked_hours)])
  );
  const vacationUsedByUser = new Map();

  declinedSchedulesResult.rows.forEach((row) => {
    vacationUsedByUser.set(
      Number(row.user_id),
      roundHours(safeNumber(vacationUsedByUser.get(Number(row.user_id))) + safeNumber(row.used_hours))
    );
  });

  approvedRequestsResult.rows.forEach((row) => {
    vacationUsedByUser.set(
      Number(row.user_id),
      roundHours(safeNumber(vacationUsedByUser.get(Number(row.user_id))) + safeNumber(row.used_hours))
    );
  });

  const snapshots = new Map();

  normalizedUsers.forEach((user) => {
    const userId = Number(user.id);
    const accrualEnabled = isVacationAccrualEnabled(user);
    const accrualRate = normalizeAccrualRate(user.vacation_accrual_rate);
    const workedHours = roundHours(workedHoursByUser.get(userId));
    const usedHours = roundHours(vacationUsedByUser.get(userId));
    const accruedHours = accrualEnabled
      ? getVacationAccrualHours({ workedHours, accrualRate })
      : 0;
    const remainingHours = accrualEnabled
      ? roundHours(accruedHours - usedHours)
      : roundHours(safeNumber(user.vacation_days_remaining));

    snapshots.set(userId, {
      vacation_accrual_enabled: accrualEnabled,
      vacation_accrual_rate: accrualRate,
      accrued_vacation_hours: accruedHours,
      used_vacation_hours: usedHours,
      worked_vacation_source_hours: workedHours,
      vacation_days_remaining: remainingHours,
    });
  });

  return snapshots;
};

const applyVacationAccrualSnapshots = async (db, users, options = {}) => {
  const normalizedUsers = Array.isArray(users) ? users : [users];
  const snapshots = await getVacationAccrualSnapshotMap(db, normalizedUsers, options);

  const merged = normalizedUsers.map((user) => {
    const snapshot = snapshots.get(Number(user?.id));
    if (!snapshot) {
      return user;
    }

    return {
      ...user,
      ...snapshot,
    };
  });

  return Array.isArray(users) ? merged : merged[0];
};

module.exports = {
  DEFAULT_VACATION_ACCRUAL_RATE,
  applyVacationAccrualSnapshots,
  getVacationAccrualHours,
  getVacationAccrualSnapshotMap,
  isVacationAccrualEnabled,
  normalizeAccrualRate,
  roundHours,
  safeNumber,
};
