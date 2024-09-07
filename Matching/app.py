import os
from flask import Flask, jsonify
from flask_cors import CORS
from google.cloud import firestore
from matching import main

# Set up Firestore authentication
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "authentication-d6496-firebase-adminsdk-zoywr-32ecaa91eb.json"

# Initialize Firestore globally
db = firestore.Client()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET"], "allow_headers": ["Content-Type"]}})

@app.route('/match', methods=['GET'])
def match():
    try:
        # Call main function to perform matching
        matched_data = main()  # Match logic from your CSP
        
        if not matched_data:
            return jsonify({"status": "error", "message": "No matches found."}), 404

        # Assuming matched_data is a dictionary with student_id -> instructor_id mapping
        student_id = list(matched_data.keys())[0]  # Extract the first student ID
        instructor_id = matched_data[student_id]   # Get the matched instructor ID

        # Ensure student_id and instructor_id are not None and valid
        if not student_id or not instructor_id:
            return jsonify({"status": "error", "message": "Invalid match data."}), 400

        # Fetch instructor to verify its existence in Firestore
        instructor_doc = db.collection('instructors').document(instructor_id).get()
        
        if not instructor_doc.exists:
            return jsonify({"status": "error", "message": "Instructor not found."}), 404

        # Use student_id as the document ID for the match
        match_ref = db.collection('matches').document(student_id)

        # Save or update the match in Firestore
        match_ref.set({
            'instructorId': instructor_id,
            'studentId': student_id,
            'matchedAt': firestore.SERVER_TIMESTAMP  # Firestore-generated timestamp
        }, merge=True)  # Ensure it merges with existing data

        # Return success response with only necessary data
        return jsonify({
            "status": "success",
            "student_id": student_id,
            "instructor_id": instructor_id
        }), 200

    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
