
import React, { useState, useEffect, useMemo } from 'react';
import { Birthday, CelebrationHistory } from './types';
import { calculateDaysUntil, sortBirthdays, calculateNextAge, isToday, formatDateFriendly } from './utils/dateUtils';
import { AddBirthdayModal } from './components/AddBirthdayModal';
import { BirthdayPopup } from './components/BirthdayPopup';
import { CalendarView } from './components/CalendarView';
import { WelcomeModal } from './components/WelcomeModal';
import { NotesView } from './components/NotesView';
import { NotificationPermissionModal } from './components/NotificationPermissionModal';
import { syncToIndexedDB, registerServiceWorker, syncSettingToIndexedDB } from './utils/storage';
import { Plus, Calendar as CalendarIcon, Home, Settings, Bell, Gift, Sparkles, Zap, Edit2, Camera, Moon, Sun, StickyNote, Palette, Check, Trash2, Clock } from 'lucide-react';

const STORAGE_KEY = 'happy4u_birthdays';
const USER_KEY = 'happy4u_username';
const GENDER_KEY = 'happy4u_gender';
const THEME_KEY = 'happy4u_theme';
const ACCENT_KEY = 'happy4u_accent';
const NOTIF_TIME_KEY = 'happy4u_notif_time';
const CELEBRATIONS_KEY = 'happy4u_celebrations';
const NOTIF_MUTED_KEY = 'happy4u_notifications_muted';
const POPUPS_SHOWN_KEY = 'happy4u_shown_popups';

// Color Themes Configuration
const THEMES = [
    { id: 'lime', name: 'Neon Lime', hex: '#D2F801', dim: '#b5d600', glow: 'rgba(210, 248, 1, 0.5)' },
    { id: 'orange', name: 'Dopamine Orange', hex: '#F3701E', dim: '#D35400', glow: 'rgba(243, 112, 30, 0.5)' },
    { id: 'green', name: 'Zen Green', hex: '#22c55e', dim: '#15803d', glow: 'rgba(34, 197, 94, 0.5)' },
    { id: 'blue', name: 'Cyber Blue', hex: '#3B82F6', dim: '#1D4ED8', glow: 'rgba(59, 130, 246, 0.5)' },
    { id: 'purple', name: 'Royal Purple', hex: '#A855F7', dim: '#7E22CE', glow: 'rgba(168, 85, 247, 0.5)' },
    { id: 'gold', name: 'Luxury Gold', hex: '#EAB308', dim: '#CA8A04', glow: 'rgba(234, 179, 8, 0.5)' },
    { id: 'pink', name: 'Hot Pink', hex: '#EC4899', dim: '#BE185D', glow: 'rgba(236, 72, 153, 0.5)' },
];

// Permanent Avatar Component (No external dependencies)
const ProfileAvatar = ({ name, gender }: { name: string, gender: 'male' | 'female' }) => {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    
    // Aesthetic gradients based on gender
    const gradient = gender === 'female' 
        ? 'linear-gradient(135deg, #EC4899, #8B5CF6)'  // Pink -> Purple
        : 'linear-gradient(135deg, #06B6D4, #3B82F6)'; // Cyan -> Blue

    return (
        <div 
            className="w-full h-full flex items-center justify-center relative overflow-hidden" 
            style={{ background: gradient }}
        >
             {/* Lively geometric accents */}
             <div className="absolute top-0 right-0 w-6 h-6 bg-white opacity-20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 bg-black opacity-10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
             
             <span className="text-white font-bold text-lg drop-shadow-md relative z-10 select-none">
                 {initial}
             </span>
        </div>
    );
};

export default function App() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [username, setUsername] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [accentTheme, setAccentTheme] = useState(THEMES[0].id);
  const [notificationTime, setNotificationTime] = useState<string>('09:00');
  const [view, setView] = useState<'home' | 'list' | 'notes' | 'settings'>('home');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [popupBirthdays, setPopupBirthdays] = useState<Birthday[]>([]);
  const [shownPopups, setShownPopups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(POPUPS_SHOWN_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const todayStr = new Date().toDateString();
        if (parsed.date === todayStr && Array.isArray(parsed.ids)) {
          return new Set(parsed.ids);
        }
      } catch (e) {
        console.error("Failed to parse shown popups", e);
      }
    }
    return new Set();
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [celebrations, setCelebrations] = useState<CelebrationHistory[]>([]);

  // Load data
  useEffect(() => {
    // 1. Register Service Worker for background notifications
    registerServiceWorker();

    // 2. Load Data
    const savedBirthdays = localStorage.getItem(STORAGE_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    const savedGender = localStorage.getItem(GENDER_KEY);
    const savedTheme = localStorage.getItem(THEME_KEY);
    const savedAccent = localStorage.getItem(ACCENT_KEY);
    const savedNotifTime = localStorage.getItem(NOTIF_TIME_KEY);
    const savedCelebrations = localStorage.getItem(CELEBRATIONS_KEY);

    if (savedBirthdays) {
      try {
        const parsed = JSON.parse(savedBirthdays);
        setBirthdays(parsed);
        // Sync loaded data to IndexedDB immediately
        syncToIndexedDB(parsed);
      } catch (e) {
        console.error("Failed to parse birthdays", e);
      }
    }

    if (savedUser) {
        setUsername(savedUser);
    } else {
        // First-time user onboarding sequence!
        // Show the notification permission request as the absolute first screen if default
        if ('Notification' in window && Notification.permission === 'default') {
            setIsNotificationModalOpen(true);
        } else {
            // Already handled or not supported, go straight to welcome profile creation
            setIsWelcomeOpen(true);
        }
    }

    if (savedGender) {
        setGender(savedGender as 'male' | 'female');
    }

    if (savedTheme) {
        setThemeMode(savedTheme as 'dark' | 'light');
    }

    if (savedAccent) {
        const exists = THEMES.find(t => t.id === savedAccent);
        if (exists) setAccentTheme(savedAccent);
    }

    if (savedNotifTime) {
        setNotificationTime(savedNotifTime);
    }

    if (savedCelebrations) {
      try {
        setCelebrations(JSON.parse(savedCelebrations));
      } catch (e) {
        console.error("Failed to parse celebrations", e);
      }
    }
    
    // Check initial notification status (only auto-prompts on timer for returned active users)
    const savedNotifMuted = localStorage.getItem(NOTIF_MUTED_KEY) === 'true';
    if ('Notification' in window) {
        if (Notification.permission === 'granted' && !savedNotifMuted) {
            setNotificationsEnabled(true);
        } else if (Notification.permission === 'default' && !savedNotifMuted) {
            setTimeout(() => {
                if (savedUser) setIsNotificationModalOpen(true);
            }, 3000);
        } else {
            setNotificationsEnabled(false);
        }
    }
  }, []);

  const handleWelcomeClose = () => {
      setIsWelcomeOpen(false);
      if ('Notification' in window && Notification.permission === 'default') {
          setTimeout(() => setIsNotificationModalOpen(true), 1000);
      }
  };

  useEffect(() => {
      if (themeMode === 'light') {
          document.body.classList.add('light-mode');
      } else {
          document.body.classList.remove('light-mode');
      }
      localStorage.setItem(THEME_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
      const selectedTheme = THEMES.find(t => t.id === accentTheme) || THEMES[0];
      const root = document.documentElement;
      root.style.setProperty('--color-lime', selectedTheme.hex);
      root.style.setProperty('--color-lime-dim', selectedTheme.dim);
      root.style.setProperty('--color-lime-glow', selectedTheme.glow);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', selectedTheme.hex);
      localStorage.setItem(ACCENT_KEY, accentTheme);
  }, [accentTheme]);

  useEffect(() => {
      localStorage.setItem(NOTIF_TIME_KEY, notificationTime);
      syncSettingToIndexedDB('notificationTime', notificationTime);
  }, [notificationTime]);

  useEffect(() => {
      syncSettingToIndexedDB('notificationsEnabled', notificationsEnabled);
  }, [notificationsEnabled]);

  useEffect(() => {
    if (birthdays.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const bdayIdParam = params.get('birthdayId');

    if (viewParam && ['home', 'list', 'notes', 'settings'].includes(viewParam)) {
        setView(viewParam as any);
    }

    if (bdayIdParam) {
        const matched = birthdays.find(b => b.id === bdayIdParam);
        if (matched) {
            setPopupBirthdays([matched]);
        }
    }

    // Clean up url to maintain clean state after deep link was consumed
    if (viewParam || bdayIdParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [birthdays]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(birthdays));
    syncToIndexedDB(birthdays);
  }, [birthdays]);

  useEffect(() => {
    localStorage.setItem(CELEBRATIONS_KEY, JSON.stringify(celebrations));
  }, [celebrations]);

  useEffect(() => {
    const todayStr = new Date().toDateString();
    localStorage.setItem(POPUPS_SHOWN_KEY, JSON.stringify({
      date: todayStr,
      ids: Array.from(shownPopups)
    }));
  }, [shownPopups]);

  const handleSaveProfile = (name: string, newGender: 'male' | 'female') => {
      setUsername(name);
      setGender(newGender);
      localStorage.setItem(USER_KEY, name);
      localStorage.setItem(GENDER_KEY, newGender);
      handleWelcomeClose();
  };

  useEffect(() => {
    const todayMatches = birthdays.filter(b => {
        if (!isToday(b.birthDate)) return false;
        return !shownPopups.has(b.id);
    });

    if (todayMatches.length > 0) {
        setTimeout(() => {
            setPopupBirthdays(todayMatches);
            setShownPopups(prev => {
                const next = new Set(prev);
                todayMatches.forEach(b => next.add(b.id));
                return next;
            });
        }, 1000);
    }
  }, [birthdays, shownPopups]);

  const handleAddOrUpdate = (birthday: Birthday) => {
    if (editingId) {
      setBirthdays(prev => prev.map(b => b.id === editingId ? birthday : b));
      setEditingId(null);
    } else {
      setBirthdays(prev => [...prev, birthday]);
    }
    setIsModalOpen(false);
  };

  const handleMarkCelebrated = (id: string) => {
    const currentYear = new Date().getFullYear();
    const celebration: CelebrationHistory = {
        birthdayId: id,
        year: currentYear,
        celebratedAt: new Date().toISOString()
    };
    
    setCelebrations(prev => {
        if (prev.some(c => c.birthdayId === id && c.year === currentYear)) {
            return prev;
        }
        return [celebration, ...prev];
    });

    setPopupBirthdays(prev => prev.filter(b => b.id !== id));
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this birthday?')) {
      setBirthdays(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleRequestNotification = async () => {
    if (!('Notification' in window)) {
        alert('Notifications not supported on this device');
        return;
    }
    
    if (Notification.permission === 'denied') {
        alert('You have blocked notifications. Please enable them in your browser settings.');
        return;
    }

    try {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
            setNotificationsEnabled(true);
            setIsNotificationModalOpen(false);
            localStorage.setItem(NOTIF_MUTED_KEY, 'false');
            
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ action: 'sendWelcomeNotification' });
            } else {
                new Notification('Notifications Enabled! 🔔', {
                    body: 'Happy4U will remind you about upcoming birthdays.',
                    icon: 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png'
                });
            }
        } else {
            setNotificationsEnabled(false);
            setIsNotificationModalOpen(false);
            localStorage.setItem(NOTIF_MUTED_KEY, 'true');
        }
    } catch (e) {
        console.error("Notification Error:", e);
    } finally {
        // Clean onboarding flow sequence: transition to profile welcome screen if first-time user
        if (!localStorage.getItem(USER_KEY)) {
            setIsWelcomeOpen(true);
        }
    }
  };

  const sortedBirthdays = useMemo(() => sortBirthdays(birthdays), [birthdays]);
  const nextBirthday = sortedBirthdays[0];

  return (
    <div className="min-h-screen bg-background text-primary pb-32 relative selection:bg-lime selection:text-black overflow-x-hidden transition-colors duration-500">
        
        {/* Animated Background Blobs */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-lime/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <header className="pt-4 px-6 flex justify-between items-center sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-dark-border gpu-layer">
            <div className="flex items-center gap-3 py-3">
                <div 
                    className="relative group cursor-pointer"
                    onClick={() => setIsWelcomeOpen(true)}
                >
                    <div className="w-10 h-10 rounded-full bg-surfaceLight border border-dark-border flex items-center justify-center overflow-hidden relative shadow-sm">
                        <ProfileAvatar name={username} gender={gender} />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-surfaceLight border border-dark-border rounded-full p-0.5 text-muted group-hover:text-lime transition-colors">
                        <Camera size={10} />
                    </div>
                </div>

                <div className="flex flex-col justify-center">
                    <h1 className="text-[10px] font-medium text-muted uppercase tracking-wider leading-none mb-1">Welcome Back</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-lg font-bold leading-none text-primary max-w-[150px] truncate">
                            {username || 'Friend'}
                        </p>
                        <button 
                            onClick={() => setIsWelcomeOpen(true)}
                            className="text-muted hover:text-lime transition-colors p-1 -m-1 rounded"
                            aria-label="Edit Name"
                        >
                            <Edit2 size={12} />
                        </button>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={() => setIsNotificationModalOpen(true)}
                className={`w-10 h-10 rounded-full border border-dark-border flex items-center justify-center transition-all active:scale-90 ${notificationsEnabled ? 'bg-lime/10 text-lime border-lime/20' : 'bg-surfaceLight text-muted'}`}
                aria-label="Notification Settings"
            >
                <Bell className="w-5 h-5" />
            </button>
        </header>

        <main className="px-6 mt-6 space-y-8 relative z-10 max-w-lg mx-auto w-full">
            
            <div key={view} className="animate-slide-up">
            
            {view === 'home' && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 bg-dark-card border border-dark-border rounded-[2rem] p-6 relative overflow-hidden group shadow-2xl card-shine animate-scale-in origin-top">
                             <div className="absolute -top-20 -right-20 w-40 h-40 bg-lime/20 blur-[60px] rounded-full transition-colors duration-500"></div>
                             
                             {nextBirthday ? (
                                <div className="relative z-10 flex justify-between h-full min-h-[140px]">
                                    <div className="flex flex-col justify-between max-w-[65%]">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-1 bg-lime text-black text-[10px] font-bold uppercase tracking-wider rounded-md">Up Next</span>
                                            </div>
                                            <h2 className="text-2xl font-bold text-primary leading-tight truncate">{nextBirthday.name}</h2>
                                            <p className="text-muted text-sm mt-1">Turning {calculateNextAge(nextBirthday.birthDate)}</p>
                                        </div>
                                        
                                        <div className="mt-4">
                                            <span className="text-5xl font-bold text-primary tracking-tighter">{calculateDaysUntil(nextBirthday.birthDate)}</span>
                                            <span className="text-sm text-muted ml-1 font-medium">days left</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end justify-between">
                                         <div className="w-14 h-14 rounded-2xl bg-surfaceLight border border-dark-border flex items-center justify-center text-3xl shadow-inner animate-float">
                                            {nextBirthday.emoji || '🎂'}
                                         </div>
                                         <Gift className="text-lime opacity-20 w-16 h-16 absolute bottom-0 right-0 -rotate-12 translate-x-2 translate-y-2 transition-colors duration-500" />
                                    </div>
                                </div>
                             ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-center">
                                    <Sparkles className="text-lime mb-2 opacity-50" />
                                    <p className="font-bold text-muted">No upcoming<br/>birthdays</p>
                                </div>
                             )}
                        </div>

                        <button 
                            onClick={() => { setEditingId(null); setIsModalOpen(true); }}
                            className="col-span-1 bg-lime text-black rounded-[2rem] p-5 flex flex-col justify-between items-start h-32 hover:bg-lime-dim transition-colors active:scale-95 shadow-lg shadow-lime/10 group card-shine animate-scale-in relative overflow-hidden"
                            style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
                        >
                            <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div className="mt-auto">
                                <p className="font-bold text-lg leading-none">Add</p>
                                <p className="text-xs font-medium opacity-70 mt-1">Birthday</p>
                            </div>
                        </button>

                        <div 
                            className="col-span-1 bg-surfaceLight border border-dark-border rounded-[2rem] p-5 flex flex-col justify-between items-start h-32 card-shine animate-scale-in"
                            style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
                        >
                            <div className="w-8 h-8 rounded-full bg-surface border border-dark-border flex items-center justify-center">
                                <Zap className="w-4 h-4 text-muted" />
                            </div>
                            <div className="mt-auto">
                                <p className="font-bold text-lg text-primary leading-none">{birthdays.length}</p>
                                <p className="text-xs text-muted mt-1">Friends</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h3 className="text-lg font-bold text-primary px-1">Upcoming</h3>
                        <div className="space-y-2">
                            {sortedBirthdays.length === 0 ? (
                                <div className="p-8 text-center border border-dashed border-dark-border rounded-2xl">
                                    <p className="text-muted text-sm">No birthdays found.</p>
                                </div>
                            ) : (
                                sortedBirthdays.map((birthday, index) => {
                                    const days = calculateDaysUntil(birthday.birthDate);
                                    const isUrgent = days <= 7;
                                    return (
                                        <div 
                                            key={birthday.id}
                                            onClick={() => handleEdit(birthday.id)}
                                            className="group flex items-center justify-between p-4 bg-dark-card border border-dark-border rounded-3xl hover:border-lime/30 transition-all active:scale-[0.98] cursor-pointer relative overflow-hidden animate-slide-up opacity-0"
                                            style={{ animationDelay: `${index * 50 + 300}ms` }}
                                        >
                                            <div className="absolute inset-0 bg-lime/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                            <div className="flex items-center gap-4 relative z-10 overflow-hidden">
                                                <div className="w-12 h-12 rounded-full bg-surfaceLight border border-dark-border flex items-center justify-center text-xl shrink-0">
                                                    {birthday.emoji || '👤'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-primary text-[15px] truncate">{birthday.name}</h4>
                                                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1 truncate">
                                                        {formatDateFriendly(birthday.birthDate)}
                                                        <span className="w-1 h-1 rounded-full bg-muted shrink-0"></span>
                                                        <span className="truncate">{birthday.relationship || 'Friend'}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="relative z-10 pl-2 shrink-0">
                                                {days === 0 ? (
                                                    <div className="px-3 py-1 bg-lime text-black text-xs font-bold rounded-full animate-pulse">
                                                        TODAY
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-right">
                                                        <div>
                                                            <span className={`block text-lg font-bold leading-none ${isUrgent ? 'text-lime' : 'text-primary'}`}>
                                                                {days}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-muted uppercase -rotate-90 origin-center translate-y-0.5">
                                                            Days
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    <div className="h-20"></div>
                </>
            )}

            {view === 'list' && (
                <CalendarView birthdays={birthdays} />
            )}

            {view === 'notes' && (
                <NotesView />
            )}
            
             {view === 'settings' && (
                <div className="space-y-6 pt-4 pb-20">
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in" style={{ animationDelay: '0ms' }}>
                         <div className="flex items-center gap-2 mb-4">
                            <Palette size={18} className="text-lime" />
                            <h3 className="text-primary font-bold">App Mood</h3>
                         </div>
                         <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                             {THEMES.map(t => (
                                 <button
                                    key={t.id}
                                    onClick={() => setAccentTheme(t.id)}
                                    className={`aspect-square rounded-2xl flex items-center justify-center transition-all relative overflow-hidden group ${accentTheme === t.id ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                                    style={{ backgroundColor: t.hex }}
                                    aria-label={t.name}
                                 >
                                     {accentTheme === t.id && (
                                         <div className="bg-black/20 rounded-full p-1 backdrop-blur-sm">
                                            <Check size={14} className="text-white" strokeWidth={3} />
                                         </div>
                                     )}
                                 </button>
                             ))}
                         </div>
                    </div>

                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                         <h3 className="text-primary font-bold mb-4">Preferences</h3>
                         
                         {/* Notification Toggle */}
                         <div className="flex justify-between items-center py-4 border-b border-dark-border cursor-pointer" onClick={() => {
                             if (!notificationsEnabled) {
                                 setIsNotificationModalOpen(true);
                             } else {
                                 setNotificationsEnabled(false);
                                 localStorage.setItem(NOTIF_MUTED_KEY, 'true');
                             }
                         }}>
                             <span className="text-muted">Notifications</span>
                             <div 
                                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${notificationsEnabled ? 'bg-lime' : 'bg-surfaceLight border border-dark-border'}`}
                             >
                                 <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                             </div>
                         </div>

                         {/* Notification Time Setting */}
                         <div className="flex justify-between items-center py-4 border-b border-dark-border">
                             <div className="flex items-center gap-2">
                                <Clock size={16} className="text-muted" />
                                <span className="text-muted">Reminder Time</span>
                             </div>
                             <input 
                                type="time" 
                                value={notificationTime}
                                onChange={(e) => setNotificationTime(e.target.value)}
                                className="bg-surfaceLight border border-dark-border rounded-xl px-3 py-1.5 text-primary text-sm font-bold focus:outline-none focus:border-lime transition-colors"
                             />
                         </div>
                         
                         <div className="flex justify-between items-center py-4 cursor-pointer" onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}>
                             <span className="text-muted">Theme</span>
                             <div className="flex items-center gap-2 bg-surfaceLight border border-dark-border rounded-full p-1">
                                <div className={`p-1.5 rounded-full transition-all ${themeMode === 'dark' ? 'bg-dark-card shadow text-white' : 'text-muted'}`}>
                                    <Moon size={14} />
                                </div>
                                <div className={`p-1.5 rounded-full transition-all ${themeMode === 'light' ? 'bg-white shadow text-black' : 'text-muted'}`}>
                                    <Sun size={14} />
                                </div>
                             </div>
                         </div>
                    </div>
                    
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                         <h3 className="text-primary font-bold mb-4">Data</h3>
                         <button 
                            onClick={() => {
                                if (confirm('Reset all data? This cannot be undone.')) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}
                            className="w-full py-4 rounded-3xl bg-surfaceLight text-red-400 font-medium border border-dark-border active:scale-[0.98] transition-transform hover:bg-red-500/5 hover:border-red-500/30 flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} />
                            Reset All Data
                        </button>
                    </div>

                    <div className="text-center text-muted text-xs py-6 opacity-50 animate-fade-in" style={{ animationDelay: '400ms' }}>
                        Happy4U v1.3.0
                    </div>
                </div>
            )}
            </div>
        </main>

        <div className="fixed bottom-6 left-6 right-6 z-50 gpu-layer max-w-lg mx-auto">
            <div className="glass-panel rounded-[2.5rem] p-2 flex justify-between items-center px-4 shadow-2xl neon-shadow transition-colors duration-300">
                <button 
                    onClick={() => setView('home')}
                    className={`p-3.5 rounded-full transition-all duration-300 ${view === 'home' ? 'bg-lime text-black translate-y-[-8px] shadow-lg shadow-lime/20' : 'text-muted hover:text-primary'}`}
                    aria-label="Home"
                >
                    <Home size={22} strokeWidth={view === 'home' ? 2.5 : 2} />
                </button>
                <button 
                    onClick={() => setView('list')}
                    className={`p-3.5 rounded-full transition-all duration-300 ${view === 'list' ? 'bg-lime text-black translate-y-[-8px] shadow-lg shadow-lime/20' : 'text-muted hover:text-primary'}`}
                    aria-label="Calendar"
                >
                    <CalendarIcon size={22} strokeWidth={view === 'list' ? 2.5 : 2} />
                </button>
                <button 
                    onClick={() => setView('notes')}
                    className={`p-3.5 rounded-full transition-all duration-300 ${view === 'notes' ? 'bg-lime text-black translate-y-[-8px] shadow-lg shadow-lime/20' : 'text-muted hover:text-primary'}`}
                    aria-label="Notes"
                >
                    <StickyNote size={22} strokeWidth={view === 'notes' ? 2.5 : 2} />
                </button>
                <button 
                    onClick={() => setView('settings')}
                    className={`p-3.5 rounded-full transition-all duration-300 ${view === 'settings' ? 'bg-lime text-black translate-y-[-8px] shadow-lg shadow-lime/20' : 'text-muted hover:text-primary'}`}
                    aria-label="Settings"
                >
                    <Settings size={22} strokeWidth={view === 'settings' ? 2.5 : 2} />
                </button>
            </div>
        </div>

        <AddBirthdayModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleAddOrUpdate}
            initialData={editingId ? birthdays.find(b => b.id === editingId) : null}
            handleDelete={handleDelete}
        />

        <WelcomeModal 
            isOpen={isWelcomeOpen}
            initialName={username}
            initialGender={gender}
            onSave={handleSaveProfile}
            onClose={username ? handleWelcomeClose : undefined} 
        />
        
        <NotificationPermissionModal
            isOpen={isNotificationModalOpen}
            onEnable={handleRequestNotification}
            onClose={() => {
                setIsNotificationModalOpen(false);
                if (!localStorage.getItem(USER_KEY)) {
                    setIsWelcomeOpen(true);
                }
            }}
        />

        {popupBirthdays.length > 0 && (
            <BirthdayPopup 
                birthdays={popupBirthdays} 
                onClose={() => setPopupBirthdays([])}
                onMarkCelebrated={handleMarkCelebrated}
            />
        )}
    </div>
  );
}
