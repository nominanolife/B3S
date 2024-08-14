import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc, setDoc, deleteField } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
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

      // Fetch all applicants who have the student role and check for course status or active bookings
      const applicantsSnapshot = await getDocs(collection(db, "applicants"));
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
      const appointmentsSnapshot = await getDocs(collection(db, "appointments"));
      for (const appointment of appointmentsSnapshot.docs) {
          const appointmentData = appointment.data();
          const bookings = Array.isArray(appointmentData.bookings) ? appointmentData.bookings : [];

          for (const booking of bookings) {
              if (booking.status === "Cancelled" || booking.status === "Rescheduled") {
                  continue;
              }

              const studentDocRef = doc(db, "applicants", booking.userId);
              const studentDoc = await getDoc(studentDocRef);
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
          }
      }

      // Fetch completedBookings and update the map with completed courses
      const completedBookingsSnapshot = await getDocs(collection(db, "completedBookings"));
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

      studentsData = Array.from(studentsMap.values());
      filteredStudentsData = studentsData;
      totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);
      renderStudents();
      updatePaginationControls();
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
    // Check if the course status in the applicant's document is "Completed"
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
        // If there's an active booking for the course
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

  // Update status in Firestore when a checkbox is toggled
  document.querySelectorAll('.status-toggle').forEach(toggle => {
    toggle.addEventListener('change', async (event) => {
      const appointmentId = event.target.dataset.bookingId;
      const userId = event.target.dataset.userId;
      const course = event.target.dataset.column;
      const isCompleted = event.target.checked;

      await toggleCompletionStatus(userId, course, isCompleted, appointmentId);
    });
  });
}

// Function to toggle the completion status and update Firestore
async function toggleCompletionStatus(userId, course, isCompleted, appointmentId) {
  try {
    // Update the applicants collection with the status
    const applicantDocRef = doc(db, "applicants", userId);
    const updateData = {};
    if (isCompleted) {
      updateData[`${course}Status`] = "Completed";
    } else {
      updateData[`${course}Status`] = deleteField(); // Remove the field if unchecked
    }
    await updateDoc(applicantDocRef, updateData);

    // Update the appointments collection if appointmentId exists
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
            course: course, // The course name
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

// Function to update the completedBookings collection
async function updateCompletedBookings(userId, bookingDetails) {
  try {
    const completedBookingRef = doc(db, "completedBookings", userId);
    const completedBookingSnap = await getDoc(completedBookingRef);

    if (completedBookingSnap.exists()) {
      // Document exists, update the array with course check
      const existingBookings = completedBookingSnap.data().completedBookings || [];

      // Check if a booking for this course already exists, and update it if necessary
      const courseIndex = existingBookings.findIndex(b => b.course === bookingDetails.course);

      if (courseIndex !== -1) {
        existingBookings[courseIndex] = bookingDetails; // Update existing course booking
      } else {
        existingBookings.push(bookingDetails); // Add new course booking
      }

      await updateDoc(completedBookingRef, {
        completedBookings: existingBookings
      });
    } else {
      // Document does not exist, create it with the first booking
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
  currentPage = 1; // Reset to the first page after filtering
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
