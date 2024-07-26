document.addEventListener('DOMContentLoaded', function () {
    // Define form-related variables
    const form = document.querySelector('.login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const createAccountBtn = document.querySelector('.login-btn');

    // Function to validate email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Function to enable/disable button based on validation
    function validateForm() {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const isFormValid = email && password && isValidEmail(email);
  
    }

    // Function to show an error message
    function showError() {
        alert('Please fill in all required fields with valid information.');
    }

    // Handle form submission
    form.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent default form submission

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (email && password && isValidEmail(email)) {
            window.location.href = 'number input.html'; // Redirect on valid form
        } else {
            showError(); // Show error message if form is invalid
        }
    });

    // Initial validation check
    validateForm();

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

    // Event listeners for input changes
    emailInput.addEventListener('input', validateForm);
    passwordInput.addEventListener('input', validateForm);

    
    // Function to handle login link
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
        loginLink.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent the default link behavior
            window.location.href = 'login.html'; // Redirect to the login page
        });
    }
});
