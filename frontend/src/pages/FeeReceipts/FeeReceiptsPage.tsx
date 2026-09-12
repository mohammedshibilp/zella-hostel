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
import {
  Plus,
  Receipt,
  Printer,
  Download,
  Building2,
  Calendar,
  CreditCard,
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
    amount: '6500',
    payment_mode: 'Cash',
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
        amount: parseFloat(formData.amount),
        payment_mode: formData.payment_mode,
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

  const handleDownloadPdf = async () => {
    if (!receiptPrintRef.current) return;
    setIsExportingPdf(true);
    try {
      // Dynamic import html2pdf to ensure seamless browser bundle
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const opt = {
        margin: 10,
        filename: `${selectedReceipt?.receipt_no || 'Fee_Receipt'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
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
      header: 'Amount Paid',
      accessor: (item) => <span className="text-sm font-extrabold text-emerald-700">₹{item.amount.toLocaleString()}</span>,
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
      header: 'Period Covered',
      accessor: (item) => (
        <span className="text-xs text-slate-500 font-medium">
          {item.period_start ? `${item.period_start} → ${item.period_end || 'End of Month'}` : '—'}
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
                amount: '6500',
                payment_mode: 'Cash',
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
            <Input
              label="Amount (₹)"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            <Select
              label="Payment Mode"
              value={formData.payment_mode}
              onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'UPI', label: 'UPI / Online Transfer' },
                { value: 'Bank', label: 'Bank Transfer / Cheque' },
              ]}
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Generate & Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW / PRINT / PDF RECEIPT MODAL */}
      <Modal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title="Fee Payment Voucher"
        subtitle={selectedReceipt?.receipt_no}
        maxWidth="lg"
      >
        {selectedReceipt && (
          <div className="flex flex-col gap-6">
            {/* Printable Receipt Canvas */}
            <div
              ref={receiptPrintRef}
              className="p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col gap-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white">
                    <Building2 className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-navy-900 tracking-tight">ZELLA HOSTEL</h2>
                    <p className="text-[11px] text-slate-500 font-medium">Residency Road, Knowledge Park</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    FEE RECEIPT
                  </span>
                  <span className="text-base font-extrabold text-primary">{selectedReceipt.receipt_no}</span>
                  <span className="text-[11px] text-slate-500 block">{selectedReceipt.date}</span>
                </div>
              </div>

              {/* Resident Details */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Received From:</span>
                  <span className="text-sm font-bold text-navy-900 block">{selectedReceipt.guest?.name}</span>
                  <span className="text-slate-600">{selectedReceipt.guest?.contact_no}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Room & Bed:</span>
                  <span className="text-sm font-bold text-navy-900 block">
                    Room {selectedReceipt.guest?.room_number || '101'} • Bed{' '}
                    {selectedReceipt.guest?.bed_number || '101-A'}
                  </span>
                  <span className="text-slate-600">Payment Mode: {selectedReceipt.payment_mode}</span>
                </div>
              </div>

              {/* Line items */}
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3">
                      <div className="font-bold text-navy-900">Hostel Accommodation & Boarding</div>
                      <div className="text-slate-500 text-[11px]">
                        Period: {selectedReceipt.period_start || selectedReceipt.date} to{' '}
                        {selectedReceipt.period_end || 'Month-end'}
                      </div>
                      {selectedReceipt.remarks && (
                        <div className="text-slate-400 italic text-[11px]">{selectedReceipt.remarks}</div>
                      )}
                    </td>
                    <td className="py-3 text-right font-bold text-navy-900">
                      ₹{selectedReceipt.amount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-black text-sm">
                    <td className="py-3 text-navy-900">Total Paid</td>
                    <td className="py-3 text-right text-emerald-700">
                      ₹{selectedReceipt.amount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures */}
              <div className="flex justify-between items-end pt-6 border-t border-slate-200 text-xs text-slate-500">
                <div>
                  <span className="block font-medium">Authorized Signatory</span>
                  <span className="text-[10px] text-slate-400">Zella Hostel Administration</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Computer Generated Receipt</span>
                  <span className="text-[10px] text-slate-400">Status: Verified & Settled</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                icon={<Printer className="w-4 h-4" />}
                onClick={handlePrint}
              >
                Print Receipt
              </Button>
              <Button
                variant="primary"
                icon={<Download className="w-4 h-4" />}
                onClick={handleDownloadPdf}
                isLoading={isExportingPdf}
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
