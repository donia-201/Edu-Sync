// ===== Unified Notifications System =====
const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';
const POMODORO_NOTIFICATIONS_KEY = "pomodoro_notifications";

const notificationsList = document.getElementById('notificationsList');
const emptyState = document.getElementById('emptyState');
const clearAllBtn = document.getElementById('clearAllBtn');
const container = document.getElementById("notificationsContainer");

let allNotifications = [];

// ===== Fetch Backend Notifications (Calendar/Events) =====
async function fetchBackendNotifications() {
    const token = localStorage.getItem('session_token');
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

// ===== Fetch Pomodoro Notifications (LocalStorage) =====
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

// ===== Load All Notifications =====
async function loadAllNotifications() {
    try {
        // Fetch from both sources
        const backendNotifs = await fetchBackendNotifications();
        const pomodoroNotifs = fetchPomodoroNotifications();

        // Merge and sort by timestamp
        allNotifications = [...backendNotifs, ...pomodoroNotifs];
        allNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        renderNotifications();
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
            return `
                <div class="notification-card ${notif.type}-type" data-id="${notif.id}">
                    <div class="notification-header">
                        <div class="notification-icon">
                            ${notif.type === 'focus' ? '🎉' : '☕'}
                        </div>
                        <div class="notification-time">
                            <i class="far fa-clock"></i> ${notif.date}
                        </div>
                    </div>
                    <div class="notification-content">
                        <div class="notification-message-ar">${notif.message.ar}</div>
                        <div class="notification-message-en">${notif.message.en}</div>
                        <span class="notification-type-badge">
                            ${notif.type === 'focus' ? '🎯 Focus Session' : '☕ Break Time'}
                        </span>
                    </div>
                </div>
            `;
        } else {
            // Backend (Calendar/Events) notification card
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
    const token = localStorage.getItem('session_token');
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
        // Clear localStorage
        localStorage.removeItem(POMODORO_NOTIFICATIONS_KEY);
        
        // Optionally clear backend notifications
        const token = localStorage.getItem('session_token');
        if (token) {
            try {
                // Mark all as read or delete - adjust based on your backend
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

// ===== Initial Load =====
loadAllNotifications();

// ===== Auto-refresh every 10 seconds =====
setInterval(() => {
    if (!document.hidden) {
        loadAllNotifications();
    }
}, 10000);