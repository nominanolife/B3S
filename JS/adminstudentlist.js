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

async function fetchAppointments() {
  try {
      const querySnapshot = await getDocs(collection(db, "appointments"));
      const appointments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const studentsMap = new Map();

      for (const appointment of appointments) {
          // Ensure that `bookings` is an array, or set it to an empty array if not present
          const bookings = Array.isArray(appointment.bookings) ? appointment.bookings : [];

          for (const booking of bookings) {
              // Filter out bookings that are "Cancelled" or "Rescheduled"
              if (booking.status === "Cancelled" || booking.status === "Rescheduled") {
                  continue;
              }

              const studentDocRef = doc(db, "applicants", booking.userId);
              const studentDoc = await getDoc(studentDocRef);
              if (studentDoc.exists()) {
                  const studentData = studentDoc.data();
                  if (!studentsMap.has(booking.userId)) {
                      studentData.bookings = [];
                      studentsMap.set(booking.userId, studentData);
                  }
                  const student = studentsMap.get(booking.userId);
                  student.bookings.push({ ...booking, appointmentId: appointment.id });
              }
          }
      }

      const students = Array.from(studentsMap.values()).filter(student => student.role === "student");
      renderStudents(students);
  } catch (error) {
      console.error("Error fetching appointments: ", error);
  }
}

function renderStudents(students) {
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = '';

  students.forEach(student => {
    const personalInfo = student.personalInfo || {}; // Ensure personalInfo exists
    const studentHtml = `
      <tr class="table-row">
        <td class="table-row-content">${personalInfo.first || ''} ${personalInfo.last || ''}</td>
        <td class="table-row-content">${student.email}</td>
        <td class="table-row-content">${student.phoneNumber || ''}</td>
        <td class="table-row-content">${student.enrolledPackage}</td>
        <td class="table-row-content">&#8369; ${student.packagePrice}</td>
        ${(student.bookings || []).map(booking => {
          let tdcDropdown = '';
          let pdc4WheelsDropdown = '';
          let pdcMotorsDropdown = '';

          if (booking.TDC) {
            tdcDropdown = `
              <td class="table-row-content">
                <select class="status-dropdown" data-appointment-id="${booking.appointmentId}" data-booking-id="${booking.userId}" data-column="TDC">
                  <option value="Not yet Started" ${booking.TDC === 'Not yet Started' ? 'selected' : ''}>Not yet Started</option>
                  <option value="Completed" ${booking.TDC === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
              </td>`;
          }

          if (booking['PDC-4Wheels']) {
            pdc4WheelsDropdown = `
              <td class="table-row-content">
                <select class="status-dropdown" data-appointment-id="${booking.appointmentId}" data-booking-id="${booking.userId}" data-column="PDC-4Wheels">
                  <option value="Not yet Started" ${booking['PDC-4Wheels'] === 'Not yet Started' ? 'selected' : ''}>Not yet Started</option>
                  <option value="Completed" ${booking['PDC-4Wheels'] === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
              </td>`;
          }

          if (booking['PDC-Motors']) {
            pdcMotorsDropdown = `
              <td class="table-row-content">
                <select class="status-dropdown" data-appointment-id="${booking.appointmentId}" data-booking-id="${booking.userId}" data-column="PDC-Motors">
                  <option value="Not yet Started" ${booking['PDC-Motors'] === 'Not yet Started' ? 'selected' : ''}>Not yet Started</option>
                  <option value="Completed" ${booking['PDC-Motors'] === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
              </td>`;
          }

          return `${tdcDropdown}${pdc4WheelsDropdown}${pdcMotorsDropdown}`;
        }).join('')}
      </tr>
    `;
    studentList.insertAdjacentHTML('beforeend', studentHtml);
  });

  // Add event listeners to status dropdowns
  document.querySelectorAll('.status-dropdown').forEach(dropdown => {
    dropdown.addEventListener('change', (event) => {
      const appointmentId = event.target.dataset.appointmentId;
      const bookingId = event.target.dataset.bookingId;
      const column = event.target.dataset.column;
      const newStatus = event.target.value;
      handleStatusChange(appointmentId, bookingId, column, newStatus);
    });
  });
}

// Handle status change
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
    fetchAppointments(); // Refresh the UI to reflect the updated status
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
});

document.addEventListener('DOMContentLoaded', function() {
  const buttons = document.querySelectorAll('.button-right');
  
  buttons.forEach(button => {
      button.addEventListener('click', function() {
          buttons.forEach(btn => btn.classList.remove('active'));
          this.classList.add('active');
      });
  });
});