document.addEventListener('DOMContentLoaded', () => {
    // Get elements
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = new bootstrap.Modal(document.getElementById('logoutModal'));
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

    // Show the modal when logout button is clicked
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logoutModal.show();
        });
    }

    // Handle the logout confirmation
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', () => {
            // Perform the logout action here
            console.log('User logged out.');

            // Optionally hide the modal if it doesn't hide automatically
            logoutModal.hide();

            // Redirect to login page or another page after logout
            window.location.href = '/login'; // Replace with your actual login page URL
        });
    }
});
