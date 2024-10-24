import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, setDoc, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

// Global variable to store authenticated user
let currentUser = null;

// Store the authenticated user globally for later use
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user; // Store the user globally
        console.log("User logged in:", user.displayName || user.email);
    } else {
        console.error("No authenticated user found.");
        window.location.href = 'login.html'; // Redirect to login if no user found
    }
});

// Fetch user full name from applicants collection
async function getUserFullName(userId) {
    const applicantDoc = await getDoc(doc(db, 'applicants', userId));
    if (applicantDoc.exists()) {
        const personalInfo = applicantDoc.data().personalInfo;
        const fullName = `${personalInfo.first} ${personalInfo.middle ? personalInfo.middle + ' ' : ''}${personalInfo.last}`;
        return fullName;
    } else {
        console.error("No applicant data found for user:", userId);
        return "John Doe";  // Fallback
    }
}

// Fetch the user's quiz progress from Firestore, save to sessionStorage, and then delete the Firestore document
async function fetchUserQuizProgress(userId) {
    try {
        const userQuizDocRef = doc(db, 'userQuizProgress', userId);
        const userQuizDoc = await getDoc(userQuizDocRef);

        if (userQuizDoc.exists()) {
            const userProgressData = userQuizDoc.data();
            console.log("User Quiz Progress fetched:", userProgressData);

            // Save progress to sessionStorage
            sessionStorage.setItem('userAnswers', JSON.stringify(userProgressData.answers));

            // After saving, delete the entire quiz progress document from Firestore
            await deleteDoc(userQuizDocRef);  // Delete the document
            console.log("Quiz progress document deleted from Firestore.");

            return userProgressData.answers;  // Return the fetched answers for further use
        } else {
            console.error("No quiz progress found for user.");
            return {};  // Return an empty object if no progress is found
        }
    } catch (error) {
        console.error("Error fetching and deleting user quiz progress:", error);
        return {};
    }
}

// Predict performance and fetch insights from Flask API
async function predictPerformanceAndFetchInsights(studentId, category, percentage) {
    try {
        const response = await fetch('https://quiz-performance-api-dot-authentication-d6496.df.r.appspot.com/quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ studentId, category, percentage: parseFloat(percentage) })
        });

        const data = await response.json();
        if (response.ok) {
            return {
                predicted_performance: data.predicted_performance,  // "Poor", "Great", or "Excellent"
                insights: data.insights  // Insights for this category and performance
            };
        } else {
            console.error("Error in prediction and insights:", data.error);
        }
    } catch (error) {
        console.error("Error sending data to Flask:", error);
    }
}

// Calculate category scores from session storage data
function calculateCategoryScores() {
    const userAnswers = JSON.parse(sessionStorage.getItem('userAnswers')) || {};
    let categoryScores = {};
    let categoryCounts = {};

    Object.keys(userAnswers).forEach(index => {
        const { isCorrect, category } = userAnswers[index]; 
    
        if (!categoryScores[category]) {
            categoryScores[category] = 0;
            categoryCounts[category] = 0;
        }
    
        categoryCounts[category]++;
    
        if (isCorrect) {
            categoryScores[category] += 100; // Award full score if correct
        }
    });

    Object.keys(categoryScores).forEach(category => {
        categoryScores[category] /= categoryCounts[category]; // Average percentage
    });

    return categoryScores;
}

// Determine if the user passed based on average score
function checkIfPassed(categoryScores) {
    let totalScore = 0;
    let categoryCount = 0;

    Object.values(categoryScores).forEach(score => {
        totalScore += score;
        categoryCount++;
    });

    const averageScore = totalScore / categoryCount;
    return averageScore >= 80;
}

// Calculate the total score
function calculateTotalScore(categoryScores) {
    let totalScore = 0;
    let categoryCount = 0;

    Object.values(categoryScores).forEach(score => {
        totalScore += score;
        categoryCount++;
    });

    return (totalScore / categoryCount).toFixed(2);
}

// Function to save user attempt data to Firestore (in an array of attempts)
async function saveUserAttemptToFirestore(userId, totalScore, evaluation, evaluationDetails) {
    try {
        const userAttemptRef = doc(db, 'userAttempt', userId);
        const userAttemptDoc = await getDoc(userAttemptRef);

        const newAttempt = {
            date: new Date().toISOString(),
            percentage: totalScore,
            evaluation: evaluation,
            status: evaluation === 'Passed' ? 'Pass' : 'Fail',
            evaluationDetails: evaluationDetails  // Include category insights and performance
        };

        if (userAttemptDoc.exists()) {
            const existingAttempts = userAttemptDoc.data().attempts;
        
            // Check if the 'attempts' field is an array. If not, initialize it as an empty array.
            const attemptsArray = Array.isArray(existingAttempts) ? existingAttempts : [];
        
            // Append new attempt to the existing array
            await updateDoc(userAttemptRef, {
                attempts: [...attemptsArray, newAttempt]  // Ensure that attempts is always an array
            });
        } else {
            // If the document doesn't exist, create it with the first attempt
            await setDoc(userAttemptRef, {
                attempts: [newAttempt]  // Initialize 'attempts' as an array with the first attempt
            });
        }
        
        console.log("User attempt data saved successfully.");
    } catch (error) {
        console.error("Error saving user attempt data:", error);
    }
}

// Function to save final user results to Firestore (used when user passes)
async function saveFinalUserResultsToFirestore(userId, fullName, totalScore, certificateID, evaluationDetails) {
    try {
        const userResultData = {
            name: fullName,
            date: new Date().toISOString(),
            percentage: totalScore,
            certificateID: certificateID, // Store certificate ID for the final phase
            status: 'Pass', // Final phase status, Pass only
            evaluationDetails // Save evaluation details (including insights)
        };

        // Create a new document in the 'userResults' collection
        await setDoc(doc(db, 'userResults', userId), userResultData);
        console.log("User results saved successfully.");
    } catch (error) {
        console.error("Error saving user results:", error);
    }
}

// Function to calculate overall status (pass or fail)
function calculateOverallStatus(categoryScores) {
    const passed = checkIfPassed(categoryScores);
    const totalScore = calculateTotalScore(categoryScores);
    const evaluation = passed ? "Passed" : "Failed";
    return { passed, totalScore, evaluation };
}

// Function to handle saving after the evaluation
async function handleSavingResults(categoryScores) {
    const fullName = await getUserFullName(currentUser.uid); // Get user's full name
    const { passed, totalScore, evaluation } = calculateOverallStatus(categoryScores);  // Determine if passed or failed

    // Collect insights for all categories
    const evaluationDetails = await Promise.all(Object.keys(categoryScores).map(async (category) => {
        const score = categoryScores[category];
        const result = await predictPerformanceAndFetchInsights(currentUser.uid, category, score);
        const videoLink = result.predicted_performance === 'Poor' ? 
            `<a href="uservideos.html?category=${encodeURIComponent(category)}">Click here to watch the video for ${category} improvement</a>` : 
            '';

        return {
            category,
            score,
            status: result.predicted_performance,
            insights: `${result.insights} ${videoLink}`  // Add video link if the performance is poor
        };
    }));

    // Save in userAttempt regardless of pass or fail
    await saveUserAttemptToFirestore(currentUser.uid, totalScore, evaluation, evaluationDetails);

    // If passed, save final results to userResults
    if (passed) {
        const certificateID = Math.random().toString(36).substring(2, 10);  // Generate certificate ID
        await saveFinalUserResultsToFirestore(currentUser.uid, fullName, totalScore, certificateID, evaluationDetails); // Save result in userResults
    }
}
// In the button click handler (for fetching and calculating results)
document.getElementById('seeResultsBtn').addEventListener('click', async function () {
    if (!currentUser) {
        console.error('No authenticated user found!');
        return;
    }

    const studentId = currentUser.uid;
    console.log("User ID:", studentId);

    document.getElementById('loader1').style.display = 'flex';

    // Fetch user's quiz progress from Firestore
    await fetchUserQuizProgress(studentId);

    const categoryScores = calculateCategoryScores();  // Calculate category scores based on fetched progress

    await handleSavingResults(categoryScores);  // Save results based on pass or fail

    setTimeout(function () {
        document.getElementById('loader1').style.display = 'none';
        showChart(categoryScores);  // Display the chart
    }, 1000);
});

// Show the chart with category scores
function showChart(categoryScores) {
    const resultContainer = document.querySelector('.result-container');
    resultContainer.innerHTML = ''; // Clear previous content

    const chartContent = document.createElement('div');
    chartContent.className = 'chart-content';
    chartContent.style.width = '100%';  // Set the width to fill the container
    chartContent.style.height = '500px'; // Set a larger height for the chart
    chartContent.innerHTML = `<canvas id="myBarChart"></canvas>`;
    resultContainer.appendChild(chartContent);

    const nextButton = document.createElement('button');
    nextButton.className = 'result-button';
    nextButton.innerHTML = 'Next';
    resultContainer.appendChild(nextButton);

    const labels = Object.keys(categoryScores);
    const dataPoints = Object.values(categoryScores);

    const ctx = document.getElementById('myBarChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Performance Score',
                data: dataPoints,
                backgroundColor: 'rgba(75, 192, 192, 0.4)',  // Thicker background color
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2  // Thicker borders for the bars
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Ensure the chart fills the container
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Score Percentage',  // Label for the y-axis
                        font: {
                            size: 20  // Make the font size larger
                        }
                    },
                    ticks: {
                        font: {
                            size: 18  // Larger tick labels for the y-axis
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Category',  // Label for the x-axis
                        font: {
                            size: 20  // Make the font size larger
                        }
                    },
                    ticks: {
                        font: {
                            size: 18  // Larger tick labels for the x-axis
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 18  // Larger font for the legend
                        }
                    }
                }
            }
        }
    });

    nextButton.addEventListener('click', () => {
        const evaluationData = labels.map((label, index) => ({
            category: label,
            score: dataPoints[index]
        }));
        showPerformanceEvaluation(evaluationData);
    });
}

// Show performance evaluation with Flask AI insights
async function showPerformanceEvaluation(evaluationData) {
    const resultContainer = document.querySelector('.result-container');
    resultContainer.innerHTML = ''; // Clear content

    const resultContent = document.createElement('div');
    resultContent.className = 'generated-results';
    resultContent.innerHTML = `
        <div class="result-header">
            <h3>Performance Evaluation</h3>
            <p>Here is your performance evaluation based on the data:</p>
        </div>
    `;

    const performanceWrapper = document.createElement('div');
    performanceWrapper.className = 'performance-wrapper';

    for (const item of evaluationData) {
        const performanceBlock = document.createElement('div');
        performanceBlock.className = 'performance-evaluation';

        const result = await predictPerformanceAndFetchInsights(currentUser.uid, item.category, item.score);
        if (result) {
            const predictedPerformance = result.predicted_performance;
            const insights = result.insights;

            let status;
            let color;

            if (predictedPerformance === 'Poor') {
                status = 'Poor';
                color = '#B60505';
            } else if (predictedPerformance === 'Great') {
                status = 'Great';
                color = 'green';
            } else if (predictedPerformance === 'Excellent') {
                status = 'Excellent';
                color = '#142A74';
            }

            let additionalResources = insights ? `<p><strong>Insights:</strong> ${insights}</p>` : '';

            if (predictedPerformance === 'Poor') {
                additionalResources += `
                    <p><a href="uservideos.html?category=${encodeURIComponent(item.category)}" style="color:${color}; text-decoration:underline;">
                        Click here to watch the video for ${item.category} improvement
                    </a></p>
                `;
            }

            performanceBlock.innerHTML = `
                <div style="border: 1px solid ${color}; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                    <p style="display: flex; gap: 5px">
                        <strong>${item.category}:</strong> 
                        <span class="status" style="color:${color};">${status}</span>
                        <i class="bi bi-chevron-down toggle-insights" style="cursor: pointer; color: #2F2E2E; margin-left: auto;"></i>
                    </p>
                    <div class="insights-content" style="display: none;">
                        ${additionalResources}
                    </div>
                </div>
            `;

            performanceWrapper.appendChild(performanceBlock);
        }
    }

    resultContent.appendChild(performanceWrapper);
    resultContainer.appendChild(resultContent);

    // Reattach the event listener after the performance evaluation is rendered
    attachToggleListeners();

    const categoryScores = calculateCategoryScores();
    const passed = checkIfPassed(categoryScores);

    const backButton = document.createElement('button');
    backButton.className = 'result-button';
    backButton.innerHTML = 'Back';
    resultContainer.appendChild(backButton);

    backButton.addEventListener('click', () => showChart(categoryScores));

    if (passed) {
        const downloadButton = document.createElement('button');
        downloadButton.className = 'result-button';
        downloadButton.innerHTML = 'Certificate of Completion';
        resultContainer.appendChild(downloadButton);

        downloadButton.addEventListener('click', async () => {
            if (currentUser) {
                const fullName = await getUserFullName(currentUser.uid);
                const { certificateID, totalScore } = await getCertificateData(currentUser.uid);
                generateCertificate(fullName, totalScore, certificateID);
            }
        });
    }
}

// Helper function to reattach event listeners for toggling insights
function attachToggleListeners() {
    const toggleElements = document.querySelectorAll('.toggle-insights');
    toggleElements.forEach(toggle => {
        toggle.addEventListener('click', function(event) {
            const performanceBlock = event.target.closest('.performance-evaluation');
            const insightsContent = performanceBlock.querySelector('.insights-content');

            if (insightsContent.style.display === 'none' || insightsContent.style.display === '') {
                insightsContent.style.display = 'block'; // Show insights
                event.target.classList.remove('bi-chevron-down'); // Change the icon
                event.target.classList.add('bi-chevron-up');
            } else {
                insightsContent.style.display = 'none'; // Hide insights
                event.target.classList.remove('bi-chevron-up');
                event.target.classList.add('bi-chevron-down');
            }
        });
    });
}

async function getCertificateData(userId) {
    try {
        const userResultDoc = await getDoc(doc(db, 'userResults', userId));
        
        if (userResultDoc.exists()) {
            const userResultData = userResultDoc.data();
            const certificateID = userResultData.certificateID || 'N/A';  // Use 'N/A' if certificateID is missing
            const totalScore = userResultData.percentage || 0;  // Use 0 if totalScore is missing
            return { certificateID, totalScore };
        } else {
            console.error("No user result data found for user:", userId);
            return { certificateID: 'N/A', totalScore: 0 };  // Return default values if no result is found
        }
    } catch (error) {
        console.error("Error fetching certificate data:", error);
        return { certificateID: 'N/A', totalScore: 0 };  // Return default values in case of error
    }
}
// JavaScript for sidebar toggle
document.getElementById('toggleSidebarBtn').addEventListener('click', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // Toggle the 'active' class to show or hide the sidebar
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('active');
});

async function generateCertificate(fullName, totalScore, certificateID, completionDate) {
    const { jsPDF } = window.jspdf;

    // Create a new PDF document
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add background image (cover entire page)
    const backgroundBase64 = 'Assets/TDC Cert.png'; // Path to your background image or base64 string
    doc.addImage(backgroundBase64, 'PNG', 0, 0, pageWidth, pageHeight);

    // Set the title of the certificate with default fonts
    doc.setFont("Times");
    doc.setFontSize(66);

    // Add logo and adjust size
    const logoBase64 = 'Assets/logo.png';  // Path to your logo image or base64 string
    doc.addImage(logoBase64, 'PNG', 130, 13, 30, 30);

    // Center the text manually by calculating the width
    doc.text("CERTIFICATE", pageWidth / 2, 60, { align: 'center' });
    doc.setFontSize(26);
    doc.text("OF COMPLETION", pageWidth / 2, 75, { align: 'center' });

    // Add certificate content text
    doc.setFontSize(16);
    doc.text("This is to certify that", pageWidth / 2, 85, { align: 'center' });

    // Add the user's name dynamically
    doc.setFont("Helvetica");
    doc.setFontSize(32);
    doc.text(fullName, pageWidth / 2, 115, { align: 'center' });

    // Add quiz completion details dynamically (total score and certificate ID)
    doc.setFont("Helvetica");
    doc.setFontSize(15);
    doc.text(`Has successfully passed the theoretical driving course on ${completionDate}`, pageWidth / 2, 130, { align: 'center' });
    doc.text(`with a quiz result of ${totalScore}%, earning Quiz Passing ID ${certificateID}`, pageWidth / 2, 140, { align: 'center' });

    // Add the signature and line for admin signature
    doc.setFont("Helvetica");
    doc.setFontSize(24);
    doc.text("Aaron Loeb", 195, 170);
    doc.line(195, 172, 239, 172);  // Signature line
    doc.setFont("Helvetica");
    doc.setFontSize(17);
    doc.text("Admin", 208, 180);

    // Save the PDF with the dynamically added details
    doc.save("Certificate_of_Completion.pdf");
}