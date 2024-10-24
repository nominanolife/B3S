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
const bookButton = document.getElementById('btn-book');

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

// Listen for real-time updates in the appointments collection
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

  // Check if the user has any active bookings (i.e., status is 'Booked' or 'In Progress')
  hasActiveBooking = appointments.some(app => 
    app.bookings && 
    app.bookings.some(booking => 
      booking.userId === currentUserUid && 
      (booking.status === 'Booked' || booking.status === 'In Progress') // Only consider these statuses as active
    )
  );

  renderCalendar(currentMonth, currentYear); // Re-render the calendar to reflect updates
});

// Render the calendar
function renderCalendar(month, year) {
  daysContainer.innerHTML = "";
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  monthElement.innerText = `${months[month]} ${year}`;
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const today = new Date();

  for (let i = firstDay - 1; i >= 0; i--) {
    const prevMonthDay = document.createElement("div");
    prevMonthDay.classList.add("day", "prev");
    prevMonthDay.innerText = prevMonthLastDay - i;
    daysContainer.appendChild(prevMonthDay);
  }

  for (let i = 1; i <= lastDay; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.classList.add("day");
    const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    
    // Find all appointments for the current date
    const appointmentsForDate = appointments.filter(app => app.date === fullDate && app.course === 'PDC-Motors');

    if (appointmentsForDate.length > 0) {
      let hasAvailableSlots = false;
    
      // Loop through all appointments to check for any available slots
      for (const appointment of appointmentsForDate) {
        const totalSlots = appointment.slots;
        const bookedSlots = appointment.bookings ? appointment.bookings.length : 0;
    
        if (bookedSlots < totalSlots) {
          hasAvailableSlots = true;
          break;  // Stop checking further if there's availability
        }
      }
    
      // Set the background color based on availability
      dayDiv.style.backgroundColor = hasAvailableSlots ? "green" : "red";
    
      const appointmentDate = new Date(fullDate);
      if (appointmentDate.toDateString() === today.toDateString()) {
        // Disable the tile if it's the day of the appointment
        dayDiv.style.pointerEvents = 'none';  // Disable click events
        dayDiv.style.opacity = '0.5';  // Dim the tile to indicate it's disabled
        dayDiv.title = 'Booking not allowed on the day of the appointment';
      } else if (!hasAvailableSlots) {
        // Disable the tile if it has no available slots
        dayDiv.style.pointerEvents = 'none';
        dayDiv.title = 'No available slots';
      } else {
        dayDiv.addEventListener('click', () => showAppointmentDetails(fullDate));
      }
    }    

    if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayDiv.classList.add("today");
    }

    dayDiv.innerText = i;
    daysContainer.appendChild(dayDiv);
  }

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
  const selectedAppointments = appointments.filter(app => app.date === date && app.course === 'PDC-Motors');
  timeBody.innerHTML = '';

  if (selectedAppointments.length === 0) {
    timeBody.innerHTML = '<p>No available slots for this date.</p>';
    bookButton.style.display = 'none';
    return;
  }

  let userHasBooked = false;

  selectedAppointments.forEach((appointment, index) => {
    const { timeStart, timeEnd, slots, bookings } = appointment;
    const availableSlots = slots - (bookings ? bookings.length : 0);
    const currentDate = new Date();
    const appointmentDateObj = new Date(date);

    // Check if the user has previously booked and canceled or rescheduled this slot
    const userBooking = bookings ? bookings.find(booking => 
      booking.userId === currentUserUid && 
      booking.timeSlot === `${timeStart} - ${timeEnd}` && 
      (booking.status === 'Cancelled' || booking.status === 'Rescheduled')) : null;

    if (userBooking) {
      if (availableSlots > 0 && appointmentDateObj > currentDate) {
        // Allow rebooking if slots are available and the appointment date is in the future
        userHasBooked = false; // Reset so the user can rebook
      } else {
        userHasBooked = true;
      }
    } else {
      userHasBooked = bookings && bookings.some(booking => booking.userId === currentUserUid);
    }

    // Create the radio input element
    const radioInput = document.createElement('input');
    radioInput.type = 'radio';
    radioInput.name = 'time-slot';
    radioInput.value = `${timeStart} - ${timeEnd}`;
    
    // Use a unique id for each radio input
    radioInput.id = `time-slot-${index}-${timeStart}-${timeEnd}`;
    
    radioInput.dataset.date = date;
    radioInput.dataset.appointmentId = appointment.id;

    // Apply the custom-radio class to the radio input's parent label
    const label = document.createElement('label');
    label.classList.add('custom-radio');
    
    // Ensure the label's `for` attribute matches the radio input's unique `id`
    label.htmlFor = radioInput.id;

    // Create the custom radio button styling
    const radioBtnSpan = document.createElement('span');
    radioBtnSpan.classList.add('radio-btn');

    // Set the label text content
    label.textContent = `${convertTo12Hour(timeStart)} - ${convertTo12Hour(timeEnd)} (${availableSlots} slots left)`;

    // Append the radio input and the styled span to the label
    label.insertBefore(radioInput, label.firstChild);
    label.appendChild(radioBtnSpan);

    // Append the label to the timeBody container
    timeBody.appendChild(label);

    // Add a line break for spacing (optional)
    timeBody.appendChild(document.createElement('br'));

    // Add an event listener for the radio input
    radioInput.addEventListener('click', () => {
      if (userHasBooked) {
        showNotification('You have already booked this slot.');
        radioInput.checked = false;
      }
    });
  });

  bookButton.style.display = userHasBooked ? 'none' : 'block';
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

  // Redirect to usersched.html after the notification modal closes, if the message indicates success
  if (message.includes('Booking successful')) {
    $('#notificationModal').on('hidden.bs.modal', function () {
      window.location.href = 'usersched.html';
    });
  }
}

async function handleBooking() {
  // Check if the user has an active booking when they try to book a slot
  if (hasActiveBooking) {
    showNotification('You already have an active or incomplete appointment. Please complete or cancel it before booking a new one.');
    return; // Stop the booking process if an active booking exists
  }

  const selectedSlot = document.querySelector('input[name="time-slot"]:checked');
  if (!selectedSlot) {
    showNotification('Please select a time slot.');
    return;
  }

  const timeSlot = selectedSlot.value;
  const appointmentDate = selectedSlot.dataset.date;
  const appointmentId = selectedSlot.dataset.appointmentId;
  const appointment = appointments.find(app => app.id === appointmentId);

  if (!appointment) {
    showNotification('No appointment found for the selected date.');
    return;
  }

  if (!currentUserUid) {
    showNotification('You must be logged in to book an appointment.');
    return;
  }

  const currentDate = new Date();
  const appointmentDateObj = new Date(appointmentDate);

  if (appointmentDateObj <= currentDate.setDate(currentDate.getDate() + 1)) {
    // Show the confirmation modal
    showConfirmationModal(async () => {
      await proceedWithBooking(selectedSlot, appointment);
    });
    return;
  }

  await proceedWithBooking(selectedSlot, appointment);
}

// Function to show the confirmation modal
function showConfirmationModal(callback) {
  const confirmButton = document.getElementById('confirmBooking');
  
  // Show the modal
  const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
  confirmationModal.show();

  // Attach event listener to the confirm button
  confirmButton.addEventListener('click', function handleConfirm() {
    // Execute the callback function when the user confirms
    callback();
    
    // Hide the modal
    confirmationModal.hide();
    
    // Clean up the event listener to avoid multiple triggers
    confirmButton.removeEventListener('click', handleConfirm);
  });
}

// Function to proceed with the booking
async function proceedWithBooking(selectedSlot, appointment) {
  const timeSlot = selectedSlot.value;
  const appointmentId = selectedSlot.dataset.appointmentId;

  const bookedSlots = appointment.bookings ? appointment.bookings.length : 0;
  if (bookedSlots >= appointment.slots) {
    showNotification('This appointment is already fully booked.');
    return;
  }

  try {
    const appointmentRef = doc(db, "appointments", appointment.id);
    await updateDoc(appointmentRef, {
      bookings: [...(appointment.bookings || []), { timeSlot, userId: currentUserUid, status: "Booked", progress: "Not yet Started"}]
    });

    const totalSlots = appointment.slots;
    const updatedBookings = [...(appointment.bookings || []), { timeSlot, userId: currentUserUid, status: "Booked", progress: "Not yet Started"}];
    if (updatedBookings.length >= totalSlots) {
      await updateDoc(appointmentRef, { status: 'full' });
      const appointmentElement = document.querySelector(`[data-date="${appointment.date}"]`);
      if (appointmentElement) {
        appointmentElement.style.backgroundColor = "red";
      }
    }

    showNotification('Booking successful!');

  } catch (error) {
    showNotification('Failed to book appointment. Please try again later.');
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

if (bookButton) {
  bookButton.addEventListener('click', handleBooking);
}

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

