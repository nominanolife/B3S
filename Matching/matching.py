import os
from google.cloud import firestore
from ortools.sat.python import cp_model

# Set up Firestore authentication
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "authentication-d6496-firebase-adminsdk-zoywr-32ecaa91eb.json"

# Initialize Firestore
db = firestore.Client()

def fetch_data():
    """
    Fetch students and instructors data from Firestore.
    """
    # Fetch all applicants and instructors
    applicants_ref = db.collection('applicants').stream()
    instructors_ref = db.collection('instructors').stream()

    # Parse Firestore data into dictionaries
    students = {doc.id: doc.to_dict() for doc in applicants_ref}
    # Only include active instructors
    instructors = {doc.id: doc.to_dict() for doc in instructors_ref if doc.to_dict().get('active', False)}

    return students, instructors

def match_students_instructors(students, instructors):
    matches = {}
    for student_id, student in students.items():
        best_match = None
        best_score = 0
        for instructor_id, instructor in instructors.items():
            student_traits = student.get('traits', [])
            instructor_traits = instructor.get('traits', [])
            if isinstance(student_traits, list) and isinstance(instructor_traits, list):
                matching_traits = len(set(student_traits).intersection(instructor_traits))
                if matching_traits > best_score:
                    best_score = matching_traits
                    best_match = instructor_id
        if best_match:
            matches[student_id] = best_match
    return matches

def main():
    """
    Main function to run the matching process.
    """
    # Fetch data from Firestore
    students, instructors = fetch_data()

    # If there are no students or instructors, return an empty result
    if not students or not instructors:
        print("No students or instructors available for matching.")
        return []

    # Run the matching algorithm
    matches = match_students_instructors(students, instructors)

    # Log the results instead of saving them to Firestore
    print("Matching results:", matches)
    
    # Return the matches so they can be processed further
    return matches

if __name__ == "__main__":
    main()
