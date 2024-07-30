// JS/userappntmnt.js
$(document).ready(function() {
    $('#menu-toggle').click(function() {
        $('.sidebar').toggleClass('active');
        $('.content').toggleClass('active');
    });
});


document.addEventListener('DOMContentLoaded', function() {
    // Select the date input and time-slot container
    const dateInput = document.getElementById('birthday');
    const timeSlotContainer = document.getElementById('time-slot');

    // Function to generate time slots
    function generateTimeSlots() {
        // Array of sample time slots
        const times = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM'];
        let slotsHTML = '<h3>Available Time Slots</h3>';

        // Generate HTML for each time slot
        times.forEach(time => {
            slotsHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="time-slot" id="time-${time.replace(/:/g, '-').replace(/\s/g, '')}" value="${time}">
                    <label class="form-check-label" for="time-${time.replace(/:/g, '-').replace(/\s/g, '')}">
                        ${time}
                    </label>
                </div>`;
        });

        // Insert the slots into the time-slot container
        timeSlotContainer.innerHTML = slotsHTML;
    }

    // Event listener for date input change
    dateInput.addEventListener('change', function() {
        // Show the time slots after a date is selected
        if (dateInput.value) {
            generateTimeSlots();
        } else {
            // If no date is selected, show a message
            timeSlotContainer.innerHTML = '<h3>Time</h3><p>Please select a Date</p>';
        }
    });
});
