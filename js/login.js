// ==============================================
// LOGIN - Autenticación simple offline
// ==============================================

const DEFAULT_USER = 'admin';
const DEFAULT_PASS_HASH = btoa('1234');

function hashPassword(pwd) {
    return btoa(pwd);
}

function verifyCredentials(user, pwd) {
    return (user === DEFAULT_USER && hashPassword(pwd) === DEFAULT_PASS_HASH);
}

function saveSession(remember) {
    if (remember) {
        localStorage.setItem('it_sesion', 'true');
        localStorage.setItem('it_user', DEFAULT_USER);
        const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem('it_expires', expires);
    } else {
        sessionStorage.setItem('it_sesion', 'true');
        sessionStorage.setItem('it_user', DEFAULT_USER);
    }
}

function clearSession() {
    localStorage.removeItem('it_sesion');
    localStorage.removeItem('it_user');
    localStorage.removeItem('it_expires');
    sessionStorage.removeItem('it_sesion');
    sessionStorage.removeItem('it_user');
}

function isAuthenticated() {
    if (sessionStorage.getItem('it_sesion') === 'true') return true;
    const sesion = localStorage.getItem('it_sesion');
    if (sesion === 'true') {
        const expires = localStorage.getItem('it_expires');
        if (expires && Date.now() < parseInt(expires)) return true;
        else {
            localStorage.removeItem('it_sesion');
            localStorage.removeItem('it_expires');
        }
    }
    return false;
}

function redirectToDashboard() {
    window.location.href = 'dashboard.html';
}

function checkAlreadyLoggedIn() {
    if (isAuthenticated()) redirectToDashboard();
}

document.addEventListener('DOMContentLoaded', function() {
    checkAlreadyLoggedIn();

    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('errorMsg');

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;

        if (!username || !password) {
            errorDiv.textContent = 'Por favor, complete ambos campos.';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (verifyCredentials(username, password)) {
            saveSession(remember);
            redirectToDashboard();
        } else {
            errorDiv.textContent = 'Usuario o contraseña incorrectos.';
            errorDiv.classList.remove('hidden');
            document.getElementById('password').value = '';
        }
    });

    document.getElementById('forgotLink').addEventListener('click', function(e) {
        e.preventDefault();
        errorDiv.textContent = 'Contacte al administrador para restablecer su contraseña.';
        errorDiv.classList.remove('hidden');
    });
});