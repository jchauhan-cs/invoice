import Link from 'next/link';
import { saveClient } from '@/app/actions';

export default function ClientForm({ client }) {
  return (
    <form action={saveClient} className="panel stack">
      {client && <input type="hidden" name="id" value={client.id} />}
      <label>Name<input name="name" required defaultValue={client?.name ?? ''} /></label>
      <div className="grid2">
        <label>Email<input type="email" name="email" defaultValue={client?.email ?? ''} /></label>
        <label>Tax ID (optional)<input name="tax_id" defaultValue={client?.tax_id ?? ''} /></label>
      </div>
      <label>Billing address<textarea name="address" defaultValue={client?.address ?? ''} /></label>
      <div className="actions">
        <button className="btn primary" type="submit">Save client</button>
        <Link className="btn" href="/clients">Cancel</Link>
      </div>
    </form>
  );
}
