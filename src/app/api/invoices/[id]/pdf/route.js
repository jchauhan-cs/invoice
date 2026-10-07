import { getInvoiceFull } from '@/lib/db';
import { renderInvoicePdf } from '@/lib/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const full = await getInvoiceFull(Number(params.id));
  if (!full) return new Response('Invoice not found', { status: 404 });
  const pdf = await renderInvoicePdf(full);
  const name = (full.invoice.number ?? `draft-${full.invoice.id}`).replace(/[^A-Za-z0-9_-]/g, '_');
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${name}.pdf"`,
    },
  });
}
