const firebaseConfig = {
    apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
    authDomain: "authentication-d6496.firebaseapp.com",
    projectId: "authentication-d6496",
    storageBucket: "authentication-d6496.appspot.com",
    messagingSenderId: "195867894399",
    appId: "1:195867894399:web:596fb109d308aea8b6154a"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let applicantsData = []; // Global variable to store the fetched applicants
let currentPage = 1; // Tracks the current page
const itemsPerPage = 10; // Number of items to display per page
let totalPages = 1; // Total number of pages

// Function to render applicants based on the current page
function renderApplicants() {
    const contentElement = document.querySelector('.applicant-list');
    contentElement.innerHTML = '';

    if (applicantsData.length === 0) {
        const noDataHtml = `
            <tr class="table-row">
                <td colspan="4" class="table-row-content text-center">No student/s yet</td>
            </tr>
        `;
        contentElement.insertAdjacentHTML('beforeend', noDataHtml);
        document.getElementById('loader1').style.display = 'none';
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedApplicants = applicantsData.slice(start, end);

    paginatedApplicants.forEach(applicant => {
        const personalInfo = applicant.personalInfo || {};
        const firstName = personalInfo.first || 'N/A';
        const lastName = personalInfo.last || 'N/A';

        const rowHtml = `
            <tr class="table-row">
                <td class="table-row-content">${firstName} ${lastName}</td>
                <td class="table-row-content">${applicant.email}</td>
                <td class="table-row-content">${applicant.phoneNumber}</td>
                <td class="table-row-content">
                    <button class="btn btn-primary btn-sm send-sms-btn" data-email="${applicant.email}">Send Email</button>
                </td>
            </tr>
        `;
        contentElement.insertAdjacentHTML('beforeend', rowHtml);
    });

    // Add event listeners for "Send Email" buttons
    document.querySelectorAll('.send-sms-btn').forEach(button => {
        button.addEventListener('click', function() {
            const email = this.getAttribute('data-email');
            const fromValue = "DriveHub"; // Static 'From' value
            const toName = this.closest('tr').querySelector('td').innerText; // Assuming the first 'td' contains the recipient's name

            // Set the "From" field with the value "DriveHub"
            document.getElementById('sms-from').value = fromValue;

            // Set the "To" field with the selected email
            document.getElementById('sms-to').value = email;

            // Show the modal
            $('#smsModal').modal('show');

            // Add event listener to the "Send Email" button in the modal
            document.getElementById('sendSmsBtn').addEventListener('click', function() {
                const message = document.getElementById('sms-message').value;

                // Send email using EmailJS
                emailjs.send('service_1qj2kjd', 'template_4f786fk', {
                    from_name: fromValue,  // From 'DriveHub'
                    to_name: toName,       // To recipient's name
                    to_email: email,       // To recipient's email (dynamically passed)
                    message: message       // The message from the modal
                })
                .then(function(response) {
                    // Instead of alert, show notification modal on success
                    document.getElementById('notificationModalBody').innerText = 'Email sent successfully!';
                    $('#notificationModal').modal('show'); // Show the modal
                    $('#smsModal').modal('hide'); // Close the SMS modal after success
                }, function(err) {
                    // Instead of alert, show notification modal on error
                    document.getElementById('notificationModalBody').innerText = 'Failed to send email. Error: ' + JSON.stringify(err);
                    $('#notificationModal').modal('show'); // Show the modal
                });
            }, { once: true }); // Ensure event listener is only added once

        });
    });

    document.getElementById('loader1').style.display = 'none';
}

// Function to update pagination controls
function updatePaginationControls() {
    const paginationControls = document.querySelector('.applicant-pagination-controls');
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

// Function to filter applicants based on search input
function searchApplicants() {
    const searchInput = document.querySelector('.search').value.toLowerCase();

    if (searchInput.trim() === '') {
        // If search input is empty, revert to the full list of applicants
        totalPages = Math.ceil(applicantsData.length / itemsPerPage);
        currentPage = 1; // Reset to the first page
        renderApplicants(); // Render the full list of applicants
        updatePaginationControls(); // Update the pagination controls for the full list
        return; // Exit the function early since there's no filtering needed
    }

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

// Function to render filtered applicants based on the current page
function renderFilteredApplicants(filteredApplicants) {
    const contentElement = document.querySelector('.applicant-list');
    contentElement.innerHTML = '';

    // Check if there are no matching students after search
    if (filteredApplicants.length === 0) {
        const noResultsHtml = `
            <tr class="table-row">
                <td colspan="4" class="table-row-content text-center">No student/s found</td>
            </tr>
        `;
        contentElement.insertAdjacentHTML('beforeend', noResultsHtml);
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedApplicants = filteredApplicants.slice(start, end);

    paginatedApplicants.forEach(applicant => {
        const personalInfo = applicant.personalInfo || {};
        const firstName = personalInfo.first || 'N/A';
        const lastName = personalInfo.last || 'N/A';

        const rowHtml = `
            <tr class="table-row">
                <td class="table-row-content">${firstName} ${lastName}</td>
                <td class="table-row-content">${applicant.email}</td>
                <td class="table-row-content">${applicant.phoneNumber}</td>
                <td class="table-row-content">
                    <button class="btn btn-primary btn-sm send-sms-btn" data-phone="${applicant.phoneNumber}">Send SMS</button>
                </td>
            </tr>
        `;
        contentElement.insertAdjacentHTML('beforeend', rowHtml);
    });

    // Add event listeners for "Send SMS" buttons
    document.querySelectorAll('.send-sms-btn').forEach(button => {
        button.addEventListener('click', function() {
            const phoneNumber = this.getAttribute('data-phone');
            const fromValue = "DriveHub"; // You can set this value dynamically or keep it static
    
            // Set the "From" field with the value "DriveHub"
            document.getElementById('sms-from').value = fromValue;
    
            // Set the "To" field with the selected phone number
            document.getElementById('sms-to').value = phoneNumber;
    
            // Show the modal
            $('#smsModal').modal('show');
        });
    });
}

// Real-time listener for applicants collection
function setupRealTimeListener() {
    // Show loader while data is being fetched
    document.getElementById('loader1').style.display = 'flex';

    db.collection('applicants').onSnapshot((snapshot) => {
        applicantsData = [];

        snapshot.forEach((doc) => {
            const applicant = doc.data();
            if (applicant.role === 'applicant') {
                applicantsData.push(applicant);
            }
        });

        totalPages = Math.ceil(applicantsData.length / itemsPerPage);
        currentPage = 1; // Reset to the first page on data update
        renderApplicants();
        updatePaginationControls();
    }, (error) => {
    });
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
