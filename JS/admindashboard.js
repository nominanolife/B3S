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
const loader = document.getElementById('loader1');

// Fetch and render the bookings
async function fetchBookings() {
    // Show loader while fetching data
    loader.style.display = 'flex';
    
    const upcomingList = document.querySelector('.upcoming-list');
    const cancelledList = document.querySelector('.cancelled-list');

    upcomingList.innerHTML = '';
    cancelledList.innerHTML = '';

    try {
        const appointmentsSnapshot = await getDocs(collection(db, "appointments"));

        allBookingsUpcoming = [];
        allBookingsCancelled = [];

        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' }; // Define date format options

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

                const appointmentDate = new Date(appointmentData.date).toLocaleDateString('en-US', dateOptions); // Apply the date format
                const currentDate = new Date();

                // Skip past appointments
                if (new Date(appointmentData.date) < currentDate) {
                    console.log(`Appointment on ${appointmentData.date} has already passed. Ignoring this booking.`);
                    continue;
                }

                const rowHtml = `
                    <tr>
                        <td>${fullName}</td>
                        <td>${course}</td>
                        <td>${appointmentDate}</td>
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

    } catch (error) {
        console.error("Error fetching appointments: ", error);
    } finally {
        // Hide loader after fetching data
        loader.style.display = 'none';
    }
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

    if (allBookings.length === 0) {
        const noDataHtml = `
            <tr>
                <td colspan="4" class="text-center">${isFiltered ? 'No student/s found' : 'No student/s yet'}</td>
            </tr>
        `;
        list.insertAdjacentHTML('beforeend', noDataHtml);
        return; // Exit the function since there's nothing more to display
    }

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
    // Search for Upcoming Appointments
    const searchUpcoming = document.querySelector('.search-upcoming');
    searchUpcoming.addEventListener('input', () => {
        const searchTerm = searchUpcoming.value.toLowerCase().trim();

        // If the search input is empty, reset the filtered list and show all bookings
        if (searchTerm === '') {
            displayBookings('upcoming');  // Show all bookings
            updatePaginationControls('upcoming'); // Reset pagination controls
            return; // Exit the function since we don't need to filter
        }

        // Filter upcoming appointments based on the search term
        filteredBookingsUpcoming = allBookingsUpcoming.filter(rowHtml => rowHtml.toLowerCase().includes(searchTerm));

        // Reset pagination and display the filtered results for upcoming appointments
        currentPageUpcoming = 1;
        displayBookings('upcoming', true);
        updatePaginationControls('upcoming');
    });

    // Search for Cancelled/Rescheduled Appointments
    const searchCancelled = document.querySelector('.search-cancelled');
    searchCancelled.addEventListener('input', () => {
        const searchTerm = searchCancelled.value.toLowerCase().trim();

        // If the search input is empty, reset the filtered list and show all bookings
        if (searchTerm === '') {
            displayBookings('cancelled');  // Show all bookings
            updatePaginationControls('cancelled'); // Reset pagination controls
            return; // Exit the function since we don't need to filter
        }

        // Filter cancelled/rescheduled appointments based on the search term
        filteredBookingsCancelled = allBookingsCancelled.filter(rowHtml => rowHtml.toLowerCase().includes(searchTerm));

        // Reset pagination and display the filtered results for cancelled appointments
        currentPageCancelled = 1;
        displayBookings('cancelled', true);
        updatePaginationControls('cancelled');
    });
}

// Call the searchBookings function to initialize the search functionality
searchBookings();

document.addEventListener('DOMContentLoaded', function () {
    const upcomingSelectedElement = document.getElementById('courseFilterSelected');
    const upcomingOptionsContainer = document.getElementById('courseFilterOptions');
    const upcomingOptionsList = upcomingOptionsContainer.querySelectorAll('.option');

    const cancelledSelectedElement = document.getElementById('cancelledCourseFilterSelected');
    const cancelledOptionsContainer = document.getElementById('cancelledCourseFilterOptions');
    const cancelledOptionsList = cancelledOptionsContainer.querySelectorAll('.option');

    // Toggle dropdown for upcoming appointments
    upcomingSelectedElement.addEventListener('click', () => {
        upcomingOptionsContainer.style.display = upcomingOptionsContainer.style.display === 'block' ? 'none' : 'block';
    });

    // Handle option selection for upcoming appointments
    upcomingOptionsList.forEach(option => {
        option.addEventListener('click', () => {
            upcomingSelectedElement.textContent = option.textContent;
            upcomingSelectedElement.setAttribute('data-value', option.getAttribute('data-value'));
            upcomingOptionsContainer.style.display = 'none';
            filterByCourse(option.getAttribute('data-value'));
        });
    });

    // Toggle dropdown for cancelled/rescheduled appointments
    cancelledSelectedElement.addEventListener('click', () => {
        cancelledOptionsContainer.style.display = cancelledOptionsContainer.style.display === 'block' ? 'none' : 'block';
    });

    // Handle option selection for cancelled/rescheduled appointments
    cancelledOptionsList.forEach(option => {
        option.addEventListener('click', () => {
            cancelledSelectedElement.textContent = option.textContent;
            cancelledSelectedElement.setAttribute('data-value', option.getAttribute('data-value'));
            cancelledOptionsContainer.style.display = 'none';
            filterByCourse(option.getAttribute('data-value'), 'cancelled');
        });
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', (e) => {
        if (!upcomingSelectedElement.contains(e.target) && !upcomingOptionsContainer.contains(e.target)) {
            upcomingOptionsContainer.style.display = 'none';
        }
        if (!cancelledSelectedElement.contains(e.target) && !cancelledOptionsContainer.contains(e.target)) {
            cancelledOptionsContainer.style.display = 'none';
        }
    });
});

function filterByCourse(selectedCourse, type = 'upcoming') {
    const isUpcoming = type === 'upcoming';

    const allBookings = isUpcoming ? allBookingsUpcoming : allBookingsCancelled;
    const filteredBookings = allBookings.filter(rowHtml => {
        const course = rowHtml.split('<td>')[2].split('</td>')[0];
        return selectedCourse === '' || course === selectedCourse;
    });

    if (isUpcoming) {
        filteredBookingsUpcoming = filteredBookings;
        currentPageUpcoming = 1;
        displayBookings('upcoming', true);
        updatePaginationControls('upcoming');
    } else {
        filteredBookingsCancelled = filteredBookings;
        currentPageCancelled = 1;
        displayBookings('cancelled', true);
        updatePaginationControls('cancelled');
    }
}

// Initialize event listeners and fetch data
searchBookings();
filterByCourse();
fetchBookings();