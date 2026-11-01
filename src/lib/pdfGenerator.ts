import { jsPDF } from 'jspdf';
import { Invoice, Quotation, Receipt, Business } from '../types';
import { formatNaira } from './money';

/**
 * Standardizes text rendering for jsPDF (replaces unicode Naira symbol with NGN in pure PDF fonts if needed)
 */
function cleanMoney(amountKobo: number): string {
  return `NGN ${formatNaira(amountKobo, false)}`;
}

/**
 * Generate and download professional PDF Invoice
 */
export function generateInvoicePdf(invoice: Invoice, business: Business): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header Bar / Accent
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Business Name & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(business.name, 14, y);

  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text('INVOICE', pageWidth - 14, y, { align: 'right' });

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500

  // Business Sub-details
  const bizMeta: string[] = [];
  if (business.rcNumber) bizMeta.push(`CAC Reg: ${business.rcNumber}`);
  if (business.taxIdentificationNumber) bizMeta.push(`TIN: ${business.taxIdentificationNumber}`);
  if (bizMeta.length > 0) {
    doc.text(bizMeta.join('  |  '), 14, y);
    y += 5;
  }
  doc.text(`${business.address || ''}${business.state ? `, ${business.state}` : ''}`, 14, y);
  y += 5;
  doc.text(`Email: ${business.email}  |  Tel: ${business.phone}`, 14, y);

  // Invoice Number & Status on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - 14, y - 10, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issue Date: ${invoice.issueDate}`, pageWidth - 14, y - 5, { align: 'right' });
  doc.text(`Due Date: ${invoice.dueDate}`, pageWidth - 14, y, { align: 'right' });
  doc.text(`Terms: ${invoice.paymentTerms || 'Due on Receipt'}`, pageWidth - 14, y + 5, { align: 'right' });

  y += 15;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 10;

  // Billed To Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 25, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO:', 18, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customerName, 18, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`${invoice.customerEmail || ''}   ${invoice.customerPhone ? `|  ${invoice.customerPhone}` : ''}`, 18, y + 17);
  if (invoice.customerAddress) {
    doc.text(invoice.customerAddress, 18, y + 22);
  }

  y += 35;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('DESCRIPTION', 18, y + 5.5);
  doc.text('QTY', 115, y + 5.5, { align: 'center' });
  doc.text('UNIT PRICE', 145, y + 5.5, { align: 'right' });
  doc.text('DISC %', 165, y + 5.5, { align: 'right' });
  doc.text('TOTAL', pageWidth - 18, y + 5.5, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  // Table Items
  invoice.items.forEach((item, index) => {
    // Alternating background
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 3, pageWidth - 28, 7, 'F');
    }

    doc.text(item.description, 18, y + 2);
    doc.text(item.quantity.toString(), 115, y + 2, { align: 'center' });
    doc.text(cleanMoney(item.unitPriceMinor), 145, y + 2, { align: 'right' });
    doc.text(item.discountPercent > 0 ? `${item.discountPercent}%` : '-', 165, y + 2, { align: 'right' });
    doc.text(cleanMoney(item.lineTotalMinor), pageWidth - 18, y + 2, { align: 'right' });

    y += 8;
  });

  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Financial Summary (Right aligned)
  const summaryX = pageWidth - 75;
  const valueX = pageWidth - 18;

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', summaryX, y);
  doc.setTextColor(30, 41, 59);
  doc.text(cleanMoney(invoice.subtotalMinor), valueX, y, { align: 'right' });
  y += 6;

  if (invoice.discountMinor > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('Total Discount:', summaryX, y);
    doc.setTextColor(220, 38, 38);
    doc.text(`-${cleanMoney(invoice.discountMinor)}`, valueX, y, { align: 'right' });
    y += 6;
  }

  if (invoice.taxVatMinor > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('VAT (7.5%):', summaryX, y);
    doc.setTextColor(30, 41, 59);
    doc.text(`+${cleanMoney(invoice.taxVatMinor)}`, valueX, y, { align: 'right' });
    y += 6;
  }

  if (invoice.taxWhtMinor && invoice.taxWhtMinor > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('WHT Deducted:', summaryX, y);
    doc.setTextColor(220, 38, 38);
    doc.text(`-${cleanMoney(invoice.taxWhtMinor)}`, valueX, y, { align: 'right' });
    y += 6;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX - 5, y, pageWidth - 14, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Invoiced:', summaryX, y);
  doc.text(cleanMoney(invoice.totalMinor), valueX, y, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text('Amount Paid:', summaryX, y);
  doc.text(cleanMoney(invoice.amountPaidMinor), valueX, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(invoice.balanceDueMinor > 0 ? 220 : 16, invoice.balanceDueMinor > 0 ? 38 : 185, invoice.balanceDueMinor > 0 ? 38 : 129);
  doc.text('Balance Due:', summaryX, y);
  doc.text(cleanMoney(invoice.balanceDueMinor), valueX, y, { align: 'right' });

  // Bank Account Box on the Left
  let bankY = y - 30;
  if (business.bankDetails && business.bankDetails.accountNumber) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, bankY, 90, 32, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('PAYMENT DETAILS (NIGERIAN BANK):', 18, bankY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Bank: ${business.bankDetails.bankName || 'Access Bank / GTBank / Zenith'}`, 18, bankY + 13);
    doc.text(`Account No: ${business.bankDetails.accountNumber}`, 18, bankY + 19);
    doc.text(`Account Name: ${business.bankDetails.accountName}`, 18, bankY + 25);
  }

  y += 18;

  // Notes & Footer
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('NOTES / REMARKS:', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(invoice.notes, 14, y, { maxWidth: pageWidth - 28 });
    y += 10;
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for your business. Generated by BizLedger Financial Management SaaS.', pageWidth / 2, 285, { align: 'center' });

  // Save / Trigger Download
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

/**
 * Generate and download professional PDF Quotation
 */
export function generateQuotationPdf(quotation: Quotation, business: Business): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(business.name, 14, y);

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text('QUOTATION', pageWidth - 14, y, { align: 'right' });

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${business.address || ''}${business.state ? `, ${business.state}` : ''}`, 14, y);
  y += 5;
  doc.text(`Email: ${business.email}  |  Tel: ${business.phone}`, 14, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Quotation #: ${quotation.quotationNumber}`, pageWidth - 14, y - 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${quotation.issueDate}`, pageWidth - 14, y, { align: 'right' });
  doc.text(`Valid Until: ${quotation.validityDate}`, pageWidth - 14, y + 5, { align: 'right' });

  y += 15;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 10;

  // Prepared For
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 20, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('PREPARED FOR:', 18, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(quotation.customerName, 18, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`${quotation.customerEmail || ''}   ${quotation.customerPhone ? `|  ${quotation.customerPhone}` : ''}`, 18, y + 17);

  y += 30;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('DESCRIPTION', 18, y + 5.5);
  doc.text('QTY', 115, y + 5.5, { align: 'center' });
  doc.text('PRICE', 145, y + 5.5, { align: 'right' });
  doc.text('DISC %', 165, y + 5.5, { align: 'right' });
  doc.text('TOTAL', pageWidth - 18, y + 5.5, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  quotation.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 3, pageWidth - 28, 7, 'F');
    }

    doc.text(item.description, 18, y + 2);
    doc.text(item.quantity.toString(), 115, y + 2, { align: 'center' });
    doc.text(cleanMoney(item.unitPriceMinor), 145, y + 2, { align: 'right' });
    doc.text(item.discountPercent > 0 ? `${item.discountPercent}%` : '-', 165, y + 2, { align: 'right' });
    doc.text(cleanMoney(item.lineTotalMinor), pageWidth - 18, y + 2, { align: 'right' });

    y += 8;
  });

  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Summary
  const summaryX = pageWidth - 75;
  const valueX = pageWidth - 18;

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', summaryX, y);
  doc.setTextColor(30, 41, 59);
  doc.text(cleanMoney(quotation.subtotalMinor), valueX, y, { align: 'right' });
  y += 6;

  if (quotation.discountMinor > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('Discount:', summaryX, y);
    doc.setTextColor(220, 38, 38);
    doc.text(`-${cleanMoney(quotation.discountMinor)}`, valueX, y, { align: 'right' });
    y += 6;
  }

  if (quotation.taxVatMinor > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('VAT (7.5%):', summaryX, y);
    doc.setTextColor(30, 41, 59);
    doc.text(`+${cleanMoney(quotation.taxVatMinor)}`, valueX, y, { align: 'right' });
    y += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Estimated Total:', summaryX, y);
  doc.text(cleanMoney(quotation.totalMinor), valueX, y, { align: 'right' });

  y += 18;
  if (quotation.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('TERMS & CONDITIONS:', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(quotation.notes, 14, y, { maxWidth: pageWidth - 28 });
  }

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This quotation is an estimate and valid until the stated expiration date.', pageWidth / 2, 285, { align: 'center' });

  doc.save(`${quotation.quotationNumber}.pdf`);
}

/**
 * Generate and download official Payment Receipt PDF
 */
export function generateReceiptPdf(receipt: Receipt, business: Business): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 25;

  // Header border
  doc.setFillColor(16, 185, 129); // emerald-600
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(business.name, 14, y);

  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text('PAYMENT RECEIPT', pageWidth - 14, y, { align: 'right' });

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${business.address || ''}${business.state ? `, ${business.state}` : ''}`, 14, y);
  y += 5;
  doc.text(`Email: ${business.email}  |  Tel: ${business.phone}`, 14, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Receipt #: ${receipt.receiptNumber}`, pageWidth - 14, y - 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date Issued: ${receipt.paymentDate}`, pageWidth - 14, y, { align: 'right' });

  y += 15;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 12;

  // Large Amount Paid Banner
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(14, y, pageWidth - 28, 30, 3, 3, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, y, pageWidth - 28, 30, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.text('AMOUNT RECEIVED', pageWidth / 2, y + 10, { align: 'center' });

  doc.setFontSize(22);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text(cleanMoney(receipt.amountMinor), pageWidth / 2, y + 21, { align: 'center' });

  y += 42;

  // Grid of details
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 60, 2, 2, 'F');

  const leftCol = 22;
  const rightCol = 110;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('RECEIVED FROM:', leftCol, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.customerName, leftCol, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT METHOD:', rightCol, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.paymentMethod.replace('_', ' ').toUpperCase(), rightCol, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE REFERENCED:', leftCol, y + 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.invoiceNumber || 'Account Balance Credit', leftCol, y + 38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TRANSACTION REFERENCE / NIP ID:', rightCol, y + 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.paymentReference || 'N/A', rightCol, y + 38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('STATUS:', leftCol, y + 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text('SETTLED & CONFIRMED', leftCol, y + 56);

  y += 75;

  if (receipt.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('REMARKS:', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(receipt.notes, 14, y, { maxWidth: pageWidth - 28 });
  }

  // Footer stamp area
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This is an electronically generated and authenticated receipt. No physical signature required.', pageWidth / 2, 280, { align: 'center' });

  doc.save(`${receipt.receiptNumber}.pdf`);
}
