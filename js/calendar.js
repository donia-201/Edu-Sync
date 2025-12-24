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
const monthYearSelector = document.getElementById('monthYearSelector');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');

let currentDate = new Date();
let selectedDate = null;

const authToken = localStorage.getItem('authToken');

const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const weekdays = [
    'Sun', 'Mon', 'Tue',
    'Wednes', 'Thurs', 'Fri', 'Sat'
];

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
    const daysToShow = isMobile() ? 5 : 7;

    for (let i = 0; i < daysToShow; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-weekday';
        div.textContent = weekdays[i];
        weekdaysDiv.appendChild(div);
    }
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

    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.classList.add('calendar-day', 'other-month');
        day.textContent = daysInPrevMonth - i;
        calendarGrid.appendChild(day);
    }

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

        day.addEventListener('click', (e) =>
            openModal(year, month, i, e)
        );

        calendarGrid.appendChild(day);
    }
}

function openModal(year, month, day, e) {
    selectedDate = new Date(year, month, day);

    document.querySelectorAll('.calendar-day')
        .forEach(d => d.classList.remove('selected'));

    e.target.classList.add('selected');

    selectedDateDisplay.textContent =
        `Selected day: ${day} ${months[month]} ${year}`;

    const startDateTime = new Date(year, month, day, 9, 0);
    const endDateTime = new Date(year, month, day, 10, 0);

    document.getElementById('eventStart').value =
        formatDateTimeLocal(startDateTime);

    document.getElementById('eventEnd').value =
        formatDateTimeLocal(endDateTime);

    document.getElementById('eventReminder').value = '';

    modal.classList.add('active');
}

function formatDateTimeLocal(date) {
    return date.toISOString().slice(0, 16);
}

closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    clearForm();
});

function clearForm() {
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDesc').value = '';
    document.getElementById('eventReminder').value = '';
}

saveEventBtn.addEventListener('click', async () => {
    const title = document.getElementById('eventTitle').value.trim();
    const start = document.getElementById('eventStart').value;
    const end = document.getElementById('eventEnd').value;
    const desc = document.getElementById('eventDesc').value.trim();
    const reminder = document.getElementById('eventReminder').value;

    if (!title || !start || !end) {
        alert('Please fill required fields');
        return;
    }

    const eventData = {
        title,
        start,
        end,
        type: 'focus',
        description: desc || '',
        reminder: reminder || null  
    };

    try {
        const response = await fetch(
            'https://edu-sync-back-end-production.up.railway.app/api/events',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(eventData)
            }
        );

        const data = await response.json();

        if (response.ok && data.success) {
            modal.classList.remove('active');
            clearForm();
            alert('Event saved successfully');
        } else {
            alert(data.msg || 'Failed to save event');
        }
    } catch (err) {
        alert('Server connection error');
    }
});

prevMonthBtn.addEventListener('click', () => {
    currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
    );
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
    );
    renderCalendar();
});

window.addEventListener('resize', renderCalendar);

initializeSelectors();
renderCalendar();
