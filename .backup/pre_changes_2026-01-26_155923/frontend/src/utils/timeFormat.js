// Convert 24-hour time (HH:MM:SS or HH:MM) to 12-hour format with AM/PM
export const formatTime12Hour = (time24) => {
  if (!time24) return '-';

  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minutes} ${ampm}`;
};

// Convert 12-hour time to 24-hour format (for sending to backend)
export const formatTime24Hour = (time12) => {
  if (!time12) return '';

  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time12;

  let [, hours, minutes, ampm] = match;
  let hour = parseInt(hours, 10);

  if (ampm.toUpperCase() === 'PM' && hour !== 12) {
    hour += 12;
  } else if (ampm.toUpperCase() === 'AM' && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, '0')}:${minutes}:00`;
};
