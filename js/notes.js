// ================= CONFIGURATION =================
const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';

// ================= STATE =================
let notes = [];
let draggedElement = null;
let searchTerm = '';

// ================= DOM ELEMENTS =================
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
    queue.push(action);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

// ================= HELPERS =================
function uuid() {
    return crypto.randomUUID();
}

function showError(message) {
    notesContainer.innerHTML = `<div class="error-message">${message}</div>`;
}

function showLoading() {
    notesContainer.innerHTML = '<div class="loading">Loading notes...</div>';
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
            setTimeout(() => window.location.href = '../index.html', 2000);
            return;
        }

        // OFFLINE MODE
        if (!navigator.onLine) {
            notes = loadNotesOffline();
            renderNotes();
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/notes`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            clearAuthToken();
            showError('Session expired. Please login again.');
            setTimeout(() => window.location.href = '../index.html', 2000);
            return;
        }

        const data = await response.json();
        notes = data.notes || [];
        saveNotesOffline(notes);
        renderNotes();

    } catch (err) {
        console.error(err);
        showError('Failed to load notes.');
    }
}

// ================= CRUD =================
async function saveNote(note) {
    if (!navigator.onLine) {
        notes.unshift(note);
        saveNotesOffline(notes);
        addToOfflineQueue({ type: 'create', note });
        renderNotes();
        return note;
    }

    const res = await fetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(note)
    });

    return await res.json();
}

async function updateNote(note) {
    if (!navigator.onLine) {
        saveNotesOffline(notes);
        addToOfflineQueue({ type: 'update', note });
        return;
    }

    await fetch(`${API_BASE_URL}/api/notes/${note.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(note)
    });
}

async function deleteNote(noteId) {
    if (!navigator.onLine) {
        notes = notes.filter(n => n.id !== noteId);
        saveNotesOffline(notes);
        addToOfflineQueue({ type: 'delete', id: noteId });
        renderNotes();
        return;
    }

    await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    });
}

// ================= RENDER =================
function filterNotes() {
    if (!searchTerm) return notes;
    return notes.filter(n => n.content.toLowerCase().includes(searchTerm.toLowerCase()));
}

function renderNotes() {
    const filtered = filterNotes();
    if (!filtered.length) {
        notesContainer.innerHTML = '<div class="loading">No notes found.</div>';
        return;
    }

    notesContainer.innerHTML = '';

    filtered.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note';
        card.dataset.id = note.id;
        card.draggable = true;
        card.style.backgroundColor = note.color || '#fff';

        const controls = document.createElement('div');
        controls.className = 'note-controls';

        const del = document.createElement('button');
        del.textContent = '✖';
        del.onclick = async () => {
            await deleteNote(note.id);
            notes = notes.filter(n => n.id !== note.id);
            renderNotes();
        };

        controls.appendChild(del);
        card.appendChild(controls);

        const content = document.createElement('div');
        content.className = 'note-content';
        content.contentEditable = true;
        content.innerText = note.content;

        content.onblur = async () => {
            note.content = content.innerText || 'New note';
            await updateNote(note);
        };

        card.appendChild(content);
        notesContainer.appendChild(card);
    });
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

    const saved = await saveNote(note);
    if (saved) {
        notes.unshift(note);
        saveNotesOffline(notes);
        renderNotes();
    }
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

    notes.unshift(task);
    renderNotes();
    await saveNote(task);
};

//
searchInput.oninput = e => {
    searchTerm = e.target.value;
    renderNotes();
};

searchBtn.onclick = () => searchInput.focus();

// ================= SYNC WHEN ONLINE =================
window.addEventListener('online', async () => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    if (!queue.length) return;

    for (const action of queue) {
        if (action.type === 'create') await saveNote(action.note);
        if (action.type === 'update') await updateNote(action.note);
        if (action.type === 'delete') await deleteNote(action.id);
    }

    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    fetchNotes();
});

// ================= INIT =================
fetchNotes();
