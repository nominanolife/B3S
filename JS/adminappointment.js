import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", async function() {
    const form = document.querySelector(".upper-container");
    let selectedAppointmentId = null;

    // Initialize Bootstrap Modals
    const deleteModalElement = document.getElementById("deleteModal");
    const deleteModal = new bootstrap.Modal(deleteModalElement);
    let rowToDelete = null;

    const successModalElement = document.getElementById("successModal");
    const successModal = new bootstrap.Modal(successModalElement);

    // Prevent form submission
    form.addEventListener("submit", function(event) {
        event.preventDefault();
    });

    // Add button click event listener for adding an appointment
    document.getElementById("btn-add").addEventListener("click", async function() {
        await saveAppointment();
    });

    // Update button click event listener for updating an appointment
    document.getElementById("btn-update").addEventListener("click", async function() {
        await saveAppointment();
    });

    document.getElementById("slots").addEventListener("input", function() {
        // Remove non-numeric characters
        this.value = this.value.replace(/[^0-9]/g, '');
    });
    
    async function saveAppointment() {
        const course = document.querySelector('input[name="course"]:checked');
        const date = document.getElementById("datepicker").value;
        const timeStart = document.getElementById("time-start").value;
        const timeEnd = document.getElementById("time-end").value;
        const slotsValue = document.getElementById("slots").value;
        const slots = parseInt(slotsValue, 10);
        
        if (!course || !date || !timeStart || !timeEnd || isNaN(slots) || slots <= 0) {
            showSuccessModal("Please fill out all fields correctly and enter a valid number of slots.");
            return;
        }
        
        // Validate the date
        const today = new Date();
        const selectedDate = new Date(date);
        
        if (selectedDate.toString() === "Invalid Date") {
            showSuccessModal("Please enter a valid date.");
            return;
        }
        
        if (selectedDate < today.setHours(0, 0, 0, 0)) {
            showSuccessModal("The selected date has been passed. Please choose another date.");
            return;
        }
        
        if (selectedDate.toDateString() === today.toDateString()) {
            // Allow today's date
        }
        
        // Validate the time: Start time and End time cannot be the same
        if (timeStart === timeEnd) {
            showSuccessModal("Start time and end time cannot be the same. Please choose other time range.");
            return;
        }
        
        // Validate the time: End time cannot be earlier than the start time
        if (timeEnd <= timeStart) {
            showSuccessModal("End time cannot be earlier than the start time. Please choose other time range.");
            return;
        }
        
        if (selectedAppointmentId) {
            // Update the existing document
            try {
                await updateDoc(doc(db, "appointments", selectedAppointmentId), {
                    course: course.value,
                    date: date,
                    timeStart: timeStart,
                    timeEnd: timeEnd,
                    slots: parseInt(slots)
                });
                showSuccessModal("Appointment Updated Successfully!");
                selectedAppointmentId = null; // Clear the selected ID after update
                document.getElementById("btn-add").style.display = "block";
                document.getElementById("btn-update").style.display = "none";
            } catch (e) {
            }
        } else {
            // Add a new document
            try {
                await addDoc(collection(db, "appointments"), {
                    course: course.value,
                    date: date,
                    timeStart: timeStart,
                    timeEnd: timeEnd,
                    slots: parseInt(slots)
                });
    
                // Add a new notification to the centralized notifications collection
                await addDoc(collection(db, "notifications"), {
                    course: course.value,
                    message: `A new appointment has been added for ${course.value} on ${date}.`,
                    date: new Date(),
                    audience: "student", // Add this field
                    isRead: false
                });
    
                showSuccessModal("Appointment Added Successfully!");
            } catch (e) {
            }
        }
        
        // Re-fetch appointments and re-render the table and calendar
        await fetchAppointments();
        renderCalendar();
        clearForm();
    }                        

    // Clear button click event listener
    document.getElementById("btn-clear").addEventListener("click", clearForm);

    function clearForm() {
        const checkedCourse = document.querySelector('input[name="course"]:checked');
        if (checkedCourse) {
            checkedCourse.checked = false;
        }
        document.getElementById("datepicker").value = "";
        document.getElementById("time-start").value = "";
        document.getElementById("time-end").value = "";
        document.getElementById("slots").value = "";
        selectedAppointmentId = null;
        document.getElementById("btn-add").style.display = "block";
        document.getElementById("btn-update").style.display = "none";
    }

    // Fetch the count of bookings for an appointment
    const fetchBookingsCountForAppointment = async (appointmentId) => {
        const bookingsRef = collection(db, "appointments", appointmentId, "bookings");
        const querySnapshot = await getDocs(bookingsRef);
        return querySnapshot.docs.length;
    };

    // Add a new row to the table
    function addTableRow(appointment) {
        const { id, course, date, timeStart, timeEnd, slots, bookings } = appointment;
        
        // Convert date to "October 9, 2024" format
        const formattedDate = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        const formattedTimeStart = formatTimeToAMPM(timeStart);
        const formattedTimeEnd = formatTimeToAMPM(timeEnd);
        const availableSlots = slots - (bookings ? bookings.length : 0);
    
        const row = document.createElement("tr");
        row.setAttribute("data-id", id);
        row.innerHTML = `
            <td>${course}</td>
            <td>${formattedDate}</td> <!-- Use the formatted date here -->
            <td>${formattedTimeStart}</td>
            <td>${formattedTimeEnd}</td>
            <td>${availableSlots}</td>
            <td>
                <button class="btn-edit btn btn-warning">Edit</button>
                <button class="btn-delete btn btn-danger">Delete</button>
            </td>
        `;
        document.getElementById("slots-table-body").appendChild(row);
    }        

    // Event delegation for edit and delete buttons
    document.getElementById("slots-table-body").addEventListener("click", async function(event) {
        if (event.target.classList.contains("btn-edit")) {
            // Handle edit functionality
            const row = event.target.closest("tr");
            const id = row.getAttribute("data-id");
            populateFormForEdit(id);
        } else if (event.target.classList.contains("btn-delete")) {
            // Handle delete functionality
            const row = event.target.closest("tr");
            rowToDelete = row;
            deleteModal.show();
        }
    });
// Populate form for editing an existing appointment
async function populateFormForEdit(id) {
    const docRef = doc(db, "appointments", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.querySelector(`input[name="course"][value="${data.course}"]`).checked = true;
        document.getElementById("datepicker").value = data.date;
        document.getElementById("time-start").value = data.timeStart;
        document.getElementById("time-end").value = data.timeEnd;
        document.getElementById("slots").value = data.slots;

        document.getElementById("btn-add").style.display = "none";
        document.getElementById("btn-update").style.display = "block";
        selectedAppointmentId = id;
    } else {
    }
}

// Confirm delete button in the delete modal
    document.getElementById("confirmDeleteBtn").addEventListener("click", async function() {
        if (rowToDelete) {
            const id = rowToDelete.getAttribute("data-id");

            // Delete the document in Firestore
            await deleteDoc(doc(db, "appointments", id));
            rowToDelete.remove();

            // Re-fetch appointments and re-render the calendar
            await fetchAppointments();
            renderCalendar();

            // Show success modal
            showSuccessModal("Appointment Deleted Successfully!");

            deleteModal.hide();
            rowToDelete = null;
        }
    });
    function formatTimeToAMPM(time) {
        if (typeof time !== 'string') {
            return 'Invalid time';
        }
    
        let [hour, minute] = time.split(":");
        if (!hour || !minute) {
            return 'Invalid time';
        }
    
        hour = parseInt(hour, 10);
        const period = hour >= 12 ? "PM" : "AM";
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        return `${String(hour).padStart(2, "0")}:${minute} ${period}`;
    }

    // Calendar functionality
    const nextBtn = document.querySelector(".next");
    const prevBtn = document.querySelector(".prev");
    const todayBtn = document.querySelector(".today");
    const month = document.querySelector(".month");

    const date = new Date();
    let currentMonth = date.getMonth();
    let currentYear = date.getFullYear();

    let appointments = [];

    async function fetchAppointments() {
        // Delete past appointments before fetching current ones
        await deletePastAppointments();
    
        const q = query(collection(db, "appointments"));
        const querySnapshot = await getDocs(q);
        const tableBody = document.getElementById("slots-table-body");
        tableBody.innerHTML = ""; // Clear the table before populating
        
        // Extract and sort appointments by date
        const appointments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        appointments.sort((a, b) => new Date(a.date) - new Date(b.date));  // Sort by closest date
    
        // Check if there are no appointments and show a message
        if (appointments.length === 0) {
            const noDataHtml = `
                <tr>
                    <td colspan="6" class="text-center">No appointment/s yet</td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', noDataHtml);
            return; // Exit the function since there's nothing more to display
        }
    
        // Add sorted appointments to the table
        for (const appointment of appointments) {
            addTableRow(appointment);
        }
    }          

    // Update the table with real-time changes
    async function updateTable() {
        for (const appointment of appointments) {
            appointment.bookingCount = await fetchBookingsCountForAppointment(appointment.id);
        }
    }

    const renderCalendar = () => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const prevLastDayDate = new Date(currentYear, currentMonth, 0).getDate();
        const lastDayIndex = lastDay.getDay();
        const lastDayDate = lastDay.getDate();
    
        const nextDays = 7 - lastDayIndex - 1;
    
        let days = "";
    
        // Get the month name dynamically
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonthName = monthNames[currentMonth];
    
        // Update the displayed month and year
        month.innerText = `${currentMonthName} ${currentYear}`;
    
        // Add previous month's days
        for (let x = firstDay.getDay(); x > 0; x--) {
            days += `<div class="day prev">${prevLastDayDate - x + 1}</div>`;
        }
    
        // Add current month's days
        for (let i = 1; i <= lastDayDate; i++) {
            const fullDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isToday = currentYear === date.getFullYear() && currentMonth === date.getMonth() && i === date.getDate();
            days += `<div class="day ${isToday ? 'today' : ''}" data-date="${fullDate}">${i}</div>`;
        }
    
        // Add next month's days
        for (let j = 1; j <= nextDays; j++) {
            days += `<div class="day next">${j}</div>`;
        }
    
        document.getElementById('calendar-days').innerHTML = days;
    
        updateCalendarColors();
    };    

    const updateCalendarColors = () => {
        const dayElements = document.querySelectorAll("#calendar-days .day");
        dayElements.forEach(dayElement => {
            const fullDate = dayElement.dataset.date;
            const appointmentsOnThisDate = appointments.filter(app => app.date === fullDate);
    
            let totalSlots = 0;
            let totalBookings = 0;
    
            appointmentsOnThisDate.forEach(app => {
                totalSlots += app.slots;
                totalBookings += app.bookings ? app.bookings.length : 0;
            });
    
            const availableSlots = totalSlots - totalBookings;
    
            if (appointmentsOnThisDate.length > 0) {
                if (availableSlots > 0) {
                    dayElement.style.backgroundColor = "green"; // Set background color to green
                } else {
                    dayElement.style.backgroundColor = "red"; // Set background color to red
                }
            }
        });
    };
    
    // Initialize Firestore real-time listener
    const appointmentsRef = collection(db, "appointments");
    onSnapshot(appointmentsRef, async (snapshot) => {
        // Delete past appointments
        await deletePastAppointments();
        
        // Clear current table rows
        const tableBody = document.getElementById("slots-table-body");
        tableBody.innerHTML = "";
    
        // Update global appointments array
        appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
    
        if (appointments.length === 0) {
            const noDataHtml = `
                <tr>
                    <td colspan="6" class="text-center">No appointment/s yet</td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', noDataHtml);
        } else {
            // Update the table and calendar
            for (const appointment of appointments) {
                addTableRow(appointment); // Add rows to the table directly
            }
        }
    
        await updateTable(); // Fetch bookings count if needed
        renderCalendar();
    });    

    // Initialize the calendar and fetch appointments on load
    renderCalendar();

    nextBtn.addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    prevBtn.addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    todayBtn.addEventListener("click", () => {
        currentMonth = date.getMonth();
        currentYear = date.getFullYear();
        renderCalendar();
    });

    function showSuccessModal(message) {
        const modalBody = successModalElement.querySelector(".modal-body");
        modalBody.textContent = message;
        successModal.show();
        
        // Hide the modal when "OK" button is clicked
        const okButton = successModalElement.querySelector(".btn-primary");
        okButton.addEventListener("click", function() {
            successModal.hide();
        }, { once: true }); // Ensures event listener is only added once
    }

    // Function to delete past appointments
    async function deletePastAppointments() {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // Get date in YYYY-MM-DD format
    
        const q = query(collection(db, "appointments"), where("date", "<", todayString));
        const querySnapshot = await getDocs(q);
    
        for (const doc of querySnapshot.docs) {
            await deleteDoc(doc.ref);
        }
    }
});