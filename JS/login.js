document.addEventListener('DOMContentLoaded', function () {
    // Function to set up password toggle
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

    // Call the function with the appropriate IDs
    setupPasswordToggle('togglePassword', 'password');

    // Function to handle forgot password link
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent the default link behavior
            window.location.href = 'forgot password.html'; // Redirect to the forgot password page
        });
    }

    // Function to handle register link
    const registerLink = document.getElementById('registerLink');
    if (registerLink) {
        registerLink.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent the default link behavior
            window.location.href = 'reg.html'; // Redirect to the registration page
        });
    }

    // Form validation
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    form.addEventListener('submit', function (event) {
        let valid = true;

        // Clear previous errors
        emailError.textContent = '';
        passwordError.textContent = '';

        // Email validation
        const emailValue = emailInput.value.trim();
        if (!emailValue) {
            emailError.textContent = 'Email is required.';
            valid = false;
        } else if (!validateEmail(emailValue)) {
            emailError.textContent = 'Please enter a valid email address.';
            valid = false;
        }

        // Password validation
        const passwordValue = passwordInput.value.trim();
        if (!passwordValue) {
            passwordError.textContent = 'Password is required.';
            valid = false;
        } else if (passwordValue.length < 6) {
            passwordError.textContent = 'Password must be at least 6 characters long.';
            valid = false;
        }

        // Prevent form submission if not valid
        if (!valid) {
            event.preventDefault();
        }
    });

    // Email validation function
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
});
