import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, query, getDocs, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', () => {
  const startYear = 2024;  // Start from 2024
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - startYear + 5 }, (_, i) => startYear + i); // Years from 2024 to the current year

  // Populate the year dropdown
  const yearDropdownFilter = document.getElementById('yearDropdownFilter');
  const yearOptionsFilter = document.getElementById('yearOptionsFilter');
  const yearSelectedFilter = document.getElementById('yearSelectedFilter');

  // Populate the dropdown with year options
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

  // Function to filter students by selected year
  function filterByYear(selectedYear) {
      currentPage = 1; // Reset the current page to 1
      fetchCompletedStudents(currentPage, searchTerm, selectedYear); // Fetch students with the selected year
  }

  async function fetchCompletedStudents(page = 1, searchTerm = '', selectedYear = '') {
      const studentList = document.getElementById('student-list');
      studentList.innerHTML = ''; // Clear the list before rendering new data

      let completedStudentsQuery;

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
      } else if (selectedYear) {
          // If a year is selected, filter students by the completion date year
          const startDate = new Date(`${selectedYear}-01-01`);
          const endDate = new Date(`${selectedYear}-12-31`);
          completedStudentsQuery = query(
              collection(db, "completedStudents"),
              where("completionDate", ">=", startDate),
              where("completionDate", "<=", endDate),
              orderBy("completionDate"),
              limit(itemsPerPage)
          );
      } else {
          // No search term or year filter, just fetch the students ordered by name
          completedStudentsQuery = query(
              collection(db, "completedStudents"),
              orderBy("name"),
              limit(itemsPerPage)
          );
      }

      try {
          const querySnapshot = await getDocs(completedStudentsQuery);

          if (querySnapshot.empty) {
              studentList.innerHTML = `<tr><td colspan="10" class="text-center">No student/s found</td></tr>`;
              return;
          }

          querySnapshot.forEach(doc => {
              const studentData = doc.data();

              let formattedCompletionDate = 'N/A'; // Default value if no completion date

              if (studentData.completionDate) {
                  if (studentData.completionDate.toDate) {
                      const completionDate = studentData.completionDate.toDate();
                      formattedCompletionDate = completionDate.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                      });
                  } else if (typeof studentData.completionDate === 'string') {
                      const completionDate = new Date(studentData.completionDate);
                      formattedCompletionDate = completionDate.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                      });
                  }
              }

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
                      <td class="table-row-content">${formattedCompletionDate}</td>
                  </tr>
              `;
          });

          lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
          updatePaginationControls();

      } catch (error) {
          console.error("Error fetching completed students:", error);
      }
  }

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
              fetchCompletedStudents(currentPage, searchTerm); 
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
              fetchCompletedStudents(currentPage, searchTerm);
          }
      });

      const pageNumberDisplay = document.createElement('span');
      pageNumberDisplay.className = 'page-number';
      pageNumberDisplay.textContent = `Page ${currentPage} of ${totalPages}`;

      paginationControls.appendChild(prevButton);
      paginationControls.appendChild(pageNumberDisplay);
      paginationControls.appendChild(nextButton);
  }

  function filterStudents(searchValue) {
      searchTerm = searchValue.toLowerCase();
      currentPage = 1;
      fetchCompletedStudents(currentPage, searchTerm);
  }

  fetchCompletedStudents();

  const searchInput = document.querySelector('.search');
  searchInput.addEventListener('input', (event) => {
      const searchTerm = event.target.value.toLowerCase();
      filterStudents(searchTerm);
  });
});