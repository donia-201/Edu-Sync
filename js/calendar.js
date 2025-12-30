const calendarGrid = document.getElementById('calendarGrid');
const weekdaysDiv = document.getElementById('weekdays');
const modal = document.getElementById('eventModal');
const closeModalBtn = document.getElementById('closeModal');
const saveEventBtn = document.getElementById('saveEventBtn');
const monthYearText = document.getElementById('monthYearText');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');

let currentDate = new Date();
let selectedDate = null;
let scheduledReminders = new Map(); // Store scheduled reminders
let allEvents = []; // Store all loaded events

const authToken = localStorage.getItem('session_token') || localStorage.getItem('authToken');
const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';

const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isMobile() {
    return window.innerWidth <= 768;
}

function initializeSelectors() {
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year <= currentYear + 10; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

function renderWeekdays() {
    weekdaysDiv.innerHTML = '';
    
    weekdays.forEach(day => {
        const div = document.createElement('div');
        div.className = 'calendar-weekday';
        div.textContent = isMobile() ? day.substring(0, 3) : day;
        weekdaysDiv.appendChild(div);
    });
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYearText.textContent = `${months[month]} ${year}`;
    calendarGrid.innerHTML = '';
    renderWeekdays();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const today = new Date();

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.classList.add('calendar-day', 'other-month');
        day.textContent = daysInPrevMonth - i;
        calendarGrid.appendChild(day);
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.classList.add('calendar-day');
        day.textContent = i;

        if (
            today.getDate() === i &&
            today.getMonth() === month &&
            today.getFullYear() === year
        ) {
            day.classList.add('today');
        }

        day.addEventListener('click', (e) => openModal(year, month, i, e));
        calendarGrid.appendChild(day);
    }

    // Next month days
    const totalDays = firstDay + daysInMonth;
    const remainingDays = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
    
    for (let i = 1; i <= remainingDays; i++) {
        const day = document.createElement('div');
        day.classList.add('calendar-day', 'other-month');
        day.textContent = i;
        calendarGrid.appendChild(day);
    }
}

function openModal(year, month, day, e) {
    selectedDate = new Date(year, month, day);

    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    e.target.classList.add('selected');

    selectedDateDisplay.textContent = `Selected day: ${day} ${months[month]} ${year}`;

    // Default times: 9 AM to 10 AM
    const startDateTime = new Date(year, month, day, 9, 0);
    const endDateTime = new Date(year, month, day, 10, 0);

    document.getElementById('eventTitle').value = '';
    document.getElementById('eventStart').value = formatDateTimeLocalInput(startDateTime);
    document.getElementById('eventEnd').value = formatDateTimeLocalInput(endDateTime);
    document.getElementById('eventDesc').value = '';
    document.getElementById('eventReminder').value = '';

    modal.classList.add('active');
}

function formatDateTimeLocalInput(date) {
    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    return date.toISOString().slice(0, 16);
}

function formatISO(dateStr) {
    return new Date(dateStr).toISOString(); // Full ISO for backend
}

closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('active');
});

// ===== VALIDATION FUNCTIONS =====
function validateEventTimes(startStr, endStr) {
    const now = new Date();
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (start < now) {
        return { valid: false, message: ' Start time cannot be in the past!' };
    }

    if (end <= start) {
        return { valid: false, message: ' End time must be after start time (at least 1 minute)!' };
    }

    return { valid: true };
}

// ===== SCHEDULE REMINDER NOTIFICATION =====
function scheduleReminderNotification(eventData, remindAt) {
    const reminderTime = new Date(remindAt);
    const now = new Date();
    const timeUntilReminder = reminderTime - now;

    if (timeUntilReminder <= 0) {
        console.log(' Reminder time is in the past, skipping notification');
        return null;
    }

    console.log(` Scheduling reminder in ${Math.floor(timeUntilReminder / 1000)} seconds`);

    const timeoutId = setTimeout(() => {
        showReminderNotification(eventData);
        saveReminderNotification(eventData);
        scheduledReminders.delete(eventData.id);
        console.log(' Reminder notification sent for:', eventData.title);
    }, timeUntilReminder);

    return timeoutId;
}

function showReminderNotification(eventData) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(' Event Reminder', {
            body: `Upcoming: ${eventData.title}\nStarts at: ${new Date(eventData.start).toLocaleString()}`,
            icon: '../imgs/education.png',
            badge: '../imgs/education.png',
            tag: `event-reminder-${eventData.id}`,
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        playNotificationSound();
    }
}

function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 300);
    } catch(e) {
        console.log('Audio not supported');
    }
}

function saveReminderNotification(eventData) {
    try {
        const NOTIFICATIONS_KEY = "pomodoro_notifications";
        let notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
        
        const notification = {
            id: Date.now(),
            source: 'calendar',
            type: 'event',
            message: {
                ar: `تذكير: ${eventData.title}`,
                en: `Reminder: ${eventData.title}`
            },
            eventData: {
                title: eventData.title,
                start: eventData.start,
                end: eventData.end,
                description: eventData.description
            },
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
        };
        
        notifications.unshift(notification);
        if (notifications.length > 100) notifications = notifications.slice(0, 100);
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
        console.log(' Reminder notification saved to localStorage');
    } catch (e) {
        console.error('Error saving reminder notification:', e);
    }
}

// ===== SAVE EVENT =====
saveEventBtn.addEventListener('click', async () => {
    const title = document.getElementById('eventTitle').value.trim();
    const start = document.getElementById('eventStart').value;
    const end = document.getElementById('eventEnd').value;
    const desc = document.getElementById('eventDesc').value.trim();
    const reminder = document.getElementById('eventReminder').value;

    if (!title || !start || !end) {
        alert(' Please fill required fields (Title, Start, End)');
        return;
    }

    const validation = validateEventTimes(start, end);
    if (!validation.valid) {
        alert(validation.message);
        return;
    }

    if (reminder && isNaN(reminder)) {
        alert(' Reminder must be a number of minutes');
        return;
    }

    let remindAt = null;
    if (reminder) {
        const startTime = new Date(start);
        remindAt = new Date(startTime.getTime() - parseInt(reminder) * 60000);
        if (remindAt < new Date()) {
            alert(' Reminder time is in the past. Event will be created without notification.');
            remindAt = null;
        }
    }

    const eventData = {
        title,
        start: formatISO(start),
        end: formatISO(end),
        description: desc || '',
        reminder: reminder ? { minutesBefore: parseInt(reminder) } : null,
        remindAt: remindAt ? remindAt.toISOString() : null
    };

    try {
        console.log(' Saving event:', eventData);
        const response = await fetch(`${API_BASE_URL}/api/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(eventData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            modal.classList.remove('active');
            alert(' Event saved successfully!');
            
            // Schedule reminder notification
            if (remindAt) {
                const eventId = data.event?.id || Date.now();
                eventData.id = eventId;
                const timeoutId = scheduleReminderNotification(eventData, remindAt);
                if (timeoutId) scheduledReminders.set(eventId, timeoutId);
            }

            // Reload events from server
            await loadEventsAndScheduleReminders();
            renderCalendar();
        } else {
            alert(' ' + (data.msg || 'Failed to save event'));
        }
    } catch (err) {
        console.error(' Error saving event:', err);
        alert(' Server connection error. Please try again.');
    }
});

// ===== LOAD EVENTS AND SCHEDULE REMINDERS =====
async function loadEventsAndScheduleReminders() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/events`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            allEvents = data.events || [];
            
            const now = new Date();
            scheduledReminders.forEach(timeoutId => clearTimeout(timeoutId));
            scheduledReminders.clear();

            allEvents.forEach(event => {
                if (event.remindAt) {
                    const remindAt = new Date(event.remindAt);
                    if (remindAt > now) {
                        const timeoutId = scheduleReminderNotification(event, event.remindAt);
                        if (timeoutId) scheduledReminders.set(event.id, timeoutId);
                    }
                }
            });
            console.log(` Loaded ${allEvents.length} events, scheduled ${scheduledReminders.size} reminders`);
        }
    } catch (err) {
        console.error(' Error loading events:', err);
    }
}

// ===== NAVIGATION =====
prevMonthBtn.addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    renderCalendar();
});

window.addEventListener('resize', renderCalendar);

// ===== REQUEST NOTIFICATION PERMISSION =====
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications.');
        return;
    }
    if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log(' Notification permission:', permission);
    }
}

// ===== INITIALIZE =====
async function initialize() {
    initializeSelectors();
    renderCalendar();
    await requestNotificationPermission();
    await loadEventsAndScheduleReminders();
}

initialize();

// ===== CHECK REMINDERS PERIODICALLY =====
setInterval(() => {
    loadEventsAndScheduleReminders();
}, 60000);

// ===== CLEANUP ON PAGE UNLOAD =====
window.addEventListener('beforeunload', () => {
    scheduledReminders.forEach(timeoutId => clearTimeout(timeoutId));
    scheduledReminders.clear();
});
