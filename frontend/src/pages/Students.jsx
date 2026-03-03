import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, FileText } from 'lucide-react';
import api from '../services/api';
import { useAcademicYear } from '../context/AcademicYearContext';
import { jsPDF } from 'jspdf';
import schoolLogo from '../assets/logo.jpeg';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState(null);
    const { academicYear } = useAcademicYear();
    const [ccaOptions, setCcaOptions] = useState([]);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[new Date().getMonth()];

    const [formData, setFormData] = useState({
        admission_no: '',
        name: '',
        student_class: '',
        division: '',
        phone_number: '',
        bus_number: '',
        bus_fee: '',
        tuition_fee: '',
        status: 'Active',
        starting_month: currentMonthName,
        academic_year: academicYear
    });
    const [isCustomBus, setIsCustomBus] = useState(false);

    useEffect(() => {
        fetchStudents();
        fetchCcaOptions();
    }, [search, filterClass, academicYear]);

    const fetchCcaOptions = async () => {
        try {
            const response = await api.get('payments/cca-activities/');
            setCcaOptions(response.data.results || response.data);
        } catch (error) {
            console.error('Failed to fetch CCA options', error);
        }
    };

    const fetchStudents = async () => {
        try {
            const response = await api.get('students/', {
                params: { search, student_class: filterClass, academic_year: academicYear }
            });
            setStudents(response.data.results || response.data);
        } catch (error) {
            console.error('Failed to fetch students', error);
        }
    };

    const handleOpenModal = (student = null) => {
        if (student) {
            setCurrentStudent(student);
            setFormData(student);
        } else {
            setCurrentStudent(null);
            setFormData({
                admission_no: '',
                name: '',
                student_class: '',
                division: '',
                phone_number: '',
                bus_number: '',
                bus_fee: '',
                tuition_fee: '',
                status: 'Active',
                starting_month: currentMonthName,
                academic_year: academicYear,
                cca_activities: [],
                cca_fee: '0.00'
            });
            setIsCustomBus(false);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'bus_number' && value === 'add_new') {
            setIsCustomBus(true);
            setFormData({ ...formData, bus_number: '' });
        } else if (name === 'bus_number' && isCustomBus && value !== '') {
            setFormData({ ...formData, [name]: value });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleCcaToggle = (ccaId) => {
        const currentCcas = formData.cca_activities || [];
        let newCcas = [...currentCcas];

        if (newCcas.includes(ccaId)) {
            newCcas = newCcas.filter(id => id !== ccaId);
        } else {
            newCcas.push(ccaId);
        }

        const totalFee = ccaOptions
            .filter(opt => newCcas.includes(opt.id))
            .reduce((sum, opt) => sum + parseFloat(opt.monthly_fee), 0);

        setFormData({
            ...formData,
            cca_activities: newCcas,
            cca_fee: totalFee.toFixed(2)
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentStudent) {
                await api.put(`students/${currentStudent.id}/`, formData);
            } else {
                await api.post('students/', formData);
            }
            handleCloseModal();
            fetchStudents();
        } catch (error) {
            console.error('Error saving student', error);
            alert('Failed to save student info: ' + (error.response?.data?.detail || JSON.stringify(error.response?.data) || error.message));
        }
    };

    // Helper: load an image URL into base64 for jsPDF
    const getBase64FromUrl = (url) => new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });

    const generateReceiptPDF = async (student) => {
        try {
            // Fetch receipts + CCA fee mappings in parallel
            const [receiptRes, ccaRes] = await Promise.all([
                api.get(`payments/receipts/?student=${student.id}&academic_year=${academicYear}`),
                api.get(`payments/fee-mappings/?student=${student.id}&academic_year=${academicYear}`)
            ]);
            const receipts = receiptRes.data.results || receiptRes.data || [];
            const allMappings = ccaRes.data.results || ccaRes.data || [];
            const ccaMappings = allMappings.filter(m => m.fee_category_name === 'CCA');

            // Load logo as base64
            const logoBase64 = await getBase64FromUrl(schoolLogo);

            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 40;
            let y = 0;

            // ── HEADER BAND ──────────────────────────────────────
            doc.setFillColor(17, 47, 135);
            doc.rect(0, 0, pageWidth, 110, 'F');
            // thin accent stripe
            doc.setFillColor(250, 204, 21); // amber
            doc.rect(0, 108, pageWidth, 4, 'F');

            // Logo
            if (logoBase64) {
                doc.addImage(logoBase64, 'JPEG', margin, 14, 46, 46);
            }

            // School name + address (right of logo)
            const textX = margin + 58;
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('LOURDES MATA CENTRAL SCHOOL', textX, 34);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(186, 209, 255);
            doc.text('KOVILTHOTTAM, CHAVARN (PD)  |  CBIC AFF 931047', textX, 48);
            doc.text('PHONE: 0476-2683401, 8281044713', textX, 60);

            // Label
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(250, 204, 21);
            doc.text('OFFICIAL FEE RECEIPT SUMMARY', textX, 78);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(186, 209, 255);
            doc.text(`Academic Year: ${academicYear}`, textX, 92);

            y = 126;

            // ── STUDENT INFO CARD ─────────────────────────────────
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(margin, y, pageWidth - margin * 2, 70, 6, 6, 'F');
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(margin, y, pageWidth - margin * 2, 70, 6, 6, 'S');

            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Student Information', margin + 12, y + 18);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(71, 85, 105);
            const col1 = margin + 12;
            const col2 = pageWidth / 2 + 10;
            doc.text(`Name          :  ${student.name}`, col1, y + 34);
            doc.text(`Admission No :  ${student.admission_no}`, col1, y + 50);
            doc.text(`Class & Div  :  ${student.student_class} - ${student.division}`, col2, y + 34);
            doc.text(`Phone        :  ${student.phone_number || '-'}`, col2, y + 50);

            y += 84;

            // ── RECEIPTS TABLE ───────────────────────────────────
            const drawSectionHeader = (label, color) => {
                if (y > 720) { doc.addPage(); y = 40; }
                doc.setFillColor(...color);
                doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 4, 4, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(label, margin + 10, y + 15);
                y += 22;
            };

            const drawTableHeader = (colDefs) => {
                doc.setFillColor(30, 64, 175);
                doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                colDefs.forEach(({ label, x }) => doc.text(label, x, y + 14));
                y += 20;
            };

            // --- Fee Receipts ---
            drawSectionHeader('FEE RECEIPTS', [17, 47, 135]);

            const rCols = {
                no: margin + 6,
                date: margin + 90,
                fee: margin + 170,
                month: margin + 290,
                amount: margin + 390,
                status: margin + 460
            };

            drawTableHeader([
                { label: 'Receipt No', x: rCols.no },
                { label: 'Date', x: rCols.date },
                { label: 'Fee Type', x: rCols.fee },
                { label: 'Month(s)', x: rCols.month },
                { label: 'Amount', x: rCols.amount },
                { label: 'Status', x: rCols.status }
            ]);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            let grandTotal = 0;

            if (receipts.length === 0) {
                doc.setTextColor(100, 116, 139);
                doc.setFont('helvetica', 'italic');
                doc.text('No receipts found for this student.', pageWidth / 2, y + 16, { align: 'center' });
                y += 28;
            } else {
                receipts.forEach((r, idx) => {
                    if (y > 740) { doc.addPage(); y = 40; }
                    const rowH = 20;
                    if (idx % 2 === 0) {
                        doc.setFillColor(248, 250, 252);
                        doc.rect(margin, y, pageWidth - margin * 2, rowH, 'F');
                    }
                    const amount = parseFloat(r.total_amount);
                    grandTotal += amount;
                    const status = r.payment_status_details?.name || 'Unpaid';

                    doc.setTextColor(30, 41, 59);
                    doc.setFont('helvetica', 'normal');
                    doc.text(r.receipt_no || '-', rCols.no, y + 13);
                    doc.text(r.date || '-', rCols.date, y + 13);
                    doc.text((r.fee_type_summary || r.fee_type_details?.name || '-').substring(0, 16), rCols.fee, y + 13);
                    doc.text((r.month_summary || r.month || '-').substring(0, 20), rCols.month, y + 13);
                    doc.text(`Rs.${amount.toFixed(2)}`, rCols.amount, y + 13);

                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(status === 'Paid' ? 21 : 185, status === 'Paid' ? 128 : 28, status === 'Paid' ? 61 : 28);
                    doc.text(status, rCols.status, y + 13);

                    doc.setDrawColor(226, 232, 240);
                    doc.line(margin, y + rowH, pageWidth - margin, y + rowH);
                    y += rowH;
                });

                // Grand Total
                y += 4;
                doc.setFillColor(17, 47, 135);
                doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text('Grand Total (Receipts)', rCols.no, y + 16);
                doc.text(`Rs.${grandTotal.toFixed(2)}`, rCols.amount, y + 16);
                y += 28;
            }

            // ── CCA FEE HISTORY ──────────────────────────────────
            y += 12;
            if (y > 700) { doc.addPage(); y = 40; }

            drawSectionHeader('CCA FEE HISTORY', [6, 95, 70]);

            const cCols = {
                month: margin + 6,
                amount: margin + 190,
                paid: margin + 290,
                balance: margin + 390,
                status: margin + 460
            };

            drawTableHeader([
                { label: 'Month', x: cCols.month },
                { label: 'Fee Amount', x: cCols.amount },
                { label: 'Paid Amount', x: cCols.paid },
                { label: 'Balance', x: cCols.balance },
                { label: 'Status', x: cCols.status }
            ]);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);

            if (ccaMappings.length === 0) {
                doc.setTextColor(100, 116, 139);
                doc.setFont('helvetica', 'italic');
                doc.text('No CCA fee records found for this student.', pageWidth / 2, y + 16, { align: 'center' });
                y += 28;
            } else {
                let ccaTotal = 0, ccaPaid = 0;
                ccaMappings.forEach((m, idx) => {
                    if (y > 740) { doc.addPage(); y = 40; }
                    const rowH = 20;
                    if (idx % 2 === 0) {
                        doc.setFillColor(240, 253, 244);
                        doc.rect(margin, y, pageWidth - margin * 2, rowH, 'F');
                    }
                    const fee = parseFloat(m.amount || 0);
                    const paid = parseFloat(m.paid_amount || 0);
                    const balance = fee - paid;
                    const isPaid = m.is_paid;
                    ccaTotal += fee;
                    ccaPaid += paid;

                    doc.setTextColor(30, 41, 59);
                    doc.setFont('helvetica', 'normal');
                    doc.text(m.month || '-', cCols.month, y + 13);
                    doc.text(`Rs.${fee.toFixed(2)}`, cCols.amount, y + 13);
                    doc.text(`Rs.${paid.toFixed(2)}`, cCols.paid, y + 13);
                    doc.text(`Rs.${balance.toFixed(2)}`, cCols.balance, y + 13);

                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(isPaid ? 21 : 185, isPaid ? 128 : 28, isPaid ? 61 : 28);
                    doc.text(isPaid ? 'Paid' : 'Pending', cCols.status, y + 13);

                    doc.setDrawColor(209, 250, 229);
                    doc.line(margin, y + rowH, pageWidth - margin, y + rowH);
                    y += rowH;
                });

                // CCA Summary
                y += 4;
                doc.setFillColor(6, 95, 70);
                doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text('CCA Total', cCols.month, y + 16);
                doc.text(`Rs.${ccaTotal.toFixed(2)}`, cCols.amount, y + 16);
                doc.text(`Rs.${ccaPaid.toFixed(2)}`, cCols.paid, y + 16);
                doc.text(`Rs.${(ccaTotal - ccaPaid).toFixed(2)}`, cCols.balance, y + 16);
                y += 28;
            }

            // ── FOOTER ───────────────────────────────────────────
            const footerY = doc.internal.pageSize.getHeight() - 28;
            doc.setFillColor(241, 245, 249);
            doc.rect(0, footerY - 8, pageWidth, 36, 'F');
            doc.setFillColor(250, 204, 21);
            doc.rect(0, footerY - 8, pageWidth, 2, 'F');
            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.text(`Generated on ${new Date().toLocaleString()}`, margin, footerY + 10);
            doc.text('Lourdes Mata Central School  |  KOVILTHOTTAM, CHAVARN (PD)', pageWidth / 2, footerY + 10, { align: 'center' });
            doc.text(`Page 1`, pageWidth - margin, footerY + 10, { align: 'right' });

            doc.save(`Receipt_${student.admission_no}_${student.name.replace(/\s+/g, '_')}.pdf`);
        } catch (err) {
            console.error('Error generating receipt PDF', err);
            alert('Failed to generate receipt PDF.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this student?')) {
            try {
                await api.delete(`students/${id}/`);
                fetchStudents();
            } catch (error) {
                console.error('Error deleting student', error);
            }
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Students</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                    <Plus size={20} />
                    <span>Add Student</span>
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, admission no, or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                </div>
                <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                    <option value="">All Classes</option>
                    <option value="1">Class 1</option>
                    <option value="2">Class 2</option>
                    <option value="3">Class 3</option>
                    <option value="4">Class 4</option>
                    <option value="5">Class 5</option>
                    <option value="6">Class 6</option>
                    <option value="7">Class 7</option>
                    <option value="8">Class 8</option>
                    <option value="9">Class 9</option>
                    <option value="10">Class 10</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admission No</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class / Div</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus No</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus Fee</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CCA Fee</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tuition Fee</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {students.length > 0 ? (
                                students.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50 text-sm">
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900">{student.admission_no}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-700">{student.name}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500">
                                            {student.student_class} - {student.division}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500">{student.phone_number}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500">{student.bus_number || '-'}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">₹{student.bus_fee || '0.00'}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-900 font-semibold text-blue-600">₹{student.cca_fee || '0.00'}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">₹{student.tuition_fee || '0.00'}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => generateReceiptPDF(student)}
                                                title="Download Receipt PDF"
                                                className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition flex items-center justify-center"
                                            >
                                                <FileText size={16} />
                                            </button>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleOpenModal(student)} className="text-blue-600 hover:text-blue-900 mx-2">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-900 ml-2">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="11" className="px-6 py-4 text-center text-gray-500">No students found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4">
                    <div className="flex min-h-full items-center justify-center">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-auto overflow-hidden relative">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {currentStudent ? 'Edit Student' : 'Add New Student'}
                                </h2>
                                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Admission No</label>
                                        <input required type="text" name="admission_no" value={formData.admission_no} onChange={handleChange} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                        <input required type="text" name="student_class" value={formData.student_class} onChange={handleChange} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                                        <input required type="text" name="division" value={formData.division} onChange={handleChange} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input required type="text" name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bus Number</label>
                                        {!isCustomBus ? (
                                            <select
                                                name="bus_number"
                                                value={formData.bus_number}
                                                onChange={handleChange}
                                                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 outline-none"
                                            >
                                                <option value="">No Bus</option>
                                                <option value="1">Bus 1</option>
                                                <option value="2">Bus 2</option>
                                                <option value="3">Bus 3</option>
                                                <option value="4">Bus 4</option>
                                                <option value="5">Bus 5</option>
                                                <option value="add_new">+ Add New Number</option>
                                            </select>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="bus_number"
                                                    placeholder="Enter Bus No"
                                                    value={formData.bus_number}
                                                    onChange={handleChange}
                                                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCustomBus(false)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800"
                                                >
                                                    Select
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bus Fee (₹)</label>
                                        <input
                                            type="number"
                                            name="bus_fee"
                                            step="0.01"
                                            value={formData.bus_fee}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tuition Fee (₹)</label>
                                        <input
                                            type="number"
                                            name="tuition_fee"
                                            step="0.01"
                                            value={formData.tuition_fee}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 outline-none">
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Joining Month (Fees Start From)</label>
                                    <select name="starting_month" value={formData.starting_month} onChange={handleChange} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary-500 outline-none">
                                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Select CCA Activities</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {ccaOptions.map(option => (
                                            <label key={option.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors group">
                                                <input
                                                    type="checkbox"
                                                    checked={(formData.cca_activities || []).includes(option.id)}
                                                    onChange={() => handleCcaToggle(option.id)}
                                                    className="w-4 h-4 rounded text-blue-600"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-gray-700 leading-tight">{option.name}</span>
                                                    <span className="text-[9px] font-bold text-blue-500">₹{option.monthly_fee}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="pt-2 flex justify-between items-center border-t border-gray-100">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total CCA Fee:</span>
                                        <span className="text-sm font-black text-blue-600 tracking-tight">₹{formData.cca_fee || '0.00'}</span>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3 sticky bottom-0 bg-white pt-4">
                                    <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-6 py-2 border border-transparent shadow-sm text-sm font-bold rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors">
                                        {currentStudent ? 'Update Student' : 'Save Student'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Students;
