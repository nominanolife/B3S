import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, setDoc, deleteField, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
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

// Function to show the notification modal
function showNotification(message) {
  const successModalBody = document.getElementById('successModalBody');
  successModalBody.textContent = message;

  successModal.show();
}

// Fetch appointments and update students data
async function fetchAppointments() {
  try {
    const studentsMap = new Map();

    // Real-time listener for applicants
    const unsubscribeApplicants = onSnapshot(collection(db, "applicants"), async (applicantsSnapshot) => {
      for (const applicantDoc of applicantsSnapshot.docs) {
        const applicantData = applicantDoc.data();
        applicantData.id = applicantDoc.id; // Ensure this is set consistently

        // Only process if the role is "student"
        if (applicantData.role === "student") {
          applicantData.bookings = [];
          if (applicantData.TDCStatus === "Completed" ||
            applicantData["PDC-4WheelsStatus"] === "Completed" ||
            applicantData["PDC-MotorsStatus"] === "Completed") {
            studentsMap.set(applicantDoc.id, applicantData);
          }
        }
      }

      // Wait for appointments to load
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

      // Wait for completedBookings to load
      const completedBookingsSnapshot = await getDocs(collection(db, "completedBookings"));
      for (const doc of completedBookingsSnapshot.docs) {
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
      }

      // After processing all data, update the global arrays and re-render the UI
      studentsData = Array.from(studentsMap.values());
      filteredStudentsData = studentsData;
      totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);
      renderStudents();
      updatePaginationControls();
    });

    return {
      unsubscribeApplicants,
    };
  } catch (error) {
    console.error("Error fetching appointments: ", error);
  }
}

// Event listener for edit icons (edit certificate number)
document.getElementById('student-list').addEventListener('click', async (event) => {
  if (event.target.classList.contains('edit-icon')) {
    const studentId = event.target.dataset.index;
    const studentData = studentsData[studentId];
    const currentCertificate = studentData.certificateControlNumber || '';

    // Populate modal with current certificate control number
    document.getElementById('certificateControlNumberInput').value = currentCertificate;

    document.getElementById('saveChangesBtn').onclick = async (event) => {
      event.preventDefault(); // Prevent page refresh

      const newCertificateNumber = document.getElementById('certificateControlNumberInput').value;

      // Debug: Log studentData and ID
      console.log("Student data:", studentData);
      console.log("Saving certificate control number for UID:", studentData.id);

      // Update or add the certificate control number in Firestore
      try {
        const studentDocRef = doc(db, "applicants", studentData.id); // Ensure studentData.id is the correct UID
        console.log("Document reference:", studentDocRef.path);

        // Use setDoc with merge to update the document or add the field if it doesn't exist
        await setDoc(studentDocRef, {
          certificateControlNumber: newCertificateNumber
        }, { merge: true });

        // Update the local data structure with the new certificate control number
        studentData.certificateControlNumber = newCertificateNumber;

        // Re-render the student list to reflect the changes
        renderStudents();
        setupStatusToggleListeners(); // Re-setup listeners after rendering

        // Show success notification modal
        showNotification("Certificate Control Number updated successfully!");

        // Hide the modal
        editModal.hide();

      } catch (error) {
        console.error("Error updating certificate control number:", error);

        // Show failure notification modal
        showNotification("Failed to update certificate control number.");
      }
    };
  }
});

function renderStudents() {
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = '';

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedStudents = filteredStudentsData.slice(start, end);

  paginatedStudents.forEach((student, index) => {
    const personalInfo = student.personalInfo || {};
    const statuses = {
      TDC: student.TDCStatus || null,
      "PDC-4Wheels": student['PDC-4WheelsStatus'] || null,
      "PDC-Motors": student['PDC-MotorsStatus'] || null
    };

    // Certificate Control Number
    const certificateControlNumber = student.certificateControlNumber || '';

    const studentHtml = `
        <tr class="table-row">
            <td class="table-row-content">${personalInfo.first || ''} ${personalInfo.last || ''}</td>
            <td class="table-row-content">${student.email}</td>
            <td class="table-row-content">${student.phoneNumber || ''}</td>
            <td class="table-row-content">${student.packageName}</td>
            <td class="table-row-content package-price">&#8369; ${student.packagePrice || ''}</td>
            ${renderCourseStatus('TDC', statuses.TDC, student.bookings)}
            ${renderCourseStatus('PDC-4Wheels', statuses["PDC-4Wheels"], student.bookings)}
            ${renderCourseStatus('PDC-Motors', statuses["PDC-Motors"], student.bookings)}
            <td class="table-row-content">${certificateControlNumber}</td>
            <td class="table-row-content">
                <i class="bi bi-three-dots"></i>
                <div class="triple-dot-options">
                    <i class="option-dropdown">Certificate Control Number</i>
                    <i class="option-dropdown">4-Wheels Course Checklist</i>
                    <i class="option-dropdown">Motorcycle Course Checklist</i>
                </div>
                <!-- Add an edit icon with the correct data attribute -->
                <i class="edit-icon" data-index="${index}"></i>
            </td>
        </tr>
    `;
    studentList.insertAdjacentHTML('beforeend', studentHtml);
  });

  setupStatusToggleListeners(); // Set up listeners for toggles after rendering
}

// Function to render course status checkboxes
function renderCourseStatus(course, status, bookings = []) {
  if (status === "Completed") {
    const booking = bookings.find(b => b.course === course);
    return `
        <td class="table-row-content">
            <label class="status-label">
                <input type="checkbox" class="status-toggle" checked 
                       data-booking-id="${booking ? booking.appointmentId : ''}" 
                       data-user-id="${booking ? booking.userId : ''}" 
                       data-column="${course}"> 
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
              </label>
          </td>
      `;
    } else {
      return '<td class="table-row-content"></td>';
    }
  }
}

// Function to set up status toggle listeners
function setupStatusToggleListeners() {
  document.querySelectorAll('.status-toggle').forEach(toggle => {
    toggle.removeEventListener('change', handleStatusToggle); // Remove previous listener
    toggle.addEventListener('change', handleStatusToggle); // Add new listener
  });
}

// Handle the toggle status change
async function handleStatusToggle(event) {
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

  const confirmButton = document.getElementById('confirmButton');
  confirmButton.onclick = null; // Clear previous listener
  confirmButton.onclick = async () => {
    confirmationModal.hide();
    await toggleCompletionStatus(userId, course, isCompleted, appointmentId);
    renderStudents(); // Re-render students to update UI
    setupStatusToggleListeners(); // Re-setup listeners after rendering
  };

  document.getElementById('confirmationModal').querySelector('.btn-secondary').onclick = () => {
    event.target.checked = !isCompleted; // Revert the checkbox state if canceled
    confirmationModal.hide();
  };
}

// Function to toggle the completion status in Firestore
async function toggleCompletionStatus(userId, course, isCompleted, appointmentId) {
  try {
    if (!userId || !course) {
      console.error("User ID or course is missing.");
      return;
    }

    const applicantDocRef = doc(db, "applicants", userId);
    const updateData = {};

    // Update the course status field in the applicant document
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
            if (booking.userId === userId) {
              return {
                ...booking,
                progress: isCompleted ? "Completed" : "Not yet Started",
                status: isCompleted ? "Completed" : "Booked"
              };
            }
            return booking;
          });

          await updateDoc(docRef, { bookings: updatedBookings });

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
          } else {
            await removeCompletedBooking(userId, course);
          }

        } else {
          console.error("No bookings array found in document:", appointmentId);
        }
      } else {
        console.error("No document found with ID:", appointmentId);
      }
    } else {
      console.error("Appointment ID is undefined.");
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

async function removeCompletedBooking(userId, course) {
  try {
    const completedBookingRef = doc(db, "completedBookings", userId);
    const completedBookingSnap = await getDoc(completedBookingRef);

    if (completedBookingSnap.exists()) {
      let existingBookings = completedBookingSnap.data().completedBookings || [];
      existingBookings = existingBookings.filter(b => b.course !== course);

      if (existingBookings.length > 0) {
        await updateDoc(completedBookingRef, {
          completedBookings: existingBookings
        });
      } else {
        await deleteDoc(completedBookingRef); // Delete the document if no bookings are left
      }
    }
  } catch (error) {
    console.error("Error removing completed booking: ", error);
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

// Fetch students on DOM load
document.addEventListener('DOMContentLoaded', () => {
  fetchAppointments();

  // Add search functionality
  const searchInput = document.querySelector('.search');
  searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    filterStudents(searchTerm);
  });

  setupUIListeners();
});

function setupUIListeners() {
  // Event listener for edit icons
  document.getElementById('student-list').addEventListener('click', async (event) => {
    if (event.target.classList.contains('edit-icon')) {
      const studentId = event.target.dataset.index;
      const studentData = studentsData[studentId];
      const currentCertificate = studentData.certificateControlNumber || '';

      // Populate modal with current certificate control number
      document.getElementById('certificateControlNumberInput').value = currentCertificate;

      // Show the modal
      const editModal = new bootstrap.Modal(document.getElementById('editModal'));
      editModal.show();

      // Handle save changes
      document.getElementById('saveChangesBtn').onclick = async () => {
        const newCertificateNumber = document.getElementById('certificateControlNumberInput').value;

        // Update the certificate control number in Firestore
        try {
          const studentDocRef = doc(db, "applicants", studentData.id);
          await updateDoc(studentDocRef, {
            certificateControlNumber: newCertificateNumber
          });

          // Update the local data structure with the new certificate control number
          studentData.certificateControlNumber = newCertificateNumber;

          // Re-render the student list to reflect the changes
          renderStudents();
          setupStatusToggleListeners(); // Re-setup listeners after rendering

          // Show success notification modal
          showNotification("Certificate Control Number updated successfully!");

          // Hide the modal
          editModal.hide();

        } catch (error) {
          console.error("Error updating certificate control number: ", error);

          // Show failure notification modal
          showNotification("Failed to update certificate control number.");
        }
      };
    }
  });

  // Handle dropdown and modal navigation
  setupModalListeners();
}

// Search filter function
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

function setupModalListeners() {
  const studentList = document.getElementById('student-list');
  let currentlyOpenOptions = null; // Track the currently open options

  // Toggle dropdown options visibility
  studentList.addEventListener('click', (event) => {
    if (event.target.classList.contains('bi-three-dots')) {
      event.stopPropagation();
      const options = event.target.nextElementSibling;

      if (currentlyOpenOptions && currentlyOpenOptions !== options) {
        currentlyOpenOptions.style.display = 'none';
      }

      options.style.display = options.style.display === 'block' ? 'none' : 'block';
      currentlyOpenOptions = options.style.display === 'block' ? options : null;

      // Dynamically enable or disable options based on user appointments
      const row = event.target.closest('tr'); // Find the closest row
      const editIcon = row ? row.querySelector('.edit-icon') : null; // Safely find the edit icon in the row

      if (editIcon) {
        const studentId = editIcon.dataset.index; // Get the student ID
        const studentData = studentsData[studentId]; // Fetch the student's data

        // Check which courses the student has appointments for
        const has4WheelsCourse = studentData.bookings.some(booking => booking.course === 'PDC-4Wheels' && booking.status !== 'Cancelled');
        const hasMotorcycleCourse = studentData.bookings.some(booking => booking.course === 'PDC-Motors' && booking.status !== 'Cancelled');

        // Enable or disable the options based on the above checks
        row.querySelectorAll('.option-dropdown').forEach(option => {
          if (option.textContent.trim() === '4-Wheels Course Checklist') {
            option.style.display = has4WheelsCourse ? 'block' : 'none';
          }
          if (option.textContent.trim() === 'Motorcycle Course Checklist') {
            option.style.display = hasMotorcycleCourse ? 'block' : 'none';
          }
        });
      } else {
        console.error("Edit icon not found in the row.");
      }
    }

    // Open the corresponding modal if the option is clicked and enabled
    if (event.target.classList.contains('option-dropdown')) {
      const modals = {
        'Certificate Control Number': 'editCcnModal',
        '4-Wheels Course Checklist': 'edit4WheelsModal',
        'Motorcycle Course Checklist': 'editMotorsModal',
      };
      const targetText = event.target.textContent.trim();
      if (modals[targetText]) {
        new bootstrap.Modal(document.getElementById(modals[targetText])).show();
      }
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    if (currentlyOpenOptions) {
      currentlyOpenOptions.style.display = 'none';
      currentlyOpenOptions = null;
    }
  });

  // Handle modal navigation (Next/Back buttons)
  ['edit4WheelsModal', 'editMotorsModal'].forEach(setupModalNavigation);
}

// Setup navigation between modal steps
function setupModalNavigation(modalId) {
  const modal = document.getElementById(modalId);
  const [firstSection, secondSection] = modal.querySelectorAll('.modal-body');
  const [backBtn, nextBtn, saveBtn] = modal.querySelectorAll('.back-btn, .next-btn, .save-btn');

  // Initialize sections and buttons visibility
  [firstSection, nextBtn].forEach(el => el.classList.remove('d-none'));
  [secondSection, backBtn, saveBtn].forEach(el => el.classList.add('d-none'));

  nextBtn.addEventListener('click', () => toggleSections(true));
  backBtn.addEventListener('click', () => toggleSections(false));

  function toggleSections(showSecond) {
    firstSection.classList.toggle('d-none', showSecond);
    secondSection.classList.toggle('d-none', !showSecond);
    [nextBtn, backBtn, saveBtn].forEach(btn => btn.classList.toggle('d-none'));
  }
}

document.addEventListener('input', function (event) {
  if (event.target.classList.contains('comment-input') || event.target.classList.contains('comment-suggestion-input')) {
    event.target.style.height = 'auto'; // Reset the height
    event.target.style.height = `${event.target.scrollHeight}px`; // Set the height based on scroll height
  }
});
