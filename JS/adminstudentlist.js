import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Fetch students from Firestore
async function fetchStudents() {
  try {
    const querySnapshot = await getDocs(collection(db, "applicants"));
    const students = querySnapshot.docs.map(doc => doc.data()).filter(student => student.role === "student");
    renderStudents(students);
  } catch (error) {
    console.error("Error fetching students: ", error);
  }
}

// Render students in the HTML
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
      </tr>
      `;
    studentList.insertAdjacentHTML('beforeend', studentHtml);
  });
}

// Check user authentication and fetch students on page load
onAuthStateChanged(auth, (user) => {
  if (user) {
    fetchStudents();
  } else {
    console.error("No user is currently signed in.");
  }
});