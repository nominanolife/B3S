import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

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

// DOM Elements
const addInstructorButton = document.querySelector('.add-instructor');
const saveInstructorButton = document.querySelector('.save-instructor'); // Save button
const instructorModalElement = document.getElementById('instructorModal');
const instructorModal = new bootstrap.Modal(instructorModalElement);
const loader = document.getElementById('loader1');
const instructorsList = document.querySelector('.instructor-list'); // Target tbody for instructors

// Fetch and Display Existing Instructors
async function fetchInstructors() {
  try {
    loader.style.display = 'flex'; // Show loader

    const querySnapshot = await getDocs(collection(db, 'admin')); // Get all documents in the 'admin' collection
    instructorsList.innerHTML = ''; // Clear existing list

    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        // Skip the special 'admin' document
        if (doc.id === 'admin') return;

        const instructor = doc.data();
        instructorsList.insertAdjacentHTML(
          'beforeend',
          `<tr>
            <td></td>
            <td>${instructor.email}</td>
            </td>
          </tr>`
        );
      });

      // Attach delete functionality to the buttons
      document.querySelectorAll('.delete-instructor').forEach(button => {
        button.addEventListener('click', async (event) => {
          const instructorId = event.target.getAttribute('data-id');
          await deleteInstructor(instructorId);
        });
      });
    } else {
      instructorsList.innerHTML = `<tr><td colspan="3" class="text-center">No instructors found.</td></tr>`;
    }
  } catch (error) {
    console.error('Error fetching instructors:', error);
  } finally {
    loader.style.display = 'none'; // Hide loader
  }
}

// Save Instructor to Firestore as a new document
async function saveInstructor() {
  const emailInput = document.querySelector('.email');
  const passwordInput = document.querySelector('.password-field');

  if (!emailInput.value.trim() || !passwordInput.value.trim()) {
    alert('Please fill out both email and password fields.');
    return;
  }

  try {
    loader.style.display = 'flex'; // Show loader

    const newInstructor = {
      email: emailInput.value.trim(),
      password: passwordInput.value.trim(),
      role: 'instructor',
    };

    await addDoc(collection(db, 'admin'), newInstructor);

    console.log('Instructor added as a new document.');
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
