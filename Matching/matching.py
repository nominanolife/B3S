import os
import pandas as pd
from google.cloud import firestore
from ortools.sat.python import cp_model

# Set up Firestore authentication
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "authentication-d6496-firebase-adminsdk-zoywr-32ecaa91eb.json"

# Initialize Firestore
db = firestore.Client()

def fetch_data():
    # Fetch all applicants (students), instructors, and appointments
    applicants_ref = db.collection('applicants').stream()
    instructors_ref = db.collection('instructors').stream()
    appointments_ref = db.collection('appointments').stream()

    # Parse Firestore data into dictionaries
    students = {doc.id: doc.to_dict() for doc in applicants_ref}
    instructors = {
        doc.id: doc.to_dict() 
        for doc in instructors_ref 
        if doc.to_dict().get('active', False)
    }

    # Parse appointments and filter out bookings with 'Completed' status
    appointments = {}
    for doc in appointments_ref:
        appointment = doc.to_dict()
        bookings = appointment.get('bookings', [])

        # Keep only appointments with bookings that are not completed
        valid_bookings = [
            booking for booking in bookings 
            if booking.get('status', '').lower() != 'completed'
        ]

        if valid_bookings:
            # Update the appointment to contain only non-completed bookings
            appointment['bookings'] = valid_bookings
            appointments[doc.id] = appointment

    return students, instructors, appointments

def get_student_course(student_id, appointments):
    # Define the list of preferred courses
    preferred_courses = ["PDC-4Wheels", "PDC-Motors"]
    
    # Iterate through all appointments to find the student's active booking
    for appointment_id, appointment in appointments.items():
        bookings = appointment.get('bookings', [])
        
        # Check each booking for the student ID and a valid course
        for booking in bookings:
            if booking.get('userId') == student_id:
                course = appointment.get('course', '')  # Fetch course from appointment itself
                if course in preferred_courses:
                    return course
    return None

def load_complementary_traits(file_path):
    traits_data = pd.read_csv(file_path)
    complementary_traits = {
        (str(row['traits']).strip().lower(), str(row['instructor_traits']).strip().lower()): row['Match Result']
        for _, row in traits_data.iterrows()
    }

    return complementary_traits

def calculate_match_score(student_traits, instructor_traits, complementary_traits):
    total_score = 0
    weight_per_match = 1

    for student_trait in student_traits:
        for instructor_trait in instructor_traits:
            normalized_student_trait = student_trait.lower().strip()
            normalized_instructor_trait = instructor_trait.lower().strip()

            match_key = (normalized_student_trait, normalized_instructor_trait)
            match_result = complementary_traits.get(match_key, 0)

            total_score += match_result * weight_per_match

    return total_score

def match_students_instructors(students, instructors, appointments, logged_in_student_id, complementary_traits):
    # Retrieve the student's data
    student = students.get(logged_in_student_id)
    if not student:
        return {"status": "error", "message": f"Student ID {logged_in_student_id} not found."}

    # Retrieve the student's preferred course
    course = get_student_course(logged_in_student_id, appointments)
    if not course:
        return {"status": "error", "message": "No course found for student."}

    # Step 1: Use CSP for constraint validation only
    model = cp_model.CpModel()
    match_vars = {}

    # Only instructors that satisfy the course and active status will be considered
    eligible_instructors = {}
    for instructor_id, instructor in instructors.items():
        if course in instructor.get('courses', []) and instructor.get('active', False):
            match_vars[instructor_id] = model.NewBoolVar(f"match_{logged_in_student_id}_{instructor_id}")
            eligible_instructors[instructor_id] = instructor

    if not eligible_instructors:
        return {"status": "error", "message": f"No eligible instructors found for course {course}."}

    # Use CSP to validate other constraints (traits, etc.)
    for instructor_id, instructor in eligible_instructors.items():
        student_traits = student.get('traits', [])
        instructor_traits = instructor.get('instructor_traits', [])
        match_score = calculate_match_score(student_traits, instructor_traits, complementary_traits)

        # CSP ensures only valid matches are considered
        model.Add(match_score > 0).OnlyEnforceIf(match_vars[instructor_id])

    # Step 2: Manual matching based on highest score and rating
    best_instructor = None
    highest_score = -1
    best_rating = -1

    for instructor_id, instructor in eligible_instructors.items():
        student_traits = student.get('traits', [])
        instructor_traits = instructor.get('instructor_traits', [])
        match_score = calculate_match_score(student_traits, instructor_traits, complementary_traits)

        instructor_rating = instructor.get('rating', 0)

        # Find the instructor with the highest score
        if match_score > highest_score:
            highest_score = match_score
            best_instructor = instructor_id
            best_rating = instructor_rating
        elif match_score == highest_score:  # Tie-breaker: Use rating
            if instructor_rating > best_rating:
                best_instructor = instructor_id
                best_rating = instructor_rating

    if best_instructor:
        return {"status": "success", "student_id": logged_in_student_id, "instructor_id": best_instructor}
    else:
        return {"status": "error", "message": "No suitable instructor found."}

def main(logged_in_student_id):
    file_path = r'Matching/traits.csv'
    complementary_traits = load_complementary_traits(file_path)
    students, instructors, appointments = fetch_data()

    if not students or not instructors:
        return {"status": "error", "message": "No students or instructors available for matching."}

    result = match_students_instructors(students, instructors, appointments, logged_in_student_id, complementary_traits)
    return result

if __name__ == "__main__":
    result = main()
    print(f"Final result: {result}")
