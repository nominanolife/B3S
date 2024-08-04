const picker = new Pikaday({
  field: document.getElementById('datepicker'),
  format: 'YYYY-MM-DD',
  onSelect: function(date) {
      document.getElementById('datepicker').value = this.getMoment().format('YYYY-MM-DD');
  }
});

// Function to format time to AM/PM
function formatTimeToAMPM(timeString) {
    let [hour, minute] = timeString.split(':');
    hour = parseInt(hour, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // the hour '0' should be '12'
    minute = minute.padStart(2, '0');
    return `${hour}:${minute} ${ampm}`;
}

// Add button click event listener
document.getElementById('btn-add').addEventListener('click', function() {
  const course = document.querySelector('input[name="course"]:checked');
  const date = document.getElementById('datepicker').value;
  const time = document.getElementById('time').value;
  const slots = document.getElementById('slots').value;

  if (!course || !date || !time || !slots) {
      alert('Please fill out all fields.');
      return;
  }

  const formattedTime = formatTimeToAMPM(time);
  
  const row = document.createElement('tr');
  row.innerHTML = `
      <td>${course.value}</td>
      <td>${date}</td>
      <td>${formattedTime}</td>
      <td>${slots}</td>
      <td>
          <button class="btn-edit">Edit</button>
          <button class="btn-delete">Delete</button>
      </td>
  `;
  document.getElementById('slots-table-body').appendChild(row);

  // Clear form fields after adding
  clearForm();
});

// Clear button click event listener
document.getElementById('btn-clear').addEventListener('click', function() {
  clearForm();
});

function clearForm() {
  document.querySelector('input[name="course"]:checked').checked = false;
  document.getElementById('datepicker').value = '';
  document.getElementById('time').value = '';
  document.getElementById('slots').value = '';
}

// Event delegation for edit and delete buttons
document.getElementById('slots-table-body').addEventListener('click', function(event) {
  if (event.target.classList.contains('btn-edit')) {
      // Handle edit functionality
      const row = event.target.closest('tr');
      // Populate the form with existing data
      const cells = row.getElementsByTagName('td');
      document.querySelector(`input[name="course"][value="${cells[0].textContent}"]`).checked = true;
      document.getElementById('datepicker').value = cells[1].textContent;
      
      // Convert time from AM/PM to 24-hour format for the input
      const timeString = cells[2].textContent;
      const [time, period] = timeString.split(' ');
      let [hour, minute] = time.split(':');
      hour = parseInt(hour, 10);
      if (period === 'PM' && hour < 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      document.getElementById('time').value = `${hour}:${minute}`;
      
      document.getElementById('slots').value = cells[3].textContent;
      // Remove the row for editing
      row.remove();
  } else if (event.target.classList.contains('btn-delete')) {
      // Handle delete functionality
      const row = event.target.closest('tr');
      row.remove();
  }
});
