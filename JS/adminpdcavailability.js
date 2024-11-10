import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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
const bookButton = document.getElementById("btn-book");
const instructorTableBody = document.querySelector(".instructor-list-body table tbody"); // Table body for instructors
const modalBody = document.querySelector("#availableInstructorModal .modal-body");

// Month names
const months = [
  "January", "February", "March", "April", "May", "June", "July", 
  "August", "September", "October", "November", "December"
];

// Current date
const date = new Date();
let currentMonth = date.getMonth();
let currentYear = date.getFullYear();

// Unique instructor colors
let instructorColors = {};

// Fetch instructors and availability
async function fetchInstructorsAndAvailability() {
  const instructorSnapshot = await getDocs(collection(db, "instructors"));
  const availabilitySnapshot = await getDocs(collection(db, "availability"));

  const instructors = {};
  instructorSnapshot.forEach((doc) => {
    instructors[doc.id] = doc.data();
  });

  const availability = {};
  availabilitySnapshot.forEach((doc) => {
    availability[doc.id] = doc.data();
  });

  assignColorsToInstructors(instructors);
  renderCalendar(currentMonth, currentYear, instructors, availability);
  populateInstructorTable(instructors, availability); // Populate the table
}

// Assign unique colors to instructors
function assignColorsToInstructors(instructors) {
  const colors = [
    "#FF5733", "#33FF57", "#3357FF", "#FFC300", "#DAF7A6",
    "#C70039", "#900C3F", "#581845", "#8E44AD", "#2ECC71"
  ];

  let colorIndex = 0;
  for (const instructorId in instructors) {
    instructorColors[instructorId] = colors[colorIndex % colors.length];
    colorIndex++;
  }
}


// Render the calendar
function renderCalendar(month, year, instructors, availability) {
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

    const currentDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;

    // Check for availability and apply color
    for (const instructorId in availability) {
      const bookings = availability[instructorId]?.bookings || [];
      const matchedBooking = bookings.find((booking) => booking.date === currentDate);

      if (matchedBooking) {
        dayDiv.style.backgroundColor = instructorColors[instructorId];
        dayDiv.title = `Instructor: ${instructors[instructorId]?.name}\nCourse: ${matchedBooking.course}\nTime: ${matchedBooking.timeStart} - ${matchedBooking.timeEnd}`;
      }
    }

    if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayDiv.classList.add("today");
    }

    dayDiv.innerText = i;
    daysContainer.appendChild(dayDiv);

    // Updated: Add event listener to show modal for specific date
    dayDiv.addEventListener("click", () => {
      showModalForDate(currentDate, instructors, availability);
    });
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

// Updated Show Modal for a Specific Date
function showModalForDate(date, instructors, availability) {
  const modalTableBody = modalBody.querySelector("tbody");
  modalTableBody.innerHTML = ""; // Clear previous content

  let hasAppointments = false;

  // Loop through availability table to match the selected date
  for (const instructorId in availability) {
    const bookings = availability[instructorId]?.bookings || [];
    const matchedBookings = bookings.filter((booking) => booking.date === date);

    if (matchedBookings.length > 0) {
      hasAppointments = true;

      matchedBookings.forEach((booking) => {
        const instructor = instructors[instructorId];
        const instructorName = instructor?.name || "Unknown";

        const row = `
          <tr>
            <td>${instructorName}</td>
            <td>${booking.course}</td>
            <td>${booking.timeStart}</td>
            <td>${booking.timeEnd}</td>
          </tr>
        `;
        modalTableBody.innerHTML += row;
      });
    }
  }

  // If no appointments are available for the selected date
  if (!hasAppointments) {
    modalTableBody.innerHTML = `
      <tr>
        <td colspan="4">No appointments available for this date.</td>
      </tr>
    `;
  }

  $('#availableInstructorModal').modal('show'); // Show the modal
}

// Populate instructor table based on active status
function populateInstructorTable(instructors) {
  instructorTableBody.innerHTML = ""; // Clear previous rows

  for (const instructorId in instructors) {
    const instructor = instructors[instructorId];

    // Check active status and set availability message
    const availabilityStatus = instructor.active ? "Active" : "Unavailable";

    // Create table row with instructor information
    const row = `
      <tr>
        <td>${instructor.name}</td>
        <td>${instructor.courses.join(", ")}</td>
        <td>${availabilityStatus}</td>
      </tr>
    `;

    instructorTableBody.innerHTML += row; // Append row to the table body
  }
}

// Event Listeners
nextBtn.addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  fetchInstructorsAndAvailability();
});

prevBtn.addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  fetchInstructorsAndAvailability();
});

todayBtn.addEventListener("click", () => {
  currentMonth = date.getMonth();
  currentYear = date.getFullYear();
  fetchInstructorsAndAvailability();
});

if (bookButton) {
  bookButton.addEventListener("click", handleBooking);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is logged in:", user);
    fetchInstructorsAndAvailability();
  } else {
    console.error("No user logged in");
  }
});
