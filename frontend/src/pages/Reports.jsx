import React, { useState, useEffect } from 'react';
import { Download, Search, Printer, Calendar, FileText, User, Users, BarChart2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

const Reports = () => {
    const [activeTab, setActiveTab] = useState('collection');
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        student_class: '',
        division: '',
        fee_type: '',
        search: ''
    });
    const [classes, setClasses] = useState([]);
    const [feeTypes, setFeeTypes] = useState([]);
    const [stats, setStats] = useState({
        today_collection: 0,
        month_collection: 0,
        pending_amount: 0
    });

    const fetchInitialData = async () => {
        try {
            // Fetch students to extract classes
            api.get('students/').then(res => {
                const students = res.data.results || res.data || [];
                const uniqueClasses = [...new Set(students.map(s => s.student_class))].filter(Boolean).sort();
                setClasses(uniqueClasses);
            }).catch(e => console.error('Error fetching classes', e));

            // Fetch Fee Categories
            api.get('payments/fee-categories/').then(res => {
                setFeeTypes(res.data.results || res.data || []);
            }).catch(e => console.error('Error fetching fee categories', e));

            // Fetch Dashboard Stats
            api.get('reports/dashboard/').then(res => {
                setStats(res.data);
            }).catch(e => console.error('Error fetching dashboard stats', e));

        } catch (error) {
            console.error('Error fetching initial data', error);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const tabs = [
        { id: 'collection', name: 'Date-wise Report', icon: Calendar },
        { id: 'fee-type', name: 'Fee Type Report', icon: FileText },
        { id: 'student', name: 'Student Report', icon: User },
        { id: 'class-wise', name: 'Class-wise Report', icon: Users },
        { id: 'monthly', name: 'Monthly Summary', icon: BarChart2 },
        { id: 'pending', name: 'Pending Report', icon: AlertCircle },
    ];

    const handlePrint = () => window.print();
    const handleReset = () => setFilters({
        start_date: '',
        end_date: '',
        student_class: '',
        division: '',
        fee_type: '',
        search: ''
    });

    const exportCSV = (data, filename) => {
        if (!data || data.length === 0) {
            alert('No data to export');
            return;
        }
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Reports Module</h1>
                <div className="flex gap-3 no-print">
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm">
                        <Printer size={18} />
                        <span>Print</span>
                    </button>
                    <button onClick={fetchInitialData} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Today's Collection</p>
                        <p className="text-2xl font-bold text-gray-900">₹{parseFloat(stats.today_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-full">
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">This Month</p>
                        <p className="text-2xl font-bold text-gray-900">₹{parseFloat(stats.month_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-full">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Pending</p>
                        <p className="text-2xl font-bold text-gray-900">₹{parseFloat(stats.pending_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            {/* Advanced Filters Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 no-print">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Advanced Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">From Date</label>
                        <input type="date" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">To Date</label>
                        <input type="date" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Class</label>
                        <select value={filters.student_class} onChange={e => setFilters({ ...filters, student_class: e.target.value })} className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                            <option value="">All Classes</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Fee Type</label>
                        <select value={filters.fee_type} onChange={e => setFilters({ ...filters, fee_type: e.target.value })} className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                            <option value="">All Fees</option>
                            {feeTypes.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col lg:col-span-1 gap-1">
                        <label className="text-xs font-medium text-gray-500">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input type="text" placeholder="Name/Adm No..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="w-full pl-9 pr-3 py-2 border rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <button onClick={handleReset} className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2">
                            <RefreshCw size={14} /> Reset
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-64 flex-shrink-0 no-print">
                    <nav className="space-y-1 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id
                                        ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                        }`}
                                >
                                    <Icon size={18} className={activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'} />
                                    {tab.name}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex-1 print-area">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
                        {activeTab === 'collection' && <DateWiseCollection filters={filters} exportCSV={exportCSV} />}
                        {activeTab === 'fee-type' && <FeeTypeReport filters={filters} exportCSV={exportCSV} />}
                        {activeTab === 'student' && <StudentReport filters={filters} exportCSV={exportCSV} />}
                        {activeTab === 'class-wise' && <ClassWiseReport filters={filters} exportCSV={exportCSV} />}
                        {activeTab === 'monthly' && <MonthlySummary filters={filters} exportCSV={exportCSV} />}
                        {activeTab === 'pending' && <PendingReport filters={filters} exportCSV={exportCSV} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DateWiseCollection = ({ filters, exportCSV }) => {
    const [data, setData] = useState({ receipts: [], total_amount: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await api.get('reports/collection/', { params: filters });
                setData(res.data);
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetchData();
    }, [filters]);

    return (
        <div className="space-y-4">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-gray-800">Date-wise Collection Report</h2>
                <button
                    onClick={() => exportCSV(data.receipts, 'DateWise_Collection')}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg no-print" title="Export CSV">
                    <Download size={20} />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-3 text-left">Receipt No</th>
                            <th className="px-6 py-3 text-left">Date</th>
                            <th className="px-6 py-3 text-left">Student</th>
                            <th className="px-6 py-3 text-left">Class</th>
                            <th className="px-6 py-3 text-left">Fee Type</th>
                            <th className="px-6 py-3 text-left">Status</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.receipts && data.receipts.map((r, i) => (
                            <tr key={i} className="text-sm hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{r.receipt_no}</td>
                                <td className="px-6 py-4 text-gray-500">{r.date}</td>
                                <td className="px-6 py-4 text-gray-700">{r.student_name}</td>
                                <td className="px-6 py-4 text-gray-500">{r.class}-{r.division}</td>
                                <td className="px-6 py-4 text-gray-500">{r.fee_type}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {r.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-semibold">₹{parseFloat(r.amount).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                        <tr>
                            <td colSpan="6" className="px-6 py-4 text-right">Total Collection:</td>
                            <td className="px-6 py-4 text-right text-primary-700 text-lg">₹{parseFloat(data.total_amount || 0).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const FeeTypeReport = ({ exportCSV }) => {
    const [data, setData] = useState([]);
    useEffect(() => {
        api.get('reports/fee-types/').then(res => setData(res.data)).catch(e => console.error(e));
    }, []);

    return (
        <div className="space-y-4">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-gray-800">Fee Type Wise Report</h2>
                <button onClick={() => exportCSV(data, 'FeeType_Report')} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg no-print">
                    <Download size={20} />
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {data.map((d, i) => (
                    <div key={i} className="border rounded-xl p-5 hover:border-primary-200 hover:shadow-md transition bg-gradient-to-br from-white to-gray-50">
                        <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">{d.fee_type__name}</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Total Students Paid</span>
                                <span className="font-semibold text-gray-900">{d.total_students}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-sm font-medium text-gray-600">Total Collected</span>
                                <span className="text-xl font-bold text-primary-600">₹{parseFloat(d.total_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StudentReport = ({ filters, exportCSV }) => {
    const [studentData, setStudentData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (filters.search) fetchStudentData();
    }, [filters.search]);

    const fetchStudentData = async () => {
        try {
            const res = await api.get('reports/student/', { params: { search: filters.search } });
            setStudentData(res.data);
            setError('');
        } catch (err) {
            setError('Student not found. Please try Admission No or full name.');
            setStudentData(null);
        }
    };

    if (!filters.search) return <div className="p-12 text-center text-gray-500">Search for a student using Admission No or Name to view details.</div>;
    if (error) return <div className="p-12 text-center text-red-500">{error}</div>;
    if (!studentData) return null;

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{studentData.student_name}</h2>
                    <p className="text-gray-500">Adm No: {studentData.admission_no} | Class: {studentData.class}-{studentData.division}</p>
                </div>
                <button onClick={() => exportCSV(studentData.history, `Student_${studentData.admission_no}`)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg no-print">
                    <Download size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-800 mb-2 uppercase">CCA Activities</h4>
                    <div className="flex flex-wrap gap-2">
                        {studentData.cca_activities && studentData.cca_activities.length > 0 ? studentData.cca_activities.map(a => (
                            <span key={a} className="px-2 py-1 bg-white text-blue-700 text-xs font-semibold rounded-lg border border-blue-200">
                                {a}
                            </span>
                        )) : <span className="text-sm text-blue-500 italic">No activities enrolled</span>}
                    </div>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <h4 className="text-sm font-bold text-red-800 mb-2 uppercase">Pending Months</h4>
                    <div className="flex flex-wrap gap-2">
                        {studentData.pending_months && studentData.pending_months.length > 0 ? studentData.pending_months.map(m => (
                            <span key={m} className="px-2 py-1 bg-white text-red-700 text-xs font-semibold rounded-lg border border-red-200">
                                {m}
                            </span>
                        )) : <span className="text-sm text-green-600 font-medium">All dues cleared</span>}
                    </div>
                </div>
            </div>

            <h3 className="font-bold text-gray-800 pt-4">Payment History</h3>
            <div className="border rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-3 text-left">Receipt No</th>
                            <th className="px-6 py-3 text-left">Date</th>
                            <th className="px-6 py-3 text-left">Fee Type</th>
                            <th className="px-6 py-3 text-left">Month</th>
                            <th className="px-6 py-3 text-left">Status</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {studentData.history && studentData.history.map((h, i) => (
                            <tr key={i}>
                                <td className="px-6 py-4 font-medium">{h.receipt_no}</td>
                                <td className="px-6 py-4 text-gray-500">{h.date}</td>
                                <td className="px-6 py-4 text-gray-500">{h.fee_type}</td>
                                <td className="px-6 py-4 text-gray-500">{h.month}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {h.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-semibold">₹{parseFloat(h.amount).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ClassWiseReport = () => {
    const [data, setData] = useState([]);
    useEffect(() => {
        api.get('reports/classes/').then(res => setData(res.data)).catch(e => console.error(e));
    }, []);
    return (
        <div className="space-y-4">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-gray-800">Class-wise Collection Summary</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-500 uppercase">
                            <th className="px-6 py-3 text-left">Class</th>
                            <th className="px-6 py-3 text-left">Paid Count</th>
                            <th className="px-6 py-3 text-left">Unpaid Count</th>
                            <th className="px-6 py-3 text-right">Total Paid Collection</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((d, i) => (
                            <tr key={i} className="text-sm hover:bg-gray-50">
                                <td className="px-6 py-4 font-bold text-gray-900">Class {d.class}</td>
                                <td className="px-6 py-4 text-green-600 font-medium">{d.paid_count}</td>
                                <td className="px-6 py-4 text-red-600 font-medium">{d.unpaid_count}</td>
                                <td className="px-6 py-4 text-right font-bold text-gray-900">₹{parseFloat(d.total_paid).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const MonthlySummary = () => {
    const [data, setData] = useState([]);
    useEffect(() => {
        api.get('reports/monthly/').then(res => setData(res.data)).catch(e => console.error(e));
    }, []);
    return (
        <div className="space-y-4">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-bold text-gray-800">Monthly Revenue Summary</h2>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {data.map((d, i) => (
                        <div key={i} className="bg-white border rounded-xl p-4 shadow-sm text-center">
                            <p className="text-sm font-bold text-gray-500 uppercase mb-1">{d.month}</p>
                            <p className="text-2xl font-black text-gray-900">₹{parseFloat(d.total_collection).toFixed(2)}</p>
                        </div>
                    ))}
                    {data.length === 0 && <div className="col-span-full p-8 text-center text-gray-400">No monthly data available yet.</div>}
                </div>
            </div>
        </div>
    );
};

const PendingReport = ({ exportCSV }) => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [students, setStudents] = useState([]);

    useEffect(() => {
        fetchData();
    }, [selectedClass]);

    const fetchData = async () => {
        try {
            const res = await api.get('reports/pending/', { params: { class: selectedClass } });
            if (!selectedClass) {
                setClasses(res.data);
            } else {
                setStudents(res.data);
            }
        } catch (e) { console.error(e); }
    };

    if (!selectedClass) {
        return (
            <div className="p-6 space-y-4">
                <h2 className="font-bold text-gray-800 mb-4">Pending Dues Grouped by Class</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {classes.map((c, i) => (
                        <div key={i} onClick={() => setSelectedClass(c.class)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:border-red-300 hover:shadow-md transition group">
                            <h3 className="text-xl font-black text-gray-900 mb-2">Class {c.class}</h3>
                            <div className="flex justify-between items-end">
                                <span className="text-red-600 font-bold text-lg">{c.unpaid_count} Pending</span>
                                <span className="text-gray-400 text-sm group-hover:text-primary-600">View List →</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedClass('')} className="text-red-700 hover:underline text-sm font-bold no-print">← Back</button>
                    <h2 className="font-bold text-red-900 text-lg">Class {selectedClass} - Pending List</h2>
                </div>
                <button onClick={() => exportCSV(students, `Pending_Class_${selectedClass}`)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg no-print">
                    <Download size={20} />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-3 text-left">Student Name</th>
                            <th className="px-6 py-3 text-left">Admission No</th>
                            <th className="px-6 py-3 text-left">Months Pending</th>
                            <th className="px-6 py-3 text-right">Total Owed</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((s, i) => (
                            <tr key={i} className="text-sm hover:bg-red-50/30">
                                <td className="px-6 py-4 font-bold text-gray-900">{s.student_name}</td>
                                <td className="px-6 py-4 text-gray-500">{s.admission_no}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {s.pending_months && s.pending_months.map(m => (
                                            <span key={m} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">{m}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-red-600 font-black text-right">₹{parseFloat(s.pending_amount).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reports;
