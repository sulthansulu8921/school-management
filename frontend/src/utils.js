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
export const generateReceiptPDF = async (receipt, logoBase64) => {
    // A5 Landscape: [width: 595.28, height: 419.53] in pt
    const doc = new jsPDF({
        unit: 'pt',
        format: 'a5',
        orientation: 'landscape'
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 35;

    const TEXT_DARK = [20, 20, 20]; // Darker for printing
    const LINE_COLOR = [200, 200, 200];

    let y = 35;

    // Logo (Top Left)
    if (logoBase64) {
        doc.addImage(logoBase64, 'JPEG', margin + 5, y - 5, 45, 45);
    }

    // School Header (Centered)
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Lourdes Mata Central school', pageW / 2 + 30, y, { align: 'center' });

    y += 12;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('KOVILTHOTTAM, CHAVARN (PD) CBIC AFF 931047', pageW / 2 + 30, y, { align: 'center' });

    y += 10;
    doc.text('PHONE 0476-2683401, 8281044713', pageW / 2 + 30, y, { align: 'center' });

    y += 35;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FEE RECEIPT', pageW / 2, y, { align: 'center' });
    doc.setLineWidth(0.8);
    const titleW = doc.getTextWidth('FEE RECEIPT');
    doc.line(pageW / 2 - titleW / 2, y + 2, pageW / 2 + titleW / 2, y + 2);

    y += 35;
    // Student Details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt No : ${receipt.receipt_no}`, margin + 5, y);
    doc.text(`Date : ${receipt.date}`, pageW - margin - 5, y, { align: 'right' });

    y += 20;
    doc.text(`Name : ${receipt.student_details?.name || '-'}`, margin + 5, y);

    y += 20;
    doc.text(`Admin No : ${receipt.student_details?.admission_no || '-'}`, margin + 5, y);
    doc.text(`Class : ${receipt.student_details?.student_class || '-'}`, pageW - margin - 5, y, { align: 'right' });

    y += 12;
    doc.setDrawColor(...LINE_COLOR);
    doc.line(margin, y, pageW - margin, y);

    y += 20;
    // Table Header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PARTICULARS', margin + 15, y);
    doc.text('AMOUNT (Rs.)', pageW - margin - 15, y, { align: 'right' });

    y += 10;
    doc.line(margin, y, pageW - margin, y);

    y += 20;
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
        doc.text(name, margin + 15, y);
        doc.text(parseFloat(item.amount).toFixed(2), pageW - margin - 15, y, { align: 'right' });
        y += 18;
    });

    // Ensure space for totals
    y = Math.max(y, 280);

    doc.line(margin, y, pageW - margin, y);

    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', margin + 5, y);
    doc.text(parseFloat(receipt.total_amount).toFixed(2), pageW - margin - 5, y, { align: 'right' });

    y += 30;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const amountWords = toWords(receipt.total_amount);
    doc.text(amountWords, pageW / 2, y, { align: 'center' });

    y = pageH - 40;
    // Signature Section
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin + 10, y, margin + 130, y);
    doc.line(pageW - margin - 130, y, pageW - margin - 10, y);

    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_DARK);
    doc.text('Received By', margin + 70, y, { align: 'center' });
    doc.text('Authorized Signature', pageW - margin - 70, y, { align: 'center' });

    // Open in a new tab for "Print Preview"
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    // Also save it
    doc.save(`Receipt_${receipt.receipt_no}.pdf`);
};
