# Import necessary libraries
from flask import Flask, request, jsonify
from flask_cors import CORS
from gensim.models import Word2Vec
from fuzzywuzzy import fuzz, process
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Load Dataset
data = pd.read_csv('questions.csv')

# Train a Word2Vec model on the dataset queries
sentences = [question.split() for question in data['Query']]
word2vec_model = Word2Vec(sentences, vector_size=100, window=5, min_count=1, workers=4)

# Initialize Flask App and enable CORS
app = Flask(__name__)
CORS(app)

# Initialize session memory for context
previous_topic = None

### Step 1: Get Sentence Embeddings Using Word2Vec ###
def get_sentence_vector(sentence, model):
    words = sentence.split()
    word_vectors = [model.wv[word] for word in words if word in model.wv]
    
    if word_vectors:
        return np.mean(word_vectors, axis=0)
    else:
        return np.zeros(model.vector_size)

### Step 2: Exact Match Check ###
def exact_match(query, dataset):
    for index, row in dataset.iterrows():
        if query.lower() == row['Query'].lower():
            return row['Response']
    return None

### Step 3: Dynamic Shortcut Handling with Fuzzy Matching ###
def dynamic_fuzzy_match(query, dataset, threshold=75):
    best_match = process.extractOne(query, dataset['Query'], scorer=fuzz.partial_ratio)
    if best_match and best_match[1] >= threshold:
        return dataset.loc[dataset['Query'] == best_match[0], 'Response'].values[0]
    return None

### Step 4: Minimum Input Length Check ###
def valid_query_length(query, min_length=3):
    return len(query) >= min_length

### Step 5: Fuzzy Match Using Word2Vec Embeddings with a Stricter Threshold ###
def word2vec_match(query, dataset, model, threshold=0.90):
    query_vector = get_sentence_vector(query, model)
    best_similarity = 0
    best_response = None
    
    for index, row in dataset.iterrows():
        dataset_query_vector = get_sentence_vector(row['Query'], model)
        similarity = cosine_similarity([query_vector], [dataset_query_vector])[0][0]
        
        if similarity > best_similarity and similarity > threshold:
            best_similarity = similarity
            best_response = row['Response']
    
    return best_response

### Step 6: Main Chatbot Function with Threshold Adjustments ###
def chatbot_response(query, dataset, model):
    global previous_topic

    # Check if the query is valid (long enough)
    if not valid_query_length(query):
        return "Please provide more details or ask a longer question."

    # First, check for an exact match
    exact_response = exact_match(query, dataset)
    if exact_response:
        return exact_response

    # If no exact match, try dynamic fuzzy matching
    dynamic_response = dynamic_fuzzy_match(query, dataset)
    if dynamic_response:
        return dynamic_response

    # If no fuzzy match, use Word2Vec matching with stricter threshold
    response = word2vec_match(query, dataset, model, threshold=0.90)
    
    if response:
        previous_topic = query  # Store the last matched topic
        return response
    else:
        previous_topic = None  # Clear context if no match is found
        return "I'm not sure about that. Could you clarify or ask a different question?"

### API Endpoint to handle chatbot queries ###
@app.route('/chat', methods=['POST'])
def chat():
    user_query = request.json.get('query')
    if not user_query:
        return jsonify({'error': 'Query not provided'}), 400
    
    # Get chatbot response
    response = chatbot_response(user_query, data, word2vec_model)
    
    return jsonify({'response': response})

# Entry point for running the app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
