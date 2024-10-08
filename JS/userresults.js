import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Your web app's Firebase configuration
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
        // Optionally, redirect to login
        window.location.href = 'login.html';
    }
});

// Fetch user full name from `applicants` collection
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

// Fetch certificate ID from `userResults` collection
async function getCertificateData(userId) {
    const resultsDoc = await getDoc(doc(db, 'userResults', userId));
    if (resultsDoc.exists()) {
        const userData = resultsDoc.data();
        return { certificateID: userData.certificateID, totalScore: userData.totalScore };
    } else {
        console.error("No results data found for user:", userId);
        return { certificateID: 'GeneratedCertID', totalScore: '0.00' };  // Fallback
    }
}

async function predictPerformanceAndFetchInsights(studentId, category, percentage) {
    try {
        // Log data being sent for better debugging
        console.log(`Sending data to Flask: studentId=${studentId}, category=${category}, percentage=${percentage}`);

        if (!studentId || typeof studentId !== 'string') {
            console.error("Invalid studentId passed to prediction function.");
            return;
        }

        if (isNaN(percentage)) {
            console.error("Invalid percentage passed to prediction function.");
            return;
        }

        const response = await fetch('http://127.0.0.1:5000/predict_and_insights', {  // Full URL with the correct port
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                studentId: studentId,  // Pass the studentId as a string directly
                category: category,
                percentage: parseFloat(percentage)  // Ensure percentage is a float
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log("Received data from Flask:", data);
            return {
                predicted_performance: data.predicted_performance,  // "Poor" or "Great"
                insights: data.insights  // Insights for this category and performance
            };
        } else {
            console.error("Error in prediction and insights:", data.error);
        }
    } catch (error) {
        console.error("Error sending data to Flask:", error);
    }
}

// Fetch and Randomize Quizzes
let questions = [];
async function fetchQuizzes() {
    try {
        const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
        quizzesSnapshot.forEach(doc => {
            const quizData = doc.data();
            quizData.questions.forEach(question => {
                questions.push({
                    ...question,
                    category: quizData.category
                });
            });
        });
    } catch (error) {
        console.error("Error fetching quizzes:", error);
    }
}

// Function to calculate category scores from session storage data
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

    console.log("Category Scores Calculated:", categoryScores);
    return categoryScores;
}

// Function to determine if the user passed
function checkIfPassed(categoryScores) {
    let totalScore = 0;
    let categoryCount = 0;

    Object.values(categoryScores).forEach(score => {
        totalScore += score;
        categoryCount++;
    });

    const averageScore = totalScore / categoryCount;
    console.log("Average Score:", averageScore);
    return averageScore >= 80;
}
function showChart(categoryScores) {
    let resultContainer = document.querySelector('.result-container');

    // Clear the existing content in the result-container
    resultContainer.innerHTML = '';

    // Create a new div for displaying the bar graph
    let chartContent = document.createElement('div');
    chartContent.className = 'chart-content';
    chartContent.innerHTML = `<canvas id="myBarChart"></canvas>`;
    resultContainer.appendChild(chartContent);

    // Create a "Next" button to go to the performance evaluation
    let nextButton = document.createElement('button');
    nextButton.className = 'result-button';
    nextButton.innerHTML = 'Next';
    resultContainer.appendChild(nextButton);

    const labels = Object.keys(categoryScores);
    const dataPoints = Object.values(categoryScores);

    // Create a bar graph using Chart.js
    const ctx = document.getElementById('myBarChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
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
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Add event listener for the "Next" button
    nextButton.addEventListener('click', function () {
        const evaluationData = labels.map((label, index) => ({
            category: label,
            score: dataPoints[index]
        }));
        showPerformanceEvaluation(evaluationData);
    });
}

// Function to save results only (without generating the certificate immediately)
async function saveResults(categoryScores) {
    const passed = checkIfPassed(categoryScores);
    if (passed && currentUser) { 
        try {
            const userId = currentUser.uid;
            const certificateID = Math.random().toString(36).substring(2, 10);
            const totalScore = calculateTotalScore(categoryScores);

            const userResultsRef = doc(db, 'userResults', userId);
            const userResults = {
                categoryScores: categoryScores,
                totalScore: totalScore,
                certificateID: certificateID,
                passed: true,
                timestamp: new Date(),
            };

            await setDoc(userResultsRef, userResults, { merge: true });
            console.log("User results saved successfully.");
        } catch (error) {
            console.error("Error saving user results:", error);
        }
    }
}

function calculateTotalScore(categoryScores) {
    let totalScore = 0;
    let categoryCount = 0;

    Object.values(categoryScores).forEach(score => {
        totalScore += score;
        categoryCount++;
    });

    return (totalScore / categoryCount).toFixed(2);
}

// In the button click handler, ensure currentUser.uid is available before proceeding
document.getElementById('seeResultsBtn').addEventListener('click', async function () {
    if (!currentUser) {
        console.error('No authenticated user found!');
        return;  // Exit if no authenticated user
    }

    const studentId = currentUser.uid;  // Ensure studentId is available
    console.log("User ID:", studentId);  // Debug the userId

    document.getElementById('loader1').style.display = 'flex';

    await fetchQuizzes();
    const categoryScores = calculateCategoryScores();

    await saveResults(categoryScores);

    setTimeout(function () {
        document.getElementById('loader1').style.display = 'none';
        showChart(categoryScores);
    }, 1000);
});

// Function to show the performance evaluation and provide video links for poor performance
async function showPerformanceEvaluation(evaluationData) {
    let resultContainer = document.querySelector('.result-container');
    resultContainer.innerHTML = '';  // Clear content

    let resultContent = document.createElement('div');
    resultContent.className = 'generated-results';

    resultContent.innerHTML = `
        <div class="result-header">
            <h3>Performance Evaluation</h3>
            <p>Here is your performance evaluation based on the data:</p>
        </div>
    `;

    let performanceWrapper = document.createElement('div');
    performanceWrapper.className = 'performance-wrapper';

    // Loop through each category evaluation data
    for (const item of evaluationData) {
        let performanceBlock = document.createElement('div');
        performanceBlock.className = 'performance-evaluation';

        // Step 1: Predict performance and fetch insights using Flask
        const result = await predictPerformanceAndFetchInsights(currentUser.uid, item.category, item.score);
        
        if (result) {
            const predictedPerformance = result.predicted_performance;
            const insights = result.insights;

            // Determine status based on the predicted performance
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
                color = 'blue';  // Optionally, choose another color for "Excellent"
            }

            let additionalResources = insights ? `<p><strong>Insights:</strong> ${insights}</p>` : '';

            // If the predicted performance is Poor, provide a link to the video for that category
            if (predictedPerformance === 'Poor') {
                additionalResources += `
                    <p><a href="uservideos.html?category=${encodeURIComponent(item.category)}" style="color:${color}; text-decoration:underline;">
                        Click here to watch the video for ${item.category} improvement
                    </a></p>
                `;
            }

            // Display performance and insights (with link if performance is Poor)
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

    let backButton = document.createElement('button');
    backButton.className = 'result-button';
    backButton.innerHTML = 'Back';
    resultContainer.appendChild(backButton);

    backButton.addEventListener('click', function () {
        showChart(categoryScores);
    });

    if (passed) {
        let downloadButton = document.createElement('button');
        downloadButton.className = 'result-button';
        downloadButton.innerHTML = 'Certificate of Completion';
        resultContainer.appendChild(downloadButton);

        downloadButton.addEventListener('click', async function () {
            if (currentUser) {
                const fullName = await getUserFullName(currentUser.uid);
                const { certificateID, totalScore } = await getCertificateData(currentUser.uid);
                generateCertificate(fullName, totalScore, certificateID);
            }
        });
    }
}