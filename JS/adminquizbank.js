        // Select All functionality
        document.querySelectorAll('.select-all-checkbox').forEach((selectAllCheckbox) => {
            selectAllCheckbox.addEventListener('change', function() {
                const category = this.name.split('_')[2]; // Extract category number
                const checkboxes = document.querySelectorAll(`input[name^='select_c${category}']`);

                checkboxes.forEach((checkbox) => {
                    checkbox.checked = this.checked;
                });
            });
        });

        // Get modal elements
const publishButton = document.querySelector('.publish-btn');
const publishModal = document.getElementById('publishModal');
const warningModal = document.getElementById('warningModal');
const closeModalButtons = document.querySelectorAll('#closeModal');
const closeWarningModalButtons = document.querySelectorAll('#closeWarningModal');

// Function to check if any checkbox is selected in all categories
function checkCheckboxes() {
    const checkboxes = document.querySelectorAll('.quiz-option, .question-checkbox'); // Select all relevant checkboxes
    let isChecked = false;
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            isChecked = true; // If at least one checkbox is checked
        }
    });
    return isChecked;
}

// Show modal when the publish button is clicked
publishButton.addEventListener('click', function() {
    if (checkCheckboxes()) {
        publishModal.style.display = 'block'; // Show the publish confirmation modal
    } else {
        warningModal.style.display = 'block'; // Show the warning modal
    }
});

// Hide modals when close buttons are clicked
closeModalButtons.forEach(button => {
    button.addEventListener('click', function() {
        publishModal.style.display = 'none';
    });
});

closeWarningModalButtons.forEach(button => {
    button.addEventListener('click', function() {
        warningModal.style.display = 'none';
    });
});

// Optional: Hide modals when clicking outside of the modal content
window.addEventListener('click', function(event) {
    if (event.target === publishModal) {
        publishModal.style.display = 'none';
    }
    if (event.target === warningModal) {
        warningModal.style.display = 'none';
    }
});

// Handle confirm action for publishing (add your logic here)
document.querySelector('.btn-primary').addEventListener('click', function() {
    // Add your publish logic here
    console.log('Quiz published!'); // Example action
    publishModal.style.display = 'none'; // Close the publish modal
});