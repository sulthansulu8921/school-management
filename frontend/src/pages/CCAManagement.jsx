import React from 'react';
import { Briefcase, Plus, Search, Filter } from 'lucide-react';

const CCAManagement = () => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">CCA Management</h1>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Co-Curricular Activities & Clubs</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 font-black text-sm uppercase tracking-wider">
                    <Plus size={18} />
                    <span>Create New Activity</span>
                </button>
            </div>

            {/* Placeholder Content */}
            <div className="bg-white rounded-[2rem] p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-4 animate-bounce duration-[3s]">
                    <Briefcase size={40} />
                </div>
                <div className="max-w-md">
                    <h3 className="text-xl font-black text-gray-800 tracking-tight">Activity Module Coming Soon</h3>
                    <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                        We are currently fine-tuning the Co-Curricular Management module to provide you with a powerful way to track student enrollments, attendance, and club fees.
                    </p>
                </div>
                <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl px-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 opacity-50"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2" /><div className="h-4 bg-gray-200 rounded w-1/2" /></div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 opacity-50"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2" /><div className="h-4 bg-gray-200 rounded w-1/2" /></div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 opacity-50"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2" /><div className="h-4 bg-gray-200 rounded w-1/2" /></div>
                </div>
            </div>
        </div>
    );
};

export default CCAManagement;
