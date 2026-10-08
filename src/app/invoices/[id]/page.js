import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getInvoiceFull } from '@/lib/db';
import { fmtMoney, fmtNumber, fmtDate, todayISO } from '@/lib/money';
import { issueInvoice, voidInvoice, deleteDraft, recordPayment } from '@/app/actions';
import Status from '@/components/Status';

export default async function InvoicePage({ params }) {
  const id = Number(params.id);
  const full = await getInvoiceFull(id);
  if (!full) notFound();
  const { invoice, items, payments, paid_minor, balance_minor, client } = full;
  const cur = invoice.currency;
  const today = todayISO();
  const canPay = invoice.status === 'issued';

  return (
    <>
      <div className="row">
        <div>
          <h1>{invoice.number ?? `Draft #${invoice.id}`} <Status value={invoice.display_status} /></h1>
          <p className="sub" style={{ margin: 0 }}>{client.name}</p>
        </div>
        <div className="actions">
          <a className="btn" href={`/api/invoices/${id}/pdf`} target="_blank" rel="noreferrer">
            {invoice.status === 'draft' ? 'Preview PDF' : 'Download PDF'}
          </a>
          {invoice.status === 'draft' && (
            <>
              <Link className="btn" href={`/invoices/${id}/edit`}>Edit draft</Link>
              <form action={issueInvoice.bind(null, id)}><button className="btn primary" type="submit">Issue invoice</button></form>
              <form action={deleteDraft.bind(null, id)}><button className="btn danger" type="submit">Delete draft</button></form>
            </>
          )}
          {invoice.status === 'issued' && (
            <form action={voidInvoice.bind(null, id)}><button className="btn danger" type="submit">Void invoice</button></form>
          )}
        </div>
      </div>

      <div className="panel meta">
        <div><div className="k">Invoice date</div>{fmtDate(invoice.issue_date)}</div>
        <div><div className="k">Payment due</div>{fmtDate(invoice.due_date)}</div>
        <div><div className="k">Bill to</div><pre className="addr">{[client.name, client.address, client.country, client.email].filter(Boolean).join('\n')}</pre></div>
      </div>

      <h2>Line items</h2>
      <table>
        <thead><tr><th>Description</th><th>HSN/SAC</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Amount</th></tr></thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{it.description}{it.details && <div className="item-sub">{it.details}</div>}</td>
              <td>{it.hsn_sac}</td>
              <td className="num">{it.quantity}{it.unit ? ` ${it.unit}` : ''}</td>
              <td className="num">{fmtNumber(it.unit_price_minor)}</td>
              <td className="num">{fmtNumber(it.total_minor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="total-line"><span>Total</span><span>{fmtMoney(invoice.total_minor, cur)}</span></div>
      {invoice.status !== 'draft' && (
        <div className="total-line" style={{ fontSize: 15 }}>
          <span>Paid {fmtMoney(paid_minor, cur)}</span>
          <span>Balance {fmtMoney(balance_minor, cur)}</span>
        </div>
      )}

      {invoice.notes && (<><h2>Notes</h2><div className="panel"><pre className="addr">{invoice.notes}</pre></div></>)}

      {invoice.status !== 'draft' && (
        <>
          <h2>Payments</h2>
          {payments.length === 0 ? (
            <div className="empty">No payments recorded.</div>
          ) : (
            <table>
              <thead><tr><th>Date</th><th>Method</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}><td>{p.paid_on}</td><td>{p.method || '-'}</td><td className="num">{fmtMoney(p.amount_minor, cur)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {canPay && (
            <form action={recordPayment.bind(null, id)} className="panel stack" style={{ marginTop: 14 }}>
              <div className="grid2">
                <label>Amount<input name="amount" type="number" step="0.01" min="0.01" required defaultValue={(balance_minor / 100).toFixed(2)} /></label>
                <label>Date paid<input name="paid_on" type="date" required defaultValue={today} /></label>
              </div>
              <label>Method (optional)<input name="method" placeholder="Bank transfer, cash, card" /></label>
              <div className="actions"><button className="btn primary" type="submit">Record payment</button></div>
            </form>
          )}
        </>
      )}
    </>
  );
}
