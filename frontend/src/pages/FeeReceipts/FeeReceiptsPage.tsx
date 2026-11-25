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
import zellaLogo from '../../assets/zella_logo.png';
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
      const html2canvasModule = await import('html2canvas');
      const html2canvas = (html2canvasModule.default || html2canvasModule) as unknown as (
        element: HTMLElement,
        options?: any
      ) => Promise<HTMLCanvasElement>;
      const { jsPDF } = await import('jspdf');

      const cleanReceiptNo = (receiptEditState.receiptNo || selectedReceipt?.receipt_no || 'Fee_Receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Zella_Receipt_${cleanReceiptNo}.pdf`;

      // 1. Ensure all custom webfonts are loaded before rendering
      if (document.fonts) {
        await document.fonts.ready;
      }

      // 2. Capture the exact live DOM preview with high resolution (scale: 2.5)
      const canvas = await html2canvas(receiptPrintRef.current, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollY: 0,
        scrollX: 0,
      });

      // 3. Create exact single-page A4 PDF (210mm x 297mm) matching print copy
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(filename);
      success('Receipt PDF downloaded successfully (Exact A4 Print Copy)!');
    } catch (err) {
      toastError('Failed to generate PDF');
    } finally {
      setIsExportingPdf(false);
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
                {/* Printable Receipt Canvas Matching Exact A4 Print Dimensions (210mm x 297mm) */}
                <div
                  id="printable-receipt"
                  ref={receiptPrintRef}
                  className="bg-white border border-slate-200 shadow-sm text-slate-900 text-left font-sans shrink-0 select-text flex flex-col justify-between"
                  style={{
                    width: '210mm',
                    minWidth: '210mm',
                    maxWidth: '210mm',
                    minHeight: '297mm',
                    maxHeight: '297mm',
                    boxSizing: 'border-box',
                    padding: '15mm 20mm',
                    backgroundColor: '#ffffff',
                    fontFamily:
                      'Montserrat, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Top & Main Content Container with Exact Model Margins */}
                  <div className="flex-1 flex flex-col justify-between">
                    {/* 1. TOP HEADER */}
                    <div className="flex justify-between items-start gap-4">
                      {/* Left: Official Logo & ISO Certification Badge */}
                      <div className="flex flex-col items-start">
                        <img
                          src={zellaLogo}
                          alt="Zella Ladies Hostel"
                          className="h-[46px] w-auto object-contain object-left mb-1"
                        />
                        <div className="inline-block bg-[#0B1A42] text-white text-[8px] font-bold tracking-wider px-2 py-0.5 rounded-xs uppercase">
                          An ISO 9001 - 2015 Certified Hostel
                        </div>
                      </div>

                      {/* Right: Contact Information */}
                      <div className="flex flex-col items-start gap-1 text-[10.5px] text-slate-800">
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
                    <div className="mt-5 flex justify-between items-start gap-4">
                      {/* Left: RECEIVED FROM & Red-highlighted Dynamic Fields */}
                      <div>
                        <div className="text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-0.5">
                          RECEIVED FROM
                        </div>
                        <div
                          className="text-[13px] font-extrabold uppercase tracking-wide leading-tight"
                          style={{ color: receiptEditState.redAccent ? '#C53030' : '#1E293B' }}
                        >
                          {receiptEditState.guestName}
                        </div>
                        <div
                          className="text-[11px] font-bold uppercase tracking-wide mt-0.5"
                          style={{ color: receiptEditState.redAccent ? '#C53030' : '#1E293B' }}
                        >
                          {receiptEditState.roomNo}
                        </div>
                      </div>

                      {/* Right: Proof of Payment & Receipt Details */}
                      <div className="text-right shrink-0">
                        <div className="text-[23px] font-extrabold text-[#2D3748] tracking-tight leading-none mb-1.5">
                          Proof of Payment
                        </div>
                        <div className="text-[11px] font-semibold text-slate-800">
                          <span className="font-bold text-slate-900">No. : </span>
                          {receiptEditState.receiptNo}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-800 mt-0.5">
                          <span className="font-bold text-slate-900">Date : </span>
                          {receiptEditState.receiptDate}
                        </div>
                      </div>
                    </div>

                    {/* 3. MAIN PAYMENT TABLE (DESCRIPTION | AMOUNT) */}
                    <div className="mt-5 w-full text-slate-900">
                      {/* Top border line */}
                      <div className="w-full h-[1.5px] bg-slate-900" />

                      {/* Header Row */}
                      <div className="flex h-[26px]">
                        <div className="px-2.5 font-extrabold uppercase tracking-wider text-left border-r border-slate-900 w-[76.7%] text-[11px] flex items-center">
                          DESCRIPTION
                        </div>
                        <div className="px-2.5 font-extrabold uppercase tracking-wider text-right w-[23.3%] text-[11px] flex items-center justify-end">
                          AMOUNT
                        </div>
                      </div>

                      {/* Middle separator line */}
                      <div className="w-full h-[1px] bg-slate-900" />

                      {/* Content Row - items-stretch ensures vertical divider reaches bottom line */}
                      <div className="flex min-h-[46px] items-stretch">
                        <div className="py-2.5 px-2.5 border-r border-slate-900 w-[76.7%] flex items-center">
                          <span
                            className="text-[13.5px] font-bold"
                            style={{ color: receiptEditState.redAccent ? '#C53030' : '#1E293B' }}
                          >
                            {receiptEditState.description}
                          </span>
                        </div>
                        <div className="py-2.5 px-2.5 text-right w-[23.3%] flex items-center justify-end">
                          <span
                            className="text-[13.5px] font-bold"
                            style={{ color: receiptEditState.redAccent ? '#C53030' : '#1E293B' }}
                          >
                            ₹{receiptEditState.amount}
                          </span>
                        </div>
                      </div>

                      {/* Bottom border line */}
                      <div className="w-full h-[1.5px] bg-slate-900" />
                    </div>

                    {/* 4. MODE OF PAYMENT & TRANSACTION DATE */}
                    <div className="mt-3.5 flex flex-wrap justify-between items-center gap-2 text-[10.5px]">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-900 tracking-wider uppercase">
                          MODE OF PAYMENT
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                          <span className="w-3.5 h-3.5 border border-slate-700 rounded-none inline-flex items-center justify-center p-[2px] bg-white">
                            {isUpiOrBank && <span className="w-1.5 h-1.5 bg-slate-900 block" />}
                          </span>
                          <span>UPI / BANK</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 ml-2">
                          <span className="w-3.5 h-3.5 border border-slate-700 rounded-none inline-flex items-center justify-center p-[2px] bg-white">
                            {isCash && <span className="w-1.5 h-1.5 bg-slate-900 block" />}
                          </span>
                          <span>CASH</span>
                        </span>
                      </div>
                      <div className="font-extrabold text-slate-900 tracking-wider uppercase">
                        TRANSACTION DATE &nbsp; {receiptEditState.transactionDate}
                      </div>
                    </div>

                    {/* Computer-generated payment notice matching reference */}
                    <div className="text-[9.5px] text-slate-500 font-medium text-right mt-1.5">
                      **This is computer generated payment proof, no signature required
                    </div>
                    {/* Divider 1 under payment notice */}
                    <div className="border-b border-slate-300 mt-2 mb-3" />

                    {/* 5. REFUND POLICY */}
                    <div className="mb-3">
                      <div
                        className="text-[11px] font-extrabold tracking-wider uppercase mb-1"
                        style={{ color: '#C53030' }}
                      >
                        {receiptEditState.refundPolicyTitle}
                      </div>
                      <p className="text-[9.5px] text-slate-700 leading-snug font-normal whitespace-pre-line">
                        {receiptEditState.refundPolicyText}
                      </p>
                    </div>

                    {/* 6. FEE STRUCTURE SECTION */}
                    <div>
                      <div
                        className="text-[11px] font-extrabold tracking-wider uppercase mb-1.5"
                        style={{ color: '#C53030' }}
                      >
                        {receiptEditState.feeStructureTitle}
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        {/* Left: Fee Structure Rates Table with discrete block lines (NO strikethrough bugs) */}
                        <div className="w-[245px] text-[9.5px] text-left">
                          {/* Top Border Line */}
                          <div className="w-full h-[1px] bg-slate-900" />

                          {/* Header */}
                          <div className="flex h-[20px] items-center text-slate-900 font-bold">
                            <div className="px-2 w-[54%] border-r border-slate-900 leading-none">DURATION</div>
                            <div className="px-2 w-[46%] leading-none">PRICE</div>
                          </div>

                          {/* Header Divider Line */}
                          <div className="w-full h-[1px] bg-slate-900" />

                          {/* Rows */}
                          <div className="flex h-[18px] items-center text-slate-800 font-medium">
                            <div className="px-2 w-[54%] border-r border-slate-900 leading-none">1 DAY</div>
                            <div className="px-2 w-[46%] font-semibold text-slate-900 leading-none">₹ 500/-</div>
                          </div>
                          <div className="flex h-[18px] items-center text-slate-800 font-medium">
                            <div className="px-2 w-[54%] border-r border-slate-900 leading-none">2 TO 5 DAYS</div>
                            <div className="px-2 w-[46%] font-semibold text-slate-900 leading-none">₹ 350/- Per Day</div>
                          </div>
                          <div className="flex h-[18px] items-center text-slate-800 font-medium">
                            <div className="px-2 w-[54%] border-r border-slate-900 leading-none">5 TO 10 DAYS</div>
                            <div className="px-2 w-[46%] font-semibold text-slate-900 leading-none">₹ 2500/-</div>
                          </div>
                          <div className="flex h-[18px] items-center text-slate-800 font-medium">
                            <div className="px-2 w-[54%] border-r border-slate-900 leading-none">10 TO 15 DAYS</div>
                            <div className="px-2 w-[46%] font-semibold text-slate-900 leading-none">₹ 3500/-</div>
                          </div>
                          <div className="flex h-[18px] items-center text-slate-800 font-medium">
                            <div className="px-2 w-[54%] border-r border-slate-900 leading-none">15 TO 20 DAYS</div>
                            <div className="px-2 w-[46%] font-semibold text-slate-900 leading-none">₹ 4500/-</div>
                          </div>

                          {/* Bottom Border Line */}
                          <div className="w-full h-[1px] bg-slate-900" />
                        </div>

                        {/* Right: Optional Official Seal & Signature (when toggled on by admin) */}
                        {receiptEditState.showSealAndSignature && (
                          <div className="w-full sm:w-[45%] flex items-end justify-between pt-1 self-stretch">
                            <div className="flex flex-col items-center">
                              <ZellaHostelSeal className="w-16 h-16" />
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-900">
                                AUTHORIZED SIGNATORY
                              </div>
                              <div className="text-[9px] font-semibold text-slate-700 mt-0.5">
                                Zella Ladies Hostel Administration
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Package Types & Food inclusion notice matching reference */}
                      <div className="mt-2.5 text-[10px] leading-tight">
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
                  </div>

                  {/* 7. BOTTOM ACCENT BAR - EXACT FULL BLEED AT VERY BOTTOM */}
                  <div
                    className="w-full shrink-0"
                    style={{
                      height: '26px',
                      backgroundColor: '#D81B60',
                      margin: 0,
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
                  disabled={isExportingPdf}
                  className="w-full sm:w-auto"
                >
                  Print Receipt
                </Button>
                <Button
                  variant="primary"
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleDownloadPdf}
                  isLoading={isExportingPdf}
                  disabled={isExportingPdf}
                  className="w-full sm:w-auto"
                >
                  Download PDF
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
