# Import necessary libraries
import tensorflow as tf
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from symspellpy import SymSpell, Verbosity
import pandas as pd
import numpy as np
from fuzzywuzzy import process  # For fuzzy matching
import re

# SymSpell for typo correction
sym_spell = SymSpell(max_dictionary_edit_distance=2)
sym_spell.load_dictionary("Inquiries/frequency_dictionary_en_82_765.txt", 0, 1)

# Preprocess the text (tokenize, correct typos, normalize without manual Jejemon replacements)
def preprocess_text(text):
    if isinstance(text, np.ndarray):  # Make sure the text is not a NumPy array
        text = text[0]  # If it's an array, take the first element
    words = word_tokenize(text.lower())  # Ensure we process strings, not arrays
    
    # Typo correction using SymSpell
    corrected_words = []
    for word in words:
        suggestion = sym_spell.lookup(word, Verbosity.CLOSEST, max_edit_distance=2)
        if suggestion:
            corrected_words.append(suggestion[0].term)
        else:
            corrected_words.append(word)
    
    return ' '.join(corrected_words)  # Return corrected and tokenized words without manual Jejemon handling

# Load your dataset (based on the uploaded CSV)
df = pd.read_csv("Inquiries/jusko.csv")

# Preprocess the utterances
df['Utterance'] = df['Utterance'].apply(preprocess_text)

# Label encode the intents
le = LabelEncoder()
df['Intent'] = le.fit_transform(df['Intent'])

# Split the data
X = df['Utterance']
y = df['Intent']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Tokenize the text data
tokenizer = tf.keras.preprocessing.text.Tokenizer(num_words=1000)
tokenizer.fit_on_texts(X_train)
X_train = tokenizer.texts_to_sequences(X_train)
X_test = tokenizer.texts_to_sequences(X_test)

# Find the maximum sequence length for padding
max_len = max([len(seq) for seq in X_train] + [len(seq) for seq in X_test])

# Pad sequences for both training and testing to the same length
X_train = tf.keras.preprocessing.sequence.pad_sequences(X_train, padding='post', maxlen=max_len)
X_test = tf.keras.preprocessing.sequence.pad_sequences(X_test, padding='post', maxlen=max_len)

# Build the TensorFlow model for intent classification
model = tf.keras.models.Sequential([
    tf.keras.layers.Embedding(input_dim=1000, output_dim=64, input_length=max_len),
    tf.keras.layers.LSTM(64),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dense(len(df['Intent'].unique()), activation='softmax')
])

# Compile the model
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

# Train the model
model.fit(X_train, y_train, epochs=10, validation_data=(X_test, y_test))

model.save("Inquiries/intent_classifier.keras")

def fuzzy_match_intent(user_input, df):
    # Correct typos using SymSpell
    corrected_input = preprocess_text(user_input)
    
    # Apply fuzzy matching with a higher cutoff score (75 instead of 65)
    matched_utterance = process.extractOne(corrected_input, df['Utterance'], score_cutoff=75)
    
    if matched_utterance:
        return matched_utterance[0]  # Return the best-matching utterance
    else:   
        return None  # Return None if no good match is found
    
# Function to classify intent using the TensorFlow model
def classify_intent(user_input):
    processed_input = preprocess_text(user_input)
    input_sequence = tokenizer.texts_to_sequences([processed_input])
    input_padded = tf.keras.preprocessing.sequence.pad_sequences(input_sequence, maxlen=max_len, padding='post')
    predictions = model.predict(input_padded)
    intent = np.argmax(predictions)
    return le.inverse_transform([intent])[0]

# Ensure y_test is a NumPy array
y_test = np.array(y_test)

# Function to test model accuracy on the test set
def test_accuracy():
    correct = 0
    total = len(y_test)
    
    for i in range(total):
        user_input = X_test[i]  # Access the test input directly (already tokenized)
        
        # Convert tokenized input back to text (if needed) or use it directly depending on implementation
        predicted_intent = classify_intent(' '.join(map(str, user_input)))  # Classify the input sequence
        
        # Ensure y_test is accessed correctly and inverse transform using LabelEncoder
        actual_intent = le.inverse_transform([y_test[i]])[0]  # Correctly transform using LabelEncoder
        
        if predicted_intent == actual_intent:
            correct += 1
    
    accuracy = correct / total
    print(f"Accuracy: {accuracy * 100:.2f}%")

# Function to detect if input is gibberish or should be discarded
def is_incoherent(input_text):
    # Use fuzzy matching to check if the input is close to any known intent or utterance
    matched_utterance = fuzzy_match_intent(input_text, df)
    
    # If we have a good fuzzy match, we treat it as valid input
    if matched_utterance:
        return False
    
    # If the input length is less than 3 and there's no good fuzzy match, it's likely gibberish
    if len(input_text) < 3:
        return True
    
    # Additional checks for repeated characters or random sequences
    if re.match(r'^(.)\1{2,}$', input_text):  # Matches repeated characters like 'aaa', 'pppp'
        return True
    
    return False

# Refined chatbot response based on dataset and meaningful input checks
def chatbot_response(user_input):
    # Step 1: Preprocess the input to normalize it (removes typos and Jejemon styles)
    normalized_input = preprocess_text(user_input)
    
    # Step 2: Check if the input is incoherent (discard only truly meaningless input)
    if is_incoherent(normalized_input):
        return "I didn't understand that. Could you please rephrase your question?"
    
    # Step 3: Explicit check for greetings
    greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'good day', 'hoy', 'yo', 'sup']
    if normalized_input in greetings:
        intent = 'Greeting'  # Manually set intent for greetings
        intent_responses = df[df['Intent'] == intent]
        if not intent_responses.empty:
            return intent_responses.sample()['Response'].values[0]
        else:
            return "Hello! How may I assist you today?"
    
    # Step 4: Fuzzy match the user input with dataset utterances and keywords
    matched_utterance = fuzzy_match_intent(user_input, df)
    
    if matched_utterance:
        # Find the intent based on the matched utterance
        intent = df[df['Utterance'] == matched_utterance]['Intent'].values[0]
        
        # Get a corresponding response from the dataset for the matched intent
        intent_responses = df[df['Intent'] == intent]
        
        if not intent_responses.empty and pd.notna(intent_responses['Response'].values[0]):
            response = intent_responses.sample()['Response'].values[0]
        else:
            response = "Sorry, I don't have information on that."
    else:
        response = "I didn't understand your question. Could you please rephrase?"
    
    return response

# Chatbot loop for user interaction
def start_chatbot():
    print("Chatbot is ready! Type 'exit' to end the conversation.")
    while True:
        user_input = input("You: ")
        if user_input.lower() == 'exit':
            print("Goodbye!")
            break
        response = chatbot_response(user_input)
        print(f"Bot: {response}")

# Example usage
if __name__ == "__main__":
    # First test the model's accuracy
    test_accuracy()

    # Start the chatbot interaction loop
    start_chatbot()
