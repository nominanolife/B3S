import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, setDoc, getDocs, doc, deleteDoc, getDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAuth, createUserWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

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

// DOM Elements for Modal
const feedbackOverviewModalElement = document.getElementById('feedbackOverviewModal');
const deleteConfirmationModalElement = document.getElementById('deleteConfirmationModal');

const feedbackOverviewModal = new bootstrap.Modal(feedbackOverviewModalElement);
const deleteConfirmationModal = new bootstrap.Modal(deleteConfirmationModalElement);

// Attach search functionality to the search bar
document.getElementById('searchBar').addEventListener('input', searchInstructors);

// Search Instructors
function searchInstructors() {
  const searchInput = document.getElementById('searchBar').value.toLowerCase().trim();
  const rows = document.querySelectorAll('.instructor-list tr:not(.no-results-row)');
  let hasResults = false;

  rows.forEach(row => {
    const nameCell = row.querySelector('td:first-child'); // The first cell contains the name
    if (nameCell) {
      const name = nameCell.textContent.toLowerCase();
      if (name.includes(searchInput)) {
        row.style.display = ''; // Show matching row
        hasResults = true;
      } else {
        row.style.display = 'none'; // Hide non-matching row
      }
    }
  });

  // Check if we need to display the "No instructor/s found" row
  let noResultsRow = document.querySelector('.no-results-row');
  if (!hasResults && searchInput) {
    // If no rows match and the input is not empty, show the "No instructor/s found" row
    if (!noResultsRow) {
      const noResultsHTML = `
        <tr class="no-results-row">
          <td colspan="4" class="text-center">No instructor/s found</td>
        </tr>`;
      document.querySelector('.instructor-list').insertAdjacentHTML('beforeend', noResultsHTML);
    }
  } else {
    // Remove the "No instructor/s found" row if present
    if (noResultsRow) {
      noResultsRow.remove();
    }
  }

  // Show all rows when the search bar is cleared
  if (!searchInput) {
    rows.forEach(row => {
      row.style.display = '';
    });
  }
}

// Fetch instructors with dropdown functionality for edit, feedback, and delete
async function fetchInstructors() {
  try {
    loader.style.display = 'flex'; // Show loader
    instructorsList.innerHTML = ''; // Clear existing list

    const adminSnapshot = await getDocs(collection(db, 'admin'));

    if (adminSnapshot.empty) {
      // Show "No instructor/s yet" if there are no documents
      instructorsList.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">No instructor/s yet</td>
        </tr>`;
      return; // Exit early since there are no instructors
    }

    let hasInstructors = false;

    for (const adminDoc of adminSnapshot.docs) {
      const adminData = adminDoc.data();
      if (adminData.role !== 'instructor') continue;

      hasInstructors = true; // Set flag if at least one instructor exists

      const instructorDoc = await getDoc(doc(db, 'instructors', adminDoc.id));
      const instructorData = instructorDoc.exists() ? instructorDoc.data() : {};

      const instructorDetails = {
        email: adminData.email || 'N/A',
        name: instructorData.name || 'N/A',
        courses: instructorData.courses ? instructorData.courses.join(' || ') : 'N/A',
      };

      instructorsList.insertAdjacentHTML(
        'beforeend',
        `<tr>
          <td><img src="${'Assets/default-profile.png'}">${instructorDetails.name}</td>
          <td>${instructorDetails.email}</td>
          <td>${instructorDetails.courses}</td>
          <td class="table-row-content">
            <div class="dropdown">
              <i class="bi bi-three-dots"></i>
              <div class="dropdown-content">
                <i class="dropdown-item feedback-btn">Feedbacks</i>
                <i class="dropdown-item delete-btn" data-id="${adminDoc.id}">Delete</i>
              </div>
            </div>
          </td>
        </tr>`
      );
    }

    if (!hasInstructors) {
      // If no instructors found after filtering, display the message
      instructorsList.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">No instructor/s yet</td>
        </tr>`;
    } else {
      // Attach functionality to dropdown actions if instructors are present
      handleDropdowns();
    }
  } catch (error) {
    console.error('Error fetching instructors:', error);
  } finally {
    loader.style.display = 'none';
  }
}

// Fetch Feedbacks from the 'comments' Array in the Instructors Table
async function getFeedbacks(instructorId) {
  try {
    // Access the instructor document
    const instructorDocRef = doc(db, 'instructors', instructorId);
    const instructorDoc = await getDoc(instructorDocRef);

    if (!instructorDoc.exists()) {
      throw new Error('Instructor not found.');
    }

    // Extract comments array
    const instructorData = instructorDoc.data();
    const feedbacks = instructorData.comments || []; // Default to an empty array if no comments

    // Map feedbacks to the desired structure
    return feedbacks.map(feedback => ({
      comment: feedback.comment || 'No comment provided.',
      rating: feedback.rating || '0',
      timestamp: feedback.timestamp || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    return [];
  }
}

// Event Listener for Feedback Button
async function handleFeedbackButtonClick(instructorId) {
  try {
    // Fetch feedbacks for the given instructor
    const feedbacks = await getFeedbacks(instructorId);

    // Clear existing feedback in the modal
    const feedbackListElement = document.getElementById('feedbackList');
    feedbackListElement.innerHTML = '';

    if (feedbacks.length === 0) {
      feedbackListElement.innerHTML = '<p>No feedbacks available for this instructor.</p>';
    } else {
      feedbacks.forEach(feedback => {
        const feedbackItem = `
          <div class="feedback-item">
            <p><strong>${'⭐'.repeat(parseInt(feedback.rating))}</strong> (${feedback.rating} Stars)</p>
            <p>${feedback.comment}</p>
            <p class="text-muted">${new Date(feedback.timestamp).toLocaleDateString()}</p>
          </div>
          <hr>`;
        feedbackListElement.insertAdjacentHTML('beforeend', feedbackItem);
      });
    }

    // Show the feedback modal
    feedbackOverviewModal.show();
  } catch (error) {
    console.error('Error handling feedback button click:', error);
    showNotification('An error occurred while loading feedback.');
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
    dropdown.querySelector('.feedback-btn').addEventListener('click', async (event) => {
      const instructorId = event.target.closest('.dropdown').querySelector('.delete-btn').getAttribute('data-id');
      await handleFeedbackButtonClick(instructorId);
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
    showNotification('Please fill out both email and password fields.');
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

async function deleteInstructor(id) {
  try {
    loader.style.display = 'flex'; // Show loader

    // Step 1: Fetch the instructor's data from the `admin` collection
    const userDoc = await getDoc(doc(db, 'admin', id));
    if (!userDoc.exists()) {
      throw new Error("Instructor does not exist in the database.");
    }

    // Step 2: Delete the instructor's record from the `admin` collection
    await deleteDoc(doc(db, 'admin', id));
    console.log(`Instructor ${id} deleted from the 'admin' collection.`);

    // Step 3.1: Remove matches associated with the instructor using a query
    const matchesQuery = collection(db, 'matches');
    const matchesSnapshot = await getDocs(matchesQuery);
    const batch = writeBatch(db); // Correct batching initialization

    matchesSnapshot.forEach((matchDoc) => {
      const matchData = matchDoc.data();
      if (matchData.instructorId === id) {
        batch.delete(doc(db, 'matches', matchDoc.id));
        console.log(`Queued match ${matchDoc.id} for deletion.`);
      }
    });

    // Commit the batch deletions for matches
    await batch.commit();
    console.log('All matches associated with the instructor have been deleted.');

    // Step 3.2: Remove the instructor's document from the `instructors` collection
    const instructorRef = doc(db, 'instructors', id);
    const instructorSnapshot = await getDoc(instructorRef);
    if (instructorSnapshot.exists()) {
      await deleteDoc(instructorRef);
      console.log(`Deleted instructor document: ${id}`);
    }

    // Notify user of success
    showNotification('Instructor deleted successfully.');
    fetchInstructors(); // Refresh the list
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
document.addEventListener('DOMContentLoaded', () => {
  fetchInstructors();
});