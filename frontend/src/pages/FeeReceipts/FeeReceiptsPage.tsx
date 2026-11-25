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
  MapPin,
  Mail,
  Phone,
  Edit3,
  Check,
  RotateCcw,
  Sliders,
  X,
  Save,
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
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isSavingReceipt, setIsSavingReceipt] = useState<boolean>(false);

  const [receiptEditState, setReceiptEditState] = useState({
    guestName: '',
    roomNo: '',
    receiptNo: '',
    receiptDate: '',
    description: '',
    amount: '',
    paymentMode: 'Cash',
    transactionDate: '',
    refundPolicyTitle: 'REFUND POLICY',
    refundPolicyText:
      'Refund Policies and Accommodation Charges are Determined Based on the Fee Structure Outlined within Specific Packages. We Ensure Transparency in all terms and Conditions. No Refunds will be issued for Stays of 20 days or more!',
    feeStructureTitle: 'FEE STRUCTURE',
    showSealAndSignature: false,
    redAccent: true,
  });

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

  // Synchronize receipt editor state whenever a receipt is opened or updated
  useEffect(() => {
    if (selectedReceipt) {
      const targetGuest = selectedReceipt.guest;
      const rawGuestName = targetGuest?.name || 'NAME';
      const room = selectedReceipt.room_number || targetGuest?.room_number;
      const bed = targetGuest?.bed_number;
      const roomStr = room
        ? bed && bed !== 'Not Assigned'
          ? `ROOM NO. ${room} - BED ${bed}`
          : `ROOM NO. ${room}`
        : 'ROOM NO.';

      const defaultDesc = selectedReceipt.fee_type || 'July Month Rent';
      const defaultAmt = (selectedReceipt.paid_amount ?? selectedReceipt.amount ?? 0).toLocaleString('en-IN');
      const recDate = formatDateDMY(selectedReceipt.date) || '01/01/2026';

      setReceiptEditState({
        guestName: rawGuestName,
        roomNo: roomStr,
        receiptNo: selectedReceipt.receipt_no || '1000',
        receiptDate: recDate,
        description: defaultDesc,
        amount: defaultAmt,
        paymentMode: selectedReceipt.payment_mode || 'Cash',
        transactionDate: recDate,
        refundPolicyTitle: 'REFUND POLICY',
        refundPolicyText:
          'Refund Policies and Accommodation Charges are Determined Based on the Fee Structure Outlined within Specific Packages. We Ensure Transparency in all terms and Conditions. No Refunds will be issued for Stays of 20 days or more!',
        feeStructureTitle: 'FEE STRUCTURE',
        showSealAndSignature: false,
        redAccent: true,
      });
      setIsEditorOpen(false);
    }
  }, [selectedReceipt?.id, selectedReceipt?.guest?.id]);

  const handleSaveReceiptEdits = async () => {
    if (!selectedReceipt) return;
    setIsSavingReceipt(true);
    try {
      const parsedAmount = parseFloat(receiptEditState.amount.replace(/,/g, ''));
      const updatePayload: Partial<FeeReceipt> = {
        fee_type: receiptEditState.description,
        payment_mode:
          receiptEditState.paymentMode === 'UPI / BANK' ||
          receiptEditState.paymentMode === 'UPI' ||
          receiptEditState.paymentMode === 'Bank'
            ? 'UPI'
            : 'Cash',
      };
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        updatePayload.paid_amount = parsedAmount;
      }
      const updated = await feeReceiptService.updateReceipt(selectedReceipt.id, updatePayload);
      setSelectedReceipt((prev) => (prev ? { ...prev, ...updated } : prev));
      setReceipts((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      success('Receipt customization saved successfully!', 'Saved');
    } catch (err) {
      console.warn('Failed to save receipt updates:', err);
      toastError('Could not save to database, but current preview is updated for print & download.');
    } finally {
      setIsSavingReceipt(false);
    }
  };

  const handleResetReceiptEdits = () => {
    if (!selectedReceipt) return;
    const targetGuest = selectedReceipt.guest;
    const rawGuestName = targetGuest?.name || 'NAME';
    const room = selectedReceipt.room_number || targetGuest?.room_number;
    const bed = targetGuest?.bed_number;
    const roomStr = room
      ? bed && bed !== 'Not Assigned'
        ? `ROOM NO. ${room} - BED ${bed}`
        : `ROOM NO. ${room}`
      : 'ROOM NO.';
    const recDate = formatDateDMY(selectedReceipt.date) || '01/01/2026';

    setReceiptEditState({
      guestName: rawGuestName,
      roomNo: roomStr,
      receiptNo: selectedReceipt.receipt_no || '1000',
      receiptDate: recDate,
      description: selectedReceipt.fee_type || 'July Month Rent',
      amount: (selectedReceipt.paid_amount ?? selectedReceipt.amount ?? 0).toLocaleString('en-IN'),
      paymentMode: selectedReceipt.payment_mode || 'Cash',
      transactionDate: recDate,
      refundPolicyTitle: 'REFUND POLICY',
      refundPolicyText:
        'Refund Policies and Accommodation Charges are Determined Based on the Fee Structure Outlined within Specific Packages. We Ensure Transparency in all terms and Conditions. No Refunds will be issued for Stays of 20 days or more!',
      feeStructureTitle: 'FEE STRUCTURE',
      showSealAndSignature: false,
      redAccent: true,
    });
    success('Receipt fields restored to original database values.');
  };

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
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
      const cleanReceiptNo = (receiptEditState.receiptNo || selectedReceipt?.receipt_no || 'Fee_Receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Zella_Receipt_${cleanReceiptNo}.pdf`;

      const opt = {
        margin: [6, 8, 6, 8],
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
      const cleanReceiptNo = (receiptEditState.receiptNo || selectedReceipt.receipt_no).replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Zella_Receipt_${cleanReceiptNo}.pdf`;

      const opt = {
        margin: [6, 8, 6, 8],
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
        title="Official Proof of Payment"
        subtitle={receiptEditState.receiptNo || selectedReceipt?.receipt_no}
        maxWidth="3xl"
      >
        {selectedReceipt && (() => {
          const isUpiOrBank =
            receiptEditState.paymentMode.toUpperCase().includes('UPI') ||
            receiptEditState.paymentMode.toUpperCase().includes('BANK') ||
            receiptEditState.paymentMode.toUpperCase().includes('ONLINE') ||
            receiptEditState.paymentMode.toUpperCase().includes('CARD');
          const isCash =
            !isUpiOrBank &&
            (receiptEditState.paymentMode.toUpperCase().includes('CASH') || !receiptEditState.paymentMode);

          return (
            <div className="flex flex-col gap-4">
              {/* RECEIPT CUSTOMIZATION & LIVE EDITOR DRAWER */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(!isEditorOpen)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                        isEditorOpen
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditorOpen ? 'Hide Receipt Editor' : 'Edit Receipt Fields'}</span>
                    </button>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      Customize red-highlighted fields, text color &amp; stamp before generating PDF
                    </span>
                  </div>

                  {/* Quick Toggles */}
                  <div className="flex items-center gap-3 text-xs">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-semibold">
                      <input
                        type="checkbox"
                        checked={receiptEditState.redAccent}
                        onChange={(e) =>
                          setReceiptEditState((prev) => ({ ...prev, redAccent: e.target.checked }))
                        }
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                      />
                      <span className="text-rose-600 font-bold">Red Accent Fields</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-semibold">
                      <input
                        type="checkbox"
                        checked={receiptEditState.showSealAndSignature}
                        onChange={(e) =>
                          setReceiptEditState((prev) => ({
                            ...prev,
                            showSealAndSignature: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                      <span>Include Seal &amp; Signature</span>
                    </label>
                  </div>
                </div>

                {/* Collapsible Edit Form */}
                {isEditorOpen && (
                  <div className="p-4 bg-slate-50/60 border-b border-slate-200 animate-fade-in text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {/* Red Field: Guest Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-rose-600 uppercase mb-1">
                          Resident Name (Red Field)
                        </label>
                        <input
                          type="text"
                          value={receiptEditState.guestName}
                          onChange={(e) =>
                            setReceiptEditState((prev) => ({ ...prev, guestName: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold text-slate-800"
                          placeholder="e.g. MOHAMMED"
                        />
                      </div>

                      {/* Red Field: Room No */}
                      <div>
                        <label className="block text-[11px] font-bold text-rose-600 uppercase mb-1">
                          Room / Bed No (Red Field)
                        </label>
                        <input
                          type="text"
                          value={receiptEditState.roomNo}
                          onChange={(e) =>
                            setReceiptEditState((prev) => ({ ...prev, roomNo: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold text-slate-800"
                          placeholder="e.g. ROOM NO. 101 - BED A"
                        />
                      </div>

                      {/* Red Field: Description */}
                      <div>
                        <label className="block text-[11px] font-bold text-rose-600 uppercase mb-1">
                          Description (Red Field)
                        </label>
                        <input
                          type="text"
                          value={receiptEditState.description}
                          onChange={(e) =>
                            setReceiptEditState((prev) => ({ ...prev, description: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold text-slate-800"
                          placeholder="e.g. July Month Rent"
                        />
                      </div>

                      {/* Red Field: Amount */}
                      <div>
                        <label className="block text-[11px] font-bold text-rose-600 uppercase mb-1">
                          Amount Collected (₹) (Red Field)
                        </label>
                        <input
                          type="text"
                          value={receiptEditState.amount}
                          onChange={(e) =>
                            setReceiptEditState((prev) => ({ ...prev, amount: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold text-slate-800"
                          placeholder="e.g. 5,500"
                        />
                      </div>

                      {/* Receipt No */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Receipt No
                        </label>
                        <input
                          type="text"
                          value={receiptEditState.receiptNo}
                          onChange={(e) =>
                            setReceiptEditState((prev) => ({ ...prev, receiptNo: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-800"
                        />
                      </div>

                      {/* Receipt Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Receipt Date
                        </label>
                        <input
                          type="text"
                          value={receiptEditState.receiptDate}
                          onChange={(e) =>
                            setReceiptEditState((prev) => ({ ...prev, receiptDate: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-800"
                          placeholder="DD/MM/YYYY"
                        />
                      </div>

                      {/* Transaction Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Transaction Date
                        </label>
                        <input
                          type="text"
                          value={receiptEditState.transactionDate}
                          onChange={(e) =>
                            setReceiptEditState((prev) => ({ ...prev, transactionDate: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-800"
                          placeholder="DD/MM/YYYY"
                        />
                      </div>

                      {/* Mode of Payment */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Mode of Payment
                        </label>
                        <select
                          value={receiptEditState.paymentMode}
                          onChange={(e) =>
                            setReceiptEditState((prev) => ({ ...prev, paymentMode: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-800"
                        >
                          <option value="Cash">CASH</option>
                          <option value="UPI">UPI / BANK</option>
                          <option value="Bank">BANK TRANSFER</option>
                          <option value="Card">CARD</option>
                        </select>
                      </div>

                      {/* Action Buttons */}
                      <div className="sm:col-span-2 md:col-span-1 flex items-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveReceiptEdits}
                          disabled={isSavingReceipt}
                          className="flex-1 px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-600 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSavingReceipt ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleResetReceiptEdits}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1 transition-colors"
                          title="Reset to database values"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable Container for Mobile Responsiveness */}
              <div className="w-full overflow-x-auto bg-slate-100/70 p-2 sm:p-6 rounded-xl border border-slate-200/80 flex justify-center">
                {/* Printable Receipt Canvas Matching Reference PDF Exactly */}
                <div
                  id="printable-receipt"
                  ref={receiptPrintRef}
                  className="w-full max-w-[690px] bg-white border border-slate-200 shadow-sm text-slate-900 text-left font-sans shrink-0 select-text overflow-hidden"
                  style={{
                    padding: '36px 36px 0px 36px',
                    minWidth: '320px',
                    backgroundColor: '#ffffff',
                    fontFamily:
                      'Montserrat, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
                >
                  {/* 1. TOP HEADER */}
                  <div className="flex justify-between items-start gap-4">
                    {/* Left: Official Logo & ISO Certification Badge */}
                    <div className="flex flex-col items-start">
                      <img
                        src={zellaLogo}
                        alt="Zella Ladies Hostel"
                        className="h-12 sm:h-14 w-auto object-contain object-left mb-1.5"
                      />
                      <div className="inline-block bg-[#0B1A42] text-white text-[9px] font-bold tracking-wider px-2.5 py-0.5 rounded-xs uppercase">
                        An ISO 9001 - 2015 Certified Hostel
                      </div>
                    </div>

                    {/* Right: Contact Information */}
                    <div className="flex flex-col items-start gap-1 text-[11px] text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                        <span className="font-medium">Opp. Bharat Petroleum, Kottakkal</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                        <span className="font-medium">zellahostel@gmail.com</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                        <span className="font-bold text-slate-900">9645 7000 27 | 9645 7000 28</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. TITLE & RECEIVED FROM METADATA */}
                  <div className="mt-8 flex justify-between items-start gap-4">
                    {/* Left: RECEIVED FROM & Red-highlighted Dynamic Fields */}
                    <div>
                      <div className="text-xs font-bold text-slate-700 tracking-wider uppercase mb-1">
                        RECEIVED FROM
                      </div>
                      <div
                        className="text-sm font-extrabold uppercase tracking-wide leading-tight"
                        style={{ color: receiptEditState.redAccent ? '#C53030' : '#1E293B' }}
                      >
                        {receiptEditState.guestName}
                      </div>
                      <div
                        className="text-xs font-bold uppercase tracking-wide mt-1"
                        style={{ color: receiptEditState.redAccent ? '#C53030' : '#1E293B' }}
                      >
                        {receiptEditState.roomNo}
                      </div>
                    </div>

                    {/* Right: Proof of Payment & Receipt Details */}
                    <div className="text-right shrink-0">
                      <div className="text-2xl sm:text-[26px] font-extrabold text-[#2D3748] tracking-tight leading-none mb-2">
                        Proof of Payment
                      </div>
                      <div className="text-xs font-semibold text-slate-800">
                        <span className="font-bold text-slate-900">No. : </span>
                        {receiptEditState.receiptNo}
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-1">
                        <span className="font-bold text-slate-900">Date : </span>
                        {receiptEditState.receiptDate}
                      </div>
                    </div>
                  </div>

                  {/* 3. MAIN PAYMENT TABLE (DESCRIPTION | AMOUNT) */}
                  <div className="mt-6 border-t-2 border-b border-slate-900 overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-900">
                          <th className="py-2.5 px-3 font-extrabold uppercase tracking-wider text-left border-r border-slate-900 w-[78%]">
                            DESCRIPTION
                          </th>
                          <th className="py-2.5 px-3 font-extrabold uppercase tracking-wider text-right w-[22%]">
                            AMOUNT
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="min-h-[55px]">
                          <td className="py-6 px-3 border-r border-slate-900 align-middle">
                            <span
                              className="text-sm sm:text-base font-bold"
                              style={{ color: receiptEditState.redAccent ? '#C53030' : '#1E293B' }}
                            >
                              {receiptEditState.description}
                            </span>
                          </td>
                          <td className="py-6 px-3 text-right align-middle">
                            <span
                              className="text-sm sm:text-base font-bold"
                              style={{ color: receiptEditState.redAccent ? '#C53030' : '#1E293B' }}
                            >
                              ₹{receiptEditState.amount}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 4. MODE OF PAYMENT & TRANSACTION DATE */}
                  <div className="mt-4 flex flex-wrap justify-between items-center gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-slate-900 tracking-wider uppercase">
                        MODE OF PAYMENT
                      </span>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                        <span className="w-3.5 h-3.5 border border-slate-900 inline-flex items-center justify-center text-[10px] font-black">
                          {isUpiOrBank ? '✓' : ''}
                        </span>
                        <span>UPI / BANK</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-800 ml-1">
                        <span className="w-3.5 h-3.5 border border-slate-900 inline-flex items-center justify-center text-[10px] font-black">
                          {isCash ? '✓' : ''}
                        </span>
                        <span>CASH</span>
                      </label>
                    </div>
                    <div className="font-extrabold text-slate-900 tracking-wider uppercase">
                      TRANSACTION DATE &nbsp; {receiptEditState.transactionDate}
                    </div>
                  </div>

                  {/* Computer-generated payment notice matching reference */}
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium text-center sm:text-right mt-3">
                    **This is computer generated payment proof, no signature required
                  </div>
                  <div className="border-b border-slate-200 mt-2.5 mb-4" />

                  {/* 5. REFUND POLICY */}
                  <div className="mb-4">
                    <div
                      className="text-xs sm:text-sm font-extrabold tracking-wider uppercase mb-1"
                      style={{ color: '#C53030' }}
                    >
                      {receiptEditState.refundPolicyTitle}
                    </div>
                    <p className="text-[10.5px] sm:text-[11.5px] text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                      {receiptEditState.refundPolicyText}
                    </p>
                  </div>

                  {/* 6. FEE STRUCTURE SECTION */}
                  <div>
                    <div
                      className="text-xs sm:text-sm font-extrabold tracking-wider uppercase mb-1.5"
                      style={{ color: '#C53030' }}
                    >
                      {receiptEditState.feeStructureTitle}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      {/* Left: Fee Structure Rates Table */}
                      <div className="w-full sm:w-[50%] max-w-[340px] border-t border-b border-slate-900">
                        <table className="w-full text-[10.5px] text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-900 text-slate-900 font-bold">
                              <th className="py-1 px-2.5 border-r border-slate-900 w-[55%] font-bold">DURATION</th>
                              <th className="py-1 px-2.5 w-[45%] font-bold">PRICE</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            <tr>
                              <td className="py-0.5 px-2.5 border-r border-slate-900 font-medium text-slate-800">1 DAY</td>
                              <td className="py-0.5 px-2.5 font-semibold text-slate-900">₹ 500/-</td>
                            </tr>
                            <tr>
                              <td className="py-0.5 px-2.5 border-r border-slate-900 font-medium text-slate-800">2 TO 5 DAYS</td>
                              <td className="py-0.5 px-2.5 font-semibold text-slate-900">₹ 350/- Per Day</td>
                            </tr>
                            <tr>
                              <td className="py-0.5 px-2.5 border-r border-slate-900 font-medium text-slate-800">5 TO 10 DAYS</td>
                              <td className="py-0.5 px-2.5 font-semibold text-slate-900">₹ 2500/-</td>
                            </tr>
                            <tr>
                              <td className="py-0.5 px-2.5 border-r border-slate-900 font-medium text-slate-800">10 TO 15 DAYS</td>
                              <td className="py-0.5 px-2.5 font-semibold text-slate-900">₹ 3500/-</td>
                            </tr>
                            <tr>
                              <td className="py-0.5 px-2.5 border-r border-slate-900 font-medium text-slate-800">15 TO 20 DAYS</td>
                              <td className="py-0.5 px-2.5 font-semibold text-slate-900">₹ 4500/-</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Right: Optional Official Seal & Signature (when toggled on by admin) */}
                      {receiptEditState.showSealAndSignature && (
                        <div className="w-full sm:w-[45%] flex items-end justify-between pt-1 self-stretch">
                          <div className="flex flex-col items-center">
                            <ZellaHostelSeal className="w-20 h-20" />
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                              AUTHORIZED SIGNATORY
                            </div>
                            <div className="text-[10px] font-semibold text-slate-700 mt-0.5">
                              Zella Ladies Hostel Administration
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Package Types & Food inclusion notice matching reference */}
                    <div className="mt-3 text-[11px] leading-tight">
                      <div className="font-extrabold text-slate-900 uppercase tracking-wide">
                        WE OFFER 20 TO 30 DAY PACKAGES IN TWO TYPES
                      </div>
                      <div className="font-bold text-slate-900 mt-0.5">
                        ₹ 5000/- (Upper Bed) &nbsp; | &nbsp; ₹ 5500/- (Bottom Bed)
                      </div>
                      <div className="font-extrabold text-[#D81B60] uppercase tracking-wide mt-0.5">
                        ALL PACKAGES INCLUDE FOUR TIMES FOOD A DAY
                      </div>
                    </div>
                  </div>

                  {/* 7. BOTTOM ACCENT BAR */}
                  <div
                    className="w-full h-3 bg-[#D81B60] mt-7"
                    style={{
                      marginLeft: '-36px',
                      marginRight: '-36px',
                      width: 'calc(100% + 72px)',
                    }}
                  />
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
          );
        })()}
      </Modal>
    </div>
  );
};
