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
let popularPackageCount = 0; // To store the count of the most popular package

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
    currentMonthDisplay.textContent = currentMonth;

    const monthSelector = document.getElementById('monthSelector');
    const yearSelector = document.getElementById('yearSelector');
    const yearFilter = document.getElementById('yearFilter');
    const yearlySalesYear = document.getElementById('yearlySalesYear');

    // Populate the year selector with a range of years
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelector.appendChild(option);
        yearFilter.appendChild(option.cloneNode(true));  // Populate yearFilter as well
    }

    yearSelector.value = currentYear;
    yearFilter.value = currentYear;

    // Set the current year in the yearly sales display
    yearlySalesYear.textContent = currentYear;

    // Set current month as selected
    for (let i = 0; i < monthSelector.options.length; i++) {
        if (monthSelector.options[i].value === currentMonth) {
            monthSelector.selectedIndex = i;
            break;
        }
    }

    // Event listeners for month and year change
    monthSelector.addEventListener('change', (event) => {
        currentMonth = event.target.value;
        document.getElementById('currentMonthDisplay').textContent = currentMonth; // Update the displayed month
        filterStudents(); // Re-filter students based on current month and year selection
    });

    yearSelector.addEventListener('change', (event) => {
        currentYear = event.target.value;
        filterStudents(); // Re-filter students based on current month and year selection
    });

    yearFilter.addEventListener('change', (event) => {
        const selectedYear = event.target.value;
        yearlySalesYear.textContent = selectedYear;  // Update the yearly sales year
        updateTotalSalesForYear(selectedYear);  // Update total sales based on selected year
    });

    fetchStudentData();
    updateTotalSalesForYear(currentYear);  // Initial load of total sales for the current year
});


async function fetchStudentData() {
    try {
        const studentsMap = new Map();

        // Real-time listener for applicants collection
        const unsubscribeApplicants = onSnapshot(collection(db, "applicants"), async (applicantsSnapshot) => {
            applicantsSnapshot.forEach(applicantDoc => {
                const applicantData = applicantDoc.data();
                const userId = applicantDoc.id; // Get the document ID (userId)

                // Check if the user has the role "student"
                if (applicantData.role === "student") {
                    // Check if the student has completed any of the courses
                    if (applicantData.TDCStatus === "Completed" || 
                        applicantData["PDC-4WheelsStatus"] === "Completed" || 
                        applicantData["PDC-MotorsStatus"] === "Completed") {

                        // Store student data in the map using the userId as the key
                        studentsMap.set(userId, { ...applicantData, userId }); // Include userId in the student data
                    }
                }
            });

            // Fetch the sales data and integrate with applicants data
            const salesSnapshot = await getDocs(collection(db, "sales"));
            salesSnapshot.forEach(saleDoc => {
                const saleData = saleDoc.data();
                const userId = saleDoc.id; // Assume sales are saved with userId as the document ID

                if (studentsMap.has(userId)) {
                    const student = studentsMap.get(userId);
                    student.paymentDate = saleData.paymentDate;
                    student.amountPaid = saleData.amountPaid;
                    student.paymentStatus = saleData.paymentStatus;
                }
            });

            // After processing all data, update the global arrays and store month and year data
            allStudentsData = Array.from(studentsMap.values()); // Save all data for year calculation
            studentsData = [...allStudentsData]; // Also set this for filtering
            storeMonthYearData(); // Store the data for the current month and year
            filterStudents(); // Filter students based on current month and year selection
            totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);
            calculatePopularPackage(); // Calculate the most popular package
            renderStudents();
            updatePaginationControls();

            // Update the sales data for the year after fetching the student data
            updateTotalSalesForYear(currentYear);
        });

        return {
            unsubscribeApplicants,
        };
    } catch (error) {
        console.error("Error fetching student data: ", error);
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

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedStudents = filteredStudentsData.slice(start, end);

    paginatedStudents.forEach((student, index) => {
        const personalInfo = student.personalInfo || {};
        const formattedPaymentDate = student.paymentDate ? formatDateToMDY(student.paymentDate) : '';
        const amountPaid = student.amountPaid ? `&#8369; ${student.amountPaid}` : ''; // Conditionally add peso sign

        const studentHtml = `
        <tr class="table-row">
            <td class="table-row-content">${personalInfo.first || ''} ${personalInfo.last || ''}</td>
            <td class="table-row-content">${student.packageName || ''}</td>
            <td class="table-row-content">&#8369; ${student.packagePrice || ''}</td> <!-- Package Price -->
            <td class="table-row-content">${student.paymentStatus || ''}</td> <!-- Payment Status -->
            <td class="table-row-content">${formattedPaymentDate}</td> <!-- Date of Payment -->
            <td class="table-row-content">${amountPaid}</td> <!-- Amount Paid -->
            <td class="table-row-content">
                <i class="bi bi-pencil-square edit-icon" data-index="${index}"></i>
            </td>
        </tr>`;
        studentList.insertAdjacentHTML('beforeend', studentHtml);
    });

    // Add event listeners to the edit icons
    const editIcons = studentList.querySelectorAll('.edit-icon');
    editIcons.forEach(icon => {
        icon.addEventListener('click', (event) => {
        const studentIndex = event.target.getAttribute('data-index');
        openEditModal(studentIndex);
        });
    });

    // Display the most popular package
    document.getElementById('popularPackage').textContent = `${popularPackage} (${popularPackageCount} students)`;
}

document.querySelector('.edit-sales-amount').addEventListener('input', function(event) {
    // Allow only numbers and decimal point
    this.value = this.value.replace(/[^0-9.]/g, '');
});

async function openEditModal(studentIndex) {
    const selectedStudent = filteredStudentsData[studentIndex];

    // Try to fetch the existing sales data for this student
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

    // Pre-fill the modal fields with the selected student's data
    document.querySelector('.edit-sales-name').value = selectedStudent.personalInfo.first || '';
    document.querySelector('.edit-sales-package').value = selectedStudent.packageName || '';
    document.querySelector('.edit-sales-package-price').value = selectedStudent.packagePrice || ''; // Package Price

    // Show the modal
    $('#editSalesModal').modal('show');

    // Attach an event listener to the "Update" button to save changes
    document.querySelector('.update-sales').onclick = async (event) => {
        event.preventDefault(); // Prevent the form from submitting in the traditional way
        await saveSalesData(studentIndex, existingSalesDocId);
    };
}

async function saveSalesData(studentIndex, existingSalesDocId = null) {
    const selectedStudent = filteredStudentsData[studentIndex];

    // Check if userId is available
    const userId = selectedStudent.userId;
    if (!userId) {
        console.error("User ID is undefined or missing for the selected student.");
        return;
    }

    // Gather the updated data from the modal
    const amountPaid = parseInt(document.querySelector('.edit-sales-amount').value, 10);
    const packagePrice = parseInt(selectedStudent.packagePrice, 10);

    // Validation: Ensure amountPaid does not exceed packagePrice
    const amountPaidErrorElement = document.getElementById('amountPaidError');
    if (amountPaid > packagePrice) {
        amountPaidErrorElement.textContent = "Amount paid cannot exceed the package price.";
        return; // Stop further execution
    } else {
        amountPaidErrorElement.textContent = ""; // Clear any previous error messages
    }

    // Validate amountPaid
    if (isNaN(amountPaid) || amountPaid <= 0) {
        alert("Please enter a valid amount greater than 0.");
        return;
    }

    // Determine payment status
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
        amountPaid: amountPaid.toString(),
        paymentStatus: paymentStatus,
    };

    try {
        if (existingSalesDocId) {
            // If a document ID exists, update the existing document
            const salesDocRef = doc(db, "sales", existingSalesDocId);
            await updateDoc(salesDocRef, updatedData);
            console.log('Sales data successfully updated.');
        } else {
            // If no document ID exists, create a new document using userId as the document ID
            const salesDocRef = doc(db, "sales", userId);
            await setDoc(salesDocRef, updatedData); // Use setDoc to create or overwrite
            console.log('Sales data successfully saved.');
        }

    } catch (error) {
        console.error("Error saving sales data: ", error);
    }

    // Close the modal after saving
    $('#editSalesModal').modal('hide');

    // Refresh the student data to reflect changes
    await fetchStudentData();
    renderStudents();
}

// Function to calculate the most popular package
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

    // Determine the most popular package
    popularPackage = Object.keys(packageCounts).reduce((a, b) => packageCounts[a] > packageCounts[b] ? a : b);
    popularPackageCount = packageCounts[popularPackage];
}

// Update Pagination Controls
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

// Check user authentication and fetch students on page load
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchStudentData();
    } else {
        console.error("No user is currently signed in.");
    }
});

// Function to filter students based on selected month and year (this won't affect total sales for the year)
function filterStudents(searchTerm = '') {
    const key = `${currentMonth}-${currentYear}`;
    filteredStudentsData = studentsData.filter(student => {
        const fullName = `${student.personalInfo.first || ''} ${student.personalInfo.last || ''}`.toLowerCase();
        const paymentDate = new Date(student.paymentDate);
        const paymentMonth = paymentDate.toLocaleString('default', { month: 'long' });
        const paymentYear = paymentDate.getFullYear();
        
        return fullName.startsWith(searchTerm) && paymentMonth === currentMonth && paymentYear == currentYear;
    });

    currentPage = 1;
    totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);

    renderStudents();
    updatePaginationControls();
    calculatePopularPackage(); // Recalculate the most popular package after filtering

    // Update the spline chart with sales data
    updateSplineChartWithSalesData();
}

// Event listener for month and year filters
document.getElementById('monthSelector').addEventListener('change', () => {
    currentMonth = document.getElementById('monthSelector').value;
    filterStudents();
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    const yearFilter = document.getElementById('yearFilter');
    yearFilter.addEventListener('change', () => {
        const selectedYear = yearFilter.value;
        updateTotalSalesForYear(selectedYear);  // This only updates the year sales, not affected by month filter
    });

    updateTotalSalesForYear(currentYear);  // Initial load of total sales for the year
});

const ctx = document.getElementById('splineChart').getContext('2d');
const splineChart = new Chart(ctx, {
    type: 'line',  // Spline chart is a type of line chart
    data: {
        labels: [],  // Initialize with empty data
        datasets: [{
            label: 'Total Monthly Sales',
            data: [],  // Initialize with empty data
            fill: false,
            borderColor: '#142A74',
            tension: 0.5  // This makes it a spline chart (smooth curve)
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Month of the Year'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Total Sales (PHP)'
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

        // You can re-draw the chart here if needed
        // drawSplineChart(filteredYearData);
    }
}

// Call this function when the year is changed in the yearFilter dropdown
document.getElementById('yearFilter').addEventListener('change', (event) => {
    const selectedYear = event.target.value;
    document.getElementById('yearlySalesYear').textContent = selectedYear;
    updateTotalSalesForYear(selectedYear);
});

document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleSalesInfo');
    const salesInfoContainer = document.getElementById('salesInfoContainer');

    // Initially hide the sales-info-container
    salesInfoContainer.style.display = 'none';

    toggleButton.addEventListener('click', function() {
        if (salesInfoContainer.style.display === 'none') {
            salesInfoContainer.style.display = 'flex';
            toggleButton.textContent = 'Hide';
        } else {
            salesInfoContainer.style.display = 'none';
            toggleButton.textContent = 'Overview';
        }
    });
});
