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

    for (const appointmentDoc of appointmentsSnapshot.docs) {
        const appointmentData = appointmentDoc.data();
        let bookings = appointmentData.bookings;

        if (!Array.isArray(bookings) || bookings.length === 0) {
            console.log(`No bookings found for document ID: ${appointmentDoc.id}`);
            continue;
        }

        const course = appointmentData.course;

        for (const booking of bookings) {
            const applicantDoc = await getDoc(doc(db, "applicants", booking.userId));
            let fullName = '';

            if (applicantDoc.exists()) {
                const applicantData = applicantDoc.data();
                if (applicantData && applicantData.personalInfo) {
                    fullName = `${applicantData.personalInfo.first} ${applicantData.personalInfo.middle} ${applicantData.personalInfo.last} ${applicantData.personalInfo.suffix ? applicantData.personalInfo.suffix : ''}`.trim();
                } else {
                    console.warn(`Applicant data is missing or malformed for userId: ${booking.userId}`);
                    continue;
                }
            } else {
                console.log(`Account for userId: ${booking.userId} has been deleted. Ignoring this booking.`);
                continue;
            }

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

            const appointmentDate = new Date(appointmentData.date);
            const currentDate = new Date();

            // Skip past appointments
            if (appointmentDate < currentDate) {
                console.log(`Appointment on ${appointmentData.date} has already passed. Ignoring this booking.`);
                continue;
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

    totalPagesUpcoming = Math.ceil(allBookingsUpcoming.length / itemsPerPage);
    totalPagesCancelled = Math.ceil(allBookingsCancelled.length / itemsPerPage);

    displayBookings('upcoming');
    displayBookings('cancelled');
    updatePaginationControls('upcoming');
    updatePaginationControls('cancelled');
}

// Global variables to hold filtered bookings
let filteredBookingsUpcoming = [];
let filteredBookingsCancelled = [];

// Display the bookings for the current page
function displayBookings(type, isFiltered = false) {
    const list = type === 'upcoming' ? document.querySelector('.upcoming-list') : document.querySelector('.cancelled-list');
    const currentPage = type === 'upcoming' ? currentPageUpcoming : currentPageCancelled;
    const allBookings = isFiltered ? (type === 'upcoming' ? filteredBookingsUpcoming : filteredBookingsCancelled) : (type === 'upcoming' ? allBookingsUpcoming : allBookingsCancelled);

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

            // Filter the entire dataset based on the search term
            filteredBookingsUpcoming = allBookingsUpcoming.filter(rowHtml => rowHtml.toLowerCase().includes(searchTerm));
            filteredBookingsCancelled = allBookingsCancelled.filter(rowHtml => rowHtml.toLowerCase().includes(searchTerm));

            // Reset pagination and display the filtered results
            currentPageUpcoming = 1;
            currentPageCancelled = 1;
            displayBookings('upcoming', true);
            displayBookings('cancelled', true);
            updatePaginationControls('upcoming');
            updatePaginationControls('cancelled');
        });
    });
}

// Course Filter Functionality
function filterByCourse() {
    const courseFilters = document.querySelectorAll('#courseFilter');

    courseFilters.forEach(filter => {
        filter.addEventListener('change', () => {
            const selectedCourse = filter.value;

            // Filter the entire dataset based on the selected course
            filteredBookingsUpcoming = allBookingsUpcoming.filter(rowHtml => {
                const course = rowHtml.split('<td>')[2].split('</td>')[0]; // Extract course from the rowHtml
                return selectedCourse === '' || course === selectedCourse;
            });
            filteredBookingsCancelled = allBookingsCancelled.filter(rowHtml => {
                const course = rowHtml.split('<td>')[2].split('</td>')[0]; // Extract course from the rowHtml
                return selectedCourse === '' || course === selectedCourse;
            });

            // Reset pagination and display the filtered results
            currentPageUpcoming = 1;
            currentPageCancelled = 1;
            displayBookings('upcoming', true);
            displayBookings('cancelled', true);
            updatePaginationControls('upcoming');
            updatePaginationControls('cancelled');
        });
    });
}

// Initialize event listeners and fetch data
searchBookings();
filterByCourse();
fetchBookings();
