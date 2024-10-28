// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, limit, startAfter, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Firebase configuration
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
const db = getFirestore(app); // Firestore instance
const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };

function showNotification(message) {
    document.getElementById('notificationModalBody').textContent = message;
    $('#notificationModal').modal('show');
}

function showLoader() {
    document.getElementById('loader1').style.display = 'flex'; // Ensure loader is visible
}

// Hide the loader
function hideLoader() {
    document.getElementById('loader1').style.display = 'none'; // Hide loader after table has loaded
}

let matchesUnsubscribe = null;

function setUpMatchedStudentsListener() {
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, where('matchStatus', '==', 'In Progress'));

    try {
        matchesUnsubscribe = onSnapshot(q, async (querySnapshot) => {
            const students = [];

            for (const doc of querySnapshot.docs) {
                const matchData = doc.data();
                const { instructorId, matchedAt } = matchData;
                const studentId = doc.id;

                // Fetch course details and ignore if all courses are completed
                const courseDetails = await fetchCourseAndAppointmentDateForStudent(studentId);

                if (courseDetails !== null) { // Ignore students with only completed courses
                    students.push({
                        studentId,
                        instructorId,
                        matchedAt,
                        ...courseDetails // Spread course details into the student object
                    });
                }
            }

            await renderStudents(students);
        });
    } catch (error) {
        console.error('Error setting up listener:', error);
    }
}

// Fetch student name and instructor name from Firestore
async function fetchStudentAndInstructorDetails(studentId, instructorId) {
    try {
        const [studentDocSnap, instructorDocSnap] = await Promise.all([
            getDoc(doc(db, 'applicants', studentId)),
            getDoc(doc(db, 'instructors', instructorId))
        ]);

        let studentName = 'Unknown Student';
        if (studentDocSnap.exists()) {
            const studentData = studentDocSnap.data();
            studentName = `${studentData.personalInfo.first} ${studentData.personalInfo.last}`;
        }

        let instructorName = 'Unknown Instructor';
        if (instructorDocSnap.exists()) {
            instructorName = instructorDocSnap.data().name;
        }

        return { studentName, instructorName };
    } catch (error) {
        return { studentName: 'Error Fetching Name', instructorName: 'Error Fetching Name' };
    }
}

// Fetch course data and appointment date for the student
async function fetchCourseAndAppointmentDateForStudent(studentId) {
    try {
        const appointmentsRef = collection(db, 'appointments');
        const q = query(appointmentsRef);
        const querySnapshot = await getDocs(q);

        let course = null;
        let appointmentDate = null;

        querySnapshot.forEach((doc) => {
            const appointmentData = doc.data();

            if (appointmentData.bookings && Array.isArray(appointmentData.bookings)) {
                const bookings = appointmentData.bookings;

                // Check for active (non-completed) bookings
                const activeBooking = bookings.find((booking) => booking.userId === studentId && booking.progress !== 'Completed');

                if (activeBooking) {
                    course = appointmentData.course || 'Unknown Course';
                    appointmentDate = new Date(appointmentData.date).toLocaleDateString('en-US', dateOptions);
                }
            }
        });

        // If no active bookings found, return null
        if (!course) {
            return null;
        }

        return { course, appointmentDate };
    } catch (error) {
        return { course: 'Error Fetching Course', appointmentDate: 'Error Fetching Date' };
    }
}

// Function to fetch student traits from Firestore
async function fetchStudentTraits(studentId) {
    try {
        const studentDoc = await getDoc(doc(db, 'applicants', studentId));
        if (studentDoc.exists()) {
            const studentData = studentDoc.data();
            return studentData.traits || [];
        } else {
            return [];
        }
    } catch (error) {
        return [];
    }
}

// Render the list of students with their match details
async function renderStudents(students) { // Show loader before starting the rendering process
    const studentListContainer = document.querySelector('.student-list');
    studentListContainer.innerHTML = ''; // Clear any existing data

    if (students.length === 0) {
        // Display "No student/s yet" when there are no students
        const noDataMessage = `
            <tr>
                <td colspan="7" class="text-center">No student/s yet</td>
            </tr>
        `;
        studentListContainer.innerHTML = noDataMessage;
        hideLoader(); // Hide loader since there's no data to load
        return; // Exit the function early since there is nothing to render
    }

    // Array to hold all the promises
    const studentPromises = students.map(async (student) => {
        const { studentId, instructorId, matchedAt } = student;
        const [studentDetails, courseDetails] = await Promise.all([
            fetchStudentAndInstructorDetails(studentId, instructorId),
            fetchCourseAndAppointmentDateForStudent(studentId)
        ]);

        // Fetch student traits
        const studentTraits = await fetchStudentTraits(studentId); // New function to get traits

        return {
            studentId,
            instructorId,
            matchedAt,
            studentName: studentDetails.studentName,
            instructorName: studentDetails.instructorName,
            course: courseDetails.course,
            appointmentDate: courseDetails.appointmentDate,
            traits: studentTraits // Include traits in the object
        };
    });

    // Wait for all promises to resolve
    const studentDataList = await Promise.all(studentPromises);

    // Now render all students
    studentDataList.forEach((studentData) => {
        const { studentId, instructorId, matchedAt, studentName, instructorName, course, appointmentDate, traits } = studentData;

        // Create the trait list for the popover content
        const traitList = traits.length > 0 
            ? `<ul class='trait-list'>${traits.map(trait => `<li>${trait}</li>`).join('')}</ul>`
            : 'No traits available';

        const studentRow = `
            <tr>
                <td>${studentName}</td>
                <td>${instructorName}</td>
                <td>${course}</td>
                <td>${new Date(matchedAt.seconds * 1000).toLocaleDateString('en-US', dateOptions)}</td>
                <td>${appointmentDate}</td>
                <td>
                    <i class="bi bi-info-circle"
                        data-toggle="popover"
                        data-html="true"
                        data-trigger="hover"
                        data-placement="right"
                        data-delay='{"show":100, "hide":100}'
                        data-content="${traitList}">
                    </i>
                </td>
                <td>
                    <button class="btn custom-btn" data-student-id="${studentId}" data-instructor-id="${instructorId}">See Instructor</button>
                </td>
            </tr>
        `;
        studentListContainer.innerHTML += studentRow;
    });

    // Reattach popovers for student traits after rendering
    reattachStudentListPopovers(); // Initialize popovers for student list

    // Attach event listeners for the "See Instructor" buttons
    document.querySelectorAll('.custom-btn').forEach(function(button) {
        button.addEventListener('click', async function() {
            const studentId = this.getAttribute('data-student-id');
            const currentInstructorId = this.getAttribute('data-instructor-id');
            await showInstructorList(studentId, currentInstructorId);
        });
    });

    hideLoader(); // Hide the loader after rendering is done
}

// Function to reinitialize popovers for student list after closing the modal
function reattachStudentListPopovers() {
    // Reattach popovers for the student list
    $('[data-toggle="popover"]').popover();  // Initialize all popovers again
}

// Initialize modal hidden event to clear the modal content
$('#assigninstructormodal').on('hidden.bs.modal', function () {
    // Clear instructor list
    document.querySelector('.instructor-list').innerHTML = '';

    // Clear any previously attached event listeners to avoid duplication
    document.querySelectorAll('.custom-btn').forEach(function(button) {
        button.removeEventListener('click', handleReassignClick);
    });

    // Dispose of all popovers in the modal and outside
    $('[data-toggle="popover"]').popover('dispose');  // Clear all popovers

    // Reinitialize the popovers in the student list when modal is closed
    reattachStudentListPopovers();
});

// Function to handle instructor reassignment button click
async function handleReassignClick(event) {
    const newInstructorId = this.getAttribute('data-instructor-id');
    const studentId = this.getAttribute('data-student-id');
    await reassignInstructor(studentId, newInstructorId);
}

// Fetch and show available instructors (excluding current instructor)
async function showInstructorList(studentId, currentInstructorId) {
    const { course } = await fetchCourseAndAppointmentDateForStudent(studentId);  // Fetch course dynamically
    const instructors = await fetchInstructorsForCourse(course, currentInstructorId); // Exclude current instructor

    // Populate the modal with instructor data and allow reassignment
    renderInstructors(instructors, studentId);
    $('#assigninstructormodal').modal('show'); // Show the modal
}

// Firestore update for instructor reassignment
async function reassignInstructor(studentId, newInstructorId) {
    try {
        const matchRef = doc(db, 'matches', studentId);
        await updateDoc(matchRef, {
            'instructorId': newInstructorId,
            'matchedAt': new Date(),
            'matchStatus': 'In Progress'
        });
        showNotification('Instructor successfully reassigned!');

        $('#assigninstructormodal').modal('hide');

    } catch (error) {
        showNotification('An error occurred while reassigning the instructor. Please try again.');
    }
}

// Fetch instructors based on course for reassignment, excluding the current matched instructor
async function fetchInstructorsForCourse(course, currentInstructorId) {
    const instructorsRef = collection(db, 'instructors');
    let q = query(instructorsRef, where('courses', 'array-contains', course), where('active', '==', true));

    try {
        const querySnapshot = await getDocs(q);
        const instructors = [];

        querySnapshot.forEach((doc) => {
            const instructorData = doc.data();

            // Exclude the current matched instructor from the list
            if (doc.id !== currentInstructorId) {  // Ensure the current instructor is excluded
                instructors.push({
                    id: doc.id,
                    name: instructorData.name,
                    courses: instructorData.courses || [],
                    traits: instructorData.instructor_traits || []
                });
            }
        });

        return instructors;

    } catch (error) {
    }
}

function renderInstructors(instructors, studentId) {
    const instructorListContainer = document.querySelector('.instructor-list');
    instructorListContainer.innerHTML = ''; // Clear any existing data

    instructors.forEach(instructor => {
        const courses = Array.isArray(instructor.courses) ? instructor.courses.join(' || ') : 'Unknown Course';

        // Generate the list of traits in the desired layout
        const traitList = `
            <ul class='trait-list'>
                ${instructor.traits.map(trait => `<li>${trait}</li>`).join('')}
            </ul>
        `;

        const instructorRow = `
            <tr>
                <td>${instructor.name}</td>
                <td>${courses}</td>
                <td>
                    <i class="bi bi-info-circle"
                        data-toggle="popover"
                        data-html="true"
                        data-trigger="hover"
                        data-placement="right"
                        data-delay='{"show":100, "hide":100}'
                        data-content="${traitList}">
                    </i>
                </td>
                <td>
                    <button class="btn custom-btn" data-instructor-id="${instructor.id}" data-student-id="${studentId}">Reassign</button>
                </td>
            </tr>
        `;
        instructorListContainer.innerHTML += instructorRow;
    });

    // Reattach popovers
    $('[data-toggle="popover"]').popover();

    // Attach event listeners for the "Reassign" buttons
    document.querySelectorAll('.custom-btn').forEach(function(button) {
        button.addEventListener('click', handleReassignClick);
    });
}

// Function to load students with matches and update pagination controls
async function loadMatchedStudents() {
    // Detach any existing listener
    if (matchesUnsubscribe) {
        matchesUnsubscribe();
        matchesUnsubscribe = null;
    }

    setUpMatchedStudentsListener();
}

// Initialize page loading
document.addEventListener('DOMContentLoaded', function() {
    showLoader(); // Show loader when the page starts loading
    loadMatchedStudents();  // Load the first page of students
});