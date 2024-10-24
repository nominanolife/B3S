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
$(document).ready(function() {
    // Show the modal when the page loads
    $('#privacyModal').modal('show'); 
    
    const checkbox = document.getElementById('agreeCheckbox');
    const saveBtn = document.querySelector('.save-btn');

    // Disable the button initially
    saveBtn.disabled = true;

    // Add an event listener to the checkbox
    checkbox.addEventListener('change', function () {
        // Enable the button if the checkbox is checked, otherwise disable it
        saveBtn.disabled = !this.checked;
    });

    // Redirect to index.html when the 'Decline' button is clicked
    document.getElementById('declineButton').addEventListener('click', function() {
        window.location.href = 'index.html'; // Redirects to index.html
    });

    // Close the modal when the 'Accept' button is clicked
    saveBtn.addEventListener('click', function() {
        // Check if the modal is initialized
        if ($('#privacyModal').hasClass('show')) {
            $('#privacyModal').modal('hide'); // Hide the modal
        }
    });
});
