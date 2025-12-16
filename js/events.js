const eventsContainer = document.getElementById('eventsContainer');
const token = localStorage.getItem('token');

async function fetchEvents(){
  try {
    const response = await fetch('https://edu-sync-back-end-production.up.railway.app/api/events', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();

    let events = [];
    if(data.success){
      events = data.events;
    }

    // دمج الأحداث الجديدة من Calendar Page بدون إعادة تحميل
    const newEvents = JSON.parse(localStorage.getItem('newEvents') || '[]');
    if(newEvents.length > 0){
      events = [...events, ...newEvents];
      localStorage.removeItem('newEvents');
    }

    if(events.length === 0){
      eventsContainer.innerHTML = `<div class="empty-state"><i>📅</i><p>لا توجد أحداث</p></div>`;
    } else {
      renderEvents(events);
    }

  } catch(err){
    console.error(err);
    eventsContainer.innerHTML = `<div class="empty-state"><i>⚠️</i><p>فشل الاتصال بالسيرفر</p></div>`;
  }
}

function renderEvents(events){
  eventsContainer.innerHTML='';
  events.forEach(ev=>{
    const card = document.createElement('div');
    card.className='notification-card '+(ev.type==='focus'?'focus-type':'break-type');

    card.innerHTML=`
      <div class="notification-header">
        <span class="notification-icon">🗓️</span>
        <span class="notification-time">${ev.start} - ${ev.end}</span>
        <button class="edit-btn" data-id="${ev.id}">✏️</button>
        <button class="delete-btn" data-id="${ev.id}">🗑️</button>
      </div>
      <div class="notification-content">
        <div class="notification-message-ar">${ev.title}</div>
        <div class="notification-type-badge">${ev.type}</div>
      </div>
    `;

    eventsContainer.appendChild(card);
  });

  // أزرار الحذف
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if(confirm('هل تريد حذف هذا الحدث؟')){
        try {
          const res = await fetch(`https://edu-sync-back-end-production.up.railway.app/api/events/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if(data.success){
            alert('تم حذف الحدث');
            fetchEvents();
          } else {
            alert('فشل الحذف: '+data.msg);
          }
        } catch(err){ console.error(err); alert('خطأ في الاتصال'); }
      }
    });
  });

  // أزرار التعديل
  document.querySelectorAll('.edit-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = e.target.dataset.id;
      const ev = events.find(ev=>ev.id===id);
      const newTitle = prompt("عدل عنوان الحدث", ev.title);
      if(newTitle){
        updateEvent(id, {title:newTitle});
      }
    });
  });
}

async function updateEvent(id, data){
  try {
    const res = await fetch(`https://edu-sync-back-end-production.up.railway.app/api/events/${id}`, {
      method: 'PUT',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if(result.success){
      fetchEvents();
    } else {
      alert('فشل التعديل: '+result.msg);
    }
  } catch(err){ console.error(err); alert('خطأ في الاتصال'); }
}

// أول تحميل
fetchEvents();
