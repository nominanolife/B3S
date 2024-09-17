import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js';

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
const storage = getStorage(app);

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
const traitsInput = document.querySelector('.traits-input');
const addTraitButton = document.querySelector('.add-trait');
const traitsList = document.querySelector('.traits-list');
let instructorIdToDelete = null; // Store the ID of the instructor to delete
let currentInstructorId = null; // Store the current instructor's ID for editing

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
    // Join courses array into a string, handling cases where it might be undefined or empty
    const courses = Array.isArray(instructor.courses) ? instructor.courses.join(' || ') : 'No courses assigned';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${instructor.imageUrl || 'Assets/default-profile.png'}">${instructor.name}</td>
      <td>${courses}</td>
      <td class="table-row-content">
        <div class="dropdown">
          <i class="bi bi-three-dots"></i>
          <div class="dropdown-content">
            <i class="dropdown-item" data-id="${instructor.id}">Edit</i>
            <i class="dropdown-item" data-id="${instructor.id}">Delete</i>
          </div>
        </div>
      </td>
      <td>
        <label class="switch">
          <input type="checkbox" class="slider-switch" data-id="${instructor.id}" ${instructor.active ? 'checked' : ''}>
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
  document.querySelectorAll('.dropdown').forEach(dropdown => {
    const button = dropdown.querySelector('.bi-three-dots');
    const content = dropdown.querySelector('.dropdown-content');

    button.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent event from bubbling up

      const isDropdownOpen = content.classList.contains('show');

      closeAllDropdowns(); // Close any other open dropdowns

      // Toggle the clicked dropdown
      if (!isDropdownOpen) {
        content.classList.add('show');
      } else {
        content.classList.remove('show');
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

// Upload image to Firebase Storage and return the download URL
async function uploadImage(file, instructorId) {
  if (!file) return null; // If no file is selected, return null

  // Use the instructorId as the file name to ensure uniqueness
  const storageRef = ref(storage, `instructor_pictures/${instructorId}.jpg`); // Save with instructor UID as the image name

  try {
    const snapshot = await uploadBytes(storageRef, file); // Upload the file
    const downloadURL = await getDownloadURL(snapshot.ref); // Get the file's URL
    return downloadURL; // Return the image URL
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

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

// Event Listener for Add Instructor Button
addInstructorButton.addEventListener('click', () => {
  instructorModal.show();
  
  // Clear instructor name input
  if (instructorNameInput) {
    instructorNameInput.value = '';
  }

  // Uncheck all course-related checkboxes
  document.querySelectorAll('.custom-checkbox input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false; // Uncheck the checkbox
  });

  // Reset profile picture to default
  const profilePicPreview = document.getElementById('profilePicPreview');
  if (profilePicPreview) {
    profilePicPreview.src = 'Assets/default-profile.png'; // Reset to default profile picture
  }

  currentInstructorId = null; // Reset current instructor ID
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
    
    // Close the dropdown after an option is selected
    const dropdownContent = event.target.closest('.dropdown-content');
    if (dropdownContent) {
      dropdownContent.classList.remove('show');
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

addTraitButton.addEventListener('click', function(event) {
  event.preventDefault();
  let trait = traitsInput.value.trim();
  if (trait) {
    // Capitalize the first letter
    trait = trait.charAt(0).toUpperCase() + trait.slice(1).toLowerCase();

    // Create the trait item
    const traitElement = document.createElement('div');
    traitElement.classList.add('trait-item');
    traitElement.textContent = trait;
    
    // Add the delete button and append
    const deleteButton = document.createElement('i');
    deleteButton.classList.add('remove-trait');
    deleteButton.innerHTML = '<i class="bi bi-x"></i>';
    deleteButton.addEventListener('click', function() {
      traitsList.removeChild(traitElement);
    });
    traitElement.appendChild(deleteButton);
    traitsList.appendChild(traitElement);

    // Clear the input field
    traitsInput.value = '';
  } else {
    showNotification("Please enter a trait before adding.");
  }
});

// Function to save or edit instructor details
async function saveInstructor(event) {
  event.preventDefault();

  const name = instructorNameInput.value.trim();
  const selectedCourses = Array.from(document.querySelectorAll('.custom-checkbox input[type="checkbox"]:checked')).map(input => input.nextElementSibling.innerText);
  const file = document.getElementById('editProfilePic').files[0];
  const personalTraits = Array.from(document.querySelectorAll('.traits-list .trait-item')).map(item => item.innerText.trim());

  if (!name || selectedCourses.length === 0) {
    showNotification('Please fill in all the required fields.');
    return;
  }

  try {
    let imageUrl = null;

    if (currentInstructorId) {
      // Editing an existing instructor
      if (file) {
        imageUrl = await uploadImage(file, currentInstructorId);
      }

      await updateDoc(doc(db, 'instructors', currentInstructorId), {
        name: name,
        courses: selectedCourses,
        instructor_traits: personalTraits,
        ...(imageUrl && { imageUrl: imageUrl })
      });

      showNotification('Instructor updated successfully.');

    } else {
      // Adding a new instructor
      const docRef = await addDoc(collection(db, 'instructors'), {
        name: name,
        courses: selectedCourses,
        instructor_traits: personalTraits,
        active: false,
        imageUrl: ''
      });

      imageUrl = await uploadImage(file, docRef.id);

      await updateDoc(doc(db, 'instructors', docRef.id), {
        imageUrl: imageUrl
      });

      showNotification('Instructor added successfully.');
    }

    instructorModal.hide();
    fetchInstructors();
    resetForm();
  } catch (error) {
    console.error('Error saving instructor:', error);
    showNotification('An error occurred while saving the instructor. Please try again.');
  }
}

// Add event listener to the Add Trait button
document.querySelector('.add-trait').addEventListener('click', function (event) {
  event.preventDefault();
  const traitInput = document.querySelector('.traits-input');
  let traitValue = traitInput.value.trim();

  if (traitValue) {
    // Capitalize the first letter of the trait and ensure rest are lowercase
    traitValue = traitValue.charAt(0).toUpperCase() + traitValue.slice(1).toLowerCase();

    const traitItem = document.createElement('div');
    traitItem.classList.add('trait-item');
    traitItem.innerText = traitValue;

    // Optionally add a delete button for each trait
    const deleteButton = document.createElement('i');
    deleteButton.classList.add('remove-trait');
    deleteButton.innerHTML = '<i class="bi bi-x"></i>';

    // Add event listener to remove the trait
    deleteButton.addEventListener('click', function() {
      traitItem.remove();
    });

    traitItem.appendChild(deleteButton);
    document.querySelector('.traits-list').appendChild(traitItem);
    traitInput.value = ''; // Clear input after adding
  }
});

// Handle file input display logic
document.getElementById('uploadIcon').addEventListener('click', () => {
  document.getElementById('editProfilePic').click();
});

document.getElementById('editProfilePic').addEventListener('change', function () {
  const reader = new FileReader();
  reader.onload = function (e) {
    document.getElementById('profilePicPreview').src = e.target.result;
  };
  reader.readAsDataURL(this.files[0]);
});

// Function to reset the modal form fields
function resetForm() {
  // Clear instructor name input
  if (instructorNameInput) {
    instructorNameInput.value = '';
  }

  // Uncheck all course-related checkboxes
  document.querySelectorAll('.custom-checkbox input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false; // Uncheck all checkboxes
  });

  // Reset profile picture to default
  const profilePicPreview = document.getElementById('profilePicPreview');
  if (profilePicPreview) {
    profilePicPreview.src = 'Assets/default-profile.png'; // Reset to default profile picture
  }

  // Clear the traits list
  if (traitsList) {
    traitsList.innerHTML = ''; // Remove all previously added traits
  }

  // Reset the current instructor ID to indicate a new entry
  currentInstructorId = null;
}

// Event Listener for Add Instructor Button
addInstructorButton.addEventListener('click', () => {
  resetForm(); // Call the reset function to clear previous data
  instructorModal.show(); // Show the modal
});

// Event listener for the save button in the modal
saveInstructorBtn.removeEventListener('click', saveInstructor); // Remove previous listener
saveInstructorBtn.addEventListener('click', saveInstructor);

// Fetch instructors on page load
window.onload = fetchInstructors;

// Edit instructor
async function editInstructor(event) {
  const id = event.target.dataset.id;
  const instructor = instructors.find(instructor => instructor.id === id);
  if (instructor) {
    currentInstructorId = id; // Set the current instructor ID for editing
    
    // Set the instructor's name
    if (instructorNameInput) {
      instructorNameInput.value = instructor.name;
    }

    // Uncheck all checkboxes before setting values
    document.querySelectorAll('.custom-checkbox input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false; // Uncheck all checkboxes initially
    });

    // Check the appropriate checkboxes based on the instructor's courses array
    if (Array.isArray(instructor.courses)) {
      instructor.courses.forEach(course => {
        const checkbox = Array.from(document.querySelectorAll('.custom-checkbox')).find(label => 
          label.innerText.trim() === course.trim()
        );
        if (checkbox) {
          checkbox.querySelector('input[type="checkbox"]').checked = true; // Check the matching checkbox
        }
      });
    }

    // Set the profile picture or use the default
    const profilePicPreview = document.getElementById('profilePicPreview');
    if (profilePicPreview) {
      profilePicPreview.src = instructor.imageUrl || 'Assets/default-profile.png';
    }

    // Populate personal traits
    const traitsList = document.querySelector('.traits-list');
    if (traitsList) {
      traitsList.innerHTML = ''; // Clear existing traits

      if (Array.isArray(instructor.traits)) {
        instructor.traits.forEach(trait => {
          const traitElement = document.createElement('div');
          traitElement.classList.add('trait-item');
          traitElement.textContent = trait;

          // Optionally add a delete button for each trait
          const deleteButton = document.createElement('i');
          deleteButton.classList.add('remove-trait');
          deleteButton.innerHTML = '<i class="bi bi-x"></i>';

          // Add event listener to remove the trait
          deleteButton.addEventListener('click', function() {
            traitsList.removeChild(traitElement);
          });

          traitElement.appendChild(deleteButton);
          traitsList.appendChild(traitElement);
        });
      }
    }

    instructorModal.show();
  }
}

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
      showNotification('Instructor deleted successfully.'); // Show success notification after delete
    } catch (error) {
      console.error('Error deleting instructor:', error);
      showNotification('An error occurred while deleting the instructor. Please try again.');
    }
  }
});

function showNotification(message) {
  const notificationModalBody = document.getElementById('notificationModalBody');
  notificationModalBody.textContent = message; // Set the message content
  const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal')); // Initialize the modal
  notificationModal.show(); // Show the modal
}