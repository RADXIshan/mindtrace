/**
 * Convert 24-hour time format (HH:MM) to 12-hour format with AM/PM
 * @param {string} time24 - Time in 24-hour format (e.g., "14:30", "09:00")
 * @returns {string} Time in 12-hour format with AM/PM (e.g., "2:30 PM", "9:00 AM")
 */
export const formatTime12Hour = (time24) => {
  if (!time24) return '';
  
  // Handle if time already has AM/PM
  if (time24.includes('AM') || time24.includes('PM')) {
    return time24;
  }
  
  const [hours, minutes] = time24.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    return time24; // Return original if invalid
  }
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight
  
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};
