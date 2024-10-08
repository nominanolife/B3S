const paginationControls = document.querySelector('.pagination-controls');

let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 10;

$(document).ready(function(){
    $('[data-toggle="popover"]').popover();
});

document.addEventListener('DOMContentLoaded', function() {
    // Attach click event listener to each "Switch Instructor" button
    document.querySelectorAll('.switch-instructor').forEach(function(item) {
        item.addEventListener('click', function() {
            // Open the modal (optional, if you want to control it manually)
            $('#assigninstructormodal').modal('show');
        });
    });
});

function updatePaginationControls() {
    paginationControls.innerHTML = '';

    // Previous button
    const prevButton = document.createElement('i');
    prevButton.className = 'bi bi-caret-left';
    if (currentPage === 1) {
        prevButton.classList.add('disabled');
    }
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderInstructors();
            updatePaginationControls();
        }
    });

    // Next button
    const nextButton = document.createElement('i');
    nextButton.className = 'bi bi-caret-right';
    if (currentPage === totalPages) {
        nextButton.classList.add('disabled');
    }
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderInstructors();
            updatePaginationControls();
        }
    });

    // Page number display
    const pageNumberDisplay = document.createElement('span');
    pageNumberDisplay.className = 'page-number';
    pageNumberDisplay.textContent = `Page ${currentPage} of ${totalPages}`;

    paginationControls.appendChild(prevButton);
    paginationControls.appendChild(pageNumberDisplay);
    paginationControls.appendChild(nextButton);
}

// Initialize pagination controls after DOM is fully loaded
document.addEventListener('DOMContentLoaded', updatePaginationControls);

document.addEventListener('DOMContentLoaded', function() {
    let assignedButton = null; // Variable to track the currently assigned button

    // Attach click event listener to each "Switch" button
    document.querySelectorAll('.custom-btn').forEach(function(button) {
        button.addEventListener('click', function() {
            // If there's already an assigned button, revert its text back to "Switch" and remove disabled styles
            if (assignedButton) {
                assignedButton.textContent = 'Reassign';
                assignedButton.classList.remove('disabled-button'); // Remove custom disabled style
                assignedButton.classList.remove('disabled'); // Remove disabled state
            }

            // Set the current button as the assigned one and add disabled styles
            button.classList.add('disabled-button'); // Add custom disabled style
            button.classList.add('disabled'); // Optionally disable the button

            // Update the assignedButton variable
            assignedButton = button;
        });
    });
});