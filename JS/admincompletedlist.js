import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Firebase configuration
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

let studentsData = [];  // Global array to hold fetched student data
let filteredStudentsData = [];  // Array to hold filtered student data
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
  fetchCompletedStudents();  // Fetch all students from Firestore
  setupYearDropdown();  // Setup year filtering
  setupSearch();  // Setup search functionality
});

// Fetch all students from Firestore once
async function fetchCompletedStudents() {
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = ''; // Clear list before rendering new data

  try {
    const querySnapshot = await getDocs(query(collection(db, "completedStudents"), orderBy("name")));
    studentsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // After fetching, render the students and set up pagination
    renderStudents();
    updatePaginationControls();
  } catch (error) {
    console.error("Error fetching completed students:", error);
  }
}
function setupYearDropdown() {
    const startYear = 2024;  // Start from 2024
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - startYear + 5 }, (_, i) => startYear + i); // Years from 2024 to the current year

    // Populate the year dropdown
    const yearDropdownFilter = document.getElementById('yearDropdownFilter');
    const yearOptionsFilter = document.getElementById('yearOptionsFilter');
    const yearSelectedFilter = document.getElementById('yearSelectedFilter');

    years.forEach(year => {
        const li = document.createElement('li');
        li.className = 'option'; // Add "option" class for styling
        li.textContent = year;
        li.addEventListener('click', () => {
            yearSelectedFilter.textContent = year; // Update selected text
            filterByYear(year); // Call the filtering function
            yearDropdownFilter.classList.remove('open'); // Hide the dropdown after selection
        });
        yearOptionsFilter.appendChild(li);
    });

    // Toggle dropdown visibility on click
    yearSelectedFilter.addEventListener('click', () => {
        yearDropdownFilter.classList.toggle('open'); // Toggle the "open" class
    });

    // Close the dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (!yearDropdownFilter.contains(event.target)) {
            yearDropdownFilter.classList.remove('open'); // Close dropdown when clicked outside
        }
    });
}

// Function to filter students based on the search input
function filterStudents(searchTerm) {
  filteredStudentsData = studentsData.filter(student => {
    const fullName = `${student.name || ''}`.toLowerCase();  // Adjust based on your Firestore structure
    return fullName.startsWith(searchTerm);
  });

  currentPage = 1;
  totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);

  if (filteredStudentsData.length === 0) {
    document.getElementById('student-list').innerHTML = `
      <tr>
        <td colspan="10" class="text-center">No student/s found</td>
      </tr>
    `;
  } else {
    renderStudents();  // Render the filtered students
    updatePaginationControls();  // Update the pagination controls
  }
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.querySelector('.search');
  searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    filterStudents(searchTerm);
  });
}

// Render students on the page
function renderStudents() {
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = ''; // Clear previous data

  // Use either the filtered data or all students if no search term is applied
  const studentsToRender = filteredStudentsData.length > 0 ? filteredStudentsData : studentsData;

  // Render students according to the current page
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const studentsOnPage = studentsToRender.slice(start, end);

  studentsOnPage.forEach(student => {
    const formattedCompletionDate = formatCompletionDate(student.completionDate); // Format date as necessary

    studentList.innerHTML += `
      <tr class="table-row">
        <td class="table-row-content">${student.name}</td>
        <td class="table-row-content">${student.email || 'N/A'}</td>
        <td class="table-row-content">${student.phoneNumber || 'N/A'}</td>
        <td class="table-row-content">${student.packageName || 'N/A'}</td>
        <td class="table-row-content package-price">${student.packagePrice || 'N/A'}</td>
        <td class="table-row-content">
          <input type="checkbox" ${student.courses.TDC === 'Completed' ? 'checked' : ''} disabled>
        </td>
        <td class="table-row-content">
          <input type="checkbox" ${student.courses["PDC-4Wheels"] === 'Completed' ? 'checked' : ''} disabled>
        </td>
        <td class="table-row-content">
          <input type="checkbox" ${student.courses["PDC-Motors"] === 'Completed' ? 'checked' : ''} disabled>
        </td>
        <td class="table-row-content">${student.certificateControlNumber || 'N/A'}</td>
        <td class="table-row-content">${formattedCompletionDate}</td>
      </tr>
    `;
  });
}
function filterByYear(selectedYear) {
    // Reset the current page to 1 when filtering
    currentPage = 1;
  
    // Filter the studentsData array by the selected year
    filteredStudentsData = studentsData.filter(student => {
      const completionDate = student.completionDate ? new Date(student.completionDate) : null;
      return completionDate && completionDate.getFullYear() === selectedYear;
    });
  
    totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);
  
    if (filteredStudentsData.length === 0) {
      document.getElementById('student-list').innerHTML = `
        <tr>
          <td colspan="10" class="text-center">No student/s found</td>
        </tr>
      `;
    } else {
      renderStudents();  // Re-render the filtered students
      updatePaginationControls();  // Update pagination controls
    }
  }
// Update pagination controls
function updatePaginationControls() {
  const paginationControls = document.querySelector('.pagination-controls');
  paginationControls.innerHTML = '';

  const prevButton = document.createElement('i');
  prevButton.className = 'bi bi-caret-left';
  if (currentPage === 1) {
    prevButton.classList.add('disabled');
    prevButton.style.opacity = '0.5';
  }
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderStudents();  // Re-render students on the previous page
      updatePaginationControls();
    }
  });

  const nextButton = document.createElement('i');
  nextButton.className = 'bi bi-caret-right';
  if (currentPage === totalPages) {
    nextButton.classList.add('disabled');
    nextButton.style.opacity = '0.5';
  }
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderStudents();  // Re-render students on the next page
      updatePaginationControls();
    }
  });

  const pageNumberDisplay = document.createElement('span');
  pageNumberDisplay.className = 'page-number';
  pageNumberDisplay.textContent = `Page ${currentPage} of ${totalPages}`;

  paginationControls.appendChild(prevButton);
  paginationControls.appendChild(pageNumberDisplay);
  paginationControls.appendChild(nextButton);
}

// Format the completion date for display
function formatCompletionDate(completionDate) {
  if (!completionDate) return 'N/A';

  if (completionDate.toDate) {
    return completionDate.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const date = new Date(completionDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
