const calendarGrid = document.getElementById('calendarGrid');
const modal = document.getElementById('eventModal' );
const closeModal = document.getElementById('closeModal');
const saveEventBtn = document.getElementById('saveEventBtn');

const eventTitleInput = document.getElementById('eventTitle');
const eventStartInput = document.getElementById('eventStart');
const eventEndInput = document.getElementById('eventEnd');
const eventDescInput = document.getElementById('eventDesc');

const token = localStorage.getItem('token');

for(let i=1;i<=30;i++){
  const day = document.createElement('div');
  day.classList.add('calendar-day');
  day.textContent = i;
  day.addEventListener('click', () => modal.style.display = 'flex');
  calendarGrid.appendChild(day);
}

closeModal.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', e => { if(e.target===modal) modal.style.display='none'; });

saveEventBtn.addEventListener('click', async () => {
  const title = eventTitleInput.value;
  const start = eventStartInput.value;
  const end = eventEndInput.value;
  const desc = eventDescInput.value;

  if(!title || !start || !end){
    alert(" please, fill required fieldes");
    return;
  }

  try {
    const response = await fetch('https://edu-sync-back-end-production.up.railway.app/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        start,
        end,
        type: 'focus',
        description: desc
      })
    });

    const data = await response.json();
    if(data.success){
      alert(' Event saved successfully !');
      modal.style.display = 'none';

      eventTitleInput.value = '';
      eventStartInput.value = '';
      eventEndInput.value = '';
      eventDescInput.value = '';

      let tempEvents = JSON.parse(localStorage.getItem('newEvents') || '[]');
      tempEvents.push({
        id: data.event_id,
        title,
        start,
        end,
        type: 'focus',
        description: desc
      });
      localStorage.setItem('newEvents', JSON.stringify(tempEvents));

    } else {
      alert('  Fialed to save the Event: ' + data.msg);
    }

  } catch(err){
    console.error(err);
    alert(' error in connect with server!');
  }
});
