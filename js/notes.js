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
    const index = queue.findIndex(
        a => a.type === action.type && a.note && action.note && a.note.id === action.note.id
    );
    if (action.type === 'update' && index !== -1) {
        queue[index] = action;
    } else {
        queue.push(action);
    }
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

// ================= HELPERS =================
function uuid() { return crypto.randomUUID(); }
function showError(message) {
    notesContainer.innerHTML = `<div style="text-align:center;color:#dc3545">${message}</div>`;
}
function showLoading() {
    notesContainer.innerHTML = `<div style="text-align:center">Loading...</div>`;
}

// ================= FETCH NOTES =================
async function fetchNotes() {
    try {
        showLoading();

        const token = getAuthToken();
        if (!token) {
            showError('Please login first');
            return;
        }

        if (!navigator.onLine) {
            notes = loadNotesOffline();
            renderNotes();
            return;
        }

        const res = await fetch(`${API_BASE_URL}/api/notes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();
        notes = data.notes || [];
        saveNotesOffline(notes);
        renderNotes();

    } catch (err) {
        console.error(err);
        showError('Failed to load notes');
    }
}

// ================= CRUD =================
async function saveNote(note) {
    notes.unshift(note);
    saveNotesOffline(notes);
    renderNotes();

    if (!navigator.onLine) {
        addToOfflineQueue({ type: 'create', note });
        return;
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

        const data = await res.json();
        if (res.ok && data.note) {
            const i = notes.findIndex(n => n.id === note.id);
            if (i !== -1) notes[i] = data.note;
            saveNotesOffline(notes);
            renderNotes();
        }
    } catch {
        addToOfflineQueue({ type: 'create', note });
    }
}

async function updateNote(note) {
    const i = notes.findIndex(n => n.id === note.id);
    if (i !== -1) notes[i] = note;
    saveNotesOffline(notes);

    if (!navigator.onLine) {
        addToOfflineQueue({ type: 'update', note });
        return;
    }

    try {
        await fetch(`${API_BASE_URL}/api/notes/${note.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(note)
        });
    } catch {
        addToOfflineQueue({ type: 'update', note });
    }
}

async function deleteNote(noteId) {
    // soft delete locally
    notes = notes.map(n =>
        n.id === noteId ? { ...n, _deleted: true } : n
    );
    saveNotesOffline(notes);
    renderNotes();

    if (!navigator.onLine) {
        addToOfflineQueue({ type: 'delete', id: noteId });
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (res.ok || res.status === 404) {
            notes = notes.filter(n => n.id !== noteId);
            saveNotesOffline(notes);
        }
    } catch {
        addToOfflineQueue({ type: 'delete', id: noteId });
    }
}

// ================= RENDER =================
function filterNotes() {
    return notes
        .filter(n => !n._deleted)
        .filter(n =>
            !searchTerm ||
            (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase()))
        );
}

function renderNotes() {
    const filtered = filterNotes();
    notesContainer.innerHTML = '';

    filtered.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note';
        card.dataset.id = note.id;
        card.style.background = note.color || '#fff';

        const del = document.createElement('button');
        del.textContent = '✖';
        del.onclick = () => deleteNote(note.id);
        card.appendChild(del);

        if (note.type === 'task') {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = note.checked || false;
            checkbox.onchange = () => {
                note.checked = checkbox.checked;
                updateNote(note);
            };

            const text = document.createElement('span');
            text.contentEditable = true;
            text.textContent = note.content || 'New task';

            text.addEventListener('blur', () => {
                const val = text.textContent.trim();
                if (!val) {
                    text.textContent = note.content || 'New task';
                    return;
                }
                note.content = val;
                saveNotesOffline(notes);
                updateNote(note);
            });

            label.appendChild(checkbox);
            label.appendChild(text);
            card.appendChild(label);
        } else {
            const content = document.createElement('div');
            content.contentEditable = true;
            content.textContent = note.content || 'New note';

            content.addEventListener('blur', () => {
                const val = content.textContent.trim();
                if (val !== note.content) {
                    note.content = val;
                    updateNote(note);
                }
            });

            card.appendChild(content);
        }

        notesContainer.appendChild(card);
    });
}

// ================= EVENTS =================
addNoteBtn.onclick = () => {
    saveNote({
        id: uuid(),
        type: 'note',
        content: 'New note',
        createdAt: new Date().toISOString()
    });
};

addTaskBtn.onclick = () => {
    saveNote({
        id: uuid(),
        type: 'task',
        content: 'New task',
        checked: false,
        createdAt: new Date().toISOString()
    });
};

searchInput.oninput = e => {
    searchTerm = e.target.value;
    renderNotes();
};

// ================= SYNC OFFLINE =================
window.addEventListener('online', async () => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    localStorage.removeItem(OFFLINE_QUEUE_KEY);

    for (const action of queue) {
        if (action.type === 'create') await saveNote(action.note);
        if (action.type === 'update') await updateNote(action.note);
        if (action.type === 'delete') await deleteNote(action.id);
    }

    fetchNotes();
});

// ================= INIT =================
fetchNotes();
