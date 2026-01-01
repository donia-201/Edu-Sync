// ===== SETTINGS PAGE - Backend Integration =====

const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';

// ===== Save Settings to Backend and LocalStorage =====
async function saveSettings() {
    const settings = {
        // Account
        displayName: document.getElementById('displayName').value,
        email: document.getElementById('email').value,
        studyField: document.getElementById('studyField').value,
        academicLevel: document.getElementById('academicLevel').value,
        
        // Appearance
        theme: document.getElementById('theme').value,
        language: document.getElementById('language').value,
        fontSize: document.getElementById('fontSize').value,
        animations: document.getElementById('animations').checked,
        
        // Study Preferences
        pomodoroDuration: document.getElementById('pomodoroDuration').value,
        breakDuration: document.getElementById('breakDuration').value,
        longBreakDuration: document.getElementById('longBreakDuration').value,
        studyGoal: document.getElementById('studyGoal').value,
        autoStart: document.getElementById('autoStart').checked,
        
        // Notifications
        studyReminders: document.getElementById('studyReminders').checked,
        breakNotifications: document.getElementById('breakNotifications').checked,
        examReminders: document.getElementById('examReminders').checked,
        weeklyReport: document.getElementById('weeklyReport').checked,
        soundEffects: document.getElementById('soundEffects').checked,
        desktopNotifications: document.getElementById('desktopNotifications').checked,
        
        // Calendar Integration
        googleCalendar: document.getElementById('googleCalendar').checked,
        autoAddSessions: document.getElementById('autoAddSessions').checked,
        syncExams: document.getElementById('syncExams').checked,
        
        // Privacy
        analytics: document.getElementById('analytics').checked
    };

    try {
        // Save to localStorage first (fallback)
        localStorage.setItem('eduSyncSettings', JSON.stringify(settings));
        console.log('✅ Settings saved to localStorage');
        
        // Save to backend
        const token = localStorage.getItem('session_token') || localStorage.getItem('authToken');
        
        if (token) {
            const response = await fetch(`${API_BASE_URL}/api/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('✅ Settings saved to backend');
            } else {
                console.warn('⚠️ Backend save failed, using localStorage only');
            }
        }
        
        // Apply settings immediately
        applyTheme(settings.theme);
        applyFontSize(settings.fontSize);
        applyLanguage(settings.language);
        applyAnimations(settings.animations);
        
        // Show success message
        showSuccessMessage();
        
        // Request notification permission if enabled
        if (settings.desktopNotifications) {
            requestNotificationPermission();
        }
        
    } catch (error) {
        console.error(' Error saving settings:', error);
        alert(' Settings saved locally but could not sync with server');
    }
}

// ===== Load Settings from Backend and LocalStorage =====
async function loadSettings() {
    try {
        const token = localStorage.getItem('session_token') || localStorage.getItem('authToken');
        let settings = null;

        // Try to load from backend first
        if (token) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/settings`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (response.ok && data.success && data.settings) {
                    settings = data.settings;
                    // Save to localStorage as backup
                    localStorage.setItem('eduSyncSettings', JSON.stringify(settings));
                    console.log(' Settings loaded from backend');
                }
            } catch (e) {
                console.warn(' Could not load from backend, using localStorage');
            }
        }

        // Fallback to localStorage
        if (!settings) {
            const savedSettings = localStorage.getItem('eduSyncSettings');
            if (savedSettings) {
                settings = JSON.parse(savedSettings);
                console.log(' Settings loaded from localStorage');
            }
        }

        // Apply settings to form
        if (settings) {
            // Account
            if (settings.displayName) document.getElementById('displayName').value = settings.displayName;
            if (settings.email) document.getElementById('email').value = settings.email;
            if (settings.studyField) document.getElementById('studyField').value = settings.studyField;
            if (settings.academicLevel) document.getElementById('academicLevel').value = settings.academicLevel;
            
            // Appearance
            if (settings.theme) document.getElementById('theme').value = settings.theme;
            if (settings.language) document.getElementById('language').value = settings.language;
            if (settings.fontSize) document.getElementById('fontSize').value = settings.fontSize;
            document.getElementById('animations').checked = settings.animations !== false;
            
            // Study Preferences
            if (settings.pomodoroDuration) document.getElementById('pomodoroDuration').value = settings.pomodoroDuration;
            if (settings.breakDuration) document.getElementById('breakDuration').value = settings.breakDuration;
            if (settings.longBreakDuration) document.getElementById('longBreakDuration').value = settings.longBreakDuration;
            if (settings.studyGoal) document.getElementById('studyGoal').value = settings.studyGoal;
            document.getElementById('autoStart').checked = settings.autoStart || false;
            
            // Notifications
            document.getElementById('studyReminders').checked = settings.studyReminders !== false;
            document.getElementById('breakNotifications').checked = settings.breakNotifications !== false;
            document.getElementById('examReminders').checked = settings.examReminders !== false;
            document.getElementById('weeklyReport').checked = settings.weeklyReport !== false;
            document.getElementById('soundEffects').checked = settings.soundEffects !== false;
            document.getElementById('desktopNotifications').checked = settings.desktopNotifications || false;
            
            // Calendar Integration
            document.getElementById('googleCalendar').checked = settings.googleCalendar || false;
            document.getElementById('autoAddSessions').checked = settings.autoAddSessions || false;
            document.getElementById('syncExams').checked = settings.syncExams || false;
            
            // Privacy
            document.getElementById('analytics').checked = settings.analytics !== false;
            
            console.log(' Settings applied to form');
        }
        
    } catch (error) {
        console.error(' Error loading settings:', error);
    }
}

// ===== Reset All Settings =====
async function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to default? This cannot be undone.')) {
        return;
    }

    try {
        // Remove from localStorage
        localStorage.removeItem('eduSyncSettings');
        
        // Reset on backend
        const token = localStorage.getItem('session_token') || localStorage.getItem('authToken');
        
        if (token) {
            await fetch(`${API_BASE_URL}/api/settings/reset`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        
        // Reload page to show defaults
        window.location.reload();
        
    } catch (error) {
        console.error(' Error resetting settings:', error);
        localStorage.removeItem('eduSyncSettings');
        window.location.reload();
    }
}

// ===== Export Data =====
async function exportData() {
    try {
        const token = localStorage.getItem('session_token') || localStorage.getItem('authToken');
        
        if (!token) {
            alert(' Please login to export your data');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/export`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `edusync-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert(' Data exported successfully!');
        } else {
            alert(' Failed to export data');
        }
        
    } catch (error) {
        console.error(' Error exporting data:', error);
        alert(' Error exporting data');
    }
}

// ===== Delete Account =====
async function deleteAccount() {
    const confirmation = prompt(' WARNING: This will permanently delete your account and all data.\n\nType "DELETE" to confirm:');
    
    if (confirmation !== 'DELETE') {
        alert(' Account deletion cancelled');
        return;
    }

    try {
        const token = localStorage.getItem('session_token') || localStorage.getItem('authToken');
        
        if (!token) {
            alert(' Please login to delete your account');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/account/delete`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            // Clear all local data
            localStorage.clear();
            sessionStorage.clear();
            
            alert(' Account deleted successfully. You will now be redirected to the home page.');
            window.location.href = '../pages/index.html';
        } else {
            alert(' Failed to delete account');
        }
        
    } catch (error) {
        console.error(' Error deleting account:', error);
        alert(' Error deleting account');
    }
}

// ===== Show Success Message =====
function showSuccessMessage() {
    const message = document.getElementById('successMessage');
    if (message) {
        message.style.display = 'block';
        setTimeout(() => {
            message.style.display = 'none';
        }, 3000);
    }
}

// ===== Apply Theme Changes (Preview) =====
document.getElementById('theme')?.addEventListener('change', (e) => {
    applyTheme(e.target.value);
});

document.getElementById('fontSize')?.addEventListener('change', (e) => {
    applyFontSize(e.target.value);
});

document.getElementById('language')?.addEventListener('change', (e) => {
    applyLanguage(e.target.value);
});

document.getElementById('animations')?.addEventListener('change', (e) => {
    applyAnimations(e.target.checked);
});

// ===== Event Listeners for Action Buttons =====
document.addEventListener('DOMContentLoaded', () => {
    // Load settings on page load
    loadSettings();
    
    // Export data button
    const exportBtn = document.querySelector('.action-btn[onclick*="Export"]');
    if (exportBtn) {
        exportBtn.onclick = (e) => {
            e.preventDefault();
            exportData();
        };
    }
    
    // Delete account button
    const deleteBtn = document.querySelector('.action-btn.danger');
    if (deleteBtn) {
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            deleteAccount();
        };
    }
});

// ===== Auto-save on change (optional) =====
function enableAutoSave() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            console.log('💾 Auto-saving settings...');
            saveSettings();
        });
    });
}



