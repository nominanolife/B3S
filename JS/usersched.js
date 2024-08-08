import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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

// Fetch user appointments
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

            // Filter bookings for the logged-in user
            const userBookings = appointment.bookings.filter(booking => booking.userId === userId);

            userBookings.forEach(booking => {
                const row = document.createElement('tr');

                const courseCell = document.createElement('td');
                courseCell.innerText = appointment.course;
                row.appendChild(courseCell);

                // Parse and format the start and end times
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
                statusCell.innerText = booking.reschedule || booking.cancelled || booking.status || ''; // Default to 'Pending' if no status is set
                row.appendChild(statusCell);
             
                const actionCell = document.createElement('td');

                const appointmentStartDate = parseDateTime(appointment.date, appointment.timeStart);
                const currentDate = new Date();
                const oneDayBefore = new Date(appointmentStartDate);
                oneDayBefore.setDate(oneDayBefore.getDate() - 1);

                if (currentDate >= oneDayBefore) {
                    actionCell.innerHTML = `<button class="btn btn-danger" disabled>Cancel</button>`;
                    actionCell.innerHTML += `<button class="btn btn-warning" disabled>Reschedule</button>`;
                } else {
                    actionCell.innerHTML = `<button class="btn btn-danger cancel-btn" data-appointment-id="${doc.id}" data-booking='${JSON.stringify(booking)}'>Cancel</button>`;
                    actionCell.innerHTML += `<button class="btn btn-warning reschedule-btn" data-appointment-id="${doc.id}" data-booking-id="${booking.userId}">Reschedule</button>`;
                }

                row.appendChild(actionCell);
                appointmentsTableBody.appendChild(row);
            });
        });

        document.querySelectorAll('.cancel-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const appointmentId = e.target.getAttribute('data-appointment-id');
                const booking = JSON.parse(e.target.getAttribute('data-booking'));
                try {
                    const appointmentRef = doc(db, "appointments", appointmentId);
                    await updateDoc(appointmentRef, {
                        bookings: arrayRemove(booking)
                    });
                    fetchUserAppointments(userId); // Refresh the UI to reflect the updated status
                } catch (error) {
                    console.error("Error canceling booking:", error);
                }
            });
        });

    } catch (error) {
        console.error("Error fetching user appointments:", error);
    }
}

// Handle appointment cancellation
async function handleCancel(appointmentId, userId) {
    try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        await updateDoc(appointmentRef, {
            bookings: arrayRemove({ userId })
        });
        // Refresh the appointments table
        const user = auth.currentUser;
        if (user) {
            await fetchUserAppointments(user.uid);
        }
    } catch (error) {
        console.error("Error canceling appointment:", error);
    }
}

// Get user ID from Firebase Auth
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userId = user.uid;
        await fetchUserAppointments(userId);
    }
});
