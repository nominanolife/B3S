import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

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
const auth = getAuth(app);

// Global variable to hold the applicant's full name
let applicantName = "";

// Check if the user is logged in and fetch their quiz attempts and name
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchApplicantName(user.uid).then(() => {
            fetchUserAttempts(user.uid);  // Fetch the user's attempts after the name is fetched
        });
    } else {
        console.log("No user is logged in");
        window.location.href = '/login.html';
    }
});

// Fetch applicant name from Firestore based on UID
async function fetchApplicantName(uid) {
    try {
        const applicantDocRef = doc(db, 'applicants', uid);
        const applicantDoc = await getDoc(applicantDocRef);

        if (applicantDoc.exists()) {
            const applicantData = applicantDoc.data();
            applicantName = `${applicantData.personalInfo.first} ${applicantData.personalInfo.last}`;
        } else {
            console.log("No applicant data found.");
        }
    } catch (error) {
        console.error("Error fetching applicant name:", error);
    }
}

// Fetch user attempts from Firestore
async function fetchUserAttempts(uid) {
    try {
        const userAttemptsRef = doc(db, 'userAttempt', uid);
        const docSnapshot = await getDoc(userAttemptsRef);

        if (docSnapshot.exists()) {
            const attempts = docSnapshot.data().attempts;

            if (attempts && attempts.length > 0) {
                populateTable(attempts);
            } else {
                populateTable([]); // Pass an empty array if no attempts
            }
        } else {
            console.log("No attempt data found.");
            populateTable([]); // No attempts found, pass an empty array
        }
    } catch (error) {
        console.error("Error fetching user attempts:", error);
        populateTable([]); // Handle error by showing "No history yet"
    }
}

// Populate the table with user attempt data or show "No history yet"
function populateTable(attempts) {
    const tableBody = document.getElementById('attempts-table-body');
    tableBody.innerHTML = ''; // Clear any existing data

    if (attempts.length === 0) {
        // Display "No history yet" if there are no attempts
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.setAttribute('colspan', '6'); // Span across all columns
        cell.style.textAlign = 'center'; // Center the text
        cell.textContent = 'No quiz history yet';
        row.appendChild(cell);
        tableBody.appendChild(row);
    } else {
        // Display each attempt if available
        attempts.forEach((attempt, index) => {
            const row = document.createElement('tr');

            // Create table cells and append them
            row.innerHTML = `
                <td>${applicantName}</td>  <!-- Display the applicant's name -->
                <td>${new Date(attempt.date).toLocaleDateString()}</td>
                <td>${attempt.percentage || 'N/A'}%</td>
                <td><a href="#" class="view-result-link" data-attempt-index="${index}" data-toggle="modal" data-target="#performanceEvaluationModal">View Result</a></td>
                <td class="${attempt.evaluation === 'Passed' ? 'status-passed' : 'status-failed'}">${attempt.evaluation}</td>
                <td>${index + 1}</td>
            `;

            tableBody.appendChild(row);
        });

        // Add event listeners for each "View Result" link
        document.querySelectorAll('.view-result-link').forEach(link => {
            link.addEventListener('click', function () {
                const attemptIndex = this.getAttribute('data-attempt-index');
                showPerformanceEvaluation(attempts[attemptIndex]);
            });
        });

        // Call the applyRowStyles function to color-code the rows based on their status
        applyRowStyles();
    }
}

// Show performance evaluation in the modal (handling the array of evaluationDetails)
function showPerformanceEvaluation(attempt) {
    const performanceBody = document.getElementById('performance-evaluation-body');
    performanceBody.innerHTML = ''; // Clear previous content

    attempt.evaluationDetails.forEach((item) => {
        const performanceBlock = document.createElement('div');
        performanceBlock.className = 'performance-evaluation';

        const statusColor = item.status === 'Poor' ? 'red' : (item.status === 'Great' ? 'green' : 'blue');
        const insights = `<p><strong>Insights:</strong> ${item.insights}</p>`;
        
        let additionalResources = '';
        if (item.status === 'Poor') {
            additionalResources = `
                <p><a href="uservideos.html?category=${encodeURIComponent(item.category)}" style="color:${statusColor}; text-decoration:underline;">
                    Click here to watch the video for ${item.category} improvement
                </a></p>
            `;
        }

        performanceBlock.innerHTML = `
            <p><strong>${item.category}:</strong> 
                <span class="status" style="color:${statusColor};">${item.status}</span>
            </p>
            ${insights}
            ${additionalResources}
        `;

        performanceBody.appendChild(performanceBlock);
    });

    // Add back button to close the modal
    const backButton = document.createElement('button');
    backButton.className = 'result-button';
    backButton.innerHTML = 'Back';
    performanceBody.appendChild(backButton);

    backButton.addEventListener('click', () => {
        $('#performanceEvaluationModal').modal('hide');
    });
}

// Helper function to color-code table rows based on status
function applyRowStyles() {
    document.querySelectorAll('tbody tr').forEach(row => {
        const statusCell = row.querySelector('td:nth-child(5)');
        if (statusCell.textContent.trim() === 'Passed') {
            statusCell.classList.add('status-passed'); // Apply green color for "Passed"
        } else if (statusCell.textContent.trim() === 'Failed') {
            statusCell.classList.add('status-failed'); // Apply red color for "Failed"
        }
    });
}


