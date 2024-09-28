// Function to show the loader and display results when the result button is clicked
document.getElementById('seeResultsBtn').addEventListener('click', function() {
    // Show the loader
    document.getElementById('loader1').style.display = 'flex';

    // Simulate a delay to mimic data loading
    setTimeout(function() {
        // Hide the loader after 3 seconds
        document.getElementById('loader1').style.display = 'none';

        // Logic to display the chart
        showChart();

    }, 3000);  // 3 seconds delay for simulation
});

function showChart() {
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

    // Create a bar graph using Chart.js
    const ctx = document.getElementById('myBarChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['General Knowledge', 'Emergencies', 'Handling and Driving', 'Parking', 'Road Position', 'Violation'],
            datasets: [{
                label: 'Performance Score',
                data: [85, 90, 78, 92, 100, 20], // Sample data points
                backgroundColor: ['rgba(75, 192, 192, 0.2)'],
                borderColor: ['rgba(75, 192, 192, 1)'],
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
    nextButton.addEventListener('click', function() {
        showPerformanceEvaluation();
    });
}

function showPerformanceEvaluation() {
    let resultContainer = document.querySelector('.result-container');

    // Clear the existing content in the result-container
    resultContainer.innerHTML = '';

    // Create a new div for displaying the performance evaluation
    let resultContent = document.createElement('div');
    resultContent.className = 'generated-results';
    resultContent.innerHTML = `
        <h3>Performance Evaluation</h3>
        <p>Here is your performance evaluation based on the data:</p>
        <ul>
            <li><strong>Strengths:</strong> You excel in task completion and consistency.</li>
            <li><strong>Weaknesses:</strong> You need to improve on time management and efficiency in completing assignments.</li>
            <li><strong>Suggestions:</strong> Focus on improving your time allocation and explore tools for better efficiency.</li>
        </ul>
    `;
    resultContainer.appendChild(resultContent);

    // Create a "Back" button to go back to the chart
    let backButton = document.createElement('button');
    backButton.className = 'result-button';
    backButton.innerHTML = 'Back';
    resultContainer.appendChild(backButton);

    // Add event listener for the "Back" button
    backButton.addEventListener('click', function() {
        showChart();
    });
}