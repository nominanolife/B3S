const header = document.querySelector(".calendar h3");
const dates = document.querySelector(".dates");
const navs = document.querySelectorAll("#prev, #next");
const courseRadios = document.querySelectorAll('input[name="course"]');
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const slotsInput = document.getElementById("slots");
const addButton = document.querySelector(".btn-add");
const slotsTableBody = document.getElementById("slots-table-body");

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

let date = new Date();
let month = date.getMonth();
let year = date.getFullYear();
let availableSlots = {};

function renderCalendar() {
  const start = new Date(year, month, 1).getDay();
  const endDate = new Date(year, month + 1, 0).getDate();
  const end = new Date(year, month, endDate).getDay();
  const endDatePrev = new Date(year, month, 0).getDate();

  let datesHtml = "";

  for (let i = start; i > 0; i--) {
    datesHtml += `<li class="inactive">${endDatePrev - i + 1}</li>`;
  }

  for (let i = 1; i <= endDate; i++) {
    let className = "";
    if (availableSlots[`${year}-${month + 1}-${i}`]) {
      className =
        availableSlots[`${year}-${month + 1}-${i}`].slots === 0
          ? ' class="full"'
          : ' class="available"';
    } else {
      className =
        i === date.getDate() &&
        month === new Date().getMonth() &&
        year === new Date().getFullYear()
          ? ' class="today"'
          : "";
    }
    datesHtml += `<li${className}>${i}</li>`;
  }

  for (let i = end; i < 6; i++) {
    datesHtml += `<li class="inactive">${i - end + 1}</li>`;
  }

  dates.innerHTML = datesHtml;
  header.textContent = `${months[month]} ${year}`;
}

navs.forEach((nav) => {
  nav.addEventListener("click", (e) => {
    const btnId = e.target.id;

    if (btnId === "prev" && month === 0) {
      year--;
      month = 11;
    } else if (btnId === "next" && month === 11) {
      year++;
      month = 0;
    } else {
      month = btnId === "next" ? month + 1 : month - 1;
    }

    date = new Date(year, month, new Date().getDate());
    year = date.getFullYear();
    month = date.getMonth();

    renderCalendar();
  });
});

function addSlotToTable(course, date, time, slots) {
  const row = document.createElement("tr");
  row.innerHTML = `<td>${course}</td><td>${date}</td><td>${time}</td><td>${slots}</td>`;
  slotsTableBody.appendChild(row);
}

function addSlot() {
  const selectedCourse = document.querySelector('input[name="course"]:checked').value;
  const selectedDate = dateInput.value;
  const selectedTime = timeInput.value;
  const selectedSlots = parseInt(slotsInput.value);

  if (!selectedDate || !selectedTime || isNaN(selectedSlots)) {
    alert("Please fill in all fields.");
    return;
  }

  if (selectedSlots < 0) {
    alert("Slots cannot be negative.");
    return;
  }

  const slotKey = `${selectedDate}`;

  availableSlots[slotKey] = {
    course: selectedCourse,
    date: selectedDate,
    time: selectedTime,
    slots: selectedSlots,
  };

  addSlotToTable(selectedCourse, selectedDate, selectedTime, selectedSlots);
}

addButton.addEventListener("click", addSlot);

function updateCalendarDate() {
  const selectedDate = dateInput.value;
  const slots = availableSlots[selectedDate];

  if (slots) {
    dateInput.classList.remove("empty-date");
    dateInput.classList.add(slots.slots === 0 ? "full-date" : "available-date");
  } else {
    dateInput.classList.add("empty-date");
    dateInput.classList.remove("available-date", "full-date");
  }
}

dateInput.addEventListener("change", updateCalendarDate);

renderCalendar();

document.addEventListener('DOMContentLoaded', function () {
    const prevButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');
    const calendarHeader = document.querySelector('.calendar header h3');
    
    // Function to update calendar
    function updateCalendar(monthOffset) {
        const today = new Date();
        today.setMonth(today.getMonth() + monthOffset);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        calendarHeader.textContent = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const datesList = document.querySelector('.calendar .dates');
        datesList.innerHTML = '';

        // Fill in dates
        for (let i = 0; i < startOfMonth.getDay(); i++) {
            datesList.innerHTML += '<li></li>';
        }
        for (let i = 1; i <= endOfMonth.getDate(); i++) {
            datesList.innerHTML += `<li>${i}</li>`;
        }
    }

    // Initial calendar load
    updateCalendar(0);

    // Event listeners for navigation buttons
    prevButton.addEventListener('click', () => updateCalendar(-1));
    nextButton.addEventListener('click', () => updateCalendar(1));
});
