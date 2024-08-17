import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, onSnapshot, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

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
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const db = getFirestore(app);
const auth = getAuth(app);

// Variables for student data
let studentsData = [];
let filteredStudentsData = [];
let currentMonth = new Date().toLocaleString('default', { month: 'long' });
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;

// Object to store filtered data for each month
let monthData = {};

// Auto-detect current month and set it in the dropdown
document.addEventListener('DOMContentLoaded', () => {
  const monthSelector = document.getElementById('monthSelector');
  for (let i = 0; i < monthSelector.options.length; i++) {
    if (monthSelector.options[i].value === currentMonth) {
      monthSelector.selectedIndex = i;
      break;
    }
  }

  monthSelector.addEventListener('change', (event) => {
    currentMonth = event.target.value;
    filterStudents(); // Re-filter students based on current month selection
  });

  fetchStudentData();
});

// Fetch Student Data with Validations
async function fetchStudentData() {
  try {
    const studentsMap = new Map();

    // Real-time listener for applicants collection
    const unsubscribeApplicants = onSnapshot(collection(db, "applicants"), (applicantsSnapshot) => {
      applicantsSnapshot.forEach(applicantDoc => {
        const applicantData = applicantDoc.data();

        // Check if the user has the role "student"
        if (applicantData.role === "student") {

          // Check if the student has completed any of the courses
          if (applicantData.TDCStatus === "Completed" || 
              applicantData["PDC-4WheelsStatus"] === "Completed" || 
              applicantData["PDC-MotorsStatus"] === "Completed") {

            studentsMap.set(applicantDoc.id, applicantData);
          }
        }
      });

      // Listen to appointments to check for active bookings
      const unsubscribeAppointments = onSnapshot(collection(db, "appointments"), (appointmentsSnapshot) => {
        appointmentsSnapshot.forEach(appointment => {
          const appointmentData = appointment.data();
          const bookings = Array.isArray(appointmentData.bookings) ? appointmentData.bookings : [];

          bookings.forEach(booking => {
            if (booking.status === "Cancelled" || booking.status === "Rescheduled") {
              return;
            }

            const studentDocRef = doc(db, "applicants", booking.userId);
            getDoc(studentDocRef).then(studentDoc => {
              if (studentDoc.exists()) {
                const studentData = studentDoc.data();

                if (studentData.role === "student") {
                  if (!studentsMap.has(booking.userId)) {
                    studentData.bookings = [];
                    studentsMap.set(booking.userId, studentData);
                  }
                  const student = studentsMap.get(booking.userId);
                  student.bookings.push({ ...booking, appointmentId: appointment.id, course: appointmentData.course });
                }
              }
            });
          });
        });

        // After processing all data, update the global arrays and store month data
        studentsData = Array.from(studentsMap.values());
        storeMonthData(); // Store the data for the current month
        filterStudents(); // Filter students based on current month and search term
        totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);
        renderStudents();
        updatePaginationControls();
      });
    });

    return {
      unsubscribeApplicants,
    };
  } catch (error) {
    console.error("Error fetching student data: ", error);
  }
}

// Store filtered data for the current month
function storeMonthData() {
  monthData[currentMonth] = studentsData;
}

// Render Students Report
function renderStudents() {
  const studentList = document.querySelector('.sales-list');
  if (!studentList) {
    console.error("Student list element not found.");
    return;
  }

  studentList.innerHTML = '';

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedStudents = filteredStudentsData.slice(start, end);

  paginatedStudents.forEach(student => {
    const personalInfo = student.personalInfo || {};

    const studentHtml = `
      <tr class="table-row">
        <td class="table-row-content">${personalInfo.first || ''} ${personalInfo.last || ''}</td>
        <td class="table-row-content">${student.packageName || ''}</td>
        <td class="table-row-content"></td> <!-- Leave Payment Status empty -->
        <td class="table-row-content"></td> <!-- Leave Date of Payment empty -->
        <td class="table-row-content"></td> <!-- Leave Amount Paid empty -->
        <td class="table-row-content">
          <i class="bi bi-three-dots-vertical"></i> <!-- Hamburger Icon -->
        </td>
      </tr>
    `;
    studentList.insertAdjacentHTML('beforeend', studentHtml);
  });
}

// Update Pagination Controls
function updatePaginationControls() {
  const paginationControls = document.querySelector('.pagination-controls');
  if (!paginationControls) {
    console.error("Pagination controls element not found.");
    return;
  }

  paginationControls.innerHTML = '';

  const prevButton = document.createElement('i');
  prevButton.className = 'bi bi-caret-left';
  if (currentPage === 1) {
    prevButton.classList.add('disabled');
    prevButton.style.opacity = '0.5';
  }
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderStudents();
      updatePaginationControls();
    }
  });

  const nextButton = document.createElement('i');
  nextButton.className = 'bi bi-caret-right';
  if (currentPage === totalPages) {
    nextButton.classList.add('disabled');
    nextButton.style.opacity = '0.5';
  }
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderStudents();
      updatePaginationControls();
    }
  });

  const pageNumberDisplay = document.createElement('span');
  pageNumberDisplay.className = 'page-number';
  pageNumberDisplay.textContent = `Page ${currentPage} of ${totalPages}`;

  paginationControls.appendChild(prevButton);
  paginationControls.appendChild(pageNumberDisplay);
  paginationControls.appendChild(nextButton);
}

// Check user authentication and fetch students on page load
onAuthStateChanged(auth, (user) => {
  if (user) {
    fetchStudentData();
  } else {
    console.error("No user is currently signed in.");
  }
});

// Fetch students on DOM load
document.addEventListener('DOMContentLoaded', () => {
  fetchStudentData();

  // Add search functionality
  const searchInput = document.querySelector('.search');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      const searchTerm = event.target.value.toLowerCase();
      filterStudents(searchTerm);
    });
  }
});

function filterStudents(searchTerm = '') {
  // Check if data for the current month is already stored
  if (monthData[currentMonth]) {
    filteredStudentsData = monthData[currentMonth].filter(student => {
      const fullName = `${student.personalInfo.first || ''} ${student.personalInfo.last || ''}`.toLowerCase();
      return fullName.startsWith(searchTerm);
    });
  } else {
    // If no data is stored for the current month, show no students
    filteredStudentsData = [];
  }

  currentPage = 1;
  totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);
  renderStudents();
  updatePaginationControls();
}
