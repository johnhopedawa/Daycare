const PDFDocument = require('pdfkit');

function generatePaystub(payout, user, payPeriod, context = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const colors = {
        ink: '#111111',
        muted: '#666666',
        line: '#bfbfbf',
        blue: '#1b1bb3',
      };

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const left = 26;
      const right = pageWidth - 26;
      const top = 22;
      const contentWidth = right - left;
      const barHeight = 4;
      const fold1Y = pageHeight / 3;
      const fold2Y = (pageHeight * 2) / 3;

      const safeNumber = (value) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      };

      const formatNumber = (value, decimals = 2) => {
        const num = safeNumber(value);
        if (num === null) {
          return '-';
        }
        return num.toFixed(decimals);
      };

      const formatHours = (value) => {
        const num = safeNumber(value);
        if (num === null) {
          return '-';
        }
        return num.toFixed(2);
      };

      const formatRate = (value) => {
        const num = safeNumber(value);
        if (num === null) {
          return '-';
        }
        return formatCurrency(num);
      };

      const writeLines = (lines, x, y, width, align = 'left') => {
        let cursor = y;
        lines.forEach((line) => {
          if (!line) {
            return;
          }
          const height = doc.heightOfString(String(line), { width, align });
          doc.text(String(line), x, cursor, { width, align });
          cursor += height;
        });
        return cursor - y;
      };

      const drawBar = (y) => {
        doc.save();
        doc.rect(left, y, contentWidth, barHeight).fill(colors.blue);
        doc.restore();
      };

      const drawDottedLine = (y) => {
        doc.save();
        doc.strokeColor('#dddddd');
        doc.lineWidth(1);
        doc.dash(1.5, { space: 2.5 });
        doc.moveTo(left, y).lineTo(right, y).stroke();
        doc.undash();
        doc.restore();
      };

      const drawTable = ({
        x,
        y,
        width,
        headers,
        rows,
        colPercents,
        alignments,
        headerBorderWidth = 2,
        headerBorderColor = '#777777',
        rowHeight = 13,
        cellPaddingX = 0,
        cellPaddingY = 0,
        headerPaddingX = 0,
        headerPaddingY = 0,
      }) => {
        const colWidths = colPercents.map((percent) => width * percent);
        let cursorY = y;

        doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
        let colX = x;
        headers.forEach((header, index) => {
          const colWidth = colWidths[index];
          const align = alignments[index] || 'left';
          doc.text(header, colX + headerPaddingX, cursorY + headerPaddingY, {
            width: colWidth - headerPaddingX * 2,
            align,
          });
          colX += colWidth;
        });

        cursorY += rowHeight;
        doc.save();
        doc.strokeColor(headerBorderColor).lineWidth(headerBorderWidth);
        doc.moveTo(x, cursorY).lineTo(x + width, cursorY).stroke();
        doc.restore();

        doc.font('Helvetica').fontSize(11).fillColor(colors.ink);
        rows.forEach((row) => {
          colX = x;
          row.forEach((cell, index) => {
            const colWidth = colWidths[index];
            const align = alignments[index] || 'left';
            const text = cell === null || cell === undefined ? '' : String(cell);
            doc.text(text, colX + cellPaddingX, cursorY + cellPaddingY, {
              width: colWidth - cellPaddingX * 2,
              align,
            });
            colX += colWidth;
          });
          cursorY += rowHeight;
        });

        return cursorY - y;
      };

      const daycare = context.daycare || {};
      const companyName = daycare.name || 'Daycare Management System';
      const companyAddressLines = [
        daycare.address_line1,
        daycare.address_line2,
        [daycare.city, daycare.province, daycare.postal_code].filter(Boolean).join(' '),
      ].filter((line) => line && String(line).trim() !== '');

      const employeeName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Employee';
      const employeeAddressLines = [
        user.address_line1,
        user.address_line2,
        [user.city, user.province, user.postal_code].filter(Boolean).join(' '),
      ].filter((line) => line && String(line).trim() !== '');

      const gross = safeNumber(payout.gross_amount) || 0;
      const deductions = safeNumber(payout.deductions) || 0;
      const net = safeNumber(payout.net_amount);
      const netPay = net !== null ? net : gross - deductions;

      const payDate = formatDate(payout.payout_created_at || payPeriod.end_date || payPeriod.start_date);

      const annualVac = safeNumber(user.annual_vacation_days);
      const annualSick = safeNumber(user.annual_sick_days);
      const remainingVac = safeNumber(user.vacation_days_remaining);
      const remainingSick = safeNumber(user.sick_days_remaining);
      const vacUsed = annualVac !== null && remainingVac !== null
        ? Math.max(0, annualVac - remainingVac)
        : null;
      const sickUsed = annualSick !== null && remainingSick !== null
        ? Math.max(0, annualSick - remainingSick)
        : null;

      const ytdGross = safeNumber(user.ytd_gross) ?? gross;
      const ytdTax = safeNumber(user.ytd_tax) ?? 0;
      const ytdCpp = safeNumber(user.ytd_cpp) ?? 0;
      const ytdEi = safeNumber(user.ytd_ei) ?? 0;
      const ytdTaxTotal = ytdTax + ytdCpp + ytdEi;

      // Fold lines
      drawBar(top);
      drawBar(fold1Y);
      drawDottedLine(fold2Y);

      // Top header section
      const headerTop = top + barHeight + 8;
      const gapTop = 16;
      const detailWidth = 220;
      const detailX = right - detailWidth;
      const leftWidth = contentWidth - detailWidth - gapTop;
      const leftX = left;

      let leftCursor = headerTop;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
      const companyIndent = 76;
      const companyTextWidth = Math.max(0, leftWidth - companyIndent);
      leftCursor += writeLines([companyName], leftX + companyIndent, leftCursor, companyTextWidth);
      doc.font('Helvetica').fontSize(11).fillColor(colors.ink);
      if (companyAddressLines.length) {
        leftCursor += writeLines(companyAddressLines, leftX + companyIndent, leftCursor, companyTextWidth);
      }

      leftCursor += 52;
      const employeeIndent = 58;
      const employeeTextWidth = Math.max(0, leftWidth - employeeIndent);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
      leftCursor += writeLines([employeeName], leftX + employeeIndent, leftCursor, employeeTextWidth);
      doc.font('Helvetica').fontSize(11).fillColor(colors.ink);
      if (employeeAddressLines.length) {
        leftCursor += writeLines(employeeAddressLines, leftX + employeeIndent, leftCursor, employeeTextWidth);
      }

      const detailLineHeight = doc.currentLineHeight();
      let detailCursor = headerTop;
      doc.font('Helvetica').fontSize(11).fillColor(colors.ink);
      doc.text('Pay Stub Detail', detailX, detailCursor, {
        width: detailWidth,
        align: 'right',
      });
      detailCursor += detailLineHeight;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
      doc.text(`PAY DATE: ${payDate}`, detailX, detailCursor, {
        width: detailWidth,
        align: 'right',
      });
      detailCursor += detailLineHeight;
      doc.text(`NET PAY: ${formatCurrency(netPay)}`, detailX, detailCursor, {
        width: detailWidth,
        align: 'right',
      });

      // Middle section
      const midTop = fold1Y + barHeight + 10;
      const midGap = 28;
      const midAvailable = contentWidth - midGap;
      const leftColWidth = (midAvailable * 1.25) / 2.25;
      const rightColWidth = midAvailable - leftColWidth;
      const leftColX = left;
      const rightColX = left + leftColWidth + midGap;

      let leftY = midTop;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
      doc.text('EMPLOYER', leftColX, leftY);
      leftY += 13;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
      doc.text(companyName, leftColX, leftY, { width: leftColWidth });
      leftY += 13;
      doc.font('Helvetica').fontSize(11).fillColor(colors.ink);
      if (companyAddressLines.length) {
        leftY += writeLines(companyAddressLines, leftColX, leftY, leftColWidth);
      }
      leftY += 14;

      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
      doc.text('EMPLOYEE', leftColX, leftY);
      leftY += 13;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
      doc.text(employeeName, leftColX, leftY, { width: leftColWidth });
      leftY += 13;
      doc.font('Helvetica').fontSize(11).fillColor(colors.ink);
      if (employeeAddressLines.length) {
        leftY += writeLines(employeeAddressLines, leftColX, leftY, leftColWidth);
      }
      leftY += 14;

      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
      doc.text('BENEFITS', leftColX, leftY);
      leftY += 13;

      const benefitColPercents = [0.44, 0.19, 0.19, 0.18];
      const benefitAligns = ['left', 'right', 'right', 'right'];
      const benefitHeaders = ['', 'Accrued', 'Used', 'Available'];
      const benefitRows = [
        [
          'Vacation',
          formatNumber(annualVac),
          formatNumber(vacUsed),
          formatNumber(remainingVac),
        ],
        [
          'Sick',
          formatNumber(annualSick),
          formatNumber(sickUsed),
          formatNumber(remainingSick),
        ],
      ];

      leftY += drawTable({
        x: leftColX,
        y: leftY,
        width: leftColWidth,
        headers: benefitHeaders,
        rows: benefitRows,
        colPercents: benefitColPercents,
        alignments: benefitAligns,
        headerBorderWidth: 0,
        headerBorderColor: colors.line,
        rowHeight: 13,
      });

      let rightY = midTop;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
      doc.text('PAY PERIOD', rightColX, rightY);
      rightY += 13;
      doc.font('Helvetica').fontSize(11).fillColor(colors.ink);

      const kvRows = [
        ['Period Beginning:', formatDate(payPeriod.start_date)],
        ['Period Ending:', formatDate(payPeriod.end_date)],
        ['Pay Date:', payDate],
        ['Total Hours:', formatHours(payout.total_hours)],
      ];

      const kvRowHeight = 13;
      kvRows.forEach(([label, value]) => {
        doc.text(label, rightColX, rightY, { width: rightColWidth * 0.65, align: 'left' });
        doc.text(value, rightColX, rightY, { width: rightColWidth, align: 'right' });
        rightY += kvRowHeight;
      });

      rightY += 12;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
      doc.text('NET PAY:', rightColX, rightY, { width: rightColWidth * 0.6, align: 'left' });
      doc.text(formatCurrency(netPay), rightColX, rightY, { width: rightColWidth, align: 'right' });

      const memoY = Math.max(fold2Y - 12, leftY + 6);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.ink);
      doc.text('MEMO:', leftColX, memoY);

      // Bottom tables (row 1)
      const bottomTop = fold2Y + 12;
      const bottomGap = 26;
      const colWidth = (contentWidth - bottomGap) / 2;
      const leftTableX = left;
      const rightTableX = left + colWidth + bottomGap;

      const payHeaders = ['PAY', 'Hours', 'Rate', 'Current', 'YTD'];
      const payRows = [
        [
          'Regular Pay',
          formatHours(payout.total_hours),
          formatRate(payout.hourly_rate),
          formatCurrency(gross),
          formatCurrency(ytdGross),
        ],
        ['Sick Pay', '-', '-', '-', '-'],
        ['Vacation Pay', '-', '-', '-', '-'],
        ['Bonus', '-', '-', '-', '-'],
        ['Retro Payment- Amour', '-', '-', '-', '-'],
      ];

      const payHeight = drawTable({
        x: leftTableX,
        y: bottomTop,
        width: colWidth,
        headers: payHeaders,
        rows: payRows,
        colPercents: [0.40, 0.15, 0.15, 0.15, 0.15],
        alignments: ['left', 'right', 'right', 'right', 'right'],
        headerBorderWidth: 2,
        headerBorderColor: '#777777',
        rowHeight: 13,
      });

      const deductionsHeaders = ['DEDUCTIONS', 'Current', 'YTD'];
      const deductionsRows = [
        [' ', ' ', ' '],
        [' ', ' ', ' '],
      ];

      drawTable({
        x: rightTableX,
        y: bottomTop,
        width: colWidth,
        headers: deductionsHeaders,
        rows: deductionsRows,
        colPercents: [0.50, 0.25, 0.25],
        alignments: ['left', 'right', 'right'],
        headerBorderWidth: 2,
        headerBorderColor: '#777777',
        rowHeight: 13,
      });

      // Bottom tables (row 2)
      const row2Top = bottomTop + payHeight + 18;
      const taxesHeaders = ['TAXES', 'Current', 'YTD'];
      const taxesRows = [
        ['Income Tax', formatCurrency(deductions), formatCurrency(ytdTax)],
        ['Employment Insurance', formatCurrency(0), formatCurrency(ytdEi)],
        ['Canada Pension Plan', formatCurrency(0), formatCurrency(ytdCpp)],
        ['Second Canada Pension Plan', formatCurrency(0), formatCurrency(0)],
      ];

      drawTable({
        x: leftTableX,
        y: row2Top,
        width: colWidth,
        headers: taxesHeaders,
        rows: taxesRows,
        colPercents: [0.50, 0.25, 0.25],
        alignments: ['left', 'right', 'right'],
        headerBorderWidth: 2,
        headerBorderColor: '#777777',
        rowHeight: 13,
      });

      const summaryHeaders = ['SUMMARY', 'Current', 'YTD'];
      const summaryRows = [
        ['Total Pay', formatCurrency(gross), formatCurrency(ytdGross)],
        ['Taxes', formatCurrency(deductions), formatCurrency(ytdTaxTotal)],
        ['Deductions', formatCurrency(0), formatCurrency(0)],
      ];

      const summaryPadding = 6;
      const summaryTableX = rightTableX + summaryPadding;
      const summaryTableWidth = colWidth - summaryPadding * 2;
      const summaryHeight = drawTable({
        x: summaryTableX,
        y: row2Top + summaryPadding,
        width: summaryTableWidth,
        headers: summaryHeaders,
        rows: summaryRows,
        colPercents: [0.50, 0.25, 0.25],
        alignments: ['left', 'right', 'right'],
        headerBorderWidth: 1,
        headerBorderColor: '#777777',
        rowHeight: 13,
        cellPaddingX: 0,
        cellPaddingY: 0,
      });

      const summaryBoxHeight = summaryHeight + summaryPadding * 2;
      doc.save();
      doc.rect(rightTableX, row2Top, colWidth, summaryBoxHeight).stroke('#777777');
      doc.restore();

      const netFooterY = row2Top + summaryBoxHeight + 10;
      doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.ink);
      doc.text(`Net Pay  ${formatCurrency(netPay)}`, rightTableX, netFooterY, {
        width: colWidth,
        align: 'center',
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '$0.00';
  }
  return `$${amount.toFixed(2)}`;
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getField = (obj, keys, fallback) => {
  if (!obj) {
    return fallback;
  }
  for (const key of keys) {
    if (obj[key]) {
      return obj[key];
    }
  }
  return fallback;
};

function generateReceipt(payment, parent, context = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { invoice, settings, daycare } = context;
      const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const colors = {
        ink: '#3b3b2a',
        muted: '#6a6a55',
        accent: '#b15a1a',
        rule: '#b7b27a',
        panel: '#000000',
        paid: '#d44b3f'
      };

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const left = 52;
      const right = pageWidth - 52;
      const top = 46;
      const bottom = 44;
      const contentWidth = right - left;
      let y = top;

      const daycareName = getField(daycare, ['name', 'daycare_name'], 'Daycare Management System');
      const addressLine1 = getField(daycare, ['address_line1', 'addressLine1']);
      const addressLine2 = getField(daycare, ['address_line2', 'addressLine2']);
      const daycareCity = getField(daycare, ['city']);
      const daycareProvince = getField(daycare, ['province', 'region']);
      const daycarePostal = getField(daycare, ['postal_code', 'postalCode']);
      const phone1 = getField(daycare, ['phone1', 'phone']);
      const phone2 = getField(daycare, ['phone2']);
      const contactName = getField(daycare, ['contact_name', 'contactName']);
      const contactPhone = getField(daycare, ['contact_phone', 'contactPhone']);
      const contactEmail = getField(daycare, ['contact_email', 'contactEmail']);
      const signatureName = getField(
        daycare,
        ['signature_name', 'signatureName'],
        contactName || daycareName
      );
      const signatureImage = getField(daycare, ['signature_image', 'signatureImage']);
      const signatureMode = getField(daycare, ['signature_mode', 'signatureMode'], 'both');

      const getSignatureBuffer = (dataUrl) => {
        if (!dataUrl || typeof dataUrl !== 'string') {
          return null;
        }
        const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
        if (!match) {
          return null;
        }
        try {
          return Buffer.from(match[2], 'base64');
        } catch (error) {
          return null;
        }
      };

      // Receipt number
      doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(colors.muted)
        .text(`RECEIPT #${payment.receipt_number || payment.id}`, left, y);
      y += 20;

      // Company name
      doc.font('Times-Roman')
        .fontSize(32)
        .fillColor(colors.accent)
        .text(daycareName, left, y, { width: contentWidth });
      y += doc.currentLineHeight() + 6;

      // Address
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor(colors.muted);
      const addressLines = [];
      if (addressLine1) addressLines.push(addressLine1);
      if (addressLine2) addressLines.push(addressLine2);
      const cityLine = [daycareCity, daycareProvince, daycarePostal].filter(Boolean).join(' ');
      if (cityLine) addressLines.push(cityLine);
      if (addressLines.length > 0) {
        const addressText = addressLines.join('\n');
        doc.text(addressText, left, y, { width: contentWidth, lineGap: 2 });
        y += doc.heightOfString(addressText, { width: contentWidth, lineGap: 2 }) + 6;
      }

      // Phones
      if (phone1 || phone2) {
        const phones = [phone1, phone2].filter(Boolean).join(' | ');
        doc.text(phones, left, y);
        y += 14;
      }
      y += 10;

      // Date row
      doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.muted);
      doc.text('DATE:', left, y);
      doc.font('Helvetica').fontSize(10).fillColor(colors.muted);
      doc.text(formatDate(payment.payment_date), left + 60, y);
      y += 18;

      // Bill To / For blocks
      const blockGap = 40;
      const blockWidth = (contentWidth - blockGap) / 2;
      const billToX = left;
      const forX = left + blockWidth + blockGap;
      const blockTop = y + 6;

      doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.muted);
      doc.text('BILL TO', billToX, blockTop);
      doc.text('FOR', forX, blockTop);

      const billToLines = [];
      const parentName = `${parent.first_name || ''} ${parent.last_name || ''}`.trim();
      if (parentName) billToLines.push(parentName);
      if (parent.address_line1) billToLines.push(parent.address_line1);
      if (parent.address_line2) billToLines.push(parent.address_line2);
      const parentCityLine = [parent.city, parent.province, parent.postal_code]
        .filter(Boolean)
        .join(' ');
      if (parentCityLine) billToLines.push(parentCityLine);
      if (parent.phone) billToLines.push(parent.phone);

      doc.font('Helvetica').fontSize(10).fillColor(colors.ink);
      const billToText = billToLines.join('\n');
      const billToY = blockTop + 14;
      doc.text(billToText, billToX, billToY, { width: blockWidth });

      const forLines = [];
      if (invoice?.invoice_number) {
        forLines.push(`Invoice ${invoice.invoice_number}`);
      }
      if (invoice?.child_name) {
        forLines.push(invoice.child_name);
      }
      if (!invoice?.invoice_number && payment?.invoice_id) {
        forLines.push('Invoice payment');
      }
      if (payment?.notes) {
        forLines.push(payment.notes);
      }
      if (forLines.length === 0) {
        forLines.push('Daycare payment');
      }

      const forText = forLines.join('\n');
      const forY = blockTop + 14;
      doc.fillColor(colors.muted).text(forText, forX, forY, { width: blockWidth });

      const billToHeight = doc.heightOfString(billToText || ' ', { width: blockWidth });
      const forHeight = doc.heightOfString(forText || ' ', { width: blockWidth });
      y = Math.max(billToY + billToHeight, forY + forHeight) + 12;

      // Table
      const detailsWidth = Math.round(contentWidth * 0.62);
      const panelX = left + detailsWidth;
      const amountWidth = right - panelX;
      const tableTop = y;
      const headerHeight = 12;
      const rowHeight = 22;

      doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.muted);
      doc.text('Details', left + 2, tableTop);
      doc.text('AMOUNT', panelX + 4, tableTop);

      let items = Array.isArray(invoice?.line_items) ? invoice.line_items : [];
      items = items
        .map((item) => ({
          description: item.description || item.name || '',
          amount: item.amount ?? item.total ?? item.value
        }))
        .filter((item) => item.description || item.amount !== undefined);

      if (items.length === 0) {
        items = [
          {
            description: invoice?.invoice_number ? `Payment for ${invoice.invoice_number}` : 'Payment',
            amount: payment.amount
          }
        ];
      }

      const blankRows = 2;
      const rowCount = items.length + blankRows;
      const rowsStartY = tableTop + headerHeight;
      const tableHeight = rowCount * rowHeight;

      // Column panel behind amount
      doc.save();
      doc.fillColor(colors.panel, 0.045);
      doc.rect(panelX, rowsStartY, amountWidth, tableHeight).fill();
      doc.restore();

      // Row rules
      doc.save();
      doc.strokeColor(colors.rule).lineWidth(1);
      for (let i = 0; i <= rowCount; i += 1) {
        const lineY = rowsStartY + i * rowHeight;
        doc.moveTo(left, lineY).lineTo(right, lineY).stroke();
      }
      doc.restore();

      // Row text
      doc.font('Helvetica').fontSize(10).fillColor(colors.ink);
      items.forEach((item, index) => {
        const rowY = rowsStartY + index * rowHeight + 8;
        doc.text(item.description, left + 2, rowY, { width: detailsWidth - 6 });
        doc.text(formatCurrency(item.amount), panelX + 4, rowY, {
          width: amountWidth - 4,
          align: 'left'
        });
      });

      y = rowsStartY + tableHeight;

      // Totals panel
      const totalsX = panelX;
      const totalsWidth = amountWidth;
      const totalsRowHeight = 16;
      const totalsLabelX = left;
      const totalsLabelWidth = detailsWidth - 12;

      const subtotalValue =
        invoice?.subtotal !== undefined ? invoice.subtotal : payment.amount;
      const taxAmount = invoice?.tax_amount !== undefined ? invoice.tax_amount : 0;
      const taxRate = invoice?.tax_rate ?? settings?.tax_rate;
      const totalValue =
        invoice?.total_amount !== undefined ? invoice.total_amount : payment.amount;

      const totalsRows = [
        { label: 'SUBTOTAL', value: formatCurrency(subtotalValue) }
      ];

      if (taxAmount > 0) {
        const rateLabel = taxRate ? ` (${(Number(taxRate) * 100).toFixed(2)}%)` : '';
        totalsRows.push({ label: `TAX${rateLabel}`, value: formatCurrency(taxAmount) });
      } else {
        totalsRows.push({ label: 'OTHER', value: formatCurrency(0) });
      }

      totalsRows.push({ label: 'TOTAL', value: formatCurrency(totalValue), isTotal: true });

      const totalsHeight = totalsRows.length * totalsRowHeight + 10;
      doc.save();
      doc.fillColor(colors.panel, 0.045);
      doc.rect(totalsX, y, totalsWidth, totalsHeight).fill();
      doc.restore();

      let totalsY = y + 6;
      totalsRows.forEach((row) => {
        doc.font('Helvetica').fontSize(9).fillColor(colors.muted);
        doc.text(row.label, totalsLabelX, totalsY, {
          width: totalsLabelWidth,
          align: 'right'
        });
        if (row.isTotal) {
          const paid =
            payment?.status === 'PAID' ||
            (invoice && Number(invoice.balance_due) === 0);
          if (paid) {
            const paidText = 'PAID';
            const valueX = totalsX + 4;
            doc.font('Helvetica').fontSize(9).fillColor(colors.ink).text(row.value, valueX, totalsY);
            const valueWidth = doc.widthOfString(row.value, { fontSize: 9, font: 'Helvetica' });
            doc.font('Helvetica')
              .fontSize(9)
              .fillColor(colors.paid)
              .text(paidText, valueX + valueWidth + 8, totalsY);
          } else {
            doc.font('Helvetica').fontSize(9).fillColor(colors.ink);
            doc.text(row.value, totalsX + 4, totalsY, { align: 'left' });
          }
        } else {
          doc.font('Helvetica').fontSize(9).fillColor(colors.ink);
          doc.text(row.value, totalsX + 4, totalsY, { align: 'left' });
        }
        totalsY += totalsRowHeight;
      });

      y += totalsHeight + 26;

      if (y + 90 > pageHeight - bottom) {
        doc.addPage({ size: 'LETTER', margin: 0 });
        y = top;
      }

      // Footer
      doc.font('Helvetica').fontSize(9).fillColor(colors.muted);
      doc.text(
        'If you have any questions concerning this receipt, use the following contact information:',
        left,
        y,
        { width: contentWidth }
      );
      y += 16;

      if (contactName || contactPhone || contactEmail) {
        const contactLine = [
          contactName,
          contactPhone ? `(${contactPhone})` : null,
          contactEmail
        ]
          .filter(Boolean)
          .join(' ');
        doc.font('Helvetica').fontSize(9).fillColor(colors.muted);
        doc.text(contactLine, left, y, { width: contentWidth });
        y += 16;
      }

      doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.muted);
      doc.text('THANK YOU FOR YOUR BUSINESS!', left, y);
      y += 14;

      const signatureBuffer = getSignatureBuffer(signatureImage);
      const showSignature = signatureMode === 'signature' || signatureMode === 'both';
      const showSignatureName = signatureMode === 'name' || signatureMode === 'both';

      if (showSignature && signatureBuffer) {
        try {
          doc.image(signatureBuffer, left, y, { fit: [180, 48] });
          y += 52;
        } catch (error) {
          // ignore invalid image data
        }
      } else if (showSignature && !signatureBuffer && !showSignatureName) {
        // Fallback to signature name if image-only mode has no image.
        doc.font('Times-Italic').fontSize(18).fillColor(colors.ink);
        doc.text(signatureName || daycareName, left, y);
        y += 20;
      }

      if (showSignatureName) {
        doc.font('Times-Italic').fontSize(18).fillColor(colors.ink);
        doc.text(signatureName || daycareName, left, y);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generatePaystub, generateReceipt };
