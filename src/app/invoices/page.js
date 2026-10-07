import Link from 'next/link';
import { listInvoices } from '@/lib/db';
import { fmtMoney } from '@/lib/money';
import Status from '@/components/Status';

export default async function InvoicesPage() {
  const invoices = await listInvoices();
  return (
    <>
      <div className="row">
        <h1>Invoices</h1>
        <Link className="btn primary" href="/invoices/new">New invoice</Link>
      </div>
      {invoices.length === 0 ? (
        <div className="empty">No invoices yet. Create one to get started.</div>
      ) : (
        <table>
          <thead>
            <tr><th>Number</th><th>Client</th><th>Issued</th><th>Due</th><th className="num">Total</th><th className="num">Paid</th><th>Status</th></tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <td><Link href={`/invoices/${i.id}`}>{i.number ?? `Draft #${i.id}`}</Link></td>
                <td>{i.client_name}</td>
                <td>{i.issue_date}</td>
                <td>{i.due_date}</td>
                <td className="num">{fmtMoney(i.total_minor, i.currency)}</td>
                <td className="num">{fmtMoney(i.paid_minor, i.currency)}</td>
                <td><Status value={i.display_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
