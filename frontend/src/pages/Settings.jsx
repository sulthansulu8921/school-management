import React from 'react';
import { Settings as SettingsIcon, UserCircle, Bell, Shield, Palette } from 'lucide-react';

const Settings = () => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Configure & Personalize Your System</p>
            </div>

            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 min-h-[500px]">
                    {/* Settings Sidebar */}
                    <div className="p-6 border-r border-gray-50 flex flex-col gap-2">
                        <SettingsTab icon={<UserCircle size={18} />} label="Profile" active />
                        <SettingsTab icon={<Bell size={18} />} label="Notifications" />
                        <SettingsTab icon={<Shield size={18} />} label="Security" />
                        <SettingsTab icon={<Palette size={18} />} label="Appearance" />
                    </div>

                    {/* Settings Content Placeholder */}
                    <div className="col-span-3 p-12 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300">
                            <SettingsIcon size={40} />
                        </div>
                        <div className="max-w-xs">
                            <h3 className="text-lg font-black text-gray-800 tracking-tight">Settings Hub</h3>
                            <p className="text-xs text-gray-400 mt-2 font-medium">Fine-tune your dashboard, manage users, and update school details from this central control panel.</p>
                        </div>
                        <button className="px-6 py-2 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                            Configuration Locked
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingsTab = ({ icon, label, active }) => (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${active ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
        {icon}
        <span className="text-sm tracking-tight">{label}</span>
    </div>
);

export default Settings;
