import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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
const appointmentsTableBody = document.querySelector('#appointmentsTableBody');

// Helper function to parse date and time and convert to 12-hour format
function parseDateTime(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-');
    const [hours, minutes] = timeStr.split(':');
    const date = new Date(year, month - 1, day, hours, minutes);

    // Convert to 12-hour format
    let hour = date.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // the hour '0' should be '12'
    const minutesStr = date.getMinutes().toString().padStart(2, '0');

    return {
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minutesStr} ${ampm}`
    };
}

// Helper function to show notification modal
function showNotificationModal(message, redirectUrl = null) {
    const modal = document.querySelector('#notificationModal');
    if (modal) {
        const modalMessage = modal.querySelector('.modal-body');
        modalMessage.innerText = message;
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();

        if (redirectUrl) {
            modal.addEventListener('hidden.bs.modal', () => {
                window.location.href = 'userappointment.html';
            });
        }
    } else {
        console.error('Notification modal not found');
    }
}

// Helper function to show confirmation modal
function showConfirmationModal(action, callback, redirectUrl) {
    const modal = document.querySelector('#confirmationModal');
    if (modal) {
        const modalMessage = modal.querySelector('.modal-body');
        modalMessage.innerText = `Are you sure you want to ${action.toLowerCase()} this booking?`;
        const modalInstance = new bootstrap.Modal(modal);

        const confirmButton = modal.querySelector('#confirmButton');
        confirmButton.onclick = async () => {
            await callback(); // Execute the callback
            modalInstance.hide(); // Hide the modal
            if (redirectUrl) {
                showNotificationModal(`${action} successful.`, redirectUrl);
            }
        };

        modalInstance.show();
    } else {
        console.error('Confirmation modal not found');
    }
}

async function fetchUserAppointments(userId) {
    try {
        const appointmentsRef = collection(db, "appointments");

        // Use onSnapshot to listen for real-time updates
        onSnapshot(appointmentsRef, (querySnapshot) => {
            let appointmentsData = [];

            if (querySnapshot.empty) {
                console.log("No matching documents.");
                return;
            }

            querySnapshot.forEach((doc) => {
                const appointment = doc.data();

                if (Array.isArray(appointment.bookings)) {
                    const userBookings = appointment.bookings.filter(booking => booking.userId === userId);
                    userBookings.forEach(booking => {
                        const appointmentDate = new Date(appointment.date + 'T' + appointment.timeStart);
                        const currentDate = new Date();

                        // Set initial progress to "Not yet Started" if not already set
                        if (!booking.progress) {
                            booking.progress = 'Not yet Started';
                        }

                        // Check if it's the appointment date and the status is not Cancelled or Rescheduled
                        if (
                            currentDate.toDateString() === appointmentDate.toDateString() &&
                            booking.progress !== "In Progress" &&
                            booking.status !== "Cancelled" &&
                            booking.status !== "Rescheduled"
                        ) {
                            // Update the booking progress to "In Progress"
                            updateBookingProgress(doc.id, booking.userId, 'In Progress');
                            booking.progress = 'In Progress'; // Update the local booking progress
                        }

                        appointmentsData.push({ appointment, booking, docId: doc.id });
                    });
                }
            });

            // Sort appointments: existing ones first (not "Cancelled" or "Rescheduled")
            appointmentsData.sort((a, b) => {
                const statusOrder = { "Booked": 1, "Pending": 2, "Rescheduled": 3, "Cancelled": 4 };
                return statusOrder[a.booking.status || "Pending"] - statusOrder[b.booking.status || "Pending"];
            });

            // Clear and re-render the table
            appointmentsTableBody.innerHTML = "";
            appointmentsData.forEach(({ appointment, booking, docId }) => {
                renderAppointmentRow(appointment, booking, docId);
            });
        });
    } catch (error) {
        console.error("Error fetching appointments:", error);
    }
}

// Function to update booking progress
async function updateBookingProgress(appointmentId, userId, newProgress) {
    try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        const appointmentSnap = await getDoc(appointmentRef);

        if (appointmentSnap.exists()) {
            const appointmentData = appointmentSnap.data();
            const updatedBookings = appointmentData.bookings.map(booking => {
                if (booking.userId === userId && booking.status !== 'Cancelled' && booking.status !== 'Rescheduled') {
                    return { ...booking, progress: newProgress };
                }
                return booking;
            });

            await updateDoc(appointmentRef, {
                bookings: updatedBookings
            });
            console.log(`Booking progress updated to ${newProgress} for appointment ID ${appointmentId}`);
        } else {
            console.log("No such document!");
        }
    } catch (error) {
        console.error("Error updating booking progress:", error);
    }
}

// Modular function to render each appointment row
function renderAppointmentRow(appointment, booking, docId) {
    const row = document.createElement('tr');

    const courseCell = document.createElement('td');
    courseCell.innerText = appointment.course;
    row.appendChild(courseCell);

    const { date } = parseDateTime(appointment.date, appointment.timeStart);
    const startTime = parseDateTime(appointment.date, appointment.timeStart).time;
    const endTime = parseDateTime(appointment.date, appointment.timeEnd).time;

    const dateCell = document.createElement('td');
    dateCell.innerText = date;
    row.appendChild(dateCell);

    const startTimeCell = document.createElement('td');
    startTimeCell.innerText = startTime;
    row.appendChild(startTimeCell);

    const endTimeCell = document.createElement('td');
    endTimeCell.innerText = endTime;
    row.appendChild(endTimeCell);

    const progressCell = document.createElement('td');
    progressCell.innerText = booking.progress || 'Not started'; // Ensure 'Not started' is displayed if no progress is set
    row.appendChild(progressCell);

    const statusCell = document.createElement('td');
    statusCell.innerText = booking.status || 'Pending'; // Default to 'Pending' if no status is set

    // Apply color based on status
    if (booking.status === 'Booked') {
        statusCell.style.color = '#28a745'; // Green (Bootstrap's success color)
    } else if (booking.status === 'Cancelled') {
        statusCell.style.color = '#dc3545'; // Red (Bootstrap's danger color)
    } else if (booking.status === 'Rescheduled') {
        statusCell.style.color = '#ffc107'; // Yellow (Bootstrap's warning color)
    } else {
        statusCell.style.color = '#6c757d'; // Grey (Bootstrap's secondary color for Pending)
    }

    row.appendChild(statusCell);

    const actionCell = document.createElement('td');
    // Disable buttons if progress is "Completed" or the status is "Cancelled" or "Rescheduled"
    const isDisabled = booking.progress === 'Completed' || booking.status === 'Cancelled' || booking.status === 'Rescheduled';
    appendActionButtons(actionCell, isDisabled, docId, booking, appointment);
    row.appendChild(actionCell);

    appointmentsTableBody.appendChild(row);
}

// Function to append action buttons based on conditions
function appendActionButtons(actionCell, isDisabled, docId, booking, appointment) {
    if (!isDisabled) {
        const appointmentStartDate = new Date(appointment.date + 'T' + appointment.timeStart);
        const currentDate = new Date();
        const oneDayBefore = new Date(appointmentStartDate);
        oneDayBefore.setDate(oneDayBefore.getDate() - 1);

        const isDayBefore = currentDate >= oneDayBefore;
        const isAppointmentDay = currentDate.toDateString() === appointmentStartDate.toDateString();

        actionCell.innerHTML = `<button class="btn btn-warning reschedule-btn" ${isDayBefore || isAppointmentDay ? 'disabled' : ''} data-appointment-id="${docId}" data-booking='${JSON.stringify(booking)}' data-appointment='${JSON.stringify(appointment)}'>Reschedule</button>`;
        actionCell.innerHTML += `<button class="btn btn-danger cancel-btn" ${isDayBefore || isAppointmentDay ? 'disabled' : ''} data-appointment-id="${docId}" data-booking='${JSON.stringify(booking)}' data-appointment='${JSON.stringify(appointment)}'>Cancel</button>`;
    } else {
        actionCell.innerHTML = `<button class="btn btn-warning reschedule-btn" disabled style="display:none;">Reschedule</button>`;
        actionCell.innerHTML += `<button class="btn btn-danger cancel-btn" disabled style="display:none;">Cancel</button>`;
    }

    // Add event listeners for Cancel and Reschedule buttons
    actionCell.querySelectorAll('.cancel-btn, .reschedule-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const appointmentId = e.target.getAttribute('data-appointment-id');
            const booking = JSON.parse(e.target.getAttribute('data-booking'));
            const appointment = JSON.parse(e.target.getAttribute('data-appointment'));

            const action = e.target.classList.contains('cancel-btn') ? 'Cancel' : 'Reschedule';

            // Get the userId from auth
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    const userId = user.uid;

                    showConfirmationModal(action, async () => {
                        const appointmentStartDate = new Date(appointment.date + 'T' + appointment.timeStart);
                        const currentDate = new Date();
                        const oneDayBefore = new Date(appointmentStartDate);
                        oneDayBefore.setDate(oneDayBefore.getDate() - 1);

                        if (currentDate >= oneDayBefore) {
                            showNotificationModal("You cannot cancel or reschedule 1 day before the appointment.");
                        } else {
                            // Disable the clicked button immediately
                            e.target.disabled = true;

                            // Disable the sibling button immediately
                            const siblingButton = e.target.classList.contains('cancel-btn') ?
                                e.target.nextElementSibling : e.target.previousElementSibling;
                            if (siblingButton) {
                                siblingButton.disabled = true;
                            }

                            try {
                                const appointmentRef = doc(db, "appointments", appointmentId);

                                // Update the status and increment slots based on the action
                                const updatedBookings = appointment.bookings.map(b => {
                                    if (b.userId === booking.userId) {
                                        if (action === 'Cancel') {
                                            return { ...b, status: 'Cancelled' };
                                        } else if (action === 'Reschedule') {
                                            return { ...b, status: 'Rescheduled' };
                                        }
                                    }
                                    return b;
                                });

                                const updatedSlots = appointment.slots + 1; // Increment slots

                                await updateDoc(appointmentRef, {
                                    bookings: updatedBookings,
                                    slots: updatedSlots
                                });

                                showNotificationModal(`${action} successful.`, 'userappointment.html');

                            } catch (error) {
                                console.error("Error updating booking:", error);
                                showNotificationModal("An error occurred. Please try again.");
                                // Optionally re-enable the buttons in case of error
                                if (row) {
                                    row.querySelectorAll('button').forEach(btn => btn.disabled = false);
                                }
                            }
                        }
                    });
                } else {
                    console.log("User is not signed in");
                }
            });
        });
    });
}

// Check if user is authenticated
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userId = user.uid;
        await fetchUserAppointments(userId);
    } else {
        console.log("User is not signed in");
    }
});
