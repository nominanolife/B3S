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

@app.route('/match/<student_id>', methods=['GET'])
def match(student_id):
    try:
        matched_data = main(student_id)  # Pass the dynamically provided student ID
        
        if not matched_data or matched_data.get("status") == "error":
            return jsonify(matched_data), 404  # Return 404 if there's an error message
        
        instructor_id = matched_data.get('instructor_id')

        if not student_id or not instructor_id:
            return jsonify({"status": "error", "message": "Invalid match data."}), 400

        # Fetch instructor to verify its existence in Firestore
        try:
            instructor_doc = db.collection('instructors').document(instructor_id).get()
            if not instructor_doc.exists:
                return jsonify({"status": "error", "message": "Instructor not found."}), 404
        except Exception as firestore_error:
            return jsonify({"status": "error", "message": f"Firestore error: {firestore_error}"}), 500

        # Save or update the match in Firestore
        match_ref = db.collection('matches').document(student_id)
        match_ref.set({
            'instructorId': instructor_id,
            'studentId': student_id,
            'matchedAt': firestore.SERVER_TIMESTAMP
        }, merge=True)

        # Return success response with necessary data
        return jsonify(matched_data), 200

    except Exception as e:
        app.logger.error(f"Error occurred: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)