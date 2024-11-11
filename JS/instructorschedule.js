import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, doc, deleteDoc, getDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

function showNotification(message) {
  document.getElementById('notificationModalBody').textContent = message;
  $('#notificationModal').modal('show');
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User is logged in:", user);

    // Render calendar only once during user login
    await renderCalendar(currentMonth, currentYear); 

    // Fetch availability to update the table and calendar
    fetchAvailability();
  } else {
    console.error("No user logged in");
  }
});

let editId = null; // To track the ID of the entry being edited

// DOM Elements
const daysContainer = document.querySelector(".days");
const nextBtn = document.querySelector(".next");
const prevBtn = document.querySelector(".prev");
const todayBtn = document.querySelector(".today");
const monthElement = document.querySelector(".month");
const addButton = document.getElementById("btn-add");
const dateInput = document.getElementById("datepicker");
const timeStartInput = document.getElementById("time-start");
const timeEndInput = document.getElementById("time-end");
const tableBody = document.querySelector(".table tbody");

// Month names
const months = [
  "January", "February", "March", "April", "May", "June", "July", 
  "August", "September", "October", "November", "December"
];

// Current date
const date = new Date();
let currentMonth = date.getMonth();
let currentYear = date.getFullYear();

async function renderCalendar(month, year) {
  daysContainer.innerHTML = ""; // Clear previous calendar days
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  monthElement.innerText = `${months[month]} ${year}`;
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const today = new Date();

  // Fetch bookings for the logged-in instructor
  const user = auth.currentUser;
  let bookedDates = [];
  if (user) {
    const instructorRef = doc(db, "availability", user.uid);
    const docSnapshot = await getDoc(instructorRef);
    if (docSnapshot.exists()) {
      bookedDates = docSnapshot.data().bookings.map((booking) => booking.date);
    }
  }

  // Render previous month's days
  for (let i = firstDay - 1; i >= 0; i--) {
    const prevMonthDay = document.createElement("div");
    prevMonthDay.classList.add("day", "prev");
    prevMonthDay.innerText = prevMonthLastDay - i;
    daysContainer.appendChild(prevMonthDay);
  }

  // Render current month's days
  for (let i = 1; i <= lastDay; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.classList.add("day");

    const currentDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    if (bookedDates.includes(currentDate)) {
      dayDiv.classList.add("booked"); // Highlight booked dates
      dayDiv.style.backgroundColor = "green";
    }

    if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayDiv.classList.add("today");
    }

    dayDiv.innerText = i;
    daysContainer.appendChild(dayDiv);

    // Add event listener for selecting a date
    dayDiv.addEventListener("click", () => {
      if (!dayDiv.classList.contains("prev") && !dayDiv.classList.contains("next")) {
        dateInput.value = currentDate;
        $('#availableInstructorModal').modal('show');
      }
    });
  }

  // Render next month's days
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

async function saveAvailability() {
  const course = document.querySelector('input[name="course"]:checked')?.value;
  const date = dateInput.value;
  const timeStart = timeStartInput.value;
  const timeEnd = timeEndInput.value;

  // Input validation
  if (!course || !date || !timeStart || !timeEnd) {
    showNotification("Please fill out all fields.");
    return;
  }

  // Get the logged-in user
  const user = auth.currentUser;
  if (!user) {
    showNotification("You must be logged in to book an appointment.");
    return;
  }

  const instructorId = user.uid;
  const instructorRef = doc(db, "availability", instructorId);
  const instructorDoc = doc(db, "instructors", instructorId); // Reference to the instructor document

  try {
    const docSnapshot = await getDoc(instructorRef);

    if (editId !== null) {
      // If editId is set, update the specific booking
      if (docSnapshot.exists()) {
        const bookings = docSnapshot.data().bookings || [];
        bookings[editId] = {
          course,
          date,
          timeStart,
          timeEnd,
        };

        // Update the document with the modified bookings array
        await updateDoc(instructorRef, { bookings });

        // Update the instructor's active status
        await updateDoc(instructorDoc, { active: bookings.length > 0 });

        showNotification("Availability updated successfully!");
      } else {
        showNotification("No bookings found for this instructor.");
      }
    } else {
      // Add a new booking
      if (docSnapshot.exists()) {
        const bookings = docSnapshot.data().bookings || [];
        bookings.push({
          course,
          date,
          timeStart,
          timeEnd,
        });

        // Update the document with the new bookings array
        await updateDoc(instructorRef, { bookings });

        // Update the instructor's active status
        await updateDoc(instructorDoc, { active: bookings.length > 0 });
      } else {
        // Create a new document if it doesn't exist
        await setDoc(instructorRef, {
          bookings: [
            {
              course,
              date,
              timeStart,
              timeEnd,
            },
          ],
        });

        // Set the instructor's active status to true
        await updateDoc(instructorDoc, { active: true });
      }
      showNotification("Availability saved successfully!");
    }
  } catch (error) {
    console.error("Error saving/updating availability: ", error);
    showNotification("Failed to save/update availability. Please try again.");
  }

  // Clear the form and reset state
  clearFields();
  renderTable(); // Refresh the table
  editId = null; // Reset the editId
  addButton.textContent = "Add"; // Change the button back to "Add"
}

function formatDateToMonthDayYear(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Utility function to format time in AM/PM
function formatTimeToAMPM(time24) {
  const [hours, minutes] = time24.split(":");
  const hoursInt = parseInt(hours);
  const period = hoursInt >= 12 ? "PM" : "AM";
  const hours12 = hoursInt % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

async function renderTable() {
  tableBody.innerHTML = ""; // Clear existing rows

  const user = auth.currentUser; // Get the logged-in user
  if (!user) {
    console.error("No user logged in");
    return;
  }

  const instructorId = user.uid;
  const instructorRef = doc(db, "availability", instructorId);

  try {
    const docSnapshot = await getDoc(instructorRef);

    if (docSnapshot.exists()) {
      const bookings = docSnapshot.data().bookings || [];

      bookings.forEach((booking, index) => {
        const row = document.createElement("tr");
        const formattedDate = formatDateToMonthDayYear(booking.date); // Format the booking date here
        const formattedStartTime = formatTimeToAMPM(booking.timeStart); // Format start time to AM/PM
        const formattedEndTime = formatTimeToAMPM(booking.timeEnd); // Format end time to AM/PM

        row.innerHTML = `
          <td>${booking.course}</td>
          <td>${formattedDate}</td>
          <td>${formattedStartTime} - ${formattedEndTime}</td>
          <td>
            <button class="btn btn-warning btn-edit" data-index="${index}">Edit</button>
            <button class="btn btn-danger btn-delete" data-index="${index}">Delete</button>
          </td>
        `;
        tableBody.appendChild(row);

        // Event listeners
        row.querySelector(".btn-edit").addEventListener("click", () => {
          populateFormForEdit(index, booking);
        });
        row.querySelector(".btn-delete").addEventListener("click", () => {
          deleteBooking(index);
        });
      });
    } else {
      console.warn("No bookings found for this instructor");
    }
  } catch (error) {
    console.error("Error fetching bookings:", error);
  }
}

function populateFormForEdit(index, booking) {
  editId = index; // Store the index of the booking being edited

  // Populate form fields with booking data
  dateInput.value = booking.date;
  timeStartInput.value = booking.timeStart;
  timeEndInput.value = booking.timeEnd;

  // Select the correct course radio button
  const courseRadio = document.querySelector(`input[name="course"][value="${booking.course}"]`);
  if (courseRadio) courseRadio.checked = true;

  // Change Add button to Update button
  addButton.textContent = "Update";
  addButton.classList.add("btn-update");
}

// Modify deleteBooking to use deleteModal for confirmation
async function deleteBooking(index) {
  // Store the index of the booking to be deleted in a global variable
  window.currentDeleteIndex = index;

  // Show the delete confirmation modal
  $('#deleteModal').modal('show');
}

// Event listener for the confirmDeleteBtn in deleteModal
document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    console.error("No user logged in");
    return;
  }

  const instructorId = user.uid;
  const instructorRef = doc(db, "availability", instructorId);

  try {
    const docSnapshot = await getDoc(instructorRef);
    if (docSnapshot.exists()) {
      const bookings = docSnapshot.data().bookings || [];
      // Use the global variable currentDeleteIndex to identify the booking to delete
      bookings.splice(window.currentDeleteIndex, 1); // Remove the booking at the specified index

      // Update Firestore with the modified bookings array
      await updateDoc(instructorRef, { bookings });

      showNotification("Booking deleted successfully!");

      // Close the modal
      $('#deleteModal').modal('hide');

      // Re-render the table and calendar
      renderTable();
      renderCalendar(currentMonth, currentYear);
    }
  } catch (error) {
    console.error("Error deleting booking:", error);
    showNotification("Failed to delete booking. Please try again.");
  }
});

// Event listener for the "Clear" button
const clearButton = document.getElementById("btn-clear");
clearButton.addEventListener("click", clearFields);

function clearFields() {
  // Reset all input fields
  dateInput.value = "";
  timeStartInput.value = "";
  timeEndInput.value = "";

  // Reset the course radio buttons
  const selectedCourse = document.querySelector('input[name="course"]:checked');
  if (selectedCourse) selectedCourse.checked = false;

  // Reset edit mode
  editId = null;
  addButton.textContent = "Add"; // Change button text back to "Add"
  addButton.classList.remove("btn-update");
}

function fetchAvailability() {
  const user = auth.currentUser;
  if (!user) {
    console.error("No user logged in");
    return;
  }

  const instructorRef = doc(db, "availability", user.uid);

  onSnapshot(instructorRef, async (docSnapshot) => {
    if (docSnapshot.exists()) {
      const bookings = docSnapshot.data().bookings || [];
      const active = bookings.length > 0;

      // Update the instructor's active status
      const instructorDoc = doc(db, "instructors", user.uid);
      await updateDoc(instructorDoc, { active });

      renderCalendar(currentMonth, currentYear); // Re-render the calendar
      renderTable(); // Update the table
    } else {
      // No availability document found, set active to false
      const instructorDoc = doc(db, "instructors", user.uid);
      await updateDoc(instructorDoc, { active: false });
    }
  });
}

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

addButton.addEventListener("click", async () => {
  await saveAvailability();
  dateInput.value = ""; // Clear inputs
  timeStartInput.value = "";
  timeEndInput.value = "";

  const selectedCourse = document.querySelector('input[name="course"]:checked');
  if (selectedCourse) selectedCourse.checked = false;
});

// Fetch availability on page load
fetchAvailability();
renderCalendar(currentMonth, currentYear);

document.getElementById("profileBtn").addEventListener("click", () => {
  window.location.href = "instructorprofile.html"; // Replace with the actual URL of the profile page
});
