const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';
const authToken = localStorage.getItem('session_token') || localStorage.getItem('authToken');

// ===================================
// Load User Profile & Settings on Page Load
// ===================================
async function loadUserSettings() {
    try {
        console.log('📥 Loading user settings...');
        
        if (!authToken) {
            alert('Please login first!');
            window.location.href = '../index.html';
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to load profile');
        const data = await response.json();
        
        if (data.success) {
            const user = data.user;
            const settings = user.settings;

            window.userSettings = settings; // تخزين عالمي
            
            console.log('✅ Profile & settings loaded:', user);

            // Account
            document.getElementById('displayName').value = user.name || '';
            document.getElementById('email').value = user.email || '';

            // Appearance
            const themeMap = { 'light':'blue', 'dark':'purple', 'auto':'blue' };
            document.getElementById('theme').value = themeMap[settings.theme] || 'blue';
            document.getElementById('language').value = settings.language || 'en';
            const fontSizeMap = { 'small':'small','medium':'medium','large':'large','xlarge':'extra-large' };
            document.getElementById('fontSize').value = fontSizeMap[settings.font_size] || 'medium';

            // Study
            document.getElementById('pomodoroDuration').value = settings.pomodoro_duration || 25;
            document.getElementById('breakDuration').value = settings.short_break || 5;
            document.getElementById('longBreakDuration').value = settings.long_break || 15;

            // Notifications
            document.getElementById('soundEffects').checked = settings.sound_enabled !== false;
            document.getElementById('desktopNotifications').checked = settings.notifications_enabled !== false;

            applySettingsToPage(settings);
            console.log('✅ Settings applied to page');
        }
    } catch (error) {
        console.error('❌ Error loading settings:', error);
        showSuccessMessage('⚠️ Failed to load settings', true);
    }
}

// ===================================
// Save Settings to Backend
// ===================================
async function saveUserSettings() {
    try {
        console.log('💾 Saving user settings...');
        if (!authToken) { alert('Please login first!'); return; }

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

        const themeBackendMap = { 'blue':'light','purple':'dark','green':'light','pink':'light','sunset':'light','ocean':'dark' };
        const fontSizeBackendMap = { 'small':'small','medium':'medium','large':'large','xlarge':'xlarge','extra-large':'xlarge' };

        const userSettingsData = {
            theme: themeBackendMap[theme] || 'light',
            language: language,
            font_size: fontSizeBackendMap[fontSize] || 'medium',
            pomodoro_duration: pomodoroDuration,
            short_break: breakDuration,
            long_break: longBreakDuration,
            sound_enabled: soundEffects,
            notifications_enabled: desktopNotifications
        };

        console.log('📤 Settings to save:', userSettingsData);

        const settingsResponse = await fetch(`${API_BASE_URL}/api/user/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(userSettingsData)
        });
        const settingsResult = await settingsResponse.json();
        if (!settingsResult.success) throw new Error(settingsResult.msg || 'Failed to save settings');

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

        localStorage.setItem('userSettings', JSON.stringify(userSettingsData));
        window.userSettings = userSettingsData;

        applySettingsToPage(userSettingsData);
        window.dispatchEvent(new CustomEvent('settingsChanged', { detail: userSettingsData }));
        showSuccessMessage('✓ Settings saved successfully!');
        console.log('✅ Settings saved and applied');
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showSuccessMessage('⚠️ Failed to save settings: ' + error.message, true);
    }
}

// ===================================
// Apply Settings to Page
// ===================================
function applySettingsToPage(userSettings) {
    applyTheme(userSettings.theme);
    applyLanguage(userSettings.language);
    applyFontSize(userSettings.font_size);
}

// ===================================
// Reset to Default
// ===================================
async function resetUserSettings() {
    if (!confirm('⚠️ Are you sure you want to reset all settings to default?')) return;

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
            window.userSettings = defaultSettings;
            showSuccessMessage('✓ Settings reset to default');
            setTimeout(() => window.location.reload(), 1500);
        } else throw new Error(data.msg);
    } catch (error) {
        console.error('❌ Error resetting settings:', error);
        showSuccessMessage('Failed to reset settings', true);
    }
}

// ===================================
// Initialize
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing settings page...');
    loadUserSettings();

    const saveBtn = document.querySelector('.save-btn');
    if (saveBtn) { saveBtn.onclick = null; saveBtn.addEventListener('click', saveUserSettings); }

    const resetBtn = document.querySelector('.action-btn:not(.danger)');
    if (resetBtn && resetBtn.textContent.includes('Reset')) { resetBtn.onclick = resetUserSettings; }

    console.log('✅ Settings page initialized');
});

// ===================================
// Listen for Changes Across Tabs
// ===================================
window.addEventListener('settingsChanged', (e) => applySettingsToPage(e.detail));
window.addEventListener('storage', (e) => {
    if (e.key === 'userSettings' && e.newValue) applySettingsToPage(JSON.parse(e.newValue));
    if (e.key === 'themeChanged') window.location.reload();
});
