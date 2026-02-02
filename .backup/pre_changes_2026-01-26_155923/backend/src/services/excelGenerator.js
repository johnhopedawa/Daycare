const ExcelJS = require('exceljs');

async function generatePayrollSummary(payPeriod, payouts) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Payroll Summary');

  // Title
  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = `Payroll Summary - ${payPeriod.name}`;
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  // Date range
  worksheet.mergeCells('A2:F2');
  worksheet.getCell('A2').value = `Period: ${new Date(payPeriod.start_date).toLocaleDateString()} - ${new Date(payPeriod.end_date).toLocaleDateString()}`;
  worksheet.getCell('A2').alignment = { horizontal: 'center' };

  // Headers
  worksheet.addRow([]);
  const headerRow = worksheet.addRow([
    'Employee Name',
    'Email',
    'Hours',
    'Hourly Rate',
    'Gross Pay',
    'Net Pay'
  ]);

  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };

  // Data rows
  let totalHours = 0;
  let totalGross = 0;
  let totalNet = 0;

  for (const payout of payouts) {
    worksheet.addRow([
      `${payout.first_name} ${payout.last_name}`,
      payout.email,
      parseFloat(payout.total_hours),
      parseFloat(payout.hourly_rate),
      parseFloat(payout.gross_amount),
      parseFloat(payout.net_amount)
    ]);

    totalHours += parseFloat(payout.total_hours);
    totalGross += parseFloat(payout.gross_amount);
    totalNet += parseFloat(payout.net_amount);
  }

  // Totals row
  worksheet.addRow([]);
  const totalsRow = worksheet.addRow([
    'TOTALS',
    '',
    totalHours,
    '',
    totalGross,
    totalNet
  ]);

  totalsRow.font = { bold: true };
  totalsRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB9C' }
  };

  // Format columns
  worksheet.getColumn(1).width = 20;
  worksheet.getColumn(2).width = 25;
  worksheet.getColumn(3).width = 10;
  worksheet.getColumn(4).width = 12;
  worksheet.getColumn(5).width = 12;
  worksheet.getColumn(6).width = 12;

  // Number formatting
  worksheet.getColumn(3).numFmt = '0.00';
  worksheet.getColumn(4).numFmt = '$#,##0.00';
  worksheet.getColumn(5).numFmt = '$#,##0.00';
  worksheet.getColumn(6).numFmt = '$#,##0.00';

  return workbook;
}

module.exports = { generatePayrollSummary };
