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

// Function to render the student bar chart
async function renderStudentBarChart() {
    const ctx = document.querySelector('.student-graph canvas').getContext('2d');

    // Destroy the previous chart instance if it exists
    if (window.studentBarChartInstance) {
        window.studentBarChartInstance.destroy();
    }

    try {
        const applicantsSnapshot = await getDocs(collection(db, "applicants")); // Fetch all applicants
        const students = [];

        // Filter students with role "student" and a valid "dateEnrolled"
        applicantsSnapshot.forEach(doc => {
            const applicantData = doc.data();
            if (
                applicantData.role === "student" && // Role is "student"
                applicantData.packageName && // Package is enrolled
                applicantData.dateEnrolled // Ensure dateEnrolled exists
            ) {
                // Convert Firestore timestamp to JavaScript Date object
                students.push(applicantData.dateEnrolled.toDate());
            }
        });

        // Debugging: Log the filtered students' dates
        console.log("Filtered Students Dates:", students);

        // Current date for calculations
        const currentDate = new Date();

        // Weekly count
        const weeklyCount = students.filter(date => {
            const diffTime = Math.abs(currentDate - date);
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            return diffDays <= 7; // Within the last 7 days
        }).length;

        // Monthly count
        const monthlyCount = students.filter(date => {
            return (
                date.getMonth() === currentDate.getMonth() && // Same month
                date.getFullYear() === currentDate.getFullYear() // Same year
            );
        }).length;

        // Yearly count
        const yearlyCount = students.filter(date => {
            return date.getFullYear() === currentDate.getFullYear(); // Same year
        }).length;

        // Debugging: Log the counts
        console.log("Weekly Count:", weeklyCount);
        console.log("Monthly Count:", monthlyCount);
        console.log("Yearly Count:", yearlyCount);

        // Chart data
        const labels = ['Weekly', 'Monthly', 'Yearly'];
        const data = [weeklyCount, monthlyCount, yearlyCount];

        // Render the chart
        window.studentBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Students Added',
                    data: data,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(33, 102, 255, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(33, 102, 255, 1)'
                    ],
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
async function renderInstructorBarChart() {
    const ctx = document.querySelector('.instructor-graph canvas').getContext('2d');

    // Destroy the previous chart instance if it exists
    if (window.instructorBarChartInstance) {
        window.instructorBarChartInstance.destroy();
    }

    try {
        const adminSnapshot = await getDocs(collection(db, "admin"));
        const instructors = [];

        adminSnapshot.forEach(doc => {
            const adminData = doc.data();
            if (adminData.role === "instructor" && adminData.dateCreated) {
                instructors.push(new Date(adminData.dateCreated));
            }
        });

        // Current date for calculations
        const currentDate = new Date();

        // Calculate weekly, monthly, and yearly counts
        const weeklyCount = instructors.filter(date => {
            const diffTime = Math.abs(currentDate - date);
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            return diffDays <= 7;
        }).length;

        const monthlyCount = instructors.filter(date => {
            return (
                date.getMonth() === currentDate.getMonth() &&
                date.getFullYear() === currentDate.getFullYear()
            );
        }).length;

        const yearlyCount = instructors.filter(date => {
            return date.getFullYear() === currentDate.getFullYear();
        }).length;

        // Chart data
        const labels = ['Weekly', 'Monthly', 'Yearly'];
        const data = [weeklyCount, monthlyCount, yearlyCount];

        // Render the chart
        window.instructorBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Weekly', 'Monthly', 'Yearly'],
                datasets: [
                    {
                        label: 'Instructors Added',
                        data: [weeklyCount, monthlyCount, yearlyCount],
                        backgroundColor: [
                            'rgba(50, 150, 250, 0.6)',
                            'rgba(30, 100, 200, 0.6)',
                            'rgba(10, 50, 150, 0.6)'
                        ],
                        borderColor: [
                            'rgba(50, 150, 250, 1)',
                            'rgba(30, 100, 200, 1)',
                            'rgba(10, 50, 150, 1)'
                        ],
                        borderWidth: 2,
                        barThickness: 100,
                        borderRadius: 5,
                    },
                ],
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
        console.error("Error fetching instructor data for the chart: ", error);
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