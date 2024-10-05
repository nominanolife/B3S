# Import Libraries
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder
from transformers import BertTokenizer, TFBertForSequenceClassification
from transformers import InputExample, InputFeatures
import tensorflow as tf
tf.config.run_functions_eagerly(True)
from spellchecker import SpellChecker  # Correct library: PySpellChecker
import re
from fuzzywuzzy import fuzz, process


# Initialize spell checker
spell = SpellChecker()

# Load a set of commonly used words or phrases for fuzzy matching
common_words = ["location", "address", "driving school", "how to get there", "packages", "payment method"]

# Load Dataset
dataset_path = 'Inquiries/modified_chatbot_dataset.csv'
dataset = pd.read_csv(dataset_path)

# Label Encoding for Intent Classification
label_encoder = LabelEncoder()
dataset['Label'] = label_encoder.fit_transform(dataset['Intent'])

# Check if there are any null values in the labels
if dataset['Label'].isnull().any():
    raise ValueError("Dataset contains null values in the label column. Please check the data.")

def preprocess_text_advanced(text):
    # Step 1: Normalize Jejemon Text using Regex and Manual Mappings
    jejemon_map = {
        '0': 'o', '@': 'a', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '$': 's'
    }
    for key, value in jejemon_map.items():
        text = text.replace(key, value)

    # Step 2: Remove Repeated Characters
    text = re.sub(r'(.)\1{2,}', r'\1', text)  # Remove characters that repeat more than twice

    # Step 3: Remove Single Character Inputs (Except 'a' and 'i')
    words = text.split()
    filtered_words = [word for word in words if len(word) > 1 or word.lower() in ['a', 'i']]
    text = ' '.join(filtered_words)

    # Step 4: Spell Correction using PySpellChecker
    words = text.split()
    corrected_words = []
    for word in words:
        if spell.unknown([word]):
            corrected_word = spell.correction(word)
            corrected_words.append(corrected_word if corrected_word is not None else word)
        else:
            corrected_words.append(word)

    text = ' '.join(corrected_words)

    # Step 5: Lowercase conversion
    text = text.lower()

    # Step 6: Fuzzy Matching for Common Phrases
    tokens = text.split()
    matched_tokens = []
    for token in tokens:
        match, score = process.extractOne(token, common_words)
        if score > 80:
            matched_tokens.append(match)
        else:
            matched_tokens.append(token)

    return ' '.join(matched_tokens)

# Apply Preprocessing
dataset['Utterance'] = dataset['Utterance'].apply(preprocess_text_advanced)

# Split Dataset into Training and Testing Sets
train, test = train_test_split(dataset, test_size=0.2, random_state=42)

# Tokenization and Model Definition Using BERT
print("Loading BERT tokenizer and model...")
tokenizer = BertTokenizer.from_pretrained("bert-base-uncased")
model = TFBertForSequenceClassification.from_pretrained("bert-base-uncased", num_labels=len(dataset['Label'].unique()))
print("Model loaded successfully.")

# Convert Examples to InputExample
def convert_to_input_example(df):
    return df.apply(lambda row: InputExample(guid=None, text_a=row['Utterance'], label=row['Label']), axis=1)

train_InputExamples = convert_to_input_example(train)
test_InputExamples = convert_to_input_example(test)

# Dataset Conversion Function
def convert_examples_to_tf_dataset(examples, tokenizer, max_length=128):
    input_ids_list, attention_masks_list, token_type_ids_list, labels_list = [], [], [], []

    for e in examples:
        input_dict = tokenizer.encode_plus(
            e.text_a,
            add_special_tokens=True,
            max_length=max_length,
            padding='max_length',
            return_token_type_ids=True,
            return_attention_mask=True,
            truncation=True
        )
        input_ids_list.append(input_dict["input_ids"])
        token_type_ids_list.append(input_dict["token_type_ids"])
        attention_masks_list.append(input_dict["attention_mask"])
        labels_list.append(e.label)

    return tf.data.Dataset.from_tensor_slices((
        {
            "input_ids": tf.convert_to_tensor(input_ids_list, dtype=tf.int32),
            "token_type_ids": tf.convert_to_tensor(token_type_ids_list, dtype=tf.int32),
            "attention_mask": tf.convert_to_tensor(attention_masks_list, dtype=tf.int32),
        },
        tf.convert_to_tensor(labels_list, dtype=tf.int64)
    ))

# Convert Training and Testing Data
print("Converting data to TF dataset...")
train_data = convert_examples_to_tf_dataset(list(train_InputExamples), tokenizer).shuffle(100).batch(16)
test_data = convert_examples_to_tf_dataset(list(test_InputExamples), tokenizer).batch(16)
print("Conversion completed.")

# Compile and Train the Model
print("Starting model training...")

try:
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=3e-5), loss=model.compute_loss, metrics=['accuracy'])
    model.fit(train_data, epochs=3)
    print("Model training completed.")

except Exception as e:
    print(f"Training with model.fit() failed with error: {e}")
    print("Switching to a manual training loop with GradientTape.")

    # Manual Training Loop (Using GradientTape)
    optimizer = tf.keras.optimizers.Adam(learning_rate=3e-5)
    epochs = 3

    for epoch in range(epochs):
        print(f"Epoch {epoch + 1}/{epochs}")
        for step, (x_batch_train, y_batch_train) in enumerate(train_data):
            with tf.GradientTape() as tape:
                logits = model(x_batch_train, training=True).logits
                loss = tf.nn.sparse_softmax_cross_entropy_with_logits(labels=y_batch_train, logits=logits)
                loss = tf.reduce_mean(loss)

            gradients = tape.gradient(loss, model.trainable_variables)
            optimizer.apply_gradients(zip(gradients, model.trainable_variables))

            if step % 50 == 0:
                print(f"Step {step}, Loss: {loss.numpy()}")

print("Manual training completed (if applicable).")

# Prediction Layer: Get Prediction and Confidence
def get_prediction(text):
    # Preprocess input using advanced preprocessing
    processed_text = preprocess_text_advanced(text)
    
    # Tokenize and predict
    inputs = tokenizer.encode_plus(processed_text, return_tensors="tf", add_special_tokens=True)
    output = model(inputs)
    
    # Extract confidence scores
    scores = tf.nn.softmax(output.logits, axis=-1)
    confidence = tf.reduce_max(scores).numpy()
    predicted_label = tf.argmax(scores, axis=-1).numpy()[0]
    
    return predicted_label, confidence

def fallback_response(user_input):
    # Step 1: Preprocess input using the advanced preprocessing function
    processed_text = preprocess_text_advanced(user_input)

    # Step 2: Detect if input is meaningless (e.g., contains repeated letters or is too short)
    if len(processed_text) < 2 or re.match(r'^([a-zA-Z])\1*$', processed_text):
        return "It seems like you entered something unclear or repetitive. Could you please ask a complete question?"

    # Step 3: Get prediction and confidence
    predicted_label, confidence = get_prediction(processed_text)

    # Step 4: Handle low confidence predictions
    if confidence < 0.75:
        return "I'm not sure what you mean. Could you please provide more details or ask more clearly?"
    else:
        # Get the appropriate response based on predicted intent
        intent = label_encoder.inverse_transform([predicted_label])[0]
        response = dataset[dataset['Intent'] == intent]['Response'].values[0]
        return response

# Continuous User Interaction
print("Chatbot is ready to answer your questions! (type 'exit' to end the conversation)")

while True:
    user_query = input("You: ")
    if user_query.lower() in ["exit", "quit", "stop"]:
        print("Chatbot: Thank you for chatting with me! Have a great day!")
        break
    bot_response = fallback_response(user_query)
    print("Chatbot:", bot_response)
