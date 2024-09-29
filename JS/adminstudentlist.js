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
  const confirmationMessage = isCompleted
    ? "Are you sure you want to complete the appointment of this student?"
    : "Are you sure you want to revert the appointment of this student?";

  document.getElementById('confirmationModalBody').textContent = confirmationMessage;

  const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
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

// Function to open the edit modal
function openEditModal(index, modalId = 'editCcnModal') {
    selectedStudentIndex = index; // Store the selected student's index or ID
    const studentData = studentsData[index]; // Retrieve student data using the index

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

    // Check conditions for different modals
    if (modalId === 'editCcnModal') {
        if (!studentData.TDCStatus || studentData.TDCStatus !== "Completed") {
            showNotification("This student has not yet finished their TDC appointment.");
            return;
        }
    }

    if (modalId === 'edit4WheelsModal' && !studentData.has4WheelsCourse) {
        showNotification("This student does not have a 4-Wheels appointment.");
        return;
    }

    if (modalId === 'editMotorsModal' && !studentData.hasMotorsCourse) {
        showNotification("This student does not have a Motorcycle appointment.");
        return;
    }

    if (modalId === 'editCcnModal') {
        document.getElementById('certificateControlNumberInput').value = studentData.certificateControlNumber || '';
    }

    // Set the index as a data attribute on the save button
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

let selectedStudentIndex = null; // Global variable to store the selected student's index or ID

// Define the fields and their respective weights for scoring
const fields = [
  { id: 'eyeLeadTime', weight: 6 },
  { id: 'leftRightScanning', weight: 6 },
  { id: 'mirrorsTracking', weight: 6 },
  { id: 'defensiveDistance', weight: 6 },
  { id: 'spaceAtStops', weight: 6 },
  { id: 'leastResistance', weight: 6 },
  { id: 'rightOfWay', weight: 6 },
  { id: 'acceleration', weight: 6 },
  { id: 'braking', weight: 6 },
  { id: 'speedForConditions', weight: 6 },
  { id: 'trafficSigns', weight: 6 },
  { id: 'lanePosition', weight: 6 },
  { id: 'steering', weight: 6 },
  { id: 'signals', weight: 6 },
  { id: 'eyeContact', weight: 6 },
  { id: 'seating', weight: 6 },
  { id: 'parking', weight: 6 },
  { id: 'anticipation', weight: 6 },
  { id: 'judgment', weight: 6 },
  { id: 'timing', weight: 4 }
];

// Define the maximum scores for each category
const maxScores = {
  "Observation": 15,
  "Space Management": 20,
  "Speed Control": 20,
  "Steering": 10,
  "Communication": 10,
  "General": 25
};

// Function to calculate the total score for the assessment form
function calculateTotalScore() {
  let totalScore = 0;
  
  // Iterate over each field and sum their values
  fields.forEach(field => {
      const fieldValue = parseFloat(document.getElementById(field.id)?.value) || 0;
      
      // Ensure that the value is a valid number within the allowed range
      if (fieldValue >= 0 && fieldValue <= 5) {
          totalScore += fieldValue;
      }
  });

  // Display the total score out of 100
  const totalScoreOutOf100 = totalScore; // Adjust this if you want scaling
  document.getElementById('totalScore').textContent = `${totalScoreOutOf100} / 100`;

  // Validate and display a warning if the total score exceeds 100
  if (totalScoreOutOf100 > 100) {
      showNotification('Total score exceeds 100. Please adjust the scores.');
  }

  return totalScoreOutOf100; // Return the total score
}

// Function to save assessment data to session storage
function saveAssessmentDataToSession() {
    if (selectedStudentIndex === null) {
        showNotification('No student selected. Please select a student to save data.');
        return;
    }

    const studentData = studentsData[selectedStudentIndex]; // Use the stored index to retrieve the correct student

    // Create an object to store the assessment data
    const assessmentData = {
        studentName: `${studentData.personalInfo.first || ''} ${studentData.personalInfo.last || ''}`,
        instructorName: studentData.instructorName || "N/A",
        dateAndTime: document.getElementById('dateAndTime') ? document.getElementById('dateAndTime').textContent : "N/A",
        vehicleType: document.getElementById('vehicleTypeSelected') ? document.getElementById('vehicleTypeSelected').textContent : "N/A",
        categories: [
            {
                category: "Observation",
                items: [
                    { sentence: "Eye lead time", score: parseFloat(document.getElementById('eyeLeadTime')?.value) || 0, comment: document.querySelector('#commentEyeLeadTime')?.value || "" },
                    { sentence: "Left – Right / Scanning / Shoulder checks", score: parseFloat(document.getElementById('leftRightScanning')?.value) || 0, comment: document.querySelector('#commentLeftRightScanning')?.value || "" },
                    { sentence: "Mirrors / tracking traffic", score: parseFloat(document.getElementById('mirrorsTracking')?.value) || 0, comment: document.querySelector('#commentMirrorsTracking')?.value || "" }
                ]
            },
            {
                category: "Space Management",
                items: [
                    { sentence: "Following defensive distance", score: parseFloat(document.getElementById('defensiveDistance')?.value) || 0, comment: document.querySelector('#commentDefensiveDistance')?.value || "" },
                    { sentence: "Space at Stops", score: parseFloat(document.getElementById('spaceAtStops')?.value) || 0, comment: document.querySelector('#commentSpaceAtStops')?.value || "" },
                    { sentence: "Path of least resistance", score: parseFloat(document.getElementById('leastResistance')?.value) || 0, comment: document.querySelector('#commentLeastResistance')?.value || "" },
                    { sentence: "Right-of-way", score: parseFloat(document.getElementById('rightOfWay')?.value) || 0, comment: document.querySelector('#commentRightOfWay')?.value || "" }
                ]
            },
            {
                category: "Speed Control",
                items: [
                    { sentence: "Acceleration / Deceleration – Smoothness", score: parseFloat(document.getElementById('acceleration')?.value) || 0, comment: document.querySelector('#commentAcceleration')?.value || "" },
                    { sentence: "Braking: Full Stops, smooth", score: parseFloat(document.getElementById('braking')?.value) || 0, comment: document.querySelector('#commentBraking')?.value || "" },
                    { sentence: "Speed for Conditions", score: parseFloat(document.getElementById('speedForConditions')?.value) || 0, comment: document.querySelector('#commentSpeedForConditions')?.value || "" },
                    { sentence: "Speed and Traffic signs", score: parseFloat(document.getElementById('trafficSigns')?.value) || 0, comment: document.querySelector('#commentTrafficSigns')?.value || "" }
                ]
            },
            {
                category: "Steering",
                items: [
                    { sentence: "Lane / Turn Position / set-up", score: parseFloat(document.getElementById('lanePosition')?.value) || 0, comment: document.querySelector('#commentLanePosition')?.value || "" },
                    { sentence: "Steering: hand position, smoothness", score: parseFloat(document.getElementById('steering')?.value) || 0, comment: document.querySelector('#commentSteering')?.value || "" }
                ]
            },
            {
                category: "Communication",
                items: [
                    { sentence: "Signals: timing and use", score: parseFloat(document.getElementById('signals')?.value) || 0, comment: document.querySelector('#commentSignals')?.value || "" },
                    { sentence: "Other: i.e horn, eye contact", score: parseFloat(document.getElementById('eyeContact')?.value) || 0, comment: document.querySelector('#commentEyeContact')?.value || "" }
                ]
            },
            {
                category: "General",
                items: [
                    { sentence: "Seating, head rest position, and mirror adjustment: seatbelt use", score: parseFloat(document.getElementById('seating')?.value) || 0, comment: document.querySelector('#commentSeating')?.value || "" },
                    { sentence: "Parking / Backing", score: parseFloat(document.getElementById('parking')?.value) || 0, comment: document.querySelector('#commentParking')?.value || "" },
                    { sentence: "Anticipation: Adjusts", score: parseFloat(document.getElementById('anticipation')?.value) || 0, comment: document.querySelector('#commentAnticipation')?.value || "" },
                    { sentence: "Judgment: decisions", score: parseFloat(document.getElementById('judgment')?.value) || 0, comment: document.querySelector('#commentJudgment')?.value || "" },
                    { sentence: "Timing: approach, Traffic interactions", score: parseFloat(document.getElementById('timing')?.value) || 0, comment: document.querySelector('#commentTiming')?.value || "" }
                ]
            }
        ]
    };

    // Save the assessment data in session storage with a key based on the student index
    sessionStorage.setItem(`4WheelsAssess_${selectedStudentIndex}`, JSON.stringify(assessmentData));

    showNotification(`Assessment data has been saved successfully for ${assessmentData.studentName}`);
}

async function sendAssessmentDataToFlask() {
  if (selectedStudentIndex === null) {
      showNotification('No student selected. Please select a student to send data.');
      return;
  }

  const assessmentData = JSON.parse(sessionStorage.getItem(`4WheelsAssess_${selectedStudentIndex}`)) || {};

  // Prepare data to send: Aggregate the raw scores by category
  const dataToSend = {
      "Observation": 0,
      "Space Management": 0,
      "Speed Control": 0,
      "Steering": 0,
      "Communication": 0,
      "General": 0
  };

  // Sum the raw scores for each category
  assessmentData.categories.forEach(category => {
      const categoryName = category.category;
      category.items.forEach(item => {
          const score = parseFloat(item.score); // Ensure the score is a number
          if (isNaN(score)) {
              console.error(`Invalid score for ${categoryName}:`, item.score);
          } else {
              dataToSend[categoryName] += score;
          }
      });
  });

  console.log('Raw Data to send:', dataToSend); // Log the raw data

  try {
      const response = await fetch('http://127.0.0.1:5000/predict', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              categories: [dataToSend], // Send raw aggregated scores
              maxScores: maxScores      // Send maximum scores for reference
          })
      });

      if (!response.ok) {
          throw new Error('Network response was not ok');
      }

      const result = await response.json();
      console.log('Prediction results:', result);

      // Use the predictions directly from the AI
      const interpretedResults = result.predictions;

      // Store the interpreted results in session storage
      sessionStorage.setItem(`ProcessedData_${selectedStudentIndex}`, JSON.stringify(interpretedResults));

  } catch (error) {
      console.error('Error sending data to Flask API:', error);
      showNotification('Failed to send data. Please try again.');
  }
}

async function saveAllDataToFirestore() {
  if (selectedStudentIndex === null) {
      showNotification('No student selected. Please select a student to save data.');
      return;
  }

  // Retrieve assessment data from session storage
  const assessmentData = JSON.parse(sessionStorage.getItem(`4WheelsAssess_${selectedStudentIndex}`)) || {};
  const processedData = JSON.parse(sessionStorage.getItem(`ProcessedData_${selectedStudentIndex}`)) || {};

  // Get data from the checklist
  const checklistData = {
      studentName: document.getElementById('studentName').textContent,
      studentPermit: document.getElementById('studentPermit').value,
      checklist: {
          lesson1TopicA: document.getElementById('lesson1TopicA').checked,
          lesson1TopicB: document.getElementById('lesson1TopicB').checked,
          lesson1TopicC: document.getElementById('lesson1TopicC').checked,
          lesson1TopicD: document.getElementById('lesson1TopicD').checked,
          lesson1TopicE: document.getElementById('lesson1TopicE').checked,
          lesson2TopicA: document.getElementById('lesson2TopicA').checked,
          lesson2TopicB: document.getElementById('lesson2TopicB').checked,
          lesson3TopicA: document.getElementById('lesson3TopicA').checked,
          lesson3TopicB: document.getElementById('lesson3TopicB').checked,
          lesson4TopicA: document.getElementById('lesson4TopicA').checked,
          lesson5TopicA: document.getElementById('lesson5TopicA').checked,
          lesson6TopicA: document.getElementById('lesson6TopicA').checked,
          lesson6TopicB: document.getElementById('lesson6TopicB').checked,
          lesson6TopicC: document.getElementById('lesson6TopicC').checked,
          lesson7TopicA: document.getElementById('lesson7TopicA').checked,
          lesson7TopicB: document.getElementById('lesson7TopicB').checked,
          lesson7TopicC: document.getElementById('lesson7TopicC').checked,
          lesson8TopicA: document.getElementById('lesson8TopicA').checked,
          lesson9TopicA: document.getElementById('lesson9TopicA').checked,
          lesson10TopicA: document.getElementById('lesson10TopicA').checked,
          lesson11TopicA: document.getElementById('lesson11TopicA').checked
      }
  };

  // Remove the bookings property from student data
  const { bookings, ...studentDataWithoutBookings } = studentsData[selectedStudentIndex];

  // Combine assessment, processed, and checklist data
  const combinedData = {
      ...studentDataWithoutBookings, // Include existing student data without bookings
      assessmentData, // Add the assessment data
      processedData, // Add the processed data
      ...checklistData // Add the checklist data
  };

  try {
      await setDoc(doc(db, "applicants", studentsData[selectedStudentIndex].id), combinedData, { merge: true });
      console.log('Saving combined data:', combinedData);
      showNotification(`All data has been saved successfully for ${checklistData.studentName}`);
  } catch (e) {
      console.error("Error saving combined data: ", e);
      showNotification('Failed to save all data. Please try again.');
  }
}

// Attach event listeners to input fields for real-time calculation and prevent exceeding 5
document.querySelectorAll('input.numeric-input').forEach(input => {
  input.addEventListener('input', function (event) {
      // Remove non-numeric characters
      this.value = this.value.replace(/[^0-9.]/g, '');

      // Ensure there's only one decimal point in the input
      if ((this.value.match(/\./g) || []).length > 1) {
          this.value = this.value.slice(0, -1);
      }

      // Limit the value to a maximum of 5
      if (parseFloat(this.value) > 5) {
          this.value = '5';
      }

      // Ensure the value is between 0 and 5
      if (parseFloat(this.value) < 0) {
          this.value = '0';
      }

      // Recalculate the total score after filtering
      calculateTotalScore();
  });
});

document.getElementById('nextBtn').addEventListener('click', async function () {
    // Calculate total score before saving
    const totalScore = calculateTotalScore(); 

    // Save raw assessment data to session storage
    saveAssessmentDataToSession(); 

    // Wait for AI processing and store the processed data
    await sendAssessmentDataToFlask(); // Send data to Flask API and wait for response

    // After processing, show the next modal
    const currentModal = document.querySelector('.modal.show');
    const nextModal = document.getElementById('editChecklistModal');

    if (currentModal) {
        const modalInstance = bootstrap.Modal.getInstance(currentModal);
        if (modalInstance) {
            modalInstance.hide(); // Hide the current modal
        }
    }

    if (nextModal) {
        const nextModalInstance = new bootstrap.Modal(nextModal, {
            backdrop: 'static',
            keyboard: false
        });
        nextModalInstance.show(); // Show the next modal
    }

    // Show showNotification if needed but after transitioning to the next modal
    if (totalScore > 100) {
        setTimeout(() => {
            showNotification('Total score exceeds 100. Please adjust the scores.');
        }, 100); // Slight delay to ensure modal transition completes first
    }
});

// Attach event listener to "Save" button on the checklist modal
document.getElementById('saveBtn').addEventListener('click', function() {
    saveAllDataToFirestore(); // Save all data to Firestore
});

 // Function to open the edit modal for motorcycle form
 function openMotorcycleEditModal(index, modalId = 'editMotorsModal') {
  selectedStudentIndex = index; // Store the selected student's index or ID
  const studentData = studentsData[index]; // Retrieve student data using the index

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

  if (modalId === 'editMotorsModal') {
      const booking = studentData.bookings[0];

      // Format date and time
      const formattedDate = formatDate(booking.date);
      const formattedStartTime = convertTo12HourFormat(booking.timeStart);
      const formattedEndTime = convertTo12HourFormat(booking.timeEnd);

      // Populate modal with student information for the motorcycle form
      document.querySelector('#editMotorsModal .modal-body .student-info p:nth-child(1) span').textContent = `${studentData.personalInfo.first || ''} ${studentData.personalInfo.last || ''}`;
      document.querySelector('#editMotorsModal .modal-body .student-info p:nth-child(2) span').textContent = `${formattedDate} || ${formattedStartTime} - ${formattedEndTime}`;
      document.querySelector('#editMotorsModal .modal-body .student-info p:nth-child(3) span').textContent = studentData.instructorName || "N/A";
      document.querySelector('#editMotorsModal .modal-body.second-section .student-info #motorcycleStudentName').textContent = `${studentData.personalInfo.first || ''} ${studentData.personalInfo.last || ''}`;
  }

  // Check if the student has a motorcycle course
  if (modalId === 'editMotorsModal' && !studentData.hasMotorsCourse) {
      showNotification("This student does not have a Motorcycle appointment.");
      return;
  }

  // Set the index as a data attribute on the save button
  const saveButton = document.getElementById('motorcycleSaveBtn');
  saveButton.setAttribute('data-student-index', index);

  console.log("Setting data-student-index to:", index); // Debugging output

  // Show the correct modal with options to prevent closing
  const modalToOpen = new bootstrap.Modal(document.getElementById(modalId), {
      backdrop: 'static',
      keyboard: false
  });
  modalToOpen.show();
}


// Define the fields and their respective weights for the motorcycle form scoring
const motorcycleFields = [
  { id: 'motorcycleMovingOff', weight: 5 },
  { id: 'motorcyclePositioning', weight: 5 },
  { id: 'motorcycleLowSpeedBalancing', weight: 10 },
  { id: 'motorcycleHillRiding', weight: 8 },
  { id: 'motorcycleCornering', weight: 8 },
  { id: 'motorcycleRailwayCrossings', weight: 6 },
  { id: 'motorcycleLaneShift', weight: 6 },
  { id: 'motorcycleTurningLaneChanging', weight: 6 },
  { id: 'motorcyclePassingVehicles', weight: 2 },
  { id: 'motorcycleOncomingTraffic', weight: 3 },
  { id: 'ridingAheadorBehind', weight: 2 },
  { id: 'ridingSidebySide', weight: 3 },
  { id: 'overtaking', weight: 6 },
  { id: 'straightThrough', weight: 2 },
  { id: 'turningLeftorRight', weight: 3 },
  { id: 'obligationsToGiveRightofWay', weight: 2 },
  { id: 'abcPassingJunction', weight: 3 },
  { id: 'roundabouts', weight: 8 },
  { id: 'stoppingandParking', weight: 6 },
  { id: 'ridingBackRide', weight: 6 }
];

const motorcycleMaxScores = {
  "Start the engine": 10,
  "Choice of speed in different situations (low speed balancing)": 10,  // Full name
  "Hill riding": 8,
  "Riding along a curve or bend (cornering)": 8,  // Full name matches backend
  "Approaching and passing railway crossings": 6,  // Full name matches backend
  "Lane shift and choice of lanes": 6,
  "Turning and lane changing": 6,
  "Interaction with various road users": 10,  // Full name matches backend
  "Overtaking": 6,
  "Riding different kinds of junctions": 10,  // Full name matches backend
  "Approaching, riding in and leaving roundabouts": 8,  // Full name matches backend
  "Stopping and parking": 6,
  "Riding with a back ride": 6
};

function calculateMotorcycleTotalScore() {
  let totalScore = 0;

  motorcycleFields.forEach(field => {
    const fieldValue = parseFloat(document.getElementById(field.id)?.value) || 0;
    if (fieldValue >= 0 && fieldValue <= field.weight) {
      totalScore += fieldValue;
    }
  });

  const totalScoreOutOf100 = totalScore; // Adjust if needed
  document.getElementById('motorcycleTotalScore').textContent = `${totalScoreOutOf100} / 100`;

  if (totalScoreOutOf100 > 100) {
    showNotification('Total score exceeds 100. Please adjust the scores.');
  }

  return totalScoreOutOf100;
}

// Function to save motorcycle assessment data to session storage
function saveMotorcycleAssessmentDataToSession() {
  if (selectedStudentIndex === null) {
      showNotification('No student selected. Please select a student to save data.');
      return;
  }

  const studentData = studentsData[selectedStudentIndex]; // Use the stored index to retrieve the correct student

  // Create an object to store the assessment data
  const assessmentData = {
    studentName: `${studentData.personalInfo.first || ''} ${studentData.personalInfo.last || ''}`,
    instructorName: studentData.instructorName || "N/A",
    dateAndTime: document.getElementById('motorcycleDateAndTime') ? document.getElementById('motorcycleDateAndTime').textContent : "N/A",
    vehicleType: 'Motorcycle',
    categories: [
        {
            category: "Start the engine",
            items: [
                { 
                    sentence: "Moving off, riding ahead and stopping", 
                    score: parseFloat(document.getElementById('motorcycleMovingOff')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentMovingOff')?.value || ""
                },
                { 
                    sentence: "Positioning in different environments", 
                    score: parseFloat(document.getElementById('motorcyclePositioning')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentPositioning')?.value || ""
                }
            ]
        },
        {
            category: "Choice of speed in different situations (low speed balancing)",
            items: [
                { 
                    sentence: "motorcycleLowSpeedBalancing", 
                    score: parseFloat(document.getElementById('motorcycleLowSpeedBalancing')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentLowSpeedBalancing')?.value || ""
                }
            ]
        },
        {
            category: "Hill riding",
            items: [
                { 
                    sentence: "motorcycleHillRiding", 
                    score: parseFloat(document.getElementById('motorcycleHillRiding')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentHillRiding')?.value || ""
                }
            ]
        },
        {
            category: "Riding along a curve or bend (cornering)",
            items: [
                { 
                    sentence: "motorcycleCornering", 
                    score: parseFloat(document.getElementById('motorcycleCornering')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentCornering')?.value || ""
                }
            ]
        },
        {
            category: "Approaching and passing railway crossings",
            items: [
                { 
                    sentence: "motorcycleRailwayCrossings", 
                    score: parseFloat(document.getElementById('motorcycleRailwayCrossings')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentRailwayCrossings')?.value || ""
                }
            ]
        },
        {
            category: "Lane shift and choice of lanes",
            items: [
                { 
                    sentence: "motorcycleLaneShift", 
                    score: parseFloat(document.getElementById('motorcycleLaneShift')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentLaneShift')?.value || ""
                }
            ]
        },
        {
            category: "Turning and lane changing",
            items: [
                { 
                    sentence: "motorcycleTurningLaneChanging", 
                    score: parseFloat(document.getElementById('motorcycleTurningLaneChanging')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentTurningLaneChanging')?.value || ""
                }
            ]
        },
        {
            category: "Interaction with various road users",
            items: [
                { 
                    sentence: "Passing stationary vehicles and pedestrians", 
                    score: parseFloat(document.getElementById('motorcyclePassingVehicles')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentPassingVehicles')?.value || ""
                },
                { 
                    sentence: "Meeting oncoming traffic", 
                    score: parseFloat(document.getElementById('motorcycleOncomingTraffic')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentOncomingTraffic')?.value || ""
                },
                { 
                    sentence: "Riding ahead of or behind other road users", 
                    score: parseFloat(document.getElementById('ridingAheadorBehind')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentRidingAheadorBehind')?.value || ""
                },
                { 
                    sentence: "Riding side by side", 
                    score: parseFloat(document.getElementById('ridingSidebySide')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentRidingSidebySide')?.value || ""
                }
            ]
        },
        {
            category: "Overtaking",
            items: [
                { 
                    sentence: "Overtaking", 
                    score: parseFloat(document.getElementById('overtaking')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentOvertaking')?.value || ""
                }
            ]
        },
        {
            category: "Riding different kinds of junctions",
            items: [
                { 
                    sentence: "Straight through", 
                    score: parseFloat(document.getElementById('straightThrough')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentStraightThrough')?.value || ""
                },
                { 
                    sentence: "Turning Left or Right", 
                    score: parseFloat(document.getElementById('turningLeftorRight')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentTurningLeftorRight')?.value || ""
                },
                { 
                    sentence: "With or Without obligation to give the right of way", 
                    score: parseFloat(document.getElementById('obligationsToGiveRightofWay')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentObligationstoGiveRightofWay')?.value || ""
                },
                { 
                    sentence: "ABC of passing junction", 
                    score: parseFloat(document.getElementById('abcPassingJunction')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentAbcPassingJunction')?.value || ""
                }
            ]
        },
        {
            category: "Approaching, riding in and leaving roundabouts",
            items: [
                { 
                    sentence: "Roundabouts", 
                    score: parseFloat(document.getElementById('roundabouts')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentRoundabouts')?.value || ""
                }
            ]
        },
        {
            category: "Stopping and parking",
            items: [
                { 
                    sentence: "Stopping and Parking", 
                    score: parseFloat(document.getElementById('stoppingandParking')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentStoppingsandParking')?.value || ""
                }
            ]
        },
        {
            category: "Riding with a back ride",
            items: [
                { 
                    sentence: "Riding with a back ride", 
                    score: parseFloat(document.getElementById('ridingBackRide')?.value) || 0,
                    comment: document.getElementById('motorcycleCommentRidingBackRide')?.value || ""
                }
            ]
        }
    ]
  };

  // Save the assessment data in session storage with a key based on the student index
  sessionStorage.setItem(`MotorcycleAssess_${selectedStudentIndex}`, JSON.stringify(assessmentData));

  showNotification(`Assessment data has been saved successfully for ${assessmentData.studentName}`);
}

async function sendMotorcycleAssessmentDataToFlask() {
  if (selectedStudentIndex === null) {
    showNotification('No student selected. Please select a student to send data.');
    return;
  }

  const assessmentData = JSON.parse(sessionStorage.getItem(`MotorcycleAssess_${selectedStudentIndex}`)) || {};

  if (!assessmentData.categories || assessmentData.categories.length === 0) {
    showNotification('No assessment data available to send.');
    return;
  }

  const dataToSend = {
    "Approaching and passing railway crossings": 0,
    "Approaching, riding in and leaving roundabouts": 0,
    "Choice of speed in different situations (low speed balancing)": 0,
    "Hill riding": 0,
    "Interaction with various road users": 0,
    "Lane shift and choice of lanes": 0,
    "Overtaking": 0,
    "Riding along a curve or bend (cornering)": 0,
    "Riding different kinds of junctions": 0,
    "Riding with a back ride": 0,
    "Start the engine": 0,
    "Stopping and parking": 0,
    "Turning and lane changing": 0
  };

  // Aggregation logic
  assessmentData.categories.forEach(category => {
    const categoryName = category.category;
    category.items.forEach(item => {
      const score = parseFloat(item.score); // Ensure the score is a number
      if (!isNaN(score)) {
        if (dataToSend[categoryName] !== undefined) {
          dataToSend[categoryName] += score;
        } else {
          console.error(`Unexpected category: ${categoryName}`);
          showNotification(`Unexpected category found: ${categoryName}. Please review the data.`);
        }
      } else {
        console.warn(`Invalid score for ${item.sentence}. Setting score to 0.`);
      }
    });
  });

  console.log('Aggregated Data to send:', dataToSend); // Log the aggregated data for debug

  try {
    const response = await fetch('http://127.0.0.1:5000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        categories: [dataToSend], // Send the aggregated scores
        motorcycleMaxScores: motorcycleMaxScores // Send motorcycle max scores for reference
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();
    console.log('Prediction results:', result);

    // Use the predictions directly from the AI
    const interpretedResults = result.predictions;

    // Store the interpreted results in session storage
    sessionStorage.setItem(`ProcessedData_${selectedStudentIndex}`, JSON.stringify(interpretedResults));

    // Notify user of success
    showNotification('Assessment data successfully sent and processed.');

  } catch (error) {
    console.error('Error sending data to Flask API:', error);
    showNotification('Failed to send data. Please try again.');
  }
}

// Function to save all motorcycle data to Firestore
async function saveAllMotorcycleDataToFirestore() {
  if (selectedStudentIndex === null) {
      showNotification('No student selected. Please select a student to save data.');
      return;
  }

  // Retrieve assessment data from session storage
  const assessmentData = JSON.parse(sessionStorage.getItem(`MotorcycleAssess_${selectedStudentIndex}`)) || {};
  const processedData = JSON.parse(sessionStorage.getItem(`ProcessedData_${selectedStudentIndex}`)) || {};

  // Get data from the motorcycle checklist
  const checklistData = {
      studentName: document.getElementById('motorcycleStudentName').textContent,
      studentPermit: document.getElementById('motorcycleStudentPermit').value,
      checklist: {
          motorcycleLesson1TopicA: document.getElementById('motorcycleLesson1TopicA').checked,
          motorcycleLesson1TopicB: document.getElementById('motorcycleLesson1TopicB').checked,
          motorcycleLesson1TopicC: document.getElementById('motorcycleLesson1TopicC').checked,
          motorcycleLesson1TopicD: document.getElementById('motorcycleLesson1TopicD').checked,
          motorcycleLesson2TopicA: document.getElementById('motorcycleLesson2TopicA').checked,
          motorcycleLesson2TopicB: document.getElementById('motorcycleLesson2TopicB').checked,
          motorcycleLesson2TopicC: document.getElementById('motorcycleLesson2TopicC').checked,
          motorcycleLesson3TopicA: document.getElementById('motorcycleLesson3TopicA').checked,
          motorcycleLesson3TopicB: document.getElementById('motorcycleLesson3TopicB').checked,
          motorcycleLesson4TopicA: document.getElementById('motorcycleLesson4TopicA').checked,
          motorcycleLesson5TopicA: document.getElementById('motorcycleLesson5TopicA').checked,
          motorcycleLesson6TopicA: document.getElementById('motorcycleLesson6TopicA').checked,
          motorcycleLesson6TopicB: document.getElementById('motorcycleLesson6TopicB').checked,
          motorcycleLesson6TopicC: document.getElementById('motorcycleLesson6TopicC').checked,
          motorcycleLesson7TopicA: document.getElementById('motorcycleLesson7TopicA').checked,
          motorcycleLesson7TopicB: document.getElementById('motorcycleLesson7TopicB').checked,
          motorcycleLesson7TopicC: document.getElementById('motorcycleLesson7TopicC').checked,
          motorcycleLesson8TopicA: document.getElementById('motorcycleLesson8TopicA').checked,
          motorcycleLesson9TopicA: document.getElementById('motorcycleLesson9TopicA').checked,
          motorcycleLesson10TopicA: document.getElementById('motorcycleLesson10TopicA').checked,
          motorcycleLesson11TopicA: document.getElementById('motorcycleLesson11TopicA').checked
      }
  };

  // Remove the bookings property from student data
  const { bookings, ...studentDataWithoutBookings } = studentsData[selectedStudentIndex];

  // Combine assessment, processed, and checklist data
  const combinedData = {
      ...studentDataWithoutBookings, // Include existing student data without bookings
      assessmentData, // Add the assessment data
      processedData, // Add the processed data
      ...checklistData // Add the motorcycle checklist data
  };

  try {
      await setDoc(doc(db, "applicants", studentsData[selectedStudentIndex].id), combinedData, { merge: true });
      console.log('Saving combined motorcycle data:', combinedData);
      showNotification(`All motorcycle data has been saved successfully for ${checklistData.studentName}`);
  } catch (e) {
      console.error("Error saving combined motorcycle data: ", e);
      showNotification('Failed to save all motorcycle data. Please try again.');
  }
}

// Attach event listener to "Next" button for the motorcycle modal
document.getElementById('motorcycleNextBtn').addEventListener('click', async function () {
  // Calculate total score before saving
  const totalScore = calculateMotorcycleTotalScore(); // Call the motorcycle-specific score calculation

  // Save raw motorcycle assessment data to session storage
  saveMotorcycleAssessmentDataToSession(); // Call the motorcycle-specific data saving function

  // Wait for AI processing and store the processed data
  await sendMotorcycleAssessmentDataToFlask(); // Send motorcycle data to Flask API and wait for response

  // After processing, show the next modal (if applicable)
  const currentModal = document.querySelector('.modal.show');
  const nextModal = document.getElementById('motorcycleChecklistModal'); // Motorcycle-specific modal ID

  if (currentModal) {
      const modalInstance = bootstrap.Modal.getInstance(currentModal);
      if (modalInstance) {
          modalInstance.hide(); // Hide the current motorcycle modal
      }
  }

  if (nextModal) {
      const nextModalInstance = new bootstrap.Modal(nextModal, {
          backdrop: 'static',
          keyboard: false
      });
      nextModalInstance.show(); // Show the next motorcycle modal
  }

  // Show a notification if the total score exceeds 100, after modal transition
  if (totalScore > 100) {
      setTimeout(() => {
          showNotification('Total score exceeds 100. Please adjust the scores.');
      }, 100); // Slight delay to ensure modal transition completes first
  }
});

// Attach event listener to "Save" button for saving all motorcycle data to Firestore
document.getElementById('motorcycleSaveBtn').addEventListener('click', function() {
  saveAllMotorcycleDataToFirestore(); // Save all motorcycle data to Firestore
});


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
      openMotorcycleEditModal(index, modalId); // Open the corresponding motorcycle modal
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