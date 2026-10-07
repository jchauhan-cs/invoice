import Link from 'next/link';
import { saveInvoice } from '@/app/actions';
import ItemsEditor from './ItemsEditor';
import { fmtNumber } from '@/lib/money';

export default function InvoiceForm({ clients, settings, invoice, items }) {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + settings.payment_terms_days * 86400000).toISOString().slice(0, 10);
  const initialItems = (items ?? []).map((it) => ({
    description: it.description,
    quantity: String(it.quantity),
    unit_price: (it.unit_price_minor / 100).toFixed(2),
  }));

  return (
    <form action={saveInvoice} className="stack">
      {invoice && <input type="hidden" name="id" value={invoice.id} />}
      <div className="panel stack">
        <label>
          Client
          <select name="client_id" required defaultValue={invoice?.client_id ?? ''}>
            <option value="" disabled>Choose a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <div className="grid2">
          <label>Issue date<input type="date" name="issue_date" required defaultValue={invoice?.issue_date ?? today} /></label>
          <label>Due date<input type="date" name="due_date" required defaultValue={invoice?.due_date ?? due} /></label>
        </div>
      </div>
      <div className="panel">
        <ItemsEditor initialItems={initialItems} currency={settings.currency} />
      </div>
      <div className="panel">
        <label>Notes (shown on the invoice)<textarea name="notes" defaultValue={invoice?.notes ?? ''} /></label>
      </div>
      <div className="actions">
        <button className="btn primary" type="submit">Save draft</button>
        <Link className="btn" href={invoice ? `/invoices/${invoice.id}` : '/invoices'}>Cancel</Link>
      </div>
    </form>
  );
}
