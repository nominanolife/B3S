import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

const daysContainer = document.querySelector(".days");
const nextBtn = document.querySelector(".next");
const prevBtn = document.querySelector(".prev");
const todayBtn = document.querySelector(".today");
const monthElement = document.querySelector(".month");
const timeBody = document.querySelector(".time-body"); // Select the time-body element
const bookButton = document.getElementById('btn-book');

// Handle missing booking button
if (!bookButton) {
  console.error('The booking button with id "btn-book" was not found.');
}

const months = [
  "January", "February", "March", "April", "May", "June", "July", 
  "August", "September", "October", "November", "December"
];

const date = new Date();
let currentMonth = date.getMonth();
let currentYear = date.getFullYear();
let appointments = []; // Array to hold fetched appointments
let currentUserUid = null;

// Fetch appointments from Firestore
async function fetchAppointments() {
  const querySnapshot = await getDocs(collection(db, "appointments"));
  appointments = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// Render the calendar for a specific month and year
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

    const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const appointment = appointments.find(app => app.date === fullDate);

    if (appointment) {
      // Highlight day based on appointment slots
      const totalSlots = appointment.slots;
      const bookedSlots = appointment.bookings ? appointment.bookings.length : 0;

      if (appointment.course === 'PDC') {
        if (bookedSlots >= totalSlots) {
          dayDiv.style.backgroundColor = "red"; // Full
        } else {
          dayDiv.style.backgroundColor = "green"; // Available PDC Course
        }
      } else {
        if (bookedSlots >= totalSlots) {
          dayDiv.style.backgroundColor = "red"; // Full
        }
        // For non-PDC appointments, do not set the color for available slots
      }

      // Add click event to show appointment details
      dayDiv.addEventListener('click', () => showAppointmentDetails(appointment, fullDate));
    }

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

// Update the right container with available time slots
function updateTimeSection(date) {
  const selectedAppointments = appointments.filter(app => app.date === date && app.course === 'PDC');

  timeBody.innerHTML = ''; // Clear previous content

  if (selectedAppointments.length === 0) {
    timeBody.innerHTML = '<p>No available slots for this date.</p>';
    bookButton.style.display = 'none'; // Hide the book button
    return;
  }

  selectedAppointments.forEach(appointment => {
    const { timeStart, timeEnd, slots, bookings } = appointment;
    const availableSlots = slots - (bookings ? bookings.length : 0);

    // Create radio button for each time slot
    const radioInput = document.createElement('input');
    radioInput.type = 'radio';
    radioInput.name = 'time-slot';
    radioInput.value = `${timeStart} - ${timeEnd}`;
    radioInput.id = `${timeStart}-${timeEnd}`;
    radioInput.dataset.date = date; // Add the date as a data attribute
    
    const label = document.createElement('label');
    label.htmlFor = radioInput.id;
    label.textContent = `${timeStart} - ${timeEnd} (${availableSlots} slots left)`;

    // Append radio button and label to the time body
    timeBody.appendChild(radioInput);
    timeBody.appendChild(label);
    timeBody.appendChild(document.createElement('br')); // Add line break for better layout
  });

  bookButton.style.display = 'block'; // Show the book button
}

// Show appointment details and update time section
function showAppointmentDetails(appointment, date) {
  updateTimeSection(date);
}

// Function to show notification modal
function showNotification(message) {
  const modalBody = document.getElementById('notificationModalBody');
  modalBody.textContent = message;
  $('#notificationModal').modal('show');
}

// Handle booking
async function handleBooking() {
  const selectedSlot = document.querySelector('input[name="time-slot"]:checked');
  if (!selectedSlot) {
      showNotification('Please select a time slot.');
      return;
  }

  const timeSlot = selectedSlot.value;
  const appointmentDate = selectedSlot.dataset.date;
  const appointment = appointments.find(app => app.date === appointmentDate && app.course === 'TDC');
  if (!appointment) {
      showNotification('No appointment found for the selected date.');
      return;
  }

  const bookedSlots = appointment.bookings ? appointment.bookings.length : 0;
  if (bookedSlots >= appointment.slots) {
      showNotification('This appointment is already fully booked.');
      return;
  }

  if (!currentUserUid) {
      showNotification('You must be logged in to book an appointment.');
      return;
  }

  const userHasBooked = appointment.bookings && appointment.bookings.some(booking => booking.userId === currentUserUid);
  if (userHasBooked) {
      showNotification('You have already booked a slot for this appointment.');
      return;
  }

  try {
      const appointmentRef = doc(db, "appointments", appointment.id);
      await updateDoc(appointmentRef, {
          bookings: [...(appointment.bookings || []), { timeSlot, userId: currentUserUid }]
      });

      const totalSlots = appointment.slots;
      const updatedBookings = [...(appointment.bookings || []), { timeSlot, userId: currentUserUid }];
      if (updatedBookings.length >= totalSlots) {
          await updateDoc(appointmentRef, { status: 'full' });
          const appointmentElement = document.querySelector(`[data-date="${appointment.date}"]`);
          if (appointmentElement) {
              appointmentElement.style.backgroundColor = "red";
          }
      }

      await fetchAppointments();
      renderCalendar(currentMonth, currentYear);
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

// Add event listener for the booking button
if (bookButton) {
  bookButton.addEventListener('click', handleBooking);
}

// Get current user UID
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserUid = user.uid;
  } else {
    currentUserUid = null;
  }
});

// Initial Render
fetchAppointments().then(() => {
  renderCalendar(currentMonth, currentYear);
});

document.getElementById('mySchedBtn').addEventListener('click', function() {
    window.location.href = 'usersched.html';
});
