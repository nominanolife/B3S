import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

// Fetch certificate ID and score from `userResults` collection
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

// Function to fetch the user's quiz progress from Firestore
async function fetchUserQuizProgress(userId) {
    try {
        const userQuizDocRef = doc(db, 'userQuizProgress', userId);
        const userQuizDoc = await getDoc(userQuizDocRef);

        if (userQuizDoc.exists()) {
            const userProgressData = userQuizDoc.data();
            console.log("User Quiz Progress:", userProgressData);

            // Save the progress to session storage
            sessionStorage.setItem('userAnswers', JSON.stringify(userProgressData.answers));
            
            return userProgressData.answers;  // Return the answers
        } else {
            console.error("No quiz progress found for user.");
            return {};  // Return an empty object if no progress found
        }
    } catch (error) {
        console.error("Error fetching user quiz progress:", error);
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

// Function to save results to Firestore
async function saveResults(categoryScores) {
    const passed = checkIfPassed(categoryScores);
    if (currentUser) { 
        try {
            const userId = currentUser.uid;
            const certificateID = Math.random().toString(36).substring(2, 10);
            const totalScore = calculateTotalScore(categoryScores);

            const userResults = {
                categoryScores,
                totalScore,
                certificateID,
                passed,
                timestamp: new Date(),
                userAnswers: JSON.parse(sessionStorage.getItem('userAnswers')) || {} // Save user answers
            };

            await setDoc(doc(db, 'userResults', userId), userResults, { merge: true });
            console.log("User results saved successfully.");
        } catch (error) {
            console.error("Error saving user results:", error);
        }
    }
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

    await saveResults(categoryScores);  // Save results

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
