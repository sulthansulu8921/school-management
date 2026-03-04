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

/*
- **New ViewSets**: Added `AcademicYearViewSet` and `SchoolClassViewSet` to provide full CRUD capabilities for managing academic periods and classes.
- **Summarized Fee Logic**: Added `summarized_items` to the Receipt API, which dynamically groups individual monthly fees into categories with month ranges (e.g., "Tuition Fee (Jan–Mar)").
- **Dashboard Cleanup**: Removed the "Pending" data bar from the Monthly Collections chart as requested, focusing the primary visualization on actual collections.

### Frontend
- **Landscape Receipt Layout**: Redesigned `utils.js` to generate receipts in **Landscape Mode**. This optimized layout fits all information onto a single page and uses a professional, clean aesthetic.
- **Summarized Display**: The receipt now shows grouped fee categories and their respective month ranges instead of long, repetitive monthly lists.
- **Synchronized Preview**: Updated the `Payments.jsx` preview modal to match the new summarized landscape format.
*/
/**
 * Generates a professional PDF receipt matching the reference image.
 */
export const generateReceiptPDF = async (receipt, logoBase64, options = {}) => {
    const { shouldSave = true, shouldOpen = true, format = 'a4', orientation = 'landscape' } = options;

    if (!receipt || !receipt.receipt_no) {
        console.error('Invalid receipt data for PDF generation:', receipt);
        alert('Error: Receipt data is incomplete. Please try again.');
        return;
    }

    // A4 Landscape: [width: 841.89, height: 595.28] in pt
    const doc = new jsPDF({
        unit: 'pt',
        format: format,
        orientation: orientation
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;

    const TEXT_DARK = [20, 20, 20];
    const LINE_COLOR = [220, 220, 220];
    const ACCENT_COLOR = [13, 110, 253]; // primary-600

    let y = 45;

    // --- HEADER SECTION ---
    if (logoBase64) {
        doc.addImage(logoBase64, 'JPEG', margin, y - 5, 45, 45);
    }

    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Lourdes Mata Central School', pageW / 2, y, { align: 'center' });

    y += 18;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('KOVILTHOTTAM, CHAVARA (PO) CBIC AFF 931047', pageW / 2, y, { align: 'center' });

    y += 14;
    doc.text('PHONE 0476-2683401, 8281044713', pageW / 2, y, { align: 'center' });

    y += 35;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('FEE RECEIPT', pageW / 2, y, { align: 'center' });
    doc.setLineWidth(1);
    doc.setDrawColor(...ACCENT_COLOR);
    const titleW = doc.getTextWidth('FEE RECEIPT');
    doc.line(pageW / 2 - titleW / 2, y + 3, pageW / 2 + titleW / 2, y + 3);

    // --- STUDENT INFO BAR ---
    y += 40;
    doc.setDrawColor(...LINE_COLOR);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);

    y += 20;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Receipt No:', margin, y);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.receipt_no, margin + 65, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Date:', pageW - margin - 100, y);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.date, pageW - margin, y, { align: 'right' });

    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Student Name:', margin, y);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.student_details?.name || '-', margin + 75, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Class:', pageW - margin - 100, y);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(`${receipt.student_details?.student_class || '-'}${receipt.student_details?.division || ''}`, pageW - margin, y, { align: 'right' });

    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Admission No:', margin, y);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.student_details?.admission_no || '-', margin + 75, y);

    y += 15;
    doc.line(margin, y, pageW - margin, y);

    // --- TABLE SECTION ---
    y += 30;
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y - 15, pageW - (margin * 2), 25, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PARTICULARS', margin + 15, y);
    doc.text('AMOUNT (₹)', pageW - margin - 15, y, { align: 'right' });

    y += 10;
    doc.setDrawColor(...TEXT_DARK);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);

    y += 25;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);

    const summarizedItems = receipt.summarized_items || [];
    const printItems = summarizedItems.length > 0 ? summarizedItems : [
        {
            category: receipt.fee_type_summary || receipt.fee_type_details?.name || 'School Fee',
            month_range: receipt.month || '',
            amount: receipt.total_amount
        }
    ];

    printItems.forEach(item => {
        const rangeText = item.month_range ? ` (${item.month_range})` : '';
        doc.text(`${item.category}${rangeText}`, margin + 15, y);
        doc.text(parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), pageW - margin - 15, y, { align: 'right' });
        y += 22;
    });

    // --- TOTALS SECTION ---
    y = Math.max(y + 10, 380); // Adjusted for landscape height
    doc.setDrawColor(...LINE_COLOR);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);

    y += 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const isPartial = receipt.payment_status_details?.name === 'Partial' || receipt.payment_status?.name === 'Partial';
    const totalLabel = isPartial ? 'GRAND TOTAL (Partial Pay)' : 'GRAND TOTAL';
    doc.text(totalLabel, margin + 15, y);
    doc.text(`₹${parseFloat(receipt.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageW - margin - 15, y, { align: 'right' });

    y += 25;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const amountWords = toWords(receipt.total_amount);
    doc.text(`(Amount in words: ${amountWords})`, pageW / 2, y, { align: 'center' });

    // --- SIGNATURE SECTION ---
    y = pageH - 80;
    doc.setDrawColor(...LINE_COLOR);
    doc.setLineWidth(0.5);
    const sigLineW = 160;
    doc.line(margin + 20, y, margin + 20 + sigLineW, y);
    doc.line(pageW - margin - 20 - sigLineW, y, pageW - margin - 20, y);

    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Received By', margin + 20 + (sigLineW / 2), y, { align: 'center' });
    doc.text('Authorized Signature', pageW - margin - 20 - (sigLineW / 2), y, { align: 'center' });

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
