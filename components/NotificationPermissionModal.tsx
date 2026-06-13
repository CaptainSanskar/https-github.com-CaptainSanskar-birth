import React from 'react';
import { Bell, X, ShieldCheck } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onEnable: () => void;
    onClose: () => void;
}

export const NotificationPermissionModal: React.FC<Props> = ({ isOpen, onEnable, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            
            <div className="relative w-full max-w-sm bg-surface border border-dark-border rounded-[2rem] p-6 shadow-2xl animate-scale-in">
                
                <div className="w-16 h-16 rounded-full bg-lime/10 border border-lime flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(210,248,1,0.2)]">
                    <Bell className="w-8 h-8 text-lime animate-pulse-slow" />
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Never Miss a Cake! 🎂</h2>
                    <p className="text-muted text-sm leading-relaxed">
                        Allow CakeWait to send you reminders for upcoming birthdays. We promise not to spam you.
                    </p>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={onEnable}
                        className="w-full bg-lime hover:bg-lime-dim text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-lime/20 transition-all active:scale-95"
                    >
                        <ShieldCheck size={20} />
                        Enable Notifications
                    </button>
                    
                    <button 
                        onClick={onClose}
                        className="w-full bg-transparent text-muted hover:text-white py-3 rounded-2xl font-medium text-sm transition-colors"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};