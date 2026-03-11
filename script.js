/////
// GLOBAL STATE

let currentUser = null;
// Example structure later:
// currentUser = { username: "juan", role: "admin" | "user" };
const STORAGE_KEY = "ipt_demo_v1";



// NAVIGATION HELPER

function navigateTo(hash) {
    window.location.hash = hash;
}



// ROUTING LOGIC

function handleRouting() {
    let hash = window.location.hash;

    if (!hash) {
        hash = "#/";
        navigateTo(hash);
        return;
    }

    const routes = {
        "#/": "home-page",
        "#/login": "login-page",
        "#/register": "register-page",
        "#/verify-email": "verify-page",
        "#/profile": "profile-page",
        "#/accounts": "accounts-page",
        "#/departments": "departments-page",
        "#/employees": "employees-page",
        "#/requests": "requests-page"
    };

    const protectedRoutes = [
        "#/profile",
        "#/requests"
    ];

    const adminRoutes = [
        "#/accounts",
        "#/departments",
        "#/employees"
    ];

    // 🔐 Block unauthenticated users
    if (protectedRoutes.includes(hash) && !currentUser) {
        showToast("Please login first", "warning");
        navigateTo("#/login");
        return;
    }

    // 👑 Block non-admin
    if (adminRoutes.includes(hash)) {
        if (!currentUser || currentUser.role !== "admin") {
            showToast("Access denied", "danger");
            navigateTo("#/");
            return;
        }
    }

    // Hide all pages
    document.querySelectorAll(".page")
        .forEach(p => p.classList.remove("active"));

    // Show correct page
    const pageId = routes[hash] || "home-page";
    document.getElementById(pageId).classList.add("active");

    // Page-specific rendering
    if (hash === "#/profile") renderProfile();
    if (hash === "#/accounts") renderAccountsList();
    if (hash === "#/departments") renderDepartmentsTable();
    if (hash === "#/employees") renderEmployeesTable();
    if (hash === "#/requests") renderMyRequests();

    
}



// EVENT LISTENERS

window.addEventListener("hashchange", handleRouting);
window.addEventListener("load", () => {
    loadFromStorage();

    const token = localStorage.getItem("auth_token");
    if (token) {
        const user = db.accounts.find(a => a.email === token);
        if (user) setAuthState(true, user);
    }

    handleRouting();
});



// FAKE DATABASE

window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: [] 
};

//Registration Logic 

document.getElementById("registerForm")
.addEventListener("submit", function (e) {
    e.preventDefault();

    const [firstName, lastName, email, password] =
        Array.from(e.target.querySelectorAll("input"))
             .map(i => i.value.trim());

    if (password.length < 6)
        return showToast("Password too short", "danger");

    if (db.accounts.find(a => a.email === email))
        return showToast("Email already exists", "danger");

    db.accounts.push({
        firstName,
        lastName,
        email,
        password,
        role: "user",
        verified: false
    });

    saveToStorage();
    localStorage.setItem("unverified_email", email);

    navigateTo("#/verify-email");
});


window.addEventListener("hashchange", () => {
    if (location.hash === "#/verify") {
        const email = localStorage.getItem("unverified_email");
        const msg = document.getElementById("verifyMessage");
        if (email && msg) {
            msg.textContent = `Verification sent to ${email}`;
        }
    }
});

// Handle verify button
document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "verifyBtn") {
        const email = localStorage.getItem("unverified_email");
        const account = db.accounts.find(acc => acc.email === email);

        if (account) {
            account.verified = true;
            saveToStorage();
            localStorage.removeItem("unverified_email");

            showToast("Email verified successfully!", "success");
            navigateTo("#/login");
        }
    }
});

window.addEventListener("hashchange", () => {
    if (location.hash === "#/verify-email") {
        const email = localStorage.getItem("unverified_email");
        document.getElementById("verifyMessage").textContent =
            `Verification sent to ${email}`;
    }
});


//LOGIN  
document.getElementById("loginForm")
.addEventListener("submit", function (e) {
    e.preventDefault();

    const [email, password] =
        Array.from(e.target.querySelectorAll("input"))
             .map(i => i.value.trim());

    const user = db.accounts.find(a =>
        a.email === email &&
        a.password === password &&
        a.verified === true
    );

    if (!user)
        return showToast("Invalid credentials", "danger");

    localStorage.setItem("auth_token", email);
    setAuthState(true, user);

    navigateTo("#/profile");
}); 


function setAuthState(isAuth, user = null) 
{      
        if (isAuth){
        currentUser = user;
        
        document.body.classList.remove("not-authenticated");
        document.body.classList.add("authenticated");

        if (user.role === "admin")
            document.body.classList.add("is-admin");
        else
            document.body.classList.remove("is-admin");

        
    } else {
        currentUser = null;

        document.body.classList.remove(
            "authenticated",
            "is-admin"
        );

        document.body.classList.add("not-authenticated");
    }}

//lOGOUT 
window.addEventListener("hashchange", () => {
    if (location.hash === "#/logout") {
        localStorage.removeItem("auth_token");
        setAuthState(false);
        navigateTo("#/");
    }
});

//load  
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) throw "No data";

        window.db = JSON.parse(raw);

    } catch {
        window.db = {
            accounts: [
                {
                    firstName: "Admin",
                    lastName: "User",
                    email: "admin@example.com",
                    password: "Password123!",
                    role: "admin",
                    verified: true
                }
            ],
            departments: [
                { id: 1, name: "Engineering", description: "Software team" },
                { id: 2, name: "HR", description: "Human Resources" }
            ],
            employees: [],
            requests: []
        };

        saveToStorage();
    }
}

//Save 
function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}


loadFromStorage();

//Profile Page  
function renderProfile() {
    document.getElementById("profileFullName").textContent =
        `${currentUser.firstName} ${currentUser.lastName}`;

    document.getElementById("profileEmail").textContent =
        currentUser.email;

    document.getElementById("profileRole").textContent =
        currentUser.role;
}


document.getElementById("editProfileBtn").addEventListener("click", () => {
    alert("Edit Profile feature coming soon!");
});


function renderAccountsList() {
    const tbody = document.getElementById("accountsTable");
    tbody.innerHTML = "";

    db.accounts.forEach(user => {
        tbody.innerHTML += `
            <tr>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.verified ? "Yes" : "No"}</td>
                <td>
                    <button class="btn btn-danger btn-sm"
                        onclick="deleteAccount('${user.email}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
}

function editAccount(email) {
    const acc = db.accounts.find(a => a.email === email);
    if (!acc) return;

    const role = prompt("Role (admin/user):", acc.role);
    acc.role = role === "admin" ? "admin" : "user";

    saveToStorage();
    renderAccountsList();
}

function resetPassword(email) {
    const acc = db.accounts.find(a => a.email === email);
    if (!acc) return;

    const pw = prompt("New password (min 6 chars):");
    if (!pw || pw.length < 6) return alert("Invalid password");

    acc.password = pw;
    saveToStorage();
}

function deleteAccount(email) {
    if (email === currentUser.email) {
        return alert("You cannot delete your own account.");
    }

    if (!confirm("Delete this account?")) return;

    db.accounts = db.accounts.filter(a => a.email !== email);
    
    saveToStorage();
    renderAccountsList();
}


function renderDepartmentsTable() {
    const tbody = document.getElementById("departmentsTable");
    tbody.innerHTML = "";

    db.departments.forEach(dep => {
        tbody.innerHTML += `
            <tr>
                <td>${dep.name}</td>
                <td>${dep.description}</td>
                <td>
                    <button class="btn btn-danger btn-sm"
                        onclick="deleteDepartment(${dep.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
}





function renderEmployeesTable() {
    const tbody = document.getElementById("employeesTable");

    if (db.employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center bg-light">
                    No employees.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";

    db.employees.forEach(emp => {
        const user = db.accounts.find(a => a.email === emp.userEmail);
        const dept = db.departments.find(d => d.id === emp.deptId);

        tbody.innerHTML += `
            <tr>
                <td>${emp.id}</td>
                <td>${user ? user.firstName + " " + user.lastName : "-"}</td>
                <td>${emp.position}</td>
                <td>${dept ? dept.name : "-"}</td>
                <td>
                    <button class="btn btn-danger btn-sm"
                        onclick="deleteEmployee('${emp.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;  
    });
}






const requestModal = new bootstrap.Modal(document.getElementById("requestModal"));


document.getElementById("addItemBtn").addEventListener("click", addItemRow);

function addItemRow() {
    const container = document.getElementById("itemsContainer");
    const row = document.createElement("div");
    row.className = "row g-2 mb-2 item-row";
    row.innerHTML = `
        <div class="col-7">
            <input type="text" class="form-control item-name" placeholder="Item name">
        </div>
        <div class="col-3">
            <input type="number" class="form-control item-qty" value="1" min="1">
        </div>
        <div class="col-2 text-end">
            <button class="btn btn-outline-danger btn-sm" onclick="this.parentElement.parentElement.remove()">
                <i class="bi bi-x"></i> &times;
            </button>
        </div>
    `;
    container.appendChild(row);
}






document.getElementById("submitRequestBtn").addEventListener("click", () => {
    const type = document.getElementById("requestType").value;

    const items = [];
    document.querySelectorAll("#itemsContainer .row").forEach(row => {
        const name = row.querySelector(".item-name").value.trim();
        const qty = row.querySelector(".item-qty").value;

        if (name && qty > 0) {
            items.push({ name, qty: Number(qty) });
        }
    });

    if (items.length === 0) {
        alert("Please add at least one item.");
        return;
    }

    db.requests.push({
        id: Date.now(),
        type,
        items,
        status: "Pending",
        date: new Date().toLocaleDateString(),
        employeeEmail: currentUser.email
    });

    saveToStorage();
    requestModal.hide();
    renderMyRequests();
});


function renderMyRequests() {
    const container = document.getElementById("requestsTable");

    const myRequests = db.requests.filter(
        r => r.employeeEmail === currentUser.email
    );

    if (myRequests.length === 0) {
        container.innerHTML = "<p>No requests yet.</p>";
        return;
    }

    let html = `
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    myRequests.forEach(r => {
        const badge =
            r.status === "Approved" ? "success" :
            r.status === "Rejected" ? "danger" :
            "warning";

        html += `
            <tr>
                <td>${r.date}</td>
                <td>${r.type}</td>
                <td>
                    ${r.items.map(i => `${i.name} (${i.qty})`).join("<br>")}
                </td>
                <td>
                    <span class="badge bg-${badge}">
                        ${r.status}
                    </span>
                </td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
}


function showToast(message, type = "info") {
    const toastEl = document.getElementById("appToast");
    const body = toastEl.querySelector(".toast-body");

    toastEl.className = `toast align-items-center text-bg-${type}`;
    body.textContent = message;

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
};




function renderVerifyEmail() {
    const container = document.getElementById("verify-email-page");
    container.innerHTML = `
        <div class="container mt-5">
            <h2>Verify Your Email</h2>
            <div class="alert alert-success d-flex align-items-center" role="alert">
                <span class="me-2">✅</span> A verification link has been sent to your email.
            </div>
            <p class="text-muted">For demo purposes, click below to simulate verification:</p>
            <div class="d-flex gap-2">
                <button class="btn btn-success" onclick="simulateVerification()">
                    ✅ Simulate Email Verification
                </button>
                <a href="#/login" class="btn btn-outline-secondary">Go to Login</a>
            </div>
        </div>
    `;
}

// email verification 
function simulateVerification() {
    const email = localStorage.getItem("unverified_email");
    const acc = db.accounts.find(a => a.email === email);

    if (!acc) return;

    acc.verified = true;
    saveToStorage();

    localStorage.removeItem("unverified_email");

    showToast("Email verified!", "success");
    navigateTo("#/login");
}

function verifyEmail() {
    currentUser.verified = true;
    saveToStorage();
    alert("Email verified successfully!");
    navigateTo('#/profile');
}

function addRequestRow() {
    const tbody = document.getElementById("requestItems");

    tbody.innerHTML += `
        <tr>
            <td><input type="text" class="form-control"></td>
            <td><input type="number" class="form-control" min="1"></td>
            <td>
                <button class="btn btn-danger btn-sm"
                    onclick="this.closest('tr').remove()">
                    X
                </button>
            </td>
        </tr>
    `;
}


function submitRequest() {
    const rows = document.querySelectorAll("#requestItems tr");
    let items = [];

    rows.forEach(row => {
        const inputs = row.querySelectorAll("input");

        if (inputs[0].value && inputs[1].value) {
            items.push({
                item: inputs[0].value,
                qty: inputs[1].value
            });
        }
    });

    if (items.length === 0) {
        showToast("Add at least one item", "warning");
        return;
    }

    db.requests.push({
        id: Date.now(),
        employeeEmail: currentUser.email,
        status: "Pending",
        items,
        date: new Date().toLocaleDateString()
    });

    saveToStorage();
    renderMyRequests();

    bootstrap.Modal.getInstance(
        document.getElementById("requestModal")
    ).hide();
}