document.addEventListener("DOMContentLoaded", () => {
    // Select the Filipino and English divs
    const filipinoOption = document.querySelector('.filipino');
    const englishOption = document.querySelector('.english');

    // Function to handle language selection
    const handleLanguageSelection = (language) => {
        // Save selected language to localStorage
        localStorage.setItem('selectedLanguage', language);

        // Redirect to quiz page
        window.location.href = 'userquiz.html'; // Replace with your quiz page URL
    };

    // Add click event listeners
    filipinoOption.addEventListener('click', () => {
        handleLanguageSelection('F  ilipino');
    });

    englishOption.addEventListener('click', () => {
        handleLanguageSelection('English');
    });
});
