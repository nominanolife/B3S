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
            // Clear the studentsMap to avoid duplicates
            studentsMap.clear();

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

                        // Add the student to the map if they have an active booking
                        if (applicantData.role === "student") {
                            // Add or update the student data in the map
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
                    // If no active booking, check for completed status
                    if (applicantData.TDCStatus === "Completed" || 
                        applicantData["PDC-4WheelsStatus"] === "Completed" || 
                        applicantData["PDC-MotorsStatus"] === "Completed") {
                        
                        // Add the student with completed status to the map
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

            // Update global arrays and store month and year data
            allStudentsData = Array.from(studentsMap.values()); // Save all data for year calculation
            studentsData = [...allStudentsData]; // Also set this for filtering
            storeMonthYearData(); // Store the data for the current month and year
            filterStudents(); // Filter students based on current month and year selection
            totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);
            calculatePopularPackage(); // Calculate the most popular package
            renderStudents();
            updatePaginationControls();

            // Update the sales data for the year
            updateTotalSalesForYear(currentYear);
            updatePackageData();

            // Debug: Log final student data
            console.log("All students data:", allStudentsData);
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

    if (filteredStudentsData.length === 0) {
        studentList.innerHTML = '<tr><td colspan="7">No students found for the selected criteria.</td></tr>';
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
        const amountPaid = student.amountPaid ? `&#8369; ${student.amountPaid}` : 'N/A'; // Conditionally add peso sign
        const paymentStatus = student.paymentStatus || 'Not Paid'; // Default payment status if not paid

        const studentHtml = `
        <tr class="table-row">
            <td class="table-row-content">${personalInfo.first} ${personalInfo.last}</td>
            <td class="table-row-content">${packageName}</td>
            <td class="table-row-content">&#8369; ${packagePrice}</td> <!-- Package Price -->
            <td class="table-row-content">${paymentStatus}</td> <!-- Payment Status -->
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

    // Count occurrences of each package
    filteredStudentsData.forEach(student => {
        const packageName = student.packageName || 'Unknown Package';
        if (packageCounts[packageName]) {
            packageCounts[packageName]++;
        } else {
            packageCounts[packageName] = 1;
        }
    });

    // Check if there are any packages to avoid reducing an empty array
    if (Object.keys(packageCounts).length === 0) {
        console.error('No packages found.');
        return;
    }

    // Determine the most popular package
    popularPackage = Object.keys(packageCounts).reduce((a, b) => packageCounts[a] > packageCounts[b] ? a : b);
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

function filterStudents(searchTerm = '') {
    const key = `${currentMonth}-${currentYear}`;
    filteredStudentsData = studentsData.filter(student => {
        const fullName = `${student.personalInfo?.first || ''} ${student.personalInfo?.last || ''}`.toLowerCase();
        
        if (student.paymentDate) {
            const paymentDate = new Date(student.paymentDate);
            const paymentMonth = paymentDate.toLocaleString('default', { month: 'long' });
            const paymentYear = paymentDate.getFullYear();
            return fullName.startsWith(searchTerm) && paymentMonth === currentMonth && paymentYear == currentYear;
        } else {
            return fullName.startsWith(searchTerm); // Include students without payment date
        }
    });

    currentPage = 1;
    totalPages = Math.ceil(filteredStudentsData.length / itemsPerPage);

    renderStudents();
    updatePaginationControls();
    calculatePopularPackage(); // Recalculate the most popular package after filtering
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
            backgroundColor: '#5a699d',
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
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Number of Students'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Package Name'
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: true
        }
    });
}