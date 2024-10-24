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

       
    } catch (error) {
        
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
            
        } else {
            
        }
    } catch (error) {
        
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
                        const bookingStartDate = new Date(`${appointment.date}T${appointment.timeStart}:00.000Z`);
                        const bookingEndDate = new Date(`${appointment.date}T${appointment.timeEnd}:00.000Z`);

                        // Ensure the progress is reflecting the latest status
                        if (booking.progress === 'Completed') {
                            // Update the booking in the map instead of adding it again
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

        onSnapshot(completedBookingsParentRef, (completedSnapshot) => {
            
          
            if (completedSnapshot.exists()) {
              const completedBookingDoc = completedSnapshot.data();
              
          
              if (Array.isArray(completedBookingDoc.completedBookings)) {
                completedBookingDoc.completedBookings.forEach(booking => {
                  const bookingKey = `${booking.date}_${booking.startTime}`;
                 
          
                  if (!activeBookingsMap.has(bookingKey)) {
                    appointmentsData.push({ appointment: booking, booking: booking, docId: completedSnapshot.id, isCompleted: true });
                    
                  } else {
                   
                  }
                });
              } else {
               
              }
            }
          
            updateAppointmentData(activeBookingsMap, appointmentsData, userId);
          });
    } catch (error) {
        
    }
}

function updateAppointmentData(activeBookingsMap, appointmentsData, userId) {
    if (!appointmentsData) {
        appointmentsData = [];
    }

    const activeBookingsArray = Array.from(activeBookingsMap.values());

    // Combine active bookings from map into the appointmentsData array
    appointmentsData = appointmentsData.concat(activeBookingsArray);

    // Remove duplicate bookings from completedBookings by filtering out those already present in activeBookingsMap
    appointmentsData = appointmentsData.filter(appointment => {
        const bookingKey = `${appointment.date}_${appointment.startTime}`;
        return !activeBookingsMap.has(bookingKey); // Only include bookings not present in activeBookingsMap
    });

    // Clear the table body before rendering new rows
    appointmentsTableBody.innerHTML = "";

    // Check if there are no appointments
    if (appointmentsData.length === 0) {
        const noScheduleRow = document.createElement('tr');
        const noScheduleCell = document.createElement('td');
        noScheduleCell.setAttribute('colspan', '7');
        noScheduleCell.classList.add('text-center');
        noScheduleCell.innerText = "No schedules yet.";
        noScheduleRow.appendChild(noScheduleCell);
        appointmentsTableBody.appendChild(noScheduleRow);
        return;
    }

    appointmentsData.forEach(({ appointment, booking, docId, isCompleted }) => {
        renderAppointmentRow(appointment, booking, docId, isCompleted);
    });
}

function renderAppointmentRow(appointment, booking, docId, isCompleted = false) {
    
    const row = document.createElement('tr');

    const courseCell = document.createElement('td');
    courseCell.innerText = appointment.course || '';
    row.appendChild(courseCell);

    const appointmentDate = appointment.date ? appointment.date : '';
    const startTime = appointment.timeStart ? appointment.timeStart : '';
    const endTime = appointment.timeEnd ? appointment.timeEnd : '';

    const dateCell = document.createElement('td');
    dateCell.innerText = appointmentDate;
    row.appendChild(dateCell);

    const startTimeCell = document.createElement('td');
    startTimeCell.innerText = startTime;
    row.appendChild(startTimeCell);

    const endTimeCell = document.createElement('td');
    endTimeCell.innerText = endTime;
    row.appendChild(endTimeCell);

   
    // Ensure progress and status are correctly reflected
    const progressText = booking.progress || (isCompleted ? 'Completed' : 'Not started');
    const statusText = booking.status || (isCompleted ? 'Completed' : 'Pending');

    const progressCell = document.createElement('td');
    progressCell.innerText = progressText;
    row.appendChild(progressCell);

    const statusCell = document.createElement('td');
    statusCell.innerText = statusText;
    if (isCompleted || progressText === 'Completed') {
        statusCell.style.color = '#28a745'; // Grey color for completed
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
                                
                                showNotificationModal("An error occurred. Please try again.");
                                if (row) {
                                    row.querySelectorAll('button').forEach(btn => btn.disabled = false);
                                }
                            }
                        }
                    });
                } else {
                    
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
       
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Add event listener to the arrow icon
    const backArrowIcon = document.querySelector('.bi-arrow-left-short');
    
    if (backArrowIcon) {
        backArrowIcon.addEventListener('click', () => {
            window.location.href = 'userappointment.html';
        });
    }
});