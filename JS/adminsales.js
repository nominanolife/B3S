let currentPageSales = 1;
let totalPagesSales = 1;
let allBookingsSales = []; // Assume this is your array of sales bookings

// Items per page
const itemsPerPage = 10;

// Calculate the total number of pages for sales
function calculateTotalPages(type) {
    const totalItems = type === 'sales' ? allBookingsSales.length : allBookingsCancelled.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (type === 'sales') {
        totalPagesSales = totalPages;
    } else {
        totalPagesCancelled = totalPages;
    }
}

// Display sales bookings for the current page
function displayBookings(type) {
    const currentPage = type === 'sales' ? currentPageSales : currentPageCancelled;
    const bookings = type === 'sales' ? allBookingsSales : allBookingsCancelled;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const bookingsToDisplay = bookings.slice(startIndex, endIndex);

    // Clear existing rows
    const tableBody = document.querySelector('.sales-list');
    tableBody.innerHTML = '';

    // Add the rows for the current page
    bookingsToDisplay.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.name}</td>
            <td>${booking.package}</td>
            <td>${booking.paymentStatus}</td>
            <td>${booking.dateOfPayment}</td>
            <td>&#8369; ${booking.amount}</td>
            <td>
                <div class="action-button">
                    <button class="edit-button"><i class="bi bi-pencil-square"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Update pagination controls
    updatePaginationControls(type);
}

// Update pagination controls
function updatePaginationControls(type) {
    const paginationControls = type === 'sales' ? document.querySelector('.sales-pagination-controls') : document.querySelector('.cancelled-pagination-controls');
    const currentPage = type === 'sales' ? currentPageSales : currentPageCancelled;
    const totalPages = type === 'sales' ? totalPagesSales : totalPagesCancelled;

    paginationControls.innerHTML = '';
    paginationControls.classList.add('pagination-controls');

    // Create the previous button
    const prevButton = document.createElement('i');
    prevButton.className = 'bi bi-caret-left';
    if (currentPage === 1) {
        prevButton.classList.add('disabled');
    }
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            if (type === 'sales') {
                currentPageSales--;
            } else {
                currentPageCancelled--;
            }
            displayBookings(type);
            updatePaginationControls(type);
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
            if (type === 'sales') {
                currentPageSales++;
            } else {
                currentPageCancelled++;
            }
            displayBookings(type);
            updatePaginationControls(type);
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

// Initialize sales bookings display
function initSalesBookings() {
    calculateTotalPages('sales');
    displayBookings('sales');
}

// Call the function to initialize sales bookings display
initSalesBookings();

// Function to initialize the edit buttons
function initEditButtons() {
    const editButtons = document.querySelectorAll('.edit-button');
    editButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            // Open the modal
            $('#editSalesModal').modal('show');

            // Optionally populate the modal with the relevant data
            const booking = allBookingsSales[index];
            document.querySelector('.edit-sales-name').value = booking.name;
            document.querySelector('.edit-sales-package').value = booking.package;
            document.querySelector('.edit-sales-payment').value = booking.paymentStatus;
            document.querySelector('.edit-sales-date').value = booking.dateOfPayment;
            document.querySelector('.edit-sales-amount').value = booking.amount;
        });
    });
}

// Update the displayBookings function to include the initEditButtons call
function displayBookings(type) {
    const currentPage = type === 'sales' ? currentPageSales : currentPageCancelled;
    const bookings = type === 'sales' ? allBookingsSales : allBookingsCancelled;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const bookingsToDisplay = bookings.slice(startIndex, endIndex);

    // Clear existing rows
    const tableBody = document.querySelector('.sales-list');
    tableBody.innerHTML = '';

    // Add the rows for the current page
    bookingsToDisplay.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.name}</td>
            <td>${booking.package}</td>
            <td>${booking.paymentStatus}</td>
            <td>${booking.dateOfPayment}</td>
            <td>&#8369; ${booking.amount}</td>
            <td>
                <div class="action-button">
                    <button class="edit-button"><i class="bi bi-pencil-square"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Re-initialize edit buttons
    initEditButtons();

    // Update pagination controls
    updatePaginationControls(type);
}

// Call the function to initialize sales bookings display
initSalesBookings();
