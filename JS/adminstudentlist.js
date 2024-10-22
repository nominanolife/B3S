import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, setDoc, deleteField, getDocs, deleteDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
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
let unsubscribeApplicants = null;
let isUpdatingFirestore = false; // Flag to avoid repopulation during Firestore updates

function showNotification(message) {
  const successModalBody = document.getElementById('successModalBody');
  successModalBody.textContent = message;

  // Show the modal using jQuery for Bootstrap 4
  $('#successModal').modal('show'); // Show the modal
}

// Fetch students data on DOM load
document.addEventListener('DOMContentLoaded', () => {
  
  fetchAppointments().then(() => {
      // After the appointments are fetched, trigger render to hide loader once done
      renderStudents();
      updatePaginationControls();
  });
});

async function fetchAppointments() {
  try {
    const studentsMap = new Map();

    // Unsubscribe from the previous snapshot if it exists
    if (unsubscribeApplicants) {
      unsubscribeApplicants();
    }

    // Real-time listener for applicants
    unsubscribeApplicants = onSnapshot(collection(db, "applicants"), async (applicantsSnapshot) => {
      studentsMap.clear(); // Clear previous data to avoid duplicates

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

      // Hide loader after all data is rendered
      const loader = document.getElementById('loader1');
      loader.style.display = 'none';
    });

  } catch (error) {
    console.error("Error fetching appointments: ", error);
  }
}

document.getElementById('saveChangesBtn').onclick = async (event) => {
  event.preventDefault(); // Prevent page refresh

  const newCertificateNumber = document.getElementById('certificateControlNumberInput').value;

  // Retrieve the student index from the button's data attribute
  const studentIndex = event.target.getAttribute('data-student-index');

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

  const course = event.target.getAttribute('data-course'); // Retrieve course from button data attribute
  const completionDate = event.target.getAttribute('data-completion-date'); // Retrieve completion date

  try {
    // Update the certificateControlNumber in the applicants collection (if needed)
    const studentDocRef = doc(db, "applicants", studentData.id);
    await setDoc(studentDocRef, { certificateControlNumber: newCertificateNumber }, { merge: true });

    // Fetch the completedStudent document from completedStudents collection
    const completedStudentRef = doc(db, "completedStudents", studentData.id);
    const completedStudentSnap = await getDoc(completedStudentRef);

    if (completedStudentSnap.exists()) {
      const completedStudentData = completedStudentSnap.data();

      // Check if completedBookings array exists and is an array
      if (completedStudentData.completedBookings && Array.isArray(completedStudentData.completedBookings)) {
        // Update the specific entry in the completedBookings array
        const updatedBookings = completedStudentData.completedBookings.map(booking => {
          if (booking.course === course && booking.completionDate === completionDate) {
            return {
              ...booking,
              certificateControlNumber: newCertificateNumber // Update the CTC for this booking
            };
          }
          return booking;
        });

        // Update the completedBookings array with the modified booking
        await updateDoc(completedStudentRef, { completedBookings: updatedBookings });

        // Update the certificateControlNumber outside of the array for global access
        await updateDoc(completedStudentRef, { certificateControlNumber: newCertificateNumber });

        // Optionally update the local state (for UI)
        studentData.certificateControlNumber = newCertificateNumber;

        renderStudents();
        setupStatusToggleListeners();

        // Close the modal and show success notification
        $('#editCcnModal').modal('hide'); // Close the modal using jQuery
        showNotification("Certificate control number updated successfully!");
      }
    } else {
      console.error("Completed student data not found.");
      showNotification("Failed to find completed student record.");
    }
  } catch (error) {
    console.error("Error updating certificate control number:", error);
    showNotification("Failed to update certificate control number.");
  }
};

// Add this for the edit4WheelsModal save button handler
document.getElementById('saveBtn').addEventListener('click', async function() {
  const saveSuccessful = await saveAllDataToFirestore(); // Save all data to Firestore

  if (saveSuccessful) {
    // Close the modal only if data is successfully saved
    $('#edit4WheelsModal').modal('hide');
  }
});

function renderStudents() {
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = '';  // Clear the list before rendering new data

  // If there's no data to render, show "No student/s yet"
  if (studentsData.length === 0) {
    studentList.innerHTML = `
      <tr>
        <td colspan="10" class="text-center">No student/s yet</td>
      </tr>
    `;
    return;
  }

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedStudents = filteredStudentsData.slice(start, end);  // Paginated data

  if (paginatedStudents.length === 0) {
    studentList.innerHTML = `
      <tr>
        <td colspan="10" class="text-center">No student/s found</td>
      </tr>
    `;
    return;
  }

  paginatedStudents.forEach((student, index) => {
    const personalInfo = student.personalInfo || {};  // Fallback if personalInfo is missing
    const certificateControlNumber = student.certificateControlNumber || '';  // Default to empty string if undefined

    // Create an array of rows for the student
    let rows = [];

    // Initialize an empty row to start filling appointments
    let currentRow = { TDC: null, 'PDC-4Wheels': null, 'PDC-Motors': null };

    // Process each booking
    student.bookings.forEach((booking) => {
      const course = booking.course;

      // If the course already exists in the current row, push the current row and start a new one
      if (currentRow[course]) {
        rows.push(currentRow);
        currentRow = { TDC: null, 'PDC-4Wheels': null, 'PDC-Motors': null };  // New row
      }

      // Fill the appropriate course in the current row
      currentRow[course] = booking;
    });

    // Add the final row if not already added
    if (currentRow.TDC || currentRow['PDC-4Wheels'] || currentRow['PDC-Motors']) {
      rows.push(currentRow);
    }

    // Render each row
    rows.forEach((row) => {
      let studentHtml = `
        <tr class="table-row">
            <td class="table-row-content">${personalInfo.first || ''} ${personalInfo.last || ''}</td> <!-- Handle missing names -->
            <td class="table-row-content">${student.email}</td>
            <td class="table-row-content">${student.phoneNumber || ''}</td>
            <td class="table-row-content">${student.packageName || ''}</td> <!-- Handle missing package name -->
            <td class="table-row-content">&#8369; ${student.packagePrice || ''}</td> <!-- Handle missing price -->
            ${renderCourseStatus('TDC', row.TDC)} <!-- Render TDC status -->
            ${renderCourseStatus('PDC-4Wheels', row['PDC-4Wheels'])} <!-- Render 4-Wheels status -->
            ${renderCourseStatus('PDC-Motors', row['PDC-Motors'])} <!-- Render Motors status -->
            <td class="table-row-content">${certificateControlNumber}</td> <!-- Render Certificate Control Number -->
            <td class="table-row-content">
                <!-- Triple dot options -->
                <i class="bi bi-three-dots" data-toggle="options" data-index="${index}"></i>
                <div class="triple-dot-options" style="display: none;">
                    <i class="option-dropdown" data-modal="editCcnModal" data-index="${index}">Certificate Control Number</i>
                    <i class="option-dropdown" data-modal="edit4WheelsModal" data-index="${index}">4-Wheels Course Checklist</i>
                    <i class="option-dropdown" data-modal="editMotorsModal" data-index="${index}">Motorcycle Course Checklist</i>
                </div>
            </td>
        </tr>
      `;

      studentList.insertAdjacentHTML('beforeend', studentHtml);  // Append the generated HTML to the list
    });
  });

  setupStatusToggleListeners();  // Call this after rendering the student list
}

function renderCourseStatus(course, booking) {
  // Return an empty column if there's no booking for this course
  if (!booking || booking.course !== course) {
    return '<td class="table-row-content"></td>';
  }

  // Render the status of the course booking
  return `
    <td class="table-row-content">
      <label class="status-label">
        <input type="checkbox" class="status-toggle" ${booking.status === "Completed" ? 'checked' : ''} 
               data-booking-id="${booking.appointmentId}" 
               data-user-id="${booking.userId}" 
               data-column="${course}">
      </label>
    </td>
  `;
}

// Function to set up status toggle listeners
function setupStatusToggleListeners() {
  document.querySelectorAll('.status-toggle').forEach(toggle => {
    toggle.removeEventListener('change', handleStatusToggle); // Remove previous listener
    toggle.addEventListener('change', handleStatusToggle); // Add new listener
  });
}

async function handleStatusToggle(event) {
  event.preventDefault(); // Prevent default checkbox behavior

  if (isUpdatingFirestore) return; // Skip if Firestore is being updated

  const appointmentId = event.target.dataset.bookingId;
  const userId = event.target.dataset.userId;
  const course = event.target.dataset.column;
  const isCompleted = event.target.checked;

  // Log for debugging
  console.log(`Checkbox toggled for user ${userId}, course: ${course}, completed: ${isCompleted}`);

  // Update local state immediately
  const student = studentsData.find(student => student.id === userId);
  if (student) {
    const booking = student.bookings.find(b => b.appointmentId === appointmentId);
    if (booking) {
      booking.status = isCompleted ? "Completed" : "Booked"; // Update booking status locally
    }
  }

  // Update UI directly
  event.target.checked = isCompleted;

  // Ask for confirmation before proceeding
  const confirmationMessage = isCompleted
    ? "Are you sure you want to mark this appointment as completed?"
    : "Are you sure you want to revert the appointment status?";

  document.getElementById('confirmationModalBody').textContent = confirmationMessage;
  const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
  confirmationModal.show();

  // Proceed with Firestore update on confirmation
  document.getElementById('confirmButton').onclick = async () => {
    confirmationModal.hide();

    // Show the loader after confirmation
    const loader = document.getElementById('loader1');
    loader.style.display = 'flex';  // Show loader after confirmation

    isUpdatingFirestore = true; // Set flag to avoid repopulation

    try {
      // Perform Firestore update
      await toggleCompletionStatus(userId, course, isCompleted, appointmentId);

      // Reload the page after a successful update to simulate a "refresher"
      window.location.reload();

    } catch (error) {
      console.error("Error updating completion status in Firestore:", error);

      // If update fails, revert the checkbox state
      event.target.checked = !isCompleted;

      // Hide the loader if there's an error
      loader.style.display = 'none';
    } finally {
      isUpdatingFirestore = false; // Reset flag after Firestore update
    }
  };

  // Cancel button handler
  document.getElementById('confirmationModal').querySelector('.btn-secondary').onclick = () => {
    event.target.checked = !isCompleted; // Revert checkbox on cancel
    confirmationModal.hide();
  };
}

async function toggleCompletionStatus(userId, course, isCompleted, appointmentId) {
  try {
    const applicantDocRef = doc(db, "applicants", userId);
    const applicantSnapshot = await getDoc(applicantDocRef);

    if (!applicantSnapshot.exists()) {
      console.error("Applicant data not found.");
      return;
    }

    const applicantData = applicantSnapshot.data();
    const docRef = doc(db, "appointments", appointmentId);
    const docSnapshot = await getDoc(docRef);

    if (!docSnapshot.exists()) {
      console.error("Appointment data not found.");
      return;
    }

    const appointmentData = docSnapshot.data();
    const updateData = {};

    if (isCompleted) {
      updateData[`${course}Status`] = "Completed";
      updateData[`${course}CompletionDate`] = appointmentData.date;
    } else {
      updateData[`${course}Status`] = deleteField();
      updateData[`${course}CompletionDate`] = deleteField();
    }

    await updateDoc(applicantDocRef, updateData);

    if (appointmentData.bookings && Array.isArray(appointmentData.bookings)) {
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
          appointmentId: appointmentId
        };

        await updateCompletedBookings(userId, completedBookingData);

        const completedStudentRef = doc(db, "completedStudents", userId);
        const completedStudentSnap = await getDoc(completedStudentRef);

        let completedStudentData = {
          name: applicantData.personalInfo?.first + " " + applicantData.personalInfo?.last,
          email: applicantData.email || "N/A",
          phoneNumber: applicantData.phoneNumber || "N/A",
          packageName: applicantData.packageName || "N/A",
          packagePrice: applicantData.packagePrice || "N/A",
          userId: userId,
          certificateControlNumber: applicantData.certificateControlNumber || 'N/A',
          completedBookings: []
        };

        if (completedStudentSnap.exists()) {
          completedStudentData = completedStudentSnap.data();
        }

        // Add validation to prevent duplicate completion for the same appointment
        const existingBookingIndex = completedStudentData.completedBookings.findIndex(
          booking => booking.appointmentId === appointmentId && booking.completionDate === appointmentData.date && booking.course === course
        );

        if (existingBookingIndex >= 0) {
          // If the same appointment date exists, don't duplicate
          console.log("Completion for this appointment date already exists, skipping duplicate entry.");
        } else {
          completedStudentData.completedBookings.push({
            course: course,
            completionDate: appointmentData.date,
            appointmentId: appointmentId
          });
        }

        await setDoc(completedStudentRef, completedStudentData, { merge: true });
      } else {
        await removeCompletedBooking(userId, course, appointmentId);
      }
    }
  } catch (error) {
    console.error("Error updating completion status:", error);
  }
}

// Migration of completed bookings with the date as a string
async function updateCompletedBookings(userId, bookingDetails) {
  try {
    const completedBookingRef = doc(db, "completedBookings", userId);
    const completedBookingSnap = await getDoc(completedBookingRef);

    if (completedBookingSnap.exists()) {
      const existingBookings = completedBookingSnap.data().completedBookings || [];

      // Find the booking by both course and appointmentId
      const bookingIndex = existingBookings.findIndex(
        b => b.course === bookingDetails.course && b.appointmentId === bookingDetails.appointmentId
      );

      if (bookingIndex !== -1) {
        // Update the existing booking if both course and appointmentId match
        existingBookings[bookingIndex] = bookingDetails;
      } else {
        // Add a new booking if it doesn't exist
        existingBookings.push(bookingDetails);
      }

      // Update the document with the new or updated bookings array
      await updateDoc(completedBookingRef, {
        completedBookings: existingBookings
      });
    } else {
      // Create a new document with the first booking entry
      await setDoc(completedBookingRef, {
        completedBookings: [bookingDetails]
      });
    }
  } catch (error) {
    console.error("Error updating completed bookings: ", error);
  }
}
// Removing a completed booking if reverted
async function removeCompletedBooking(userId, course, appointmentId) {
  try {
    const completedBookingRef = doc(db, "completedBookings", userId);
    const completedBookingSnap = await getDoc(completedBookingRef);

    if (completedBookingSnap.exists()) {
      let existingBookings = completedBookingSnap.data().completedBookings || [];

      // Filter out the booking with the matching course and appointmentId
      existingBookings = existingBookings.filter(b => !(b.course === course && b.appointmentId === appointmentId));

      if (existingBookings.length > 0) {
        // Update the document with the filtered completedBookings array
        await updateDoc(completedBookingRef, {
          completedBookings: existingBookings
        });
      } else {
        // Delete the document if no bookings are left
        await deleteDoc(completedBookingRef);
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

  // Check if there's existing assessment data for 4-Wheels
  if (modalId === 'edit4WheelsModal' && studentData.WassessmentData) {
    setTimeout(() => {
      showNotification('This student already has an existing 4-Wheels assessment data. If you proceed to change it, the existing data will be overwritten.');
    }, 500);
  }

  resetModalFields(modalId);

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

      // Populate modal with student information
      document.querySelector('#edit4WheelsModal .modal-body .student-info p:nth-child(1) span').textContent = `${studentData.personalInfo.first || ''} ${studentData.personalInfo.last || ''}`;
      document.querySelector('#edit4WheelsModal .modal-body .student-info p:nth-child(2) span').textContent = `${formattedDate} || ${formattedStartTime} - ${formattedEndTime}`;
      document.querySelector('#edit4WheelsModal .modal-body .student-info p:nth-child(3) span').textContent = studentData.instructorName || "N/A";
      document.querySelector('#edit4WheelsModal .modal-body.second-section .student-info #studentName').textContent = `${studentData.personalInfo.first || ''} ${studentData.personalInfo.last || ''}`;

      // Populate vehicle type
      if (studentData.WassessmentData && studentData.WassessmentData.vehicleType) {
          document.getElementById('vehicleTypeSelected').textContent = studentData.WassessmentData.vehicleType;
      } else {
          // Set default value
          document.getElementById('vehicleTypeSelected').textContent = 'Select Vehicle';
      }

      // Populate assessment data if it exists
      if (studentData.WassessmentData) {
          const assessmentData = studentData.WassessmentData;
          const sentenceToFieldIdMap = {
              "Eye lead time": "eyeLeadTime",
              "Left – Right / Scanning / Shoulder checks": "leftRightScanning",
              "Mirrors / tracking traffic": "mirrorsTracking",
              "Following defensive distance": "defensiveDistance",
              "Space at Stops": "spaceAtStops",
              "Path of least resistance": "leastResistance",
              "Right-of-way": "rightOfWay",
              "Acceleration / Deceleration – Smoothness": "acceleration",
              "Braking: Full Stops, smooth": "braking",
              "Speed for Conditions": "speedForConditions",
              "Speed and Traffic signs": "trafficSigns",
              "Lane / Turn Position / set-up": "lanePosition",
              "Steering: hand position, smoothness": "steering",
              "Signals: timing and use": "signals",
              "Other: i.e horn, eye contact": "eyeContact",
              "Seating, head rest position, and mirror adjustment: seatbelt use": "seating",
              "Parking / Backing": "parking",
              "Anticipation: Adjusts": "anticipation",
              "Judgment: decisions": "judgment",
              "Timing: approach, Traffic interactions": "timing"
          };

          assessmentData.categories.forEach(category => {
              category.items.forEach(item => {
                  const fieldId = sentenceToFieldIdMap[item.sentence];
                  if (fieldId) {
                      // Populate score
                      const scoreInput = document.getElementById(fieldId);
                      if (scoreInput) {
                          scoreInput.value = item.score;
                      }

                      // Populate comment
                      const commentFieldId = 'comment' + fieldId.charAt(0).toUpperCase() + fieldId.slice(1);
                      const commentInput = document.getElementById(commentFieldId);
                      if (commentInput) {
                          commentInput.value = item.comment;
                      }
                  }
              });
          });

          // Update the total score display
          calculateTotalScore();
      }

      // Populate student permit
      document.getElementById('studentPermit').value = studentData.studentPermit || '';

      // Populate checklist data if it exists
      if (studentData.Wchecklist) {
          const checklist = studentData.Wchecklist;
          for (const [fieldId, value] of Object.entries(checklist)) {
              const checkbox = document.getElementById(fieldId);
              if (checkbox) {
                  checkbox.checked = value;
              }
          }
      }
  }

  // Existing code for editCcnModal
  if (modalId === 'editCcnModal') {
      if (!studentData.TDCStatus || studentData.TDCStatus !== "Completed") {
          showNotification("This student has not yet finished their TDC appointment.");
          return;
      }
      // Populate the certificate control number if it exists
      document.getElementById('certificateControlNumberInput').value = studentData.certificateControlNumber || '';
  }

  // Existing code for modal visibility and transitions
  // Set the index as a data attribute on the save button
  const saveButton = document.getElementById('saveChangesBtn');
  if (saveButton) {
      saveButton.setAttribute('data-student-index', index);
  }

  validateForm(modalId); 

  // Show the correct modal with options to prevent closing
  const modalToOpen = new bootstrap.Modal(document.getElementById(modalId), {
      backdrop: 'static',
      keyboard: false
  });

  // Reset and show the appropriate sections for non-CCN modals
if (modalId !== 'editCcnModal') {
    const modalElement = document.getElementById(modalId);

    if (modalElement) {
        const [firstSection, secondSection] = modalElement.querySelectorAll('.modal-body');
        const [backBtn, nextBtn, saveBtn] = modalElement.querySelectorAll('.back-btn, .next-btn, .save-btn');

        console.log('Modal Element:', modalElement);
        console.log({ firstSection, secondSection, backBtn, nextBtn, saveBtn });

        // Use conditional checks to avoid undefined errors
        if (firstSection) firstSection.classList.remove('d-none');
        if (secondSection) secondSection.classList.add('d-none');
        if (backBtn) backBtn.classList.add('d-none');
        if (nextBtn) nextBtn.classList.remove('d-none');
        if (saveBtn) saveBtn.classList.add('d-none');
    } else {
        console.error('Modal element not found for ID:', modalId);
    }
}

  modalToOpen.show();
}

let selectedStudentIndex = null; // Global variable to store the selected student's index or ID

// Define the fields and their respective weights for scoring
const fields = [
  { id: 'eyeLeadTime', weight: 5 },
  { id: 'leftRightScanning', weight: 5 },
  { id: 'mirrorsTracking', weight: 5 },
  { id: 'defensiveDistance', weight: 5 },
  { id: 'spaceAtStops', weight: 5 },
  { id: 'leastResistance', weight: 5 },
  { id: 'rightOfWay', weight: 5 },
  { id: 'acceleration', weight: 5 },
  { id: 'braking', weight: 5 },
  { id: 'speedForConditions', weight: 5 },
  { id: 'trafficSigns', weight: 5 },
  { id: 'lanePosition', weight: 5 },
  { id: 'steering', weight: 5 },
  { id: 'signals', weight: 5 },
  { id: 'eyeContact', weight: 5 },
  { id: 'seating', weight: 5 },
  { id: 'parking', weight: 5 },
  { id: 'anticipation', weight: 5 },
  { id: 'judgment', weight: 5 },
  { id: 'timing', weight: 5 }
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
      const response = await fetch('https://4wheels-ai-dot-authentication-d6496.df.r.appspot.com/predict', {
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
      sessionStorage.setItem(`4WProcessedData_${selectedStudentIndex}`, JSON.stringify(interpretedResults));

  } catch (error) {
      console.error('Error sending data to Flask API:', error);
      showNotification('Failed to send data. Please try again.');
  }
}

// Function to save all data to Firestore for the 4-Wheels modal
async function saveAllDataToFirestore() {
  if (selectedStudentIndex === null) {
      showNotification('No student selected. Please select a student to save data.');
      return false;
  }

  // Retrieve assessment data from session storage
  const WassessmentData = JSON.parse(sessionStorage.getItem(`4WheelsAssess_${selectedStudentIndex}`)) || {};
  const WprocessedData = JSON.parse(sessionStorage.getItem(`4WProcessedData_${selectedStudentIndex}`)) || {};

  // Get data from the checklist
  const studentPermit = document.getElementById('studentPermit').value;

  // Check if student permit is empty
  if (!studentPermit) {
    showNotification('Student permit is empty. Please fill in the student permit before saving.');
    return false; // Stop the function here and keep the modal open
  }

  const WchecklistData = {
      studentName: document.getElementById('studentName').textContent,
      studentPermit: studentPermit,
      Wchecklist: {
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
      WassessmentData, // Add the assessment data
      WprocessedData, // Add the processed data
      ...WchecklistData // Add the checklist data
  };

  try {
      await setDoc(doc(db, "applicants", studentsData[selectedStudentIndex].id), combinedData, { merge: true });
      console.log('Saving combined data:', combinedData);
      showNotification(`All data has been saved successfully for ${WchecklistData.studentName}`);
      return true;
  } catch (e) {
      console.error("Error saving combined data: ", e);
      showNotification('Failed to save all data. Please try again.');
      return false;
  }
}

// Attach event listeners to input fields for real-time calculation and prevent exceeding 5
document.querySelectorAll('input.numeric-input').forEach(input => {
  input.addEventListener('input', function (event) {
    // Determine the modal to which this input belongs
    const modalElement = this.closest('.modal');
    let maxValue = 5; // Default maximum value

    if (modalElement) {
      if (modalElement.id === 'edit4WheelsModal') {
        // Extract the maximum value from the appropriate element for edit4WheelsModal
        maxValue = parseFloat(this.nextElementSibling?.nextElementSibling?.textContent) || 5;
      } else if (modalElement.id === 'editMotorsModal') {
        // Extract the maximum value for editMotorsModal
        maxValue = parseFloat(this.nextElementSibling?.nextElementSibling?.textContent) || 10; // Default value is based on motorcycle fields
      }
    }

    // Remove non-numeric characters
    this.value = this.value.replace(/[^0-9.]/g, '');

    // Ensure there's only one decimal point in the input
    if ((this.value.match(/\./g) || []).length > 1) {
      this.value = this.value.slice(0, -1);
    }

    // Cap the value to the specified maximum for that field
    if (parseFloat(this.value) > maxValue) {
      this.value = maxValue.toString();
    }

    // Ensure the value is between 0 and the maximum allowed
    if (parseFloat(this.value) < 0) {
      this.value = '0';
    }

    // Recalculate the total score after filtering
    if (modalElement?.id === 'edit4WheelsModal') {
      calculateTotalScore(); // Call the appropriate score calculation function
    } else if (modalElement?.id === 'editMotorsModal') {
      calculateMotorcycleTotalScore(); // Call the motorcycle-specific score calculation
    }
  });
});

document.getElementById('nextBtn').addEventListener('click', async function (event) {
  event.preventDefault(); // Prevent the default action, especially for form submission
  event.stopPropagation(); // Prevent the event from bubbling up to parent elements

  // Save raw assessment data to session storage
  saveAssessmentDataToSession();

  // Wait for AI processing and store the processed data
  await sendAssessmentDataToFlask();

  // After processing, transition to the next section instead of hiding the modal
  const currentModal = document.querySelector('#edit4WheelsModal');

  const [firstSection, secondSection] = currentModal.querySelectorAll('.modal-body');
  const [backBtn, nextBtn, saveBtn] = currentModal.querySelectorAll('.back-btn, .next-btn, .save-btn');

  // Show second section and relevant buttons
  firstSection.classList.add('d-none');
  secondSection.classList.remove('d-none');
  backBtn.classList.remove('d-none');
  nextBtn.classList.add('d-none');
  saveBtn.classList.remove('d-none');
});

// Attach event listener to "Save" button on the checklist modal
document.getElementById('saveBtn').addEventListener('click', function() {
    saveAllDataToFirestore(); // Save all data to Firestore
});

// Function to open the edit modal for motorcycle form
function openMotorcycleEditModal(index, modalId = 'editMotorsModal') {
  selectedStudentIndex = index; // Store the selected student's index or ID
  const studentData = studentsData[index]; // Retrieve student data using the index

  // Check if there's existing assessment data for Motorcycle
  if (modalId === 'editMotorsModal' && studentData.MassessmentData) {
    setTimeout(() => {
      showNotification('This student already has an existing Motorcycle assessment data. If you proceed to change it, the existing data will be overwritten.');
    }, 500);
  }

  resetModalFields(modalId);

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

   // Populate assessment data
   if (studentData.MassessmentData) {
    const assessmentData = studentData.MassessmentData;
    const sentenceToFieldIdMap = {
        "Moving off, riding ahead and stopping": "motorcycleMovingOff",
        "Positioning in different environments": "motorcyclePositioning",
        "motorcycleLowSpeedBalancing": "motorcycleLowSpeedBalancing",
        "motorcycleHillRiding": "motorcycleHillRiding",
        "motorcycleCornering": "motorcycleCornering",
        "motorcycleRailwayCrossings": "motorcycleRailwayCrossings",
        "motorcycleLaneShift": "motorcycleLaneShift",
        "motorcycleTurningLaneChanging": "motorcycleTurningLaneChanging",
        "Passing stationary vehicles and pedestrians": "motorcyclePassingVehicles",
        "Meeting oncoming traffic": "motorcycleOncomingTraffic",
        "Riding ahead of or behind other road users": "ridingAheadorBehind",
        "Riding side by side": "ridingSidebySide",
        "Overtaking": "overtaking",
        "Straight through": "straightThrough",
        "Turning Left or Right": "turningLeftorRight",
        "With or Without obligation to give the right of way": "obligationsToGiveRightofWay",
        "ABC of passing junction": "abcPassingJunction",
        "Roundabouts": "roundabouts",
        "Stopping and Parking": "stoppingandParking",
        "Riding with a back ride": "ridingBackRide"
    };

    assessmentData.categories.forEach(category => {
        category.items.forEach(item => {
            const fieldId = sentenceToFieldIdMap[item.sentence];
            if (fieldId) {
                const scoreInput = document.getElementById(fieldId);
                if (scoreInput) {
                    scoreInput.value = item.score;
                }

                const commentFieldId = 'motorcycleComment' + fieldId.charAt(0).toUpperCase() + fieldId.slice(1);
                const commentInput = document.getElementById(commentFieldId);
                if (commentInput) {
                    commentInput.value = item.comment;
                }
            }
        });
    });

    // Update the total score display
    calculateMotorcycleTotalScore();
}

// Populate student permit
document.getElementById('motorcycleStudentPermit').value = studentData.studentPermit || '';

// Populate checklist data
if (studentData.Mchecklist) {
    const checklist = studentData.Mchecklist;
    for (const [fieldId, value] of Object.entries(checklist)) {
        const checkbox = document.getElementById(fieldId);
        if (checkbox) {
            checkbox.checked = value;
        }
    }
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

  validateForm(modalId); 

  // Show the correct modal with options to prevent closing
  const modalToOpen = new bootstrap.Modal(document.getElementById(modalId), {
      backdrop: 'static',
      keyboard: false
  });

  // Reset to first section (evaluation table) before showing the modal
  const modalElement = document.getElementById(modalId);
  const [firstSection, secondSection] = modalElement.querySelectorAll('.modal-body');
  const [backBtn, nextBtn, saveBtn] = modalElement.querySelectorAll('.back-btn, .next-btn, .save-btn');

  firstSection.classList.remove('d-none');
  secondSection.classList.add('d-none');
  backBtn.classList.add('d-none');
  nextBtn.classList.remove('d-none');
  saveBtn.classList.add('d-none');

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
    const response = await fetch('https://motor-eval-dot-authentication-d6496.df.r.appspot.com/predict', {
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
    sessionStorage.setItem(`MProcessedData_${selectedStudentIndex}`, JSON.stringify(interpretedResults));

  } catch (error) {
    console.error('Error sending data to Flask API:', error);
    showNotification('Failed to send data. Please try again.');
  }
}

// Function to save all motorcycle data to Firestore
async function saveAllMotorcycleDataToFirestore() {
  if (selectedStudentIndex === null) {
      showNotification('No student selected. Please select a student to save data.');
      return false;
  }

  // Retrieve assessment data from session storage
  const MassessmentData = JSON.parse(sessionStorage.getItem(`MotorcycleAssess_${selectedStudentIndex}`)) || {};
  const MprocessedData = JSON.parse(sessionStorage.getItem(`MProcessedData_${selectedStudentIndex}`)) || {};

  // Get data from the motorcycle checklist
  const studentPermit = document.getElementById('motorcycleStudentPermit').value;

  // Check if student permit is empty
  if (!studentPermit) {
    showNotification('Student permit is empty. Please fill in the student permit before saving.');
    return false; // Stop the function here and keep the modal open
  }

  const MchecklistData = {
      studentName: document.getElementById('motorcycleStudentName').textContent,
      studentPermit: studentPermit,
      Mchecklist: {
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
      MassessmentData, // Add the assessment data
      MprocessedData, // Add the processed data
      ...MchecklistData // Add the motorcycle checklist data
  };

  try {
      await setDoc(doc(db, "applicants", studentsData[selectedStudentIndex].id), combinedData, { merge: true });
      console.log('Saving combined motorcycle data:', combinedData);
      showNotification(`All data has been saved successfully for ${MchecklistData.studentName}`);
      return true;
  } catch (e) {
      console.error("Error saving combined motorcycle data: ", e);
      showNotification('Failed to save all motorcycle data. Please try again.');
      return false;
  }
}

// Attach event listener to "Next" button for the motorcycle modal
document.getElementById('motorcycleNextBtn').addEventListener('click', async function (event) {
  event.preventDefault(); // Prevent the default action, especially for form submission
  event.stopPropagation(); // Prevent the event from bubbling up to parent elements

  // Calculate total score before saving
  const totalScore = calculateMotorcycleTotalScore(); // Call the motorcycle-specific score calculation

  // Save raw motorcycle assessment data to session storage
  saveMotorcycleAssessmentDataToSession(); // Call the motorcycle-specific data saving function

  // Wait for AI processing and store the processed data
  await sendMotorcycleAssessmentDataToFlask(); // Send motorcycle data to Flask API and wait for response

  // Transition within the motorcycle modal instead of closing it
  const currentModal = document.querySelector('#editMotorsModal');

  const [firstSection, secondSection] = currentModal.querySelectorAll('.modal-body');
  const [backBtn, nextBtn, saveBtn] = currentModal.querySelectorAll('.back-btn, .next-btn, .save-btn');

  // Show second section and relevant buttons
  firstSection.classList.add('d-none');
  secondSection.classList.remove('d-none');
  backBtn.classList.remove('d-none');
  nextBtn.classList.add('d-none');
  saveBtn.classList.remove('d-none');
});

// Attach event listener to "Save" button for saving all motorcycle data to Firestore
document.getElementById('motorcycleSaveBtn').addEventListener('click', async function() {
  const saveSuccessful = await saveAllMotorcycleDataToFirestore(); // Save all data to Firestore

  if (saveSuccessful) {
    // Close the modal only if data is successfully saved
    $('#editMotorsModal').modal('hide');
  }
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

      // Conditionally show or hide the "Certificate Control Number" option
      const editCcnOption = options.querySelector('[data-modal="editCcnModal"]');
      if (studentData.TDCStatus && studentData.TDCStatus === "Completed") {
        editCcnOption.style.display = 'block'; // Show if TDC is completed
      } else {
        editCcnOption.style.display = 'none'; // Hide if TDC is not completed
      }

      // Handle visibility of the other modals based on student data
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

      // Call the appropriate modal-opening function based on the modalId
      if (modalId === 'editCcnModal' || modalId === 'edit4WheelsModal') {
        openEditModal(index, modalId);
      } else if (modalId === 'editMotorsModal') {
        openMotorcycleEditModal(index, modalId);
      }
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
  // If there's no data in the studentsData array, show "No student/s yet"
  if (studentsData.length === 0) {
    document.getElementById('student-list').innerHTML = `
      <tr>
        <td colspan="10" class="text-center">No student/s yet</td>
      </tr>
    `;
    return;
  }

  filteredStudentsData = studentsData.filter(student => {
    const fullName = `${student.personalInfo.first || ''} ${student.personalInfo.last || ''}`.toLowerCase();
    return fullName.startsWith(searchTerm);
  });

  currentPage = 1;
  totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);

  // Check if there are no results
  if (filteredStudentsData.length === 0) {
    document.getElementById('student-list').innerHTML = `
      <tr>
        <td colspan="10" class="text-center">No student/s found</td>
      </tr>
    `;
  } else {
    renderStudents();  // Render the filtered students
    updatePaginationControls();  // Update the pagination controls
  }
}

// Custom dropdown functionality for Vehicle Type
document.getElementById('vehicleDropdown').addEventListener('click', function (e) {
  const dropdown = e.currentTarget;
  dropdown.classList.toggle('open');
  e.stopPropagation(); // Prevent event from bubbling to the document level
});

document.querySelectorAll('.selected').forEach(dropdown => {
  dropdown.textContent = 'Select Vehicle'; // Set the default label to 'Select Vehicle'
});

// Close Vehicle Type dropdown on selecting an option and update the selected value
document.querySelectorAll('#vehicleTypeOptions .option').forEach(option => {
  option.addEventListener('click', function (e) {
      const selectedOption = e.currentTarget;
      const dropdown = selectedOption.closest('.custom-dropdown');
      dropdown.querySelector('.selected').textContent = selectedOption.textContent;
      dropdown.classList.remove('open'); // Close the dropdown after selecting an option
      e.stopPropagation(); // Prevent event from bubbling up and causing unintended behavior
  });
});

// Close Vehicle Type dropdown when clicking outside of it
document.addEventListener('click', function (event) {
  const vehicleDropdown = document.getElementById('vehicleDropdown');
  if (!vehicleDropdown.contains(event.target)) {
      vehicleDropdown.classList.remove('open');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  let isDataSaved = false; // Tracks if data was saved in the current session
  let wasDataPreviouslySaved = false; // Tracks if the data was previously saved for the current student

  // Add event listeners for save buttons to set the isDataSaved flag to true
  document.getElementById('saveBtn').addEventListener('click', function () {
    isDataSaved = true;
    wasDataPreviouslySaved = true; // Mark as previously saved once saved
  });

  document.getElementById('motorcycleSaveBtn').addEventListener('click', function () {
    isDataSaved = true;
    wasDataPreviouslySaved = true; // Mark as previously saved once saved
  });

  // Add event listeners for the modal close events
  $('#edit4WheelsModal').on('hidden.bs.modal', function () {
    if (!isDataSaved && !wasDataPreviouslySaved) {
      resetModalFields('edit4WheelsModal');
    }
    isDataSaved = false; // Reset the flag for the next time the modal opens
  });

  $('#editMotorsModal').on('hidden.bs.modal', function () {
    if (!isDataSaved && !wasDataPreviouslySaved) {
      resetModalFields('editMotorsModal');
    }
    isDataSaved = false; // Reset the flag for the next time the modal opens
  });

  // Add event listeners for modal open events to determine if the modal has previously saved data
  $('#edit4WheelsModal').on('show.bs.modal', function () {
    wasDataPreviouslySaved = checkIfDataExists('edit4WheelsModal'); // Check if data exists
  });

  $('#editMotorsModal').on('show.bs.modal', function () {
    wasDataPreviouslySaved = checkIfDataExists('editMotorsModal'); // Check if data exists
  });
});

// Function to reset fields in the given modal
function resetModalFields(modalId) {
  const modal = document.getElementById(modalId);

  // Reset all text inputs, number inputs, and text areas to empty
  modal.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
      input.value = '';
  });

  // Reset all checkboxes to unchecked
  modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
  });

  // Reset any dynamic text content like student name or permit details
  modal.querySelectorAll('.student-info span').forEach(span => {
      span.textContent = '';
  });

  // Reset the selected vehicle type back to "Select Vehicle"
  const vehicleTypeElement = modal.querySelector('.selected');
  if (vehicleTypeElement) {
      vehicleTypeElement.textContent = 'Select Vehicle';
  }

  // Reset total score display
  const totalScoreDisplay = modal.querySelector('#totalScore');
  if (totalScoreDisplay) {
      totalScoreDisplay.textContent = '0 / 100';
  }

  // Reset modal sections and buttons
  const [firstSection, secondSection] = modal.querySelectorAll('.modal-body');
  const [backBtn, nextBtn, saveBtn] = modal.querySelectorAll('.back-btn, .next-btn, .save-btn');

  firstSection.classList.remove('d-none');
  secondSection.classList.add('d-none');
  backBtn.classList.add('d-none');
  nextBtn.classList.remove('d-none');
  saveBtn.classList.add('d-none');
}

// Function to check if data exists for the given modal
function checkIfDataExists(modalId) {
  const modal = document.getElementById(modalId);

  // Check if any input field, textarea, or checkbox has data
  let hasData = false;

  modal.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
    if (input.value.trim() !== '') {
      hasData = true;
    }
  });

  modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    if (checkbox.checked) {
      hasData = true;
    }
  });

  return hasData;
}

// Attach popover for the next button
function attachNextButtonPopover(nextBtn, message) {
  // Destroy any existing popover before attaching a new one to avoid duplicates
  const existingPopover = bootstrap.Popover.getInstance(nextBtn);
  if (existingPopover) {
    existingPopover.dispose();
  }

  // Initialize Bootstrap popover with the message
  const popoverInstance = new bootstrap.Popover(nextBtn, {
      content: message,
      trigger: 'hover',
      placement: 'top'
  });

  // Manually show/hide popover based on button status (for better control)
  nextBtn.addEventListener('mouseenter', () => {
      if (nextBtn.disabled) {
          popoverInstance.show();
      }
  });

  nextBtn.addEventListener('mouseleave', () => {
      popoverInstance.hide();
  });
}

function validateForm(modalId) {
  const modalElement = document.getElementById(modalId);
  const scoreInputs = modalElement.querySelectorAll('input.numeric-input');

  let allScoresFilled = true;

  // Check if all score inputs are filled and within the correct range
  scoreInputs.forEach(input => {
    const value = input.value.trim();
    const maxValue = parseFloat(input.getAttribute('max')) || 10; // Ensure you check the max attribute

    if (value === '' || isNaN(value) || parseFloat(value) < 0 || parseFloat(value) > maxValue) {
      allScoresFilled = false;
    }
  });

  // Determine the next button and enable or disable it based on the validation
  const nextBtn = modalElement.querySelector('.next-btn');
  if (nextBtn) {
    // Reset the popover message
    let message = '';
    let showPopover = false;

    if (modalId === 'editMotorsModal') {
      // In 'editMotorsModal', we only care about the scores being filled out
      nextBtn.disabled = !allScoresFilled;
      if (!allScoresFilled) {
        message = 'Please fill out all the score fields';
        showPopover = true;
      }
    } else if (modalId === 'edit4WheelsModal') {
      // In 'edit4WheelsModal', both the vehicle type and scores should be filled
      const vehicleTypeSelectedElement = modalElement.querySelector('.selected');
      const vehicleTypeSelected = vehicleTypeSelectedElement ? vehicleTypeSelectedElement.textContent : '';
      const isVehicleTypeSelected = vehicleTypeSelected !== 'Select Vehicle' && vehicleTypeSelected !== '';

      nextBtn.disabled = !(allScoresFilled && isVehicleTypeSelected);
      if (!isVehicleTypeSelected && !allScoresFilled) {
        message = 'Please select vehicle type and fill out all the score fields';
        showPopover = true;
      } else if (!isVehicleTypeSelected) {
        message = 'Please select vehicle type';
        showPopover = true;
      } else if (!allScoresFilled) {
        message = 'Please fill out all the score fields';
        showPopover = true;
      }
    }

    if (showPopover) {
      attachNextButtonPopover(nextBtn, message);
    } else {
      // Destroy existing popover if validation passes
      const popoverInstance = bootstrap.Popover.getInstance(nextBtn);
      if (popoverInstance) {
        popoverInstance.dispose();
      }
    }
  }
}

// Attach event listeners to score inputs and vehicle type to trigger validation
function attachValidationListeners(modalId) {
  const modalElement = document.getElementById(modalId);
  const scoreInputs = modalElement.querySelectorAll('input.numeric-input');

  // Validate when any score input changes
  scoreInputs.forEach(input => {
    input.addEventListener('input', () => validateForm(modalId));
  });

  // For edit4WheelsModal, validate when vehicle type is selected
  if (modalId === 'edit4WheelsModal') {
    const vehicleDropdown = document.getElementById('vehicleDropdown');
    if (vehicleDropdown) {
      vehicleDropdown.addEventListener('click', (e) => {
        if (e.target.classList.contains('option')) {
          validateForm(modalId); // Run validation after vehicle type selection
        }
      });
    }
  }

  // Initial validation when the modal opens
  validateForm(modalId);
}

// Call the function for each modal when it opens
document.addEventListener('DOMContentLoaded', () => {
  attachValidationListeners('edit4WheelsModal');
  attachValidationListeners('editMotorsModal');
});