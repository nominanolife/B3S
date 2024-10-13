let currentPage = 1; // Tracks the current page
const itemsPerPage = 10; // Number of items to display per page
let totalPages = 1; // Total number of pages

// Function to filter applicants based on search input
function searchApplicants() {
    const searchInput = document.querySelector('.search').value.toLowerCase();
    const filteredApplicants = applicantsData.filter(applicant => {
        const name = `${applicant.personalInfo?.first || ''} ${applicant.personalInfo?.last || ''}`.toLowerCase();
        const email = applicant.email.toLowerCase();
        const phone = applicant.phoneNumber.toLowerCase();

        return name.includes(searchInput) || email.includes(searchInput) || phone.includes(searchInput);
    });

    // Update pagination for filtered results
    totalPages = Math.ceil(filteredApplicants.length / itemsPerPage);
    currentPage = 1; // Reset to the first page after filtering
    renderFilteredApplicants(filteredApplicants);
    updatePaginationControls();
}

document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.button-right');
    const searchInput = document.querySelector('.search');

    buttons.forEach(button => {
        button.addEventListener('click', function() {
            buttons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Attach event listener to search input
    searchInput.addEventListener('input', searchApplicants);

    // Set up real-time listener to automatically fetch and display applicants when there's a change
    setupRealTimeListener();
});

// Function to update pagination controls
function updatePaginationControls() {
    const paginationControls = document.querySelector('.quizpassed-pagination-controls');
    paginationControls.innerHTML = '';

    // Create the previous button
    const prevButton = document.createElement('i');
    prevButton.className = 'bi bi-caret-left';
    if (currentPage === 1) {
        prevButton.classList.add('disabled');
    }
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderApplicants();
            updatePaginationControls();
        }
    });

    // Create the next button
    const nextButton = document.createElement('i');
    nextButton.className = 'bi bi-caret-right';
    if (currentPage === totalPages) {
        nextButton.classList.add('disabled');
    }
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderApplicants();
            updatePaginationControls();
        }
    });

    // Create the page number display
    const pageNumberDisplay = document.createElement('span');
    pageNumberDisplay.className = 'page-number';
    pageNumberDisplay.textContent = `Page ${currentPage} of ${totalPages}`;

    paginationControls.appendChild(prevButton);
    paginationControls.appendChild(pageNumberDisplay);
    paginationControls.appendChild(nextButton);
}