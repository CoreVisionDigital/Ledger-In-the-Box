import { formatNaira } from './money';

/**
 * Converts an array of objects to a CSV string and initiates browser download
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const sanitize = (val: string | number): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(sanitize).join(','),
    ...rows.map(row => row.map(sanitize).join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports financial report to CSV
 */
export function exportFinancialReportCsv(
  reportTitle: string,
  businessName: string,
  dateRangeLabel: string,
  rows: { label: string; invoicedKobo?: number; cashKobo?: number; notes?: string }[]
): void {
  const headers = ['Financial Line Item', 'Invoiced Amount (NGN)', 'Cash Received / Disbursed (NGN)', 'Notes'];
  const data = rows.map(r => [
    r.label,
    r.invoicedKobo !== undefined ? formatNaira(r.invoicedKobo, false) : '-',
    r.cashKobo !== undefined ? formatNaira(r.cashKobo, false) : '-',
    r.notes || ''
  ]);

  exportToCsv(`${reportTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`, headers, data);
}
