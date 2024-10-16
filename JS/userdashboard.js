import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, doc, getDoc, getDocs, updateDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

// Your Firebase configuration
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

document.addEventListener('DOMContentLoaded', async function () {
    const notificationBell = document.getElementById('notification-bell');
    const notificationList = document.getElementById('notification-list');
    const notificationIndicator = document.getElementById('notification-indicator');

    // Toggle the visibility of the notification list when the bell is clicked
    notificationBell.addEventListener('click', function () {
        notificationList.classList.toggle('show');
        notificationList.classList.toggle('hidden');
    });

    // Function to display notifications
    function displayNotifications(notifications) {
        notificationList.innerHTML = ""; // Clear existing notifications

        // Create a container for the title and "Mark all as read" button
        const notificationHeader = document.createElement('div');
        notificationHeader.className = 'notification-header';

        const notificationTitle = document.createElement('div');
        notificationTitle.className = 'notification-title';
        notificationTitle.innerHTML = "<h2>Notification</h2>";

        const markAllReadContainer = document.createElement('div');
        markAllReadContainer.id = 'mark-all-read-container';
        markAllReadContainer.innerHTML = `
            <button id="mark-all-read" class="btn btn-link">Mark all as read</button>
        `;

        notificationHeader.appendChild(notificationTitle);
        notificationHeader.appendChild(markAllReadContainer);
        notificationList.appendChild(notificationHeader);

        if (notifications.length === 0) {
            notificationList.innerHTML = "<div class='notification-item'>No new notifications</div>";
            notificationIndicator.classList.remove('show'); // Hide the indicator if no notifications
            return;
        }

        let hasUnread = false;

        notifications.forEach(notification => {
            const notificationElement = document.createElement("div");
            notificationElement.className = "notification-item";
            notificationElement.style.cursor = "pointer"; // Make it clear that the item is clickable

            // Check if the notification is unread and add the "unread" class
            if (!notification.read) {
                notificationElement.classList.add("unread");
                hasUnread = true; // Mark that there is at least one unread notification
            }

            notificationElement.innerHTML = `
                ${notification.message}
            `;

            notificationList.appendChild(notificationElement);

            // Redirect to the appointment page and mark the notification as read when the notification is clicked
            notificationElement.addEventListener('click', async function() {
                try {
                    const notificationRef = doc(db, "notifications", notification.id); // Reference to the specific notification document
                    await updateDoc(notificationRef, { read: true }); // Mark notification as read

                    // Redirect to the appointment page
                    window.location.href = 'userappointment.html';
                } catch (error) {
                    console.error("Error updating notification:", error);
                }
            });
        });

        // Show or hide the indicator based on the presence of unread notifications
        if (hasUnread) {
            notificationIndicator.classList.add('show');
        } else {
            notificationIndicator.classList.remove('show');
        }

        // Add event listener for the "Mark all as read" button
        const markAllReadBtn = document.getElementById('mark-all-read');
        markAllReadBtn.addEventListener('click', async function () {
            try {
                const userDocRef = doc(db, "applicants", auth.currentUser.uid);

                // Update the user's document to mark all notifications as read
                await updateDoc(userDocRef, { notificationsRead: true });

                // Update each notification's read status in Firestore
                const notificationsQuery = query(collection(db, "notifications"), where("audience", "==", "student"));
                const snapshot = await getDocs(notificationsQuery);

                const batch = writeBatch(db); // Use a batch to update all notifications at once
                snapshot.forEach(doc => {
                    batch.update(doc.ref, { read: true });
                });
                await batch.commit(); // Commit the batch update

                // Re-fetch the user's document to confirm notificationsRead status
                const updatedDocSnap = await getDoc(userDocRef);
                if (updatedDocSnap.exists() && updatedDocSnap.data().notificationsRead) {
                    const notificationItems = document.querySelectorAll('.notification-item');
                    notificationItems.forEach(item => {
                        item.classList.remove('unread');
                    });
                    notificationIndicator.classList.remove('show');
                }

            } catch (error) {
                console.error("Error updating document:", error);
            }
        });
    }

    // Function to check and delete old notifications
    const checkAndDeleteOldNotifications = async () => {
        const notificationRef = collection(db, "notifications");
        const snapshot = await getDocs(query(notificationRef, where('audience', '==', 'student')));

        const batch = writeBatch(db);

        snapshot.forEach(doc => {
            const notification = doc.data();
            const appointmentDate = notification.date.toDate(); // Convert Firestore Timestamp to JS Date
            const now = new Date();

            // Calculate the difference in days between now and the appointment date
            const diffInDays = Math.floor((now - appointmentDate) / (1000 * 60 * 60 * 24));

            if (diffInDays > 1) { // If the notification is more than one day after the appointment date
                batch.delete(doc.ref);
            }
        });

        await batch.commit().then(() => {
            console.log('Deleted outdated notifications');
        }).catch(error => {
            console.error('Error deleting notifications: ', error);
        });
    };

    // Call the function to check and delete old notifications when the user logs in or opens the app
    await checkAndDeleteOldNotifications();

    // Fetch notifications after deletion
    const notificationsQuery = query(collection(db, "notifications"), where("audience", "==", "student"));
    const snapshot = await getDocs(notificationsQuery);
    const notifications = snapshot.docs.map(doc => doc.data());

    // Display notifications
    displayNotifications(notifications);
  
    // Close the notification list when clicking outside of it
    document.addEventListener('click', function(event) {
        if (!notificationList.contains(event.target) && !notificationBell.contains(event.target)) {
            notificationList.classList.add('hidden');
            notificationList.classList.remove('show');
        }
    });

    // Select all arrows in the roadmap
    const roadmapSteps = document.querySelectorAll('.roadmap-container .arrow');

    // Function to update and show modal based on step
    function openStepModal(step) {
        const modalTitle = document.getElementById('roadmapstepsModalLabel');
        const modalBody = document.querySelector('#roadmapstepsModal .modal-body');
        
        // Update modal content based on the step
        let stepContent = '';
        switch (step) {
            case '1':
                modalTitle.textContent = "Step 1: Theoretical Driving Course";
                stepContent = `
                    <div class="step-container">
                        <h3>Prepare the Required Documents</h3>
                        <p>Make sure you have the following:</p>
                        <ul>
                            <li>Valid ID (e.g., Driver’s License, Passport, Student ID, etc.)</li>
                            <li>Birth Certificate (PSA-issued or local civil registrar)</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Visit an LTO-accredited Driving School</h3>
                        <ul>
                            <li>Search for a driving school accredited by the Land Transportation Office (LTO) that offers the TDC.</li>
                            <li>Contact the school to confirm course schedules, fees, and enrollment requirements.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Enroll in the Theoretical Driving Course</h3>
                        <ul>
                            <li>Go to the selected driving school and present your Valid ID and Birth Certificate.</li>
                            <li>Complete the enrollment process and pay the required fees.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Attend the TDC Sessions</h3>
                        <ul>
                            <li>The TDC consists of 15 hours of instruction, usually spread across 2 to 3 days.</li>
                            <li>Topics include road safety, traffic rules and regulations, and basic vehicle operations.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Take the Course Assessment</h3>
                        <ul>
                            <li>After completing the course, you may be asked to take a quiz or assessment to evaluate your understanding of the lessons.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Receive the TDC Certificate</h3>
                        <ul>
                            <li>Upon passing the assessment (if required) and completing the course, the driving school will issue your TDC Certificate.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Submit TDC Certificate to LTO</h3>
                        <ul>
                            <li>Bring the TDC Certificate along with other documents (if applicable) when applying for a Student Permit or upgrading to a Driver’s License at the LTO office.</li>
                        </ul>
                    </div>
                    `;
                break;
            case '2':
                modalTitle.textContent = "Step 2: Student Permit";
                stepContent = `
                            <div class="step-container">
                        <h3>Prepare the Required Document</h3>
                        <p>Make sure to bring the following:</p>
                        <ul>
                            <li>Student Permit (SP) – must be valid and issued by the LTO.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Select an LTO-accredited Driving School</h3>
                        <ul>
                            <li>Search for a driving school accredited by the LTO that offers the Practical Driving Course (PDC).</li>
                            <li>Contact the school to confirm the schedules, fees, and available vehicle types (e.g., manual or automatic).</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Enroll in the Practical Driving Course</h3>
                        <ul>
                            <li>Go to the driving school and present your Student Permit.</li>
                            <li>Complete the enrollment process and pay the required fees.</li>
                            <li>Choose between manual or automatic transmission training, depending on your preference and intended license type.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Attend the PDC Sessions</h3>
                        <ul>
                            <li>The course duration depends on the vehicle type and the school’s curriculum (usually around 8-10 hours).</li>
                            <li>You will receive hands-on training covering vehicle operations, traffic regulations, and safe driving techniques.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Take the Course Assessment</h3>
                        <ul>
                            <li>At the end of the training, you may be required to complete an assessment to demonstrate your driving skills and knowledge.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Receive the PDC Certificate</h3>
                        <ul>
                            <li>Upon successfully completing the course and passing the assessment, the driving school will issue your PDC Certificate.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Use the PDC Certificate to Apply for a Driver’s License</h3>
                        <ul>
                            <li>Bring the PDC Certificate, Student Permit, and other required documents when applying for a Non-Professional or Professional Driver’s License at the LTO office.</li>
                        </ul>
                    </div>
                `;
            break;
            case '3':
                modalTitle.textContent = "Step 3: Practical Driving Course";
                stepContent = `
                    <div class="step-container">
                        <h3>Prepare the Required Documents</h3>
                        <p>Ensure you have the following:</p>
                        <ul>
                            <li>PDC Certificate from an LTO-accredited driving school (Minimum of 8 hours of actual driving required)</li>
                            <li>Medical Certificate from an LTO-accredited clinic</li>
                            <li>Valid Student Permit (SP) – Must be at least 17 years old</li>
                            <li>Other fees (for the written exam, practical test, and license processing)</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Visit an LTO-accredited Clinic for Medical Certificate</h3>
                        <ul>
                            <li>Find an LTO-accredited clinic near you.</li>
                            <li>Undergo the required medical examination.</li>
                            <li>Pay the ₱500 fee and secure your Medical Certificate.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Go to the LTO Office</h3>
                        <ul>
                            <li>Bring all your documents (PDC Certificate, Medical Certificate, Student Permit) to the nearest LTO office that processes Non-Pro Driver’s License applications.</li>
                            <li>Submit your documents to the LTO evaluator for verification.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Take the Written/Computerized Exam</h3>
                        <ul>
                            <li>Proceed to the examination room after your documents are verified.</li>
                            <li>Take the written or computerized exam on road rules, traffic signs, and safe driving practices.</li>
                            <li>Passing Score: Typically, you need at least 30 out of 40 points to pass.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Take the Practical Driving Test</h3>
                        <ul>
                            <li>If you pass the written exam, proceed to the driving test area.</li>
                            <li>Use the vehicle type corresponding to your license code (A for motorcycles, B for light vehicles).</li>
                            <li>An LTO examiner will assess your driving skills and adherence to traffic rules.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Proceed with Biometrics and Photo Capture</h3>
                        <ul>
                            <li>After passing the practical driving test, proceed to the biometrics section.</li>
                            <li>Your photo, fingerprint, and signature will be captured for your license card.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Pay the License Fees</h3>
                        <ul>
                            <li>Proceed to the cashier to pay the required fees for the Non-Professional Driver’s License.</li>
                            <li>Fees may vary slightly depending on the LTO branch.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Receive Your Non-Professional Driver’s License</h3>
                        <ul>
                            <li>After completing the process, the LTO will issue your Non-Professional Driver’s License.</li>
                            <li>Validity: Typically 5 years, or 10 years if you have a clean driving record.</li>
                        </ul>
                    </div>
                `;
            break;
            case '4':
                modalTitle.textContent = "Step 4: Non-Professional Driver's License";
                stepContent = `
                    <div class="step-container">
                        <h3>Prepare the Required Document</h3>
                        <p>Make sure to bring the following:</p>
                        <ul>
                            <li>student Permit (SP) – must be valid and issued by the LTO.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Select an LTO-accredited Driving School</h3>
                        <ul>
                            <li>Search for a driving school accredited by the LTO that offers the Practical Driving Course (PDC).</li>
                            <li>Contact the school to confirm the schedules, fees, and available vehicle types (e.g., manual or automatic).</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Enroll in the Practical Driving Course</h3>
                        <ul>
                            <li>Go to the driving school and present your Student Permit.</li>
                            <li>Complete the enrollment process and pay the required fees.</li>
                            <li>Choose between manual or automatic transmission training, depending on your preference and intended license type.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Attend the PDC Sessions</h3>
                        <ul>
                            <li>The course duration depends on the vehicle type and the school’s curriculum (usually around 8-10 hours).</li>
                            <li>You will receive hands-on training covering vehicle operations, traffic regulations, and safe driving techniques.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Take the Course Assessment</h3>
                        <ul>
                            <li>At the end of the training, you may be required to complete an assessment to demonstrate your driving skills and knowledge.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Receive the PDC Certificate</h3>
                        <ul>
                            <li>Upon successfully completing the course and passing the assessment, the driving school will issue your PDC Certificate.</li>
                        </ul>
                    </div>
                    <div class="step-container">
                        <h3>Use the PDC Certificate to Apply for a Driver’s License</h3>
                        <ul>
                            <li>Bring the PDC Certificate, Student Permit, and other required documents when applying for a Non-Professional or Professional Driver’s License at the LTO office.</li>
                        </ul>
                    </div>
                `;
                break;
            default:
                modalTitle.textContent = "Unknown Step";
                stepContent = '<p>No details available for this step.</p>';
                break;
        }

        // Insert content into the modal body
        modalBody.innerHTML = stepContent;

        // Show the modal using Bootstrap's modal function
        $('#roadmapstepsModal').modal('show');
    }

    // Add click event listeners to each step
    roadmapSteps.forEach(stepElement => {
        stepElement.addEventListener('click', function () {
            const step = this.getAttribute('data-step'); // Get the step number from the data-step attribute
            openStepModal(step); // Call the function to open the modal
        });
    });

    onAuthStateChanged(auth, async function(user) {
        if (user) {
            try {
                const userDocRef = doc(db, "applicants", user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const userRole = userData.role;
    
                    console.log("User Data:", userData); // Log userData to check if it's retrieved properly
    
                    if (userRole === "applicant") {
                        disableLinks();
                    }
    
                    // If the user is a student, start the notification listener
                    if (userRole === "student") {
                        const notificationsRef = query(
                            collection(db, "notifications"), 
                            where("audience", "==", "student"),
                            orderBy("date", "desc"), // Order by date, latest first
                            limit(10) // Limit to the 10 most recent notifications
                        );
    
                        onSnapshot(notificationsRef, (snapshot) => {
                            const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Include doc.id for the notification reference
                            displayNotifications(notifications);
                        });
                    }
    
                    // Fetch the user's upcoming appointment
                    const appointmentsRef = collection(db, "appointments");
                    const q = query(appointmentsRef, where("bookings", "!=", null)); // Query for documents with bookings array
                    const querySnapshot = await getDocs(q);
    
                    // Select the appointmentCard element
                    const appointmentCard = document.querySelector('.appointment-card .card-container');
    
                    if (appointmentCard) {
                        if (!querySnapshot.empty) {
                            let foundAppointment = false;
                            querySnapshot.forEach(doc => {
                                const appointmentData = doc.data();
                                const bookingDetails = appointmentData.bookings.find(
                                    booking => booking.userId === user.uid && booking.status === "Booked"
                                );
    
                                if (bookingDetails) {
                                    // Check if the appointment date is exactly 1 day past the current date
                                    const appointmentDate = new Date(appointmentData.date);
                                    const currentDate = new Date();
    
                                    const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // Milliseconds in one day
                                    const differenceInTime = currentDate.getTime() - appointmentDate.getTime();
                                    const differenceInDays = Math.floor(differenceInTime / oneDayInMilliseconds);
    
                                    // Skip this booking if the appointment date is more than 1 day past the current date
                                    if (differenceInDays > 1) {
                                        console.log(`Appointment on ${appointmentData.date} has passed more than 1 day. Ignoring this booking.`);
                                        return; // Skip this booking
                                    }
    
                                    // Remove the centering class if it exists
                                    appointmentCard.classList.remove('center-content');
    
                                    const appointmentDateFormatted = appointmentDate.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    });
    
                                    const appointmentTimeSlot = bookingDetails.timeSlot;
                                    const [startTime, endTime] = appointmentTimeSlot.split(' - ');
    
                                    function formatTimeTo12Hr(time) {
                                        const [hours, minutes] = time.split(':');
                                        let period = 'AM';
                                        let hoursIn12HrFormat = parseInt(hours);
    
                                        if (hoursIn12HrFormat >= 12) {
                                            period = 'PM';
                                            if (hoursIn12HrFormat > 12) {
                                                hoursIn12HrFormat -= 12;
                                            }
                                        } else if (hoursIn12HrFormat === 0) {
                                            hoursIn12HrFormat = 12;
                                        }
    
                                        return `${hoursIn12HrFormat}:${minutes} ${period}`;
                                    }
    
                                    const formattedStartTime = formatTimeTo12Hr(startTime);
                                    const formattedEndTime = formatTimeTo12Hr(endTime);
    
                                    const appointmentHTML = 
                                        `<h5 class="card-title">Upcoming Appointment</h5>
                                        <div class="card-body">
                                            <p>${appointmentDateFormatted}</p>
                                            <p style="color: green;">${formattedStartTime} to ${formattedEndTime}</p>
                                        </div>
                                        <button class="card-button" id="myscheduleBtn">My Schedule</button>`;
                                    appointmentCard.innerHTML = appointmentHTML;
                                
                                    document.getElementById("myscheduleBtn").addEventListener("click", function() {
                                        window.location.href = "usersched.html";
                                    });
                                
                                    foundAppointment = true;
                                }
                            });
    
                            if (!foundAppointment) {
                                appointmentCard.classList.add('center-content');
                                appointmentCard.innerHTML = `
                                    <h5 class="card-title">Upcoming Appointment</h5>
                                    <p style="color: red;">No appointment yet</p>
                                `;
                            }
                        }
                    } else {
                        console.error("Appointment card element not found.");
                    }
    
                    // Display the package price and remaining balance in the balance card
                    const balanceCard = document.querySelector('.balance-card .card-container');
    
                    if (balanceCard) {
                        if (userData.packagePrice && userData.packageName) {
                            // Remove the centering class if it exists
                            balanceCard.classList.remove('center-content');
    
                            // Fetch the admin override price if available, otherwise use the original package price
                            let packagePrice = userData.adminOverridePrice ? userData.adminOverridePrice : userData.packagePrice;
                            
                            // Fetch total amount paid by the user from the 'sales' collection using the user's UID
                            const salesDocRef = doc(db, "sales", user.uid);  // Use user's UID directly
                            const salesDocSnap = await getDoc(salesDocRef);
    
                            let totalPaid = 0;
    
                            if (salesDocSnap.exists()) {
                                const salesData = salesDocSnap.data();
                                totalPaid = parseFloat(salesData.amountPaid);  // Get the total amount paid
                            }
    
                            // Calculate remaining balance: packagePrice - totalPaid
                            const remainingBalance = packagePrice - totalPaid;
    
                            // Display the calculated remaining balance in the balance card
                            balanceCard.innerHTML = `
                                <h5 class="card-title">Current Balance</h5>
                                <p class="card-body" style="color: red; font-size: 40px;">&#8369; ${remainingBalance.toFixed(2)}</p>
                                <button class="card-button" id="viewDetailsBtn">View Details</button>
                            `;
    
                            document.getElementById("viewDetailsBtn").addEventListener("click", async function() {
                                const packagesRef = collection(db, "packages");
                                const packageQuery = query(packagesRef, where("name", "==", userData.packageName));
                                const packageSnapshot = await getDocs(packageQuery);
    
                                if (!packageSnapshot.empty) {
                                    const packageData = packageSnapshot.docs[0].data();
    
                                    document.getElementById("packageName").textContent = `${packageData.name}`;
                                    document.getElementById("packagePrice").innerHTML = `&#8369;${packageData.price}`;
                                    document.getElementById("packageDescription").textContent = `${packageData.description}`;
    
                                    $('#packageModal').modal('show');
                                } else {
                                    console.log("Package details not found.");
                                }
                            });
                        } else {
                            balanceCard.classList.add('center-content');
                            balanceCard.innerHTML = `
                                <h5 class="card-title">Current Balance</h5>
                                <p style="color: #142A74;">No balance</p>
                            `;
                        }
                    } else {
                        console.error("Balance card element not found.");
                    }
                } else {
                    console.error("No such document!");
                }
            } catch (error) {
                console.error("Error getting document:", error);
            }
        } else {
            console.error("No user is currently signed in.");
        }
    });
    

    function disableLinks() {
        const linksToDisable = [
            'usermodule.html',
            'uservideolearning.html',
            'userquiz.html',
            'userappointment.html'
        ];

        linksToDisable.forEach(link => {
            const anchor = document.querySelector(`a[href="${link}"]`);
            if (anchor) {
                anchor.classList.add('disabled-link');
                anchor.style.pointerEvents = 'none';
                anchor.style.color = 'gray';
                anchor.style.cursor = 'default';
            }
        });
    }

    function addEventListenersForButtons() {
        const wheelsButton = document.querySelector('.wheels-card .eval-container button');
        const motorsButton = document.querySelector('.motors-card .eval-container button');
    
        if (wheelsButton) {
            wheelsButton.addEventListener('click', function() {
                $('#WheelsModal').modal('show');
            });
        } else {
            console.error("Wheels button not found in the DOM.");
        }
    
        if (motorsButton) {
            motorsButton.addEventListener('click', function() {
                $('#MotorsModal').modal('show');
            });
        } else {
            console.error("Motors button not found in the DOM.");
        }
    }
    
    // Add the event listeners when the DOM is fully loaded or after dynamic content has been loaded
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(addEventListenersForButtons, 500); // Adjust timeout based on dynamic loading if necessary
    });    

    // Fetch and display performance summary
    onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchAndDisplayPerformanceSummary(user.uid);
        } else {
            console.error("User is not logged in.");
        }
    });
});

async function fetchAndDisplayPerformance(studentId) {
    try {
        // Fetch the student's performance data from Firestore
        const studentDocRef = doc(db, "applicants", studentId);
        const studentDoc = await getDoc(studentDocRef);

        if (studentDoc.exists()) {
            const studentData = studentDoc.data();

            const WassessmentData = studentData.WassessmentData || {};
            const WprocessedData = studentData.WprocessedData || {};  // Get WprocessedData
            
            // Populate the WheelsModal with both score and performance data
            populateWheelsModal(WassessmentData, WprocessedData);
        }
    } catch (error) {
        console.error("Error fetching performance data:", error);
    }
}

function populateWheelsModal(assessmentData, WprocessedData) {
    const sentenceToFieldIdMap = {
        "Eye lead time": "eyeLeadTime",
        "Left – Right / Scanning / Shoulder checks": "leftRightScanning",
        "Mirrors / tracking traffic": "mirrorsTracking",
        "Following defensive distance": "defensiveDistance",
        "Space at Stops": "spaceAtStops",
        "Path of least resistance": "leastResistance",
        "Right-of-way": "rightOfWay",
        "Acceleration / Deceleration – Smoothness": "acceleration",
        "Braking: Full Stops, smooth": "braking",
        "Speed for Conditions": "speedForConditions",
        "Speed and Traffic signs": "trafficSigns",
        "Lane / Turn Position / set-up": "lanePosition",
        "Steering: hand position, smoothness": "steering",
        "Signals: timing and use": "signals",
        "Other: i.e horn, eye contact": "eyeContact",
        "Seating, head rest position, and mirror adjustment: seatbelt use": "seating",
        "Parking / Backing": "parking",
        "Anticipation: Adjusts": "anticipation",
        "Judgment: decisions": "judgment",
        "Timing: approach, Traffic interactions": "timing"
    };

    const categoryMapping = {
        'Observation': 'observationResult',
        'Space Management': 'spaceManagementResult',
        'Speed Control': 'speedControlResult',
        'Steering': 'steeringResult',
        'Communication': 'communicationResult',
        'General': 'generalResult'
    };

    // Populate scores in the modal fields
    assessmentData.categories.forEach(category => {
        category.items.forEach(item => {
            const fieldId = sentenceToFieldIdMap[item.sentence];
            if (fieldId) {
                const scoreElement = document.getElementById(fieldId);
                if (scoreElement) {
                    scoreElement.textContent = item.score; // Populate the score
                }
            }
        });
    });

    // Populate performance data (e.g., "Excellent", "Great", "Poor") and set the color
    Object.keys(categoryMapping).forEach(category => {
        const resultElementId = categoryMapping[category];
        const performanceResult = WprocessedData[category] || 'N/A'; // Fallback to 'N/A' if no data

        // Update the relevant category result and apply color
        const resultElement = document.getElementById(resultElementId);
        if (resultElement) {
            resultElement.textContent = performanceResult; // Set the performance result
            if (performanceResult === 'Poor') {
                resultElement.style.color = '#B60505'; // Set color to red for 'Poor'
            } else if (performanceResult === 'Great') {
                resultElement.style.color = '#142A74'; // Set color to green for 'Great'
            } else if (performanceResult === 'Excellent') {
                resultElement.style.color = 'green'; // Set color to green for 'Excellent'
            } else {
                resultElement.style.color = ''; // Default color for 'N/A' or unknown
            }
        }
    });
}

$('#WheelsModal').on('show.bs.modal', function () {
    const loggedInStudentId = auth.currentUser.uid; // Get the logged-in student's ID
    fetchAndDisplayPerformance(loggedInStudentId);  // Fetch and display the performance data
});

// Fetch and display motorcycle performance data
async function fetchAndDisplayMotorPerformance(studentId) {
    try {
        const studentDocRef = doc(db, "applicants", studentId); // Fetch the correct document
        const studentDoc = await getDoc(studentDocRef);

        if (studentDoc.exists()) {
            const studentData = studentDoc.data();

            // Fetch the MassessmentData and MprocessedData if they exist in the document
            const MassessmentData = studentData.MassessmentData || {}; 
            const MprocessedData = studentData.MprocessedData || {};  

            // Check if data is available
            if (Object.keys(MassessmentData).length === 0) {
                console.error("MassessmentData is empty");
            }

            if (Object.keys(MprocessedData).length === 0) {
                console.error("MprocessedData is empty");
            }

            // Populate the modal with the fetched data
            populateMotorsModal(MassessmentData, MprocessedData);
        } else {
            console.error("No such document exists for the student.");
        }
    } catch (error) {
        console.error("Error fetching motorcycle performance data:", error);
    }
}

function populateMotorsModal(assessmentData, processedData) {
    const sentenceToFieldIdMap = {
        "Moving off, riding ahead and stopping": "motorcycleMovingOff",
        "Positioning in different environments": "motorcyclePositioning",
        "Passing stationary vehicles and pedestrians": "motorcyclePassingVehicles",
        "Meeting oncoming traffic": "motorcycleOncomingTraffic",
        "Riding ahead of or behind other road users": "ridingAheadorBehind",
        "Riding side by side": "ridingSidebySide",
        "Straight through": "straightThrough",
        "Turning Left or Right": "turningLeftorRight",
        "With or Without obligation to give the right of way": "obligationsToGiveRightofWay",
        "ABC of passing junction": "abcPassingJunction"
    };

    const categoryMapping = {
        'Approaching and passing railway crossings': 'approaching',
        'Approaching, riding in and leaving roundabouts': 'leavingRoundabouts',
        'Choice of speed in different situations (low speed balancing)': 'lowSpeedBalancing',
        'Hill riding':'hillRiding',
        'Interaction with various road users': 'variousRoadUsers',
        'Lane shift and choice of lanes': 'laneShift',
        'Overtaking': 'overTaking',
        'Riding along a curve or bend (cornering)': 'cornering',
        'Riding different kinds of junctions': 'kindofJunctions',
        'Riding with a back ride': 'backRiding',
        'Start the engine': 'startTheEngine',
        'Stopping and parking': 'stoppingAndParking',
        'Turning and lane changing': 'turningLane',
    };

    // Populate numeric scores
    assessmentData.categories.forEach(category => {
        category.items.forEach(item => {
            const fieldId = sentenceToFieldIdMap[item.sentence];
            if (fieldId) {
                const scoreElement = document.getElementById(fieldId);
                if (scoreElement) {
                    scoreElement.textContent = item.score;  // Set the numeric score
                }
            }
        });
    });

    // Populate performance data (e.g., "Excellent", "Great", "Poor") and set the color
    Object.keys(categoryMapping).forEach(category => {
        const performanceResult = processedData[category] || 'N/A'; // Fallback to 'N/A' if no data
        const resultElement = document.getElementById(categoryMapping[category]);

        if (resultElement) {
            resultElement.textContent = performanceResult; // Set the performance result
            if (performanceResult === 'Poor') {
                resultElement.style.color = '#B60505'; // Set color to red for 'Poor'
            } else if (performanceResult === 'Great') {
                resultElement.style.color = '#142A74'; // Set color to green for 'Great'
            } else if (performanceResult === 'Excellent') {
                resultElement.style.color = 'green'; // Set color to green for 'Excellent'
            } else {
                resultElement.style.color = ''; // Default color for 'N/A' or unknown
            }
        }
    });
}

$('#MotorsModal').on('show.bs.modal', function () {
    const loggedInStudentId = auth.currentUser.uid; // Get the logged-in student's ID
    fetchAndDisplayMotorPerformance(loggedInStudentId); // Fetch and display the motor performance data
});

// Function to display performance data or "No performance yet" message
async function fetchAndDisplayPerformanceSummary(studentId) {
    try {
        const studentDocRef = doc(db, "applicants", studentId);
        const studentDoc = await getDoc(studentDocRef);

        if (studentDoc.exists()) {
            const studentData = studentDoc.data();

            // Check if the user is enrolled in 4-wheels or motorcycle courses based on packageType
            const packageTypes = studentData.packageType || [];

            const isEnrolledIn4Wheels = packageTypes.includes("PDC");
            const isEnrolledInMotorcycle = packageTypes.includes("PDC");

            const WprocessedData = studentData.WprocessedData || {};
            const MprocessedData = studentData.MprocessedData || {};

            const wheelsCard = document.querySelector('.wheels-card .eval-container');
            const motorsCard = document.querySelector('.motors-card .eval-container');

            // Handle 4-Wheels Performance Evaluation
            if (!isEnrolledIn4Wheels) {
                wheelsCard.innerHTML = `
                    <h3>4-Wheels Performance Evaluation</h3>
                    <p style="color: red;">You did not enroll in any 4-Wheel course, so there is no evaluation form available.</p>
                `;
            } else if (Object.keys(WprocessedData).length > 0) {
                // Show "See more details" button if data exists
                wheelsCard.innerHTML = `
                    <h3>4-Wheels Performance Evaluation</h3>
                    <button type="button">See more details</button>
                `;

                wheelsCard.querySelector('button').addEventListener('click', function () {
                    $('#WheelsModal').modal('show'); // Show 4-Wheels modal
                });
            } else {
                // Show "No performance yet" if no data exists
                wheelsCard.innerHTML = `
                    <h3>4-Wheels Performance Evaluation</h3>
                    <p style="color: red;">No performance evaluation yet</p>
                `;
            }

            // Handle Motorcycle Performance Evaluation
            if (!isEnrolledInMotorcycle) {
                motorsCard.innerHTML = `
                    <h3>Motorcycle Performance Evaluation</h3>
                    <p style="color: red;">You did not enroll in any Motorcycle course, so there is no evaluation form available.</p>
                `;
            } else if (Object.keys(MprocessedData).length > 0) {
                // Show "See more details" button if data exists
                motorsCard.innerHTML = `
                    <h3>Motorcycle Performance Evaluation</h3>
                    <button type="button">See more details</button>
                `;

                motorsCard.querySelector('button').addEventListener('click', function () {
                    $('#MotorsModal').modal('show'); // Show Motorcycle modal
                });
            } else {
                // Show "No performance yet" if no data exists
                motorsCard.innerHTML = `
                    <h3>Motorcycle Performance Evaluation</h3>
                    <p style="color: red;">No performance evaluation yet</p>
                `;
            }
        } else {
            console.error("No student document found.");
        }
    } catch (error) {
        console.error("Error fetching performance data:", error);
    }
}

// Fetch the logged-in student's performance summary on page load
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchAndDisplayPerformanceSummary(user.uid);
    } else {
        console.error("User is not logged in.");
    }
});

// Function to check if the user has a matched instructor
async function checkForInstructorMatch(userId) {
    const matchesRef = collection(db, "matches");
    const q = query(matchesRef, where("studentId", "==", userId));

    try {
        const snapshot = await getDocs(q);
        return !snapshot.empty; // Return true if there's at least one match
    } catch (error) {
        console.error("Error checking instructor match:", error);
        return false; // Default to no match in case of an error
    }
}

// Function to show notice 3 days before the appointment
async function showNoticeIfAppointmentIsNear(appointmentDate) {
    const currentDate = new Date();
    const timeDifference = new Date(appointmentDate) - currentDate; // Time difference in milliseconds
    const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24)); // Convert to days

    const user = auth.currentUser; // Get the current user
    if (user) {
        const hasInstructorMatch = await checkForInstructorMatch(user.uid); // Check if the user has a matched instructor

        if (!hasInstructorMatch && daysDifference <= 3 && daysDifference >= 0) {
            document.querySelector('.notice').style.display = 'block'; // Show the notice
        } else {
            document.querySelector('.notice').style.display = 'none'; // Hide the notice
        }
    }
}

// Add an event listener to close the notice when the "X" button is clicked
document.querySelector('.notice .close').addEventListener('click', function () {
    document.querySelector('.notice').style.display = 'none'; // Hide the notice
});

// Example: If the appointment is fetched successfully
onAuthStateChanged(auth, async function (user) {
    if (user) {
        try {
            const appointmentsRef = collection(db, "appointments");
            const q = query(appointmentsRef, where("bookings", "!=", null)); // Query for documents with bookings array
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach(doc => {
                const appointmentData = doc.data();
                const bookingDetails = appointmentData.bookings.find(
                    booking => booking.userId === user.uid && booking.status === "Booked"
                );

                if (bookingDetails) {
                    const appointmentDate = new Date(appointmentData.date);

                    // Call the function to check if the appointment is near and show/hide the notice accordingly
                    showNoticeIfAppointmentIsNear(appointmentDate);
                }
            });
        } catch (error) {
            console.error("Error fetching appointment data:", error);
        }
    } else {
        console.error("No user is currently signed in.");
    }
});