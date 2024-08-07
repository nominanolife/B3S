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

// DOM Elements
const daysContainer = document.querySelector(".days");
const nextBtn = document.querySelector(".next");
const prevBtn = document.querySelector(".prev");
const todayBtn = document.querySelector(".today");
const monthElement = document.querySelector(".month");
const timeBody = document.querySelector(".time-body");
const bookButton = document.getElementById('btn-book');

// Modal elements
const modal = document.getElementById('notificationModal');
const modalMessage = document.getElementById('modalMessage');
const closeModal = document.querySelector('#notificationModal .close');

// Check if booking button exists
if (!bookButton) {
  console.error('The booking button with id "btn-book" was not found.');
}

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

// Fetch appointments from Firestore
async function fetchAppointments() {
  try {
    const querySnapshot = await getDocs(collection(db, "appointments"));
    appointments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching appointments:", error);
  }
}

// Render the calendar
function renderCalendar(month, year) {
  daysContainer.innerHTML = "";
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  monthElement.innerText = `${months[month]} ${year}`;
  const prevMonthLastDay = new Date(year, month, 0).getDate();

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
    const appointment = appointments.find(app => app.date === fullDate);

    if (appointment) {
      const totalSlots = appointment.slots;
      const bookedSlots = appointment.bookings ? appointment.bookings.length : 0;

      if (appointment.course === 'TDC') {
        dayDiv.style.backgroundColor = bookedSlots >= totalSlots ? "red" : "green";
      } else {
        dayDiv.style.backgroundColor = bookedSlots >= totalSlots ? "red" : "";
      }

      dayDiv.addEventListener('click', () => showAppointmentDetails(appointment, fullDate));
    }

    if (i === date.getDate() && month === date.getMonth() && year === date.getFullYear()) {
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

// Update available time slots
function updateTimeSection(date) {
  const selectedAppointments = appointments.filter(app => app.date === date && app.course === 'TDC');
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
    userHasBooked = bookings && bookings.some(booking => booking.userId === currentUserUid);

    const radioInput = document.createElement('input');
    radioInput.type = 'radio';
    radioInput.name = 'time-slot';
    radioInput.value = `${timeStart} - ${timeEnd}`;
    radioInput.id = `${timeStart}-${timeEnd}`;
    radioInput.dataset.date = date;

    const label = document.createElement('label');
    label.htmlFor = radioInput.id;
    label.textContent = `${timeStart} - ${timeEnd} (${availableSlots} slots left) ${userHasBooked ? "(Already booked)" : ""}`;
    timeBody.appendChild(radioInput);
    timeBody.appendChild(label);
    timeBody.appendChild(document.createElement('br'));

    // Add click event listener for radio buttons
    radioInput.addEventListener('click', () => {
      if (userHasBooked) {
        showModal('You have already have booked a slot');
        radioInput.checked = false; // Uncheck the radio button
      }
    });
  });

  bookButton.style.display = userHasBooked ? 'none' : 'block';
}

// Show appointment details
function showAppointmentDetails(appointment, date) {
  updateTimeSection(date);
}

// Handle booking
async function handleBooking() {
  const selectedSlot = document.querySelector('input[name="time-slot"]:checked');
  if (!selectedSlot) {
    alert('Please select a time slot.');
    return;
  }

  const timeSlot = selectedSlot.value;
  const appointmentDate = selectedSlot.dataset.date;
  const appointment = appointments.find(app => app.date === appointmentDate && app.course === 'TDC');
  if (!appointment) {
    alert('No appointment found for the selected date.');
    return;
  }

  const bookedSlots = appointment.bookings ? appointment.bookings.length : 0;
  if (bookedSlots >= appointment.slots) {
    alert('This appointment is already fully booked.');
    return;
  }

  if (!currentUserUid) {
    alert('You must be logged in to book an appointment.');
    return;
  }

  const userHasBooked = appointment.bookings && appointment.bookings.some(booking => booking.userId === currentUserUid);
  if (userHasBooked) {
    alert('You have already booked a slot for this appointment.');
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
    alert('Booking successful!');
  } catch (error) {
    console.error("Error updating booking:", error);
    alert('Failed to book appointment. Please try again later.');
  }
}

// Modal handling
function showModal(message) {
  modalMessage.textContent = message;
  modal.style.display = 'block';
}

function hideModal() {
  modal.style.display = 'none';
}

closeModal.addEventListener('click', hideModal);

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

fetchAppointments().then(() => {
  renderCalendar(currentMonth, currentYear);
});

document.getElementById('mySchedBtn').addEventListener('click', function() {
  window.location.href = 'usersched.html';
});
