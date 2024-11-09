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
// Fetch and render archived students
async function fetchArchivedStudents() {
  try {
    // Show loader1
    document.getElementById('loader1').style.display = 'flex';

    const studentList = document.getElementById('student-archives-list');
    studentList.innerHTML = ''; // Clear existing content

    // Query applicants where role = "student" and archived = true
    const applicantsSnapshot = await getDocs(query(
      collection(db, 'applicants'),
      where('role', '==', 'student'),
      where('archived', '==', true)
    ));

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
      const userId = doc.id;

      if (studentsMap.has(userId) && Array.isArray(bookingData.completedBookings) && bookingData.completedBookings.length > 0) {
        const firstBooking = bookingData.completedBookings[0];
        const student = studentsMap.get(userId);

        student.dateJoined = firstBooking.date || 'N/A';
      }
    });

    const archivedStudents = Array.from(studentsMap.values());

    // Render the students and attach them to the search functionality
    renderArchivedStudents(archivedStudents);

    // Attach search functionality directly to the rendered students
    const searchBar = document.querySelector('.search');
    if (searchBar) {
      searchBar.addEventListener('input', (event) => {
        filterArchivedStudents(event.target.value, archivedStudents);
      });
    }
  } catch (error) {
    console.error('Error fetching archived students:', error);
    const studentList = document.getElementById('student-archives-list');
    studentList.innerHTML = `<tr><td colspan="10" class="text-center">Failed to load data</td></tr>`;
  } finally {
    // Hide loader1 after data is fetched and rendered
    document.getElementById('loader1').style.display = 'none';
  }
}

// Render archived students
function renderArchivedStudents(students) {
  const studentList = document.getElementById('student-archives-list');
  studentList.innerHTML = ''; // Clear the table

  if (students.length === 0) {
    studentList.innerHTML = `<tr><td colspan="10" class="text-center">No archived students found</td></tr>`;
    return;
  }

  // Render rows for each archived student
  students.forEach((student) => {
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

// Filter archived students dynamically based on search term
function filterArchivedStudents(searchTerm, students) {
  const lowerSearchTerm = searchTerm.toLowerCase();

  const filteredStudents = students.filter(student => {
    const fullName = (student.name || '').toLowerCase();
    const packageName = (student.packageName || '').toLowerCase();

    // Use `includes` to match any part of the name or package
    return fullName.includes(lowerSearchTerm) || packageName.includes(lowerSearchTerm);
  });

  // Render the filtered students
  renderArchivedStudents(filteredStudents);
}

// Call fetchArchivedStudents on page load
document.addEventListener('DOMContentLoaded', fetchArchivedStudents);