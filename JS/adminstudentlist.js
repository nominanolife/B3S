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

// Function to show the notification modal
function showNotification(message) {
    const successModalBody = document.getElementById('successModalBody');
    successModalBody.textContent = message;
    
    const successModal = new bootstrap.Modal(document.getElementById('successModal'), {
        backdrop: 'static',
        keyboard: false 
    });
    successModal.show();
}

async function fetchAppointments() {
  try {
    const studentsMap = new Map();
    // Real-time listener for applicants
    const unsubscribeApplicants = onSnapshot(collection(db, "applicants"), (applicantsSnapshot) => {
      applicantsSnapshot.forEach(applicantDoc => {
        const applicantData = applicantDoc.data();

        // Include the document ID (UID) in the student data
        applicantData.id = applicantDoc.id; // Ensure this is set consistently

        // Only process if the role is "student"
        if (applicantData.role === "student") {
          applicantData.bookings = [];
          // Check if they have completed any of the courses
          if (applicantData.TDCStatus === "Completed" || 
              applicantData["PDC-4WheelsStatus"] === "Completed" || 
              applicantData["PDC-MotorsStatus"] === "Completed") {
            studentsMap.set(applicantDoc.id, applicantData);
          }
        }
      });

      // Listen to appointments changes
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

        // Listen to completedBookings changes
        const unsubscribeCompletedBookings = onSnapshot(collection(db, "completedBookings"), (completedBookingsSnapshot) => {
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

// Render function to display students in the table, including the certificate control number
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
                  <i class="bi bi-pencil-square edit-icon" data-index="${index}"></i>
              </td>
          </tr>
      `;
      studentList.insertAdjacentHTML('beforeend', studentHtml);
  });

  bindStatusToggles();

  function renderCourseStatus(course, status, bookings = []) {
      if (status === "Completed") {
          return `
              <td class="table-row-content">
                  <label class="status-label">
                      <input type="checkbox" class="status-toggle" checked disabled>
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

// The bindStatusToggles function remains unchanged
function bindStatusToggles() {
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

    // Update the course status field in the applicant document
    if (isCompleted) {
      updateData[`${course}Status`] = "Completed";
    } else {
      updateData[`${course}Status`] = deleteField(); // Use deleteField() to remove the status field
    }
    await updateDoc(applicantDocRef, updateData);

    if (appointmentId) {
      const docRef = doc(db, "appointments", appointmentId);
      const docSnapshot = await getDoc(docRef);

      if (docSnapshot.exists()) {
        const appointmentData = docSnapshot.data();

        if (Array.isArray(appointmentData.bookings)) {
          // Update both the progress and status for the student's booking
          const updatedBookings = appointmentData.bookings.map(booking => {
            if (booking.userId === userId && booking.status === "Booked") {
              return { 
                ...booking, 
                progress: isCompleted ? "Completed" : "Not yet Started",
                status: isCompleted ? "Completed" : "Booked" // Update status
              };
            }
            return booking;
          });

          // Save the updated bookings array back to the appointments document
          await updateDoc(docRef, { bookings: updatedBookings });

          // Update the completedBookings collection only when status is set to "Completed"
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
        await setDoc(completedBookingRef, {
          completedBookings: []
        });
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

// Check user authentication and fetch students on page load
onAuthStateChanged(auth, (user) => {
  if (user) {
    fetchAppointments();
  } else {
    console.error("No user is currently signed in.");
  }
});

document.addEventListener('DOMContentLoaded', () => {
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
          editModal.show()

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

document.addEventListener('DOMContentLoaded', function() {
  let currentStep = 1;
  const totalSteps = document.querySelectorAll('.modal-body[data-step]').length;
  const backButton = document.querySelector('.back-btn');
  const nextButton = document.querySelector('.next-btn');
  const saveButton = document.querySelector('.save-btn');
  const modalDialog = document.querySelector('.modal-dialog');

  function showStep(step) {
      document.querySelectorAll('.modal-body[data-step]').forEach((stepElement) => {
          stepElement.style.display = 'none'; // Hide all steps
      });
      document.querySelector(`.modal-body[data-step="${step}"]`).style.display = 'block'; // Show current step

      // Adjust modal size based on the step
      if (step === 1) {
          modalDialog.classList.remove('modal-dialog-large');
          modalDialog.classList.add('modal-dialog-small'); // Small size for step 1
          backButton.style.display = 'none'; // Hide the back button on step 1
          nextButton.style.display = 'none'; // Hide the next button on step 1
          saveButton.style.display = 'inline-block'; // Show the save button on step 1
      } else if (step === 2 || step === 3) {
          modalDialog.classList.remove('modal-dialog-small');
          modalDialog.classList.add('modal-dialog-large'); // Large size for steps 2 and 3
          backButton.style.display = 'inline-block'; // Show the back button on steps 2 and 3
          nextButton.style.display = 'inline-block'; // Show the next button on steps 2 and 3
          saveButton.style.display = 'none'; // Hide the save button on steps 2 and 3
      }
  }

  saveButton.addEventListener('click', function() {
      // Perform save operation here
      console.log("Saving data..."); // Replace with your actual save logic
      currentStep++;
      showStep(currentStep);
  });

  nextButton.addEventListener('click', function() {
      if (currentStep < totalSteps) {
          currentStep++;
          showStep(currentStep);
      }
  });

  backButton.addEventListener('click', function() {
      if (currentStep > 1) {
          currentStep--;
          showStep(currentStep);
      }
  });

  // Initialize first step
  showStep(currentStep);
});