import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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
    const appointment = appointments.find(app => app.date === fullDate && app.course === 'TDC');

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
    const currentDate = new Date();
    const appointmentDateObj = new Date(date);

    const userBooking = bookings ? bookings.find(booking => 
      booking.userId === currentUserUid && 
      booking.timeSlot === `${timeStart} - ${timeEnd}` && 
      (booking.status === 'Cancelled' || booking.status === 'Rescheduled')) : null;

    if (userBooking) {
      if (availableSlots > 0 && appointmentDateObj > currentDate) {
        userHasBooked = false;
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

    radioInput.addEventListener('click', () => {
      if (userHasBooked) {
        showNotification('You have already booked this slot.');
        radioInput.checked = false;
      }
    });
  });

  bookButton.style.display = userHasBooked ? 'none' : 'block';
}

function showAppointmentDetails(date) {  
  updateTimeSection(date);
}

function convertTo12Hour(time24) {
  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

function showNotification(message) {
  const modalBody = document.getElementById('notificationModalBody');
  modalBody.textContent = message;
  $('#notificationModal').modal('show');
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
    // Show a confirmation modal
    const userConfirmed = confirm('Booking this appointment is not cancellable or reschedulable. Are you sure you want to proceed?');
    
    if (!userConfirmed) {
        return;
    }
  }

  const userExistingBookings = appointments.filter(app => 
    app.bookings && app.bookings.some(booking => 
      booking.userId === currentUserUid && 
      booking.status !== 'Cancelled' && 
      booking.status !== 'Rescheduled' && 
      booking.progress !== 'Completed'
    )
  );

  if (userExistingBookings.length > 0) {
    showNotification('You already have an ongoing appointment. Please cancel or reschedule it before booking a new one.');
    return;
  }

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

    await fetchAppointments();
    renderCalendar(currentMonth, currentYear);
    showNotification('Booking successful!');

    $('#notificationModal').on('hidden.bs.modal', function () {
      window.location.href = 'usersched.html';
    });

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

// Listen for real-time updates in the appointments collection
onSnapshot(collection(db, "appointments"), (snapshot) => {
  appointments = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  renderCalendar(currentMonth, currentYear); // Re-render the calendar to reflect updates
});

onAuthStateChanged(auth, (user) => {
  currentUserUid = user ? user.uid : null;
});

fetchAppointments().then(() => {
  renderCalendar(currentMonth, currentYear);
});
