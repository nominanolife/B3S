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
function showNotificationModal(message) {
    const modal = document.querySelector('#notificationModal');
    if (modal) {
        const modalMessage = modal.querySelector('.modal-body');
        modalMessage.innerText = message;
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    } else {
        console.error('Notification modal not found');
    }
}

// Helper function to show confirmation modal
function showConfirmationModal(action, callback) {
    const modal = document.querySelector('#confirmationModal');
    if (modal) {
        const modalMessage = modal.querySelector('.modal-body');
        modalMessage.innerText = `Are you sure you want to ${action.toLowerCase()} this booking?`;
        const modalInstance = new bootstrap.Modal(modal);

        const confirmButton = modal.querySelector('#confirmButton');
        confirmButton.onclick = () => {
            callback();
            modalInstance.hide();
        };

        modalInstance.show();
    } else {
        console.error('Confirmation modal not found');
    }
}

async function fetchUserAppointments(userId) {
    try {
        const appointmentsRef = collection(db, "appointments");
        const querySnapshot = await getDocs(appointmentsRef);

        appointmentsTableBody.innerHTML = "";

        if (querySnapshot.empty) {
            console.log("No matching documents.");
            return;
        }

        querySnapshot.forEach((doc) => {
            const appointment = doc.data();

            if (Array.isArray(appointment.bookings)) {
                const userBookings = appointment.bookings.filter(booking => booking.userId === userId);

                userBookings.forEach(booking => {
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
                    progressCell.innerText = booking.TDC || booking.PDC || 'Not yet Started'; // Display booking status
                    row.appendChild(progressCell);

                    const statusCell = document.createElement('td');
                    statusCell.innerText = booking.status || ''; // Default to 'Pending' if no status is set
                    row.appendChild(statusCell);

                    const actionCell = document.createElement('td');

                    const appointmentStartDate = new Date(appointment.date + 'T' + appointment.timeStart);
                    const currentDate = new Date();
                    const oneDayBefore = new Date(appointmentStartDate);
                    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

                    const isDayBefore = currentDate >= oneDayBefore;
                    const isAppointmentDay = currentDate.toDateString() === appointmentStartDate.toDateString();
                    const isDisabled = isAppointmentDay || booking.status === 'Cancelled';

                    // Determine button states
                    actionCell.innerHTML = `<button class="btn btn-danger cancel-btn" ${isDisabled ? 'disabled' : ''} data-appointment-id="${doc.id}" data-booking='${JSON.stringify(booking)}' data-appointment='${JSON.stringify(appointment)}'>Cancel</button>`;
                    actionCell.innerHTML += `<button class="btn btn-warning reschedule-btn" ${isDisabled ? 'disabled' : ''} data-appointment-id="${doc.id}" data-booking='${JSON.stringify(booking)}' data-appointment='${JSON.stringify(appointment)}'>Reschedule</button>`;

                    row.appendChild(actionCell);
                    appointmentsTableBody.appendChild(row);
                });
            }
        });

        // Add event listeners for Cancel and Reschedule buttons
        document.querySelectorAll('.cancel-btn, .reschedule-btn').forEach(button => {
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

                                    showNotificationModal(`${action} successful.`);
                                    fetchUserAppointments(userId); // Refresh the appointments list
                                    window.location.href = "userappointment.html"; // Redirect to userappointment.html
                                } catch (error) {
                                    console.error("Error updating booking:", error);
                                    showNotificationModal("An error occurred. Please try again.");
                                    // Optionally re-enable the buttons in case of error
                                    e.target.disabled = false;
                                    if (siblingButton) {
                                        siblingButton.disabled = false;
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

    } catch (error) {
        console.error("Error fetching appointments:", error);
    }
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
