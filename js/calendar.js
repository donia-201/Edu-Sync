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
        const token = localStorage.getItem('token') || 'demo-token';

        const months = [
            'january', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sutuarday'];

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

        function toggleMonthYearSelector() {
            monthYearSelector.classList.toggle('active');
            monthSelect.value = currentDate.getMonth();
            yearSelect.value = currentDate.getFullYear();
        }

        function applyMonthYear() {
            currentDate = new Date(yearSelect.value, monthSelect.value, 1);
            renderCalendar();
            monthYearSelector.classList.remove('active');
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

            const daysToShow = isMobile() ? 5 : 7;
            const today = new Date();

            for (let i = firstDay - 1; i >= 0; i--) {
                if (!isMobile() || (isMobile() && firstDay - i <= daysToShow)) {
                    const day = document.createElement('div');
                    day.classList.add('calendar-day', 'other-month');
                    day.textContent = daysInPrevMonth - i;
                    calendarGrid.appendChild(day);
                }
            }

            for (let i = 1; i <= daysInMonth; i++) {
                const dayOfWeek = new Date(year, month, i).getDay();
                
                if (!isMobile() || (isMobile() && dayOfWeek < 5)) {
                    const day = document.createElement('div');
                    day.classList.add('calendar-day');
                    day.textContent = i;
                    
                    if (today.getDate() === i && 
                        today.getMonth() === month && 
                        today.getFullYear() === year) {
                        day.classList.add('today');
                    }

                    day.addEventListener('click', () => openModal(year, month, i));
                    calendarGrid.appendChild(day);
                }
            }
        }

        function openModal(year, month, day) {
            selectedDate = new Date(year, month, day);
            
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            event.target.classList.add('selected');
            
            selectedDateDisplay.textContent = `selected day: ${day} ${months[month]} ${year}`;
            
            const startDateTime = new Date(year, month, day, 9, 0);
            const endDateTime = new Date(year, month, day, 10, 0);
            
            document.getElementById('eventStart').value = formatDateTimeLocal(startDateTime);
            document.getElementById('eventEnd').value = formatDateTimeLocal(endDateTime);
            
            modal.classList.add('active');
        }

        function formatDateTimeLocal(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        closeModalBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            clearForm();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                clearForm();
            }
        });

        function clearForm() {
            document.getElementById('eventTitle').value = '';
            document.getElementById('eventDesc').value = '';
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
        }

        saveEventBtn.addEventListener('click', async () => {
            const title = document.getElementById('eventTitle').value.trim();
            const start = document.getElementById('eventStart').value;
            const end = document.getElementById('eventEnd').value;
            const desc = document.getElementById('eventDesc').value.trim();

            if (!title || !start || !end) {
                alert(' Please Fill All required  Fieldes (*)');
                return;
            }

            if (new Date(start) >= new Date(end)) {
                alert(' End Time shoud be After Start Time ');
                return;
            }

            const eventData = {
                title,
                start,
                end,
                type: 'focus',
                description: desc || ''
            };

            console.log('Sending event data:', eventData);
            console.log('Using token:', token);

            try {
                const response = await fetch('https://edu-sync-back-end-production.up.railway.app/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(eventData)
                });

                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);

                if (response.ok && data.success) {
                    alert(' event has Saved successfully ! ✓ ');
                    
                    let tempEvents = JSON.parse(localStorage.getItem('newEvents') || '[]');
                    tempEvents.push({
                        id: data.event_id,
                        ...eventData
                    });
                    localStorage.setItem('newEvents', JSON.stringify(tempEvents));
                    
                    console.log('Events saved to localStorage:', tempEvents);
                    
                    modal.classList.remove('active');
                    clearForm();
                } else {
                    alert('Failed to Saved Event ' + (data.msg || data.message || 'خطأ غير معروف'));
                }
            } catch (err) {
                console.error('Error:', err);
                alert(' Error in connecting with server , check connection to Wi Fi');
            }
        });

        prevMonthBtn.addEventListener('click', () => {
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            renderCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
            renderCalendar();
        });

        window.addEventListener('resize', renderCalendar);

        initializeSelectors();
        renderCalendar();

        console.log('Calendar initialized. Token:', token ? 'Present' : 'Missing');
