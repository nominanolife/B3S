import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
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
const appointmentsTableBody = document.querySelector('tbody');

// Helper function to parse date and time
function parseDateTime(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-');
    const [hours, minutes] = timeStr.split(':');
    return new Date(year, month - 1, day, hours, minutes);
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

                const dateTimeCell = document.createElement('td');
                dateTimeCell.innerText = `${appointment.date} ${appointment.timeStart} - ${appointment.timeEnd}`;
                row.appendChild(dateTimeCell);

                const statusCell = document.createElement('td');
                statusCell.innerText = booking.TDC || booking.PDC || 'Not yet Started'; // Display booking status
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

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchUserAppointments(user.uid);
    } else {
        console.log("User not logged in");
    }
});

// Fetch and display updated student data after status change
async function fetchUpdatedStudentData(userId) {
    try {
        const studentDocRef = doc(db, "applicants", userId);
        const studentDoc = await getDoc(studentDocRef);
        if (studentDoc.exists()) {
            const studentData = studentDoc.data();
            renderStudentData(studentData);
        } else {
            console.error("No such student document!");
        }
    } catch (error) {
        console.error("Error fetching student data: ", error);
    }
}

// Render updated student data
function renderStudentData(student) {
    const personalInfo = student.personalInfo || {};
    const studentContainer = document.getElementById('student-container');
    studentContainer.innerHTML = `
        <p>Name: ${personalInfo.first || ''} ${personalInfo.last || ''}</p>
        <p>Email: ${student.email}</p>
        <p>Phone: ${student.phoneNumber || ''}</p>
        <p>Package: ${student.enrolledPackage}</p>
        <p>Price: &#8369; ${student.packagePrice}</p>
        ${(student.bookings || []).map(booking => `
            <p>Course: ${booking.course}</p>
            <p>Date & Time: ${booking.date} ${booking.timeStart} - ${booking.timeEnd}</p>
            <p>Status: ${booking.TDC || booking.PDC || 'Not yet Started'}</p>
        `).join('')}
    `;
}

// Ensure updated student data is displayed
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchUpdatedStudentData(user.uid);
    } else {
        console.log("User not logged in");
    }
});
