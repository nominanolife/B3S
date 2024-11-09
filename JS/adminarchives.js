import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
  authDomain: "authentication-d6496.firebaseapp.com",
  projectId: "authentication-d6496",
  storageBucket: "authentication-d6496.appspot.com",
  messagingSenderId: "195867894399",
  appId: "1:195867894399:web:596fb109d308aea8b6154a",
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const db = getFirestore(app);

async function fetchArchivedStudents() {
  try {
    const studentList = document.getElementById('student-archives-list');
    studentList.innerHTML = `<tr><td colspan="10" class="text-center">Loading...</td></tr>`; // Show loading state

    // Query applicants where role = "student" and archived = true
    const applicantsSnapshot = await getDocs(query(
      collection(db, 'applicants'),
      where('role', '==', 'student'), // First filter by role = "student"
      where('archived', '==', true) // Then filter by archived = true
    )
  );  
    const studentsMap = new Map();

    // Process applicants
    applicantsSnapshot.forEach((doc) => {
      const applicantData = doc.data();
      const userId = doc.id;

      studentsMap.set(userId, {
        name: `${applicantData.personalInfo?.first || 'N/A'} ${applicantData.personalInfo?.last || ''}`,
        email: applicantData.email || 'N/A',
        phoneNumber: applicantData.phoneNumber || 'N/A',
        packageName: applicantData.packageName || 'N/A',
        packagePrice: applicantData.packagePrice || 'N/A',
        TDC: applicantData.TDCStatus || 'N/A',
        "4Wheels": applicantData["PDC-4WheelsStatus"] || 'N/A',
        Motors: applicantData["PDC-MotorsStatus"] || 'N/A',
        dateJoined: 'N/A', // To be fetched from completedBookings
        certificateControlNumber: applicantData.certificateControlNumber || 'N/A',
      });
    });

    // Query completedBookings and fetch the first date for each user
    const completedBookingsSnapshot = await getDocs(collection(db, 'completedBookings'));

    completedBookingsSnapshot.forEach((doc) => {
      const bookingData = doc.data();
      const userId = doc.id; // The document ID matches between collections

      if (studentsMap.has(userId) && Array.isArray(bookingData.completedBookings) && bookingData.completedBookings.length > 0) {
        // Fetch the earliest date from the completedBookings array
        const firstBooking = bookingData.completedBookings[0]; // Take the first booking from the array
        const student = studentsMap.get(userId);

        student.dateJoined = firstBooking.date || 'N/A'; // Use the date field from the first booking
      }
    });

    const archivedStudents = Array.from(studentsMap.values());

    renderArchivedStudents(archivedStudents);
  } catch (error) {
    console.error('Error fetching archived students:', error);
    const studentList = document.getElementById('student-archives-list');
    studentList.innerHTML = `<tr><td colspan="10" class="text-center">Failed to load data</td></tr>`;
  }
}

// Render archived students
function renderArchivedStudents(archivedStudents) {
  const studentList = document.getElementById('student-archives-list');
  studentList.innerHTML = ''; // Clear the table

  if (archivedStudents.length === 0) {
    studentList.innerHTML = `<tr><td colspan="10" class="text-center">No archived students found</td></tr>`;
    return;
  }

  // Render rows for each archived student
  archivedStudents.forEach((student) => {
    const row = `
      <tr>
        <td>${student.name}</td>
        <td>${student.email}</td>
        <td>${student.phoneNumber}</td>
        <td>${student.packageName}</td>
        <td>&#8369;${student.packagePrice}</td>
        <td>${student.TDC}</td>
        <td>${student["4Wheels"]}</td>
        <td>${student.Motors}</td>
        <td>${student.dateJoined !== 'N/A' ? new Date(student.dateJoined).toLocaleDateString() : 'N/A'}</td>
        <td>${student.certificateControlNumber}</td>
      </tr>
    `;
    studentList.insertAdjacentHTML('beforeend', row);
  });
}
  
// Call fetchArchivedStudents on page load
document.addEventListener('DOMContentLoaded', fetchArchivedStudents);