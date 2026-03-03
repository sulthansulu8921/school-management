import { jsPDF } from 'jspdf';

/**
 * Converts a numeric amount to English words.
 */
export const toWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
        if ((n = n.toString()).length > 9) return 'overflow';
        let nArray = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!nArray) return '';
        let str = '';
        str += nArray[1] != 0 ? (a[Number(nArray[1])] || b[nArray[1][0]] + ' ' + a[nArray[1][1]]) + 'Crore ' : '';
        str += nArray[2] != 0 ? (a[Number(nArray[2])] || b[nArray[2][0]] + ' ' + a[nArray[2][1]]) + 'Lakh ' : '';
        str += nArray[3] != 0 ? (a[Number(nArray[3])] || b[nArray[3][0]] + ' ' + a[nArray[3][1]]) + 'Thousand ' : '';
        str += nArray[4] != 0 ? (a[Number(nArray[4])] || b[nArray[4][0]] + ' ' + a[nArray[4][1]]) + 'Hundred ' : '';
        str += nArray[5] != 0 ? (str != '' ? 'and ' : '') + (a[Number(nArray[5])] || b[nArray[5][0]] + ' ' + a[nArray[5][1]]) : '';
        return str;
    };

    const amount = Math.floor(num);
    const words = inWords(amount);
    return words ? words + 'Rupees Only' : 'Zero Rupees Only';
};

/**
 * Generates a professional PDF receipt matching the reference image.
 */
export const generateReceiptPDF = async (receipt, logoBase64, options = {}) => {
    const { shouldSave = true, shouldOpen = true, format = 'a4', orientation = 'portrait' } = options;

    // A4 Portrait: [width: 595.28, height: 841.89] in pt
    const doc = new jsPDF({
        unit: 'pt',
        format: format,
        orientation: orientation
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;

    const TEXT_DARK = [20, 20, 20];
    const LINE_COLOR = [180, 180, 180];

    let y = 50;

    // Logo (Top Left)
    if (logoBase64) {
        doc.addImage(logoBase64, 'JPEG', margin, y - 10, 50, 50);
    }

    // School Header (Centered)
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Lourdes Mata Central School', pageW / 2 + 30, y, { align: 'center' });

    y += 18;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('KOVILTHOTTAM, CHAVARA (PO) CBIC AFF 931047', pageW / 2 + 30, y, { align: 'center' });

    y += 14;
    doc.text('PHONE 0476-2683401, 8281044713', pageW / 2 + 30, y, { align: 'center' });

    y += 45;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FEE RECEIPT', pageW / 2, y, { align: 'center' });
    doc.setLineWidth(0.8);
    const titleW = doc.getTextWidth('FEE RECEIPT');
    doc.line(pageW / 2 - titleW / 2, y + 2, pageW / 2 + titleW / 2, y + 2);

    y += 50;
    // Student Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt No : ${receipt.receipt_no}`, margin, y);
    doc.text(`Date : ${receipt.date}`, pageW - margin, y, { align: 'right' });

    y += 25;
    doc.text(`Name : ${receipt.student_details?.name || '-'}`, margin, y);

    y += 25;
    doc.text(`Admin No : ${receipt.student_details?.admission_no || '-'}`, margin, y);
    doc.text(`Class : ${receipt.student_details?.student_class || '-'}${receipt.student_details?.division || ''}`, pageW - margin, y, { align: 'right' });

    y += 15;
    doc.setDrawColor(...LINE_COLOR);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);

    y += 25;
    // Table Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PARTICULARS', margin + 10, y);
    doc.text('AMOUNT (₹)', pageW - margin - 10, y, { align: 'right' });

    y += 12;
    doc.line(margin, y, pageW - margin, y);

    y += 25;
    // Table Rows
    doc.setFont('helvetica', 'normal');

    const items = receipt.items || [];
    const printItems = items.length > 0 ? items : [
        {
            fee_category_name: receipt.fee_type_summary || receipt.fee_type_details?.name || '-',
            amount: receipt.total_amount
        }
    ];

    printItems.forEach(item => {
        const name = item.fee_category_name || item.fee_category_details?.name || '-';
        const monthLabel = item.month ? ` (${item.month})` : '';
        doc.text(`- ${name}${monthLabel}`, margin + 10, y);
        doc.text(parseFloat(item.amount).toFixed(2), pageW - margin - 10, y, { align: 'right' });
        y += 22;
    });

    // Ensure space for totals
    const totalY = Math.max(y + 20, 500);

    doc.line(margin, totalY, pageW - margin, totalY);

    y = totalY + 22;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', margin, y);
    doc.text(parseFloat(receipt.total_amount).toFixed(2), pageW - margin, y, { align: 'right' });

    y += 40;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const amountWords = toWords(receipt.total_amount);
    doc.text(amountWords, pageW / 2, y, { align: 'center' });

    y = 750; // Bottom position for signatures on A4
    // Signature Section
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 150, y);
    doc.line(pageW - margin - 150, y, pageW - margin, y);

    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_DARK);
    doc.text('Received By', margin + 75, y, { align: 'center' });
    doc.text('Authorized Signature', pageW - margin - 75, y, { align: 'center' });

    if (shouldOpen) {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }

    if (shouldSave) {
        doc.save(`Receipt_${receipt.receipt_no}.pdf`);
    }

    return doc;
};
