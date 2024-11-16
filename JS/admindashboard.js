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
const itemsPerPage = 6;
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
                        continue;
                    }
                } else {
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

// Call the function to update the appointments card on page load
document.addEventListener('DOMContentLoaded', () => {
    renderInstructorBarChart();
    renderStudentBarChart();
    updateSalesCard();
    updateAppointmentsCard();
    updateInstructorCard();
    updateStudentCard();
});

// Default selected month and year for students and instructors
let selectedStudentMonth = 'January';
let selectedStudentYear = new Date().getFullYear();
let selectedInstructorMonth = 'January';
let selectedInstructorYear = new Date().getFullYear();

// Function to populate year dropdown for students from 2020 to the current year
const studentYearDropdown = document.querySelectorAll('.student-graph-section .filter-date .custom-dropdown')[1].querySelector('.dropdown-options');
const currentYear = new Date().getFullYear();
for (let year = 2022; year <= currentYear; year++) {
    const yearOption = document.createElement('li');
    yearOption.classList.add('option');
    yearOption.setAttribute('data-value', year);
    yearOption.textContent = year;
    studentYearDropdown.appendChild(yearOption);
}

// Function to populate year dropdown for instructors from 2020 to the current year
const instructorYearDropdown = document.querySelectorAll('.instructor-graph-section .filter-date .custom-dropdown')[1].querySelector('.dropdown-options');
for (let year = 2022; year <= currentYear; year++) {
    const yearOption = document.createElement('li');
    yearOption.classList.add('option');
    yearOption.setAttribute('data-value', year);
    yearOption.textContent = year;
    instructorYearDropdown.appendChild(yearOption);
}

// Event listeners for student dropdowns
document.querySelectorAll('.student-graph-section .filter-date .custom-dropdown').forEach((dropdown, index) => {
    const selected = dropdown.querySelector('.selected');
    const options = dropdown.querySelector('.dropdown-options');

    // Toggle dropdown visibility on click
    selected.addEventListener('click', () => {
        options.style.display = options.style.display === 'block' ? 'none' : 'block';
    });

    // Update the selected value and close the dropdown when an option is clicked
    options.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', () => {
            selected.textContent = option.textContent;
            options.style.display = 'none';

            // Update selectedStudentMonth or selectedStudentYear based on the dropdown
            if (index === 0) {
                selectedStudentMonth = option.dataset.value;
            } else {
                selectedStudentYear = parseInt(option.dataset.value);
            }
            updateStudentChart(); // Call update function whenever student month or year changes
        });
    });
});

// Event listeners for instructor dropdowns
document.querySelectorAll('.instructor-graph-section .filter-date .custom-dropdown').forEach((dropdown, index) => {
    const selected = dropdown.querySelector('.selected');
    const options = dropdown.querySelector('.dropdown-options');

    // Toggle dropdown visibility on click
    selected.addEventListener('click', () => {
        options.style.display = options.style.display === 'block' ? 'none' : 'block';
    });

    // Update the selected value and close the dropdown when an option is clicked
    options.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', () => {
            selected.textContent = option.textContent;
            options.style.display = 'none';

            // Update selectedInstructorMonth or selectedInstructorYear based on the dropdown
            if (index === 0) {
                selectedInstructorMonth = option.dataset.value;
            } else {
                selectedInstructorYear = parseInt(option.dataset.value);
            }
            updateInstructorChart(); // Call update function whenever instructor month or year changes
        });
    });
});

// Close the dropdown if clicked outside
document.addEventListener('click', (event) => {
    document.querySelectorAll('.filter-date .custom-dropdown').forEach(dropdown => {
        const options = dropdown.querySelector('.dropdown-options');
        if (!dropdown.contains(event.target)) {
            options.style.display = 'none';
        }
    });
});

// Function to update the student chart based on selected month and year
function updateStudentChart() {
    renderStudentBarChart(selectedStudentMonth, selectedStudentYear);
}

// Function to update the instructor chart based on selected month and year
function updateInstructorChart() {
    renderInstructorBarChart(selectedInstructorMonth, selectedInstructorYear);
}

const currentDate = new Date();
const currentMonth = currentDate.toLocaleString('default', { month: 'long' });

// Set default month and year in student dropdown
document.querySelector('.student-graph-section .filter-date .custom-dropdown .selected').textContent = currentMonth;
document.querySelectorAll('.student-graph-section .filter-date .custom-dropdown .selected')[1].textContent = currentYear;

// Set default month and year in instructor dropdown
document.querySelector('.instructor-graph-section .filter-date .custom-dropdown .selected').textContent = currentMonth;
document.querySelectorAll('.instructor-graph-section .filter-date .custom-dropdown .selected')[1].textContent = currentYear;

// Assign these as default values for dropdown filtering
selectedStudentMonth = currentMonth;
selectedStudentYear = currentYear;
selectedInstructorMonth = currentMonth;
selectedInstructorYear = currentYear;

updateStudentChart();
updateInstructorChart();

// Function to render the student bar chart
async function renderStudentBarChart(month, year) {
    const ctx = document.querySelector('.student-graph canvas').getContext('2d');

    if (window.studentBarChartInstance) {
        window.studentBarChartInstance.destroy();
    }

    // Update labels based on selected month and year
    const weeklyLabel = `Weekly`;
    const monthlyLabel = `${month}`;
    const yearlyLabel = `${year}`;

    try {
        // Fetch and filter data as before
        const applicantsSnapshot = await getDocs(collection(db, "applicants"));
        const students = [];
        applicantsSnapshot.forEach(doc => {
            const applicantData = doc.data();
            if (applicantData.role === "student" && applicantData.dateEnrolled) {
                students.push(applicantData.dateEnrolled.toDate());
            }
        });

        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        const filteredStudents = students.filter(date => date.getMonth() === monthIndex && date.getFullYear() === year);

        const weeklyCount = filteredStudents.filter(date => (new Date() - date) / (1000 * 60 * 60 * 24) <= 7).length;
        const monthlyCount = filteredStudents.length;
        const yearlyCount = students.filter(date => date.getFullYear() === year).length;

        // Render the chart with dynamic labels
        window.studentBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [weeklyLabel, monthlyLabel, yearlyLabel],
                datasets: [{
                    label: 'Students Added',
                    data: [weeklyCount, monthlyCount, yearlyCount],
                    backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(33, 102, 255, 0.6)'],
                    borderColor: ['rgba(75, 192, 192, 1)', 'rgba(54, 162, 235, 1)', 'rgba(33, 102, 255, 1)'],
                    borderWidth: 1,
                    barThickness: 100,
                    borderRadius: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Students',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time Period',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'rectRounded',
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });        
    } catch (error) {
        console.error("Error rendering student bar chart:", error);
    }
}

// Function to render the instructor bar chart
async function renderInstructorBarChart(month, year) {
    const ctx = document.querySelector('.instructor-graph canvas').getContext('2d');

    if (window.instructorBarChartInstance) {
        window.instructorBarChartInstance.destroy();
    }

    // Update labels based on selected month and year
    const weeklyLabel = `Weekly`;
    const monthlyLabel = `${month}`;
    const yearlyLabel = `${year}`;

    try {
        const adminSnapshot = await getDocs(collection(db, "admin"));
        const instructors = [];

        adminSnapshot.forEach(doc => {
            const adminData = doc.data();
            if (adminData.role === "instructor" && adminData.dateCreated) {
                instructors.push(new Date(adminData.dateCreated));
            }
        });

        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        const filteredInstructors = instructors.filter(date =>
            date.getMonth() === monthIndex && date.getFullYear() === year
        );

        const weeklyCount = filteredInstructors.filter(date => (new Date() - date) / (1000 * 60 * 60 * 24) <= 7).length;
        const monthlyCount = filteredInstructors.length;
        const yearlyCount = instructors.filter(date => date.getFullYear() === year).length;

        window.instructorBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [weeklyLabel, monthlyLabel, yearlyLabel],
                datasets: [{
                    label: 'Instructors Added',
                    data: [weeklyCount, monthlyCount, yearlyCount],
                    backgroundColor: ['rgba(50, 150, 250, 0.6)', 'rgba(30, 100, 200, 0.6)', 'rgba(10, 50, 150, 0.6)'],
                    borderColor: ['rgba(50, 150, 250, 1)', 'rgba(30, 100, 200, 1)', 'rgba(10, 50, 150, 1)'],
                    borderWidth: 2,
                    barThickness: 100,
                    borderRadius: 5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Instructors',
                            font: {
                                size: 12,
                                weight: 'bold',
                            },
                        },
                        beginAtZero: true,
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time Period',
                            font: {
                                size: 12,
                                weight: 'bold',
                            },
                        },
                    },
                },
                plugins: {
                    legend: {
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'rectRounded',
                            font: {
                                size: 11,
                            },
                        },
                    },
                },
            },
        });        
    } catch (error) {
        console.error("Error fetching instructor data for the chart:", error);
    }
}

// Function to dynamically update the appointments card
async function updateAppointmentsCard() {
    const analyticsCardTitle = document.querySelector('.analytics-card p'); // Title in the appointments card
    const analyticsCardData = document.querySelector('.analytics-card h3'); // Number of appointments
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' }); // Current month name
    const currentYear = currentDate.getFullYear(); // Current year

    // Update the title dynamically
    analyticsCardTitle.textContent = `Appointments this ${currentMonth} ${currentYear}`;

    try {
        // Fetch all appointments from Firestore
        const appointmentsSnapshot = await getDocs(collection(db, "appointments"));
        let appointmentCount = 0;

        // Count appointments for the current month and year
        appointmentsSnapshot.forEach(doc => {
            const appointmentData = doc.data();
            const appointmentDate = new Date(appointmentData.date);

            if (
                appointmentDate.getMonth() === currentDate.getMonth() && // Same month
                appointmentDate.getFullYear() === currentYear // Same year
            ) {
                appointmentCount++;
            }
        });

        // Update the card with the count
        analyticsCardData.textContent = `${appointmentCount}`;
    } catch (error) {
        console.error("Error fetching appointments: ", error);
        analyticsCardData.textContent = "Error";
    }
}

// Update sales data dynamically
async function updateSalesCard() {
    const salesCardElement = document.querySelector('.analytics-card1 p'); // Sales card title
    const salesAmountElement = document.querySelector('.analytics-card1 h3'); // Sales card amount
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();

    // Set the card title dynamically
    salesCardElement.textContent = `Sales this ${currentMonth} ${currentYear}`;

    let totalSales = 0;

    try {
        // Fetch sales data from the Firestore collection
        const salesSnapshot = await getDocs(collection(db, "sales"));
        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            if (sale.paymentDate) {
                const paymentDate = new Date(sale.paymentDate);
                const paymentMonth = paymentDate.toLocaleString('default', { month: 'long' });
                const paymentYear = paymentDate.getFullYear();

                // Check if the sale is in the current month and year
                if (paymentMonth === currentMonth && paymentYear === currentYear) {
                    totalSales += parseFloat(sale.amountPaid || 0); // Add the sale amount
                }
            }
        });

        // Update the card dynamically
        salesAmountElement.textContent = `${totalSales.toLocaleString()}`;
    } catch (error) {
        console.error("Error fetching sales data: ", error);
        salesAmountElement.textContent = "Error";
    }
}

// Function to dynamically update the instructors card
async function updateInstructorCard() {
    const instructorCardTitle = document.querySelector('.analytics-card2 p'); // Title in the instructor card
    const instructorCardData = document.querySelector('.analytics-card2 h3'); // Number of instructors
  
    // Set the card title dynamically
    instructorCardTitle.textContent = 'Number of Instructors';
  
    try {
      // Fetch all admin users from Firestore
      const adminSnapshot = await getDocs(collection(db, "admin"));
      let instructorCount = 0;
  
      // Count the instructors based on their role
      adminSnapshot.forEach(doc => {
        const adminData = doc.data();
        if (adminData.role === "instructor") {
          instructorCount++;
        }
      });
  
      // Update the card with the count
      instructorCardData.textContent = `${instructorCount}`;
    } catch (error) {
      console.error("Error fetching instructor data: ", error);
      instructorCardData.textContent = "Error";
    }
}

// Function to dynamically update the students card
async function updateStudentCard() {
    const studentCardTitle = document.querySelector('.analytics-card3 p');
    const studentCardData = document.querySelector('.analytics-card3 h3');

    // Set the card title dynamically
    studentCardTitle.textContent = 'Number of Students';

    try {
        // Fetch all applicants from Firestore
        const studentsSnapshot = await getDocs(collection(db, "applicants"));
        let studentCount = 0;

        // Filter documents with role "student"
        studentsSnapshot.forEach(doc => {
            const studentData = doc.data();
            if (studentData.role === "student") {
                studentCount++;
            }
        });

        // Update the card with the count
        studentCardData.textContent = `${studentCount}`;
    } catch (error) {
        console.error("Error fetching student data: ", error);
        studentCardData.textContent = "Error";
    }
}