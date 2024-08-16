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

     // Close the notification list when clicking outside of it
    document.addEventListener('click', function(event) {
        if (!notificationList.contains(event.target) && !notificationBell.contains(event.target)) {
            notificationList.classList.add('hidden');
            notificationList.classList.remove('show');
        }
    });

    onAuthStateChanged(auth, async function(user) {
        if (user) {
            try {
                const userDocRef = doc(db, "applicants", user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const userRole = userData.role;
    
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
    
                    // Fetch the user's upcoming appointment
                    const appointmentsRef = collection(db, "appointments");
                    const q = query(appointmentsRef, where("bookings", "!=", null)); // Query for documents with bookings array
                    
                    const querySnapshot = await getDocs(q);
    
                    // Select the appointmentCard element
                    const appointmentCard = document.querySelector('.appointment-card .card-body');
    
                    if (appointmentCard) {
                        if (!querySnapshot.empty) {
                            let foundAppointment = false;
                            querySnapshot.forEach(doc => {
                                const appointmentData = doc.data();
                                const bookingDetails = appointmentData.bookings.find(
                                    booking => booking.userId === user.uid && booking.status === "Booked"
                                );
                    
                                if (bookingDetails) {
                                    // Remove the centering class if it exists
                                    appointmentCard.classList.remove('center-content');
                    
                                    const appointmentDate = new Date(appointmentData.date).toLocaleDateString('en-US', {
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
                    
                                    const appointmentHTML = `
                                        <h5 class="card-title">Upcoming Appointment</h5>
                                        <div>
                                            <p>${appointmentDate}</p>
                                            <p style="color: green;">${formattedStartTime} to ${formattedEndTime}</p>
                                        </div>
                                        <button class="btn btn-primary" id="myscheduleBtn">My Schedule</button>
                                    `;
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
    
                    // Display the package price in the balance card
                    const balanceCard = document.querySelector('.balance-card .card-body');
                    
                    if (balanceCard) {
                        if (userData.packagePrice && userData.packageName) {
                            // Remove the centering class if it exists
                            balanceCard.classList.remove('center-content');
    
                            balanceCard.innerHTML = `
                                <h5 class="card-title">Current Balance</h5>
                                <p class="card-title" style="color: red; font-size: 40px;">&#8369; ${userData.packagePrice}</p>
                                <button class="btn btn-primary" id="viewDetailsBtn">View Details</button>
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

    // Initialize the roadmap modal functionality
    initializeRoadmap(userData);

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

                document.getElementById('step-details').innerHTML = stepDetails;
            });
        });
    }
});