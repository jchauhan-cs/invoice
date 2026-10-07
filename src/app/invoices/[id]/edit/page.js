import { notFound, redirect } from 'next/navigation';
import { listClients, getSettings, getInvoiceFull } from '@/lib/db';
import InvoiceForm from '@/components/InvoiceForm';

export default async function EditInvoicePage({ params }) {
  const full = await getInvoiceFull(Number(params.id));
  if (!full) notFound();
  if (full.invoice.status !== 'draft') redirect(`/invoices/${full.invoice.id}`);
  return (
    <>
      <h1>Edit draft #{full.invoice.id}</h1>
      <p className="sub">Changes are saved to the draft. Issue it from the invoice page when it is ready.</p>
      <InvoiceForm clients={await listClients()} settings={await getSettings()} invoice={full.invoice} items={full.items} />
    </>
  );
}
