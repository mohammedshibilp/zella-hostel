import { FeeReceipt, Guest } from '../types';

/**
 * Normalizes phone numbers for WhatsApp click-to-chat (https://wa.me/NUMBER).
 *
 * Rules:
 * - Indian 10-digit mobile (starts with 6, 7, 8, 9): prepends '91'.
 *   e.g. '8590629268' -> '918590629268'
 * - Indian number with '+91' or '91': keeps/converts to '918590629268'.
 *   e.g. '+918590629268' -> '918590629268', '918590629268' -> '918590629268'
 * - Indian number with leading '0': strips '0' and prepends '91'.
 *   e.g. '08590629268' -> '918590629268'
 * - Strips all spaces, dashes, brackets, parentheses, dots.
 * - Explicit international numbers with country code: preserved without duplicating or forcing '+91'.
 * - Rejects empty, non-numeric, or invalid numbers with a clear user-facing error message.
 */
export interface PhoneNormalizationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export const normalizePhoneNumber = (rawPhone?: string | null): PhoneNormalizationResult => {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      valid: false,
      normalized: '',
      error: "Guest mobile number is missing or invalid. Please update the guest's contact details before sharing the receipt.",
    };
  }

  // Remove whitespace, dashes, parentheses, brackets, dots
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.\[\]]/g, '');

  // Strip leading '+'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Strip international dialing prefix '00'
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Ensure only digits remain
  if (!/^\d+$/.test(cleaned)) {
    return {
      valid: false,
      normalized: '',
      error: "Guest mobile number contains invalid characters. Please update the guest's contact details.",
    };
  }

  // Indian standard 10-digit mobile number (starts with 6, 7, 8, 9)
  if (cleaned.length === 10) {
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return { valid: true, normalized: `91${cleaned}` };
    }
    return {
      valid: false,
      normalized: '',
      error: "Invalid 10-digit mobile number. Indian mobile numbers must begin with 6, 7, 8, or 9.",
    };
  }

  // Indian 11-digit number with leading 0 (e.g. 08590629268)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const withoutZero = cleaned.substring(1);
    if (/^[6-9]\d{9}$/.test(withoutZero)) {
      return { valid: true, normalized: `91${withoutZero}` };
    }
  }

  // Indian 12-digit number with 91 prefix (e.g. 918590629268)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const mobilePart = cleaned.substring(2);
    if (/^[6-9]\d{9}$/.test(mobilePart)) {
      return { valid: true, normalized: cleaned };
    }
  }

  // Explicit international number (E.164: 10 to 15 digits)
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return { valid: true, normalized: cleaned };
  }

  return {
    valid: false,
    normalized: '',
    error: "Guest mobile number is missing or invalid. Please update the guest's contact details before sharing the receipt.",
  };
};

/**
 * Formats date as DD-MM-YYYY
 */
export const formatDateDMY = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

/**
 * Formats room and bed info
 */
export const formatRoomBed = (receipt: FeeReceipt, fallbackGuest?: Guest | null): string => {
  const g = receipt.guest || fallbackGuest;
  const room = receipt.room_number || g?.room_number || '101';
  const bed = g?.bed_number || 'Not Assigned';
  return `Room ${room} · Bed ${bed}`;
};

/**
 * Formats package name
 */
export const formatPackage = (receipt: FeeReceipt, fallbackGuest?: Guest | null): string => {
  const g = receipt.guest || fallbackGuest;
  return receipt.package_name || (g as any)?.package_name || 'Standard Double Sharing';
};

/**
 * Formats billing period
 */
export const formatBillingPeriod = (receipt: FeeReceipt): string => {
  if (receipt.billing_period) return receipt.billing_period;
  if (receipt.period_start && receipt.period_end) {
    return `${formatDateDMY(receipt.period_start)} to ${formatDateDMY(receipt.period_end)}`;
  }
  if (receipt.period_start) {
    return `${formatDateDMY(receipt.period_start)} to Month-end`;
  }
  return `${formatDateDMY(receipt.date)} to Month-end`;
};

/**
 * Generates the official professional WhatsApp receipt message.
 */
export const generateWhatsAppReceiptMessage = (
  receipt: FeeReceipt,
  fallbackGuest?: Guest | null
): string => {
  const g = receipt.guest || fallbackGuest;
  const guestName = g?.name || 'Resident';
  const receiptNo = receipt.receipt_no;
  const receiptDate = formatDateDMY(receipt.date);
  const roomBed = formatRoomBed(receipt, fallbackGuest);
  const packageName = formatPackage(receipt, fallbackGuest);
  const billingPeriod = formatBillingPeriod(receipt);
  const amountReceived = (receipt.paid_amount ?? receipt.amount).toLocaleString('en-IN');
  const paymentStatus =
    receipt.balance_amount && receipt.balance_amount > 0 ? 'PARTIALLY PAID' : 'PAID / SETTLED';

  return `Hello ${guestName},

Greetings from Zella Ladies Hostel!

Thank you for your payment.

Please find your fee receipt details below:

Receipt Number: ${receiptNo}
Receipt Date: ${receiptDate}
Guest Name: ${guestName}
Room & Bed: ${roomBed}
Package: ${packageName}
Billing Period: ${billingPeriod}
Amount Received: ₹${amountReceived}
Payment Status: ${paymentStatus}

Please retain your receipt for future reference.

Thank you for choosing Zella Ladies Hostel.

ZELLA LADIES HOSTEL
Musaffa Tower, Opp. Bharat Petroleum,
Near Neha Hospital, Main Road,
Kottakkal, Malappuram - 676503

Contact: +91 920 7000 923
         +91 9207000924`;
};

/**
 * Constructs the official WhatsApp click-to-chat URL:
 * https://wa.me/COUNTRYCODEANDNUMBER?text=ENCODED_MESSAGE
 */
export const buildWhatsAppChatUrl = (normalizedPhone: string, message: string): string => {
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};
