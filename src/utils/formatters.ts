/**
 * Format numbers into Pakistani Rupee (PKR / Rs.) string format.
 * Example: 100000 -> "Rs. 100,000"
 */
export const formatPKR = (amount: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rs. 0';
  const hasDecimals = amount % 1 !== 0;
  return `Rs. ${amount.toLocaleString('en-PK', { 
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Format pure numeric amount with comma separators without currency prefix.
 * Example: 1250000 -> "1,250,000"
 */
export const formatAmount = (amount: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  const hasDecimals = amount % 1 !== 0;
  return amount.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
};

/**
 * Cleanly parse an amount string with commas or currency signs into a float.
 * Example: "Rs. 1,250,000.50" -> 1250000.5
 */
export const parseAmount = (input: string | number): number => {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  if (!input) return 0;
  const cleaned = input.toString().replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format date strings to readable standard B2B date format.
 * Example: "2026-10-10" -> "10 Oct 2026"
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

/**
 * Calculate payment status based on grand total and received/paid amount.
 */
export const calculatePaymentStatus = (grandTotal: number, receivedAmount: number): 'Paid' | 'Partially Paid' | 'Unpaid' => {
  if (receivedAmount >= grandTotal && grandTotal > 0) {
    return 'Paid';
  } else if (receivedAmount > 0 && receivedAmount < grandTotal) {
    return 'Partially Paid';
  }
  return 'Unpaid';
};

export interface ParsedTransactionTime {
  formattedDate: string;
  formattedTime?: string;
  hasTime: boolean;
  sortTimestamp: number;
}

/**
 * Determine exact chronological timestamp and formatted date/time for ledger records.
 * Follows strict rules:
 * 1. If explicit time (e.g. "14:30") is provided, use it.
 * 2. If date contains full ISO timestamp, extract time from it.
 * 3. If createdAt has full ISO timestamp and matches transaction date, use it.
 * 4. Fallback for legacy date-only records: mark hasTime=false, sort at midnight of date.
 */
export const formatTransactionTimestamp = (
  dateStr: string,
  timeStr?: string,
  createdAt?: string
): ParsedTransactionTime => {
  if (!dateStr) {
    return { formattedDate: '-', hasTime: false, sortTimestamp: 0 };
  }

  const dateOnly = dateStr.slice(0, 10);
  const fDate = formatDate(dateOnly);

  // 1. Explicit time string provided (HH:mm or HH:mm:ss)
  if (timeStr && timeStr.trim()) {
    const cleanTime = timeStr.trim();
    const parts = cleanTime.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    const dt = new Date(`${dateOnly}T00:00:00`);
    dt.setHours(hours, minutes, seconds, 0);

    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const fTime = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;

    return {
      formattedDate: fDate,
      formattedTime: fTime,
      hasTime: true,
      sortTimestamp: dt.getTime()
    };
  }

  // 2. Date string itself is a full ISO timestamp with time (contains 'T')
  if (dateStr.includes('T')) {
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      const hours = dt.getHours();
      const minutes = dt.getMinutes();
      const hour12 = hours % 12 || 12;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const fTime = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;

      return {
        formattedDate: fDate,
        formattedTime: fTime,
        hasTime: true,
        sortTimestamp: dt.getTime()
      };
    }
  }

  // 3. Check createdAt timestamp
  if (createdAt && createdAt.includes('T')) {
    const createdDt = new Date(createdAt);
    if (!isNaN(createdDt.getTime())) {
      const createdDateOnly = createdAt.slice(0, 10);
      if (createdDateOnly === dateOnly) {
        const hours = createdDt.getHours();
        const minutes = createdDt.getMinutes();
        const hour12 = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const fTime = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;

        return {
          formattedDate: fDate,
          formattedTime: fTime,
          hasTime: true,
          sortTimestamp: createdDt.getTime()
        };
      }
    }
  }

  // 4. Stable fallback for date-only transactions:
  // Do not invent time; mark hasTime=false and sort at 00:00:00 of date
  const fallbackDt = new Date(`${dateOnly}T00:00:00`);
  return {
    formattedDate: fDate,
    formattedTime: undefined,
    hasTime: false,
    sortTimestamp: isNaN(fallbackDt.getTime()) ? 0 : fallbackDt.getTime()
  };
};
