document.addEventListener('DOMContentLoaded', function () {
    // Set up password toggle functionality
    function setupPasswordToggle(toggleId, passwordId) {
        const togglePassword = document.getElementById(toggleId);
        if (togglePassword) {
            togglePassword.addEventListener('click', function () {
                const passwordInput = document.getElementById(passwordId);
                const icon = this.querySelector('i');
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            });
        }
    }
    // Call setupPasswordToggle function
    setupPasswordToggle('togglePassword', 'password');
    // Function to handle login link
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
        loginLink.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent the default link behavior
            window.location.href = 'login.html'; // Redirect to the login page
        });
    }
});
