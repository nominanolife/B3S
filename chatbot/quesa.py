# Import necessary libraries
from flask import Flask, request, jsonify
from flask_cors import CORS
from gensim.models import Word2Vec
from fuzzywuzzy import fuzz, process
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer, util

# Load Dataset
data = pd.read_csv('questions.csv')

# Load Sentence-BERT model for context-aware embeddings
sentence_bert_model = SentenceTransformer('all-MiniLM-L6-v2')

# Encode dataset queries using Sentence-BERT for efficient similarity comparison
question_embeddings = sentence_bert_model.encode(data['Query'].tolist(), convert_to_tensor=True)

# Initialize Flask App and enable CORS
app = Flask(__name__)
CORS(app)

# Initialize session memory for context
previous_topic = None

### Step 1: Exact Match Check ###
def exact_match(query, dataset):
    for index, row in dataset.iterrows():
        if query.lower() == row['Query'].lower():
            return row['Response']
    return None

### Step 2: Dynamic Shortcut Handling with Fuzzy Matching ###
def dynamic_fuzzy_match(query, dataset, threshold=75):
    best_match = process.extractOne(query, dataset['Query'], scorer=fuzz.partial_ratio)
    if best_match and best_match[1] >= threshold:
        return dataset.loc[dataset['Query'] == best_match[0], 'Response'].values[0]
    return None

### Step 3: Minimum Input Length Check ###
def valid_query_length(query, min_length=3):
    return len(query) >= min_length

### Step 4: BERT Embedding Match with Threshold ###
def bert_match(query, dataset, model, embeddings, threshold=0.75):
    query_embedding = model.encode(query, convert_to_tensor=True)
    cosine_scores = util.pytorch_cos_sim(query_embedding, embeddings).squeeze(0)
    best_score_index = cosine_scores.argmax().item()
    
    if cosine_scores[best_score_index] >= threshold:
        return dataset.iloc[best_score_index]['Response']
    return None

### Step 5: Main Chatbot Function with Threshold Adjustments ###
def chatbot_response(query, dataset, model, embeddings):
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

    # If no fuzzy match, use BERT embeddings with a threshold
    response = bert_match(query, dataset, model, embeddings, threshold=0.75)
    
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
    response = chatbot_response(user_query, data, sentence_bert_model, question_embeddings)
    
    return jsonify({'response': response})

# Entry point for running the app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
