import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, doc, getDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

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

document.addEventListener('DOMContentLoaded', function () {
    const notificationBell = document.getElementById('notification-bell');
    const notificationList = document.getElementById('notification-list');

    // Toggle the visibility of the notification list when the bell is clicked
    notificationBell.addEventListener('click', function() {
        notificationList.classList.toggle('show');
        notificationList.classList.toggle('hidden');
    });

    // Function to display notifications
    function displayNotifications(notifications) {
        notificationList.innerHTML = ""; // Clear existing notifications

        if (notifications.length === 0) {
            notificationList.innerHTML = "<div class='notification-item'>No new notifications</div>";
            return;
        }

        notifications.forEach(notification => {
            const notificationElement = document.createElement("div");
            notificationElement.className = "notification-item";
            notificationElement.style.cursor = "pointer"; // Make it clear that the item is clickable

            notificationElement.innerHTML = `
                ${notification.message}
                <span class="close-btn">&times;</span>
            `;

            notificationList.appendChild(notificationElement);

            // Add click event to close the notification
            notificationElement.querySelector('.close-btn').addEventListener('click', function(event) {
                event.stopPropagation(); // Prevent the redirection when closing
                notificationElement.remove();
            });

            // Redirect to the appointment page when the notification is clicked
            notificationElement.addEventListener('click', function() {
                window.location.href = 'userappointment.html';
            });
        });
    }

    onAuthStateChanged(auth, async function(user) {
        if (user) {
            try {
                const userDocRef = doc(db, "applicants", user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const userRole = userData.role;
                    const userFirstName = userData.personalInfo.first;
    
                    // Check if the welcome message element exists before setting the text
                    const welcomeMessageElement = document.querySelector('.page-content h2');
                    if (welcomeMessageElement) {
                        welcomeMessageElement.textContent = `Welcome, ${userFirstName}!`;
                    } else {
                        console.error("Welcome message element not found.");
                    }
    
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
                            const notifications = snapshot.docs.map(doc => doc.data());
                            displayNotifications(notifications);
                        });
                    }
    
                    // Initialize the roadmap modal functionality
                    initializeRoadmap(userData);
    
                    // Fetch the user's upcoming appointment
                    const appointmentsRef = collection(db, "appointments");
                    const q = query(appointmentsRef, where("bookings", "!=", null)); // Query for documents with bookings array
                    
                    const querySnapshot = await getDocs(q);
    
                    if (!querySnapshot.empty) {
                        let foundAppointment = false;
                        querySnapshot.forEach(doc => {
                            const appointmentData = doc.data();
                            const bookingDetails = appointmentData.bookings.find(
                                booking => booking.userId === user.uid && booking.status === "Booked"
                            );
    
                            if (bookingDetails) {
                                // Correctly access the date from the main appointment document
                                const appointmentDate = appointmentData.date;
                                const appointmentTimeSlot = bookingDetails.timeSlot;
    
                                // Update appointment details in UI
                                const appointmentCard = document.querySelector('.appointment-card .card-body');
                                
                                // Inject the appointment details into the card
                                const appointmentHTML = `
                                    <h5 class="card-title">Upcoming Appointment</h5>
                                    <p>${appointmentDate} at ${appointmentTimeSlot}</p>
                                    <button class="btn btn-primary" id="rescheduleBtn">Reschedule</button>
                                `;
                                appointmentCard.innerHTML = appointmentHTML;
    
                                // Add event listener to the Reschedule button
                                document.getElementById("rescheduleBtn").addEventListener("click", function() {
                                    window.location.href = "usersched.html";
                                });
    
                                foundAppointment = true;
                            }
                        });
    
                        if (!foundAppointment) {
                            console.log("No upcoming appointments found for this user.");
                        }
                    } else {
                        console.log("No appointments found in the database.");
                    }
    
                    // Display the package price in the balance card
                    const packagePrice = userData.packagePrice;
                    const packageName = userData.packageName;
                    const balanceCard = document.querySelector('.balance-card .card-body');
                    balanceCard.innerHTML = `
                        <h5 class="card-title">Balance</h5>
                        <p>₱${packagePrice}</p>
                        <button class="btn btn-primary" id="viewDetailsBtn">View Details</button>
                    `;
    
                    // Add event listener to the "View Details" button
                    document.getElementById("viewDetailsBtn").addEventListener("click", async function() {
                        // Fetch the package details from the 'packages' collection
                        const packagesRef = collection(db, "packages");
                        const packageQuery = query(packagesRef, where("name", "==", packageName));
                        const packageSnapshot = await getDocs(packageQuery);
    
                        if (!packageSnapshot.empty) {
                            const packageData = packageSnapshot.docs[0].data();
    
                            // Populate the modal with package details
                            document.getElementById("packageName").textContent = `Package Name: ${packageData.name}`;
                            document.getElementById("packagePrice").textContent = `Price: ₱${packageData.price}`;
                            document.getElementById("packageDescription").textContent = `Description: ${packageData.description}`;
    
                            // Show the modal
                            $('#packageModal').modal('show');
                        } else {
                            console.log("Package details not found.");
                        }
                    });
                    
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

    // Function to disable sidebar links
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
                anchor.style.pointerEvents = 'none';  // Make the link unclickable
                anchor.style.color = 'gray';  // Change color to indicate it's disabled
                anchor.style.cursor = 'default';  // Change cursor to default
            }
        });
    }

    // Function to initialize the roadmap modal functionality
    function initializeRoadmap(userData) {
        const roadmapItems = document.querySelectorAll('.roadmap-item');

        roadmapItems.forEach(item => {
            item.addEventListener('click', function() {
                const step = this.getAttribute('data-step');
                let stepDetails = "";

                switch(step) {
                    case '1':
                        stepDetails = "<p>Step 1: Inquire</p><p>Details about the inquiry process...</p>";
                        break;
                    case '2':
                        stepDetails = "<p>Step 2: Enroll</p><p>Details about enrollment...</p>";
                        break;
                    case '3':
                        stepDetails = "<p>Step 3: Modules</p><p>Details about the modules...</p>";
                        break;
                    case '4':
                        stepDetails = "<p>Step 4: Test</p><p>Details about testing...</p>";
                        break;
                    case '5':
                        stepDetails = "<p>Step 5: Certification</p><p>Details about certification...</p>";
                        break;
                    default:
                        stepDetails = "<p>Invalid step</p>";
                }

                // Display the appropriate content in the modal
                document.getElementById('step-details').innerHTML = stepDetails;
            });
        });
    }
});
