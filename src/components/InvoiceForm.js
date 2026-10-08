import Link from 'next/link';
import { saveInvoice } from '@/app/actions';
import ItemsEditor from './ItemsEditor';
import { todayISO, addDays } from '@/lib/money';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED'];

export default function InvoiceForm({ clients, settings, invoice, items }) {
  const today = todayISO();
  const due = addDays(today, settings.payment_terms_days);
  const currency = invoice?.currency ?? settings.currency;
  const currencies = CURRENCIES.includes(currency) ? CURRENCIES : [currency, ...CURRENCIES];
  const initialItems = (items ?? []).map((it) => ({
    description: it.description,
    details: it.details ?? '',
    hsn_sac: it.hsn_sac ?? '',
    quantity: String(it.quantity),
    unit: it.unit ?? '',
    unit_price: (it.unit_price_minor / 100).toFixed(2),
  }));
  const v = (k) => invoice?.[k] ?? '';

  return (
    <form action={saveInvoice} className="stack">
      {invoice && <input type="hidden" name="id" value={invoice.id} />}
      <div className="panel stack">
        <div className="grid2">
          <label>
            Buyer (client)
            <select name="client_id" required defaultValue={invoice?.client_id ?? ''}>
              <option value="" disabled>Choose a client</option>
              {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </label>
          <label>
            Currency
            <select name="currency" defaultValue={currency}>
              {currencies.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </label>
        </div>
        <div className="grid2">
          <label>Invoice date<input type="date" name="issue_date" required defaultValue={invoice?.issue_date ?? today} /></label>
          <label>Payment due date (internal, for overdue tracking)<input type="date" name="due_date" required defaultValue={invoice?.due_date ?? due} /></label>
        </div>
        <label className="check">
          <input type="checkbox" name="is_export" defaultChecked={invoice ? invoice.is_export : true} />
          Export invoice: print the "without payment of IGST" statement at the top
        </label>
      </div>

      <div className="panel stack">
        <div className="grid2">
          <label>Mode/Terms of Payment<input name="payment_terms" defaultValue={v('payment_terms')} /></label>
          <label>Reference No. &amp; Date<input name="reference_no" defaultValue={v('reference_no')} /></label>
          <label>Buyer&apos;s Order No.<input name="buyer_order_no" defaultValue={v('buyer_order_no')} /></label>
          <label>Buyer&apos;s Order date<input type="date" name="buyer_order_date" defaultValue={v('buyer_order_date')} /></label>
          <label>Other References<input name="other_references" defaultValue={v('other_references')} /></label>
          <label>Terms of Delivery<input name="delivery_terms" defaultValue={v('delivery_terms')} /></label>
        </div>
      </div>

      <div className="panel">
        <ItemsEditor initialItems={initialItems} currency={currency} defaultHsn={settings.default_hsn} />
      </div>
      <div className="panel">
        <label>Internal notes (not printed on the invoice)<textarea name="notes" defaultValue={v('notes')} /></label>
      </div>
      <div className="actions">
        <button className="btn primary" type="submit">Save draft</button>
        <Link className="btn" href={invoice ? `/invoices/${invoice.id}` : '/invoices'}>Cancel</Link>
      </div>
    </form>
  );
}
