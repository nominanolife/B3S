import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

    let hour = date.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    const minutesStr = date.getMinutes().toString().padStart(2, '0');

    return {
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minutesStr} ${ampm}`
    };
}

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

function showConfirmationModal(action, callback, redirectUrl) {
    const modal = document.querySelector('#confirmationModal');
    if (modal) {
        const modalMessage = modal.querySelector('.modal-body');
        modalMessage.innerText = `Are you sure you want to ${action.toLowerCase()} this booking?`;
        const modalInstance = new bootstrap.Modal(modal);

        const confirmButton = modal.querySelector('#confirmButton');
        confirmButton.onclick = async () => {
            await callback();
            modalInstance.hide();
            if (redirectUrl) {
                showNotificationModal(`${action} successful.`, redirectUrl);
            }
        };

        modalInstance.show();
    } else {
        console.error('Confirmation modal not found');
    }
}

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

async function updateBookingProgress(appointmentId, userId, newProgress) {
    try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        const appointmentSnap = await getDoc(appointmentRef);

        if (appointmentSnap.exists()) {
            const appointmentData = appointmentSnap.data();
            const updatedBookings = appointmentData.bookings.map(booking => {
                if (booking.userId === userId && booking.status !== 'Cancelled' && booking.status !== 'Rescheduled') {
                    if (newProgress === 'Completed') {
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
        const completedBookingsParentRef = doc(db, "completedBookings", userId);

        let appointmentsData = [];
        let activeBookingsMap = new Map();

        onSnapshot(appointmentsRef, (snapshot) => {
            snapshot.forEach((doc) => {
                const appointment = doc.data();
                
                if (Array.isArray(appointment.bookings)) {
                    const userBookings = appointment.bookings.filter(booking => booking.userId === userId);
                    
                    userBookings.forEach(booking => {
                        const bookingKey = `${appointment.date}_${appointment.timeStart}`;
                        const currentDate = new Date();
                        const bookingStartDate = new Date(appointment.date + 'T' + appointment.timeStart);
                        const bookingEndDate = new Date(appointment.date + 'T' + appointment.timeEnd);
        
                        // Ensure the progress is reflecting the latest status
                        if (booking.progress === 'Completed') {
                            activeBookingsMap.set(bookingKey, { appointment, booking, docId: doc.id });
                        } else if (bookingEndDate < currentDate) {
                            booking.progress = 'Completed';
                            updateBookingProgress(doc.id, booking.userId, 'Completed');
                            activeBookingsMap.set(bookingKey, { appointment, booking, docId: doc.id });
                        } else if (bookingStartDate <= currentDate && currentDate <= bookingEndDate) {
                            booking.progress = 'In Progress';
                            activeBookingsMap.set(bookingKey, { appointment, booking, docId: doc.id });
                        } else if (bookingStartDate > currentDate) {
                            booking.progress = 'Not yet Started';
                            activeBookingsMap.set(bookingKey, { appointment, booking, docId: doc.id });
                        }
                    });
                }
            });
            updateAppointmentData(activeBookingsMap, appointmentsData, userId);
        });

        // Real-time listener for completed bookings
        onSnapshot(completedBookingsParentRef, (completedSnapshot) => {
            console.log("Real-time update for completed bookings...");

            if (completedSnapshot.exists()) {
                const completedBookingDoc = completedSnapshot.data();
                console.log("Processing Completed Bookings:", completedBookingDoc);

                if (Array.isArray(completedBookingDoc.completedBookings)) {
                    completedBookingDoc.completedBookings.forEach(booking => {
                        const bookingKey = `${booking.date}_${booking.startTime}`;
                        console.log("Completed Booking Key:", bookingKey, "Booking Data:", booking);

                        if (!activeBookingsMap.has(bookingKey)) {
                            appointmentsData.push({ appointment: booking, booking: booking, docId: completedSnapshot.id, isCompleted: true });
                            console.log("Added Completed Booking to Appointments Data:", booking);
                        } else {
                            console.log("Skipped adding completed booking because an active booking exists for the same time slot:", bookingKey);
                        }
                    });
                } else {
                    console.log("No completed bookings array found in this document:", completedSnapshot.id);
                }
            }

            updateAppointmentData(activeBookingsMap, appointmentsData, userId);
        });
    } catch (error) {
        console.error("Error fetching appointments:", error);
    }
}

function updateAppointmentData(activeBookingsMap, appointmentsData, userId) {
    // Ensure appointmentsData retains its values
    if (!appointmentsData) {
        appointmentsData = [];
    }

    // Combine active bookings from map into the appointmentsData array
    const activeBookingsArray = Array.from(activeBookingsMap.values());

    // Merge active and completed bookings
    appointmentsData = appointmentsData.concat(activeBookingsArray);

    // Clear the table body before rendering new rows
    appointmentsTableBody.innerHTML = "";

    // Check if there are no appointments
    if (appointmentsData.length === 0) {
        // Display a default message when there are no schedules
        const noScheduleRow = document.createElement('tr');
        const noScheduleCell = document.createElement('td');
        noScheduleCell.setAttribute('colspan', '7'); // Span all columns
        noScheduleCell.classList.add('text-center'); // Center the text
        noScheduleCell.innerText = "No schedules yet.";
        noScheduleRow.appendChild(noScheduleCell);
        appointmentsTableBody.appendChild(noScheduleRow);
        return;
    }

    // Sort appointments by date or other criteria as needed
    appointmentsData.sort((a, b) => {
        const dateA = new Date(`${a.appointment.date}T${a.appointment.timeStart}`);
        const dateB = new Date(`${b.appointment.date}T${b.appointment.timeStart}`);
        return dateA - dateB;
    });

    // Render each appointment row
    appointmentsData.forEach(({ appointment, booking, docId, isCompleted }) => {
        renderAppointmentRow(appointment, booking, docId, isCompleted);
    });
}

function renderAppointmentRow(appointment, booking, docId, isCompleted = false) {
    console.log("Rendering Row for Booking:", booking, "isCompleted:", isCompleted);

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

    // Debugging: Log current booking progress
    console.log(`Booking Progress: ${booking.progress}, Booking Status: ${booking.status}`);

    // Ensure progress and status are correctly reflected
    const progressText = booking.progress || (isCompleted ? 'Completed' : 'Not started');
    const statusText = booking.status || (isCompleted ? 'Completed' : 'Pending');

    const progressCell = document.createElement('td');
    progressCell.innerText = progressText;
    row.appendChild(progressCell);

    const statusCell = document.createElement('td');
    statusCell.innerText = statusText;
    if (isCompleted || progressText === 'Completed') {
        statusCell.style.color = '#6c757d'; // Grey color for completed
    } else if (statusText === 'Booked') {
        statusCell.style.color = '#28a745'; 
    } else if (statusText === 'Cancelled') {
        statusCell.style.color = '#dc3545'; 
    } else if (statusText === 'Rescheduled') {
        statusCell.style.color = '#ffc107'; 
    } else {
        statusCell.style.color = '#6c757d'; 
    }
    row.appendChild(statusCell);

    const actionCell = document.createElement('td');
    const isDisabled = isCompleted || progressText === 'Completed' || statusText === 'Cancelled' || statusText === 'Rescheduled';
    appendActionButtons(actionCell, isDisabled, docId, booking, appointment);
    row.appendChild(actionCell);

    // Append row to the table body
    appointmentsTableBody.appendChild(row);
    console.log("Row added to the table for:", booking);
}


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

    actionCell.querySelectorAll('.cancel-btn, .reschedule-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const appointmentId = e.target.getAttribute('data-appointment-id');
            const booking = JSON.parse(e.target.getAttribute('data-booking'));
            const appointment = JSON.parse(e.target.getAttribute('data-appointment'));

            const action = e.target.classList.contains('cancel-btn') ? 'Cancel' : 'Reschedule';

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
                            e.target.disabled = true;
                            const siblingButton = e.target.classList.contains('cancel-btn') ?
                                e.target.nextElementSibling : e.target.previousElementSibling;
                            if (siblingButton) {
                                siblingButton.disabled = true;
                            }

                            try {
                                const appointmentRef = doc(db, "appointments", appointmentId);

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

                                const updatedSlots = appointment.slots + 1;

                                await updateDoc(appointmentRef, {
                                    bookings: updatedBookings,
                                    slots: updatedSlots
                                });

                                showNotificationModal(`${action} successful.`, 'userappointment.html');

                            } catch (error) {
                                console.error("Error updating booking:", error);
                                showNotificationModal("An error occurred. Please try again.");
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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userId = user.uid;
        await fetchUserAppointments(userId);
    } else {
        console.log("User is not signed in");
    }
});

