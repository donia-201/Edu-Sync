// ========================= NOTES.JS (FIXED) =========================
const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';

let notes = [];
let draggedElement = null;
let searchTerm = '';

const notesContainer = document.getElementById('notes-container');
const addNoteBtn = document.getElementById('add-note');
const addTaskBtn = document.getElementById('add-task');
const searchInput = document.getElementById('search-notes');
const searchBtn = document.getElementById('search-btn');

// ================= AUTH HELPERS =================
function getAuthToken() { 
    return localStorage.getItem('authToken');
}

function setAuthToken(token) { 
    if (token) localStorage.setItem('authToken', token); 
}

function clearAuthToken() { 
    localStorage.removeItem('authToken'); 
}

// ================= OFFLINE HELPERS =================
const OFFLINE_NOTES_KEY = 'offline_notes';
const OFFLINE_QUEUE_KEY = 'offline_queue';

function saveNotesOffline(notes) { 
    localStorage.setItem(OFFLINE_NOTES_KEY, JSON.stringify(notes)); 
}

function loadNotesOffline() { 
    return JSON.parse(localStorage.getItem(OFFLINE_NOTES_KEY) || '[]'); 
}

function addToOfflineQueue(action) {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    const existingIndex = queue.findIndex(a => a.type === action.type && a.note && a.note.id === action.note.id);
    
    if (action.type === 'update' && existingIndex !== -1) {
        queue[existingIndex] = action; 
    } else {
        queue.push(action);
    }
    
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

// ================= HELPERS =================
function uuid() { return crypto.randomUUID(); }
function showError(message) { 
    notesContainer.innerHTML = `<div class="error-message" style="text-align:center;padding:20px;color:#dc3545;">${message}</div>`; 
}
function showLoading() { 
    notesContainer.innerHTML = '<div class="loading" style="text-align:center;padding:20px;">Loading notes...</div>'; 
}

// ================= FETCH NOTES =================
async function fetchNotes() {
    try {
        showLoading();

        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        if (urlToken) { 
            setAuthToken(urlToken); 
            window.history.replaceState({}, document.title, window.location.pathname); 
        }

        const token = getAuthToken();
        if (!token) { 
            showError('Please login first. Redirecting...'); 
            setTimeout(() => window.location.href='../index.html', 2000); 
            return; 
        }

        if (!navigator.onLine) {
            notes = loadNotesOffline();
            renderNotes();
            return;
        }

        const res = await fetch(`${API_BASE_URL}/api/notes`, { 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status === 401) { 
            clearAuthToken(); 
            showError('Session expired. Please login again.'); 
            setTimeout(() => window.location.href='../index.html', 2000); 
            return; 
        }

        const data = await res.json();
        
        notes = (data.notes || []).map(n => ({
            ...n, 
            createdAt: n.createdAt ? new Date(n.createdAt) : new Date() 
        }));
        
        saveNotesOffline(notes);
        renderNotes();

    } catch(err) { 
        console.error('Fetch notes error:', err); 
        showError('Failed to load notes.'); 
    }
}

// ================= CRUD (FIXED) =================
async function saveNote(note) {
    // Add to local array first
    notes.unshift(note); 
    saveNotesOffline(notes);
    renderNotes();
    
    if (!navigator.onLine) { 
        addToOfflineQueue({ type: 'create', note }); 
        return note; 
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/notes`, { 
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }, 
            body: JSON.stringify(note) 
        });
        
        if (res.ok) {
            const saved = await res.json();
            const index = notes.findIndex(n => n.id === note.id);
            if (index !== -1) { 
                notes[index] = saved.note; 
            }
            saveNotesOffline(notes);
            renderNotes();
            return saved.note;
        } else {
            console.error("Server creation failed:", res.status);
            addToOfflineQueue({ type: 'create', note });
            return note;
        }
    } catch(err) {
        console.error("Network error during creation:", err);
        addToOfflineQueue({ type: 'create', note });
        return note;
    }
}

async function updateNote(note) {
    const index = notes.findIndex(n => n.id === note.id);
    if (index !== -1) { 
        notes[index] = note; 
    }
    saveNotesOffline(notes);
    
    if (!navigator.onLine) { 
        addToOfflineQueue({ type: 'update', note }); 
        return; 
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/notes/${note.id}`, { 
            method: 'PUT', 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }, 
            body: JSON.stringify(note) 
        });
        
        if (res.status === 404 || !res.ok) {
            console.error(`Update failed: Note ${note.id} status ${res.status}. Adding to queue.`);
            addToOfflineQueue({ type: 'update', note });
        }
    } catch(err) {
        console.error("Network error during update:", err);
        addToOfflineQueue({ type: 'update', note });
    }
}

// ✅ FIXED: Remove updateNote() call
async function deleteNote(noteId) {
    if (!noteId) {
        console.error("Attempted to delete a note without a valid ID.");
        return;
    }

    // Remove from local array
    notes = notes.filter(n => n.id !== noteId);
    saveNotesOffline(notes);
    renderNotes();
    
    // ❌ REMOVED: updateNote() - this was causing notes to reappear
    
    if (!navigator.onLine) { 
        addToOfflineQueue({ type: 'delete', id: noteId });
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, { 
            method: 'DELETE', 
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            } 
        });
        
        if (res.status === 404) {
            console.log(`Note ${noteId} not found on server, assuming already deleted.`);
        } else if (!res.ok) {
            console.error(`Delete failed with status: ${res.status}. Adding to queue.`);
            addToOfflineQueue({ type: 'delete', id: noteId });
        }
    } catch(err) {
        console.error("Network error during delete:", err);
        addToOfflineQueue({ type: 'delete', id: noteId });
    }
}

// ================= RENDER (FIXED) =================
function filterNotes() { 
    if (!searchTerm) return notes; 
    return notes.filter(n => n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase())); 
}

function renderNotes() {
    const filtered = filterNotes();
    notesContainer.innerHTML = filtered.length ? '' : '<div class="loading" style="text-align:center;padding:20px;">No notes found.</div>';

    filtered.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note';
        card.dataset.id = note.id;
        card.draggable = true;
        card.style.backgroundColor = note.color || '#fff';

        // CONTROLS
        const controls = document.createElement('div');
        controls.className = 'note-controls';

        // Delete button
        const del = document.createElement('button');
        del.textContent = '✖';
        del.className = "delete-btn button";
        del.onclick = async () => { 
            if (confirm('Are you sure you want to delete this note?')) {
                await deleteNote(note.id); 
            }
        };
        controls.appendChild(del);

        // Color picker
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = "color-btn";
        colorInput.value = note.color || '#ffffff';
        colorInput.oninput = () => { 
            note.color = colorInput.value; 
            card.style.backgroundColor = note.color; 
            updateNote(note); 
        };
        controls.appendChild(colorInput);

        card.appendChild(controls);
        
        // ================= CONTENT RENDERING (FIXED FOR TASKS) =================
        if (note.type === 'task') {
            const label = document.createElement('label'); 
            label.className = 'task-label';
            
            const checkbox = document.createElement('input'); 
            checkbox.type = 'checkbox'; 
            checkbox.checked = note.checked || false;
            checkbox.onchange = () => { 
                note.checked = checkbox.checked; 
                updateNote(note); 
            };
            
            const taskText = document.createElement('span'); 
            taskText.contentEditable = true; 
            taskText.textContent = note.content || 'New task'; // ✅ Use textContent
            
            // ✅ FIXED: Better event handling for tasks
            taskText.addEventListener('blur', () => { 
                const updatedContent = taskText.textContent.trim() || 'New task';
                if (note.content !== updatedContent) {
                    note.content = updatedContent;
                    updateNote(note);
                }
            });
            
            // Prevent Enter key from creating new line
            taskText.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    taskText.blur();
                }
            });
            
            label.appendChild(checkbox);
            label.appendChild(taskText);
            card.appendChild(label);
            
        } else {
            const content = document.createElement('div'); 
            content.className = 'note-content'; 
            content.contentEditable = true; 
            content.textContent = note.content || 'New note'; // ✅ Use textContent
            
            content.addEventListener('blur', () => { 
                const updatedContent = content.textContent.trim() || 'New note';
                if (note.content !== updatedContent) {
                    note.content = updatedContent;
                    updateNote(note);
                }
            });
            
            card.appendChild(content);
        }

        // ================= DRAG EVENTS (Desktop) =================
        card.addEventListener('dragstart', e => { 
            draggedElement = e.currentTarget; 
            e.currentTarget.classList.add('dragging'); 
        });
        
        card.addEventListener('dragend', e => { 
            e.currentTarget.classList.remove('dragging'); 
        });
        
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);

        // ================= TOUCH EVENTS (Mobile) =================
        let touchStartY = 0;
        let touchedElement = null;

        card.addEventListener('touchstart', e => {
            touchedElement = e.currentTarget;
            touchStartY = e.touches[0].clientY;
            touchedElement.classList.add('dragging');
        });

        card.addEventListener('touchmove', e => {
            if (!touchedElement) return;
            e.preventDefault();
            
            const touchY = e.touches[0].clientY;
            const afterElement = getDragAfterElement(notesContainer, touchY);
            
            if (afterElement == null) {
                notesContainer.appendChild(touchedElement);
            } else {
                notesContainer.insertBefore(touchedElement, afterElement);
            }
        });

        card.addEventListener('touchend', e => {
            if (!touchedElement) return;
            touchedElement.classList.remove('dragging');
            touchedElement = null;
            
            // Save new order
            const newOrder = [];
            notesContainer.querySelectorAll('.note').forEach(el => {
                const note = notes.find(n => n.id === el.dataset.id);
                if (note) newOrder.push(note);
            });
            notes = newOrder;
            saveNotesOffline(notes);
            
            if (navigator.onLine) {
                fetch(`${API_BASE_URL}/api/notes/reorder`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify({ order: notes.map(n => n.id) })
                }).catch(err => console.error('Reorder error:', err));
            }
        });

        notesContainer.appendChild(card);
    });
}

// ================= DRAG & DROP (Desktop) =================
function handleDragOver(e) {
    e.preventDefault();
    const afterElement = getDragAfterElement(notesContainer, e.clientY);
    
    if (afterElement == null) {
        notesContainer.appendChild(draggedElement);
    } else {
        notesContainer.insertBefore(draggedElement, afterElement);
    }
}

function handleDrop(e) {
    e.preventDefault();
    
    const newOrder = [];
    notesContainer.querySelectorAll('.note').forEach(el => {
        const note = notes.find(n => n.id === el.dataset.id);
        if (note) newOrder.push(note);
    });
    
    notes = newOrder;
    saveNotesOffline(notes);
    
    if (navigator.onLine) {
        fetch(`${API_BASE_URL}/api/notes/reorder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ order: notes.map(n => n.id) })
        }).catch(err => console.error('Reorder error:', err));
    }
}

function getDragAfterElement(container, y) {
    const draggable = [...container.querySelectorAll('.note:not(.dragging)')];
    
    return draggable.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - (box.top + box.height / 2);
        
        return (offset < 0 && offset > closest.offset) 
            ? { offset: offset, element: child } 
            : closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ================= EVENTS =================
addNoteBtn.onclick = async () => {
    const note = {
        id: uuid(),
        type: 'note',
        content: 'New note',
        color: '#fff',
        createdAt: new Date().toISOString()
    };
    await saveNote(note);
};

addTaskBtn.onclick = async () => {
    const task = {
        id: uuid(),
        type: 'task',
        content: 'New task',
        checked: false,
        color: '#fff',
        createdAt: new Date().toISOString()
    };
    await saveNote(task);
};

// SEARCH
searchInput.oninput = e => { 
    searchTerm = e.target.value; 
    renderNotes(); 
};

searchBtn.onclick = () => searchInput.focus();

// ================= SYNC OFFLINE =================
window.addEventListener('online', async () => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    if (queue.length === 0) return;
    
    console.log('Syncing offline queue:', queue.length, 'actions');
    localStorage.removeItem(OFFLINE_QUEUE_KEY); 
    
    for (const action of queue) {
        try {
            if (action.type === 'create') {
                notes = notes.filter(n => n.id !== action.note.id);
                await saveNote(action.note);
            } else if (action.type === 'update') {
                await updateNote(action.note);
            } else if (action.type === 'delete') {
                await deleteNote(action.id);
            }
        } catch (err) {
            console.error('Sync error:', err);
        }
    }
    
    fetchNotes();
});

// ================= INIT =================
fetchNotes();