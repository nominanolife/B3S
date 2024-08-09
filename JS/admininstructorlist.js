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

let instructors = []; // Store all instructors data

// Fetch and display instructors
async function fetchInstructors() {
  const querySnapshot = await getDocs(collection(db, 'instructors'));
  instructors = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderInstructors(instructors);
}

// Render instructors in the table
function renderInstructors(instructors) {
  instructorList.innerHTML = '';
  instructors.forEach(instructor => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${instructor.name}</td>
      <td>${instructor.course}</td>
      <td>
        <div class="dropdown">
          <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <i class="bi bi-three-dots-vertical"></i>
          </button>
          <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
            <a class="dropdown-item edit-instructor" href="#" data-id="${instructor.id}">Edit</a>
            <a class="dropdown-item delete-instructor" href="#" data-id="${instructor.id}">Delete</a>
          </div>
        </div>
      </td>
    `;
    instructorList.appendChild(row);
  });
}

// Add instructor
async function addInstructor(event) {
  event.preventDefault();
  const name = instructorNameInput.value.trim();
  const course = instructorCourseInput.value.trim();

  if (!name || !course) {
    alert('Please fill in both fields.');
    return;
  }

  try {
    await addDoc(collection(db, 'instructors'), { name, course });
    fetchInstructors(); // Refresh the list
    instructorModal.hide();
  } catch (error) {
    console.error('Error adding instructor:', error);
  }
}

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

// Delete instructor
async function deleteInstructor(event) {
  const id = event.target.dataset.id;
  try {
    await deleteDoc(doc(db, 'instructors', id));
    fetchInstructors(); // Refresh the list
  } catch (error) {
    console.error('Error deleting instructor:', error);
  }
}

// Search instructors by name
function searchInstructors(event) {
  const query = event.target.value.toLowerCase();
  const filteredInstructors = instructors.filter(instructor =>
    instructor.name.toLowerCase().startsWith(query)
  );
  renderInstructors(filteredInstructors);
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
  if (event.target.classList.contains('edit-instructor')) {
    editInstructor(event);
  }
  if (event.target.classList.contains('delete-instructor')) {
    deleteInstructor(event);
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
});

// Initial fetch
fetchInstructors();
