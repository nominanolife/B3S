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

// Function to fetch and display applicants
async function fetchApplicants() {
    const contentElement = document.querySelector('.applicant-list');

    try {
        const querySnapshot = await db.collection('applicants').get();
        applicantsData = [];

        querySnapshot.forEach((doc) => {
            const applicant = doc.data();
            if (applicant.role === 'applicant') {
                applicantsData.push(applicant);
            }
        });

        totalPages = Math.ceil(applicantsData.length / itemsPerPage);
        renderApplicants();
        updatePaginationControls();
    } catch (error) {
        console.error("Error fetching applicants: ", error);
    }
}

// Function to render applicants based on the current page
function renderApplicants() {
    const contentElement = document.querySelector('.applicant-list');
    contentElement.innerHTML = '';

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
                <td class="table-row-content"><i class="bi bi-three-dots"></i></td>
            </tr>
        `;
        contentElement.insertAdjacentHTML('beforeend', rowHtml);
    });
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
                <td class="table-row-content"><i class="bi bi-three-dots"></i></td>
            </tr>
        `;
        contentElement.insertAdjacentHTML('beforeend', rowHtml);
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

    // Fetch and display applicants on page load
    fetchApplicants();
});
