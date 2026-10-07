import { notFound } from 'next/navigation';
import { getClient } from '@/lib/db';
import ClientForm from '@/components/ClientForm';

export default async function EditClientPage({ params }) {
  const client = await getClient(Number(params.id));
  if (!client) notFound();
  return (
    <>
      <h1>Edit client</h1>
      <p className="sub">Changes apply to new invoices. Issued invoices keep the details they were issued with.</p>
      <ClientForm client={client} />
    </>
  );
}
