import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, setDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

function parseDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) {
        return {
            date: '',
            time: ''
        };
    }

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
                window.location.href = redirectUrl;
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

// Function to move completed bookings to a new collection
async function moveToCompletedBookings(userId, appointment, booking) {
    try {
        const completedBookingRef = doc(db, "completedBookings", `${userId}_${appointment.date}_${appointment.course}`);

        await setDoc(completedBookingRef, {
            userId: userId,
            course: appointment.course,
            date: appointment.date,
            startTime: appointment.timeStart,
            endTime: appointment.timeEnd,
            progress: booking.progress,
            status: 'Completed'
        });

        console.log(`Booking moved to completedBookings for user ${userId}`);
    } catch (error) {
        console.error("Error moving booking to completedBookings:", error);
    }
}

// Function to update booking progress and move to completed bookings if necessary
async function updateBookingProgress(appointmentId, userId, newProgress) {
    try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        const appointmentSnap = await getDoc(appointmentRef);

        if (appointmentSnap.exists()) {
            const appointmentData = appointmentSnap.data();
            const updatedBookings = appointmentData.bookings.map(booking => {
                if (booking.userId === userId && booking.status !== 'Cancelled' && booking.status !== 'Rescheduled') {
                    if (newProgress === 'Completed') {
                        // Move the booking to the 'completedBookings' collection
                        moveToCompletedBookings(userId, appointmentData, booking);
                    }
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
async function fetchUserAppointments(userId) {
    try {
        const appointmentsRef = collection(db, "appointments");
        const completedBookingsParentRef = collection(db, "completedBookings");

        let appointmentsData = [];
        let activeBookingsMap = new Map();

        // Fetch ongoing and upcoming appointments
        const appointmentSnapshot = await getDocs(appointmentsRef);

        console.log("Fetching active bookings...");

        appointmentSnapshot.forEach((doc) => {
            const appointment = doc.data();
            console.log("Active Appointment Data:", appointment);

            if (Array.isArray(appointment.bookings)) {
                // Filter bookings to include only those for the logged-in user
                const userBookings = appointment.bookings.filter(booking => booking.userId === userId);
                userBookings.forEach(booking => {
                    const bookingKey = `${appointment.date}_${appointment.timeStart}`;
                    
                    // Check if the booking is completed and should take priority
                    if (booking.progress === 'Completed') {
                        activeBookingsMap.set(bookingKey, { appointment, booking, docId: doc.id });
                        console.log("Priority Booking Key (Completed):", bookingKey, "Booking Data:", booking);
                    } else {
                        // Only set the booking if there's no existing priority booking
                        if (!activeBookingsMap.has(bookingKey)) {
                            activeBookingsMap.set(bookingKey, { appointment, booking, docId: doc.id });
                            console.log("Active Booking Key:", bookingKey, "Booking Data:", booking);
                        }
                    }
                });
            }
        });

        console.log("Fetching completed bookings...");

        // Fetch the completed bookings for the logged-in user
        const completedSnapshot = await getDoc(doc(completedBookingsParentRef, userId));

        console.log("Completed bookings snapshot:", completedSnapshot.exists());

        if (completedSnapshot.exists()) {
            const completedBookingDoc = completedSnapshot.data();
            console.log("Completed Booking Document Data:", completedBookingDoc);

            // Check if the completedBookings field exists and is an array
            if (Array.isArray(completedBookingDoc.completedBookings)) {
                completedBookingDoc.completedBookings.forEach(booking => {
                    const bookingKey = `${booking.date}_${booking.startTime}`;
                    console.log("Completed Booking Key:", bookingKey, "Booking Data:", booking);

                    // Add the completed booking only if there's no active booking for the same date and time
                    if (!activeBookingsMap.has(bookingKey)) {
                        appointmentsData.push({ appointment: booking, booking, docId: userId, isCompleted: true });
                        console.log("Added completed booking to appointmentsData:", booking);
                    } else {
                        console.log("Skipped adding completed booking because an active booking exists for the same time slot:", bookingKey);
                    }
                });
            } else {
                console.log("No completed bookings found in this document.");
            }
        }

        // Combine active bookings from map into the appointmentsData array
        activeBookingsMap.forEach(value => {
            appointmentsData.push(value);
            console.log("Added active booking to appointmentsData:", value);
        });

        // Sort appointments by date or other criteria as needed
        appointmentsData.sort((a, b) => {
            const dateA = new Date(`${a.appointment.date}T${a.appointment.timeStart}`);
            const dateB = new Date(`${b.appointment.date}T${b.appointment.timeStart}`);
            return dateA - dateB;
        });

        console.log("Final appointmentsData:", appointmentsData);

        // Clear and re-render the table
        appointmentsTableBody.innerHTML = "";
        appointmentsData.forEach(({ appointment, booking, docId, isCompleted }) => {
            renderAppointmentRow(appointment, booking, docId, isCompleted);
        });
    } catch (error) {
        console.error("Error fetching appointments:", error);
    }
}

function renderAppointmentRow(appointment, booking, docId, isCompleted = false) {
    const row = document.createElement('tr');

    const courseCell = document.createElement('td');
    courseCell.innerText = appointment.course || '';
    row.appendChild(courseCell);

    const { date } = parseDateTime(appointment.date || '', appointment.startTime || appointment.timeStart || '');
    const startTime = parseDateTime(appointment.date || '', appointment.startTime || appointment.timeStart || '').time;
    const endTime = parseDateTime(appointment.date || '', appointment.endTime || appointment.timeEnd || '').time;

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
    const isDisabled = isCompleted || booking.progress === 'Completed' || booking.status === 'Cancelled' || booking.status === 'Rescheduled';
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
