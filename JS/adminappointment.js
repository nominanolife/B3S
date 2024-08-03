const daysTag = document.querySelector(".days"),
    currentDate = document.querySelector(".current-date"),
    prevNextIcon = document.querySelectorAll(".icons span");

let date = new Date(),
    currYear = date.getFullYear(),
    currMonth = date.getMonth(),
    selectedDate = null;

const months = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

const renderCalendar = () => {
    let firstDayofMonth = new Date(currYear, currMonth, 1).getDay(),
        lastDateofMonth = new Date(currYear, currMonth + 1, 0).getDate(),
        lastDayofMonth = new Date(currYear, currMonth, lastDateofMonth).getDay(),
        lastDateofLastMonth = new Date(currYear, currMonth, 0).getDate();
    let liTag = "";

    // Days from the previous month
    for (let i = firstDayofMonth; i > 0; i--) {
        liTag += `<li class="inactive">${lastDateofLastMonth - i + 1}</li>`;
    }

    // Days of the current month
    for (let i = 1; i <= lastDateofMonth; i++) {
        let isToday = i === date.getDate() && currMonth === new Date().getMonth() 
                     && currYear === new Date().getFullYear() ? "active" : "";
        let isSelected = (selectedDate && i === selectedDate) ? "selected" : "";
        liTag += `<li class="${isToday} ${isSelected}" data-date="${i}">${i}</li>`;
    }

    // Days from the next month
    for (let i = lastDayofMonth; i < 6; i++) {
        liTag += `<li class="inactive">${i - lastDayofMonth + 1}</li>`;
    }

    currentDate.innerText = `${months[currMonth]} ${currYear}`;
    daysTag.innerHTML = liTag;

    // Add click event listeners to all date elements
    document.querySelectorAll(".days li").forEach(dateElem => {
        dateElem.addEventListener("click", () => {
            if (!dateElem.classList.contains("inactive")) {
                // Remove 'selected' class from previously selected date
                document.querySelectorAll(".days li.selected").forEach(elem => elem.classList.remove("selected"));
                
                // Set new selected date
                selectedDate = parseInt(dateElem.getAttribute("data-date"));
                dateElem.classList.add("selected");
                
                // Log the selected date for debugging
                console.log(`Selected date: ${selectedDate}`);
            }
        });
    });
}

renderCalendar();

prevNextIcon.forEach(icon => {
    icon.addEventListener("click", () => {
        currMonth = icon.id === "prev" ? currMonth - 1 : currMonth + 1;

        if (currMonth < 0 || currMonth > 11) {
            date = new Date(currYear, currMonth, new Date().getDate());
            currYear = date.getFullYear();
            currMonth = date.getMonth();
        } else {
            date = new Date();
        }
        renderCalendar();
    });
});

// JavaScript for calendar functionality (adminappointment.js)

// Placeholder for JavaScript to initialize datepicker or other functionalities
document.addEventListener('DOMContentLoaded', function () {
    // Example of a basic datepicker initialization, you might need a library or custom implementation
    // Initialize your datepicker here (e.g., using jQuery UI or another library)

    const dateInput = document.getElementById('datepicker');
    dateInput.addEventListener('click', function () {
        // Implement your calendar popup or datepicker logic
        alert('Datepicker clicked!'); // Placeholder action
    });
});

