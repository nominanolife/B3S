    // Get elements
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = new bootstrap.Modal(document.getElementById('logoutModal'));
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

    // Show the modal when logout button is clicked
    logoutBtn.addEventListener('click', () => {
        logoutModal.show();
    });

    // Handle the logout confirmation
    confirmLogoutBtn.addEventListener('click', () => {
        // Perform the logout action here
        // For example, you might send a request to the server or clear user session
        console.log('User logged out.');

        // Optionally hide the modal if it doesn't hide automatically
        logoutModal.hide();

        // Redirect to login page or another page after logout
        window.location.href = '/login'; // Replace with your actual login page URL
    });