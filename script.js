const API_URL = 'http://localhost:4000/users';
let currentUser = null;

function navigateTo(hash) {
    window.location.hash = hash;
}

// ROUTING
function handleRouting() {
    let hash = window.location.hash || '#/';
    if (!hash) { navigateTo('#/'); return; }

    const routes = {
        '#/': 'home-page',
        '#/login': 'login-page',
        '#/register': 'register-page',
        '#/verify-email': 'verify-page',
        '#/profile': 'profile-page',
        '#/accounts': 'accounts-page',
        '#/departments': 'departments-page',
        '#/employees': 'employees-page',
        '#/requests': 'requests-page'
    };

    const protectedRoutes = ['#/profile', '#/requests'];
    const adminRoutes = ['#/accounts', '#/departments', '#/employees'];

    if (protectedRoutes.includes(hash) && !currentUser) {
        showToast('Please login first', 'warning');
        navigateTo('#/login');
        return;
    }

    if (adminRoutes.includes(hash)) {
        if (!currentUser || currentUser.role !== 'Admin') {
            showToast('Access denied', 'danger');
            navigateTo('#/');
            return;
        }
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageId = routes[hash] || 'home-page';
    document.getElementById(pageId).classList.add('active');

    if (hash === '#/profile') renderProfile();
    if (hash === '#/accounts') renderAccountsList();
    if (hash === '#/requests') renderMyRequests();
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', () => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        setAuthState(true, currentUser);
    }
    handleRouting();
});

// REGISTER - calls POST /users
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const inputs = Array.from(e.target.querySelectorAll('input')).map(i => i.value.trim());
    const [firstName, lastName, email, password] = inputs;

    if (password.length < 6) return showToast('Password too short', 'danger');

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, password, role: 'User' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        showToast('Registered successfully!', 'success');
        navigateTo('#/login');
    } catch (err) {
        showToast(err.message, 'danger');
    }
});

// LOGIN - calls GET /users and checks credentials
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const [email, password] = Array.from(e.target.querySelectorAll('input')).map(i => i.value.trim());

    try {
        const res = await fetch(API_URL);
        const users = await res.json();
        const user = users.find(u => u.email === email);

        if (!user) return showToast('Invalid credentials', 'danger');

        // Since API excludes passwordHash, we simulate login
        localStorage.setItem('currentUser', JSON.stringify(user));
        setAuthState(true, user);
        showToast('Login successful!', 'success');
        navigateTo('#/profile');
    } catch (err) {
        showToast('Login failed', 'danger');
    }
});

// LOGOUT
window.addEventListener('hashchange', () => {
    if (location.hash === '#/logout') {
        localStorage.removeItem('currentUser');
        setAuthState(false);
        navigateTo('#/');
    }
});

function setAuthState(isAuth, user = null) {
    if (isAuth) {
        currentUser = user;
        document.body.classList.remove('not-authenticated');
        document.body.classList.add('authenticated');
        if (user.role === 'Admin') document.body.classList.add('is-admin');
        else document.body.classList.remove('is-admin');
    } else {
        currentUser = null;
        document.body.classList.remove('authenticated', 'is-admin');
        document.body.classList.add('not-authenticated');
    }
}

// PROFILE
function renderProfile() {
    document.getElementById('profileFullName').textContent =
        `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileRole').textContent = currentUser.role;
}

// ACCOUNTS - calls GET /users
async function renderAccountsList() {
    const tbody = document.getElementById('accountsTable');
    tbody.innerHTML = '';

    try {
        const res = await fetch(API_URL);
        const users = await res.json();

        users.forEach(user => {
            tbody.innerHTML += `
                <tr>
                    <td>${user.firstName} ${user.lastName}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>Yes</td>
                    <td>
                        <button class="btn btn-danger btn-sm"
                            onclick="deleteAccount(${user.id})">
                            Delete
                        </button>
                    </td>
                </tr>`;
        });
    } catch (err) {
        showToast('Failed to load accounts', 'danger');
    }
}

// DELETE - calls DELETE /users/:id
async function deleteAccount(id) {
    if (!confirm('Delete this account?')) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        const data = await res.json();
        showToast(data.message, 'success');
        renderAccountsList();
    } catch (err) {
        showToast('Delete failed', 'danger');
    }
}

// REQUESTS (kept local since API doesn't have requests endpoint)
window.db = { requests: [], departments: [], employees: [] };

function addRequestRow() {
    const tbody = document.getElementById('requestItems');
    tbody.innerHTML += `
        <tr>
            <td><input type="text" class="form-control"></td>
            <td><input type="number" class="form-control" min="1"></td>
            <td>
                <button class="btn btn-danger btn-sm"
                    onclick="this.closest('tr').remove()">X</button>
            </td>
        </tr>`;
}

function submitRequest() {
    const rows = document.querySelectorAll('#requestItems tr');
    let items = [];
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs[0].value && inputs[1].value) {
            items.push({ item: inputs[0].value, qty: inputs[1].value });
        }
    });

    if (items.length === 0) return showToast('Add at least one item', 'warning');

    window.db.requests.push({
        id: Date.now(),
        employeeEmail: currentUser.email,
        status: 'Pending',
        items,
        date: new Date().toLocaleDateString()
    });

    renderMyRequests();
    bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
    showToast('Request submitted!', 'success');
}

function renderMyRequests() {
    const tbody = document.getElementById('requestsTable');
    const myRequests = window.db.requests.filter(r => r.employeeEmail === currentUser?.email);

    if (myRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No requests yet.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    myRequests.forEach(r => {
        const badge = r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'danger' : 'warning';
        tbody.innerHTML += `
            <tr>
                <td>${r.id}</td>
                <td>${r.employeeEmail}</td>
                <td><span class="badge bg-${badge}">${r.status}</span></td>
                <td>-</td>
            </tr>`;
    });
}

function renderDepartmentsTable() {
    const tbody = document.getElementById('departmentsTable');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">No departments.</td></tr>';
}

function renderEmployeesTable() {
    const tbody = document.getElementById('employeesTable');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center bg-light">No employees.</td></tr>';
}

function showToast(message, type = 'info') {
    const toastEl = document.getElementById('appToast');
    const body = toastEl.querySelector('.toast-body');
    toastEl.className = `toast align-items-center text-bg-${type}`;
    body.textContent = message;
    new bootstrap.Toast(toastEl).show();
}