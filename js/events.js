        const eventsContainer = document.getElementById('eventsContainer');
        const syncStatus = document.getElementById('syncStatus');
        const token = localStorage.getItem('authToken');

        // دالة لعرض حالة المزامنة
        function updateSyncStatus(status, message) {
            syncStatus.className = `sync-status ${status}`;
            const icons = {
                syncing: 'fa-sync-alt fa-spin',
                synced: 'fa-check-circle',
                error: 'fa-exclamation-circle'
            };
            syncStatus.innerHTML = `<i class="fas ${icons[status]}"></i> ${message}`;
        }

        // دالة لجلب الأحداث من الباك
        async function fetchEvents() {
            try {
                updateSyncStatus('syncing', 'جاري المزامنة...');

                if (!authToken) {
                    throw new Error('لا يوجد توكن. يرجى تسجيل الدخول أولاً');
                }

                const response = await fetch('https://edu-sync-back-end-production.up.railway.app/api/events', {
                    headers: { 
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('API Response Status:', response.status);

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('غير مصرح. يرجى تسجيل الدخول مرة أخرى');
                    }
                    throw new Error(`خطأ في الخادم: ${response.status}`);
                }

                const data = await response.json();
                console.log('API Response Data:', data);

                let events = [];
                if (data.success && data.events) {
                    events = data.events;
                }

                // دمج الأحداث الجديدة من localStorage
                const newEvents = JSON.parse(localStorage.getItem('newEvents') || '[]');
                console.log('New Events from localStorage:', newEvents);

                if (newEvents.length > 0) {
                    // إضافة الأحداث الجديدة إلى القائمة
                    events = [...events, ...newEvents];
                    
                    // محاولة مزامنة الأحداث الجديدة مع الباك
                    await syncNewEventsToBackend(newEvents);
                }

                if (events.length === 0) {
                    eventsContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">📅</div>
                            <h3>لا توجد أحداث</h3>
                            <p>ابدأ بإضافة أحداث جديدة من صفحة التقويم</p>
                        </div>
                    `;
                    updateSyncStatus('synced', 'لا توجد أحداث');
                } else {
                    renderEvents(events);
                    updateSyncStatus('synced', `تم تحميل ${events.length} حدث`);
                }

            } catch (err) {
                console.error('Error fetching events:', err);
                eventsContainer.innerHTML = `
                    <div class="error-state">
                        <div class="error-state-icon">⚠️</div>
                        <h3>فشل الاتصال بالسيرفر</h3>
                        <p>${err.message}</p>
                        <button class="refresh-btn" onclick="fetchEvents()">
                            <i class="fas fa-redo"></i> إعادة المحاولة
                        </button>
                    </div>
                `;
                updateSyncStatus('error', 'فشل التحميل');
            }
        }

        // دالة لمزامنة الأحداث الجديدة مع الباك
        async function syncNewEventsToBackend(newEvents) {
            const syncedIds = [];
            
            for (const event of newEvents) {
                try {
                    // محاولة إرسال كل حدث للباك
                    const response = await fetch('https://edu-sync-back-end-production.up.railway.app/api/events', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({
                            title: event.title,
                            start: event.start,
                            end: event.end,
                            type: event.type || 'focus',
                            description: event.description || ''
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            syncedIds.push(event.id);
                            console.log('Event synced successfully:', event.title);
                        }
                    }
                } catch (err) {
                    console.error('Failed to sync event:', event.title, err);
                }
            }

            // حذف الأحداث التي تم مزامنتها من localStorage
            if (syncedIds.length > 0) {
                const remainingEvents = newEvents.filter(e => !syncedIds.includes(e.id));
                localStorage.setItem('newEvents', JSON.stringify(remainingEvents));
                console.log(`Synced ${syncedIds.length} events to backend`);
            }
        }

        // دالة لعرض الأحداث
        function renderEvents(events) {
            eventsContainer.innerHTML = '';
            
            // ترتيب الأحداث حسب تاريخ البداية
            events.sort((a, b) => new Date(a.start) - new Date(b.start));

            events.forEach(ev => {
                const card = document.createElement('div');
                card.className = `notification-card ${ev.type === 'focus' ? 'focus-type' : 'break-type'}`;
                
                const startDate = new Date(ev.start);
                const endDate = new Date(ev.end);
                const startFormatted = startDate.toLocaleString('ar-EG', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const endFormatted = endDate.toLocaleString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                card.innerHTML = `
                    <div class="card-header">
                        <div class="card-time">
                            🗓️ ${startFormatted} - ${endFormatted}
                        </div>
                        <div class="card-actions">
                            <button class="edit-btn" data-id="${ev.id}" title="تعديل">
                                ✏️
                            </button>
                            <button class="delete-btn" data-id="${ev.id}" title="حذف">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="event-title">${ev.title}</div>
                        <span class="event-type">${ev.type === 'focus' ? 'تركيز' : 'استراحة'}</span>
                        ${ev.description ? `<div class="event-description">${ev.description}</div>` : ''}
                    </div>
                `;
                
                eventsContainer.appendChild(card);
            });

            // إضافة event listeners لأزرار الحذف
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    if (confirm('هل تريد حذف هذا الحدث؟')) {
                        await deleteEvent(id);
                    }
                });
            });

            // إضافة event listeners لأزرار التعديل
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const ev = events.find(event => event.id == id);
                    if (ev) {
                        const newTitle = prompt("عدل عنوان الحدث:", ev.title);
                        if (newTitle && newTitle.trim()) {
                            updateEvent(id, { title: newTitle.trim() });
                        }
                    }
                });
            });
        }

        // دالة لحذف حدث
        async function deleteEvent(id) {
            try {
                updateSyncStatus('syncing', 'جاري الحذف...');
                
                const response = await fetch(`https://edu-sync-back-end-production.up.railway.app/api/events/${id}`, {
                    method: 'DELETE',
                    headers: { 
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                
                if (data.success) {
                    alert('✓ تم حذف الحدث بنجاح');
                    fetchEvents();
                } else {
                    throw new Error(data.msg || 'فشل الحذف');
                }
            } catch (err) {
                console.error('Delete error:', err);
                alert('خطأ: ' + err.message);
                updateSyncStatus('error', 'فشل الحذف');
            }
        }

        // دالة لتحديث حدث
        async function updateEvent(id, data) {
            try {
                updateSyncStatus('syncing', 'جاري التحديث...');
                
                const response = await fetch(`https://edu-sync-back-end-production.up.railway.app/api/events/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                
                if (result.success) {
                    alert('✓ تم تحديث الحدث بنجاح');
                    fetchEvents();
                } else {
                    throw new Error(result.msg || 'فشل التحديث');
                }
            } catch (err) {
                console.error('Update error:', err);
                alert('خطأ: ' + err.message);
                updateSyncStatus('error', 'فشل التحديث');
            }
        }

        // تحميل الأحداث عند فتح الصفحة
        fetchEvents();

        // إضافة زر تحديث يدوي
        window.addEventListener('focus', () => {
            // إعادة تحميل الأحداث عند العودة للصفحة
            const newEvents = JSON.parse(localStorage.getItem('newEvents') || '[]');
            if (newEvents.length > 0) {
                fetchEvents();
            }
        });
