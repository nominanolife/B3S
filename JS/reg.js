
$(document).ready(function() {
    // Show the modal when the page loads with the backdrop static option
    $('#privacyModal').modal({
        backdrop: 'static', // Prevents closing when clicking outside the modal
        keyboard: false      // Prevents closing with the Esc key
    });

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
let lastScrollY = window.scrollY;

window.addEventListener("scroll", () => {
    const navbar = document.querySelector(".navbar-left");
    if (window.scrollY > lastScrollY) {
        // Scrolling down
        navbar.classList.add("navbar-hidden");
    } else {
        // Scrolling up
        navbar.classList.remove("navbar-hidden");
    }
    lastScrollY = window.scrollY;
});
