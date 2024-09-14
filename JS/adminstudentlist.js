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

function showNotification(message) {
  const successModalBody = document.getElementById('successModalBody');
  successModalBody.textContent = message;

  // Show the modal using jQuery for Bootstrap 4
  $('#successModal').modal('show'); // Show the modal
}

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
          applicantData.has4WheelsCourse = false; // Initialize flag for 4-Wheels
          applicantData.hasMotorsCourse = false; // Initialize flag for Motors

          if (applicantData.TDCStatus === "Completed" ||
            applicantData["PDC-4WheelsStatus"] === "Completed" ||
            applicantData["PDC-MotorsStatus"] === "Completed") {
            studentsMap.set(applicantDoc.id, applicantData);
          }
        }
      }

      // Process appointments
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
                studentData.has4WheelsCourse = false; // Initialize flag for 4-Wheels
                studentData.hasMotorsCourse = false; // Initialize flag for Motors
                studentsMap.set(booking.userId, studentData);
              }

              const student = studentsMap.get(booking.userId);
              student.bookings.push({
                ...booking,
                appointmentId: appointment.id,
                course: appointmentData.course,
                date: appointmentData.date,
                timeStart: appointmentData.timeStart,
                timeEnd: appointmentData.timeEnd,
              });

              // Check course type and set flags
              if (appointmentData.course === "PDC-4Wheels") {
                student.has4WheelsCourse = true;
              }
              if (appointmentData.course === "PDC-Motors") {
                student.hasMotorsCourse = true;
              }
            }
          }
        }
      }

      // Process completedBookings
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

      // Now, fetch instructor information from matches collection
      const matchesSnapshot = await getDocs(collection(db, "matches"));
      const instructorMap = new Map();

      for (const matchDoc of matchesSnapshot.docs) {
        const matchData = matchDoc.data();
        const studentId = matchData.studentId;
        const instructorId = matchData.instructorId;

        if (studentsMap.has(studentId)) {
          // Fetch instructor data
          if (!instructorMap.has(instructorId)) {
            const instructorDocRef = doc(db, "instructors", instructorId);
            const instructorDoc = await getDoc(instructorDocRef);
            if (instructorDoc.exists()) {
              instructorMap.set(instructorId, instructorDoc.data());
            }
          }
          const student = studentsMap.get(studentId);
          student.instructorName = instructorMap.get(instructorId)?.name || "N/A"; // Add instructor name to student
        }
      }

      // Update the global arrays
      studentsData = Array.from(studentsMap.values());
      filteredStudentsData = studentsData;
      totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);

      // Debugging: Ensure data is populated correctly
      console.log("Populated studentsData:", studentsData);

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

document.getElementById('saveChangesBtn').onclick = async (event) => {
  event.preventDefault(); // Prevent page refresh

  const newCertificateNumber = document.getElementById('certificateControlNumberInput').value;

  // Retrieve the student index from the button's data attribute
  const studentIndex = event.target.getAttribute('data-student-index');
  console.log("Retrieved student index from data attribute:", studentIndex); // Debugging output

  if (studentIndex === null || studentIndex === undefined) {
    console.error("Student index is null or undefined.");
    showNotification("Failed to update certificate control number.");
    return;
  }

  const studentData = studentsData[studentIndex]; // Retrieve the correct student data

  if (!studentData || !studentData.id) {
    console.error("Student data is invalid or ID is missing:", studentData);
    showNotification("Failed to update certificate control number.");
    return;
  }

  console.log("Student Data:", studentData); // Debugging output to see if the student data is correctly fetched

  try {
    const studentDocRef = doc(db, "applicants", studentData.id); // Ensure studentData.id is correct
    console.log("Updating student with ID:", studentData.id); // Debugging output to confirm the correct student ID

    await setDoc(studentDocRef, { certificateControlNumber: newCertificateNumber }, { merge: true });

    studentData.certificateControlNumber = newCertificateNumber;

    renderStudents();
    setupStatusToggleListeners();

    // Close the editCcnModal immediately
    $('#editCcnModal').modal('hide'); // Close the modal using jQuery

    // Show success notification
    showNotification("Certificate control number updated successfully!");

  } catch (error) {
    console.error("Error updating certificate control number:", error);
    showNotification("Failed to update certificate control number.");
  }
};

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
                <!-- Only one icon to trigger the dropdown options -->
                <i class="bi bi-three-dots" data-toggle="options" data-index="${index}"></i>
                <div class="triple-dot-options" style="display: none;">
                    <i class="option-dropdown" data-modal="editCcnModal" data-index="${index}">Certificate Control Number</i>
                    <i class="option-dropdown" data-modal="edit4WheelsModal" data-index="${index}">4-Wheels Course Checklist</i>
                    <i class="option-dropdown" data-modal="editMotorsModal" data-index="${index}">Motorcycle Course Checklist</i>
                </div>
            </td>
        </tr>
    `;
    studentList.insertAdjacentHTML('beforeend', studentHtml);
  });
  setupStatusToggleListeners(); // Set up listeners for toggles after rendering
}

function renderCourseStatus(course, status, bookings = []) {
  const today = new Date(); // Current date
  const booking = bookings.find(b => b.course === course);
  
  if (booking) {
    const appointmentDate = new Date(booking.date);
    const isPastDate = appointmentDate < today;

    if (status === "Completed" || isPastDate) {
      return `
        <td class="table-row-content">
          <label class="status-label">
            <input type="checkbox" class="status-toggle" checked
                   data-booking-id="${booking.appointmentId}"
                   data-user-id="${booking.userId}"
                   data-column="${course}">
          </label>
        </td>
      `;
    } else {
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
    }
  } else {
    return '<td class="table-row-content"></td>';
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

  // Show confirmation message dynamically based on the checkbox state
  const confirmationMessage = isCompleted ? 
      "Are you sure you want to complete the appointment of this student?" : 
      "Are you sure you want to revert the appointment of this student?";
      
  document.getElementById('confirmationModalBody').textContent = confirmationMessage;

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

    // Update the local studentsData array
    const studentIndex = studentsData.findIndex(s => s.id === userId);
    if (studentIndex !== -1) {
      const student = studentsData[studentIndex];
      if (isCompleted) {
        student[`${course}Status`] = "Completed";
      } else {
        delete student[`${course}Status`];
      }

      // Also update the bookings
      if (student.bookings) {
        const bookingIndex = student.bookings.findIndex(b => b.appointmentId === appointmentId);
        if (bookingIndex !== -1) {
          const booking = student.bookings[bookingIndex];
          booking.progress = isCompleted ? "Completed" : "Not yet Started";
          booking.status = isCompleted ? "Completed" : "Booked";
        }
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
  setupModalListeners();
  // Add search functionality
  const searchInput = document.querySelector('.search');
  searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    filterStudents(searchTerm);
  });
});

function openEditModal(index, modalId = 'editCcnModal') {
  const studentData = studentsData[index]; // Retrieve student data using the correct index

  // Function to convert 24-hour time to 12-hour format
  function convertTo12HourFormat(time24) {
    let [hours, minutes] = time24.split(':');
    hours = parseInt(hours);
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${hours}:${minutes} ${period}`;
  }

  // Convert date to "Month Day, Year" format
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Populate student and instructor names, and date/time in the modal
  if (modalId === 'edit4WheelsModal') {
    const booking = studentData.bookings[0];

    // Format date and time
    const formattedDate = formatDate(booking.date);
    const formattedStartTime = convertTo12HourFormat(booking.timeStart);
    const formattedEndTime = convertTo12HourFormat(booking.timeEnd);

    // Populate modal
    document.querySelector('#edit4WheelsModal .modal-body .student-info p:nth-child(1) span').textContent = `${studentData.personalInfo.first || ''} ${studentData.personalInfo.last || ''}`;
    document.querySelector('#edit4WheelsModal .modal-body .student-info p:nth-child(2) span').textContent = `${formattedDate} || ${formattedStartTime} - ${formattedEndTime}`;
    document.querySelector('#edit4WheelsModal .modal-body .student-info p:nth-child(3) span').textContent = studentData.instructorName || "N/A";
    document.querySelector('#edit4WheelsModal .modal-body.second-section .student-info #studentName').textContent = `${studentData.personalInfo.first || ''} ${studentData.personalInfo.last || ''}`;
  }

  // Validate TDC status only for the certificate control number modal
  if (modalId === 'editCcnModal') {
    if (!studentData.TDCStatus || studentData.TDCStatus !== "Completed") {
      console.warn("Student has not yet completed their TDC appointment.");
      showNotification("This student has not yet finished their TDC appointment.");
      return;
    }
  }

  // Check if "4 Wheels" checkbox is unchecked
  if (modalId === 'edit4WheelsModal') {
    if (!studentData.has4WheelsCourse) { // Use a key that represents the 4-Wheels checkbox status
      console.warn("Student does not have a 4-Wheels appointment.");
      showNotification("This student does not have a 4-Wheels appointment.");
      return;
    }
  }

  // Check if "Motors" checkbox is unchecked
  if (modalId === 'editMotorsModal') {
    if (!studentData.hasMotorsCourse) { // Use a key that represents the Motors checkbox status
      console.warn("Student does not have a Motorcycle appointment.");
      showNotification("This student does not have a Motorcycle appointment.");
      return;
    }
  }

  // Set the input value and data attribute for the default modal
  if (modalId === 'editCcnModal') {
    document.getElementById('certificateControlNumberInput').value = studentData.certificateControlNumber || '';
  }

  // Set the index as a data attribute on the save button to retrieve it later
  const saveButton = document.getElementById('saveChangesBtn');
  saveButton.setAttribute('data-student-index', index);

  console.log("Setting data-student-index to:", index); // Debugging output

  // Show the correct modal with options to prevent closing
  const modalToOpen = new bootstrap.Modal(document.getElementById(modalId), {
    backdrop: 'static',
    keyboard: false
  });
  modalToOpen.show();
}

function setupModalListeners() {
  const studentList = document.getElementById('student-list');
  let currentlyOpenOptions = null; // Track the currently open options

  studentList.addEventListener('click', (event) => {
    if (event.target.classList.contains('bi-three-dots')) {
      event.stopPropagation();
      const options = event.target.nextElementSibling; // Get the options container

      const index = event.target.getAttribute('data-index');
      const studentData = studentsData[index]; // Retrieve student data using the correct index

      // Hide options based on student data
      const edit4WheelsOption = options.querySelector('[data-modal="edit4WheelsModal"]');
      const editMotorsOption = options.querySelector('[data-modal="editMotorsModal"]');

      // Show "4-Wheels Course Checklist" if the student has a 4-Wheels appointment
      edit4WheelsOption.style.display = studentData.has4WheelsCourse ? 'block' : 'none';

      // Show "Motorcycle Course Checklist" if the student has a Motors appointment
      editMotorsOption.style.display = studentData.hasMotorsCourse ? 'block' : 'none';

      if (currentlyOpenOptions && currentlyOpenOptions !== options) {
        currentlyOpenOptions.style.display = 'none'; // Hide any other open options
      }

      options.style.display = options.style.display === 'block' ? 'none' : 'block'; // Toggle visibility
      currentlyOpenOptions = options.style.display === 'block' ? options : null;
      return; // Exit function to avoid further processing
    }

    if (event.target.classList.contains('option-dropdown')) {
      const modalId = event.target.getAttribute('data-modal'); // Get the modal ID from the clicked option
      const index = event.target.closest('td').querySelector('.bi-three-dots').getAttribute('data-index'); // Get the student index
      openEditModal(index, modalId); // Open the corresponding modal
    }
  });

  document.addEventListener('click', () => {
    if (currentlyOpenOptions) {
      currentlyOpenOptions.style.display = 'none';
      currentlyOpenOptions = null;
    }
  });

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

// Custom dropdown functionality for Vehicle Type
document.getElementById('vehicleDropdown').addEventListener('click', function (e) {
  const dropdown = e.currentTarget;
  dropdown.classList.toggle('open');
  e.stopPropagation(); // Prevent event from bubbling to the document level
});

// Close Vehicle Type dropdown on selecting an option and update the selected value
document.querySelectorAll('#vehicleTypeOptions .option').forEach(option => {
  option.addEventListener('click', function (e) {
      const selectedOption = e.currentTarget;
      const dropdown = selectedOption.closest('.custom-dropdown');
      dropdown.querySelector('.selected').textContent = selectedOption.textContent;
      dropdown.classList.remove('open'); // Close the dropdown after selecting an option
      e.stopPropagation(); // Prevent the event from bubbling up and causing unintended behavior
  });
});

// Close Vehicle Type dropdown when clicking outside of it
document.addEventListener('click', function (event) {
  const vehicleDropdown = document.getElementById('vehicleDropdown');
  if (!vehicleDropdown.contains(event.target)) {
      vehicleDropdown.classList.remove('open');
  }
});