import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

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
const instructorList = document.querySelector('.instructor-list');
const searchInput = document.querySelector('.search');
const addInstructorButton = document.querySelector('.add-instructor');
const instructorModalElement = document.getElementById('instructorModal');
const instructorModal = new bootstrap.Modal(instructorModalElement);
const saveInstructorBtn = document.querySelector('.save-instructor');
const closeModalButton = document.querySelector('.close-modal');
const instructorNameInput = document.querySelector('.instructor-name');
const instructorCourseInput = document.querySelector('.instructor-course');
const paginationControls = document.querySelector('.pagination-controls');
let instructorIdToDelete = null; // Store the ID of the instructor to delete

let instructors = []; // Store all instructors data
let filteredInstructors = []; // Store filtered instructors data
let currentPage = 1; // Tracks the current page
const itemsPerPage = 10; // Number of items per page
let totalPages = 1; // Total number of pages

// Fetch and display instructors
async function fetchInstructors() {
  const querySnapshot = await getDocs(collection(db, 'instructors'));
  instructors = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  filteredInstructors = instructors; // Initialize with all instructors
  totalPages = Math.ceil(filteredInstructors.length / itemsPerPage);
  renderInstructors(); // Render the first page
  updatePaginationControls(); // Update pagination controls
}

// Render instructors in the table
function renderInstructors() {
  instructorList.innerHTML = '';
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedInstructors = filteredInstructors.slice(start, end);

  paginatedInstructors.forEach(instructor => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${instructor.name}</td>
      <td>${instructor.course}</td>
      <td class="table-row-content">
        <div class="dropdown">
          <button class="three-dots-button" type="button"><i class="bi bi-three-dots"></i></button>
          <div class="dropdown-content">
            <button class="dropdown-item" data-id="${instructor.id}">Edit</button>
            <button class="dropdown-item" data-id="${instructor.id}">Delete</button>
          </div>
        </div>
      </td>
      <td>
        <label class="switch">
          <input type="checkbox" class="slider-switch" data-id="${instructor.id}">
          <span class="slider">
            <span class="slider-label-off">OFF</span>
            <span class="slider-label-on">ON</span>
          </span>
        </label>
      </td>
    `;
    instructorList.appendChild(row);
  });

  handleDropdowns();
  handleSliderSwitch(); // Handles the slider switch functionality
}

// Handle dropdown functionality
function handleDropdowns() {
  document.querySelectorAll('.three-dots-button').forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent event from bubbling up

      const dropdown = this.nextElementSibling;
      const isDropdownOpen = dropdown.classList.contains('show');

      closeAllDropdowns(); // Close any other open dropdowns

      // Toggle the clicked dropdown
      if (!isDropdownOpen) {
        dropdown.classList.add('show');
      } else {
        dropdown.classList.remove('show');
      }
    });
  });

  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown')) {
      closeAllDropdowns();
    }
  });
}

// Handle slider switch functionality
function handleSliderSwitch() {
  document.querySelectorAll('.slider-switch').forEach(switchElement => {
    switchElement.addEventListener('change', async function () {
      const instructorId = this.dataset.id;
      const isChecked = this.checked;
      
      try {
        await updateDoc(doc(db, 'instructors', instructorId), {
          active: isChecked
        });
        console.log(`Instructor ${instructorId} is now ${isChecked ? 'active' : 'inactive'}`);
      } catch (error) {
        console.error('Error updating instructor status:', error);
      }
    });
  });
}

// Update pagination controls
function updatePaginationControls() {
  paginationControls.innerHTML = '';

  // Previous button
  const prevButton = document.createElement('i');
  prevButton.className = 'bi bi-caret-left';
  if (currentPage === 1) {
    prevButton.classList.add('disabled');
  }
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderInstructors();
      updatePaginationControls();
    }
  });

  // Next button
  const nextButton = document.createElement('i');
  nextButton.className = 'bi bi-caret-right';
  if (currentPage === totalPages) {
    nextButton.classList.add('disabled');
  }
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderInstructors();
      updatePaginationControls();
    }
  });

  // Page number display
  const pageNumberDisplay = document.createElement('span');
  pageNumberDisplay.className = 'page-number';
  pageNumberDisplay.textContent = `Page ${currentPage} of ${totalPages}`;

  paginationControls.appendChild(prevButton);
  paginationControls.appendChild(pageNumberDisplay);
  paginationControls.appendChild(nextButton);
}

// Add instructor
async function addInstructor(event) {
  event.preventDefault();
  const name = instructorNameInput.value.trim();
  const course = instructorCourseInput.value.trim();

  if (!name || !course) {
    alert('Please fill in all the required fields.');
    return;
  }

  try {
    await addDoc(collection(db, 'instructors'), {
      name: name,
      course: course,
      active: false, // Default status to inactive (OFF)
    });

    instructorModal.hide(); // Close the modal
    fetchInstructors(); // Refresh the instructor list
    resetForm(); // Clear the form after submission
  } catch (error) {
    console.error('Error adding instructor:', error);
  }
}

// Reset form function
function resetForm() {
  instructorNameInput.value = '';
  instructorCourseInput.value = '';
  closeModalButton.click(); // Close modal
}

// Event listener for the add instructor button
addInstructorButton.addEventListener('click', () => {
  instructorModal.show();
  resetForm();
});

// Event listener for the save button in the modal
saveInstructorBtn.addEventListener('click', addInstructor);

// Fetch instructors on page load
window.onload = fetchInstructors;


// Edit instructor
async function editInstructor(event) {
  const id = event.target.dataset.id;
  const instructor = instructors.find(instructor => instructor.id === id);
  if (instructor) {
    instructorNameInput.value = instructor.name;
    instructorCourseInput.value = instructor.course;
    instructorModal.show();

    saveInstructorBtn.onclick = async function (e) {
      e.preventDefault();
      const updatedName = instructorNameInput.value.trim();
      const updatedCourse = instructorCourseInput.value.trim();
      if (!updatedName || !updatedCourse) {
        alert('Please fill in both fields.');
        return;
      }

      try {
        await updateDoc(doc(db, 'instructors', id), {
          name: updatedName,
          course: updatedCourse
        });
        fetchInstructors(); // Refresh the list
        instructorModal.hide();
      } catch (error) {
        console.error('Error updating instructor:', error);
      }
    };
  }
}

// Function to trigger file input when camera icon is clicked
document.getElementById('uploadIcon').addEventListener('click', function() {
  document.getElementById('editProfilePic').click();
});

// Function to preview the image when a new image is selected
document.getElementById('editProfilePic').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
          document.getElementById('profilePicPreview').src = e.target.result;
      }
      reader.readAsDataURL(file);
  }
});

// Store the delete confirmation modal instance
const deleteConfirmationModalElement = document.getElementById('deleteConfirmationModal');
const deleteConfirmationModal = new bootstrap.Modal(deleteConfirmationModalElement);

// Handle Delete button click in the dropdown
function deleteInstructor(event) {
    instructorIdToDelete = event.target.dataset.id; // Capture the ID of the instructor to delete
    deleteConfirmationModal.show(); // Show the delete confirmation modal
}

// Confirm deletion of the instructor
document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
    if (instructorIdToDelete) {
        try {
            await deleteDoc(doc(db, 'instructors', instructorIdToDelete));
            fetchInstructors(); // Refresh the list after deletion
            deleteConfirmationModal.hide(); // Hide the modal after successful deletion
            instructorIdToDelete = null; // Reset the variable
        } catch (error) {
            console.error('Error deleting instructor:', error);
        }
    }
});

// Search instructors by name
function searchInstructors(event) {
  const query = event.target.value.toLowerCase();
  filteredInstructors = instructors.filter(instructor =>
    instructor.name.toLowerCase().startsWith(query)
  );
  currentPage = 1; // Reset to first page after search
  totalPages = Math.ceil(filteredInstructors.length / itemsPerPage);
  renderInstructors();
  updatePaginationControls();
}

// Event Listeners
addInstructorButton.addEventListener('click', () => {
  instructorModal.show();
  instructorNameInput.value = ''; // Clear fields before opening the modal
  instructorCourseInput.value = '';
  saveInstructorBtn.onclick = addInstructor;
});

closeModalButton.addEventListener('click', () => instructorModal.hide());
searchInput.addEventListener('input', searchInstructors);
instructorList.addEventListener('click', function (event) {
  if (event.target.classList.contains('dropdown-item')) {
    if (event.target.textContent.includes('Edit')) {
      editInstructor(event);
    } else if (event.target.textContent.includes('Delete')) {
      deleteInstructor(event); // Trigger the delete modal
    }
  }
});

// Handle sidebar button active state
document.addEventListener('DOMContentLoaded', function () {
  const buttons = document.querySelectorAll('.button-right');

  buttons.forEach(button => {
    button.addEventListener('click', function () {
      buttons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Fetch and display instructors on page load
  fetchInstructors();
});
