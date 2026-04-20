$(document).ready(function () {
    const Storage = {
        get(key) {
            try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
        },
        set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
        remove(key) { localStorage.removeItem(key); }
    };
    if (!Storage.get('clients')) Storage.set('clients', []);
    if (!Storage.get('sessions')) Storage.set('sessions', []);
    if (!Storage.get('users')) {
        Storage.set('users', [{ username: 'admin', password: 'admin123' }]);
    }
    window.showToast = function (message, type = 'info') {
        let $container = $('.toast-container');
        if (!$container.length) {
            $('body').append('<div class="toast-container"></div>');
            $container = $('.toast-container');
        }
        const icons = { success: '', error: '', info: '' };
        const $toast = $(`<div class="toast ${type}"><span>${icons[type] || ''}</span><span>${message}</span></div>`);
        $container.append($toast);
        setTimeout(() => {
            $toast.css('animation', 'toastOut 0.4s ease-in forwards');
            setTimeout(() => $toast.remove(), 400);
        }, 3000);
    };
    window.isLoggedIn = function () { return Storage.get('loggedInUser') !== null; };
    window.requireAuth = function () {
        if (!isLoggedIn()) { window.location.href = 'index.html'; return false; }
        return true;
    };
    window.logout = function () { Storage.remove('loggedInUser'); window.location.href = 'index.html'; };
    window.generateId = function () { return '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36); };
    function closeAllModals() { $('.modal-overlay').removeClass('active'); }
    $(document).on('click', '.modal-close', function () { closeAllModals(); });
    $(document).on('click', '.modal-overlay', function (e) { if (e.target === this) closeAllModals(); });
    if ($('#loginForm').length) {
        if (isLoggedIn()) { window.location.href = 'clients.html'; return; }
        $('#loginForm').on('submit', function (e) {
            e.preventDefault();
            const username = $('#loginUsername').val().trim();
            const password = $('#loginPassword').val().trim();
            const user = (Storage.get('users') || []).find(u => u.username === username && u.password === password);
            if (user) {
                Storage.set('loggedInUser', { username: user.username });
                window.location.href = 'clients.html';
            } else { showToast('Invalid credentials', 'error'); }
        });
    }
    if ($('#registerForm').length) {
        if (!requireAuth()) return;
        $('#registerForm').on('submit', function (e) {
            e.preventDefault();
            const client = {
                id: generateId(),
                name: $('#clientName').val().trim(),
                email: $('#clientEmail').val().trim(),
                phone: $('#clientPhone').val().trim(),
                notes: $('#clientNotes').val().trim(),
                photo: '',
                createdAt: new Date().toISOString()
            };
            const clients = Storage.get('clients') || [];
            clients.push(client);
            Storage.set('clients', clients);
            showToast('Client registered!', 'success');
            setTimeout(() => { window.location.href = 'clients.html'; }, 800);
        });
    }
    if ($('#clientsTableBody').length || $('#upcomingSessionsTableBody').length) {
        if (!requireAuth()) return;
        function renderClients() {
            const clients = Storage.get('clients') || [];
            const sessions = Storage.get('sessions') || [];
            const $tbody = $('#clientsTableBody');
            if (!$tbody.length) return;
            $tbody.empty();
            $('#totalClients').text(clients.length);
            $('#totalSessions').text(sessions.length);
            clients.forEach(c => {
                const clientSessions = sessions.filter(s => s.clientId === c.id);
                let totalSpent = 0;
                clientSessions.forEach(s => {
                    if (Array.isArray(s.services)) {
                        s.services.forEach(serv => totalSpent += parseFloat(serv.price) || 0);
                    } else {
                        totalSpent += parseFloat(s.price) || 0;
                    }
                });
                $tbody.append(`
                    <tr data-id="${c.id}">
                        <td>${c.name}</td>
                        <td>${c.email || '—'}</td>
                        <td>${c.phone}</td>
                        <td>${clientSessions.length} (Total: $${totalSpent.toFixed(2)})</td>
                        <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                        <td>
                            <div class="action-btns">
                                <button class="btn btn-outline btn-sm edit-client-btn" data-id="${c.id}"> Edit</button>
                                <button class="btn btn-danger btn-sm delete-client-btn" data-id="${c.id}"> Delete</button>
                            </div>
                        </td>
                    </tr>
                `);
            });
        }
        function renderUpcomingSessions() {
            const sessions = Storage.get('sessions') || [];
            const $tbody = $('#upcomingSessionsTableBody');
            if (!$tbody.length) return;
            $tbody.empty();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const upcoming = sessions.filter(s => {
                const [year, month, day] = s.date.split('-').map(Number);
                const sDate = new Date(year, month - 1, day);
                return sDate >= today;
            }).sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
            if (upcoming.length === 0) {
                $tbody.append('<tr><td colspan="5" class="text-center">No upcoming sessions</td></tr>');
            } else {
                upcoming.forEach(s => {
                    let serviceText = '';
                    let totalPrice = 0;
                    if (Array.isArray(s.services)) {
                        serviceText = s.services.map(ser => ser.name).join(', ');
                        s.services.forEach(ser => totalPrice += parseFloat(ser.price) || 0);
                    } else {
                        serviceText = s.service;
                        totalPrice = parseFloat(s.price) || 0;
                    }
                    $tbody.append(`
                        <tr>
                            <td>${s.clientName}</td>
                            <td>${serviceText}</td>
                            <td>${s.date} at ${s.time}</td>
                            <td>$${totalPrice.toFixed(2)}</td>
                            <td>
                                <button class="btn btn-danger btn-sm del-sess-btn" data-id="${s.id}"></button>
                            </td>
                        </tr>
                    `);
                });
            }
        }
        renderClients();
        renderUpcomingSessions();
        $(document).on('click', '.delete-client-btn', function () {
            const id = $(this).data('id');
            if (confirm('Delete client and all sessions?')) {
                Storage.set('clients', (Storage.get('clients') || []).filter(c => c.id !== id));
                Storage.set('sessions', (Storage.get('sessions') || []).filter(s => s.clientId !== id));
                renderClients();
                renderUpcomingSessions();
            }
        });
        $(document).on('click', '.edit-client-btn', function () {
            const client = Storage.get('clients').find(c => c.id === $(this).data('id'));
            if (!client) return;
            $('#editClientId').val(client.id);
            $('#editClientName').val(client.name);
            $('#editClientEmail').val(client.email);
            $('#editClientPhone').val(client.phone);
            $('#editClientNotes').val(client.notes);
            $('#editModal').addClass('active');
        });
        $('#editClientForm').on('submit', function (e) {
            e.preventDefault();
            const clients = Storage.get('clients');
            const idx = clients.findIndex(c => c.id === $('#editClientId').val());
            if (idx !== -1) {
                clients[idx].name = $('#editClientName').val();
                clients[idx].email = $('#editClientEmail').val();
                clients[idx].phone = $('#editClientPhone').val();
                clients[idx].notes = $('#editClientNotes').val();
                Storage.set('clients', clients);
                closeAllModals();
                renderClients();
                showToast('Client updated!', 'success');
            }
        });
    }
    if ($('#bookingForm').length) {
        if (!requireAuth()) return;
        const clients = Storage.get('clients') || [];
        const $select = $('#bookingClient');
        clients.forEach(c => $select.append(`<option value="${c.id}" data-phone="${c.phone}">${c.name}</option>`));
        $select.on('change', function () { $('#bookingPhone').val($(this).find(':selected').data('phone') || ''); });
        $('#addServiceBtn').on('click', function() {
            const row = `
                <div class="service-row">
                    <div class="form-group" style="flex: 2; margin-bottom: 0;">
                        <label>Service</label>
                        <select class="form-control service-select" required>
                            <option value="">— Select Service —</option>
                            <option value="Eyebrows">Eyebrows</option>
                            <option value="Nails">Nails</option>
                            <option value="Makeup">Makeup</option>
                            <option value="Haircut">Haircut</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex: 1; margin-bottom: 0;">
                        <label>Price ($)</label>
                        <input type="number" class="form-control service-price" placeholder="0.00" step="0.01" required>
                    </div>
                    <div class="remove-service">&times;</div>
                </div>
            `;
            $('#servicesContainer').append(row);
        });
        $(document).on('click', '.remove-service', function() { $(this).parent().remove(); });
        $('#bookingForm').on('submit', function (e) {
            e.preventDefault();
            const services = [];
            $('.service-row').each(function() {
                services.push({
                    name: $(this).find('.service-select').val(),
                    price: $(this).find('.service-price').val()
                });
            });
            const sessions = Storage.get('sessions') || [];
            sessions.push({
                id: generateId(),
                clientId: $('#bookingClient').val(),
                clientName: $('#bookingClient option:selected').text(),
                services: services,
                date: $('#bookingDate').val(),
                time: $('#bookingTime').val(),
                description: $('#bookingDescription').val() || ''
            });
            Storage.set('sessions', sessions);
            showToast('Session booked!', 'success');
            setTimeout(() => { window.location.href = 'clients.html'; }, 800);
        });
    }
    if ($('#sessionsTableBody').length) {
        if (!requireAuth()) return;
        function renderManageSessions() {
            let sessions = Storage.get('sessions') || [];
            sessions.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
            const $tbody = $('#sessionsTableBody');
            $tbody.empty();
            sessions.forEach(s => {
                let serviceText = Array.isArray(s.services) ? s.services.map(ser => ser.name).join(', ') : s.service;
                let totalPrice = 0;
                if (Array.isArray(s.services)) {
                    s.services.forEach(ser => totalPrice += parseFloat(ser.price) || 0);
                } else {
                    totalPrice = parseFloat(s.price) || 0;
                }
                $tbody.append(`
                    <tr>
                        <td>${s.clientName}</td>
                        <td>${serviceText}</td>
                        <td>${s.date} at ${s.time}</td>
                        <td>$${totalPrice.toFixed(2)}</td>
                        <td>
                            <div class="action-btns">
                                <button class="btn btn-danger btn-sm del-sess-btn" data-id="${s.id}"></button>
                            </div>
                        </td>
                    </tr>
                `);
            });
        }
        renderManageSessions();
    }
    $(document).on('click', '.del-sess-btn', function () {
        if (confirm('Delete session?')) {
            Storage.set('sessions', Storage.get('sessions').filter(s => s.id !== $(this).data('id')));
            if (typeof renderManageSessions === 'function') renderManageSessions();
            if (typeof renderUpcomingSessions === 'function') renderUpcomingSessions();
            if (typeof renderClients === 'function') renderClients();
        }
    });
    $(document).on('click', '#logoutBtn', function (e) { e.preventDefault(); logout(); });
});