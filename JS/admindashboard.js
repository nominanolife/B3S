import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
    authDomain: "authentication-d6496.firebaseapp.com",
    projectId: "authentication-d6496",
    storageBucket: "authentication-d6496.appspot.com",
    messagingSenderId: "195867894399",
    appId: "1:195867894399:web:596fb109d308aea8b6154a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Pagination variables for upcoming appointments
let currentPageUpcoming = 1;
let totalPagesUpcoming = 1;
let allBookingsUpcoming = [];

// Pagination variables for cancelled/rescheduled appointments
let currentPageCancelled = 1;
let totalPagesCancelled = 1;
let allBookingsCancelled = [];

// Items per page
const itemsPerPage = 10;

// Fetch and render the bookings
async function fetchBookings() {
    const upcomingList = document.querySelector('.upcoming-list');
    const cancelledList = document.querySelector('.cancelled-list');

    upcomingList.innerHTML = '';
    cancelledList.innerHTML = '';

    const appointmentsSnapshot = await getDocs(collection(db, "appointments"));

    allBookingsUpcoming = [];
    allBookingsCancelled = [];

    // Iterate over each appointment document
    for (const appointmentDoc of appointmentsSnapshot.docs) {
        const appointmentData = appointmentDoc.data();
        let bookings = appointmentData.bookings;

        // If bookings is not an array, log an error and treat it as an empty array
        if (!Array.isArray(bookings)) {
            console.error(`Bookings is not an array for document ID: ${appointmentDoc.id}`);
            bookings = []; // Fallback to an empty array
        }

        const course = appointmentData.course; // Extract course information from the main document

        // Iterate over each booking in the bookings array
        for (const booking of bookings) {
            // Fetch the applicant's information based on the userId in the booking
            const applicantDoc = await getDoc(doc(db, "applicants", booking.userId));
            const applicantData = applicantDoc.data();

            const fullName = `${applicantData.personalInfo.first} ${applicantData.personalInfo.middle} ${applicantData.personalInfo.last} ${applicantData.personalInfo.suffix ? applicantData.personalInfo.suffix : ''}`.trim();

            // Convert time to 12-hour format if timeSlot exists
            let formattedTime = '';
            if (booking.timeSlot) {
                const [startHour, startMinute] = booking.timeSlot.split('-')[0].split(':');
                const [endHour, endMinute] = booking.timeSlot.split('-')[1].split(':');

                const startPeriod = startHour >= 12 ? 'PM' : 'AM';
                const adjustedStartHour = startHour % 12 || 12;
                const formattedStartTime = `${adjustedStartHour}:${startMinute} ${startPeriod}`;

                const endPeriod = endHour >= 12 ? 'PM' : 'AM';
                const adjustedEndHour = endHour % 12 || 12;
                const formattedEndTime = `${adjustedEndHour}:${endMinute} ${endPeriod}`;

                formattedTime = `${formattedStartTime} - ${formattedEndTime}`;
            }

            const rowHtml = `
                <tr>
                    <td>${fullName}</td>
                    <td>${course}</td>
                    <td>${appointmentData.date}</td>
                    <td>${formattedTime}</td>
                </tr>
            `;

            if (booking.status === 'Cancelled' || booking.status === 'Rescheduled') {
                allBookingsCancelled.push(rowHtml);
            } else {
                allBookingsUpcoming.push(rowHtml);
            }
        }
    }

    // Calculate total pages
    totalPagesUpcoming = Math.ceil(allBookingsUpcoming.length / itemsPerPage);
    totalPagesCancelled = Math.ceil(allBookingsCancelled.length / itemsPerPage);

    // Display the bookings for the current page
    displayBookings('upcoming');
    displayBookings('cancelled');
    updatePaginationControls('upcoming');
    updatePaginationControls('cancelled');
}

// Display the bookings for the current page
function displayBookings(type) {
    const list = type === 'upcoming' ? document.querySelector('.upcoming-list') : document.querySelector('.cancelled-list');
    const currentPage = type === 'upcoming' ? currentPageUpcoming : currentPageCancelled;
    const allBookings = type === 'upcoming' ? allBookingsUpcoming : allBookingsCancelled;

    list.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedBookings = allBookings.slice(start, end);

    paginatedBookings.forEach(rowHtml => {
        const rowElement = document.createElement('tr');
        rowElement.innerHTML = rowHtml;
        list.appendChild(rowElement);
    });
}

// Update pagination controls
function updatePaginationControls(type) {
    const paginationControls = type === 'upcoming' ? document.querySelector('.upcoming-pagination-controls') : document.querySelector('.cancelled-pagination-controls');
    const currentPage = type === 'upcoming' ? currentPageUpcoming : currentPageCancelled;
    const totalPages = type === 'upcoming' ? totalPagesUpcoming : totalPagesCancelled;

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
            if (type === 'upcoming') {
                currentPageUpcoming--;
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
            if (type === 'upcoming') {
                currentPageUpcoming++;
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

// Search Functionality
function searchBookings() {
    const searchInput = document.querySelectorAll('.search');

    searchInput.forEach(input => {
        input.addEventListener('input', () => {
            const searchTerm = input.value.toLowerCase();
            const rows = input.closest('.title-header').nextElementSibling.querySelectorAll('tbody tr');

            rows.forEach(row => {
                const name = row.querySelector('td:first-child').textContent.toLowerCase();
                if (name.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });
}

// Course Filter Functionality
function filterByCourse() {
    const courseFilters = document.querySelectorAll('#courseFilter');

    courseFilters.forEach(filter => {
        filter.addEventListener('change', () => {
            const selectedCourse = filter.value;
            const rows = filter.closest('.title-header').nextElementSibling.querySelectorAll('tbody tr');

            rows.forEach(row => {
                const course = row.querySelector('td:nth-child(2)').textContent;
                if (selectedCourse === '' || course === selectedCourse) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });
}

// Initialize event listeners and fetch data
searchBookings();
filterByCourse();
fetchBookings();
