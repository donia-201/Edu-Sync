        // Configuration
        const API_BASE_URL = 'https://edu-sync-back-end-production.up.railway.app';
        
        // State
        let notes = [];
        let draggedElement = null;
        let searchTerm = '';

        // DOM Elements
        const notesContainer = document.getElementById('notes-container');
        const addNoteBtn = document.getElementById('add-note');
        const addTaskBtn = document.getElementById('add-task');
        const searchInput = document.getElementById('search-notes');
        const searchBtn = document.getElementById('search-btn');

        // Helpers
        function uuid() {
            return crypto.randomUUID();
        }

        function showError(message) {
            notesContainer.innerHTML = `<div class="error-message">${message}</div>`;
        }

        function showLoading() {
            notesContainer.innerHTML = '<div class="loading">Loading notes...</div>';
        }

async function fetchNotes() {
    try {
        showLoading();
        
        // Get token from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        
        let token = urlToken || localStorage.getItem('session_token');
        
        if (urlToken) {
            localStorage.setItem('session_token', urlToken);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        if (!token) {
            showError('Please login first. Redirecting...');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/notes`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            showError('Session expired. Please login again.');
            localStorage.removeItem('session_token');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return;
        }
        
        if (!response.ok) {
            throw new Error('Failed to fetch notes');
        }
        
        const data = await response.json();
        notes = data.notes || [];
        renderNotes();
    } catch (error) {
        console.error('Error fetching notes:', error);
        showError('Failed to load notes. Please try again.');
    }
}
        async function saveNote(note) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notes`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('session_token')}`
            },
            body: JSON.stringify(note)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save note');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error saving note:', error);
        showError('Failed to save note. Please try again.');
    }
}

async function updateNote(note) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/notes/${note.id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('session_token')}`
            },
            body: JSON.stringify(note)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update note');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating note:', error);
    }
}

        async function deleteNote(noteId) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('session_token')}`
            }
        });
                
                if (!response.ok) {
                    throw new Error('Failed to delete note');
                }
                
                return await response.json();
            } catch (error) {
                console.error('Error deleting note:', error);
                showError('Failed to delete note. Please try again.');
            }
        }

        // Render Functions
        function filterNotes() {
            if (!searchTerm) return notes;
            
            return notes.filter(note => 
                note.content.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        function renderNotes() {
            const filteredNotes = filterNotes();
            
            if (filteredNotes.length === 0) {
                notesContainer.innerHTML = '<div class="loading">No notes found. Create your first note!</div>';
                return;
            }

            notesContainer.innerHTML = '';

            filteredNotes.forEach(note => {
                const card = document.createElement('div');
                card.className = 'note';
                card.dataset.id = note.id;
                card.draggable = true;
                card.style.backgroundColor = note.color || '#ffffff';

                // Controls
                const controls = document.createElement('div');
                controls.className = 'note-controls';

                const colorPicker = document.createElement('input');
                colorPicker.type = 'color';
                colorPicker.value = note.color || '#ffffff';
                colorPicker.addEventListener('input', async (e) => {
                    note.color = e.target.value;
                    card.style.backgroundColor = note.color;
                    await updateNote(note);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '✖';
                deleteBtn.addEventListener('click', async () => {
                    await deleteNote(note.id);
                    notes = notes.filter(n => n.id !== note.id);
                    renderNotes();
                });

                controls.appendChild(colorPicker);
                controls.appendChild(deleteBtn);
                card.appendChild(controls);

                // Content
                const content = document.createElement('div');
                content.className = 'note-content';

                if (note.type === 'task') {
                    const label = document.createElement('label');
                    label.className = 'task-label';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = note.checked || false;
                    checkbox.addEventListener('change', async (e) => {
                        note.checked = e.target.checked;
                        await updateNote(note);
                    });

                    const span = document.createElement('span');
                    span.contentEditable = 'true';
                    span.innerText = note.content;
                    span.addEventListener('blur', async (e) => {
                        note.content = e.target.innerText.trim() || 'New task';
                        await updateNote(note);
                    });

                    label.appendChild(checkbox);
                    label.appendChild(span);
                    content.appendChild(label);
                } else {
                    content.contentEditable = 'true';
                    content.innerText = note.content;
                    content.addEventListener('blur', async (e) => {
                        note.content = e.target.innerText.trim() || 'New note';
                        await updateNote(note);
                    });
                }

                card.appendChild(content);

                // Drag events
                card.addEventListener('dragstart', handleDragStart);
                card.addEventListener('dragend', handleDragEnd);
                card.addEventListener('dragover', handleDragOver);
                card.addEventListener('drop', handleDrop);

                notesContainer.appendChild(card);
            });
        }

        // Drag and Drop Handlers
        function handleDragStart(e) {
            draggedElement = e.currentTarget;
            e.currentTarget.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
        }

        function handleDragEnd(e) {
            e.currentTarget.classList.remove('dragging');
        }

        function handleDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';

            const afterElement = getDragAfterElement(notesContainer, e.clientX, e.clientY);
            
            if (afterElement == null) {
                notesContainer.appendChild(draggedElement);
            } else {
                notesContainer.insertBefore(draggedElement, afterElement);
            }

            return false;
        }

        async function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    // Update notes order
    const newOrder = [];
    const noteElements = notesContainer.querySelectorAll('.note');
    noteElements.forEach(el => {
        const note = notes.find(n => n.id === el.dataset.id);
        if (note) {
            newOrder.push(note);
        }
    });
    notes = newOrder;

    // Save order to backend
    try {
        await fetch(`${API_BASE_URL}/api/notes/reorder`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('session_token')}`
            },
            body: JSON.stringify({ order: notes.map(n => n.id) })
        });
    } catch (error) {
        console.error('Error saving order:', error);
    }

    return false;
}


        function getDragAfterElement(container, x, y) {
            const draggableElements = [...container.querySelectorAll('.note:not(.dragging)')];

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offsetX = x - box.left - box.width / 2;
                const offsetY = y - box.top - box.height / 2;
                const offset = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

                if (offset < closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.POSITIVE_INFINITY }).element;
        }

        // Event Listeners
        addNoteBtn.addEventListener('click', async () => {
            const newNote = {
                id: uuid(),
                type: 'note',
                content: 'New note',
                color: '#ffffff',
                createdAt: new Date().toISOString()
            };
            
            const savedNote = await saveNote(newNote);
            if (savedNote) {
                notes.unshift(newNote);
                renderNotes();
            }
        });

        addTaskBtn.addEventListener('click', async () => {
            const newTask = {
                id: uuid(),
                type: 'task',
                content: 'New task',
                checked: false,
                color: '#ffffff',
                createdAt: new Date().toISOString()
            };
            
            const savedTask = await saveNote(newTask);
            if (savedTask) {
                notes.unshift(newTask);
                renderNotes();
            }
        });

        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            renderNotes();
        });

        searchBtn.addEventListener('click', () => {
            searchInput.focus();
        });

        // Initialize
        fetchNotes();
