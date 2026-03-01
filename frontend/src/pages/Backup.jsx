import React from 'react';
import { Database, ShieldCheck, History, Download } from 'lucide-react';

const Backup = () => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Backup</h1>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Data Safety & Disaster Recovery</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Main Action Card */}
                <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-green-50 rounded-[2rem] flex items-center justify-center text-green-600 mb-6 border border-green-100 shadow-sm">
                        <Database size={32} />
                    </div>
                    <h3 className="text-xl font-black text-gray-800 tracking-tight mb-2">Create New Backup</h3>
                    <p className="text-sm text-gray-500 max-w-xs mb-8 font-medium leading-relaxed">Securely compress and store your school management data to a local file.</p>
                    <button className="w-full py-4 bg-navy-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-navy-100 flex items-center justify-center gap-3 active:scale-95 duration-200">
                        <Download size={18} />
                        Run Backup Now
                    </button>
                    <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                        <ShieldCheck size={12} />
                        Auto-Backup Enabled
                    </div>
                </div>

                {/* History/Info Card */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-black text-gray-800 tracking-tight mb-6 flex items-center gap-3">
                        <History className="text-blue-500" size={20} />
                        Recent Backups
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 opacity-60">
                            <div>
                                <p className="text-xs font-black text-gray-700">backup_2026_02_28.zip</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Today, 10:30 AM • 4.2 MB</p>
                            </div>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-black uppercase">Success</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
                            <div>
                                <p className="text-xs font-black text-gray-700">backup_2026_02_27.zip</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Yesterday, 10:32 AM • 4.1 MB</p>
                            </div>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-black uppercase">Success</span>
                        </div>
                        <div className="flex items-center justify-center p-8 text-gray-300 italic text-sm">
                            No more recent history
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Backup;
