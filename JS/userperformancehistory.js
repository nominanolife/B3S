// Select all rows in the table body
document.querySelectorAll('tbody tr').forEach(row => {
    // Find the status cell, assuming it's the 5th cell (index 4 in the table)
    const statusCell = row.querySelector('td:nth-child(5)');
    
    // Check the content of the status cell and add the appropriate class
    if (statusCell.textContent.trim() === 'Completed') {
        statusCell.classList.add('status-passed'); // Apply green color for "Completed"
    } else if (statusCell.textContent.trim() === 'Failed') {
        statusCell.classList.add('status-failed'); // Apply red color for "Failed"
    }
});

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

    const backButton = document.createElement('button');
    backButton.className = 'result-button';
    backButton.innerHTML = 'Back';
    resultContainer.appendChild(backButton);

    backButton.addEventListener('click', () => showChart(categoryScores));
}