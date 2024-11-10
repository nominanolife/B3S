import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, setDoc, getDocs, doc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

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
const auth = getAuth();

// DOM Elements
const addInstructorButton = document.querySelector('.add-instructor');
const saveInstructorButton = document.querySelector('.save-instructor'); // Save button
const instructorModalElement = document.getElementById('instructorModal');
const instructorModal = new bootstrap.Modal(instructorModalElement);
const loader = document.getElementById('loader1');
const instructorsList = document.querySelector('.instructor-list'); // Target tbody for instructors

async function fetchInstructors() {
  try {
    loader.style.display = 'flex'; // Show loader
    instructorsList.innerHTML = ''; // Clear existing list

    // Step 1: Fetch all documents from the admin collection
    const adminSnapshot = await getDocs(collection(db, 'admin'));

    // Step 2: Loop through the admin collection and fetch corresponding data from the instructors table
    if (!adminSnapshot.empty) {
      for (const adminDoc of adminSnapshot.docs) {
        const adminData = adminDoc.data();

        // Skip admin role users
        if (adminData.role !== 'instructor') continue;

        // Fetch corresponding data from instructors table using UID
        const instructorDoc = await getDoc(doc(db, 'instructors', adminDoc.id));
        const instructorData = instructorDoc.exists() ? instructorDoc.data() : {};

        // Merge data from both collections
        const instructorDetails = {
          email: adminData.email || 'N/A',
          name: instructorData.name || 'N/A',
          courses: instructorData.courses ? instructorData.courses.join(', ') : 'N/A',
        };

        // Insert data into the table
        instructorsList.insertAdjacentHTML(
          'beforeend',
          `<tr>
            <td>${instructorDetails.name}</td>
            <td>${instructorDetails.email}</td>
            <td>${instructorDetails.courses}</td>
            <td>
              <button class="btn btn-danger delete-instructor" data-id="${adminDoc.id}">Delete</button>
            </td>
          </tr>`
        );
      }

      // Attach delete functionality to the buttons
      document.querySelectorAll('.delete-instructor').forEach((button) => {
        button.addEventListener('click', async (event) => {
          const instructorId = event.target.getAttribute('data-id');
          await deleteInstructor(instructorId);
        });
      });
    } else {
      instructorsList.innerHTML = `<tr><td colspan="4" class="text-center">No instructors found.</td></tr>`;
    }
  } catch (error) {
    console.error('Error fetching instructors:', error);
  } finally {
    loader.style.display = 'none'; // Hide loader
  }
}

async function saveInstructor() {
  const emailInput = document.querySelector('.email');
  const passwordInput = document.querySelector('.password-field');

  if (!emailInput.value.trim() || !passwordInput.value.trim()) {
    alert('Please fill out both email and password fields.');
    return;
  }

  try {
    loader.style.display = 'flex'; // Show loader

    // Step 1: Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value.trim()
    );
    const newUser = userCredential.user;

    // Step 2: Save the user details in Firestore using the UID
    const newInstructor = {
      email: newUser.email,
      uid: newUser.uid, // Store the UID
      role: 'instructor',
    };

    await setDoc(doc(db, 'admin', newUser.uid), newInstructor);

    console.log('Instructor added successfully.');
    emailInput.value = '';
    passwordInput.value = '';
    instructorModal.hide();
    showNotification('Instructor saved successfully.');
    fetchInstructors();
  } catch (error) {
    console.error('Error saving instructor:', error);
    showNotification('An error occurred while saving the instructor.');
  } finally {
    loader.style.display = 'none'; // Hide loader
  }
}

// Delete Instructor
async function deleteInstructor(id) {
  try {
    loader.style.display = 'flex'; // Show loader

    const instructorDocRef = doc(db, 'admin', id);
    await deleteDoc(instructorDocRef);
    console.log('Instructor deleted.');
    showNotification('Instructor deleted successfully.');

    fetchInstructors();
  } catch (error) {
    console.error('Error deleting instructor:', error);
    showNotification('An error occurred while deleting the instructor.');
  } finally {
    loader.style.display = 'none'; // Hide loader
  }
}

// Toggle Password Visibility
document.querySelectorAll('.togglePassword').forEach(button => {
  button.addEventListener('click', function () {
    const passwordField = this.previousElementSibling;
    const icon = this.querySelector('i');

    if (passwordField.type === 'password') {
      passwordField.type = 'text';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    } else {
      passwordField.type = 'password';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    }
  });
});

// Notification Modal
function showNotification(message) {
  const notificationModalBody = document.getElementById('notificationModalBody');
  notificationModalBody.textContent = message;
  const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
  notificationModal.show();
}

// Event Listener for Add Instructor Button
addInstructorButton.addEventListener('click', () => {
  instructorModal.show();
});

// Event Listener for Save Button
saveInstructorButton.addEventListener('click', saveInstructor);

// Fetch instructors on page load
document.addEventListener('DOMContentLoaded', fetchInstructors);
