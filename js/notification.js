const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';
const POMODORO_NOTIFICATIONS_KEY = "pomodoro_notifications";
const LAST_NOTIFICATION_CHECK = "last_notification_check";

const notificationsList = document.getElementById('notificationsList');
const emptyState = document.getElementById('emptyState');
const clearAllBtn = document.getElementById('clearAllBtn');

let allNotifications = [];

// ===== Request Notification Permission =====
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("Browser doesn't support notifications");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
}

// ===== Show Browser Notification =====
function showBrowserNotification(title, body, icon = '🔔', tag = 'eduSync') {
    if (Notification.permission === "granted") {
        try {
            const notification = new Notification(title, {
                body: body,
                icon: icon === '🎉' ? '../imgs/200w.webp' : icon === '☕' ? '../imgs/200w-1.webp' : '../imgs/education.png',
                badge: '../imgs/education.png',
                tag: tag,
                requireInteraction: false,
                silent: false,
                vibrate: [200, 100, 200],
                timestamp: Date.now()
            });

            // Play sound
            playNotificationSound();

            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);

            // Click handler
            notification.onclick = function(event) {
                event.preventDefault();
                window.focus();
                notification.close();
                // Open notifications page
                if (!window.location.href.includes('notifications.html')) {
                    window.location.href = '../pages/notifications.html';
                }
            };

            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }
}

// ===== Play Notification Sound =====
function playNotificationSound() {
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

// ===== Fetch Backend Notifications =====
async function fetchBackendNotifications() {
    const token = localStorage.getItem('session_token') || localStorage.getItem('authToken');
    if (!token) return [];

    try {
        const res = await fetch(`${API_BASE_URL}/api/notifications`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!data.success) return [];

        return data.notifications.map(n => ({
            id: `backend_${n.id}`,
            source: 'backend',
            title: n.title,
            message: n.message,
            type: 'event',
            is_read: n.is_read,
            timestamp: n.created_at,
            date: new Date(n.created_at).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            backendId: n.id
        }));
    } catch (error) {
        console.error('Error fetching backend notifications:', error);
        return [];
    }
}

// ===== Fetch Pomodoro Notifications =====
function fetchPomodoroNotifications() {
    try {
        const notifications = JSON.parse(localStorage.getItem(POMODORO_NOTIFICATIONS_KEY) || '[]');
        return notifications.map(n => ({
            ...n,
            source: 'pomodoro'
        }));
    } catch (e) {
        return [];
    }
}

// ===== Check for New Notifications =====
async function checkForNewNotifications() {
    const lastCheck = localStorage.getItem(LAST_NOTIFICATION_CHECK);
    const lastCheckTime = lastCheck ? new Date(lastCheck) : new Date(0);
    const pomodoroNotifs = fetchPomodoroNotifications();
    const newPomodoroNotifs = pomodoroNotifs.filter(n => 
        new Date(n.timestamp) > lastCheckTime
    );

    // Show browser notifications for new Pomodoro notifications
    newPomodoroNotifs.forEach(notif => {
        if (notif.type === 'focus') {
            showBrowserNotification(
                '🎉 Focus Session Complete!',
                notif.message.en,
                '🎉',
                `pomodoro-${notif.id}`
            );
        } else if (notif.type === 'break') {
            showBrowserNotification(
                '☕ Break Time!',
                notif.message.en,
                '☕',
                `pomodoro-${notif.id}`
            );
        } else if (notif.type === 'event') {
            showBrowserNotification(
                '📅 Calendar Event',
                notif.message.en,
                '📅',
                `calendar-${notif.id}`
            );
        }
    });

    // Check Backend notifications
    const backendNotifs = await fetchBackendNotifications();
    const newBackendNotifs = backendNotifs.filter(n => 
        !n.is_read && new Date(n.timestamp) > lastCheckTime
    );

    // Show browser notifications for new backend notifications
    newBackendNotifs.forEach(notif => {
        showBrowserNotification(
            notif.title,
            notif.message,
            '📅',
            `backend-${notif.id}`
        );
    });

    localStorage.setItem(LAST_NOTIFICATION_CHECK, new Date().toISOString());
}

// ===== Load All Notifications =====
async function loadAllNotifications() {
    try {
        const backendNotifs = await fetchBackendNotifications();
        const pomodoroNotifs = fetchPomodoroNotifications();

        allNotifications = [...backendNotifs, ...pomodoroNotifs];
        allNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        renderNotifications();
        
        await checkForNewNotifications();
    } catch (e) {
        console.error('Error loading notifications:', e);
    }
}

// ===== Render Notifications =====
function renderNotifications() {
    if (allNotifications.length === 0) {
        notificationsList.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        clearAllBtn.style.display = 'none';
        return;
    }

    notificationsList.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    clearAllBtn.style.display = 'block';

    notificationsList.innerHTML = allNotifications.map(notif => {
        if (notif.source === 'pomodoro') {
            // Pomodoro notification card
            const iconMap = {
                focus: '🎉',
                break: '☕',
                event: '📅'
            };
            const typeMap = {
                focus: '🎯 Focus Session',
                break: '☕ Break Time',
                event: '📅 Calendar Event'
            };
            
            return `
                <div class="notification-card ${notif.type}-type" data-id="${notif.id}">
                    <div class="notification-header">
                        <div class="notification-icon">
                            ${iconMap[notif.type] || '🔔'}
                        </div>
                        <div class="notification-time">
                            <i class="far fa-clock"></i> ${notif.date}
                        </div>
                    </div>
                    <div class="notification-content">
                        <div class="notification-message-ar">${notif.message.ar}</div>
                        <div class="notification-message-en">${notif.message.en}</div>
                        <span class="notification-type-badge">
                            ${typeMap[notif.type] || '🔔 Notification'}
                        </span>
                    </div>
                </div>
            `;
        } else {
            // Backend notification card
            return `
                <div class="notification-card event-type ${notif.is_read ? 'read' : 'unread'}" 
                    data-id="${notif.id}" 
                    data-backend-id="${notif.backendId}">
                    <div class="notification-header">
                        <div class="notification-icon">📅</div>
                        <div class="notification-time">
                            <i class="far fa-clock"></i> ${notif.date}
                        </div>
                    </div>
                    <div class="notification-content">
                        <h4 class="notification-title">${notif.title}</h4>
                        <p class="notification-message">${notif.message}</p>
                        <span class="notification-type-badge">
                            📅 Calendar Event
                        </span>
                    </div>
                    ${!notif.is_read ? '<span class="unread-badge">New</span>' : ''}
                </div>
            `;
        }
    }).join('');

    // Add click handlers for backend notifications
    document.querySelectorAll('.notification-card[data-backend-id]').forEach(card => {
        card.addEventListener('click', async () => {
            const backendId = card.dataset.backendId;
            if (backendId && !card.classList.contains('read')) {
                await markAsRead(backendId);
                card.classList.add('read');
                card.classList.remove('unread');
                const badge = card.querySelector('.unread-badge');
                if (badge) badge.remove();
            }
        });
    });

    // Animate cards
    document.querySelectorAll('.notification-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// ===== Mark Backend Notification as Read =====
async function markAsRead(backendId) {
    const token = localStorage.getItem('session_token') || localStorage.getItem('authToken');
    if (!token) return;

    try {
        await fetch(`${API_BASE_URL}/api/notifications/${backendId}/read`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
    } catch (error) {
        console.error('Error marking as read:', error);
    }
}

// ===== Clear All Notifications =====
clearAllBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all notifications?')) {
        localStorage.removeItem(POMODORO_NOTIFICATIONS_KEY);
        
        const token = localStorage.getItem('session_token') || localStorage.getItem('authToken');
        if (token) {
            try {
                const backendNotifs = allNotifications.filter(n => n.source === 'backend');
                for (const notif of backendNotifs) {
                    await markAsRead(notif.backendId);
                }
            } catch (e) {
                console.log('Could not clear backend notifications');
            }
        }
        
        await loadAllNotifications();
    }
});

// ===== Initialize on Page Load =====
async function initialize() {
    const hasPermission = await requestNotificationPermission();
    
    if (!hasPermission) {
        console.log('Notification permission not granted');
        const permissionBanner = document.createElement('div');
        permissionBanner.className = 'notification-card';
        permissionBanner.style.background = 'linear-gradient(135deg, #ffd93d, #f6a400)';
        permissionBanner.innerHTML = `
            <div class="notification-content" style="text-align: center;">
                <h4>🔔 Enable Notifications</h4>
                <p>Enable browser notifications to receive alerts even when you're away!</p>
                <button onclick="location.reload()" style="background: white; color: #f6a400; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; margin-top: 10px;">
                    Enable Now
                </button>
            </div>
        `;
        if (notificationsList) {
            notificationsList.insertBefore(permissionBanner, notificationsList.firstChild);
        }
    }
    
    await loadAllNotifications();
}

// ===== Auto-refresh every 10 seconds =====
setInterval(async () => {
    if (!document.hidden) {
        await loadAllNotifications();
    }
}, 10000);

document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        await loadAllNotifications();
    }
});

// ===== Initialize =====
initialize();

// ===== Export function for other pages to trigger notifications =====
window.EduSyncNotifications = {
    show: showBrowserNotification,
    requestPermission: requestNotificationPermission,
    check: checkForNewNotifications
};

// دالة لطلب إذن الإشعارات
function requestNotificationPermission() {
    const settings = loadUserSettings();
    
    if (settings && settings.desktopNotifications && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

// إرسال إشعار
function sendNotification(title, message) {
    const settings = loadUserSettings();
    
    if (settings && settings.desktopNotifications && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '../imgs/brainstorm-ezgif.com-gif-to-webp-converter.webp' 
        });
    }
}

// مثال: إشعار عند انتهاء البومودورو
function onPomodoroComplete() {
    sendNotification('Pomodoro Completed!', 'Great work! Time for a break.');
}

