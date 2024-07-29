document.addEventListener('DOMContentLoaded', function () {
    // Function to toggle password visibility
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

    // Set up password toggle for each field
    setupPasswordToggle('toggleCurrentPassword', 'current-password');
    setupPasswordToggle('toggleNewPassword', 'new-password');
    setupPasswordToggle('toggleConfirmPassword', 'confirm-password');

    // Function to handle password reset
    function handlePasswordReset() {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword === confirmPassword) {
            alert('Password has been reset successfully!');
            window.location.href = 'login.html'; // Redirect to login or any other page
        } else {
            alert('New Password and Confirm New Password do not match.');
        }
    }

    // Get the reset button and attach a click event listener
    const resetButton = document.querySelector('.login-btn');
    if (resetButton) {
        resetButton.addEventListener('click', function () {
            handlePasswordReset();
        });
    }
});
