import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
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

let studentsData = []; // Global variable to store the filtered students
let currentPage = 1; // Tracks the current page for pagination
const itemsPerPage = 10; // Number of items to display per page
let totalPages = 1; // Total number of pages

async function fetchAppointments() {
  try {
      const querySnapshot = await getDocs(collection(db, "appointments"));
      const appointments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const studentsMap = new Map();

      for (const appointment of appointments) {
          const bookings = Array.isArray(appointment.bookings) ? appointment.bookings : [];

          for (const booking of bookings) {
              if (booking.status === "Cancelled" || booking.status === "Rescheduled") {
                  continue;
              }

              const studentDocRef = doc(db, "applicants", booking.userId);
              const studentDoc = await getDoc(studentDocRef);
              if (studentDoc.exists()) {
                  const studentData = studentDoc.data();
                  // Filter students by role
                  if (studentData.role === "student") {
                      if (!studentsMap.has(booking.userId)) {
                          studentData.bookings = [];
                          studentsMap.set(booking.userId, studentData);
                      }
                      const student = studentsMap.get(booking.userId);
                      student.bookings.push({ ...booking, appointmentId: appointment.id });
                  }
              }
          }
      }

      // Store only students with the "student" role
      studentsData = Array.from(studentsMap.values());
      totalPages = Math.ceil(studentsData.length / itemsPerPage); // Calculate total pages
      renderStudents(); // Render the students for the current page
      updatePaginationControls(); // Update pagination controls
  } catch (error) {
      console.error("Error fetching appointments: ", error);
  }
}

function renderStudents() {
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = '';

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedStudents = studentsData.slice(start, end);

  paginatedStudents.forEach(student => {
    const personalInfo = student.personalInfo || {}; // Ensure personalInfo exists
    const studentHtml = `
      <tr class="table-row">
        <td class="table-row-content">${personalInfo.first || ''} ${personalInfo.last || ''}</td>
        <td class="table-row-content">${student.email}</td>
        <td class="table-row-content">${student.phoneNumber || ''}</td>
        <td class="table-row-content">${student.enrolledPackage}</td>
        <td class="table-row-content">&#8369; ${student.packagePrice}</td>
        ${(student.bookings || []).map(booking => `
          <td class="table-row-content">
            <label class="status-label">
              <input type="checkbox" class="status-toggle" data-appointment-id="${booking.appointmentId}" data-booking-id="${booking.userId}" data-column="TDC" ${booking.TDC === 'Completed' ? 'checked' : ''}>
              Completed
            </label>
          </td>
          <td class="table-row-content">
            <label class="status-label">
              <input type="checkbox" class="status-toggle" data-appointment-id="${booking.appointmentId}" data-booking-id="${booking.userId}" data-column="PDC-4Wheels" ${booking['PDC-4Wheels'] === 'Completed' ? 'checked' : ''}>
              Completed
            </label>
          </td>
          <td class="table-row-content">
            <label class="status-label">
              <input type="checkbox" class="status-toggle" data-appointment-id="${booking.appointmentId}" data-booking-id="${booking.userId}" data-column="PDC-Motors" ${booking['PDC-Motors'] === 'Completed' ? 'checked' : ''}>
              Completed
            </label>
          </td>
        `).join('')}
      </tr>
    `;
    studentList.insertAdjacentHTML('beforeend', studentHtml);
  });

  // Add event listeners to status toggles
  document.querySelectorAll('.status-toggle').forEach(toggle => {
    toggle.addEventListener('change', (event) => {
      const appointmentId = event.target.dataset.appointmentId;
      const bookingId = event.target.dataset.bookingId;
      const column = event.target.dataset.column;
      const newStatus = event.target.checked ? 'Completed' : 'Not yet Started';
      handleStatusChange(appointmentId, bookingId, column, newStatus);
    });
  });
}

function updatePaginationControls() {
  const paginationControls = document.querySelector('.pagination-controls');
  paginationControls.innerHTML = '';

  // Create the previous button
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

  // Create the next button
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

  // Create the page number display
  const pageNumberDisplay = document.createElement('span');
  pageNumberDisplay.className = 'page-number';
  pageNumberDisplay.textContent = `Page ${currentPage} of ${totalPages}`;

  paginationControls.appendChild(prevButton);
  paginationControls.appendChild(pageNumberDisplay);
  paginationControls.appendChild(nextButton);
}

async function handleStatusChange(appointmentId, bookingId, column, newStatus) {
  try {
    const appointmentDocRef = doc(db, "appointments", appointmentId);
    const appointmentDoc = await getDoc(appointmentDocRef);
    if (!appointmentDoc.exists()) {
      console.error("No such document!");
      return;
    }

    const appointmentData = appointmentDoc.data();
    const bookings = appointmentData.bookings.map(booking => {
      if (booking.userId === bookingId) {
        return { ...booking, [column]: newStatus };
      }
      return booking;
    });

    await updateDoc(appointmentDocRef, { bookings });
    console.log("Status updated successfully");
  } catch (error) {
    console.error("Error updating status: ", error);
  }
}

// Check user authentication and fetch students on page load
onAuthStateChanged(auth, (user) => {
  if (user) {
    fetchAppointments();
  } else {
    console.error("No user is currently signed in.");
  }
});

// Fetch students on DOM load
document.addEventListener('DOMContentLoaded', () => {
  fetchAppointments();

  // Add search functionality
  const searchInput = document.querySelector('.search');
  searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    filterStudents(searchTerm);
  });
});

function filterStudents(searchTerm) {
  const filteredStudents = studentsData.filter(student => {
    const fullName = `${student.personalInfo.first || ''} ${student.personalInfo.last || ''}`.toLowerCase();
    return fullName.startsWith(searchTerm);
  });
  renderFilteredStudents(filteredStudents);
}

function renderFilteredStudents(filteredStudents) {
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = '';

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(start, end);

  paginatedStudents.forEach(student => {
    const personalInfo = student.personalInfo || {}; // Ensure personalInfo exists
    const studentHtml = `
      <tr class="table-row">
        <td class="table-row-content">${personalInfo.first || ''} ${personalInfo.last || ''}</td>
        <td class="table-row-content">${student.email}</td>
        <td class="table-row-content">${student.phoneNumber || ''}</td>
        <td class="table-row-content">${student.enrolledPackage}</td>
        <td class="table-row-content">&#8369; ${student.packagePrice}</td>
        ${(student.bookings || []).map(booking => `
          <td class="table-row-content">
            <label class="status-label">
              <input type="checkbox" class="status-toggle" data-appointment-id="${booking.appointmentId}" data-booking-id="${booking.userId}" data-column="TDC" ${booking.TDC === 'Completed' ? 'checked' : ''}>
              Completed
            </label>
          </td>
          <td class="table-row-content">
            <label class="status-label">
              <input type="checkbox" class="status-toggle" data-appointment-id="${booking.appointmentId}" data-booking-id="${booking.userId}" data-column="PDC-4Wheels" ${booking['PDC-4Wheels'] === 'Completed' ? 'checked' : ''}>
              Completed
            </label>
          </td>
          <td class="table-row-content">
            <label class="status-label">
              <input type="checkbox" class="status-toggle" data-appointment-id="${booking.appointmentId}" data-booking-id="${booking.userId}" data-column="PDC-Motors" ${booking['PDC-Motors'] === 'Completed' ? 'checked' : ''}>
              Completed
            </label>
          </td>
        `).join('')}
      </tr>
    `;
    studentList.insertAdjacentHTML('beforeend', studentHtml);
  });

  // Add event listeners to status toggles
  document.querySelectorAll('.status-toggle').forEach(toggle => {
    toggle.addEventListener('change', (event) => {
      const appointmentId = event.target.dataset.appointmentId;
      const bookingId = event.target.dataset.bookingId;
      const column = event.target.dataset.column;
      const newStatus = event.target.checked ? 'Completed' : 'Not yet Started';
      handleStatusChange(appointmentId, bookingId, column, newStatus);
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const buttons = document.querySelectorAll('.button-right');
  
  buttons.forEach(button => {
      button.addEventListener('click', function() {
          buttons.forEach(btn => btn.classList.remove('active'));
          this.classList.add('active');
      });
  });
});
