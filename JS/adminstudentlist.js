import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, setDoc, deleteField } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
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
let filteredStudentsData = []; // Global variable to store the currently filtered students
let currentPage = 1; // Tracks the current page for pagination
const itemsPerPage = 10; // Number of items to display per page
let totalPages = 1; // Total number of pages

async function fetchAppointments() {
  try {
    const studentsMap = new Map();

    // Real-time listener for applicants
    const unsubscribeApplicants = onSnapshot(collection(db, "applicants"), (applicantsSnapshot) => {
      applicantsSnapshot.forEach(applicantDoc => {
        const applicantData = applicantDoc.data();

        // Only process if the role is "student"
        if (applicantData.role === "student") {
          // Initialize the bookings array if it doesn't exist
          applicantData.bookings = [];

          // Check if they have completed any of the courses
          if (applicantData.TDCStatus === "Completed" || 
              applicantData["PDC-4WheelsStatus"] === "Completed" || 
              applicantData["PDC-MotorsStatus"] === "Completed") {
            studentsMap.set(applicantDoc.id, applicantData);
          }
        }
      });

      // Fetch all appointments and add to studentsMap if they have bookings
      onSnapshot(collection(db, "appointments"), (appointmentsSnapshot) => {
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

                // Ensure that only users with the role "student" are included
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

        // Fetch completedBookings and update the map with completed courses
        onSnapshot(collection(db, "completedBookings"), (completedBookingsSnapshot) => {
          completedBookingsSnapshot.forEach(doc => {
            const completedBookings = doc.data().completedBookings || [];
            const userId = doc.id;

            if (studentsMap.has(userId)) {
              const studentData = studentsMap.get(userId);
              completedBookings.forEach(booking => {
                const course = booking.course;

                if (!studentData[`${course}Status`] || studentData[`${course}Status`] !== "Completed") {
                  studentData[`${course}Status`] = "Completed";
                }
              });
            }
          });

          // After processing all data, update the global arrays and re-render the UI
          studentsData = Array.from(studentsMap.values());
          filteredStudentsData = studentsData;
          totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);
          renderStudents();
          updatePaginationControls();
        });
      });
    });

    // Optional: Return unsubscribe functions if you need to stop listening later
    return {
      unsubscribeApplicants,
    };
  } catch (error) {
    console.error("Error fetching appointments: ", error);
  }
}

function renderStudents() {
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = '';

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedStudents = filteredStudentsData.slice(start, end);

  paginatedStudents.forEach(student => {
    const personalInfo = student.personalInfo || {};
    const statuses = {
      TDC: student.TDCStatus || null,
      "PDC-4Wheels": student['PDC-4WheelsStatus'] || null,
      "PDC-Motors": student['PDC-MotorsStatus'] || null
    };

    const studentHtml = `
      <tr class="table-row">
        <td class="table-row-content">${personalInfo.first || ''} ${personalInfo.last || ''}</td>
        <td class="table-row-content">${student.email}</td>
        <td class="table-row-content">${student.phoneNumber || ''}</td>
        <td class="table-row-content">${student.packageName}</td>
        <td class="table-row-content">&#8369; ${student.packagePrice || ''}</td>
        ${renderCourseStatus('TDC', statuses.TDC, student.bookings)}
        ${renderCourseStatus('PDC-4Wheels', statuses["PDC-4Wheels"], student.bookings)}
        ${renderCourseStatus('PDC-Motors', statuses["PDC-Motors"], student.bookings)}
      </tr>
    `;
    studentList.insertAdjacentHTML('beforeend', studentHtml);
  });

  function renderCourseStatus(course, status, bookings = []) {
    if (status === "Completed") {
      return `
          <td class="table-row-content">
              <label class="status-label">
                  <input type="checkbox" class="status-toggle" checked disabled>
                  Completed
              </label>
          </td>
      `;
    } else {
      const booking = bookings.find(b => b.course === course && b.status === "Booked");
      if (booking) {
        return `
            <td class="table-row-content">
                <label class="status-label">
                    <input type="checkbox" class="status-toggle" 
                           data-booking-id="${booking.appointmentId}" 
                           data-user-id="${booking.userId}" 
                           data-column="${course}">
                    Completed
                </label>
            </td>
        `;
      } else {
        return '<td class="table-row-content"></td>';
      }
    }
  }

  document.querySelectorAll('.status-toggle').forEach(toggle => {
    toggle.addEventListener('change', async (event) => {
      event.preventDefault(); // Prevent the default checkbox toggle behavior

      const appointmentId = event.target.dataset.bookingId;
      const userId = event.target.dataset.userId;
      const course = event.target.dataset.column;
      const isCompleted = event.target.checked;

      const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'), {
        backdrop: 'static',
        keyboard: false 
      });
      confirmationModal.show();

      document.getElementById('confirmButton').onclick = async () => {
        confirmationModal.hide();
        await toggleCompletionStatus(userId, course, isCompleted, appointmentId);
      };

      document.getElementById('confirmationModal').querySelector('.btn-secondary').onclick = () => {
        event.target.checked = !isCompleted;
        confirmationModal.hide();
      };
    });
  });
}

async function toggleCompletionStatus(userId, course, isCompleted, appointmentId) {
  try {
    const applicantDocRef = doc(db, "applicants", userId);
    const updateData = {};
    if (isCompleted) {
      updateData[`${course}Status`] = "Completed";
    } else {
      updateData[`${course}Status`] = deleteField();
    }
    await updateDoc(applicantDocRef, updateData);

    if (appointmentId) {
      const docRef = doc(db, "appointments", appointmentId);
      const docSnapshot = await getDoc(docRef);

      if (docSnapshot.exists()) {
        const appointmentData = docSnapshot.data();

        if (Array.isArray(appointmentData.bookings)) {
          const updatedBookings = appointmentData.bookings.map(booking => {
            if (booking.userId === userId && booking.status === "Booked") {
              return { ...booking, progress: isCompleted ? "Completed" : "Not yet Started" };
            }
            return booking;
          });

          await updateDoc(docRef, { bookings: updatedBookings });
        } else {
          console.error("No bookings array found in document:", appointmentId);
        }

        if (isCompleted) {
          const completedBookingData = {
            course: course,
            date: appointmentData.date,
            startTime: appointmentData.timeStart,
            endTime: appointmentData.timeEnd,
            progress: "Completed",
            status: "Completed",
          };
          await updateCompletedBookings(userId, completedBookingData);
        }

      } else {
        console.error("No document found with ID:", appointmentId);
      }
    }
  } catch (error) {
    console.error("Error updating completion status:", error);
  }
}

async function updateCompletedBookings(userId, bookingDetails) {
  try {
    const completedBookingRef = doc(db, "completedBookings", userId);
    const completedBookingSnap = await getDoc(completedBookingRef);

    if (completedBookingSnap.exists()) {
      const existingBookings = completedBookingSnap.data().completedBookings || [];
      const courseIndex = existingBookings.findIndex(b => b.course === bookingDetails.course);

      if (courseIndex !== -1) {
        existingBookings[courseIndex] = bookingDetails;
      } else {
        existingBookings.push(bookingDetails);
      }

      await updateDoc(completedBookingRef, {
        completedBookings: existingBookings
      });
    } else {
      await setDoc(completedBookingRef, {
        completedBookings: [bookingDetails]
      });
    }
  } catch (error) {
    console.error("Error updating completed bookings: ", error);
  }
}

function updatePaginationControls() {
  const paginationControls = document.querySelector('.pagination-controls');
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
  filteredStudentsData = studentsData.filter(student => {
    const fullName = `${student.personalInfo.first || ''} ${student.personalInfo.last || ''}`.toLowerCase();
    return fullName.startsWith(searchTerm);
  });
  currentPage = 1;
  totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);
  renderStudents();
  updatePaginationControls();
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
