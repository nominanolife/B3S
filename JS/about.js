// Redirect function for login options
function redirectToLogin(page) {
    window.location.href = page;
}

// Redirecting to Registration page
document.addEventListener('DOMContentLoaded', function() {
    var registerButton = document.getElementById('registerButton');
    registerButton.addEventListener('click', function() {
        redirectToLogin('reg.html');
    });
});

// Show login modal on button click
document.addEventListener('DOMContentLoaded', function() {
    var loginButton = document.getElementById('loginButton');
    loginButton.addEventListener('click', function() {
        $('#loginModal').modal('show');
    });
});