import React, { useEffect, useState, useRef } from 'react';
import { feeReceiptService } from '../../services/feeReceiptService';
import { guestService } from '../../services/guestService';
import { FeeReceipt, Guest } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, Column } from '../../components/DataTable';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Card } from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import { ZellaHostelSeal } from '../../components/ZellaHostelSeal';
import { WhatsAppIcon } from '../../components/WhatsAppIcon';
import zellaLogo from '../../assets/zella_logo.png';
import {
  normalizePhoneNumber,
  buildWhatsAppChatUrl,
} from '../../utils/whatsapp';
import {
  calculateBillingPeriod,
  getCycleForDate,
  formatDateDDMMYYYY,
} from '../../utils/billing';
import {
  Plus,
  Receipt,
  Printer,
  Download,
  Building2,
  Calendar,
  CreditCard,
  Tag,
  Clock,
} from 'lucide-react';

export const FeeReceiptsPage: React.FC = () => {
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<FeeReceipt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isSharingWhatsapp, setIsSharingWhatsapp] = useState<boolean>(false);

  const receiptPrintRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    guest_id: '',
    date: new Date().toISOString().split('T')[0],
    fee_type: 'Hostel Accommodation Fee',
    amount: '',
    discount: '0',
    paid_amount: '',
    balance_amount: '0',
    payment_mode: 'Cash',
    payment_reference: '',
    period_start: new Date().toISOString().split('T')[0],
    period_end: '',
    remarks: '',
  });

  const { success, error: toastError } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [recData, guestData] = await Promise.all([
        feeReceiptService.getReceipts(),
        guestService.getGuests({ status_filter: 'Active' }),
      ]);
      setReceipts(recData);
      setGuests(guestData);
    } catch (err) {
      toastError('Failed to load fee receipts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Ensure selectedReceipt has complete guest details if lazy-loaded
  useEffect(() => {
    if (
      selectedReceipt &&
      (!selectedReceipt.guest || !selectedReceipt.guest.contact_no) &&
      selectedReceipt.guest_id
    ) {
      guestService
        .getGuest(selectedReceipt.guest_id)
        .then((fullGuest) => {
          if (fullGuest && fullGuest.contact_no) {
            setSelectedReceipt((prev) =>
              prev && prev.id === selectedReceipt.id ? { ...prev, guest: fullGuest } : prev
            );
          }
        })
        .catch(() => {});
    }
  }, [selectedReceipt?.id]);

  const handleResidentChange = (guestId: string) => {
    const selectedGuest = guests.find((g) => g.id.toString() === guestId);
    let amountVal = '';
    let periodStart = formData.date;
    let periodEnd = '';

    if (selectedGuest) {
      if (selectedGuest.monthly_fee && selectedGuest.monthly_fee > 0) {
        amountVal = selectedGuest.monthly_fee.toString();
      } else if (selectedGuest.agreed_rent && selectedGuest.agreed_rent > 0) {
        amountVal = selectedGuest.agreed_rent.toString();
      }

      if (selectedGuest.admission_date) {
        const cycle = getCycleForDate(selectedGuest.admission_date, formData.date);
        periodStart = cycle.periodStart;
        periodEnd = cycle.periodEnd;
      } else if (selectedGuest.current_period_start && selectedGuest.current_period_end) {
        periodStart = selectedGuest.current_period_start;
        periodEnd = selectedGuest.current_period_end;
      } else {
        const cycle = calculateBillingPeriod(formData.date);
        periodStart = cycle.periodStart;
        periodEnd = cycle.periodEnd;
      }
    }

    setFormData((prev) => {
      const disc = parseFloat(prev.discount) || 0;
      const amt = parseFloat(amountVal) || 0;
      const net = Math.max(0, amt - disc);
      return {
        ...prev,
        guest_id: guestId,
        amount: amountVal,
        paid_amount: net > 0 ? net.toString() : amountVal,
        period_start: periodStart,
        period_end: periodEnd,
      };
    });
  };

  const handleAmountChange = (amountStr: string, discountStr: string) => {
    const amt = parseFloat(amountStr) || 0;
    const disc = parseFloat(discountStr) || 0;
    const net = Math.max(0, amt - disc);
    setFormData((prev) => ({
      ...prev,
      amount: amountStr,
      discount: discountStr,
      paid_amount: net.toString(),
      balance_amount: '0',
    }));
  };

  const handlePaidChange = (paidStr: string) => {
    const amt = parseFloat(formData.amount) || 0;
    const disc = parseFloat(formData.discount) || 0;
    const net = Math.max(0, amt - disc);
    const paid = parseFloat(paidStr) || 0;
    const bal = Math.max(0, net - paid);
    setFormData((prev) => ({
      ...prev,
      paid_amount: paidStr,
      balance_amount: bal.toString(),
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guest_id || !formData.amount || parseFloat(formData.amount) <= 0) {
      toastError('Please select a resident and enter a valid fee amount greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        guest_id: parseInt(formData.guest_id),
        date: formData.date,
        fee_type: formData.fee_type,
        amount: parseFloat(formData.amount),
        discount: parseFloat(formData.discount) || 0,
        paid_amount: parseFloat(formData.paid_amount) || parseFloat(formData.amount),
        balance_amount: parseFloat(formData.balance_amount) || 0,
        payment_mode: formData.payment_mode,
        payment_reference: formData.payment_reference || null,
        period_start: formData.period_start || null,
        period_end: formData.period_end || null,
        remarks: formData.remarks || null,
      };

      const newRec = await feeReceiptService.createReceipt(payload);
      success(`Receipt ${newRec.receipt_no} generated!`, 'Payment Recorded');
      setIsCreateOpen(false);
      loadData();
      setSelectedReceipt(newRec);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Receipt generation failed', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDateDMY = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const formatRoomBed = (receipt: FeeReceipt): string => {
    const room = receipt.room_number || receipt.guest?.room_number || 'N/A';
    const bed = receipt.guest?.bed_number || 'Not Assigned';
    return `Room ${room} · Bed ${bed}`;
  };

  const formatPackage = (receipt: FeeReceipt): string => {
    return receipt.package_name || (receipt.guest as any)?.package_name || 'Standard Double Sharing';
  };

  const formatBillingPeriod = (receipt: FeeReceipt): string => {
    if (receipt.billing_period) return receipt.billing_period;
    if (receipt.period_start && receipt.period_end) {
      return `${formatDateDDMMYYYY(receipt.period_start)} to ${formatDateDDMMYYYY(receipt.period_end)}`;
    }
    if (receipt.period_start) {
      const cycle = calculateBillingPeriod(receipt.period_start);
      return `${formatDateDDMMYYYY(cycle.periodStart)} to ${formatDateDDMMYYYY(cycle.periodEnd)}`;
    }
    const cycle = calculateBillingPeriod(receipt.date);
    return `${formatDateDDMMYYYY(cycle.periodStart)} to ${formatDateDDMMYYYY(cycle.periodEnd)}`;
  };

  const handleDownloadPdf = async () => {
    if (!receiptPrintRef.current) return;
    setIsExportingPdf(true);
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const opt = {
        margin: [10, 12, 10, 12],
        filename: `${selectedReceipt?.receipt_no || 'Fee_Receipt'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      await html2pdf().from(receiptPrintRef.current).set(opt).save();
      success('Receipt PDF downloaded successfully!');
    } catch (err) {
      toastError('Failed to generate PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!selectedReceipt) return;

    if (!receiptPrintRef.current) {
      toastError('Receipt preview is not ready. Please try again.');
      return;
    }

    // 1. Identify recipient guest strictly from currently selected receipt relationship
    let targetGuest = selectedReceipt.guest;
    if (!targetGuest || !targetGuest.contact_no) {
      targetGuest =
        guests.find((g) => Number(g.id) === Number(selectedReceipt.guest_id)) || targetGuest;
    }

    if (!targetGuest?.contact_no && selectedReceipt.guest_id) {
      try {
        const fetchedGuest = await guestService.getGuest(selectedReceipt.guest_id);
        if (fetchedGuest) {
          targetGuest = fetchedGuest;
        }
      } catch (fetchErr) {
        console.warn('Could not retrieve guest details:', fetchErr);
      }
    }

    const rawPhone = targetGuest?.contact_no || selectedReceipt.guest?.contact_no;
    const phoneResult = normalizePhoneNumber(rawPhone);

    // If the number is invalid or missing, show an error and do not proceed
    if (!phoneResult.valid) {
      toastError(
        phoneResult.error ||
          "Guest mobile number is missing or invalid. Please update the guest's contact details before sharing the receipt.",
        "Missing Contact"
      );
      return;
    }

    // Platform detection (Android, iPhone Safari, Windows, PWA standalone)
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isAndroid = /Android/i.test(ua);
    const isIOS =
      /iPhone|iPad|iPod/i.test(ua) ||
      (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isWindows =
      /Win/i.test(ua) || (typeof navigator !== 'undefined' && /Win/i.test(navigator.platform || ''));
    const isPWA =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true);

    setIsSharingWhatsapp(true);
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;
      const cleanReceiptNo = selectedReceipt.receipt_no.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Zella_Receipt_${cleanReceiptNo}.pdf`;

      const opt = {
        margin: [10, 12, 10, 12],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      // 1. Generate and validate the actual receipt PDF Blob
      const pdfWorker = html2pdf().from(receiptPrintRef.current).set(opt);
      const pdfBlob: Blob = await pdfWorker.output('blob');

      if (!pdfBlob || pdfBlob.size < 500) {
        throw new Error('Generated PDF document is empty or invalid.');
      }

      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      // 2. Android & iPhone Safari: Native Web Share API Level 2 file sharing
      let canShareFiles = false;
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function'
      ) {
        try {
          canShareFiles = navigator.canShare({ files: [pdfFile] });
        } catch {
          canShareFiles = false;
        }
      }

      if (canShareFiles && (isAndroid || isIOS)) {
        try {
          // Strictly document only: NO text, NO captions
          await navigator.share({
            files: [pdfFile],
          });
          success(
            isAndroid
              ? 'Receipt PDF shared! Select WhatsApp and the customer to send document.'
              : 'Receipt PDF shared! Choose WhatsApp in the share sheet to send.',
            'Share Sheet Opened'
          );
          return;
        } catch (shareErr: any) {
          // Gracefully handle user cancellation/dismissal
          if (shareErr.name === 'AbortError') {
            return;
          }
          console.warn('Native mobile share failed, falling back to direct chat flow:', shareErr);
        }
      }

      // 3. Windows WhatsApp Desktop Companion Check
      const companion = (window as any).zellaCompanion || (window as any).electronBridge;
      if (companion && typeof companion.sendWhatsAppDocument === 'function') {
        try {
          await companion.sendWhatsAppDocument({
            phone: phoneResult.normalized,
            filename: filename,
            fileBlob: pdfBlob,
          });
          success(
            `Receipt PDF attached for ${targetGuest?.name || 'guest'} via WhatsApp Desktop companion.`,
            'WhatsApp Desktop'
          );
          return;
        } catch (compErr) {
          console.warn('Companion app error, falling back to direct chat:', compErr);
        }
      }

      // 4. Windows WhatsApp Desktop & WhatsApp Web (Chrome / Edge / Firefox)
      // Automatically download the generated PDF to the device
      try {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (dlErr) {
        console.warn('PDF download link warning:', dlErr);
      }

      // 5. Open direct WhatsApp chat to the exact guest's mobile number: https://wa.me/91XXXXXXXXXX
      // Strictly NO text, NO caption, NO prefilled message
      const waUrl = buildWhatsAppChatUrl(phoneResult.normalized);
      const waWindow = window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (!waWindow || waWindow.closed || typeof waWindow.closed === 'undefined') {
        const link = document.createElement('a');
        link.href = waUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // 6. Truthful, platform-aware user guidance
      const platformLabel = isWindows
        ? isPWA
          ? 'WhatsApp (PWA)'
          : 'WhatsApp Desktop / Web'
        : 'WhatsApp Web';

      success(
        `Receipt PDF downloaded (${filename}). ${platformLabel} opened directly for ${targetGuest?.name || 'guest'} (${phoneResult.normalized}). Please attach the downloaded PDF and send.`,
        'WhatsApp Opened'
      );
    } catch (err: any) {
      console.error('Error during WhatsApp receipt sharing:', err);
      toastError('Failed to prepare receipt PDF for sharing. Please try again.');
    } finally {
      setIsSharingWhatsapp(false);
    }
  };

  const columns: Column<FeeReceipt>[] = [
    {
      header: 'Receipt No',
      accessor: (item) => <span className="font-extrabold text-primary">{item.receipt_no}</span>,
    },
    {
      header: 'Date',
      accessor: (item) => (
        <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{item.date}</span>
        </div>
      ),
    },
    {
      header: 'Resident',
      accessor: (item) => (
        <div>
          <div className="font-bold text-navy-900">{item.guest?.name}</div>
          <div className="text-xs text-slate-400">{item.guest?.contact_no}</div>
        </div>
      ),
    },
    {
      header: 'Fee Type',
      accessor: (item) => (
        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          {item.fee_type || 'Accommodation Fee'}
        </span>
      ),
    },
    {
      header: 'Paid Amount',
      accessor: (item) => (
        <div>
          <span className="text-sm font-extrabold text-emerald-700">
            ₹{(item.paid_amount ?? item.amount).toLocaleString()}
          </span>
          {item.balance_amount && item.balance_amount > 0 ? (
            <div className="text-[10px] text-rose-600 font-bold">
              Bal: ₹{item.balance_amount.toLocaleString()}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Payment Mode',
      accessor: (item) => (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700">
          {item.payment_mode}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (item) => (
        <button
          onClick={() => setSelectedReceipt(item)}
          className="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary-50 rounded-lg flex items-center gap-1 transition-colors"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>View / Print</span>
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Fee Receipts & Invoicing"
        subtitle="Generate authentic payment vouchers, calculate balances, and export branded PDF receipts"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              const firstGuest = guests[0];
              let initialAmount = '';
              const todayStr = new Date().toISOString().split('T')[0];
              let initialStart = todayStr;
              let initialEnd = '';

              if (firstGuest) {
                if (firstGuest.monthly_fee && firstGuest.monthly_fee > 0) {
                  initialAmount = firstGuest.monthly_fee.toString();
                } else if (firstGuest.agreed_rent && firstGuest.agreed_rent > 0) {
                  initialAmount = firstGuest.agreed_rent.toString();
                }

                if (firstGuest.admission_date) {
                  const cycle = getCycleForDate(firstGuest.admission_date, todayStr);
                  initialStart = cycle.periodStart;
                  initialEnd = cycle.periodEnd;
                } else if (firstGuest.current_period_start && firstGuest.current_period_end) {
                  initialStart = firstGuest.current_period_start;
                  initialEnd = firstGuest.current_period_end;
                } else {
                  const cycle = calculateBillingPeriod(todayStr);
                  initialStart = cycle.periodStart;
                  initialEnd = cycle.periodEnd;
                }
              }

              setFormData({
                guest_id: firstGuest?.id.toString() || '',
                date: todayStr,
                fee_type: 'Hostel Accommodation Fee',
                amount: initialAmount,
                discount: '0',
                paid_amount: initialAmount,
                balance_amount: '0',
                payment_mode: 'Cash',
                payment_reference: '',
                period_start: initialStart,
                period_end: initialEnd,
                remarks: '',
              });
              setIsCreateOpen(true);
            }}
          >
            Create Fee Receipt
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={receipts}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No fee receipts recorded yet."
      />

      {/* CREATE RECEIPT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Issue Fee Receipt"
        subtitle="Records payment into accounting ledger automatically"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Resident"
              value={formData.guest_id}
              onChange={(e) => handleResidentChange(e.target.value)}
              options={[
                { value: '', label: 'Select Resident...' },
                ...guests.map((g) => ({
                  value: g.id,
                  label: `${g.name} (${g.room_number ? `Room ${g.room_number}` : g.contact_no}${g.monthly_fee ? ` • ₹${g.monthly_fee.toLocaleString()}/mo` : ''})`,
                })),
              ]}
              required
            />
            <Input
              label="Receipt Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {guests.find((g) => g.id.toString() === formData.guest_id) && (() => {
            const guestInfo = guests.find((g) => g.id.toString() === formData.guest_id);
            return (
              <div className="p-3 bg-purple-50/80 border border-purple-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-navy-900 block flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Resident Rent Agreement: <strong className="text-emerald-700">₹{(guestInfo?.monthly_fee || guestInfo?.agreed_rent || 0).toLocaleString()} / month</strong>
                  </span>
                  <span className="text-slate-600 mt-0.5 block">
                    Billing Period: <strong className="text-primary">{formatDateDDMMYYYY(formData.period_start)}</strong> to <strong className="text-primary">{formatDateDDMMYYYY(formData.period_end)}</strong>
                  </span>
                </div>
                {guestInfo?.admission_date && (
                  <div className="sm:text-right bg-white px-2.5 py-1 rounded-lg border border-purple-200/60 shadow-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Check-in Date</span>
                    <span className="font-semibold text-slate-700">{formatDateDDMMYYYY(guestInfo.admission_date)}</span>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Billing Period Start"
              type="date"
              value={formData.period_start}
              onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
            />
            <Input
              label="Billing Period End"
              type="date"
              value={formData.period_end}
              onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Fee Type"
              value={formData.fee_type}
              onChange={(e) => setFormData({ ...formData, fee_type: e.target.value })}
              options={[
                { value: 'Hostel Accommodation Fee', label: 'Hostel Accommodation Fee' },
                { value: 'Security Deposit', label: 'Security Deposit' },
                { value: 'Mess & Food Fee', label: 'Mess & Food Fee' },
                { value: 'Electricity & Utilities', label: 'Electricity & Utilities' },
                { value: 'Maintenance & Service', label: 'Maintenance & Service' },
                { value: 'Other / Miscellaneous', label: 'Other / Miscellaneous' },
              ]}
              required
            />
            <Select
              label="Payment Mode"
              value={formData.payment_mode}
              onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'UPI', label: 'UPI / Online Transfer' },
                { value: 'Bank', label: 'Bank Transfer / NEFT / Cheque' },
                { value: 'Card', label: 'Debit / Credit Card' },
                { value: 'Other', label: 'Other Mode' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Fee Amount (₹)"
              type="number"
              value={formData.amount}
              onChange={(e) => handleAmountChange(e.target.value, formData.discount)}
              required
            />
            <Input
              label="Discount (₹)"
              type="number"
              value={formData.discount}
              onChange={(e) => handleAmountChange(formData.amount, e.target.value)}
            />
            <Input
              label="Paid Amount (₹)"
              type="number"
              value={formData.paid_amount}
              onChange={(e) => handlePaidChange(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Balance Amount (₹)"
              type="number"
              value={formData.balance_amount}
              onChange={(e) => setFormData({ ...formData, balance_amount: e.target.value })}
              readOnly
            />
            <Input
              label="Payment Reference / UTR"
              placeholder="e.g. UPI Ref / Cheque No / Card Auth"
              value={formData.payment_reference}
              onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Period Start"
              type="date"
              value={formData.period_start}
              onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
            />
            <Input
              label="Period End"
              type="date"
              value={formData.period_end}
              onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
            />
          </div>

          <Input
            label="Remarks / Notes"
            placeholder="e.g. Monthly rent for September 2026"
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          />

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
              Generate & Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW / PRINT / PDF RECEIPT MODAL */}
      <Modal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title="Official Fee Receipt Voucher"
        subtitle={selectedReceipt?.receipt_no}
        maxWidth="3xl"
      >
        {selectedReceipt && (
          <div className="flex flex-col gap-5">
            {/* Scrollable Container for Mobile Responsiveness */}
            <div className="w-full overflow-x-auto bg-slate-100/70 p-2 sm:p-6 rounded-xl border border-slate-200/80 flex justify-center">
              {/* Printable Receipt Canvas Matching Reference PDF Exactly */}
              <div
                id="printable-receipt"
                ref={receiptPrintRef}
                className="w-full max-w-[690px] bg-white border border-slate-200 shadow-sm p-6 sm:p-10 text-slate-800 text-left font-sans shrink-0 select-text"
                style={{
                  minWidth: '320px',
                  fontFamily: 'Montserrat, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                {/* 1. TOP HEADER */}
                <div className="flex justify-between items-start gap-4">
                  {/* Left: Official Logo & Address */}
                  <div>
                    <img
                      src={zellaLogo}
                      alt="Zella Ladies Hostel"
                      className="h-12 sm:h-14 w-auto object-contain object-left mb-3"
                    />
                    <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 uppercase">
                      ZELLA LADIES HOSTEL
                    </h1>
                    <div className="text-[11px] text-slate-600 leading-snug mt-1">
                      <p>Musaffa Tower, Opp. Bharat Petroleum, Near Neha Hospital,</p>
                      <p>Main Road, Kottakkal, Malappuram Dist - 676503</p>
                      <p className="mt-0.5">Phone: +91 920 7000 923; +91 9207000924</p>
                    </div>
                  </div>

                  {/* Right: Receipt Heading, Number & Date */}
                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-bold tracking-wider text-[#0A68A7] uppercase mb-1">
                      OFFICIAL FEE RECEIPT
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] mb-1">
                      {selectedReceipt.receipt_no}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Receipt Date: {formatDateDMY(selectedReceipt.date)}
                    </div>
                  </div>
                </div>

                {/* Horizontal Divider */}
                <div className="border-b border-slate-200 my-5" />

                {/* 2. RECEIPT & PAYMENT METADATA */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs mb-5">
                  <div className="flex items-baseline">
                    <span className="w-36 font-semibold text-slate-700 shrink-0">Receipt No:</span>
                    <span className="text-slate-900 font-medium">{selectedReceipt.receipt_no}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-28 font-semibold text-slate-700 shrink-0">Receipt Date:</span>
                    <span className="text-slate-900 font-medium">{formatDateDMY(selectedReceipt.date)}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-36 font-semibold text-slate-700 shrink-0 leading-tight">
                      Payment<br />Transaction:
                    </span>
                    <span className="text-slate-900 font-medium">
                      {selectedReceipt.payment_reference || selectedReceipt.fee_type || 'Hostel Fee Payment'}
                    </span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-28 font-semibold text-slate-700 shrink-0">Payment Mode:</span>
                    <span className="text-slate-900 font-medium">{selectedReceipt.payment_mode}</span>
                  </div>
                </div>

                {/* 3. RECEIVED FROM GUEST INFORMATION */}
                <div className="mb-5">
                  <div className="text-xs font-bold text-slate-900 mb-2">
                    Received From:
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-baseline">
                      <span className="w-28 font-medium text-slate-600 shrink-0">Name:</span>
                      <span className="text-slate-900 font-semibold">{selectedReceipt.guest?.name || 'Resident'}</span>
                    </div>
                    {selectedReceipt.guest?.email && (
                      <div className="flex items-baseline">
                        <span className="w-28 font-medium text-slate-600 shrink-0">Email:</span>
                        <span className="text-slate-800 font-normal">{selectedReceipt.guest.email}</span>
                      </div>
                    )}
                    <div className="flex items-baseline">
                      <span className="w-28 font-medium text-slate-600 shrink-0">Mobile:</span>
                      <span className="text-slate-800 font-normal">{selectedReceipt.guest?.contact_no || 'N/A'}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 font-medium text-slate-600 shrink-0">Room &amp; Bed:</span>
                      <span className="text-slate-800 font-normal">{formatRoomBed(selectedReceipt)}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-28 font-medium text-slate-600 shrink-0">Package:</span>
                      <span className="text-slate-800 font-normal">{formatPackage(selectedReceipt)}</span>
                    </div>
                  </div>
                </div>

                {/* 4. PROFESSIONAL PAYMENT TABLE WITH BLUE HEADER */}
                <div className="border border-slate-200 overflow-hidden mb-5">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0A68A7] text-white">
                        <th className="py-2.5 px-4 font-semibold text-left w-[46%]">
                          Nature of Service
                        </th>
                        <th className="py-2.5 px-4 font-semibold text-left w-[32%]">
                          Billing Period
                        </th>
                        <th className="py-2.5 px-4 font-semibold text-right w-[22%]">
                          Amount Collected (INR)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      <tr>
                        <td className="py-3 px-4 text-slate-900 font-medium">
                          {selectedReceipt.fee_type || 'Hostel Accommodation Fee'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-normal">
                          {formatBillingPeriod(selectedReceipt)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          ₹ {selectedReceipt.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                      {selectedReceipt.discount ? (
                        <tr className="bg-slate-50/50">
                          <td className="py-2 px-4 text-slate-600 font-normal">
                            Discount / Concession Applied
                          </td>
                          <td className="py-2 px-4 text-slate-500 font-normal">
                            Special Offer
                          </td>
                          <td className="py-2 px-4 text-right font-semibold text-rose-600">
                            - ₹ {selectedReceipt.discount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {/* 5. FINANCIAL SUMMARY */}
                <div className="space-y-1.5 text-xs mb-6">
                  <div className="flex items-center">
                    <span className="w-40 text-slate-700 font-normal">Total Fee</span>
                    <span className="w-4 text-slate-500 text-center">:</span>
                    <span className="font-semibold text-slate-900 pl-1">
                      ₹ {selectedReceipt.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-40 text-slate-700 font-normal">Amount Received</span>
                    <span className="w-4 text-slate-500 text-center">:</span>
                    <span className="font-semibold text-slate-900 pl-1">
                      ₹ {(selectedReceipt.paid_amount ?? selectedReceipt.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {selectedReceipt.discount ? (
                    <div className="flex items-center">
                      <span className="w-40 text-slate-700 font-normal">Offer Applied / Discount</span>
                      <span className="w-4 text-slate-500 text-center">:</span>
                      <span className="font-semibold text-rose-600 pl-1">
                        ₹ {selectedReceipt.discount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ) : null}
                  {selectedReceipt.balance_amount && selectedReceipt.balance_amount > 0 ? (
                    <div className="flex items-center">
                      <span className="w-40 text-slate-700 font-normal">Balance Amount Payable</span>
                      <span className="w-4 text-slate-500 text-center">:</span>
                      <span className="font-semibold text-rose-600 pl-1">
                        ₹ {selectedReceipt.balance_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center">
                    <span className="w-40 text-slate-700 font-normal">Payment Status</span>
                    <span className="w-4 text-slate-500 text-center">:</span>
                    <span className="font-bold text-emerald-700 uppercase pl-1 tracking-wide">
                      {selectedReceipt.balance_amount && selectedReceipt.balance_amount > 0
                        ? 'PARTIALLY PAID'
                        : 'PAID / SETTLED'}
                    </span>
                  </div>
                </div>

                {/* 6. RECEIPT NOTE */}
                <div className="mb-8">
                  <div className="text-xs font-bold text-slate-900 mb-1">
                    Receipt Note:
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
                    {selectedReceipt.remarks ||
                      'This document acknowledges receipt of the amount stated above for the hostel accommodation fee. Please retain this receipt for your records.'}
                  </p>
                </div>

                {/* 7. BOTTOM SECTION: SEAL (BOTTOM-LEFT) & SIGNATORY (BOTTOM-RIGHT) ON EXACT SAME HORIZONTAL BASELINE */}
                <div className="flex items-end justify-between pt-4 mt-6">
                  {/* Bottom-Left: Circular Blue Stamp */}
                  <div className="flex flex-col items-start select-none">
                    <ZellaHostelSeal className="w-24 h-24" />
                  </div>

                  {/* Bottom-Right: Authorized Signatory */}
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      AUTHORIZED SIGNATORY
                    </div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">
                      Zella Ladies Hostel Administration
                    </div>
                    <div className="text-[10px] text-slate-400 italic mt-0.5">
                      Computer-generated receipt
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <Button
                variant="outline"
                icon={<Printer className="w-4 h-4" />}
                onClick={handlePrint}
                disabled={isSharingWhatsapp || isExportingPdf}
                className="w-full sm:w-auto"
              >
                Print Receipt
              </Button>
              <Button
                variant="primary"
                icon={<Download className="w-4 h-4" />}
                onClick={handleDownloadPdf}
                isLoading={isExportingPdf}
                disabled={isSharingWhatsapp || isExportingPdf}
                className="w-full sm:w-auto"
              >
                Download PDF
              </Button>
              <Button
                variant="whatsapp"
                icon={<WhatsAppIcon className="w-4 h-4" />}
                onClick={handleShareWhatsApp}
                isLoading={isSharingWhatsapp}
                disabled={isSharingWhatsapp || isExportingPdf}
                className="w-full sm:w-auto"
              >
                Share on WhatsApp
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
