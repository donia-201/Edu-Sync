        const NOTIFICATIONS_KEY = "pomodoro_notifications";
        const notificationsList = document.getElementById('notificationsList');
        const emptyState = document.getElementById('emptyState');
        const clearAllBtn = document.getElementById('clearAllBtn');


        const container = document.getElementById("notificationsContainer");
const authToken = localStorage.getItem("authToken");

async function fetchNotifications() {
  const res = await fetch(
    "https://edu-sync-back-end-production.up.railway.app/api/notifications",
    {
      headers: {
        "Authorization": `Bearer ${authToken}`
      }
    }
  );

  const data = await res.json();

  if (!data.success) return;

  container.innerHTML = "";

  data.notifications.forEach(n => {
    const div = document.createElement("div");
    div.className = `notification ${n.is_read ? "read" : "unread"}`;

    div.innerHTML = `
      <h4>${n.title}</h4>
      <p>${n.message}</p>
      <small>${new Date(n.created_at).toLocaleString()}</small>
    `;

    div.addEventListener("click", () => markAsRead(n.id));
    container.appendChild(div);
  });
}

async function markAsRead(id) {
await fetch(
    `https://edu-sync-back-end-production.up.railway.app/api/notifications/${id}/read`,
    {
    method: "PUT",
    headers: {
        "Authorization": `Bearer ${authToken}`
    }
    }
    );
    fetchNotifications();
}

fetchNotifications();

        function loadNotifications() {
            try {
                const notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
                
                if (notifications.length === 0) {
                    notificationsList.style.display = 'none';
                    emptyState.style.display = 'block';
                    clearAllBtn.style.display = 'none';
                    return;
                }

                notificationsList.style.display = 'block';
                emptyState.style.display = 'none';
                clearAllBtn.style.display = 'block';

                notificationsList.innerHTML = notifications.map(notif => `
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
                `).join('');

                // Animation for cards
                document.querySelectorAll('.notification-card').forEach((card, index) => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        card.style.transition = 'all 0.4s ease';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, index * 100);
                });

            } catch (e) {
                console.error('Error loading notifications:', e);
            }
        }

        // Clear all notifications
        clearAllBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all notifications?')) {
                localStorage.removeItem(NOTIFICATIONS_KEY);
                loadNotifications();
            }
        });

        // Load on page load
        loadNotifications();

        // Refresh every 5 seconds if page is visible
        setInterval(() => {
            if (!document.hidden) {
                loadNotifications();
            }
        }, 5000);
