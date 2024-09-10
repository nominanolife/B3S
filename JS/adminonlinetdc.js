document.addEventListener('DOMContentLoaded', function() {
    const uploadContainer = document.getElementById('uploadContainer');
    const nextButton = document.querySelector('.modal-footer .next-btn');
    const steps = ['step1', 'step2', 'step3'];
    let currentStep = 0;

    // Show the upload modal when the upload container is clicked
    uploadContainer.addEventListener('click', function() {
        $('#uploadModal').modal('show');
    });

    // Function to show the current step
    function showStep(stepIndex) {
        // Hide all steps
        steps.forEach(step => {
            document.getElementById(step).classList.add('d-none');
        });
        // Show the current step
        document.getElementById(steps[stepIndex]).classList.remove('d-none');

        // Update the buttons based on the current step
        updateButtonVisibility(stepIndex);
    }

    // Function to update button visibility and text based on step
    function updateButtonVisibility(stepIndex) {
        const backButton = document.querySelector('.modal-footer .back-btn');
        const nextButton = document.querySelector('.modal-footer .next-btn');
        const saveButton = document.querySelector('.modal-footer .save-btn');

        backButton.style.display = stepIndex > 0 ? 'inline-block' : 'none'; // Show back button if not on first step
        nextButton.style.display = stepIndex < steps.length - 1 ? 'inline-block' : 'none'; // Show next button if not on last step
        saveButton.style.display = stepIndex === steps.length - 1 ? 'inline-block' : 'none'; // Show save button only on the last step
    }

    // Next button event listener
    nextButton.addEventListener('click', function() {
        if (currentStep < steps.length - 1) {
            currentStep++;
            showStep(currentStep);
        }
    });

    // Back button event listener
    document.querySelector('.modal-footer .back-btn').addEventListener('click', function() {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });

    // Initialize the first step
    showStep(currentStep);
});

document.addEventListener('DOMContentLoaded', function () {
    // Get all triple dot icons
    const tripleDotIcons = document.querySelectorAll('.bi-three-dots-vertical');

    // Add event listener to each icon
    tripleDotIcons.forEach(icon => {
        icon.addEventListener('click', function (event) {
            // Toggle the visibility of the associated dropdown
            const options = this.nextElementSibling;
            options.style.display = options.style.display === 'block' ? 'none' : 'block';
        });
    });

    // Close the options if clicked outside
    window.addEventListener('click', function (event) {
        if (!event.target.matches('.bi-three-dots-vertical')) {
            const dropdowns = document.querySelectorAll('.triple-dot-options');
            dropdowns.forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        }
    });
});