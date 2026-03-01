import React, { useState, useEffect } from 'react';
import { Plus, Printer, Search, X, CheckCircle, Download, Share2 } from 'lucide-react';
import api from '../services/api';

const Payments = () => {
    const [receipts, setReceipts] = useState([]);
    const [students, setStudents] = useState([]);
    const [feeTypes, setFeeTypes] = useState([]);
    const [paymentStatuses, setPaymentStatuses] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal & Preview State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [lastCreatedReceipt, setLastCreatedReceipt] = useState(null);

    // Student Search in Modal
    const [studentSearch, setStudentSearch] = useState('');
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);

    const [formData, setFormData] = useState({
        receipt_no: '',
        date: new Date().toISOString().split('T')[0],
        student: '',
        student_name: '',
        total_amount: 0,
        payment_status: '',
        month: new Date().toLocaleString('en-US', { month: 'long' }),
        item_ids: [] // Store IDs of StudentFeeMapping being paid
    });

    const [unpaidFees, setUnpaidFees] = useState([]);

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // 1. Define fetch functions FIRST
    const fetchData = async () => {
        setLoading(true);
        console.log('Fetching all payment data components...');

        try {
            // Fetch Receipts
            api.get('payments/receipts/').then(res => {
                setReceipts(res.data.results || res.data || []);
            }).catch(e => console.error('Receipts load failed', e));

            // Fetch Standard Student List
            api.get('students/').then(res => {
                setStudents(res.data.results || res.data || []);
            }).catch(e => console.error('Students load failed', e));

            // Fetch Fee Categories
            api.get('payments/fee-categories/').then(res => {
                const data = res.data.results || res.data || [];
                setFeeTypes(data);
                console.log('Loaded Fee Categories:', data.length);
            }).catch(e => {
                console.error('Fee Categories load failed', e);
            });

            // Fetch Payment Statuses
            api.get('payments/payment-statuses/').then(res => {
                const data = res.data.results || res.data || [];
                setPaymentStatuses(data);
                if (data.length > 0) {
                    const paidStatus = data.find(s => s.name === 'Paid') || data[0];
                    setFormData(prev => ({ ...prev, payment_status: paidStatus.id }));
                }
            }).catch(e => console.error('Payment statuses load failed', e));

        } catch (error) {
            console.error('Error in fetchData wrapper', error);
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    };

    const fetchStudents = async (search = '') => {
        try {
            const res = await api.get(`students/?search=${search}`);
            setStudents(res.data.results || res.data || []);
        } catch (error) {
            console.error('Error searching students', error);
        }
    };

    // 2. Lifecycle hooks
    useEffect(() => {
        fetchData();
        // Check for studentId in URL
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const studentId = params.get('studentId');
        if (studentId) {
            handleAutoOpenForStudent(studentId);
        }
    }, []);

    const handleAutoOpenForStudent = async (id) => {
        try {
            const res = await api.get(`students/${id}/`);
            handleStudentSelect(res.data);
            setIsModalOpen(true);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (studentSearch && showStudentDropdown) {
                fetchStudents(studentSearch);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [studentSearch, showStudentDropdown]);

    // 3. Event Handlers
    const handleOpenModal = () => {
        setFormData(prev => ({
            ...prev,
            receipt_no: '',
            student: '',
            student_name: '',
            student_balance: 0,
            amount: '',
            fee_type: ''
        }));
        setStudentSearch('');
        fetchStudents('');

        // Backup: if categories are empty, try one more time
        if (feeTypes.length === 0) {
            fetchData();
        }

        setIsModalOpen(true);
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        const val = type === 'number' ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleStudentSelect = async (student) => {
        setFormData(prev => ({
            ...prev,
            student: student.id,
            student_name: student.name,
            total_amount: 0,
            item_ids: []
        }));
        setStudentSearch(student.name);
        setShowStudentDropdown(false);

        // Fetch unpaid mappings for this student
        try {
            const res = await api.get('payments/fee-mappings/', { params: { student: student.id, is_paid: false } });
            const data = res.data.results || res.data || [];
            setUnpaidFees(data);

            // Auto-calculate total based on remaining balance
            const total = data.reduce((sum, item) => sum + (parseFloat(item.amount) - parseFloat(item.paid_amount || 0)), 0);
            setFormData(prev => ({
                ...prev,
                total_amount: total,
                item_ids: data.map(item => item.id)
            }));
        } catch (e) { console.error('Error fetching unpaid fees', e); }
    };

    const handleShare = async () => {
        if (!lastCreatedReceipt) return;
        const text = `School Receipt: ${lastCreatedReceipt.receipt_no}\nStudent: ${lastCreatedReceipt.student_details?.name}\nAmount: ₹${lastCreatedReceipt.total_amount}\nMonth: ${lastCreatedReceipt.month_summary || lastCreatedReceipt.month}\nFee Types: ${lastCreatedReceipt.fee_type_summary || lastCreatedReceipt.fee_type_details?.name}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Fee Receipt',
                    text: text,
                    url: window.location.href
                });
            } catch (err) {
                console.log('Share failed', err);
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(text);
            alert('Receipt details copied to clipboard!');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.student || formData.item_ids.length === 0) {
            alert('Please select a student and at least one fee item.');
            return;
        }
        try {
            const res = await api.post('payments/receipts/', formData);
            setLastCreatedReceipt(res.data);
            setIsModalOpen(false);
            setShowPreview(true);
            fetchData();
            // Emit manual update event for other components
            window.dispatchEvent(new Event('payment-updated'));
        } catch (error) {
            console.error('Error creating receipt', error);
            alert('Failed to save receipt.');
        }
    };

    const filteredStudentsList = students.slice(0, 10);

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments & Receipts</h1>
                    <p className="text-gray-500 text-sm">Manage school fee collections and generate receipts.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleOpenModal}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-md font-medium"
                    >
                        <Plus size={20} />
                        <span>Create Receipt</span>
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print-area">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-3 text-left">Receipt No</th>
                                <th className="px-6 py-3 text-left">Date</th>
                                <th className="px-6 py-3 text-left">Student</th>
                                <th className="px-6 py-3 text-left">Fee Type</th>
                                <th className="px-6 py-3 text-left">Month</th>
                                <th className="px-6 py-3 text-right">Amount</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {receipts.length > 0 ? (
                                receipts.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors text-sm">
                                        <td className="px-6 py-4 font-bold text-gray-900">{r.receipt_no}</td>
                                        <td className="px-6 py-4 text-gray-500">{r.date}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{r.student_details?.name}</div>
                                            <div className="text-xs text-gray-400">{r.student_details?.admission_no}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">{r.fee_type_summary || r.fee_type_details?.name}</td>
                                        <td className="px-6 py-4 text-gray-500 italic">{r.month_summary || r.month}</td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900">₹{parseFloat(r.total_amount).toFixed(2)}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${r.payment_status_details?.name === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {r.payment_status_details?.name || 'Unpaid'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400 italic">
                                        {loading ? 'Loading receipts...' : 'No receipts found. Create your first receipt using the button above.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Receipt Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-extrabold text-gray-900">New Payment Receipt</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Receipt Number</label>
                                        <input readOnly name="receipt_no" value={formData.receipt_no || '(Auto-generated)'} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none bg-gray-100 font-mono text-sm text-gray-500" />
                                    </div>

                                    <div className="relative">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search Student (Name or Adm No)</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search by Name or Admission No..."
                                                value={studentSearch}
                                                onChange={(e) => {
                                                    setStudentSearch(e.target.value);
                                                    setShowStudentDropdown(true);
                                                    if (!e.target.value) setFormData(prev => ({ ...prev, student: '', student_name: '', student_balance: 0 }));
                                                }}
                                                onFocus={() => setShowStudentDropdown(true)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                            />
                                        </div>

                                        {showStudentDropdown && studentSearch.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                                {filteredStudentsList.length > 0 ? filteredStudentsList.map(s => (
                                                    <div
                                                        key={s.id}
                                                        onClick={() => handleStudentSelect(s)}
                                                        className="px-4 py-2 hover:bg-primary-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                                                    >
                                                        <div className="font-bold text-gray-900 text-sm">{s.name}</div>
                                                        <div className="text-xs text-gray-500">Adm: {s.admission_no} | Class: {s.student_class}-{s.division}</div>
                                                    </div>
                                                )) : (
                                                    <div className="px-4 py-3 text-sm text-gray-400 text-center">No students found</div>
                                                )}
                                            </div>
                                        )}
                                        {formData.student && (
                                            <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle size={14} className="text-blue-600" />
                                                    <span className="text-xs font-bold text-blue-800">Selected: {formData.student_name}</span>
                                                </div>

                                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                                    {unpaidFees.map(item => (
                                                        <div key={item.id} className="bg-white/60 p-2 rounded-lg border border-blue-100 flex justify-between items-center">
                                                            <div>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase block">{item.fee_category_details.name}</span>
                                                                <span className="text-xs font-bold text-gray-700">{item.month}</span>
                                                            </div>
                                                            <span className="text-sm font-extrabold text-blue-700">₹{(parseFloat(item.amount) - parseFloat(item.paid_amount || 0)).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex justify-between items-center bg-primary-50 p-3 rounded-lg border border-primary-100 mt-2">
                                                    <span className="text-xs font-bold text-primary-700 uppercase">Total Amount</span>
                                                    <span className="text-lg font-black text-primary-700">
                                                        ₹{parseFloat(formData.total_amount).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Billing Month</label>
                                        <select name="month" value={formData.month} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white">
                                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                        <div className="text-xs font-bold text-gray-400 uppercase mb-2">Final Summary</div>
                                        {paymentStatuses.find(ps => ps.id === formData.payment_status)?.name === 'Partial' ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-2xl font-black text-gray-900">₹</span>
                                                <input
                                                    type="number"
                                                    name="total_amount"
                                                    value={formData.total_amount}
                                                    onChange={handleChange}
                                                    className="w-32 text-3xl font-black text-gray-900 bg-white border border-primary-300 rounded-lg text-center outline-none focus:ring-2 focus:ring-primary-500"
                                                />
                                            </div>
                                        ) : (
                                            <div className="text-3xl font-black text-gray-900 mb-1">₹{parseFloat(formData.total_amount).toFixed(2)}</div>
                                        )}
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Items included: {formData.item_ids.length}</div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Status</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {paymentStatuses.length > 0 ? paymentStatuses.map(ps => (
                                                <button
                                                    key={ps.id}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, payment_status: ps.id }))}
                                                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${formData.payment_status === ps.id
                                                        ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-200'
                                                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-primary-300'
                                                        }`}
                                                >
                                                    {ps.name}
                                                </button>
                                            )) : <div className="col-span-2 text-xs text-gray-400 italic">No statuses loaded.</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={!formData.student} className="flex-[2] py-3 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 shadow-lg shadow-primary-100 disabled:opacity-50 transition-all">
                                    Save & Generate Receipt
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Receipt Preview Modal */}
            {showPreview && lastCreatedReceipt && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 text-center space-y-6">
                            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Success!</h3>
                                <p className="text-gray-500">Receipt generated successfully.</p>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl text-left space-y-3 font-mono text-xs border border-dashed border-gray-300">
                                <div className="border-b border-gray-200 pb-2 text-center font-bold text-sm">OFFICIAL RECEIPT</div>
                                <div className="flex justify-between"><span>No:</span><span className="font-bold">{lastCreatedReceipt.receipt_no}</span></div>
                                <div className="flex justify-between"><span>Date:</span><span>{lastCreatedReceipt.date}</span></div>
                                <div className="flex justify-between"><span>Student:</span><span className="font-bold">{lastCreatedReceipt.student_details?.name}</span></div>
                                <div className="flex justify-between"><span>Month:</span><span>{lastCreatedReceipt.month_summary || lastCreatedReceipt.month}</span></div>
                                <div className="flex justify-between"><span>Fee Type:</span><span>{lastCreatedReceipt.fee_type_summary || lastCreatedReceipt.fee_type_details?.name}</span></div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-black">
                                    <span>Total:</span><span>₹{parseFloat(lastCreatedReceipt.total_amount).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition shadow-lg">
                                    <Printer size={18} />
                                    Print Receipt
                                </button>
                                <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition shadow-lg">
                                    <Share2 size={18} />
                                    Share Receipt
                                </button>
                                <button onClick={() => setShowPreview(false)} className="w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payments;
