import Link from 'next/link';
import { listClients, getSettings } from '@/lib/db';
import InvoiceForm from '@/components/InvoiceForm';

export default async function NewInvoicePage() {
  const clients = await listClients();
  const settings = await getSettings();
  return (
    <>
      <h1>New invoice</h1>
      <p className="sub">Drafts can be edited. The invoice number is assigned when you issue it.</p>
      {clients.length === 0 ? (
        <div className="empty">
          You need a client first. <Link href="/clients/new">Add a client</Link>
        </div>
      ) : (
        <InvoiceForm clients={clients} settings={settings} />
      )}
    </>
  );
}
