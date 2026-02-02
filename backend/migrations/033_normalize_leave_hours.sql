UPDATE users
SET annual_sick_days = CASE
  WHEN annual_sick_days > 400 THEN
    CASE WHEN annual_sick_days / 8 > 400 THEN annual_sick_days / 64 ELSE annual_sick_days / 8 END
  ELSE annual_sick_days
END,
annual_vacation_days = CASE
  WHEN annual_vacation_days > 400 THEN
    CASE WHEN annual_vacation_days / 8 > 400 THEN annual_vacation_days / 64 ELSE annual_vacation_days / 8 END
  ELSE annual_vacation_days
END,
sick_days_remaining = CASE
  WHEN sick_days_remaining > 400 THEN
    CASE WHEN sick_days_remaining / 8 > 400 THEN sick_days_remaining / 64 ELSE sick_days_remaining / 8 END
  ELSE sick_days_remaining
END,
vacation_days_remaining = CASE
  WHEN vacation_days_remaining > 400 THEN
    CASE WHEN vacation_days_remaining / 8 > 400 THEN vacation_days_remaining / 64 ELSE vacation_days_remaining / 8 END
  ELSE vacation_days_remaining
END;
