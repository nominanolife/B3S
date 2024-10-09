import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, query, getDocs, orderBy, limit, startAfter } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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

let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;
let lastVisibleDoc = null;
let searchTerm = ''; // Initialize search term for filtering

async function fetchCompletedStudents(page = 1, searchTerm = '') {
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = ''; // Clear the list before rendering new data

  let completedStudentsQuery;

  // Debugging: Log the search term to verify input
  console.log("Search Term:", searchTerm);

  if (searchTerm) {
    // If there's a search term, use where() to search by name (case-insensitive search)
    const searchTermLower = searchTerm.toLowerCase(); // Convert to lowercase for case-insensitive match

    completedStudentsQuery = query(
      collection(db, "completedStudents"),
      where("name", ">=", searchTermLower),
      where("name", "<=", searchTermLower + "\uf8ff"), // Handle partial search (prefix)
      orderBy("name"),
      limit(itemsPerPage)
    );
  } else {
    // No search term, just order by name and limit results
    completedStudentsQuery = query(
      collection(db, "completedStudents"),
      orderBy("name"),
      limit(itemsPerPage)
    );
  }

  try {
    const querySnapshot = await getDocs(completedStudentsQuery);

    if (querySnapshot.empty) {
      studentList.innerHTML = `<tr><td colspan="10" class="text-center">No students found</td></tr>`;
      return;
    }

    querySnapshot.forEach(doc => {
      const studentData = doc.data();
      studentList.innerHTML += `
          <tr class="table-row">
              <td class="table-row-content">${studentData.name}</td>
              <td class="table-row-content">${studentData.email}</td>
              <td class="table-row-content">${studentData.phoneNumber || 'N/A'}</td>
              <td class="table-row-content">${studentData.packageName || 'N/A'}</td>
              <td class="table-row-content package-price">${studentData.packagePrice || 'N/A'}</td>
              <td class="table-row-content">
                  <label class="status-label">
                      <input type="checkbox" class="status-toggle" ${studentData.courses.TDC === 'Completed' ? 'checked' : ''}
                             data-user-id="${doc.id}" data-column="TDC">
                  </label>
              </td>
              <td class="table-row-content">
                  <label class="status-label">
                      <input type="checkbox" class="status-toggle" ${studentData.courses["PDC-4Wheels"] === 'Completed' ? 'checked' : ''}
                             data-user-id="${doc.id}" data-column="PDC-4Wheels">
                  </label>
              </td>
              <td class="table-row-content">
                  <label class="status-label">
                      <input type="checkbox" class="status-toggle" ${studentData.courses["PDC-Motors"] === 'Completed' ? 'checked' : ''}
                             data-user-id="${doc.id}" data-column="PDC-Motors">
                  </label>
              </td>
              <td class="table-row-content">${studentData.certificateControlNumber || 'N/A'}</td>
              <td class="table-row-content">${studentData.completionDate || 'N/A'}</td> <!-- Add completion date column -->
          </tr>
      `;
    });

    // Store the last visible document for pagination purposes
    lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    // Call the pagination controls setup
    updatePaginationControls();

  } catch (error) {
    console.error("Error fetching completed students:", error);
  }
}

// Pagination control update function
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
            fetchCompletedStudents(currentPage, searchTerm); // Call with the current search term
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
            fetchCompletedStudents(currentPage, searchTerm); // Call with the current search term
        }
    });

    const pageNumberDisplay = document.createElement('span');
    pageNumberDisplay.className = 'page-number';
    pageNumberDisplay.textContent = `Page ${currentPage} of ${totalPages}`;

    paginationControls.appendChild(prevButton);
    paginationControls.appendChild(pageNumberDisplay);
    paginationControls.appendChild(nextButton);
}

// Search function to filter students based on search term
function filterStudents(searchValue) {
  searchTerm = searchValue.toLowerCase(); // Convert input to lowercase for comparison
  currentPage = 1; // Reset the current page to 1 when searching
  fetchCompletedStudents(currentPage, searchTerm); // Fetch students starting from page 1 with the new search term
}

// Call fetchCompletedStudents when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchCompletedStudents();

    // Set up search input listener
    const searchInput = document.querySelector('.search');
    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        filterStudents(searchTerm);
    });
});
