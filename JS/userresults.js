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
        const response = await fetch('http://127.0.0.1:5000/predict_and_insights', {
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
            // Append new attempt to existing array
            await updateDoc(userAttemptRef, {
                attempts: [...userAttemptDoc.data().attempts, newAttempt]
            });
        } else {
            // Create new document with the first attempt
            await setDoc(userAttemptRef, {
                attempts: [newAttempt]
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
        return {
            category,
            score,
            status: result.predicted_performance,
            insights: result.insights
        };
    }));

    // Save in userAttempt regardless of pass or fail
    await saveUserAttemptToFirestore(currentUser.uid, fullName, totalScore, evaluation, evaluationDetails);

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
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
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
                color = 'red';
            } else if (predictedPerformance === 'Great') {
                status = 'Great';
                color = 'green';
            } else if (predictedPerformance === 'Excellent') {
                status = 'Excellent';
                color = 'blue';
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
                <p><strong>${item.category}:</strong> 
                    <span class="status" style="color:${color};">${status}</span>
                </p>
                ${additionalResources}
            `;

            performanceWrapper.appendChild(performanceBlock);
        }
    }

    resultContent.appendChild(performanceWrapper);
    resultContainer.appendChild(resultContent);

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