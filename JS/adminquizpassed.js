// Firebase configuration and imports for version 10.12.4
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
    authDomain: "authentication-d6496.firebaseapp.com",
    projectId: "authentication-d6496",
    storageBucket: "authentication-d6496.appspot.com",
    messagingSenderId: "195867894399",
    appId: "1:195867894399:web:596fb109d308aea8b6154a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentPage = 1; // Tracks the current page
const itemsPerPage = 10; // Number of items to display per page
let totalPages = 1; // Total number of pages
let passedStudentsData = []; // Stores passed students data

// Function to render passed students to the table
async function renderApplicants() {
    const passedStudentsTable = document.querySelector('.passed-student-list'); 
    passedStudentsTable.innerHTML = ''; // Clear the table before rendering

    // Check if there are no passed students
    if (passedStudentsData.length === 0) {
        // Display the message when there are no students
        const row = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.setAttribute('colspan', '4'); // Span all columns
        noDataCell.textContent = 'No pass student/s yet';
        noDataCell.style.textAlign = 'center'; // Center the message
        row.appendChild(noDataCell);
        passedStudentsTable.appendChild(row);
        return; // Exit the function since there's no data to render
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentItems = passedStudentsData.slice(start, end);

    for (const student of currentItems) {
        try {
            // Fetch the applicant's personal information using the same ID from 'applicants' collection
            const applicantDoc = await getDoc(doc(db, 'applicants', student.id)); // Use the document ID
            if (applicantDoc.exists()) {
                const personalInfo = applicantDoc.data()?.personalInfo || {};
                const firstName = personalInfo.first || ''; 
                const middleName = personalInfo.middle ? ` ${personalInfo.middle}` : '';  // Add space before middle name
                const lastName = personalInfo.last || '';
                const suffix = personalInfo.suffix ? ` ${personalInfo.suffix}` : '';  // Add space before suffix
                const fullName = `${firstName}${middleName} ${lastName}${suffix}`.trim();

                // Store fullName in the student object
                student.fullName = fullName;

                // Create a new row for the table
                const row = document.createElement('tr');

                // Name cell
                const nameCell = document.createElement('td');
                nameCell.textContent = fullName;

                // Date cell (Handling both Firestore Timestamp and ISO string)
                const dateCell = document.createElement('td');
                let date;
                
                if (student.date && student.date.toDate) {
                    // If it's a Firestore Timestamp
                    date = student.date.toDate();
                } else if (student.date && typeof student.date === 'string') {
                    // If it's a string (e.g., ISO format)
                    date = new Date(student.date);
                }
                
                dateCell.textContent = date ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Invalid Date';

                // Percentage cell
                const percentageCell = document.createElement('td');
                const percentage = student.percentage || '0.00';
                percentageCell.textContent = `${percentage}%`;

                // Certificate ID cell
                const certificateIdCell = document.createElement('td');
                certificateIdCell.textContent = student.certificateID || '';

                // Append all cells to the row
                row.appendChild(nameCell);
                row.appendChild(dateCell);
                row.appendChild(percentageCell);
                row.appendChild(certificateIdCell);

                // Append the row to the table
                passedStudentsTable.appendChild(row);
            } else {
                console.warn(`No applicant found for student ID: ${student.id}`);
            }
        } catch (error) {
            console.error('Error fetching applicant details:', error);
        }
    }
}

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

// Set up real-time listener to fetch passed students
function setupRealTimeListener() {
    const userResultsCollection = collection(db, 'userResults');
    const passedStudentsQuery = query(userResultsCollection, where('status', '==', "Pass"));

    // Real-time listener for passed students
    onSnapshot(passedStudentsQuery, (snapshot) => {
        passedStudentsData = [];
        snapshot.forEach(doc => {
            const studentData = { id: doc.id, ...doc.data() }; // Save the document ID
            passedStudentsData.push(studentData);
        });

        // Update pagination and re-render students
        totalPages = Math.ceil(passedStudentsData.length / itemsPerPage);
        currentPage = 1; // Reset to the first page after fetching
        renderApplicants();
        updatePaginationControls();
    });
}

// Search functionality for filtering passed students based on input
function searchApplicants() {
    const searchInput = document.querySelector('.search').value.toLowerCase();

    // If the search input is cleared, re-render the full list of passed students
    if (searchInput.trim() === '') {
        renderApplicants();  // Re-render the full list
        updatePaginationControls(); // Update the pagination controls
        return; // Exit the function
    }

    // Filter the passedStudentsData based on fullName or certificateID
    const filteredStudents = passedStudentsData.filter(student => {
        const name = student.fullName.toLowerCase();
        const certificateID = student.certificateID ? student.certificateID.toLowerCase() : '';

        return name.includes(searchInput) || certificateID.includes(searchInput);
    });

    // Update pagination for filtered results
    totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    currentPage = 1; // Reset to the first page after filtering
    renderFilteredApplicants(filteredStudents);
    updatePaginationControls();
}

// Render filtered students
function renderFilteredApplicants(filteredStudents) {
    const passedStudentsTable = document.querySelector('.passed-student-list'); 
    passedStudentsTable.innerHTML = ''; // Clear the table before rendering

    // If no students are found, display "No student/s found" message
    if (filteredStudents.length === 0) {
        const row = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.setAttribute('colspan', '4'); // Span all columns
        noDataCell.textContent = 'No student/s found';
        noDataCell.style.textAlign = 'center'; // Center the message
        row.appendChild(noDataCell);
        passedStudentsTable.appendChild(row);
        return;
    }

    // If students are found, render them
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentItems = filteredStudents.slice(start, end);

    currentItems.forEach(student => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        const dateCell = document.createElement('td');
        const percentageCell = document.createElement('td');
        const certificateIdCell = document.createElement('td');

        // Name already computed in renderApplicants()
        nameCell.textContent = student.fullName;

        const timestamp = student.timestamp ? new Date(student.timestamp.seconds * 1000) : null;
        dateCell.textContent = timestamp ? timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

        percentageCell.textContent = `${student.totalScore || '0.00'}%`;
        certificateIdCell.textContent = student.certificateID || '';

        row.appendChild(nameCell);
        row.appendChild(dateCell);
        row.appendChild(percentageCell);
        row.appendChild(certificateIdCell);
        
        passedStudentsTable.appendChild(row);
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search');

    // Attach event listener to search input
    searchInput.addEventListener('input', searchApplicants);

    // Set up real-time listener to automatically fetch and display passed students
    setupRealTimeListener();
});