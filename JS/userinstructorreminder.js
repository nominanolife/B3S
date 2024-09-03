document.querySelector('.bi-arrow-left').addEventListener('click', function() {
    window.location.href = 'userinstructor.html';
});

document.addEventListener('DOMContentLoaded', () => {
    const findMatchBtn = document.getElementById('findMatchBtn');
    const loader = document.getElementById('loader');
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');

    findMatchBtn.addEventListener('click', () => {
        // Show the loader
        loader.style.display = 'flex';
        loadingBar.style.width = '0'; // Reset loading bar width
        loadingPercentage.textContent = '0%'; // Reset percentage text
        loadingPercentage.style.color = '#142A74'; // Dark color for initial text
        
        // Simulate loading progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            loadingBar.style.width = progress + '%';
            loadingPercentage.textContent = progress + '%';
            
            // Adjust text color based on progress
            if (progress > 48.5) {
                loadingPercentage.style.color = '#ffffff'; // Light color for better contrast
            } else {
                loadingPercentage.style.color = '#142A74'; // Dark color
            }
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    // Hide the loader
                    loader.style.display = 'none';
                    
                    // Navigate to the userinstructormatch.html page
                    window.location.href = 'userinstructormatch.html';
                }, 300);
            }
        }, 200); // Adjust speed as necessary
    });
});