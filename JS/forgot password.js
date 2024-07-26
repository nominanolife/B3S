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

        // Redirect to verif_email.html if valid
        if (valid) {
            event.preventDefault(); // Prevent the form from submitting normally
            window.location.href = 'verif email.html'; // Redirect to the verification page
        }
    });

    // Email validation function
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
});
