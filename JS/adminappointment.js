const header = document.querySelector(".calendar h3");
const dates = document.querySelector(".dates");
const navs = document.querySelectorAll("#prev, #next");
const courseRadios = document.querySelectorAll('input[name="course"]');
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const slotsInput = document.getElementById("slots");
const addButton = document.querySelector(".btn-add");
const clearButton = document.querySelector(".btn-clear");
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
    const slotKey = `${year}-${month + 1}-${i}`;
    if (availableSlots[slotKey]) {
      className = availableSlots[slotKey].slots === 0 ? ' class="full"' : ' class="available"';
    } else {
      className = i === date.getDate() && month === new Date().getMonth() && year === new Date().getFullYear() ? ' class="today"' : "";
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

    renderCalendar();
  });
});

function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function addSlotToTable(course, date, time, slots) {
  const row = document.createElement("tr");
  row.innerHTML = `<td>${course}</td><td>${date}</td><td>${time}</td><td>${slots}</td>`;
  slotsTableBody.appendChild(row);
}

function addSlot() {
  console.log("addSlot function triggered"); // Debugging log
  const selectedCourse = document.querySelector('input[name="course"]:checked');
  if (!selectedCourse) {
    alert("Please select a course.");
    return;
  }
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
    course: selectedCourse.value,
    date: selectedDate,
    time: selectedTime,
    slots: selectedSlots,
  };

  addSlotToTable(selectedCourse.value, selectedDate, formatTime(selectedTime), selectedSlots);
}

function clearFields() {
  console.log("clearFields function triggered"); // Debugging log
  // Clear the radio button selection
  courseRadios.forEach(radio => {
    radio.checked = false;
  });

  // Clear the date, time, and slots input fields
  dateInput.value = "";
  timeInput.value = "";
  slotsInput.value = "";
}

addButton.addEventListener("click", addSlot);
clearButton.addEventListener("click", clearFields);

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
function addSlotToTable(course, date, time, slots) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${course}</td>
    <td>${date}</td>
    <td>${formatTime(time)}</td>
    <td>${slots}</td>
    <td>
      <button class="btn-delete">Delete</button>
    </td>`;
  slotsTableBody.appendChild(row);
}

function handleTableAction(event) {
  if (event.target.classList.contains("btn-delete")) {
    // Delete logic here
    const row = event.target.closest("tr");
    row.remove();
  }
}

document.addEventListener("click", handleTableAction);
function addSlotToTable(course, date, time, slots) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${course}</td>
    <td>${date}</td>
    <td>${formatTime(time)}</td>
    <td>${slots}</td>
    <td>
      <button class="btn-delete"><i class="fas fa-trash"></i></button>
    </td>`;
  slotsTableBody.appendChild(row);
}
