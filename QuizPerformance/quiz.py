import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics import accuracy_score, classification_report

# Step 1: Load the Dataset
# Assuming you have collected the data in CSV format
data = pd.read_csv('quiz_data.csv')  # The CSV contains user quiz answers and correct categories.

# The structure of the CSV:
# | user_id | answer_1 | answer_2 | ... | answer_n | categories |
# Categories column might have values like ['Basic Driving', 'Road Rules']

# Step 2: Preprocessing the Dataset
# Splitting features and labels
X = data.drop(columns=['categories'])
y = data['categories']

# Using MultiLabelBinarizer to convert categories into a binary matrix
mlb = MultiLabelBinarizer()
y = mlb.fit_transform(y.apply(lambda x: eval(x)))  # Convert the list-like string to an actual list

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Step 3: Train the Random Forest Model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Step 4: Model Evaluation
y_pred = model.predict(X_test)

# Evaluate accuracy
print("Accuracy Score:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred, target_names=mlb.classes_))

# Step 5: Predicting User Performance
# Here, you can pass the new user responses
def predict_performance(user_responses):
    # Predict categories based on the user's quiz answers
    user_responses_df = pd.DataFrame([user_responses])
    predicted_categories = model.predict(user_responses_df)
    predicted_labels = mlb.inverse_transform(predicted_categories)

    return predicted_labels[0]

# Example: Predict performance for a new user
new_user_responses = [0, 1, 0, 1, 1]  # Example of user's responses as a list of binary values
predicted_labels = predict_performance(new_user_responses)
print("\nPredicted Performance Categories:", predicted_labels)

# Step 6: Saving Results based on Performance Score
# Suppose you need to save only if the score is above a threshold
def save_results_if_passed(user_id, score, threshold=80):
    if score >= threshold:
        # Assuming Firestore or any database connection is established
        # Saving results for passed users
        result = {
            'user_id': user_id,
            'score': score,
            'performance': 'Passed'
        }
        # Save to Firestore or other databases
        # db.collection('userResults').document(user_id).set(result)
        print(f"Results for user {user_id} saved successfully.")
    else:
        print(f"User {user_id} did not pass, no data saved.")

# Example usage
user_id = 'user123'
score = 85  # Example score after evaluating
save_results_if_passed(user_id, score)

