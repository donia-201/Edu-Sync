// ===============================
// EduSync Settings & Shared Module
// ===============================
const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';
const authToken = localStorage.getItem('session_token') || localStorage.getItem('authToken');

// ===================================
// Global User Settings
// ===================================
window.userSettings = {};

// ===================================
// Load User Settings (Cached + Server)
// ===================================
async function loadUserSettings() {
    try {
        // 1️⃣ Load from localStorage
        const cached = localStorage.getItem('userSettings');
        if (cached) {
            window.userSettings = JSON.parse(cached);
            applyAllSettings();
            console.log('✅ Applied cached settings');
        }

        // 2️⃣ Fetch from server if logged in
        if (authToken) {
            const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    window.userSettings = data.settings;
                    localStorage.setItem('userSettings', JSON.stringify(data.settings));
                    applyAllSettings();
                    console.log('✅ Applied server settings');
                }
            }
        } else {
            applyDefaultSettings();
        }
    } catch (err) {
        console.error('❌ Error loading settings:', err);
        applyDefaultSettings();
    }
}

// ===================================
// Apply All Settings to Page
// ===================================
function applyAllSettings() {
    const settings = window.userSettings || {};
    applyTheme(settings.theme);
    applyLanguage(settings.language);
    applyFontSize(settings.font_size);
    applyAnimations(settings.animations_enabled);
}

// ===================================
// Default Settings
// ===================================
function applyDefaultSettings() {
    const defaultSettings = {
        theme: 'light',
        language: 'en',
        font_size: 'medium',
        pomodoro_duration: 25,
        short_break: 5,
        long_break: 15,
        sound_enabled: true,
        notifications_enabled: true,
        animations_enabled: true
    };
    window.userSettings = defaultSettings;
    localStorage.setItem('userSettings', JSON.stringify(defaultSettings));
    applyAllSettings();
}

// ===================================
// Theme
// ===================================
function applyTheme(theme) {
    const html = document.documentElement;
    const body = document.body;
    const themes = {
        blue: { primary:'#abc4ff', bg:'#e2eafc', accent:'#b6ccfe', border:'#ccd6f6' },
        purple: { primary:'#d4a5ff', bg:'#f3e5ff', accent:'#e5c5ff', border:'#e5c5ff' },
        green: { primary:'#a8e6cf', bg:'#dcf5ea', accent:'#b9f0d8', border:'#b9f0d8' },
        pink: { primary:'#ffb3d9', bg:'#ffe6f4', accent:'#ffc9e5', border:'#ffc9e5' },
        sunset: { primary:'#ffb380', bg:'#ffe5d9', accent:'#ffc499', border:'#ffc499' },
        ocean: { primary:'#80d6ff', bg:'#d9f0ff', accent:'#99ddff', border:'#99ddff' }
    };
    const t = themes[theme] || themes.blue;
    html.style.setProperty('--color-primary-dark', t.primary);
    html.style.setProperty('--color-bg-alt', t.bg);
    html.style.setProperty('--color-primary', t.accent);
    html.style.setProperty('--color-border', t.border);

    if (theme === 'dark' || theme === 'purple' || theme === 'ocean') {
        html.setAttribute('data-theme', 'dark');
        body.classList.add('dark-mode'); body.classList.remove('light-mode');
    } else {
        html.setAttribute('data-theme', 'light');
        body.classList.add('light-mode'); body.classList.remove('dark-mode');
    }
    console.log(`✅ Theme applied: ${theme}`);
}

// ===================================
// Language
// ===================================
function applyLanguage(language) {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    if (language === 'ar') document.body.classList.add('rtl');
    else document.body.classList.remove('rtl');
}

// ===================================
// Font Size
// ===================================
function applyFontSize(fontSize) {
    const map = { small:'14px', medium:'16px', large:'18px', xlarge:'20px' };
    document.documentElement.style.fontSize = map[fontSize] || '16px';
}

// ===================================
// Animations
// ===================================
function applyAnimations(enabled) {
    if (enabled===false) {
        document.documentElement.style.setProperty('--animation-duration','0s');
        document.documentElement.style.setProperty('--transition-duration','0s');
        const style = document.createElement('style');
        style.id='disable-animations';
        style.textContent=`*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}`;
        document.head.appendChild(style);
        console.log('✅ Animations disabled');
    } else {
        const style = document.getElementById('disable-animations');
        if(style) style.remove();
        document.documentElement.style.removeProperty('--animation-duration');
        document.documentElement.style.removeProperty('--transition-duration');
        console.log('✅ Animations enabled');
    }
}

// ===================================
// Notification Settings
// ===================================
function getNotificationSettings() {
    const s = window.userSettings || {};
    return { desktopNotifications: s.notifications_enabled!==false, soundEffects: s.sound_enabled!==false };
}

// ===================================
// Pomodoro Settings
// ===================================
function getPomodoroSettings() {
    const s = window.userSettings || {};
    return {
        pomodoroDuration: s.pomodoro_duration || 25,
        shortBreak: s.short_break || 5,
        longBreak: s.long_break || 15,
        soundEnabled: s.sound_enabled!==false,
        notificationsEnabled: s.notifications_enabled!==false
    };
}

// ===================================
// Request Notification Permission
// ===================================
async function requestNotificationPermission() {
    const s = getNotificationSettings();
    if(s.desktopNotifications && 'Notification' in window){
        if(Notification.permission==='default'){
            const p = await Notification.requestPermission();
            console.log(`🔔 Notification permission: ${p}`);
            return p==='granted';
        }
        return Notification.permission==='granted';
    }
    return false;
}

// ===================================
// Show Notification
// ===================================
function showNotification(title,message,options={}) {
    const s=getNotificationSettings();
    if(!s.desktopNotifications) return;
    if('Notification' in window && Notification.permission==='granted'){
        const n = new Notification(title,{
            body: message,
            icon: options.icon || '../imgs/education.png',
            badge: '../imgs/education.png',
            tag: options.tag || 'eduSync',
            requireInteraction: options.requireInteraction || false,
            silent: !s.soundEffects,
            vibrate: [200,100,200],
            ...options
        });
        n.onclick=()=>{ window.focus(); n.close(); if(options.onClick) options.onClick(); };
        if(options.autoClose!==false) setTimeout(()=>n.close(), options.duration||5000);
        if(s.soundEffects) playNotificationSound();
        return n;
    }
}

// ===================================
// Play Notification Sound
// ===================================
function playNotificationSound(){
    const s=window.userSettings||{};
    if(!s.sound_enabled) return;
    try{
        const ctx = new (window.AudioContext||window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value=800; osc.type='sine'; gain.gain.value=0.3;
        osc.start(); setTimeout(()=>osc.stop(),200);
    }catch(e){console.log('Audio not supported');}
}

// ===================================
// Settings Page Functions
// ===================================
async function saveUserSettingsFromPage(){
    try{
        if(!authToken){alert('Please login first!');return;}
        const displayName = document.getElementById('displayName').value.trim();
        const email = document.getElementById('email').value.trim();
        const theme = document.getElementById('theme').value;
        const language = document.getElementById('language').value;
        const fontSize = document.getElementById('fontSize').value;
        const pomodoroDuration = parseInt(document.getElementById('pomodoroDuration').value);
        const breakDuration = parseInt(document.getElementById('breakDuration').value);
        const longBreakDuration = parseInt(document.getElementById('longBreakDuration').value);
        const soundEffects = document.getElementById('soundEffects').checked;
        const desktopNotifications = document.getElementById('desktopNotifications').checked;

        const themeBackendMap = {'blue':'light','purple':'dark','green':'light','pink':'light','sunset':'light','ocean':'dark'};
        const fontSizeBackendMap = {'small':'small','medium':'medium','large':'large','xlarge':'xlarge','extra-large':'xlarge'};

        const settingsData = {
            theme: themeBackendMap[theme]||'light',
            language: language,
            font_size: fontSizeBackendMap[fontSize]||'medium',
            pomodoro_duration: pomodoroDuration,
            short_break: breakDuration,
            long_break: longBreakDuration,
            sound_enabled: soundEffects,
            notifications_enabled: desktopNotifications
        };

        // Save to server
        const res = await fetch(`${API_BASE_URL}/api/user/settings`,{
            method:'PUT',
            headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`},
            body: JSON.stringify(settingsData)
        });
        const result = await res.json();
        if(!result.success) throw new Error(result.msg || 'Failed to save settings');

        if(displayName){
            const prRes = await fetch(`${API_BASE_URL}/api/user/profile`,{
                method:'PUT',
                headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`},
                body: JSON.stringify({name: displayName})
            });
            console.log(await prRes.json());
        }

        window.userSettings = settingsData;
        localStorage.setItem('userSettings', JSON.stringify(settingsData));
        applyAllSettings();
        window.dispatchEvent(new CustomEvent('settingsChanged',{detail:settingsData}));
        showSuccessMessage('✓ Settings saved successfully!');
    }catch(err){ console.error(err); showSuccessMessage('⚠️ Failed to save settings: '+err.message,true);}
}

async function resetUserSettingsFromPage(){
    if(!confirm('⚠️ Are you sure you want to reset all settings to default?')) return;
    const defaultSettings={
        theme:'light',language:'en',font_size:'medium',
        pomodoro_duration:25,short_break:5,long_break:15,
        sound_enabled:true,notifications_enabled:true,animations_enabled:true
    };
    try{
        const res=await fetch(`${API_BASE_URL}/api/user/settings`,{
            method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`},
            body: JSON.stringify(defaultSettings)
        });
        const data=await res.json();
        if(!data.success) throw new Error(data.msg);
        window.userSettings=defaultSettings;
        localStorage.setItem('userSettings',JSON.stringify(defaultSettings));
        applyAllSettings();
        showSuccessMessage('✓ Settings reset to default');
        setTimeout(()=>window.location.reload(),1500);
    }catch(err){console.error(err);showSuccessMessage('Failed to reset settings',true);}
}

function showSuccessMessage(message,isError=false){
    const el=document.getElementById('successMessage');
    if(el){
        el.textContent=message;
        el.style.background=isError?'#ef4444':'#10b981';
        el.style.display='block';
        setTimeout(()=>el.style.display='none',3000);
    }else alert(message);
}

// ===================================
// Initialize Settings Page
// ===================================
document.addEventListener('DOMContentLoaded',()=>{
    console.log('🚀 Initializing Settings Page...');
    loadUserSettings();

    const saveBtn = document.querySelector('.save-btn');
    if(saveBtn){saveBtn.onclick=null; saveBtn.addEventListener('click', saveUserSettingsFromPage);}
    const resetBtn = document.querySelector('.action-btn:not(.danger)');
    if(resetBtn && resetBtn.textContent.includes('Reset')) resetBtn.onclick=resetUserSettingsFromPage;
    console.log('✅ Settings Page initialized');
});

// ===================================
// Export Global Functions
// ===================================
window.EduSyncSettings={
    load: loadUserSettings,
    apply: applyAllSettings,
    applyTheme,
    applyFontSize,
    applyLanguage,
    applyAnimations,
    getPomodoro: getPomodoroSettings,
    getNotifications: getNotificationSettings,
    requestNotificationPermission,
    showNotification,
    playSound: playNotificationSound
};

