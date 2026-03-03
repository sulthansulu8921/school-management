import React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';

const Header = () => {
    return (
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10 no-print">
            {/* Search Bar */}
            <div className="relative w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Search Student / Receipt..."
                    className="w-full bg-gray-50 border-none rounded-2xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-8">
                {/* Academic Year Selector */}
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 cursor-pointer hover:bg-white transition-colors">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Academic Year:</span>
                    <span className="text-sm font-black text-gray-800">2024-25</span>
                    <ChevronDown size={14} className="text-gray-400" />
                </div>

                {/* Notifications */}
                <div className="relative cursor-pointer group">
                    <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                        <Bell size={20} className="text-gray-500 group-hover:text-blue-600" />
                    </div>
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 border-2 border-white rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                        1
                    </span>
                </div>

                {/* User Profile */}
                <div className="flex items-center gap-4 pl-8 border-l border-gray-100 cursor-pointer group">
                    <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase text-gray-400 leading-none mb-0.5">Admin</span>
                        <span className="text-sm font-bold text-gray-800">Sulthan</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-all border border-gray-100 relative">
                        <img
                            src="https://ui-avatars.com/api/?name=Sulthan&background=0D8ABC&color=fff"
                            alt="User Profile"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    </div>
                    <ChevronDown size={16} className="text-gray-400" />
                </div>
            </div>
        </header>
    );
};

export default Header;
