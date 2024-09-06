import os
from google.cloud import firestore

# Set up Firestore authentication
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "authentication-d6496-firebase-adminsdk-zoywr-32ecaa91eb.json"

# Initialize Firestore
db = firestore.Client()

def fetch_data():
    """
    Fetch students, instructors, and appointments data from Firestore.
    """
    # Fetch all applicants (students), instructors, and appointments
    applicants_ref = db.collection('applicants').stream()
    instructors_ref = db.collection('instructors').stream()
    appointments_ref = db.collection('appointments').stream()

    # Parse Firestore data into dictionaries
    students = {doc.id: doc.to_dict() for doc in applicants_ref}
    instructors = {
        doc.id: doc.to_dict() 
        for doc in instructors_ref 
        if doc.to_dict().get('active', False)  # Only include active instructors
    }
    appointments = {doc.id: doc.to_dict() for doc in appointments_ref}

    return students, instructors, appointments

def get_student_course(student_id, appointments):
    """
    Get the course of the student based on their studentId in the appointments collection.
    """
    for appointment_id, appointment in appointments.items():
        bookings = appointment.get('bookings', [])
        # Iterate over each booking inside the appointment
        for booking in bookings:
            if booking.get('userId') == student_id:
                print(f"Found matching userId (studentId): {student_id} in appointment: {appointment_id}")
                print(f"Returning course: {appointment.get('course')}")
                return appointment.get('course')  # Return the course from the appointment
    print(f"No course found for studentId: {student_id}")
    return None

def get_highest_rated_instructor(instructors, course):
    """
    Find the highest rated instructor who teaches the given course.
    """
    # Filter instructors who teach the given course
    eligible_instructors = [
        (instructor_id, instructor) 
        for instructor_id, instructor in instructors.items() 
        if instructor.get('course') == course
    ]
    
    if not eligible_instructors:
        return None
    
    # Sort by rating, then return the highest rated instructor
    highest_rated_instructor = max(eligible_instructors, key=lambda x: x[1].get('rating', 0))
    return highest_rated_instructor[0]  # Return the instructor_id

def match_students_instructors(students, instructors, appointments):
    matches = {}
    
    for student_id, student in students.items():
        best_match = None
        best_score = 0
        # Use studentId from students to match the userId in bookings
        course = get_student_course(student_id, appointments)
        if not course:
            continue  # If the student has no course, skip matching

        # Filter instructors based on the student's course
        eligible_instructors = {
            instructor_id: instructor 
            for instructor_id, instructor in instructors.items() 
            if instructor.get('course') == course and instructor.get('active', False)
        }

        if not eligible_instructors:
            continue

        # Perform traits-based matching
        for instructor_id, instructor in eligible_instructors.items():
            student_traits = student.get('traits', [])
            instructor_traits = instructor.get('traits', [])
            if isinstance(student_traits, list) and isinstance(instructor_traits, list):
                matching_traits = len(set(student_traits).intersection(instructor_traits))
                if matching_traits > best_score:
                    best_score = matching_traits
                    best_match = instructor_id
        
        # Fallback to highest rated instructor
        if not best_match:
            best_match = get_highest_rated_instructor(eligible_instructors, course)
        
        if best_match:
            matches[student_id] = best_match
    
    return matches

def main():
    """
    Main function to run the matching process.
    """
    # Fetch data from Firestore
    students, instructors, appointments = fetch_data()

    # If there are no students or instructors, return an empty result
    if not students or not instructors:
        print("No students or instructors available for matching.")
        return []

    # Run the matching algorithm
    matches = match_students_instructors(students, instructors, appointments)

    # Log the results instead of saving them to Firestore
    print("Matching results:", matches)
    
    # Return the matches so they can be processed further
    return matches

if __name__ == "__main__":
    main()
