import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

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

let questions = [];

// Fetch and Randomize Quizzes
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

    // Iterate through user answers
    Object.keys(userAnswers).forEach(index => {
        const { question, answer, category } = userAnswers[index];
        const correctAnswer = questions[index].correctAnswer;

        if (!categoryScores[category]) {
            categoryScores[category] = 0;
            categoryCounts[category] = 0;
        }

        categoryCounts[category]++;

        // Compare user answer with correct answer index
        if (answer === questions[index].options[correctAnswer].value) {
            categoryScores[category] += 100; // Award full score if correct
        }
    });

    // Calculate average score per category
    Object.keys(categoryScores).forEach(category => {
        categoryScores[category] /= categoryCounts[category];
    });

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
    return averageScore >= 80;
}

// Function to save results if the user passed
async function saveResultsIfPassed(categoryScores) {
    if (checkIfPassed(categoryScores)) {
        try {
            // Check if user is authenticated
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    const userId = user.uid;
                    const userResultsRef = doc(db, 'userResults', userId);
                    const userResults = {
                        categoryScores: categoryScores,
                        timestamp: new Date(),
                    };

                    await setDoc(userResultsRef, userResults, { merge: true });
                    console.log("User results saved successfully.");
                } else {
                    console.error("No authenticated user found.");
                }
            });
        } catch (error) {
            console.error("Error saving user results:", error);
        }
    }
}

// Function to show the loader and display results when the result button is clicked
document.getElementById('seeResultsBtn').addEventListener('click', async function () {
    // Show the loader
    document.getElementById('loader1').style.display = 'flex';

    // Fetch the quiz data
    await fetchQuizzes();

    // Calculate category scores
    const categoryScores = calculateCategoryScores();

    // Save results if the user passed
    saveResultsIfPassed(categoryScores);

    // Simulate a delay to mimic data loading
    setTimeout(function () {
        // Hide the loader after 3 seconds
        document.getElementById('loader1').style.display = 'none';

        // Logic to display the chart
        showChart(categoryScores);
    }, 1000);  // 3 seconds delay for simulation
});

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

function showPerformanceEvaluation(evaluationData) {
    let resultContainer = document.querySelector('.result-container');

    // Clear the existing content in the result-container
    resultContainer.innerHTML = '';

    // Create a new div for displaying the performance evaluation
    let resultContent = document.createElement('div');
    resultContent.className = 'generated-results';

    // Create header content
    resultContent.innerHTML = `
        <div class="result-header">
            <h3>Performance Evaluation</h3>
            <p>Here is your performance evaluation based on the data:</p>
        </div>
    `;

    // Create a wrapper div for all performance-evaluation blocks
    let performanceWrapper = document.createElement('div');
    performanceWrapper.className = 'performance-wrapper';

    // Create performance evaluation content dynamically
    evaluationData.forEach(item => {
        let performanceBlock = document.createElement('div');
        performanceBlock.className = 'performance-evaluation';

        // Determine status and color based on the score
        let status = item.score < 50 ? 'Poor' : 'Great';
        let color = item.score < 50 ? 'red' : 'green';

        performanceBlock.innerHTML = `
            <p><strong>${item.category}:</strong> <span class="status" style="color:${color};">${status}</span></p>
            <ul>
                <li>Areas to Improve:</li>
                <ul>
                    <li>Practice different techniques in this category.</li>
                    <li>Focus on improving key skills relevant to this area.</li>
                    <li>Seek additional training or guidance if necessary.</li>
                </ul>
            </ul>
        `;

        performanceWrapper.appendChild(performanceBlock);
    });

    resultContent.appendChild(performanceWrapper);
    resultContainer.appendChild(resultContent);

    // Create a "Back" button to go back to the chart
    let backButton = document.createElement('button');
    backButton.className = 'result-button';
    backButton.innerHTML = 'Back';
    resultContainer.appendChild(backButton);

    // Create a "Download PDF" button to generate the performance PDF
    let downloadButton = document.createElement('button');
    downloadButton.className = 'result-button';
    downloadButton.innerHTML = 'Certificate of Completion';
    resultContainer.appendChild(downloadButton);

    // Add event listener for the "Back" button
    backButton.addEventListener('click', function () {
        showChart(calculateCategoryScores());
    });

    // Add event listener for the "Download PDF" button
    downloadButton.addEventListener('click', function () {
        downloadPDF(evaluationData);
    });
}

function downloadPDF(evaluationData) {
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
    const backgroundBase64 = 'Assets/TDC Cert.png'; // Base64 of background image
    doc.addImage(backgroundBase64, 'PNG', 0, 0, pageWidth, pageHeight);

    // Set the title of the certificate with default fonts
    doc.setFont("Times");
    doc.setFontSize(66);

    // Add logo and adjust size
    const logoBase64 = 'Assets/logo.png';  // Base64 of the logo
    doc.addImage(logoBase64, 'PNG', 130, 13, 30, 30);

    // Center the text manually by calculating the width
    doc.text("CERTIFICATE", pageWidth / 2, 60, { align: 'center' });

    doc.setFontSize(26);
    doc.text("OF COMPLETION", pageWidth / 2, 75, { align: 'center' });

    doc.setFontSize(16);
    doc.text("This is to certify that", pageWidth / 2, 85, { align: 'center' });

    // Add the user's name with default fonts
    doc.setFont("Helvetica");
    doc.setFontSize(85);
    doc.text("John Doe", pageWidth / 2, 115, { align: 'center' });

    // Add quiz completion details with default fonts
    doc.setFont("Helvetica");
    doc.setFontSize(15);
    doc.text("Has successfully passed the theoretical driving course on January 1, 2024", pageWidth / 2, 130, { align: 'center' });
    doc.text("with a quiz result of 90%, earning Quiz Passing ID 1010101", pageWidth / 2, 140, { align: 'center' });

    // Second signature fields
    doc.setFont("Helvetica");
    doc.setFontSize(24);
    doc.text("Aaron Loeb", 195, 170);
    doc.line(195, 172, 239, 172);  // Signature line

    doc.setFont("Helvetica");
    doc.setFontSize(17);
    doc.text("Admin", 208, 180);

    // Save the PDF
    doc.save("Certificate_of_Completion.pdf");
}