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

// Listen for real-time updates in the appointments collection
onSnapshot(collection(db, "appointments"), (snapshot) => {
  appointments = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
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
    const appointment = appointments.find(app => app.date === fullDate && app.course === 'PDC-Motors');

    if (appointment) {
      const totalSlots = appointment.slots;
      const bookedSlots = appointment.bookings ? appointment.bookings.length : 0;

      dayDiv.style.backgroundColor = bookedSlots >= totalSlots ? "red" : "green";

      const appointmentDate = new Date(fullDate);
      if (appointmentDate.toDateString() === today.toDateString()) {
        // Disable the tile if it's the day of the appointment
        dayDiv.style.pointerEvents = 'none'; // Disable click events
        dayDiv.style.opacity = '0.5'; // Dim the tile to indicate it's disabled
        dayDiv.title = 'Booking not allowed on the day of the appointment';
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

  selectedAppointments.forEach(appointment => {
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

    const radioInput = document.createElement('input');
    radioInput.type = 'radio';
    radioInput.name = 'time-slot';
    radioInput.value = `${timeStart} - ${timeEnd}`;
    radioInput.id = `${timeStart}-${timeEnd}`;
    radioInput.dataset.date = date;
    radioInput.dataset.appointmentId = appointment.id;

    const label = document.createElement('label');
    label.htmlFor = radioInput.id;
    label.textContent = `${convertTo12Hour(timeStart)} - ${convertTo12Hour(timeEnd)} (${availableSlots} slots left)`;
    timeBody.appendChild(radioInput);
    timeBody.appendChild(label);
    timeBody.appendChild(document.createElement('br'));

    // Add click event listener for radio buttons
    radioInput.addEventListener('click', () => {
      if (userHasBooked) {
        showNotification('You have already booked this slot.');
        radioInput.checked = false; // Uncheck the radio button
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
      bookings: [...(appointment.bookings || []), { timeSlot, userId: currentUserUid, status: "Booked", progress: "In Progress" }]
    });

    const totalSlots = appointment.slots;
    const updatedBookings = [...(appointment.bookings || []), { timeSlot, userId: currentUserUid, status: "Booked", progress: "In Progress" }];
    if (updatedBookings.length >= totalSlots) {
      await updateDoc(appointmentRef, { status: 'full' });
      const appointmentElement = document.querySelector(`[data-date="${appointment.date}"]`);
      if (appointmentElement) {
        appointmentElement.style.backgroundColor = "red";
      }
    }

    showNotification('Booking successful!');

  } catch (error) {
    console.error("Error updating booking:", error);
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
