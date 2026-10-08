import PDFDocument from 'pdfkit';
import { fmtNumber, fmtDate, currencySymbol, amountInWords } from './money';

// Layout modelled on the company's existing Tally-style export invoice (A4).
const L = 40;
const R = 555;
const W = R - L;
const T = 72; // top of the bordered area on page 1
const SPLIT = 300; // divider between company/buyer block and invoice details
const MID = 425; // divider inside the invoice details block
const HDR_H = 190; // height of the header block on page 1
const TH = 28; // table header height
const E = [40, 58, 280, 335, 390, 440, 475, 555]; // column edges
const BB = 670; // bottom of the items area
const TOTAL_H = 24;
const WORDS_H = 32;
const FOOT_H = 80;
const END = BB + TOTAL_H + WORDS_H + FOOT_H;

export function renderInvoicePdf({ invoice, items, client, company }) {
  const cur = invoice.currency;
  const money = (m) => `${currencySymbol(cur)}${fmtNumber(m)}`;
  const c = client ?? {};
  const co = company ?? {};

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', (d) => chunks.push(d));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const line = (x1, y1, x2, y2, w = 0.7) => {
      doc.save().lineWidth(w).strokeColor('#000').moveTo(x1, y1).lineTo(x2, y2).stroke().restore();
    };
    const font = (name, size) => doc.font(name).fontSize(size);
    const txt = (s, x, y, o = {}) => doc.fillColor('#000').text(String(s ?? ''), x, y, o);

    let pageTop = T;
    let tableTop = T + HDR_H;
    let y = 0;

    const tableHeader = (top) => {
      line(L, top, R, top);
      line(L, top + TH, R, top + TH);
      font('Helvetica', 7.5);
      const heads = ['Sl\nNo.', 'Description of Services', 'HSN/SAC', 'Quantity', 'Rate', 'per', 'Amount'];
      heads.forEach((h, i) => {
        txt(h, E[i], top + (h.includes('\n') ? 5 : 10), { width: E[i + 1] - E[i], align: 'center', lineGap: 0 });
      });
    };

    const firstHeader = () => {
      font('Helvetica-Bold', 13);
      txt(co.invoice_title || 'Tax Invoice', L, 24, { width: W, align: 'center' });
      if (invoice.is_export && co.export_statement) {
        font('Helvetica', 8);
        txt(co.export_statement, L + 20, 42, { width: W - 40, align: 'center' });
      }

      // Company and buyer (left)
      const lw = SPLIT - L - 12;
      font('Helvetica-Bold', 10);
      txt(co.company_name, L + 6, T + 6, { width: lw });
      font('Helvetica', 8);
      if (co.address) txt(co.address, L + 6, doc.y + 2, { width: lw });
      if (co.gstin) { font('Helvetica', 8.5); txt(`GSTIN/UIN: ${co.gstin}`, L + 6, doc.y + 2, { width: lw }); }
      if (co.state_name) {
        font('Helvetica', 8.5);
        txt(`State Name : ${co.state_name}${co.state_code ? `, Code : ${co.state_code}` : ''}`, L + 6, doc.y + 1, { width: lw });
      }
      line(L, T + 92, SPLIT, T + 92, 0.5);
      font('Helvetica', 7.5);
      txt('Buyer (Bill to)', L + 6, T + 97);
      font('Helvetica-Bold', 10);
      txt(c.name, L + 6, T + 108, { width: lw });
      font('Helvetica', 8.5);
      if (c.address) txt(c.address, L + 6, doc.y + 1, { width: lw });
      if (c.tax_id) txt(`Tax ID: ${c.tax_id}`, L + 6, doc.y + 1, { width: lw });

      // Invoice details (right)
      line(SPLIT, T, SPLIT, T + HDR_H, 0.5);
      const rows = [
        [['Invoice No.', invoice.number ?? 'DRAFT'], ['Dated', fmtDate(invoice.issue_date)]],
        [['Reference No. & Date.', invoice.reference_no], ['Mode/Terms of Payment', invoice.payment_terms]],
        [["Buyer's Order No.", invoice.buyer_order_no], ['Dated', fmtDate(invoice.buyer_order_date)]],
      ];
      rows.forEach((row, i) => {
        const ry = T + i * 28;
        row.forEach(([label, val], j) => {
          const x = (j === 0 ? SPLIT : MID) + 6;
          const w = (j === 0 ? MID - SPLIT : R - MID) - 12;
          font('Helvetica', 7.5);
          txt(label, x, ry + 3, { width: w, lineBreak: false });
          font('Helvetica-Bold', 9);
          txt(val, x, ry + 14, { width: w, lineBreak: false });
        });
        line(SPLIT, ry + 28, R, ry + 28, 0.5);
      });
      line(MID, T, MID, T + 84, 0.5);

      font('Helvetica', 7.5);
      txt('Other References', SPLIT + 6, T + 87);
      font('Helvetica-Bold', 9);
      txt(invoice.other_references, SPLIT + 6, T + 98, { width: R - SPLIT - 12, lineBreak: false });
      line(SPLIT, T + 112, R, T + 112, 0.5);

      font('Helvetica', 7.5);
      txt('Country:', SPLIT + 6, T + 119, { lineBreak: false });
      font('Helvetica-Bold', 9);
      txt(c.country, SPLIT + 44, T + 117, { width: R - SPLIT - 50, lineBreak: false });
      line(SPLIT, T + 134, R, T + 134, 0.5);

      font('Helvetica', 7.5);
      txt('Terms of Delivery', SPLIT + 6, T + 138);
      font('Helvetica-Bold', 9);
      txt(invoice.delivery_terms, SPLIT + 6, T + 149, { width: R - SPLIT - 12, height: 36 });

      tableHeader(tableTop);
      y = tableTop + TH + 6;
    };

    const nextPage = () => {
      doc.addPage();
      pageTop = 40;
      tableTop = 40;
      tableHeader(40);
      y = 40 + TH + 6;
    };

    const closePage = (last) => {
      const colsBottom = last ? BB + TOTAL_H : BB;
      for (let i = 1; i < E.length - 1; i++) line(E[i], tableTop, E[i], colsBottom, 0.5);
      line(L, BB, R, BB);
      if (!last) {
        font('Helvetica-Oblique', 8);
        txt('continued ...', L, BB - 14, { width: W - 8, align: 'right' });
        doc.save().lineWidth(0.9).strokeColor('#000').rect(L, pageTop, W, BB - pageTop).stroke().restore();
        return;
      }

      // Total
      font('Helvetica', 9);
      txt('Total', E[1] + 4, BB + 8, { width: E[2] - E[1] - 12, align: 'right' });
      font('Helvetica-Bold', 11);
      txt(money(invoice.total_minor), E[6] + 2, BB + 6, { width: E[7] - E[6] - 8, align: 'right', lineBreak: false });
      line(L, BB + TOTAL_H, R, BB + TOTAL_H);

      // Amount in words
      const wy = BB + TOTAL_H;
      font('Helvetica', 7.5);
      txt('Amount Chargeable (in words)', L + 6, wy + 4);
      font('Helvetica-Bold', 9);
      txt(amountInWords(invoice.total_minor, cur), L + 6, wy + 16, { width: W - 90 });
      font('Helvetica-Oblique', 8);
      txt('E. & O.E', R - 70, wy + 4, { width: 64, align: 'right' });
      line(L, wy + WORDS_H, R, wy + WORDS_H);

      // Declaration (left), bank details and signatory (right)
      const fy = wy + WORDS_H;
      line(290, fy, 290, END, 0.5);
      font('Helvetica', 7.5);
      txt('Declaration', L + 6, fy + 38, { underline: true });
      font('Helvetica', 8);
      txt(co.declaration, L + 6, fy + 50, { width: 240 });

      font('Helvetica', 8);
      txt("Company's Bank Details", 296, fy + 4);
      const bank = [
        ["A/c Holder's Name", co.bank_holder],
        ['Bank Name', co.bank_name],
        ['A/c No.', co.bank_account],
        ['Branch & IFS Code', co.bank_branch_ifsc],
      ];
      bank.forEach(([label, val], i) => {
        const by = fy + 15 + i * 10.5;
        font('Helvetica', 7.5);
        txt(label, 296, by, { lineBreak: false });
        font('Helvetica-Bold', 7);
        txt(`: ${val ?? ''}`, 366, by, { width: R - 370 });
      });
      line(290, fy + 58, R, fy + 58, 0.5);
      font('Helvetica-Bold', 8);
      txt(`for ${co.company_name ?? ''}`, 294, fy + 63, { width: R - 298, align: 'center' });
      font('Helvetica', 8);
      txt('Authorised Signatory', 294, fy + FOOT_H - 14, { width: R - 302, align: 'right' });

      doc.save().lineWidth(0.9).strokeColor('#000').rect(L, pageTop, W, END - pageTop).stroke().restore();
      font('Helvetica', 8);
      txt('This is a Computer Generated Invoice', L, END + 9, { width: W, align: 'center' });
    };

    // ---- Items ----
    firstHeader();
    const descW = E[2] - E[1] - 8;
    items.forEach((it, idx) => {
      font('Helvetica-Bold', 9);
      let h = doc.heightOfString(it.description, { width: descW });
      if (it.details) {
        font('Helvetica-Oblique', 8);
        h += doc.heightOfString(it.details, { width: descW }) + 1;
      }
      h += 8;
      if (y + h > BB - 6) {
        closePage(false);
        nextPage();
      }
      const base = y;
      font('Helvetica', 8.5);
      txt(idx + 1, E[0] + 2, base, { width: E[1] - E[0] - 4, align: 'center' });
      font('Helvetica-Bold', 9);
      txt(it.description, E[1] + 4, base, { width: descW });
      if (it.details) {
        font('Helvetica-Oblique', 8);
        txt(it.details, E[1] + 4, doc.y + 1, { width: descW });
      }
      font('Helvetica', 8.5);
      txt(it.hsn_sac, E[2] + 4, base, { width: E[3] - E[2] - 8, lineBreak: false });
      const lump = Number(it.quantity) === 1 && !it.unit;
      if (!lump) {
        txt(`${it.quantity}`, E[3] + 2, base, { width: E[4] - E[3] - 6, align: 'right', lineBreak: false });
        txt(fmtNumber(it.unit_price_minor), E[4] + 2, base, { width: E[5] - E[4] - 6, align: 'right', lineBreak: false });
        txt(it.unit, E[5] + 2, base, { width: E[6] - E[5] - 4, align: 'center', lineBreak: false });
      }
      font('Helvetica-Bold', 9);
      txt(money(it.total_minor), E[6] + 2, base, { width: E[7] - E[6] - 8, align: 'right', lineBreak: false });
      y += h;
    });
    closePage(true);

    doc.end();
  });
}
