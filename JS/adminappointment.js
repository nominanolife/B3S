document.addEventListener("DOMContentLoaded", function() {
  const form = document.querySelector(".upper-container");

  // Prevent form submission
  form.addEventListener("submit", function(event) {
      event.preventDefault();
  });

  // Add button click event listener
  document.getElementById("btn-add").addEventListener("click", function() {
      const course = document.querySelector('input[name="course"]:checked');
      const date = document.getElementById("datepicker").value;
      const timeStart = document.getElementById("time-start").value;
      const timeEnd = document.getElementById("time-end").value;
      const slots = document.getElementById("slots").value;

      if (!course || !date || !timeStart || !timeEnd || !slots) {
          alert("Please fill out all fields.");
          return;
      }

      const formattedTimeStart = formatTimeToAMPM(timeStart);
      const formattedTimeEnd = formatTimeToAMPM(timeEnd);
      
      const row = document.createElement("tr");
      row.innerHTML = `
          <td>${course.value}</td>
          <td>${date}</td>
          <td>${formattedTimeStart}</td>
          <td>${formattedTimeEnd}</td>
          <td>${slots}</td>
          <td>
              <button class="btn-edit">Edit</button>
              <button class="btn-delete">Delete</button>
          </td>
      `;
      document.getElementById("slots-table-body").appendChild(row);

      // Clear form fields after adding
      clearForm();
  });

  // Clear button click event listener
  document.getElementById("btn-clear").addEventListener("click", function() {
      clearForm();
  });

  function clearForm() {
      const checkedRadio = document.querySelector('input[name="course"]:checked');
      if (checkedRadio) {
          checkedRadio.checked = false;
      }
      document.getElementById("datepicker").value = "";
      document.getElementById("time-start").value = "";
      document.getElementById("time-end").value = "";
      document.getElementById("slots").value = "";
  }

  // Event delegation for edit and delete buttons
  document.getElementById("slots-table-body").addEventListener("click", function(event) {
      if (event.target.classList.contains("btn-edit")) {
          // Handle edit functionality
          const row = event.target.closest("tr");
          // Populate the form with existing data
          const cells = row.getElementsByTagName("td");
          document.querySelector(`input[name="course"][value="${cells[0].textContent}"]`).checked = true;
          document.getElementById("datepicker").value = cells[1].textContent;
          
          // Convert time from AM/PM to 24-hour format for the input
          const [timeStartString, timeEndString] = [cells[2].textContent, cells[3].textContent];
          const timeStrings = [timeStartString, timeEndString];
          const timeIDs = ["time-start", "time-end"];
          
          timeStrings.forEach((timeString, index) => {
              const [time, period] = timeString.split(" ");
              let [hour, minute] = time.split(":");
              hour = parseInt(hour, 10);
              if (period === "PM" && hour < 12) hour += 12;
              if (period === "AM" && hour === 12) hour = 0;
              document.getElementById(timeIDs[index]).value = `${String(hour).padStart(2, "0")}:${minute}`;
          });
          
          document.getElementById("slots").value = cells[4].textContent;
          // Remove the row for editing
          row.remove();
      } else if (event.target.classList.contains("btn-delete")) {
          // Handle delete functionality
          const row = event.target.closest("tr");
          // Set the row to delete in global variable
          rowToDelete = row;
          // Show the modal
          deleteModal.show();
      }
  });

  // Function to format time to AM/PM
  function formatTimeToAMPM(time) {
      let [hour, minute] = time.split(":");
      hour = parseInt(hour, 10);
      const period = hour >= 12 ? "PM" : "AM";
      if (hour > 12) hour -= 12;
      if (hour === 0) hour = 12;
      return `${String(hour).padStart(2, "0")}:${minute} ${period}`;
  }

  // Calendar functionality
  const daysContainer = document.querySelector(".days");
  const nextBtn = document.querySelector(".next");
  const prevBtn = document.querySelector(".prev");
  const todayBtn = document.querySelector(".today");
  const month = document.querySelector(".month");

  const months = [
      "January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"
  ];

  const date = new Date();
  let currentMonth = date.getMonth();
  let currentYear = date.getFullYear();

  const renderCalendar = () => {
      date.setDate(1);
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const lastDayIndex = lastDay.getDay();
      const lastDayDate = lastDay.getDate();
      const prevLastDay = new Date(currentYear, currentMonth, 0);
      const prevLastDayDate = prevLastDay.getDate();
      const nextDays = 7 - lastDayIndex - 1;

      month.innerHTML = `${months[currentMonth]} ${currentYear}`;

      let days = "";

      for (let x = firstDay.getDay(); x > 0; x--) {
          days += `<div class="day prev">${prevLastDayDate - x + 1}</div>`;
      }

      for (let i = 1; i <= lastDayDate; i++) {
          if (
              i === new Date().getDate() &&
              currentMonth === new Date().getMonth() &&
              currentYear === new Date().getFullYear()
          ) {
              days += `<div class="day today">${i}</div>`;
          } else {
              days += `<div class="day">${i}</div>`;
          }
      }

      for (let j = 1; j <= nextDays; j++) {
          days += `<div class="day next">${j}</div>`;
      }

      daysContainer.innerHTML = days;
      hideTodayBtn();
  };

  nextBtn.addEventListener("click", () => {
      currentMonth++;
      if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
      }
      renderCalendar();
  });

  prevBtn.addEventListener("click", () => {
      currentMonth--;
      if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
      }
      renderCalendar();
  });

  todayBtn.addEventListener("click", () => {
      currentMonth = date.getMonth();
      currentYear = date.getFullYear();
      renderCalendar();
  });

  function hideTodayBtn() {
      if (
          currentMonth === new Date().getMonth() &&
          currentYear === new Date().getFullYear()
      ) {
          todayBtn.style.display = "none";
      } else {
          todayBtn.style.display = "flex";
      }
  }

  renderCalendar();
});

// Initialize Bootstrap Modal
const deleteModalElement = document.getElementById("deleteModal");
const deleteModal = new bootstrap.Modal(deleteModalElement);
let rowToDelete = null;

// Confirm delete
document.getElementById("confirmDeleteBtn").addEventListener("click", function() {
  if (rowToDelete) {
    rowToDelete.remove();
    deleteModal.hide();
    rowToDelete = null;
  }
});

