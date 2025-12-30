
// ===== Load User Settings =====
function loadUserSettings() {
    const settings = localStorage.getItem('eduSyncSettings');
    if (settings) {
        try {
            return JSON.parse(settings);
        } catch (e) {
            console.error('Error parsing settings:', e);
            return null;
        }
    }
    return null;
}

// ===== Apply Theme =====
function applyTheme(theme) {
    const themes = {
        blue: { 
            primary: '#abc4ff', 
            bg: '#e2eafc', 
            accent: '#b6ccfe',
            border: '#ccd6f6'
        },
        purple: { 
            primary: '#d4a5ff', 
            bg: '#f3e5ff', 
            accent: '#e5c5ff',
            border: '#e5c5ff'
        },
        green: { 
            primary: '#a8e6cf', 
            bg: '#dcf5ea', 
            accent: '#b9f0d8',
            border: '#b9f0d8'
        },
        pink: { 
            primary: '#ffb3d9', 
            bg: '#ffe6f4', 
            accent: '#ffc9e5',
            border: '#ffc9e5'
        },
        sunset: { 
            primary: '#ffb380', 
            bg: '#ffe5d9', 
            accent: '#ffc499',
            border: '#ffc499'
        },
        ocean: { 
            primary: '#80d6ff', 
            bg: '#d9f0ff', 
            accent: '#99ddff',
            border: '#99ddff'
        }
    };

    if (themes[theme]) {
        document.documentElement.style.setProperty('--color-primary-dark', themes[theme].primary);
        document.documentElement.style.setProperty('--color-bg-alt', themes[theme].bg);
        document.documentElement.style.setProperty('--color-primary', themes[theme].accent);
        document.documentElement.style.setProperty('--color-border', themes[theme].border);
        
        console.log(`✅ Theme applied: ${theme}`);
    }
}

// ===== Apply Font Size =====
function applyFontSize(size) {
    const sizes = {
        small: '90%',
        medium: '100%',
        large: '110%',
        'extra-large': '120%'
    };
    
    if (sizes[size]) {
        document.documentElement.style.fontSize = sizes[size];
        console.log(`✅ Font size applied: ${size}`);
    }
}

// ===== Apply Language =====
function applyLanguage(lang) {
    if (lang === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', lang || 'en');
    }
    
    console.log(`✅ Language applied: ${lang}`);
}

// ===== Apply Animations =====
function applyAnimations(enabled) {
    if (enabled === false) {
        document.documentElement.style.setProperty('--animation-duration', '0s');
        document.documentElement.style.setProperty('--transition-duration', '0s');
        
        const style = document.createElement('style');
        style.id = 'disable-animations';
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0s !important;
                transition-duration: 0s !important;
            }
        `;
        document.head.appendChild(style);
        
        console.log('✅ Animations disabled');
    } else {
        const style = document.getElementById('disable-animations');
        if (style) {
            style.remove();
        }
        document.documentElement.style.removeProperty('--animation-duration');
        document.documentElement.style.removeProperty('--transition-duration');
        
        console.log('✅ Animations enabled');
    }
}

// ===== Apply All Settings =====
function applyAllSettings() {
    const settings = loadUserSettings();
    
    if (settings) {
        console.log('📋 Applying user settings:', settings);
        
        // Apply theme
        if (settings.theme) {
            applyTheme(settings.theme);
        }
        
        // Apply font size
        if (settings.fontSize) {
            applyFontSize(settings.fontSize);
        }
        
        // Apply language
        if (settings.language) {
            applyLanguage(settings.language);
        }
        
        // Apply animations
        if (settings.animations !== undefined) {
            applyAnimations(settings.animations);
        }
        
        console.log(' All settings applied successfully');
    } else {
        console.log(' No saved settings found, using defaults');
    }
}

// ===== Get Pomodoro Settings =====
function getPomodoroSettings() {
    const settings = loadUserSettings();
    
    if (settings) {
        return {
            pomodoroDuration: parseInt(settings.pomodoroDuration) || 25,
            breakDuration: parseInt(settings.breakDuration) || 5,
            longBreakDuration: parseInt(settings.longBreakDuration) || 30,
            autoStart: settings.autoStart === true,
            soundEffects: settings.soundEffects !== false,
            studyReminders: settings.studyReminders !== false,
            breakNotifications: settings.breakNotifications !== false,
            desktopNotifications: settings.desktopNotifications === true
        };
    }
    
    return {
        pomodoroDuration: 25,
        breakDuration: 5,
        longBreakDuration: 30,
        autoStart: false,
        soundEffects: true,
        studyReminders: true,
        breakNotifications: true,
        desktopNotifications: false
    };
}

// ===== Get Notification Settings =====
function getNotificationSettings() {
    const settings = loadUserSettings();
    
    if (settings) {
        return {
            studyReminders: settings.studyReminders !== false,
            breakNotifications: settings.breakNotifications !== false,
            examReminders: settings.examReminders !== false,
            weeklyReport: settings.weeklyReport !== false,
            soundEffects: settings.soundEffects !== false,
            desktopNotifications: settings.desktopNotifications === true
        };
    }
    
    return {
        studyReminders: true,
        breakNotifications: true,
        examReminders: true,
        weeklyReport: true,
        soundEffects: true,
        desktopNotifications: false
    };
}

// ===== Get Calendar Settings =====
function getCalendarSettings() {
    const settings = loadUserSettings();
    
    if (settings) {
        return {
            googleCalendar: settings.googleCalendar === true,
            autoAddSessions: settings.autoAddSessions === true,
            syncExams: settings.syncExams === true
        };
    }
    
    return {
        googleCalendar: false,
        autoAddSessions: false,
        syncExams: false
    };
}

// ===== Request Notification Permission =====
async function requestNotificationPermission() {
    const settings = getNotificationSettings();
    
    if (settings.desktopNotifications && 'Notification' in window) {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log(`🔔 Notification permission: ${permission}`);
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }
    
    return false;
}

// ===== Show Notification =====
function showNotification(title, message, options = {}) {
    const notifSettings = getNotificationSettings();
    
    if (!notifSettings.desktopNotifications) {
        console.log(' Desktop notifications disabled in settings');
        return;
    }
    
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: message,
            icon: options.icon || '../imgs/education.png',
            badge: '../imgs/education.png',
            tag: options.tag || 'eduSync',
            requireInteraction: options.requireInteraction || false,
            silent: !notifSettings.soundEffects,
            vibrate: [200, 100, 200],
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
            if (options.onClick) {
                options.onClick();
            }
        };

        if (options.autoClose !== false) {
            setTimeout(() => notification.close(), options.duration || 5000);
        }
        
        // Play sound if enabled
        if (notifSettings.soundEffects) {
            playNotificationSound();
        }
        
        return notification;
    }
}

// ===== Play Notification Sound =====
function playNotificationSound() {
    const settings = getNotificationSettings();
    
    if (!settings.soundEffects) {
        return;
    }
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
    } catch(e) {
        console.log('Audio not supported');
    }
}

// ===== Listen for Settings Changes =====
window.addEventListener('storage', (e) => {
    if (e.key === 'eduSyncSettings') {
        console.log(' Settings changed, reapplying...');
        applyAllSettings();
    }
});

// ===== Export Functions for Global Use =====
window.EduSyncSettings = {
    load: loadUserSettings,
    apply: applyAllSettings,
    applyTheme: applyTheme,
    applyFontSize: applyFontSize,
    applyLanguage: applyLanguage,
    applyAnimations: applyAnimations,
    getPomodoro: getPomodoroSettings,
    getNotifications: getNotificationSettings,
    getCalendar: getCalendarSettings,
    requestNotificationPermission: requestNotificationPermission,
    showNotification: showNotification,
    playSound: playNotificationSound
};

// ===== Auto-apply Settings on Page Load =====
document.addEventListener('DOMContentLoaded', () => {
    console.log(' EduSync Settings Module Loaded');
    applyAllSettings();
    
    // Request notification permission if enabled
    const settings = loadUserSettings();
    if (settings && settings.desktopNotifications) {
        requestNotificationPermission();
    }
});

console.log('✅ shared.js loaded successfully');