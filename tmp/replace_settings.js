const fs = require('fs');
const file = 'App.tsx';
const content = fs.readFileSync(file, 'utf8');

const startMarker = "             {view === 'settings' && (";
const endMarker = "            )}";

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
    console.error('Error: startMarker not found!');
    process.exit(1);
}

// Find the corresponding closing block for settings tab
// To be extremely precise, find the next occurrences of endMarker after startIndex
let searchIndex = startIndex;
let endIndex = -1;
while (true) {
    const idx = content.indexOf(endMarker, searchIndex + 1);
    if (idx === -1) break;
    
    // Check if the lines around look like the end of settings
    const segment = content.substring(idx - 150, idx + 50);
    if (segment.includes("Happy4U v1.3.0")) {
        // Found it!
        endIndex = idx + endMarker.length;
        break;
    }
    searchIndex = idx;
}

if (endIndex === -1) {
    console.error('Error: endMarker not found!');
    process.exit(1);
}

const replacement = `             {view === 'settings' && (
                <div className="space-y-6 pt-4 pb-20">
                    
                    {/* App Mood Card */}
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
                                    className={\`aspect-square rounded-2xl flex items-center justify-center transition-all relative overflow-hidden group \${accentTheme === t.id ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100 hover:scale-105'}\`}
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

                    {/* Preferences/Notifications Section */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in space-y-6" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                         <div className="flex items-center gap-2">
                             <Clock size={18} className="text-lime" />
                             <h3 className="text-primary font-bold">Notifications</h3>
                         </div>
                         
                         {/* Notification Master Toggle */}
                         <div className="flex justify-between items-center py-2 border-b border-dark-border cursor-pointer" onClick={() => {
                             if (!('Notification' in window)) {
                                 const nextVal = !notificationsEnabled;
                                 setNotificationsEnabled(nextVal);
                                 localStorage.setItem(NOTIF_MUTED_KEY, nextVal ? 'false' : 'true');
                                 return;
                             }
                             if (!notificationsEnabled) {
                                 setIsNotificationModalOpen(true);
                             } else {
                                 setNotificationsEnabled(false);
                                 localStorage.setItem(NOTIF_MUTED_KEY, 'true');
                             }
                         }}>
                             <div className="space-y-1">
                                 <span className="text-xs text-primary font-bold block">Enable Notifications</span>
                                 <span className="text-[10px] text-muted block">Alerts on device local storage</span>
                             </div>
                             <div 
                                className={\`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out \${notificationsEnabled ? 'bg-lime' : 'bg-surfaceLight border border-dark-border'}\`}
                             >
                                 <div className={\`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out \${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}\`}></div>
                             </div>
                         </div>

                         {/* Offsets (same day, 1 day, 3 days) Toggles + Times */}
                         <div className="space-y-4">
                             <span className="text-xs text-primary font-bold block">Active Reminder Offsets</span>
                             
                             {/* On Birthday */}
                             <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-surfaceLight border border-dark-border rounded-2xl p-4 gap-3">
                                 <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => setOffsetMuted0(!offsetMuted0)}
                                        className={\`w-10 h-10 rounded-xl flex items-center justify-center transition-colors \${!offsetMuted0 ? 'bg-lime/10 text-lime border border-lime/30' : 'bg-dark-card text-muted border border-dark-border'}\`}
                                     >
                                         <Check size={16} strokeWidth={!offsetMuted0 ? 3 : 2} />
                                     </button>
                                     <div className="space-y-0.5">
                                         <span className="text-xs text-primary font-bold block">On Birthday Day</span>
                                         <span className="text-[10px] text-muted block">Alert on actual birth date</span>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <span className="text-[10px] text-muted font-bold font-mono uppercase">Time:</span>
                                     <input 
                                        type="time" 
                                        disabled={offsetMuted0}
                                        value={notifTimeSameDay}
                                        onChange={(e) => {
                                            setNotifTimeSameDay(e.target.value);
                                            setNotificationTime(e.target.value);
                                        }}
                                        className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 text-primary text-sm font-bold focus:outline-none focus:border-lime disabled:opacity-30 transition-colors"
                                     />
                                 </div>
                             </div>

                             {/* 1 Day Before */}
                             <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-surfaceLight border border-dark-border rounded-2xl p-4 gap-3">
                                 <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => setOffsetMuted1(!offsetMuted1)}
                                        className={\`w-10 h-10 rounded-xl flex items-center justify-center transition-colors \${!offsetMuted1 ? 'bg-lime/10 text-lime border border-lime/30' : 'bg-dark-card text-muted border border-dark-border'}\`}
                                     >
                                         <Check size={16} strokeWidth={!offsetMuted1 ? 3 : 2} />
                                     </button>
                                     <div className="space-y-0.5">
                                         <span className="text-xs text-primary font-bold block">1 Day Before</span>
                                         <span className="text-[10px] text-muted block">Advance gentle reminder</span>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <span className="text-[10px] text-muted font-bold font-mono uppercase">Time:</span>
                                     <input 
                                        type="time" 
                                        disabled={offsetMuted1}
                                        value={notifTimeOneDay}
                                        onChange={(e) => setNotifTimeOneDay(e.target.value)}
                                        className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 text-primary text-sm font-bold focus:outline-none focus:border-lime disabled:opacity-30 transition-colors"
                                     />
                                 </div>
                             </div>

                             {/* 3 Days Before */}
                             <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-surfaceLight border border-dark-border rounded-2xl p-4 gap-3">
                                 <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => setOffsetMuted3(!offsetMuted3)}
                                        className={\`w-10 h-10 rounded-xl flex items-center justify-center transition-colors \${!offsetMuted3 ? 'bg-lime/10 text-lime border border-lime/30' : 'bg-dark-card text-muted border border-dark-border'}\`}
                                     >
                                         <Check size={16} strokeWidth={!offsetMuted3 ? 3 : 2} />
                                     </button>
                                     <div className="space-y-0.5">
                                         <span className="text-xs text-primary font-bold block">3 Days Before</span>
                                         <span className="text-[10px] text-muted block">Planning & gift preparation</span>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <span className="text-[10px] text-muted font-bold font-mono uppercase">Time:</span>
                                     <input 
                                        type="time" 
                                        disabled={offsetMuted3}
                                        value={notifTimeThreeDays}
                                        onChange={(e) => setNotifTimeThreeDays(e.target.value)}
                                        className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 text-primary text-sm font-bold focus:outline-none focus:border-lime disabled:opacity-30 transition-colors"
                                     />
                                 </div>
                             </div>
                         </div>

                         {/* Theme Selectors Mode (Light vs. Dark) */}
                         <div className="flex justify-between items-center py-4 border-t border-dark-border cursor-pointer" onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}>
                             <div className="space-y-0.5">
                                 <span className="text-xs text-primary font-bold block">Theme Mode</span>
                                 <span className="text-[10px] text-muted block">Seamless toggle between modes</span>
                             </div>
                             <div className="flex items-center gap-2 bg-surfaceLight border border-dark-border rounded-full p-1 h-9">
                                <div className={\`p-1.5 rounded-full transition-all \${themeMode === 'dark' ? 'bg-dark-card shadow text-white' : 'text-muted'}\`}>
                                    <Moon size={14} />
                                </div>
                                <div className={\`p-1.5 rounded-full transition-all \${themeMode === 'light' ? 'bg-white shadow text-black' : 'text-muted'}\`}>
                                    <Sun size={14} />
                                </div>
                             </div>
                         </div>

                         {/* Test Notification button */}
                         <button 
                             onClick={sendTestNotification}
                             className="w-full py-4 rounded-2xl bg-surfaceLight border border-dark-border text-xs text-primary font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-lime hover:text-black hover:border-lime cursor-pointer uppercase tracking-wider"
                         >
                             <Sparkles size={14} />
                             Test Local Notification
                         </button>
                    </div>

                    {/* Leap Year Rule */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={18} className="text-lime" />
                            <h3 className="text-primary font-bold">Leap Year Handling</h3>
                        </div>
                        <p className="text-xs text-muted leading-relaxed mb-4">
                            Choose when to trigger reminders for birthdays occurring on Leap Day (<b>29 February</b>) during standard non-leap years.
                        </p>

                        <div className="grid grid-cols-2 gap-2 p-1.5 bg-surfaceLight border border-dark-border rounded-2xl">
                            <button
                                onClick={() => setLeapYearMode('Feb28')}
                                className={\`py-3.5 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-wide cursor-pointer \${
                                    leapYearMode === 'Feb28'
                                    ? 'bg-lime text-black shadow-lg shadow-lime/15 font-extrabold'
                                    : 'text-muted hover:text-primary'
                                }\`}
                            >
                                Feb 28 📅
                            </button>
                            <button
                                onClick={() => setLeapYearMode('March1')}
                                className={\`py-3.5 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-wide cursor-pointer \${
                                    leapYearMode === 'March1'
                                    ? 'bg-lime text-black shadow-lg shadow-lime/15 font-extrabold'
                                    : 'text-muted hover:text-primary'
                                }\`}
                            >
                                March 1 🎈
                            </button>
                        </div>
                    </div>

                    {/* Data Backup & Restore */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in space-y-4" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                         <div className="flex items-center gap-2 mb-1">
                            <Trash2 size={18} className="text-lime" />
                            <h3 className="text-primary font-bold">Backup & Data Sovereignty</h3>
                         </div>
                         <p className="text-xs text-muted leading-relaxed">
                             All birthday records and Sticky Notes reside safely inside your physical device local sandbox storage. Backup to a local json file to secure your data.
                         </p>

                         <div className="grid grid-cols-2 gap-3 pt-2">
                             <button 
                                 onClick={handleBackup}
                                 className="py-3.5 px-4 rounded-2xl bg-surfaceLight border border-dark-border text-xs text-primary font-bold transition-transform active:scale-[0.98] hover:bg-surfaceLight/80 flex items-center justify-center gap-1.5"
                             >
                                 Backup File
                             </button>
                             <label 
                                 className="py-3.5 px-4 rounded-2xl bg-surfaceLight border border-dark-border text-xs text-primary font-bold transition-transform active:scale-[0.98] hover:bg-surfaceLight/80 flex items-center justify-center gap-1.5 cursor-pointer text-center"
                             >
                                 Restore File
                                 <input 
                                     type="file" 
                                     accept=".json"
                                     onChange={handleRestore}
                                     className="hidden" 
                                 />
                             </label>
                         </div>

                         <button 
                             onClick={() => {
                                 if (confirm('Reset all details? This completely purges your local database.')) {
                                     localStorage.clear();
                                     window.location.reload();
                                 }
                             }}
                             className="w-full mt-3 py-3.5 rounded-2xl bg-surfaceLight text-red-400 font-bold border border-dark-border active:scale-[0.98] transition-transform hover:bg-red-500/5 hover:border-red-500/30 flex items-center justify-center gap-2 text-xs uppercase"
                         >
                             Purge Local Database
                         </button>
                    </div>

                    {/* About Card */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in space-y-3" style={{ animationDelay: '220ms', animationFillMode: 'backwards' }}>
                         <h3 className="text-primary font-bold">About Happy4U</h3>
                         <p className="text-xs text-muted leading-relaxed">
                             Happy4U is a fully decentralized, privacy-focused birthday reminders ledger. Reminders are synchronized safely without sending any calendar metadata or personal details outside of your local system context.
                         </p>
                    </div>

                    {/* Privacy Policy Card */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in" style={{ animationDelay: '240ms', animationFillMode: 'backwards' }}>
                         <h3 className="text-primary font-bold mb-2">Privacy</h3>
                         <p className="text-[11px] text-muted leading-relaxed">
                             Your privacy is absolute. We do not maintain remote cloud backends, track application events, or analyze notification rosters. Your friendships and associations remain entirely your own business.
                         </p>
                    </div>

                    {/* Hidden Developer Mode UI */}
                    {devModeActive && (
                        <div className="space-y-6 pt-4 border-t border-dashed border-lime/30 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <span className="text-lime font-black uppercase tracking-widest text-[11px] flex items-center gap-1.5">
                                    <Zap size={14} />
                                    Developer Engineering Deck Active
                                </span>
                                <button 
                                    onClick={() => {
                                        setDevModeActive(false);
                                        localStorage.setItem('happy4u_dev_mode', 'false');
                                        alert('Developer Mode Deactivated.');
                                    }}
                                    className="text-[10px] text-red-100 font-bold border border-red-400/30 px-2 py-1 rounded bg-red-400/5 hover:bg-red-400/10 cursor-pointer"
                                >
                                    Hide Deck
                                </button>
                            </div>

                            {/* Scheduler Engine Configuration Card */}
                            <div className="bg-dark-card border-2 border-lime/20 rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={18} className="text-lime" />
                                    <h3 className="text-primary font-bold">Rolling Scheduler Engine Constants</h3>
                                </div>
                                <p className="text-xs text-muted leading-relaxed">
                                    Configure how many days ahead to pre-schedule reminders and the maximum active local alarms. The engine will automatically cycle and roll forward chronologically.
                                </p>

                                <div className="space-y-4 pt-2">
                                    <div className="flex justify-between items-center bg-surfaceLight border border-dark-border rounded-2xl p-4">
                                        <div className="space-y-1">
                                            <span className="text-xs text-primary font-bold block">Scheduling Window</span>
                                            <span className="text-[10px] text-muted block">Days to cover future reminders</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="1000"
                                                value={schedulingWindowDays}
                                                onChange={(e) => {
                                                    const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                                    setSchedulingWindowDays(val);
                                                    NotificationNativeScheduler.setSchedulingWindowDays(val);
                                                    NotificationReconciliationService.reconcile().then(() => {
                                                        setReconcileStats(NotificationReconciliationService.getLatestStats());
                                                    });
                                                }}
                                                className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 w-24 text-primary text-sm font-bold focus:outline-none focus:border-lime transition-colors text-center"
                                            />
                                            <span className="text-xs text-muted font-bold">days</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center bg-surfaceLight border border-dark-border rounded-2xl p-4">
                                        <div className="space-y-1">
                                            <span className="text-xs text-primary font-bold block">Native Capacity Limit</span>
                                            <span className="text-[10px] text-muted block">Max physical OS alarm slots</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="number" 
                                                min="10" 
                                                max="1000"
                                                value={nativeLimit}
                                                onChange={(e) => {
                                                    const val = Math.max(10, parseInt(e.target.value, 10) || 10);
                                                    setNativeLimit(val);
                                                    NotificationNativeScheduler.setNativeLimit(val);
                                                    NotificationReconciliationService.reconcile().then(() => {
                                                        setReconcileStats(NotificationReconciliationService.getLatestStats());
                                                    });
                                                }}
                                                className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 w-24 text-primary text-sm font-bold focus:outline-none focus:border-lime transition-colors text-center"
                                            />
                                            <span className="text-xs text-muted font-bold">slots</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Real-time Verification Console Card */}
                            <div className="bg-dark-card border-2 border-lime/20 rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Terminal size={18} className="text-lime" />
                                    <h3 className="text-primary font-bold">Verification & Telemetry (Internal Diagnostics)</h3>
                                </div>
                                <p className="text-xs text-muted leading-relaxed">
                                    Proof of active local reminders, dynamic bounds, and validation telemetry.
                                </p>

                                {reconcileStats ? (
                                    <div className="space-y-2 bg-surfaceLight border border-dark-border rounded-2xl p-4 font-mono text-[11px] leading-relaxed relative overflow-hidden">
                                        <div className="absolute right-3 top-3 px-1.5 py-0.5 rounded bg-lime/10 border border-lime/20 text-[9px] text-lime font-bold font-sans">
                                            IDEMPOTENT
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5">
                                            <span className="text-muted text-[11px]">Birthdays Loaded:</span>
                                            <span className="text-primary font-bold">{reconcileStats.birthdaysLoaded}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Calculated Reminders:</span>
                                            <span className="text-primary font-bold">{reconcileStats.totalCalculated}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Scheduling Window:</span>
                                            <span className="text-primary font-bold">next {reconcileStats.schedulingWindowDays} days</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">OS Capacity Limit:</span>
                                            <span className="text-primary font-bold">{reconcileStats.nativeLimit}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Actually Scheduled:</span>
                                            <span className="text-lime font-bold">{reconcileStats.nativeRegistered}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Already Scheduled:</span>
                                            <span className="text-primary">{reconcileStats.alreadyScheduled}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Missing Scheduled:</span>
                                            <span className="text-primary">{reconcileStats.missingScheduled}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Duplicate Count:</span>
                                            <span className="text-primary">{reconcileStats.duplicateCount}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Orphan Count:</span>
                                            <span className="text-primary">{reconcileStats.orphanCount}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Collision Count:</span>
                                            <span className="text-primary">{reconcileStats.collisionCount}</span>
                                        </div>
                                        <div className="flex flex-col border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted block text-[11px]">Next Scheduled Alert:</span>
                                            <span className="text-[10px] text-primary truncate mt-0.5 font-mono">{reconcileStats.nextScheduledReminder || 'None'}</span>
                                        </div>
                                        <div className="flex flex-col pb-0.5 font-mono">
                                            <span className="text-muted block text-[11px]">Last Scheduled Alert:</span>
                                            <span className="text-[10px] text-primary truncate mt-0.5 font-mono">{reconcileStats.lastScheduledReminder || 'None'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-surfaceLight border border-dark-border rounded-2xl p-4 text-center font-mono text-[11px] text-muted-foreground leading-relaxed">
                                        No telemetry events recorded. Perform/trigger reconciliation.
                                    </div>
                                )}
                                <button 
                                    onClick={() => {
                                        NotificationReconciliationService.reconcile().then(() => {
                                            setReconcileStats(NotificationReconciliationService.getLatestStats());
                                        });
                                    }}
                                    className="w-full py-3 rounded-2xl bg-lime text-black font-extrabold text-xs active:scale-[0.98] transition-all hover:bg-lime/90 flex items-center justify-center gap-1.5 shadow shadow-lime/20 cursor-pointer uppercase tracking-wider"
                                >
                                    <Sparkles size={14} strokeWidth={2.5} />
                                    Recalculate & Reconcile Now
                                </button>
                            </div>
                        </div>
                    )}

                    {/* App Version Footer (Tapped 7 times to reveal developer controls) */}
                    <div 
                        onClick={handleVersionClick}
                        className="text-center text-muted text-xs py-6 opacity-50 hover:opacity-100 transition-opacity select-none cursor-pointer duration-300"
                    >
                        Happy4U v1.3.0
                    </div>
                </div>
            )}`;

const startSearchStr = content.substring(0, startIndex);
const endSearchStr = content.substring(endIndex);

const finalContent = startSearchStr + replacement + endSearchStr;
fs.writeFileSync(file, finalContent, 'utf8');
console.log('Successfully completed settings view substitution!');
