const { ipcRenderer } = require('electron');

let notifications = [];
let todos = [];
let availableIcons = [];
let currentEditingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
    renderNotifications();
    renderTodos();
});

async function loadData() {
    try {
        notifications = await ipcRenderer.invoke('get-notifications');
        todos = await ipcRenderer.invoke('get-todos');
        availableIcons = await ipcRenderer.invoke('get-available-icons');
        populateIconSelect();
        console.log('Data loaded successfully:', { notifications: notifications.length, todos: todos.length, icons: availableIcons });
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function setupEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    document.getElementById('add-notification').addEventListener('click', openAddNotificationModal);
    
    document.getElementById('add-todo').addEventListener('click', addTodo);
    document.getElementById('new-todo-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('cancel-edit').addEventListener('click', closeModal);
    document.getElementById('notification-form').addEventListener('submit', saveNotification);
    
    document.getElementById('custom-icon').addEventListener('change', handleCustomIconUpload);
    
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal')) {
            closeModal();
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
}

function renderNotifications() {
    const container = document.getElementById('notifications-list');
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No notifications</h3>
                <p>Add your first notification to get started</p>
            </div>
        `;
        return;
    }

    const sortedNotifications = [...notifications].sort((a, b) => {
        const timeA = a.hour * 60 + a.minute;
        const timeB = b.hour * 60 + b.minute;
        return timeA - timeB;
    });

    container.innerHTML = sortedNotifications.map(notif => `
        <div class="notification-item ${!notif.enabled ? 'disabled' : ''}">
            <div class="notification-toggle">
                <div class="toggle-switch ${notif.enabled ? 'active' : ''}" data-id="${notif.id}">
                    <div class="toggle-slider"></div>
                </div>
            </div>
            <div class="notification-info">
                <div class="notification-time">
                    ${String(notif.hour).padStart(2, '0')}:${String(notif.minute).padStart(2, '0')}
                </div>
                <div class="notification-message">${notif.message}</div>
            </div>
            <div class="notification-actions">
                <button class="btn-edit btn-small" data-id="${notif.id}">Edit</button>
                <button class="btn-delete btn-small" data-id="${notif.id}">Delete</button>
            </div>
        </div>
    `).join('');

    // event listeners
    container.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('click', toggleNotification);
    });

    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            openEditNotificationModal(id);
        });
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            deleteNotification(id);
        });
    });
}

// Toggle notification
async function toggleNotification(e) {
    const id = parseInt(e.target.closest('.toggle-switch').dataset.id);
    const notification = notifications.find(n => n.id === id);
    
    if (notification) {
        notification.enabled = !notification.enabled;
        await saveNotificationsData();
        renderNotifications();
    }
}

function openAddNotificationModal() {
    currentEditingId = null;
    document.getElementById('modal-title').textContent = 'Add Notification';
    document.getElementById('notification-form').reset();
    document.getElementById('selected-file').style.display = 'none';
    document.getElementById('modal').classList.add('active');
}

function openEditNotificationModal(id) {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;

    currentEditingId = id;
    document.getElementById('modal-title').textContent = 'Edit Notification';
    document.getElementById('notif-hour').value = notification.hour;
    document.getElementById('notif-minute').value = notification.minute;
    document.getElementById('notif-message').value = notification.message;
    
    const select = document.getElementById('notif-icon');
    
    if (notification.icon && notification.icon.includes('.')) {
        const existingOption = Array.from(select.options).find(opt => opt.value === notification.icon);
        if (!existingOption) {
            const customOption = new Option(notification.icon, notification.icon, false, false);
            select.add(customOption);
        }
        select.value = notification.icon;
    } else {
        select.value = '';
    }
    
    document.getElementById('selected-file').style.display = 'none';
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentEditingId = null;
}

async function saveNotification(e) {
    e.preventDefault();
    
    const hour = parseInt(document.getElementById('notif-hour').value);
    const minute = parseInt(document.getElementById('notif-minute').value);
    const message = document.getElementById('notif-message').value.trim();
    const icon = document.getElementById('notif-icon').value;

    // Validation
    if (isNaN(hour) || hour < 0 || hour > 23) {
        alert('Please enter a valid hour (0-23)');
        return;
    }

    if (isNaN(minute) || minute < 0 || minute > 59) {
        alert('Please enter a valid minute (0-59)');
        return;
    }

    if (!message) {
        alert('Please enter a notification message');
        return;
    }

    if (message.length > 200) {
        alert('Message must be 200 characters or less');
        return;
    }

    const formData = {
        hour: hour,
        minute: minute,
        message: message,
        icon: icon,
        enabled: true
    };

    if (currentEditingId) {
        const index = notifications.findIndex(n => n.id === currentEditingId);
        if (index !== -1) {
            notifications[index] = { ...notifications[index], ...formData };
        }
    } else {
        const newId = Math.max(...notifications.map(n => n.id), 0) + 1;
        notifications.push({ id: newId, ...formData });
    }

    await saveNotificationsData();
    renderNotifications();
    closeModal();
}

async function deleteNotification(id) {
    if (confirm('Are you sure you want to delete this notification?')) {
        notifications = notifications.filter(n => n.id !== id);
        await saveNotificationsData();
        renderNotifications();
    }
}

async function saveNotificationsData() {
    try {
        await ipcRenderer.invoke('save-notifications', notifications);
    } catch (error) {
        console.error('Error saving notifications:', error);
        alert('Failed to save notifications. Please try again.');
    }
}

function populateIconSelect() {
    const select = document.getElementById('notif-icon');
    
    select.innerHTML = '<option value="">No icon</option>' +
        availableIcons.map(icon => 
            `<option value="${icon}">${icon}</option>`
        ).join('');
}

function renderTodos() {
    const container = document.getElementById('todos-list');
    
    if (todos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No tasks yet</h3>
                <p>Add your first task to get organized</p>
            </div>
        `;
        return;
    }

    const sortedTodos = [...todos].sort((a, b) => {
        if (a.completed === b.completed) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return a.completed ? 1 : -1;
    });

    container.innerHTML = sortedTodos.map(todo => `
        <div class="todo-item ${todo.completed ? 'completed' : ''}">
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} data-id="${todo.id}">
            <span class="todo-text">${todo.text}</span>
            <div class="todo-actions">
                <button class="btn-small btn-delete todo-delete" data-id="${todo.id}">
                    Delete
                </button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.todo-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', toggleTodo);
    });

    container.querySelectorAll('.todo-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            deleteTodo(id);
        });
    });
}

async function addTodo() {
    const input = document.getElementById('new-todo-input');
    const text = input.value.trim();
    
    if (!text) {
        alert('Please enter a task description');
        return;
    }

    if (text.length > 100) {
        alert('Task description must be 100 characters or less');
        return;
    }

    const newTodo = {
        id: Math.max(...todos.map(t => t.id), 0) + 1,
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };

    todos.push(newTodo);
    await saveTodosData();
    renderTodos();
    input.value = '';
}

async function toggleTodo(e) {
    const id = parseInt(e.target.dataset.id);
    const todo = todos.find(t => t.id === id);
    
    if (todo) {
        todo.completed = !todo.completed;
        todo.completedAt = todo.completed ? new Date().toISOString() : null;
        await saveTodosData();
        renderTodos();
    }
}

async function deleteTodo(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        todos = todos.filter(t => t.id !== id);
        await saveTodosData();
        renderTodos();
    }
}

async function saveTodosData() {
    try {
        await ipcRenderer.invoke('save-todos', todos);
    } catch (error) {
        console.error('Error saving todos:', error);
        alert('Failed to save tasks. Please try again.');
    }
}

async function handleCustomIconUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, SVG, etc.)');
        e.target.value = '';
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        e.target.value = '';
        return;
    }
    
    try {
        const fileBuffer = await file.arrayBuffer();
        const customFileName = await ipcRenderer.invoke('save-custom-icon', Buffer.from(fileBuffer), file.name);
        
        const select = document.getElementById('notif-icon');
        
        // Remove previous custom options
        Array.from(select.options).forEach(option => {
            if (option.value !== '' && option.value.includes('.')) {
                option.remove();
            }
        });
        
        // Add new custom option
        const customOption = new Option(`Custom: ${file.name}`, customFileName, true, true);
        select.add(customOption);
        
        const selectedFileDiv = document.getElementById('selected-file');
        selectedFileDiv.textContent = `Selected: ${file.name}`;
        selectedFileDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Error uploading custom icon:', error);
        alert('Failed to upload icon. Please try again with a different image.');
        e.target.value = '';
    }
}
