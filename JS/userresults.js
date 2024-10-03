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
        const evaluationData = [
            { category: 'Parking', score: 20 },
            { category: 'Road Position', score: 92 },
            { category: 'Violation', score: 20 },
            { category: 'Emergencies', score: 90 },
            { category: 'Handling and Driving', score: 78 },
            { category: 'General Knowledge', score: 85 }
        ];
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
                    <li>Practice different parking techniques.</li>
                    <li>Focus on parallel and reverse parking skills.</li>
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

    // Add event listener for the "Back" button
    backButton.addEventListener('click', function() {
        showChart();
    });
}