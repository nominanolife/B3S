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

// DOM Elements for Modals
const editInstructorModalElement = document.getElementById('editInstructorModal');
const feedbackOverviewModalElement = document.getElementById('feedbackOverviewModal');
const deleteConfirmationModalElement = document.getElementById('deleteConfirmationModal');

const editInstructorModal = new bootstrap.Modal(editInstructorModalElement);
const feedbackOverviewModal = new bootstrap.Modal(feedbackOverviewModalElement);
const deleteConfirmationModal = new bootstrap.Modal(deleteConfirmationModalElement);

// Fetch instructors with dropdown functionality for edit, feedback, and delete
async function fetchInstructors() {
  try {
    loader.style.display = 'flex'; // Show loader
    instructorsList.innerHTML = ''; // Clear existing list

    const adminSnapshot = await getDocs(collection(db, 'admin'));

    if (!adminSnapshot.empty) {
      for (const adminDoc of adminSnapshot.docs) {
        const adminData = adminDoc.data();
        if (adminData.role !== 'instructor') continue;

        const instructorDoc = await getDoc(doc(db, 'instructors', adminDoc.id));
        const instructorData = instructorDoc.exists() ? instructorDoc.data() : {};

        const instructorDetails = {
          email: adminData.email || 'N/A',
          name: instructorData.name || 'N/A',
          courses: instructorData.courses ? instructorData.courses.join(', ') : 'N/A',
        };

        instructorsList.insertAdjacentHTML(
          'beforeend',
          `<tr>
            <td>${instructorDetails.name}</td>
            <td>${instructorDetails.email}</td>
            <td>${instructorDetails.courses}</td>
            <td class="table-row-content">
              <div class="dropdown">
                <i class="bi bi-three-dots"></i>
                <div class="dropdown-content">
                  <i class="dropdown-item feedback-btn">Feedbacks</i>
                  <i class="dropdown-item edit-btn" data-id="${adminDoc.id}">Edit</i>
                  <i class="dropdown-item delete-btn" data-id="${adminDoc.id}">Delete</i>
                </div>
              </div>
            </td>
          </tr>`
        );
      }

      // Attach functionality to dropdown actions
      handleDropdowns();
    } else {
      instructorsList.innerHTML = `<tr><td colspan="4" class="text-center">No instructors found.</td></tr>`;
    }
  } catch (error) {
    console.error('Error fetching instructors:', error);
  } finally {
    loader.style.display = 'none';
  }
}

function handleDropdowns() {
  document.querySelectorAll('.dropdown').forEach(dropdown => {
    const button = dropdown.querySelector('.bi-three-dots');
    const content = dropdown.querySelector('.dropdown-content');

    button.addEventListener('click', function(e) {
      e.stopPropagation();
      const isDropdownOpen = content.classList.contains('show');
      closeAllDropdowns();
      if (!isDropdownOpen) {
        content.classList.add('show');
      } else {
        content.classList.remove('show');
      }
    });

    // Event Listener for Edit Button
    dropdown.querySelector('.edit-btn').addEventListener('click', () => {
      editInstructorModal.show();
      content.classList.remove('show'); // Close dropdown after selection
      // Load instructor data in edit modal if needed
    });

    // Event Listener for Feedback Button
    dropdown.querySelector('.feedback-btn').addEventListener('click', () => {
      feedbackOverviewModal.show();
      content.classList.remove('show'); // Close dropdown after selection
    });

    // Event Listener for Delete Button
    dropdown.querySelector('.delete-btn').addEventListener('click', (event) => {
      const instructorId = event.target.getAttribute('data-id');
      document.getElementById('confirmDeleteBtn').setAttribute('data-id', instructorId);
      deleteConfirmationModal.show();
      content.classList.remove('show'); // Close dropdown after selection
    });
  });

  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }

  document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown')) {
      closeAllDropdowns();
    }
  });
}

// Event Listener for Confirm Delete Button
document.getElementById('confirmDeleteBtn').addEventListener('click', async (event) => {
  const instructorId = event.target.getAttribute('data-id');
  await deleteInstructor(instructorId);
  deleteConfirmationModal.hide();
});


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
