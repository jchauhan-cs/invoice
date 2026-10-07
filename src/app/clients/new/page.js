import ClientForm from '@/components/ClientForm';

export default function NewClientPage() {
  return (
    <>
      <h1>New client</h1>
      <p className="sub">Client details are copied onto each invoice when you issue it.</p>
      <ClientForm />
    </>
  );
}
