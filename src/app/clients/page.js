import Link from 'next/link';
import { listClients } from '@/lib/db';

export default async function ClientsPage() {
  const clients = await listClients();
  return (
    <>
      <div className="row">
        <h1>Clients</h1>
        <Link className="btn primary" href="/clients/new">New client</Link>
      </div>
      {clients.length === 0 ? (
        <div className="empty">No clients yet. Add your first client to start invoicing.</div>
      ) : (
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Tax ID</th><th /></tr></thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td><td>{c.email || '-'}</td><td>{c.tax_id || '-'}</td>
                <td className="num"><Link href={`/clients/${c.id}`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
