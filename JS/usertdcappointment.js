const daysContainer = document.querySelector(".days");
const nextBtn = document.querySelector(".next");
const prevBtn = document.querySelector(".prev");
const todayBtn = document.querySelector(".today");
const monthElement = document.querySelector(".month");

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const date = new Date();
let currentMonth = date.getMonth();
let currentYear = date.getFullYear();

function renderCalendar(month, year) {
  daysContainer.innerHTML = ""; // Clear previous days

  // Get first day of the month
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();

  // Set the current month and year
  monthElement.innerText = `${months[month]} ${year}`;

  // Create day elements for previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const prevMonthDay = document.createElement("div");
    prevMonthDay.classList.add("day", "prev");
    prevMonthDay.innerText = prevMonthLastDay - i;
    daysContainer.appendChild(prevMonthDay);
  }

  // Create day elements for current month
  for (let i = 1; i <= lastDay; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.classList.add("day");
    if (i === date.getDate() && month === date.getMonth() && year === date.getFullYear()) {
      dayDiv.classList.add("today");
    }
    dayDiv.innerText = i;
    daysContainer.appendChild(dayDiv);
  }

  // Create day elements for next month
  const totalDays = firstDay + lastDay;
  const remainingDays = 7 - (totalDays % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDay = document.createElement("div");
      nextMonthDay.classList.add("day", "next");
      nextMonthDay.innerText = i;
      daysContainer.appendChild(nextMonthDay);
    }
  }
}

// Event Listeners
nextBtn.addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentMonth, currentYear);
});

prevBtn.addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar(currentMonth, currentYear);
});

todayBtn.addEventListener("click", () => {
  currentMonth = date.getMonth();
  currentYear = date.getFullYear();
  renderCalendar(currentMonth, currentYear);
});

// Initial Render
renderCalendar(currentMonth, currentYear);

document.addEventListener('DOMContentLoaded', function() {
    const mySchedBtn = document.getElementById('mySchedBtn');

    if (mySchedBtn) {
        mySchedBtn.addEventListener('click', function() {
            window.location.href = 'usersched.html';
        });
    }
});
