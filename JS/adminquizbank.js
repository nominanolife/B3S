document.addEventListener('DOMContentLoaded', function () {
    // Select All functionality for each category
    document.querySelectorAll('.select-all-checkbox').forEach((selectAllCheckbox) => {
        selectAllCheckbox.addEventListener('change', function() {
            const category = this.name.split('_')[2]; // Extract category number
            const checkboxes = document.querySelectorAll(`input[name^='select_c${category}']`);

            // Check or uncheck all checkboxes based on the state of selectAll checkbox
            checkboxes.forEach((checkbox) => {
                checkbox.checked = this.checked;
            });
        });
    });

    // Handle "selectAll0" separately to check all other checkboxes across categories
    const selectAll0 = document.querySelector('input[name="selectAll0"]');
    if (selectAll0) {
        selectAll0.addEventListener('change', function() {
            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            allCheckboxes.forEach((checkbox) => {
                checkbox.checked = this.checked; // Check/uncheck all checkboxes based on the state of selectAll0
            });
        });
    }

    // Get modal elements
    const publishButton = document.querySelector('.publish-btn');
    const confirmationModalElement = document.getElementById('confirmationModal');
    let confirmationModal;
    
    // Make sure the modal and button exist before attaching event listeners
    if (confirmationModalElement) {
        confirmationModal = new bootstrap.Modal(confirmationModalElement);
    }

    if (publishButton && confirmationModal) {
        // Show confirmation modal when the publish button is clicked
        publishButton.addEventListener('click', function() {
            // Add the confirmation message inside the modal body
            document.getElementById('confirmationModalBody').innerHTML = "<p>Are you sure you want to publish this?</p>";

            // Show the confirmation modal
            confirmationModal.show();
        });
    }

    // Handle the confirm button click inside the confirmation modal
    const confirmButton = document.getElementById('confirmButton');
    if (confirmButton && confirmationModal) {
        confirmButton.addEventListener('click', function() {
            console.log('Quiz published!');
            confirmationModal.hide(); // Close the confirmation modal
        });
    }
});