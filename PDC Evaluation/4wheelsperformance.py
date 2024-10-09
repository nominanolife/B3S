import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics import classification_report, accuracy_score
from sklearn.metrics import multilabel_confusion_matrix, f1_score

# Load the dataset
def load_data(file_path):
    return pd.read_csv(file_path)

# Function to re-label the dataset based on your rules
def relabel_performance(row):
    if row['percentage'] < 80:
        return 'Poor'
    elif 80 <= row['percentage'] < 90:
        return 'Great'
    else:
        return 'Excellent'

# Prepare data for training
def prepare_data(df):
    # Apply the relabeling function to the dataset
    df['performance'] = df.apply(relabel_performance, axis=1)
    
    # Group by studentid and aggregate the scores and performance
    grouped_df = df.groupby(['studentid', 'category']).agg({
        'score': 'mean',  # Aggregate scores by taking the mean
        'performance': lambda x: list(x)  # Aggregate performance as a list
    }).reset_index()
    
    # Pivot the dataframe to get scores for each category
    X = grouped_df.pivot(index='studentid', columns='category', values='score').fillna(0)
    
    # Pivot the dataframe to get performance for each category
    y = grouped_df.pivot(index='studentid', columns='category', values='performance').fillna('no_performance')
    
    # Convert performance labels to a binary format for multi-label classification
    mlb = MultiLabelBinarizer()
    
    y_transformed = {}
    for category in y.columns:
        # Transform each category's performance labels to binary format
        y_transformed[category] = pd.DataFrame(
            mlb.fit_transform(y[category].apply(lambda x: [x] if isinstance(x, str) else x)),
            columns=mlb.classes_,
            index=y.index
        )
    
    # Concatenate all transformed labels into a single DataFrame
    y_combined = pd.concat(y_transformed.values(), axis=1, keys=y_transformed.keys())
    
    return X, y_combined, mlb

# Train the model
def train_model(X_train, y_train):
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    model = MultiOutputClassifier(rf, n_jobs=-1)
    model.fit(X_train, y_train)
    return model

def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)
    
    # Convert y_test to the same format as y_pred for evaluation
    y_test_values = y_test.values
    
    # Ensure both y_pred and y_test_values are in the same format
    if y_test_values.shape[1] != y_pred.shape[1]:
        raise ValueError("Mismatch in the number of labels between y_test and y_pred.")
    
    # Convert predictions to binary format if they are not already
    y_pred_binary = (y_pred > 0.5).astype(int)
    
    # Print performance for each category
    for i, category in enumerate(y_test.columns.levels[0]):
        y_true = y_test_values[:, i]
        y_pred_cat = y_pred_binary[:, i]
        
        accuracy = accuracy_score(y_true, y_pred_cat)
        print(f"Performance for {category}:")
        print(f"Accuracy: {accuracy:.2f}")
        print(classification_report(y_true, y_pred_cat))
        print()

        # Additional metrics
        mcm = multilabel_confusion_matrix(y_true, y_pred_cat)
        print(f"Multilabel Confusion Matrix for {category}:")
        print(mcm)
        print(f"F1 Score for {category}: {f1_score(y_true, y_pred_cat, average='macro'):.2f}")
        print()

def main():
    # Path to your dataset
    file_path = 'student_scores.csv'
    
    # Load and prepare the dataset
    data = load_data(file_path)
    X, y, mlb = prepare_data(data)
    
    # Split the data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train the model
    model = train_model(X_train, y_train)
    
    # Evaluate the model
    evaluate_model(model, X_test, y_test)

if __name__ == '__main__':
    main()
