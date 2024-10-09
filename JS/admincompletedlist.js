let currentPage = 1; // Tracks the current page for pagination
const itemsPerPage = 10; // Number of items to display per page
let totalPages = 1; // Total number of pages

function updatePaginationControls() {
    const paginationControls = document.querySelector('.pagination-controls');
    paginationControls.innerHTML = '';
  
    const prevButton = document.createElement('i');
    prevButton.className = 'bi bi-caret-left';
    if (currentPage === 1) {
      prevButton.classList.add('disabled');
      prevButton.style.opacity = '0.5';
    }
    prevButton.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderStudents();
        updatePaginationControls();
      }
    });
  
    const nextButton = document.createElement('i');
    nextButton.className = 'bi bi-caret-right';
    if (currentPage === totalPages) {
      nextButton.classList.add('disabled');
      nextButton.style.opacity = '0.5';
    }
    nextButton.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderStudents();
        updatePaginationControls();
      }
    });
  
    const pageNumberDisplay = document.createElement('span');
    pageNumberDisplay.className = 'page-number';
    pageNumberDisplay.textContent = `Page ${currentPage} of ${totalPages}`;
  
    paginationControls.appendChild(prevButton);
    paginationControls.appendChild(pageNumberDisplay);
    paginationControls.appendChild(nextButton);
}