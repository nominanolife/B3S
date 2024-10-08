from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS from flask_cors
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# Load the dataset and preprocess
data = pd.read_csv('QuizPerformance/quizperf.csv')

# Assuming the data has columns: category, performance, percentage, and any other relevant columns
# Encoding categorical features like 'category' and 'performance'
category_encoder = LabelEncoder()
data['category_encoded'] = category_encoder.fit_transform(data['category'])

performance_encoder = LabelEncoder()
data['performance_encoded'] = performance_encoder.fit_transform(data['performance'])

# Features and Target (X = features, y = target performance)
X = data[['category_encoded', 'percentage']]  # We only use category and percentage for simplicity
y = data['performance_encoded']

# Split the dataset into training and test sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train a RandomForestClassifier
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Helper function to get insights
def get_insights(category, performance):
    """
    Fetch insights based on the category and performance from the dataset.
    This function uses the CSV file to return relevant insights for each student.
    """
    insights_row = data[(data['category'] == category) & (data['performance'] == performance)]
    
    if not insights_row.empty:
        return insights_row.iloc[0]['insights']
    else:
        return "No specific insights available for this category and performance."

@app.route('/predict_and_insights', methods=['POST'])
def predict_and_insights():
    try:
        # Get the input data from the request
        data = request.json
        student_id = data['studentId']  # For logging purposes only
        category = data['category']
        percentage = data['percentage']

        # Log the input data for debugging
        print(f"Received data: studentId={student_id}, category={category}, percentage={percentage}")

        # Validate inputs (note: removing studentId from validation as it's just for logging)
        if not isinstance(percentage, (int, float)):
            return jsonify({'error': 'Invalid data type: percentage must be a float or int'}), 400

        # Encode the category using the label encoder
        category_encoded = category_encoder.transform([category])[0]

        # Prepare the input for prediction
        input_data = [[category_encoded, percentage]]

        # Perform prediction using the trained RandomForest model
        performance_encoded = model.predict(input_data)[0]

        # Decode the performance back to the label
        performance_label = performance_encoder.inverse_transform([performance_encoded])[0]

        # Fetch insights based on the predicted performance and category
        insights = get_insights(category, performance_label)

        return jsonify({
            'studentId': student_id,  # Include studentId in the response for reference
            'category': category,
            'percentage': percentage,
            'predicted_performance': performance_label,
            'insights': insights
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Main function to run the Flask app
if __name__ == '__main__':
    app.run(debug=True)
