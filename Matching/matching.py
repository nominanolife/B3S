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
    appointments = {doc.id: doc.to_dict() for doc in appointments_ref}

    return students, instructors, appointments

def get_student_course(student_id, appointments):
    preferred_courses = ["PDC-4Wheels", "PDC-Motorcycle"]
    
    for appointment_id, appointment in appointments.items():
        course = appointment.get('course', '')
        if course in preferred_courses:
            print(f"Found preferred course '{course}' for studentId: {student_id} in appointment: {appointment_id}")
            return course
    
    print(f"No preferred course found for studentId: {student_id}")
    return None

def get_highest_rated_instructor(instructors, course):
    eligible_instructors = [
        (instructor_id, instructor) 
        for instructor_id, instructor in instructors.items() 
        if course in instructor.get('courses', [])
    ]
    
    if not eligible_instructors:
        return None
    
    highest_rated_instructor = max(eligible_instructors, key=lambda x: x[1].get('rating', 0))
    return highest_rated_instructor[0]  # Return the instructor_id

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

            print(f"Checking match for normalized student trait '{normalized_student_trait}' "
                  f"and instructor trait '{normalized_instructor_trait}': Match result = {match_result}")

            total_score += match_result * weight_per_match

    return total_score

def match_students_instructors(students, instructors, appointments, logged_in_student_id, complementary_traits):
    student = students.get(logged_in_student_id)
    if not student:
        return {"status": "error", "message": f"Student ID {logged_in_student_id} not found."}

    course = get_student_course(logged_in_student_id, appointments)
    if not course:
        return {"status": "error", "message": "No course found for student."}

    eligible_instructors = {
        instructor_id: instructor
        for instructor_id, instructor in instructors.items()
        if (course in instructor.get('courses', [])) and instructor.get('active', False)
    }

    if not eligible_instructors:
        return {"status": "error", "message": f"No eligible instructors found for course {course}."}

    match_scores = {}
    for instructor_id, instructor in eligible_instructors.items():
        student_traits = student.get('traits', [])
        instructor_traits = instructor.get('instructor_traits', [])
        match_score = calculate_match_score(student_traits, instructor_traits, complementary_traits)
        match_scores[instructor_id] = match_score

    # 1. Select the instructor with the highest match score.
    sorted_instructors = sorted(match_scores.items(), key=lambda x: (-x[1], list(eligible_instructors.keys()).index(x[0])))
    best_match_id, best_score = sorted_instructors[0]

    if best_score > 0:
        print(f"Best match found: Student {logged_in_student_id} with Instructor {best_match_id} (Score: {best_score})")
        return {"status": "success", "student_id": logged_in_student_id, "instructor_id": best_match_id}

    # 2. Fallback to the highest-rated instructor.
    highest_rated_instructor = get_highest_rated_instructor(instructors, course)
    if highest_rated_instructor:
        print(f"Highest rated instructor assigned: {highest_rated_instructor}")
        return {"status": "success", "student_id": logged_in_student_id, "instructor_id": highest_rated_instructor}

    return {"status": "error", "message": "No suitable instructor found."}

def main(logged_in_student_id):
    file_path = r'Matching/traits.csv'
    complementary_traits = load_complementary_traits(file_path)
    students, instructors, appointments = fetch_data()

    if not students or not instructors:
        return {"status": "error", "message": "No students or instructors available for matching."}

    result = match_students_instructors(students, instructors, appointments, logged_in_student_id, complementary_traits)
    print(f"Matching result for student {logged_in_student_id}: {result}")
    return result

if __name__ == "__main__":
    result = main()
    print(f"Final result: {result}")
