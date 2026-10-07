import Link from 'next/link';
import { listInvoices, getSettings } from '@/lib/db';
import { fmtMoney } from '@/lib/money';
import Status from '@/components/Status';

export default async function Dashboard() {
  const settings = await getSettings();
  const invoices = await listInvoices();
  const open = invoices.filter((i) => i.status === 'issued');
  const outstanding = open.reduce((s, i) => s + (i.total_minor - i.paid_minor), 0);
  const overdue = invoices.filter((i) => i.display_status === 'overdue');
  const overdueSum = overdue.reduce((s, i) => s + (i.total_minor - i.paid_minor), 0);
  const drafts = invoices.filter((i) => i.status === 'draft').length;

  return (
    <>
      <div className="row">
        <div>
          <h1>Invoices at a glance</h1>
          <p className="sub" style={{ margin: 0 }}>{settings.company_name}</p>
        </div>
        <Link className="btn primary" href="/invoices/new">New invoice</Link>
      </div>

      <div className="stats">
        <div className="panel stat"><div className="label">Outstanding</div><div className="value">{fmtMoney(outstanding, settings.currency)}</div></div>
        <div className="panel stat"><div className="label">Overdue ({overdue.length})</div><div className="value">{fmtMoney(overdueSum, settings.currency)}</div></div>
        <div className="panel stat"><div className="label">Drafts</div><div className="value">{drafts}</div></div>
      </div>

      <h2>Recent invoices</h2>
      {invoices.length === 0 ? (
        <div className="empty">No invoices yet. Add a client, then create your first invoice.</div>
      ) : (
        <table>
          <thead><tr><th>Number</th><th>Client</th><th>Due</th><th className="num">Total</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.slice(0, 8).map((i) => (
              <tr key={i.id}>
                <td><Link href={`/invoices/${i.id}`}>{i.number ?? `Draft #${i.id}`}</Link></td>
                <td>{i.client_name}</td>
                <td>{i.due_date}</td>
                <td className="num">{fmtMoney(i.total_minor, i.currency)}</td>
                <td><Status value={i.display_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
