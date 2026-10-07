import PDFDocument from 'pdfkit';
import { fmtNumber } from './money';

const INK = '#14213d';
const MUTED = '#5b6477';
const LINE = '#d9dde5';

export function renderInvoicePdf({ invoice, items, client, company, paid_minor, balance_minor }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = 50;
    const right = 545;
    const cur = invoice.currency;

    // Header: company on the left, invoice meta on the right
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(18).text(company.company_name, left, 50, { width: 280 });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED);
    [company.address, company.email, company.phone].filter(Boolean).forEach((l) => doc.text(l, { width: 280 }));

    doc.fillColor(INK).font('Helvetica-Bold').fontSize(22).text('INVOICE', 340, 50, { width: 205, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor(MUTED);
    doc.text(invoice.number ?? 'DRAFT', 340, 78, { width: 205, align: 'right' });
    doc.text(`Issued: ${invoice.issue_date}`, 340, 94, { width: 205, align: 'right' });
    doc.text(`Due: ${invoice.due_date}`, 340, 108, { width: 205, align: 'right' });

    // Bill to
    let y = 160;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('Bill to', left, y);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(client.name, left, y + 14, { width: 280 });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED);
    [client.address, client.email, client.tax_id ? `Tax ID: ${client.tax_id}` : ''].filter(Boolean).forEach((l) =>
      doc.text(l, { width: 280 })
    );

    // Table header
    y = Math.max(doc.y + 24, 240);
    const cols = { desc: left, qty: 320, price: 380, amount: 470 };
    const header = () => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED);
      doc.text('Description', cols.desc, y);
      doc.text('Qty', cols.qty, y, { width: 50, align: 'right' });
      doc.text(`Unit price (${cur})`, cols.price, y, { width: 85, align: 'right' });
      doc.text(`Amount (${cur})`, cols.amount, y, { width: 75, align: 'right' });
      y += 16;
      doc.moveTo(left, y).lineTo(right, y).strokeColor(INK).lineWidth(0.8).stroke();
      y += 8;
    };
    header();

    doc.font('Helvetica').fontSize(10).fillColor(INK);
    for (const it of items) {
      const h = doc.heightOfString(it.description, { width: 255 });
      if (y + h > 740) {
        doc.addPage();
        y = 50;
        header();
        doc.font('Helvetica').fontSize(10).fillColor(INK);
      }
      doc.text(it.description, cols.desc, y, { width: 255 });
      doc.text(String(it.quantity), cols.qty, y, { width: 50, align: 'right' });
      doc.text(fmtNumber(it.unit_price_minor), cols.price, y, { width: 85, align: 'right' });
      doc.text(fmtNumber(it.total_minor), cols.amount, y, { width: 75, align: 'right' });
      y += h + 8;
      doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor(LINE).lineWidth(0.5).stroke();
    }

    // Totals
    if (y > 680) {
      doc.addPage();
      y = 50;
    }
    y += 8;
    const totalRow = (label, value, bold) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10).fillColor(INK);
      doc.text(label, 340, y, { width: 120 });
      doc.text(`${fmtNumber(value)} ${cur}`, 440, y, { width: 105, align: 'right' });
      y += bold ? 20 : 16;
    };
    totalRow('Total', invoice.total_minor, true);
    if (paid_minor > 0) {
      totalRow('Paid', paid_minor, false);
      totalRow('Balance due', balance_minor, true);
    }

    // Payment details, notes, footer
    y += 16;
    const block = (title, text) => {
      if (!text) return;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text(title, left, y);
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(text, left, y + 13, { width: 330 });
      y = doc.y + 14;
    };
    block('Payment details', company.payment_details);
    block('Notes', invoice.notes);
    if (company.footer_note) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(company.footer_note, left, 780, { width: right - left, align: 'center' });
    }

    doc.end();
  });
}
