import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, onSnapshot, doc, getDoc, getDocs, updateDoc, addDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
  authDomain: "authentication-d6496.firebaseapp.com",
  projectId: "authentication-d6496",
  storageBucket: "authentication-d6496.appspot.com",
  messagingSenderId: "195867894399",
  appId: "1:195867894399:web:596fb109d308aea8b6154a"
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const db = getFirestore(app);
const auth = getAuth(app);

// Variables for student data
let studentsData = [];
let allStudentsData = []; // Store all student data here for year calculation
let filteredStudentsData = [];
let currentMonth = new Date().toLocaleString('default', { month: 'long' });
let currentYear = new Date().getFullYear(); // Get the current year
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;
let popularPackage = ''; // To store the most popular package

// Show the loader
function showLoader() {
  document.getElementById('loader1').style.display = 'flex'; // Display the loader
}

// Hide the loader
function hideLoader() {
  document.getElementById('loader1').style.display = 'none'; // Hide the loader
}

// Object to store filtered data for each month and year
let monthYearData = {};

function formatDateToMDY(dateString) {
  const date = new Date(dateString);
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Auto-detect current month and year and set them in the dropdowns
document.addEventListener('DOMContentLoaded', () => {
  const currentMonthDisplay = document.getElementById('currentMonthDisplay');
  currentMonthDisplay.textContent = `${currentMonth} ${currentYear}`;

  updateFilterDateDropdowns();

  const monthDropdown = document.getElementById('monthDropdown');
  const yearDropdownInfo = document.getElementById('yearDropdownInfo');
  const yearDropdownFilter = document.getElementById('yearDropdownFilter');
  const yearOptionsInfo = document.getElementById('yearOptionsInfo');
  const yearOptionsFilter = document.getElementById('yearOptionsFilter');

  // Populate year options dynamically
  for (let i = 2024; i <= currentYear + 5; i++) {
    const yearOptionInfo = document.createElement('li');
    yearOptionInfo.classList.add('option');
    yearOptionInfo.setAttribute('data-value', i);
    yearOptionInfo.textContent = i;
    yearOptionsInfo.appendChild(yearOptionInfo);

    const yearOptionFilter = document.createElement('li');
    yearOptionFilter.classList.add('option');
    yearOptionFilter.setAttribute('data-value', i);
    yearOptionFilter.textContent = i;
    yearOptionsFilter.appendChild(yearOptionFilter);
  }

  const closeAllDropdowns = () => {
    monthDropdown.classList.remove('open');
    yearDropdownInfo.classList.remove('open');
    yearDropdownFilter.classList.remove('open');
  };

  // Custom dropdown functionality for Year Selector in Total Sales
  yearDropdownInfo.addEventListener('click', function (e) {
    e.stopPropagation();
    if (yearDropdownInfo.classList.contains('open')) {
      yearDropdownInfo.classList.remove('open');
    } else {
      closeAllDropdowns();
      yearDropdownInfo.classList.add('open');
    }
  });

  // Custom dropdown functionality for Month Selector
  monthDropdown.addEventListener('click', function (e) {
    e.stopPropagation();
    if (monthDropdown.classList.contains('open')) {
      monthDropdown.classList.remove('open');
    } else {
      closeAllDropdowns();
      monthDropdown.classList.add('open');
    }
  });

  // Custom dropdown functionality for Year Selector in Filter Date
  yearDropdownFilter.addEventListener('click', function (e) {
    e.stopPropagation();
    if (yearDropdownFilter.classList.contains('open')) {
      yearDropdownFilter.classList.remove('open');
    } else {
      closeAllDropdowns();
      yearDropdownFilter.classList.add('open');
    }
  });

  // Close Year Dropdown on selecting an option and update the selected value (Total Sales)
  document.querySelectorAll('#yearOptionsInfo .option').forEach(option => {
    option.addEventListener('click', function (e) {
      const selectedOption = e.currentTarget;
      const dropdown = selectedOption.closest('.custom-dropdown');
      dropdown.querySelector('.selected').textContent = selectedOption.textContent;
      dropdown.classList.remove('open');
      e.stopPropagation();

      currentYear = selectedOption.getAttribute('data-value');
      updateTotalSalesForYear(currentYear);
    });
  });

  // Add event listener for month selection
  document.querySelectorAll('#monthOptions .option').forEach(option => {
    option.addEventListener('click', function (e) {
      const selectedOption = e.currentTarget;
      const dropdown = selectedOption.closest('.custom-dropdown');
      dropdown.querySelector('.selected').textContent = selectedOption.textContent;
      dropdown.classList.remove('open');
      e.stopPropagation();
      
      currentMonth = selectedOption.getAttribute('data-value');
      document.getElementById('currentMonthDisplay').textContent = `${currentMonth} ${currentYear}`;
      filterStudents();
    });
  });

  // Close Year Dropdown on selecting an option and update the selected value (Filter Date)
  document.querySelectorAll('#yearOptionsFilter .option').forEach(option => {
    option.addEventListener('click', function (e) {
      const selectedOption = e.currentTarget;
      const dropdown = selectedOption.closest('.custom-dropdown');
      dropdown.querySelector('.selected').textContent = selectedOption.textContent;
      dropdown.classList.remove('open');
      e.stopPropagation();

      currentYear = selectedOption.getAttribute('data-value');
      document.getElementById('currentMonthDisplay').textContent = `${currentMonth} ${currentYear}`;
      filterStudents();
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', function (event) {
    if (!monthDropdown.contains(event.target) && !yearDropdownInfo.contains(event.target) && !yearDropdownFilter.contains(event.target)) {
      closeAllDropdowns();
    }
  });

  fetchStudentData();
  updateTotalSalesForYear(currentYear);
});

async function fetchStudentData() {
  try {
      showLoader(); // Show loader before starting to fetch data

      const studentsMap = new Map();

      // Real-time listener for applicants collection
      const unsubscribeApplicants = onSnapshot(collection(db, "applicants"), async (applicantsSnapshot) => {
          studentsMap.clear(); // Clear the studentsMap to avoid duplicates

          // Fetch appointments data to check for active bookings
          const appointmentsSnapshot = await getDocs(collection(db, "appointments"));
          appointmentsSnapshot.forEach(appointmentDoc => {
              const appointmentData = appointmentDoc.data();
              const bookings = appointmentData.bookings || [];

              bookings.forEach(booking => {
                  const userId = booking.userId;

                  // Only add students with active bookings
                  const applicantDoc = applicantsSnapshot.docs.find(doc => doc.id === userId);
                  if (applicantDoc) {
                      const applicantData = applicantDoc.data();
                      if (applicantData.role === "student") {
                          studentsMap.set(userId, { ...applicantData, userId, activeBooking: booking });
                      }
                  }
              });
          });

          // Further validate with completed status if the student has no active booking
          applicantsSnapshot.forEach(applicantDoc => {
              const applicantData = applicantDoc.data();
              const userId = applicantDoc.id;

              if (!studentsMap.has(userId) && applicantData.role === "student") {
                  if (applicantData.TDCStatus === "Completed" ||
                      applicantData["PDC-4WheelsStatus"] === "Completed" ||
                      applicantData["PDC-MotorsStatus"] === "Completed") {
                      studentsMap.set(userId, { ...applicantData, userId });
                  }
              }
          });

          // Fetch sales data and integrate with applicants data
          const salesSnapshot = await getDocs(collection(db, "sales"));
          salesSnapshot.forEach(saleDoc => {
              const saleData = saleDoc.data();
              const userId = saleDoc.id; // Assume sales are saved with userId as the document ID

              if (studentsMap.has(userId)) {
                  const student = studentsMap.get(userId);
                  student.paymentDate = saleData.paymentDate;
                  student.amountPaid = saleData.amountPaid;
                  student.paymentStatus = saleData.paymentStatus;
                  studentsMap.set(userId, student);
              }
          });

          allStudentsData = Array.from(studentsMap.values()); // Save all data for year calculation
          studentsData = [...allStudentsData]; // Also set this for filtering
          storeMonthYearData(); // Store the data for the current month and year
          filterStudents(); // Filter students based on current month and year selection
          totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);
          calculatePopularPackage(); // Calculate the most popular package
          renderStudents(); // Render the sales table

          updatePaginationControls();
          updateTotalSalesForYear(currentYear);
          updatePackageData();

          hideLoader(); // Hide loader once data is fully rendered
      });

      return { unsubscribeApplicants };
  } catch (error) {
      console.error("Error fetching student data: ", error);
      hideLoader(); // Hide the loader in case of an error
  }
}

// Store filtered data for the current month and year
function storeMonthYearData() {
  const key = `${currentMonth}-${currentYear}`;
  monthYearData[key] = studentsData;
}

function renderStudents() {
  const studentList = document.querySelector('.sales-list');
  if (!studentList) {
      console.error("Student list element not found.");
      return;
  }

  studentList.innerHTML = '';

  if (filteredStudentsData.length === 0) {
      studentList.innerHTML = '<tr><td colspan="7">No students found for the selected criteria.</td></tr>';
      hideLoader(); // Hide the loader after rendering the message
      return;
  }

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedStudents = filteredStudentsData.slice(start, end);

  paginatedStudents.forEach((student, index) => {
      const personalInfo = student.personalInfo || { first: "N/A", last: "" };
      const packageName = student.packageName || "N/A";
      const packagePrice = student.packagePrice || "N/A";
      const formattedPaymentDate = student.paymentDate ? formatDateToMDY(student.paymentDate) : 'N/A';
      const amountPaid = student.amountPaid ? `&#8369; ${student.amountPaid}` : 'N/A';
      const paymentStatus = student.paymentStatus || 'Not Paid';

      const studentHtml = `
          <tr class="table-row">
              <td class="table-row-content">${personalInfo.first} ${personalInfo.last}</td>
              <td class="table-row-content">${packageName}</td>
              <td class="table-row-content">&#8369; ${packagePrice}</td>
              <td class="table-row-content">${paymentStatus}</td>
              <td class="table-row-content">${formattedPaymentDate}</td>
              <td class="table-row-content">${amountPaid}</td>
              <td class="table-row-content">
                  <i class="bi bi-pencil-square edit-icon" data-index="${index}"></i>
              </td>
          </tr>`;
      studentList.insertAdjacentHTML('beforeend', studentHtml);
  });

  hideLoader(); // Hide the loader after the table has been rendered

  // Attach event listener to the parent element and delegate clicks to the edit-icon
  studentList.addEventListener('click', function (e) {
      if (e.target && e.target.matches('.edit-icon')) {
          const studentIndex = e.target.getAttribute('data-index');
          openEditModal(studentIndex); // Open the modal with the correct student index
      }
  });
}

document.querySelector('.edit-sales-amount').addEventListener('input', function(event) {
  this.value = this.value.replace(/[^0-9.]/g, ''); // Allow only numbers and decimal point
});

async function openEditModal(studentIndex) {
  // Clear input fields before opening the modal
  document.querySelector('.edit-sales-name').value = '';
  document.querySelector('.edit-sales-package').value = '';
  document.querySelector('.edit-sales-package-price').value = '';
  document.querySelector('.edit-sales-date').value = '';
  document.querySelector('.edit-sales-amount').value = '';
  
  // Clear validation error message
  document.getElementById('amountPaidError').textContent = '';

  const selectedStudent = filteredStudentsData[studentIndex];
  
  let existingSalesDocId = null;
  const salesQuery = collection(db, "sales");
  const salesSnapshot = await getDocs(salesQuery);

  salesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name === selectedStudent.personalInfo.first && data.packageName === selectedStudent.packageName) {
          existingSalesDocId = doc.id;
          document.querySelector('.edit-sales-date').value = data.paymentDate || '';
          document.querySelector('.edit-sales-amount').value = data.amountPaid || '';
      }
  });

  document.querySelector('.edit-sales-name').value = selectedStudent.personalInfo.first || '';
  document.querySelector('.edit-sales-package').value = selectedStudent.packageName || '';
  document.querySelector('.edit-sales-package-price').value = selectedStudent.packagePrice || '';

  $('#editSalesModal').modal('show');

  document.querySelector('.update-sales').onclick = async (event) => {
      event.preventDefault();
      await saveSalesData(studentIndex, existingSalesDocId);
  };
}

document.querySelector('.edit-sales-amount').addEventListener('input', function() {
  const amountPaidInput = document.querySelector('.edit-sales-amount');
  const amountPaid = parseInt(amountPaidInput.value, 10);
  const amountPaidErrorElement = document.getElementById('amountPaidError');

  if (!isNaN(amountPaid) && amountPaid > 0) {
    amountPaidErrorElement.textContent = ""; // Clear validation message if the input is valid
  }
});

async function saveSalesData(studentIndex, existingSalesDocId = null) {
  const selectedStudent = filteredStudentsData[studentIndex];

  const userId = selectedStudent.userId;
  if (!userId) {
      console.error("User ID is undefined or missing for the selected student.");
      return;
  }

  const amountPaidInput = document.querySelector('.edit-sales-amount');
  const amountPaid = parseFloat(amountPaidInput.value); // Convert input to number
  const packagePrice = parseFloat(selectedStudent.packagePrice);

  const amountPaidErrorElement = document.getElementById('amountPaidError');

  // Allow null values (empty input field)
  if (amountPaidInput.value === '') {
      // Clear validation error and allow save
      amountPaidErrorElement.textContent = ""; 
  } else {
      // Ensure that the amountPaid is a valid number
      if (isNaN(amountPaid) || amountPaid <= 0) {
          amountPaidErrorElement.textContent = "Please enter a valid amount greater than 0.";
          return;
      }

      // Ensure that the amountPaid does not exceed the package price
      if (amountPaid > packagePrice) {
          amountPaidErrorElement.textContent = `Amount paid cannot exceed the package price (₱${packagePrice.toFixed(2)}).`;
          return;
      }

      // Ensure that the amountPaid is at least 50% of the package price
      const minAllowedAmount = packagePrice * 0.5;

      if (amountPaid < minAllowedAmount) {
          amountPaidErrorElement.textContent = `Amount paid must be at least 50% of the package price (₱${minAllowedAmount.toFixed(2)}).`;
          return;
      } else {
          amountPaidErrorElement.textContent = ""; // Clear validation message if the input is valid
      }
  }

  // Define payment status based on amountPaid
  let paymentStatus = "Not Paid";
  if (amountPaid >= packagePrice) {
      paymentStatus = "Paid";
  } else if (amountPaid >= packagePrice * 0.10) {
      paymentStatus = "Partial Payment";
  }

  const updatedData = {
      name: document.querySelector('.edit-sales-name').value,
      packageName: document.querySelector('.edit-sales-package').value,
      packagePrice: packagePrice.toString(),
      paymentDate: document.querySelector('.edit-sales-date').value,
      amountPaid: amountPaidInput.value === '' ? null : amountPaid.toString(), // Store null if the field is empty
      paymentStatus: paymentStatus,
  };

  try {
      if (existingSalesDocId) {
          const salesDocRef = doc(db, "sales", existingSalesDocId);
          await updateDoc(salesDocRef, updatedData);
          console.log('Sales data successfully updated.');
      } else {
          const salesDocRef = doc(db, "sales", userId);
          await setDoc(salesDocRef, updatedData);
          console.log('Sales data successfully saved.');
      }
  } catch (error) {
      console.error("Error saving sales data: ", error);
  }

  $('#editSalesModal').modal('hide');

  await fetchStudentData();
  renderStudents();
}

function calculatePopularPackage() {
  const packageCounts = {};

  filteredStudentsData.forEach(student => {
    const packageName = student.packageName || 'Unknown Package';
    if (packageCounts[packageName]) {
      packageCounts[packageName]++;
    } else {
      packageCounts[packageName] = 1;
    }
  });

  if (Object.keys(packageCounts).length === 0) {
    console.error('No packages found.');
    return;
  }

  popularPackage = Object.keys(packageCounts).reduce((a, b) => packageCounts[a] > packageCounts[b] ? a : b);
}

function updatePaginationControls() {
  const paginationControls = document.querySelector('.pagination-controls');
  if (!paginationControls) {
    console.error("Pagination controls element not found.");
    return;
  }

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
      renderStudents();
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
      renderStudents();
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

onAuthStateChanged(auth, (user) => {
  if (user) {
    fetchStudentData();
  } else {
    console.error("No user is currently signed in.");
  }
});

function filterStudents(searchTerm = '') {
  // Filter students based on current month and year selection
  filteredStudentsData = studentsData.filter(student => {
    const fullName = `${student.personalInfo?.first || ''} ${student.personalInfo?.last || ''}`.toLowerCase();

    if (student.paymentDate) {
      const paymentDate = new Date(student.paymentDate);
      const paymentMonth = paymentDate.toLocaleString('default', { month: 'long' });
      const paymentYear = paymentDate.getFullYear();

      return (
        fullName.startsWith(searchTerm.toLowerCase()) &&
        paymentMonth === currentMonth &&
        paymentYear == currentYear
      );
    } else {
      return fullName.startsWith(searchTerm.toLowerCase());
    }
  });

  currentPage = 1;
  totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);

  renderStudents();
  updatePaginationControls();
  calculatePopularPackage();
  updateSplineChartWithSalesData();

  // Update the dropdown to reflect the current month and year being displayed
  updateFilterDateDropdowns();
}

function updateFilterDateDropdowns() {
  // Update month dropdown to reflect the current selected month
  const monthDropdownSelected = document.querySelector('#monthDropdown .selected');
  if (monthDropdownSelected) {
    monthDropdownSelected.textContent = currentMonth;
  }

  // Update year dropdown (both filter and info) to reflect the current selected year
  const yearDropdownInfoSelected = document.querySelector('#yearDropdownInfo .selected');
  const yearDropdownFilterSelected = document.querySelector('#yearDropdownFilter .selected');
  if (yearDropdownInfoSelected) {
    yearDropdownInfoSelected.textContent = currentYear;
  }
  if (yearDropdownFilterSelected) {
    yearDropdownFilterSelected.textContent = currentYear;
  }

  // Update the "Yearly Sales Year" dropdown to reflect the current selected year
  const yearlySalesYearDropdownSelected = document.querySelector('#yearlySalesYearDropdown .selected');
  if (yearlySalesYearDropdownSelected) {
    yearlySalesYearDropdownSelected.textContent = currentYear;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  updateTotalSalesForYear(currentYear);
});

// Update Total Sales Year based on the selected year from dropdown
document.querySelectorAll('#yearlySalesYearOptions .option').forEach(option => {
  option.addEventListener('click', function (e) {
    const selectedOption = e.currentTarget;
    const dropdown = selectedOption.closest('.custom-dropdown');
    dropdown.querySelector('.selected').textContent = selectedOption.textContent;
    dropdown.classList.remove('open');

    currentYear = selectedOption.getAttribute('data-value');
    updateTotalSalesForYear(currentYear);

    // Update dropdowns to reflect the new current year
    updateFilterDateDropdowns();
  });
});

const ctx = document.getElementById('splineChart').getContext('2d');
const splineChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Total Monthly Sales',
            data: [],
            fill: false, // This fill property was set to true in the previous example.
            backgroundColor: '#5a699d',
            borderColor: '#142A74',
            tension: 0.5,
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Month of the Year',
                    font: {
                        size: 16, // Font size for x-axis title
                        weight: 'bold' // Font weight for x-axis title
                    }
                },
                ticks: {
                    font: {
                        size: 16 // Adjust the font size of the x-axis labels
                    }
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Total Sales (PHP)',
                    font: {
                        size: 16, // Font size for y-axis title
                        weight: 'bold' // Font weight for y-axis title
                    }
                },
                ticks: {
                    font: {
                        size: 14 // Adjust the font size of the y-axis labels
                    }
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    usePointStyle: true,
                    pointStyle: 'rectRounded',
                    font: {
                        size: 14 // Font size for legend labels
                    }
                }
            }
        }
    }
});

function updateSplineChartWithSalesData() {
    // Reset the chart data
    splineChart.data.labels = [];
    splineChart.data.datasets[0].data = [];

    // Create an object to store sales by month
    const salesByMonth = {};

    // Aggregate sales data by month
    studentsData.forEach(student => {
        if (student.paymentDate) {
            const date = new Date(student.paymentDate);
            const month = date.toLocaleString('default', { month: 'long' });
            const year = date.getFullYear();
            const key = `${month} ${year}`;

            if (!salesByMonth[key]) {
                salesByMonth[key] = 0;
            }

            // Add the amount paid to the sales for that month
            salesByMonth[key] += parseFloat(student.amountPaid) || 0;
        }
    });

    // Sort the months in chronological order
    const sortedMonths = Object.keys(salesByMonth).sort((a, b) => {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        const dateA = new Date(`${monthA} 1, ${yearA}`);
        const dateB = new Date(`${monthB} 1, ${yearB}`);
        return dateA - dateB;
    });

    // Update the chart with the sorted monthly data
    sortedMonths.forEach(month => {
        splineChart.data.labels.push(month);
        splineChart.data.datasets[0].data.push(salesByMonth[month]);
    });

    splineChart.update();
}

function updateTotalSalesForYear(selectedYear) {
    // Filter data for the selected year
    const filteredYearData = allStudentsData.filter(student => {
        const paymentYear = new Date(student.paymentDate).getFullYear();
        return paymentYear === parseInt(selectedYear);
    });

    const yearlySalesAmountElement = document.getElementById('yearlySalesAmount');
    const splineChartElement = document.getElementById('splineChart');

    // If there's no data for the selected year, hide the chart and clear the sales amount
    if (filteredYearData.length === 0) {
        yearlySalesAmountElement.textContent = '₱0.00';
        splineChartElement.style.display = 'none';
    } else {
        // Otherwise, calculate the total sales and show the chart
        const totalSales = filteredYearData.reduce((sum, student) => sum + parseFloat(student.amountPaid || 0), 0);
        yearlySalesAmountElement.textContent = `₱${totalSales.toFixed(2)}`;
        splineChartElement.style.display = 'block';
    }
}

// Custom Year Selector Event Listener
document.querySelectorAll('#yearOptions .option').forEach(option => {
  option.addEventListener('click', function (e) {
      const selectedOption = e.currentTarget;
      const dropdown = selectedOption.closest('.custom-dropdown');
      dropdown.querySelector('.selected').textContent = selectedOption.textContent;
      dropdown.classList.remove('open');

      currentYear = selectedOption.getAttribute('data-value');
      updateTotalSalesForYear(currentYear);
  });
});

document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggleSalesInfo');
  const salesInfoContainer = document.getElementById('salesInfoContainer');

  // Initially hide the sales-info-container
  salesInfoContainer.style.display = 'none';

  toggleButton.addEventListener('click', function() {
      if (salesInfoContainer.style.display === 'none' || !salesInfoContainer.classList.contains('show')) {
          salesInfoContainer.style.display = 'flex'; // Ensure it’s visible before transitioning
          requestAnimationFrame(() => { // Ensure the display change is applied before adding the class
              salesInfoContainer.classList.add('show');
          });
          toggleButton.textContent = 'Hide';
      } else {
          salesInfoContainer.classList.remove('show');
          setTimeout(() => salesInfoContainer.style.display = 'none', 800); // Hide after transition
          toggleButton.textContent = 'Overview';
      }
  });
});

document.addEventListener('DOMContentLoaded', function() {
    // Ensure the function is called after data is fully loaded
    setTimeout(updatePackageData, 1000); // Adjust the timeout as needed based on when your data gets populated
});

function updatePackageData() {
    const packageData = [];
    console.log("All Students Data:", allStudentsData);

    // Iterate over all students data instead of just the current page
    allStudentsData.forEach(student => {
        console.log("Student:", student); // Add this line to see each student's data
        const packageName = student.packageName || 'Unknown Package';
        let count = 1; // Each student represents one package availed

        let found = packageData.find(p => p.packageName === packageName);
        if (found) {
            found.count += count;
        } else {
            packageData.push({ packageName, count });
        }
    });

    // Check data integrity in the console
    console.log("Package Data for Chart:", packageData);

    // Proceed to render the chart
    renderPackageBarChart(packageData);
}

function renderPackageBarChart(packageData) {
    const labels = packageData.map(item => item.packageName);
    const data = packageData.map(item => item.count);

    console.log("Labels for Chart:", labels); // Log labels
    console.log("Data for Chart:", data); // Log data

    const ctx = document.getElementById('packageBarChart').getContext('2d');
    if(window.packageBarChartInstance) {
        window.packageBarChartInstance.destroy(); // Destroy previous instance if exists
    }
    window.packageBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Students per Package',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                barThickness: 100, // Customize the thickness of bars
                borderRadius: 3, // Rounded corners on bars
            }]
        },
        options: {
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Number of Students',
                        font: {
                            size: 16, // Font size for y-axis title
                            weight: 'bold' // Font weight for y-axis title
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Package Name',
                        font: {
                            size: 16, // Font size for x-axis title
                            weight: 'bold' // Font weight for x-axis title
                        }
                    },
                    ticks: {
                        font: {
                            size: 16 // Adjust the font size of the package names
                        }
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        font: {
                            size: 14 // Font size for legend labels
                        }
                    }
                }
            }
        }
    });     
}