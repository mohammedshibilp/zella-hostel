import React, { useEffect, useState } from 'react';
import { accountService } from '../../services/accountService';
import { guestService } from '../../services/guestService';
import { AccountTransaction, AccountSummary, Guest } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, Column } from '../../components/DataTable';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { useToast } from '../../context/ToastContext';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Landmark,
  Calendar,
  Filter,
} from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [entryTypeFilter, setEntryTypeFilter] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State strictly matching client specification
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    transaction_type: 'Plain', // "Guest" or "Plain"
    guest_id: '',
    particulars: '',
    amount: '',
    payment_channel: 'Cash', // "Cash" or "Bank"
    entry_type: 'Cr', // "Dr" or "Cr"
    reference_no: '',
  });

  const { success, error: toastError } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [txList, sumData, guestList] = await Promise.all([
        accountService.getTransactions({
          entry_type: entryTypeFilter || undefined,
          payment_channel: channelFilter || undefined,
          transaction_type: txTypeFilter || undefined,
        }),
        accountService.getSummary(),
        guestService.getGuests(),
      ]);
      setTransactions(txList);
      setSummary(sumData);
      setGuests(guestList);
    } catch (err) {
      toastError('Failed to load accounts ledger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [entryTypeFilter, channelFilter, txTypeFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.particulars || !formData.amount) {
      toastError('Please provide particulars and amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date: formData.date,
        transaction_type: formData.transaction_type,
        guest_id:
          formData.transaction_type === 'Guest' && formData.guest_id
            ? parseInt(formData.guest_id)
            : null,
        particulars: formData.particulars,
        amount: parseFloat(formData.amount),
        payment_channel: formData.payment_channel,
        entry_type: formData.entry_type,
        reference_no: formData.reference_no || null,
      };

      await accountService.createTransaction(payload);
      success('Transaction recorded into ledger', 'Saved');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<AccountTransaction>[] = [
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
      header: 'Particulars',
      accessor: (item) => (
        <div>
          <div className="font-bold text-navy-900">{item.particulars}</div>
          <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
            <span>Type: {item.transaction_type}</span>
            {item.reference_no && <span>• Ref: {item.reference_no}</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'Bank / Cash',
      accessor: (item) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
            item.payment_channel === 'Bank'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {item.payment_channel === 'Bank' ? (
            <Landmark className="w-3 h-3" />
          ) : (
            <Wallet className="w-3 h-3" />
          )}
          <span>{item.payment_channel}</span>
        </span>
      ),
    },
    {
      header: 'Dr / Cr',
      accessor: (item) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold ${
            item.entry_type === 'Cr'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {item.entry_type === 'Cr' ? (
            <ArrowDownLeft className="w-3.5 h-3.5" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5" />
          )}
          <span>{item.entry_type === 'Cr' ? 'Credit (In)' : 'Debit (Out)'}</span>
        </span>
      ),
    },
    {
      header: 'Amount',
      align: 'right',
      accessor: (item) => (
        <span
          className={`text-sm font-extrabold ${
            item.entry_type === 'Cr' ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {item.entry_type === 'Cr' ? '+' : '-'}₹{item.amount.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Accounts & Financial Ledger"
        subtitle="Double-entry journal tracking all cash/bank inflows, operational expenditures, and resident settlements"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setFormData({
                date: new Date().toISOString().split('T')[0],
                transaction_type: 'Plain',
                guest_id: '',
                particulars: '',
                amount: '',
                payment_channel: 'Cash',
                entry_type: 'Cr',
                reference_no: '',
              });
              setIsModalOpen(true);
            }}
          >
            New Transaction
          </Button>
        }
      />

      {/* FINANCIAL SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Credits (Inflow)
            </span>
            <span className="text-xl font-extrabold text-emerald-700">
              ₹{(summary?.total_credit || 0).toLocaleString()}
            </span>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Debits (Expense)
            </span>
            <span className="text-xl font-extrabold text-rose-600">
              ₹{(summary?.total_debit || 0).toLocaleString()}
            </span>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Cash in Hand
            </span>
            <span className="text-xl font-extrabold text-navy-900">
              ₹{(summary?.cash_balance || 0).toLocaleString()}
            </span>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Bank Balance
            </span>
            <span className="text-xl font-extrabold text-navy-900">
              ₹{(summary?.bank_balance || 0).toLocaleString()}
            </span>
          </div>
        </Card>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={entryTypeFilter}
            onChange={(e) => setEntryTypeFilter(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-navy-900"
          >
            <option value="">All Dr / Cr</option>
            <option value="Cr">Credit Only (Income)</option>
            <option value="Dr">Debit Only (Expense)</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-navy-900"
          >
            <option value="">All Channels</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
          </select>

          <select
            value={txTypeFilter}
            onChange={(e) => setTxTypeFilter(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-navy-900"
          >
            <option value="">All Particulars</option>
            <option value="Guest">Guest Related</option>
            <option value="Plain">Plain / Operating</option>
          </select>
        </div>

        <div className="text-xs font-bold text-slate-600">
          Net Balance:{' '}
          <span
            className={
              (summary?.net_balance || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }
          >
            ₹{(summary?.net_balance || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* DATA TABLE */}
      <DataTable
        columns={columns}
        data={transactions}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No ledger transactions found."
      />

      {/* NEW TRANSACTION MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Accounting Entry"
        subtitle="Add cash or bank debit/credit transaction"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Transaction Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Select
              label="Particulars Type"
              value={formData.transaction_type}
              onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
              options={[
                { value: 'Plain', label: 'Plain (Operating Expense / General)' },
                { value: 'Guest', label: 'Selecting Guest (Resident Related)' },
              ]}
            />
          </div>

          {formData.transaction_type === 'Guest' && (
            <Select
              label="Select Resident Guest"
              value={formData.guest_id}
              onChange={(e) => {
                const gId = e.target.value;
                const selGuest = guests.find((g) => g.id.toString() === gId);
                setFormData({
                  ...formData,
                  guest_id: gId,
                  particulars: selGuest
                    ? `Payment regarding resident ${selGuest.name} (Room ${selGuest.room_number || 'N/A'})`
                    : formData.particulars,
                });
              }}
              options={[
                { value: '', label: 'Select Resident...' },
                ...guests.map((g) => ({
                  value: g.id,
                  label: `${g.name} (${g.contact_no})`,
                })),
              ]}
            />
          )}

          <Input
            label="Particulars Description"
            placeholder="e.g. Electricity Bill Payment / Grocery Purchase"
            value={formData.particulars}
            onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Amount (₹)"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            <Select
              label="Bank / Cash"
              value={formData.payment_channel}
              onChange={(e) => setFormData({ ...formData, payment_channel: e.target.value })}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'Bank', label: 'Bank Account' },
              ]}
            />
            <Select
              label="Dr / Cr Entry"
              value={formData.entry_type}
              onChange={(e) => setFormData({ ...formData, entry_type: e.target.value })}
              options={[
                { value: 'Cr', label: 'Credit (Inflow / Receipt)' },
                { value: 'Dr', label: 'Debit (Outflow / Expense)' },
              ]}
            />
          </div>

          <Input
            label="Reference / Cheque / UTR No"
            placeholder="e.g. UTR-98320492834"
            value={formData.reference_no}
            onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Save to Ledger
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
