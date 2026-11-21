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
  Plus,
  Receipt,
  Printer,
  Download,
  Building2,
  Calendar,
  CreditCard,
  Tag,
} from 'lucide-react';

export const FeeReceiptsPage: React.FC = () => {
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<FeeReceipt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const receiptPrintRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    guest_id: '',
    date: new Date().toISOString().split('T')[0],
    fee_type: 'Hostel Accommodation Fee',
    amount: '6500',
    discount: '0',
    paid_amount: '6500',
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
    if (!formData.guest_id || !formData.amount) {
      toastError('Please select a resident and enter fee amount');
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
    const room = receipt.room_number || receipt.guest?.room_number || '101';
    const bed = receipt.guest?.bed_number || 'Not Assigned';
    return `Room ${room} · Bed ${bed}`;
  };

  const formatPackage = (receipt: FeeReceipt): string => {
    return receipt.package_name || (receipt.guest as any)?.package_name || 'Standard Double Sharing';
  };

  const formatBillingPeriod = (receipt: FeeReceipt): string => {
    if (receipt.billing_period) return receipt.billing_period;
    if (receipt.period_start && receipt.period_end) {
      return `${formatDateDMY(receipt.period_start)} to ${formatDateDMY(receipt.period_end)}`;
    }
    if (receipt.period_start) {
      return `${formatDateDMY(receipt.period_start)} to Month-end`;
    }
    return `${formatDateDMY(receipt.date)} to Month-end`;
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
              setFormData({
                guest_id: guests[0]?.id.toString() || '',
                date: new Date().toISOString().split('T')[0],
                fee_type: 'Hostel Accommodation Fee',
                amount: '6500',
                discount: '0',
                paid_amount: '6500',
                balance_amount: '0',
                payment_mode: 'Cash',
                payment_reference: '',
                period_start: new Date().toISOString().split('T')[0],
                period_end: '',
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
              onChange={(e) => setFormData({ ...formData, guest_id: e.target.value })}
              options={[
                { value: '', label: 'Select Resident...' },
                ...guests.map((g) => ({
                  value: g.id,
                  label: `${g.name} (${g.room_number ? `Room ${g.room_number}` : g.contact_no})`,
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
            {/* Action Bar */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                Official Institutional Fee Receipt – Ready for A4 Print & PDF Download
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  icon={<Printer className="w-4 h-4" />}
                  onClick={handlePrint}
                  className="w-full sm:w-auto"
                >
                  Print Receipt
                </Button>
                <Button
                  variant="primary"
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleDownloadPdf}
                  isLoading={isExportingPdf}
                  className="w-full sm:w-auto"
                >
                  Download PDF
                </Button>
              </div>
            </div>

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
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <Button
                variant="outline"
                icon={<Printer className="w-4 h-4" />}
                onClick={handlePrint}
                className="w-full sm:w-auto"
              >
                Print Receipt
              </Button>
              <Button
                variant="primary"
                icon={<Download className="w-4 h-4" />}
                onClick={handleDownloadPdf}
                isLoading={isExportingPdf}
                className="w-full sm:w-auto"
              >
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
