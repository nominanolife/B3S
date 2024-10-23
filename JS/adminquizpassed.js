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

    if (passedStudentsData.length === 0) {
        const row = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.setAttribute('colspan', '4');
        noDataCell.textContent = 'No pass student/s yet';
        noDataCell.style.textAlign = 'center';
        row.appendChild(noDataCell);
        passedStudentsTable.appendChild(row);
        return;
    }

    // Batch operation to avoid flickering and ensure all data is rendered at once
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentItems = passedStudentsData.slice(start, end);

    const fragment = document.createDocumentFragment(); // Create a document fragment for batch DOM updates

    // Fetch all applicant data first before rendering
    const promises = currentItems.map(async (student) => {
        try {
            const applicantDoc = await getDoc(doc(db, 'applicants', student.id));
            if (applicantDoc.exists()) {
                const personalInfo = applicantDoc.data()?.personalInfo || {};
                const firstName = personalInfo.first || '';
                const middleName = personalInfo.middle ? ` ${personalInfo.middle}` : '';
                const lastName = personalInfo.last || '';
                const suffix = personalInfo.suffix ? ` ${personalInfo.suffix}` : '';
                const fullName = `${firstName}${middleName} ${lastName}${suffix}`.trim();

                student.fullName = fullName;

                const row = document.createElement('tr');

                const nameCell = document.createElement('td');
                nameCell.textContent = fullName;

                const dateCell = document.createElement('td');
                let date;
                if (student.date && student.date.toDate) {
                    date = student.date.toDate();
                } else if (student.date && typeof student.date === 'string') {
                    date = new Date(student.date);
                }
                dateCell.textContent = date ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Invalid Date';

                const percentageCell = document.createElement('td');
                const percentage = student.percentage || '0.00';
                percentageCell.textContent = `${percentage}%`;

                const certificateIdCell = document.createElement('td');

                // Create an anchor link for the certificate ID if it exists
                if (student.certificateID) {
                    const certificateLink = document.createElement('a');
                    certificateLink.href = '#';  // Prevent default behavior
                    certificateLink.textContent = student.certificateID;
                    certificateLink.addEventListener('click', async (event) => {
                        event.preventDefault();  // Prevent default link behavior
                        await generateCertificateForUser(student.id);  // Function to generate the certificate
                    });

                    certificateIdCell.appendChild(certificateLink);
                } else {
                    certificateIdCell.textContent = 'N/A';  // Fallback if no certificate ID exists
                }
                row.appendChild(certificateIdCell);

                row.appendChild(nameCell);
                row.appendChild(dateCell);
                row.appendChild(percentageCell);
                row.appendChild(certificateIdCell);

                fragment.appendChild(row); // Append the row to the document fragment
            } else {
                console.warn(`No applicant found for student ID: ${student.id}`);
            }
        } catch (error) {
            console.error('Error fetching applicant details:', error);
        }
    });

    // Wait for all fetch operations to complete before rendering
    await Promise.all(promises);

    passedStudentsTable.appendChild(fragment); // Append the fragment to the table in one go
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

async function generateCertificateForUser(userId) {
    try {
        const userResultDoc = await getDoc(doc(db, 'userResults', userId));

        if (userResultDoc.exists()) {
            const userResultData = userResultDoc.data();
            const fullName = userResultData.name || 'N/A';
            const totalScore = userResultData.percentage || 0;
            const certificateID = userResultData.certificateID || 'N/A';
            const completionDate = userResultData.date ? new Date(userResultData.date).toLocaleDateString() : 'N/A';

            // Call the function to generate and download the certificate PDF
            generateCertificate(fullName, totalScore, certificateID, completionDate);
        } else {
            console.error("No certificate data found for user:", userId);
            alert('No certificate available.');
        }
    } catch (error) {
        console.error("Error fetching certificate data:", error);
        alert('Error generating certificate. Please try again later.');
    }
}

async function generateCertificate(fullName, totalScore, certificateID, completionDate) {
    const { jsPDF } = window.jspdf;

    // Create a new PDF document
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add background image (you can change the path to your actual image path)
    const backgroundBase64 = 'Assets/TDC Cert.png'; // Adjust path or use base64 string if available
    doc.addImage(backgroundBase64, 'PNG', 0, 0, pageWidth, pageHeight);

    // Set the title of the certificate with default fonts
    doc.setFont("Times");
    doc.setFontSize(66);

    // Add logo and adjust size
    const logoBase64 = 'Assets/logo.png';  // Adjust path or use base64 string if available
    doc.addImage(logoBase64, 'PNG', 130, 13, 30, 30);

    // Center the text manually by calculating the width
    doc.text("CERTIFICATE", pageWidth / 2, 60, { align: 'center' });
    doc.setFontSize(26);
    doc.text("OF COMPLETION", pageWidth / 2, 75, { align: 'center' });

    // Add certificate content text
    doc.setFontSize(16);
    doc.text("This is to certify that", pageWidth / 2, 85, { align: 'center' });

    // Add the user's name dynamically
    doc.setFont("Helvetica");
    doc.setFontSize(32);
    doc.text(fullName, pageWidth / 2, 115, { align: 'center' });

    // Add quiz completion details dynamically (total score and certificate ID)
    doc.setFont("Helvetica");
    doc.setFontSize(15);
    doc.text(`Has successfully passed the theoretical driving course on ${completionDate}`, pageWidth / 2, 130, { align: 'center' });
    doc.text(`with a quiz result of ${totalScore}%, earning Quiz Passing ID ${certificateID}`, pageWidth / 2, 140, { align: 'center' });

    // Add the signature and line for admin signature
    doc.setFont("Helvetica");
    doc.setFontSize(24);
    doc.text("Aaron Loeb", 195, 170);
    doc.line(195, 172, 239, 172);  // Signature line
    doc.setFont("Helvetica");
    doc.setFontSize(17);
    doc.text("Admin", 208, 180);

    // Convert the PDF to a blob
    const pdfBlob = doc.output('blob');

    // Create a URL for the blob
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Open the PDF in a new tab
    window.open(blobUrl, '_blank');
}