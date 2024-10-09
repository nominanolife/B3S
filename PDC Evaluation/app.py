from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import logging

app = Flask(__name__)

# Enable CORS for the Flask app
CORS(app)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Load the trained model and label binarizer
model = joblib.load('student_performance_classifier.pkl')
mlb = joblib.load('label_binarizer.pkl')

# Attempt to get the feature names directly from the model
try:
    expected_features = model.feature_names_in_
    logging.debug(f"Model expects the following feature names: {expected_features}")
except AttributeError:
    # If the model does not have 'feature_names_in_' attribute, manually specify the feature names
    logging.warning("Model does not have feature_names_in_ attribute; using manually defined feature names.")
    expected_features = ["Observation", "Space Management", "Speed Control", "Steering", "Communication", "General"]

# Define the classes in the correct order
class_labels = ['Poor', 'Great', 'Excellent']  # Assuming this is the correct order

def adjust_predictions_based_on_rules(predictions, categories):
    """
    Adjusts predictions based on hardcoded rules.
    """
    adjusted_predictions = {}
    for category, label in predictions.items():
        score = categories[category]
        if score < 80:
            adjusted_predictions[category] = 'Poor'
        elif 80 <= score < 90:
            adjusted_predictions[category] = 'Great'
        else:
            adjusted_predictions[category] = 'Excellent'
    return adjusted_predictions

@app.route('/predict', methods=['POST'])
def predict():
    try:

        # Get the JSON data from the request
        data = request.json

        if 'categories' not in data or not data['categories']:
            raise ValueError("Invalid input format: 'categories' field is missing or empty.")
        
        # Extract the aggregated category data
        categories = data['categories'][0]  # Assuming 'categories' contains a single dictionary of aggregated categories
        
        # Extract maximum scores from the data
        max_scores = data.get('maxScores', {})  # Get the maximum scores for each category


        # Ensure all categories are provided and in the correct order
        if set(categories.keys()) != set(expected_features):
            logging.error(f"Category mismatch. Expected: {expected_features}, Got: {list(categories.keys())}")
            raise ValueError(f"The provided categories do not match the expected categories. Expected: {expected_features}, Got: {list(categories.keys())}")

        # Normalize scores based on maximum scores
        normalized_categories = {}
        for feature in expected_features:
            if feature not in categories or not isinstance(categories[feature], (int, float)):
                logging.error(f"Feature {feature} is missing or not a numerical value. Got: {categories.get(feature)}")
                raise ValueError(f"Feature {feature} must be a numerical value. Got: {categories.get(feature)}")
            
            max_score = max_scores.get(feature, 1)  # Get the max score for the category; default to 1 to avoid division by zero
            normalized_score = (categories[feature] / max_score) * 100  # Convert to percentage
            normalized_categories[feature] = normalized_score

        # Create a DataFrame from the normalized categories
        X_new = pd.DataFrame([normalized_categories], columns=expected_features)
        # Predict
        y_pred = model.predict(X_new)

        # Convert numerical predictions to descriptive labels
        prediction_labels = []
        for i, pred in enumerate(y_pred[0]):  # Loop through the predicted values
            label = class_labels[pred]  # Map numerical value to class label
            prediction_labels.append(label)

        # Prepare the final output to map categories to descriptive labels
        prediction_results = dict(zip(expected_features, prediction_labels))

        # Adjust predictions based on your rules
        adjusted_results = adjust_predictions_based_on_rules(prediction_results, normalized_categories)

        # Return the adjusted prediction results
        return jsonify({"predictions": adjusted_results})

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)
