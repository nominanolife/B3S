document.addEventListener('DOMContentLoaded', function () {
    // Function to handle form submission
    const form = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('emailError');

    form.addEventListener('submit', function (event) {
        let valid = true;

        // Clear previous error
        emailError.textContent = '';

        // Email validation
        const emailValue = emailInput.value.trim();
        if (!emailValue) {
            emailError.textContent = 'Email is required.';
            valid = false;
        } else if (!validateEmail(emailValue)) {
            emailError.textContent = 'Please enter a valid email address.';
            valid = false;
        }
    });

    // Email validation function
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
});
