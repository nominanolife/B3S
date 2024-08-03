document.addEventListener("DOMContentLoaded", function() {
    // Get elements
    const addButton = document.getElementById("addButton");
    const packageModal = document.getElementById("packageModal");
    const closeModal = document.querySelector(".close-modal");
    const savePackage = document.querySelector(".save-package");

    // Show modal when "Add Package" button is clicked
    addButton.addEventListener("click", function() {
        packageModal.style.display = "block";
    });

    // Hide modal when "Close" button is clicked
    closeModal.addEventListener("click", function() {
        packageModal.style.display = "none";
    });

    // Hide modal when "Save" button is clicked (You can customize this further)
    savePackage.addEventListener("click", function() {
        packageModal.style.display = "none";
        // You can add additional functionality here to save the package details
    });

    // Hide modal when clicking outside the modal content
    window.addEventListener("click", function(event) {
        if (event.target === packageModal) {
            packageModal.style.display = "none";
        }
    });
});
