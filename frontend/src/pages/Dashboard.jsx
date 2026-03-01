import React, { useState, useEffect } from 'react';
import {
    Users,
    IndianRupee,
    CalendarCheck,
    Lock,
    TrendingUp,
    Plus,
    List,
    FileText,
    Database,
    ArrowUpRight,
    Search,
    ChevronDown,
    MoreVertical,
    BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardData();

        // Listen for payment updates to refresh charts instantly
        window.addEventListener('payment-updated', fetchDashboardData);
        return () => window.removeEventListener('payment-updated', fetchDashboardData);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get('reports/dashboard/');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        }
    };

    // Use real chart data from backend
    const rawChartData = stats?.chart_data || [
        { name: 'Month 1', collection: 0, color: '#10b981' },
    ];

    if (!stats) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Stats Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard
                    title="Total Collection"
                    value={`₹${stats.month_collection.toLocaleString('en-IN')}`}
                    subValue="+ 12% vs Last Month"
                    icon={<IndianRupee className="text-green-600" size={20} />}
                    iconBg="bg-green-100"
                    trend={<ArrowUpRight size={14} className="text-green-500" />}
                />
                <DashboardCard
                    title="Total Students"
                    value={stats.total_students}
                    subValue="Total Enrolled"
                    icon={<Users className="text-blue-600" size={20} />}
                    iconBg="bg-blue-100"
                />
                <DashboardCard
                    title="Paid Today"
                    value={`₹${stats.today_collection.toLocaleString('en-IN')}`}
                    subValue={`${stats.today_receipt_count} Receipts`}
                    icon={<CalendarCheck className="text-green-600" size={20} />}
                    iconBg="bg-green-100"
                />
                <DashboardCard
                    title="Pending Fees"
                    value={`₹${stats.pending_amount.toLocaleString('en-IN')}`}
                    subValue={`${stats.pending_student_count} Students`}
                    icon={<Lock className="text-orange-600" size={20} />}
                    iconBg="bg-orange-100"
                    isAlert
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Big Chart & Recent */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Monthly Collection Chart Card */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-lg font-black text-gray-800 tracking-tight">Monthly Collection - {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Fee Analytics</p>
                            </div>
                            <button onClick={() => navigate('/reports')} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-sm border border-blue-100">
                                View Report
                            </button>
                        </div>

                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={rawChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="collection" radius={[6, 6, 0, 0]} barSize={40}>
                                        {rawChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-8 flex items-end justify-between border-t border-gray-50 pt-6">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-gray-400">Total:</span>
                                <span className="text-3xl font-black text-gray-800">₹{stats.month_collection.toLocaleString('en-IN')}</span>
                                <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-black flex items-center gap-1">
                                    <TrendingUp size={12} /> +18%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions (Smaller Style) */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-gray-800 tracking-tight">Recent Transactions</h3>
                            <button onClick={() => navigate('/payments')} className="text-xs font-bold text-blue-500 hover:underline">See All</button>
                        </div>
                        <div className="space-y-4">
                            {stats.recent_transactions.slice(0, 4).map((t, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{t.student_name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.fee_type} • {t.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-gray-900">₹{parseFloat(t.amount).toFixed(2)}</p>
                                        <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Success</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Quick Actions */}
                <div className="space-y-8">
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 h-full">
                        <h3 className="text-lg font-black text-gray-800 tracking-tight mb-8">Quick Actions</h3>

                        <div className="space-y-4">
                            <QuickActionButton
                                label="Recent Receipt List"
                                color="bg-green-500"
                                icon={<List size={18} />}
                                onClick={() => navigate('/payments')}
                            />
                            <QuickActionButton
                                label="Generate Report"
                                color="bg-orange-500"
                                icon={<FileText size={18} />}
                                onClick={() => navigate('/reports')}
                            />
                            <QuickActionButton
                                label="Pending Fees"
                                color="bg-rose-500"
                                icon={<Lock size={18} />}
                                onClick={() => navigate('/reports?tab=pending')}
                            />
                            <div className="pt-4 mt-4 border-t border-gray-50">
                                <QuickActionButton
                                    label="Backup Database"
                                    color="bg-gray-800"
                                    icon={<Database size={18} />}
                                    onClick={() => navigate('/backup')}
                                />
                            </div>
                        </div>

                        {/* Additional Info Box */}
                        <div className="mt-12 bg-blue-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-blue-200">
                            <div className="relative z-10">
                                <h4 className="text-lg font-black mb-1">Stay Organized</h4>
                                <p className="text-xs text-blue-100 font-medium leading-relaxed">Check your pending fees daily to maintain school revenue flow.</p>
                                <button className="mt-4 px-4 py-2 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all">
                                    Check Now
                                </button>
                            </div>
                            <BarChart3 size={80} className="absolute -bottom-4 -right-4 text-white/10" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            <button
                onClick={() => navigate('/payments')}
                className="fixed bottom-12 right-12 px-6 py-4 bg-white text-gray-800 rounded-2xl shadow-2xl border border-gray-100 flex items-center gap-3 hover:scale-105 transition-all duration-300 group z-30"
            >
                <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center transition-transform group-hover:rotate-90">
                    <Plus size={20} />
                </div>
                <span className="text-sm font-black tracking-tight">New Receipt</span>
            </button>
        </div>
    );
};

const DashboardCard = ({ title, value, subValue, icon, iconBg, trend, isAlert }) => (
    <div className={`bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group ${isAlert ? 'bg-gradient-to-br from-white to-orange-50/30' : ''}`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${iconBg} transition-transform group-hover:scale-110 duration-500`}>
                {icon}
            </div>
            <button className="text-gray-300 hover:text-gray-500 transition-colors">
                <MoreVertical size={16} />
            </button>
        </div>
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
            <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">{value}</h3>
                {trend && <div className="flex items-center">{trend}</div>}
            </div>
            <div className="mt-3 flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isAlert ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
                <p className={`text-[10px] font-black uppercase tracking-tighter ${isAlert ? 'text-orange-600' : 'text-gray-400'}`}>
                    {subValue}
                </p>
            </div>
        </div>
    </div>
);

const QuickActionButton = ({ label, color, icon, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl text-white transition-all duration-300 hover:scale-[1.03] shadow-lg hover:shadow-xl ${color} active:scale-95`}
    >
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
            {icon}
        </div>
        <span className="text-sm font-black tracking-tight">{label}</span>
    </button>
);

export default Dashboard;
