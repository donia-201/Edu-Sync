const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';
const authToken = localStorage.getItem('session_token') || localStorage.getItem('authToken');

// ===================================
// Load User Profile & Settings on Page Load
// ===================================
async function loadUserProfile() {
    try {
        console.log('📥 Loading user profile...');
        
        if (!authToken) {
            alert('Please login first!');
            window.location.href = '../index.html';
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load profile');
        }
        
        const data = await response.json();
        
        if (data.success) {
            const user = data.user;
            const settings = user.settings;
            
            console.log('✅ Profile loaded:', user);
            
            // ===================================
            // Account Settings
            // ===================================
            document.getElementById('displayName').value = user.name || '';
            document.getElementById('email').value = user.email || '';
            
            // ===================================
            // Appearance Settings
            // ===================================
            // Theme (map to your theme names)
            const themeMap = {
                'light': 'blue',
                'dark': 'purple',
                'auto': 'blue'
            };
            document.getElementById('theme').value = themeMap[settings.theme] || 'blue';
            
            // Language
            document.getElementById('language').value = settings.language || 'en';
            
            // Font Size (map to your font size names)
            const fontSizeMap = {
                'small': 'small',
                'medium': 'medium',
                'large': 'large',
                'xlarge': 'extra-large'
            };
            document.getElementById('fontSize').value = fontSizeMap[settings.font_size] || 'medium';
            
            // ===================================
            // Study Preferences
            // ===================================
            document.getElementById('pomodoroDuration').value = settings.pomodoro_duration || 25;
            document.getElementById('breakDuration').value = settings.short_break || 5;
            document.getElementById('longBreakDuration').value = settings.long_break || 15;
            
            // ===================================
            // Notifications
            // ===================================
            document.getElementById('soundEffects').checked = settings.sound_enabled !== false;
            document.getElementById('desktopNotifications').checked = settings.notifications_enabled !== false;
            
            // Apply settings to current page
            applySettingsToPage(settings);
            
            console.log('✅ Settings loaded and applied');
        }
        
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        showSuccessMessage('⚠️ Failed to load settings', true);
    }
}


// ===================================
// Save Settings to Backend
// ===================================
async function saveSettings() {
    try {
        console.log('💾 Saving settings...');
        
        if (!authToken) {
            alert('Please login first!');
            return;
        }
        
        // ===================================
        // Collect Account Settings
        // ===================================
        const displayName = document.getElementById('displayName').value.trim();
        const email = document.getElementById('email').value.trim();
        
        // ===================================
        // Collect Appearance Settings
        // ===================================
        const theme = document.getElementById('theme').value;
        const language = document.getElementById('language').value;
        const fontSize = document.getElementById('fontSize').value;
        
        // ===================================
        // Collect Study Preferences
        // ===================================
        const pomodoroDuration = parseInt(document.getElementById('pomodoroDuration').value);
        const breakDuration = parseInt(document.getElementById('breakDuration').value);
        const longBreakDuration = parseInt(document.getElementById('longBreakDuration').value);
        
        // ===================================
        // Collect Notification Settings
        // ===================================
        const soundEffects = document.getElementById('soundEffects').checked;
        const desktopNotifications = document.getElementById('desktopNotifications').checked;
        
        // ===================================
        // Map theme to backend format
        // ===================================
        const themeBackendMap = {
            'blue': 'light',
            'purple': 'dark',
            'green': 'light',
            'pink': 'light',
            'sunset': 'light',
            'ocean': 'dark'
        };
        
        const backendTheme = themeBackendMap[theme] || 'light';
        
        // ===================================
        // Map font size to backend format
        // ===================================
        const fontSizeBackendMap = {
            'small': 'small',
            'medium': 'medium',
            'large': 'large',
            'extra-large': 'xlarge'
        };
        
        const backendFontSize = fontSizeBackendMap[fontSize] || 'medium';
        
        // ===================================
        // Prepare settings data
        // ===================================
        const settingsData = {
            theme: backendTheme,
            language: language,
            font_size: backendFontSize,
            pomodoro_duration: pomodoroDuration,
            short_break: breakDuration,
            long_break: longBreakDuration,
            sound_enabled: soundEffects,
            notifications_enabled: desktopNotifications
        };
        
        console.log('📤 Settings to save:', settingsData);
        
        // ===================================
        // Save Settings to Backend
        // ===================================
        const settingsResponse = await fetch(`${API_BASE_URL}/api/user/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(settingsData)
        });
        
        const settingsResult = await settingsResponse.json();
        
        if (!settingsResult.success) {
            throw new Error(settingsResult.msg || 'Failed to save settings');
        }
        
        // ===================================
        // Update Profile (Name) if changed
        // ===================================
        if (displayName) {
            const profileResponse = await fetch(`${API_BASE_URL}/api/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ name: displayName })
            });
            
            const profileResult = await profileResponse.json();
            console.log('📝 Profile update:', profileResult);
        }
        
        console.log('✅ Settings saved successfully');
        
        // ===================================
        // Save to localStorage for instant sync
        // ===================================
        localStorage.setItem('userSettings', JSON.stringify(settingsData));
        
        // ===================================
        // Apply settings immediately
        // ===================================
        applySettingsToPage(settingsData);
        
        // ===================================
        // Notify other tabs
        // ===================================
        window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settingsData }));
        
        // ===================================
        // Show success message
        // ===================================
        showSuccessMessage('✓ Settings saved successfully!');
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showSuccessMessage('⚠️ Failed to save settings: ' + error.message, true);
    }
}


// ===================================
// Apply Settings to Current Page
// ===================================
function applySettingsToPage(settings) {
    // Apply theme (color scheme)
    applyTheme(settings.theme);
    
    // Apply language
    applyLanguage(settings.language);
    
    // Apply font size
    applyFontSize(settings.font_size);
    
    console.log('✅ Settings applied to page');
}


function applyTheme(theme) {
    const html = document.documentElement;
    const body = document.body;
    
    if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
    } else {
        html.setAttribute('data-theme', 'light');
        body.classList.add('light-mode');
        body.classList.remove('dark-mode');
    }
}


function applyLanguage(language) {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
}


function applyFontSize(fontSize) {
    const html = document.documentElement;
    
    const fontSizeMap = {
        'small': '14px',
        'medium': '16px',
        'large': '18px',
        'xlarge': '20px'
    };
    
    html.style.fontSize = fontSizeMap[fontSize] || '16px';
}


// ===================================
// Show Success Message
// ===================================
function showSuccessMessage(message, isError = false) {
    const successMessage = document.getElementById('successMessage');
    
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.style.background = isError ? '#ef4444' : '#10b981';
        successMessage.style.display = 'block';
        
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    } else {
        alert(message);
    }
}


// ===================================
// Reset Settings to Default
// ===================================
async function resetSettings() {
    if (!confirm('⚠️ Are you sure you want to reset all settings to default?')) {
        return;
    }
    
    try {
        const defaultSettings = {
            theme: 'light',
            language: 'en',
            font_size: 'medium',
            pomodoro_duration: 25,
            short_break: 5,
            long_break: 15,
            sound_enabled: true,
            notifications_enabled: true
        };
        
        const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(defaultSettings)
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('userSettings', JSON.stringify(defaultSettings));
            showSuccessMessage('✓ Settings reset to default');
            
            // Reload page to show default values
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            throw new Error(data.msg);
        }
        
    } catch (error) {
        console.error('❌ Error resetting settings:', error);
        showSuccessMessage('⚠️ Failed to reset settings', true);
    }
}


// ===================================
// Initialize on Page Load
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing settings page...');
    
    // Load user profile and settings
    loadUserProfile();
    
    // Setup save button
    const saveBtn = document.querySelector('.save-btn');
    if (saveBtn) {
        // Remove onclick from HTML if exists
        saveBtn.onclick = null;
        saveBtn.addEventListener('click', saveSettings);
    }
    
    // Setup reset button
    const resetBtn = document.querySelector('.action-btn:not(.danger)');
    if (resetBtn && resetBtn.textContent.includes('Reset')) {
        resetBtn.onclick = resetSettings;
    }
    
    console.log(' Settings page initialized');
});