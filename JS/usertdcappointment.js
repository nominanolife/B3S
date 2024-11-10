import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBflGD3TVFhlOeUBUPaX3uJTuB-KEgd0ow",
  authDomain: "authentication-d6496.firebaseapp.com",
  projectId: "authentication-d6496",
  storageBucket: "authentication-d6496.appspot.com",
  messagingSenderId: "195867894399",
  appId: "1:195867894399:web:596fb109d308aea8b6154a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
const daysContainer = document.querySelector(".days");
const nextBtn = document.querySelector(".next");
const prevBtn = document.querySelector(".prev");
const todayBtn = document.querySelector(".today");
const monthElement = document.querySelector(".month");
const timeBody = document.querySelector(".time-body");

// Month names
const months = [
  "January", "February", "March", "April", "May", "June", "July", 
  "August", "September", "October", "November", "December"
];

// Current date
const date = new Date();
let currentMonth = date.getMonth();
let currentYear = date.getFullYear();
let appointments = [];
let currentUserUid = null;
let hasActiveBooking = false; // Track if the user has an active/incomplete booking

onSnapshot(collection(db, "appointments"), (snapshot) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to the start of the day for accurate comparison

  appointments = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })).filter(app => {
    const appointmentDate = new Date(app.date);
    appointmentDate.setHours(0, 0, 0, 0); // Normalize to the start of the day
    return appointmentDate >= today; // Include today's and future appointments only
  });

  // Check if the user has any active bookings
  const userBooking = appointments.find(app =>
    app.bookings?.some(booking =>
      booking.userId === currentUserUid && booking.status === 'Booked'
    )
  );

  hasActiveBooking = !!userBooking;

  function convertTo12HourFormat(time24) {
    const [hour, minute] = time24.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert '0' hour to '12'
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  }  

  if (userBooking) {
    const { date, timeStart, timeEnd, bookings } = userBooking;
    const appointmentDate = new Date(date);
    const currentDate = new Date();
    const timeDifference = (appointmentDate - currentDate) / (1000 * 60 * 60 * 24); // Time difference in days
    const activeBooking = bookings.find((b) => b.userId === currentUserUid && b.status === 'Booked');
  
    const disableButtons = timeDifference < 2; // Disable if less than 2 days
    const cannotModifyNotice = timeDifference < 1; // Notice if 1 day or less
    
    if (activeBooking) {
    timeBody.innerHTML = `
      <div class="time-body-content">
        <div class="time-body-content-upper">
          <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p><strong>Time:</strong> ${convertTo12HourFormat(timeStart)} - ${convertTo12HourFormat(timeEnd)}</p>
        </div>
        <div class="time-body-content-lower">
          <button id="rescheduleButton" class="btn btn-warning" ${disableButtons ? 'disabled' : ''}>Reschedule</button>
          <button id="cancelButton" class="btn btn-danger" ${disableButtons ? 'disabled' : ''}>Cancel</button>
        </div>
        ${
          cannotModifyNotice
            ? `<p style="color: red; margin: 0px;"><strong>Note:</strong> You cannot modify your schedule less than 1 day before the appointment date.</p>`
            : ''
        }
      </div>
    `;
  
    // Add event listeners for buttons
    if (!disableButtons) {
      document.getElementById('rescheduleButton').addEventListener('click', () => {
        showActionConfirmationModal('Reschedule', userBooking);
      });
  
      document.getElementById('cancelButton').addEventListener('click', () => {
        showActionConfirmationModal('Cancel', userBooking);
      });
    }
  } else {
    timeBody.innerHTML = '<p>Please Select a Date first</p>';
  }
}

  renderCalendar(currentMonth, currentYear); // Re-render the calendar to reflect updates
});

function renderCalendar(month, year) {
  daysContainer.innerHTML = "";
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  monthElement.innerText = `${months[month]} ${year}`;
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const today = new Date();

  // Generate days for previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const prevMonthDay = document.createElement("div");
    prevMonthDay.classList.add("day", "prev");
    prevMonthDay.innerText = prevMonthLastDay - i;
    daysContainer.appendChild(prevMonthDay);
  }

  // Generate days for the current month
  for (let i = 1; i <= lastDay; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.classList.add("day");
    const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

    const appointmentsForDate = appointments.filter(
      (app) => app.date === fullDate && app.course === 'TDC'
    );

    if (appointmentsForDate.length > 0) {
      let hasAvailableSlots = false;
      let firstAvailableAppointment = null;

      // Check availability
      for (const appointment of appointmentsForDate) {
        const totalSlots = appointment.slots;
        const bookedSlots = appointment.bookings ? appointment.bookings.length : 0;

        if (bookedSlots < totalSlots) {
          hasAvailableSlots = true;
          firstAvailableAppointment = appointment; // Store the first available appointment
          break;
        }
      }

      // Update tile appearance and behavior
      dayDiv.style.backgroundColor = hasAvailableSlots ? "green" : "red";

      if (hasAvailableSlots) {
        dayDiv.addEventListener("click", () => {
          console.log('Clicked green tile:', fullDate, firstAvailableAppointment);
          if (firstAvailableAppointment) {
            handleBooking(firstAvailableAppointment.id);
          } else {
            showNotification('No available appointment found for this date.');
          }
        });
      }
    }

    if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayDiv.classList.add("today");
    }

    dayDiv.innerText = i;
    daysContainer.appendChild(dayDiv);
  }

  // Generate days for next month
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

async function updateTimeSection(date) {
  const selectedAppointments = appointments.filter(app => app.date === date && app.course === 'TDC');
  timeBody.innerHTML = '';

  if (selectedAppointments.length === 0) {
      timeBody.innerHTML = '<p>No available slots for this date.</p>';
      return;
  }

  selectedAppointments.forEach((appointment) => {
      const { timeStart, timeEnd, slots, bookings } = appointment;
      const availableSlots = calculateAvailableSlots(slots, bookings);

      // Create the time slot container
      const slotDiv = document.createElement('div');
      slotDiv.classList.add('slot');
      slotDiv.innerHTML = `
          <p>${convertTo12Hour(timeStart)} - ${convertTo12Hour(timeEnd)}</p>
          <p>${availableSlots} slots left</p>
      `;

      // Show booking actions
      const userBooking = bookings.find(booking => booking.userId === currentUserUid);
      if (!userBooking) {
          slotDiv.addEventListener('click', () => {
              showConfirmationModal(
                  {
                      date,
                      time: `${convertTo12Hour(timeStart)} - ${convertTo12Hour(timeEnd)}`,
                      remainingSlots: availableSlots,
                  },
                  () => proceedWithBooking(appointment.id)
              );
          });
      } else {
          // Add reschedule and cancel buttons for existing bookings
          const rescheduleButton = document.createElement('button');
          rescheduleButton.classList.add('btn', 'btn-warning');
          rescheduleButton.textContent = 'Reschedule';

          const cancelButton = document.createElement('button');
          cancelButton.classList.add('btn', 'btn-danger');
          cancelButton.textContent = 'Cancel';

          const appointmentDateObj = new Date(date);
          const today = new Date();
          const timeDifference = (appointmentDateObj - today) / (1000 * 60 * 60 * 24); // Days difference

          // Disable buttons if less than 2 days
          if (timeDifference < 2) {
              rescheduleButton.disabled = true;
              cancelButton.disabled = true;
          }

          slotDiv.appendChild(rescheduleButton);
          slotDiv.appendChild(cancelButton);

          rescheduleButton.addEventListener('click', () => {
              showNotification('Rescheduling is under development.');
          });

          cancelButton.addEventListener('click', async () => {
              await cancelBooking(appointment);
          });
      }

      timeBody.appendChild(slotDiv);
  });
}

// Show appointment details and time slots when a date is clicked
function showAppointmentDetails(date) {  
  updateTimeSection(date);
}

// Function to convert 24-hour time to 12-hour format
function convertTo12Hour(time24) {
  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

// Function to show notification modal
function showNotification(message) {
  const modalBody = document.getElementById('notificationModalBody');
  modalBody.textContent = message;
  $('#notificationModal').modal('show');
}

async function handleBooking(appointmentId) {
  if (hasActiveBooking) {
    showNotification('You can only book one schedule at a time. Please Cancel or Reschedule your current booking to book another.');
    return;
  }

  const appointment = appointments.find((app) => app.id === appointmentId);
  if (!appointment) {
    showNotification('No appointment found. Please refresh and try again.');
    return;
  }

  const timeSlot = `${appointment.timeStart} - ${appointment.timeEnd}`;

  showConfirmationModal(
    {
      date: appointment.date,
      time: timeSlot, // Pass the formatted timeSlot to the modal
      remainingSlots: appointment.slots - (appointment.bookings?.length || 0),
      appointmentId: appointment.id,
      timeSlot, // Pass timeSlot explicitly
    },
    async (id) => {
      // Confirmed, proceed with booking
      await proceedWithBooking(timeSlot, id); // Pass timeSlot and appointmentId
    }
  );
}

function convertTo12HourFormat(time24) {
  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12; // Convert '0' hour to '12'
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

function showConfirmationModal(data, onConfirm) {
  const confirmButton = document.getElementById('confirmBooking');
  const cancelButton = document.getElementById('cancelBooking');
  const modalSelectedDate = document.getElementById('modalSelectedDate');
  const modalSelectedTime = document.getElementById('modalSelectedTime');
  const modalRemainingSlots = document.getElementById('modalRemainingSlots');

  // Format date and time
  const appointmentDate = new Date(data.date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });
  const formattedTime = convertTo12HourFormat(data.time.split(' - ')[0]) + ' - ' + convertTo12HourFormat(data.time.split(' - ')[1]);

  // Populate modal with appointment details
  modalSelectedDate.textContent = formattedDate;
  modalSelectedTime.textContent = formattedTime;
  modalRemainingSlots.textContent = `${data.remainingSlots} slots remaining`;

  // Create a Bootstrap modal instance
  const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));

  // Attach event listener to the confirm button
  function handleConfirm() {
    onConfirm(data.appointmentId); // Pass the appointmentId to the callback
    confirmationModal.hide(); // Close the modal
    confirmButton.removeEventListener('click', handleConfirm); // Clean up the event listener
  }

  confirmButton.addEventListener('click', handleConfirm);

  // Attach event listener to the cancel button
  cancelButton.addEventListener('click', () => {
    console.log('Booking cancelled by user');
    confirmationModal.hide(); // Manually close the modal
  });

  // Show the modal
  confirmationModal.show();
}
function calculateAvailableSlots(totalSlots, bookings) {
  return totalSlots - bookings.filter(booking => booking.status === "Booked").length;
}

async function proceedWithBooking(timeSlot, appointmentId) {
  if (!appointmentId) {
    showNotification('No appointment found. Please refresh and try again.');
    return;
  }

  const appointment = appointments.find((app) => app.id === appointmentId);
  if (!appointment) {
    showNotification('No appointment found for the selected slot.');
    return;
  }

  // Extract `timeStart` and `timeEnd` from the appointment object
  const { timeStart, timeEnd, bookings = [] } = appointment;

  // Construct the time slot if not provided
  if (!timeSlot) {
    timeSlot = `${convertTo12HourFormat(timeStart)} - ${convertTo12HourFormat(timeEnd)}`;
  }

  const bookedSlots = bookings.filter(booking => booking.status === 'Booked').length;

  if (bookedSlots >= appointment.slots) {
    showNotification('This appointment is already fully booked.');
    return;
  }

  try {
    const appointmentRef = doc(db, 'appointments', appointment.id);

    // Update bookings array by adding the new booking
    const updatedBookings = [
      ...bookings,
      {
        timeSlot, // Include the timeSlot in the booking
        userId: currentUserUid,
        status: 'Booked',
        progress: 'Not yet Started', // Default progress
      },
    ];

    // Update the Firestore document
    await updateDoc(appointmentRef, { bookings: updatedBookings });

    // Mark as full if all slots are booked
    if (updatedBookings.filter(booking => booking.status === 'Booked').length >= appointment.slots) {
      await updateDoc(appointmentRef, { status: 'full' });
    }

    // Determine time difference to enable/disable buttons
    const currentDate = new Date();
    const appointmentDate = new Date(appointment.date);
    const timeDifference = (appointmentDate - currentDate) / (1000 * 60 * 60 * 24); // Time difference in days

    const disableButtons = timeDifference < 2; // Disable if less than 2 days
    const cannotModifyNotice = timeDifference < 1; // Notice if 1 day or less

    // Populate the right container with appointment details and buttons
    timeBody.innerHTML = `
      <div class="time-body-content">
        <div class="time-body-content-upper">
          <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p><strong>Time:</strong> ${convertTo12HourFormat(timeStart)} - ${convertTo12HourFormat(timeEnd)}</p>
        </div>
        <div class="time-body-content-lower">
          <button id="rescheduleButton" class="btn btn-warning" ${disableButtons ? 'disabled' : ''}>Reschedule</button>
          <button id="cancelButton" class="btn btn-danger" ${disableButtons ? 'disabled' : ''}>Cancel</button>
        </div>
        ${
          cannotModifyNotice
            ? `<p style="color: red; margin: 0px;"><strong>Note:</strong> You cannot modify your schedule less than 1 day before the appointment date.</p>`
            : ''
        }
      </div>
    `;

    // Add event listeners for the buttons
    if (!disableButtons) {
      document.getElementById('rescheduleButton').addEventListener('click', () => {
        showActionConfirmationModal('Reschedule', appointment);
      });

      document.getElementById('cancelButton').addEventListener('click', () => {
        showActionConfirmationModal('Cancel', appointment);
      });
    }

    showNotification('Booking Successful!');
    renderCalendar(currentMonth, currentYear); // Refresh calendar
  } catch (error) {
    console.error('Error during booking:', error);
    showNotification('Failed to book appointment. Please try again later.');
  }
}


async function cancelBooking(appointment) {
  try {
      const appointmentRef = doc(db, "appointments", appointment.id);

      // Update bookings
      const updatedBookings = appointment.bookings.map((booking) => {
          if (booking.userId === currentUserUid) {
              return { ...booking, status: "Cancelled" };
          }
          return booking;
      });

      await updateDoc(appointmentRef, {
          bookings: updatedBookings,
      });

      showNotification("Your booking has been successfully canceled.");
      renderCalendar(currentMonth, currentYear);
      timeBody.innerHTML = '<p>Please Select a Date First</p>';
  } catch (error) {
      console.error("Error during booking cancellation:", error);
      showNotification("Failed to cancel your booking. Please try again.");
  }
}

async function reschedBooking(appointment) {
  try {
      const appointmentRef = doc(db, "appointments", appointment.id);

      // Update bookings
      const updatedBookings = appointment.bookings.map((booking) => {
          if (booking.userId === currentUserUid) {
              return { ...booking, status: "Rescheduled" };
          }
          return booking;
      });

      await updateDoc(appointmentRef, {
          bookings: updatedBookings,
      });

      showNotification("Your booking has been successfully rescheduled.");
      renderCalendar(currentMonth, currentYear);
      timeBody.innerHTML = '<p>Please Select a Date First</p>';
  } catch (error) {
      console.error("Error during booking rescheduling:", error);
      showNotification("Failed to reschedule your booking. Please try again.");
  }
}

function showActionConfirmationModal(action, appointment) {
  const modal = document.getElementById('confModal');
  const modalTitle = document.getElementById('confModalTitle');
  const modalBody = document.getElementById('confModalBody');
  const confirmButton = document.getElementById('confirmAction');
  const cancelButton = document.getElementById('cancelBooking'); // Assuming cancel button ID

  if (!modal) {
    console.error("Modal element not found!");
    return;
  }

  // Update modal content
  modalTitle.textContent = `${action} Confirmation`;
  modalBody.textContent = `Are you sure you want to ${action.toLowerCase()} this appointment?`;

  // Create a new Bootstrap modal instance
  const bootstrapModal = new bootstrap.Modal(modal);

  // Attach event listener for confirmation
  const handleConfirm = async () => {
    try {
      if (action === 'Cancel') {
        await cancelBooking(appointment); // Call cancelBooking for cancel action
      } else if (action === 'Reschedule') {
        await reschedBooking(appointment); // Call reschedBooking for reschedule action
      }

      showNotification(`${action} successful.`);
      bootstrapModal.hide(); // Close the modal after success
    } catch (error) {
      console.error(`Error during ${action.toLowerCase()}:`, error);
      showNotification(`Failed to ${action.toLowerCase()} the booking. Please try again.`);
    } finally {
      confirmButton.removeEventListener('click', handleConfirm); // Cleanup event listener
    }
  };

  confirmButton.addEventListener('click', handleConfirm);

  // Attach event listener for cancel button
  cancelButton.addEventListener('click', () => {
    bootstrapModal.hide(); // Close the modal
  });

  // Show the modal
  bootstrapModal.show();
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

onAuthStateChanged(auth, (user) => {
  currentUserUid = user ? user.uid : null;
});

renderCalendar(currentMonth, currentYear);
// JavaScript for sidebar toggle
document.getElementById('toggleSidebarBtn').addEventListener('click', function() {
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');

  // Toggle the 'active' class to show or hide the sidebar
  sidebar.classList.toggle('active');
  mainContent.classList.toggle('active');
});
