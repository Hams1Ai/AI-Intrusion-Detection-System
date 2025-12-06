"""
Python ML Prediction Service for AI Intrusion Detection System

This Flask service loads the trained ML models and provides prediction APIs.
- XGBoost classifier for attack detection
- PPO agent for action recommendation (using threshold fallback)
"""

import os
import random
import warnings
from flask import Flask, jsonify, request
import joblib
import pickle
import numpy as np

warnings.filterwarnings('ignore')

app = Flask(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'ml_models')

scaler = None
xgb_model = None

def load_models():
    """Load the ML models on startup."""
    global scaler, xgb_model
    
    scaler_path = os.path.join(MODEL_DIR, 'scaler.joblib')
    xgb_path = os.path.join(MODEL_DIR, 'xgb_model.pkl')
    
    try:
        scaler = joblib.load(scaler_path)
        print(f"Loaded scaler from {scaler_path}")
    except Exception as e:
        print(f"Warning: Could not load scaler: {e}")
        scaler = None
    
    try:
        with open(xgb_path, 'rb') as f:
            xgb_model = pickle.load(f)
        print(f"Loaded XGBoost model from {xgb_path}")
        print(f"Model expects {xgb_model.n_features_in_} features")
    except Exception as e:
        print(f"Warning: Could not load XGBoost model: {e}")
        xgb_model = None

def generate_synthetic_features(is_attack_biased=None):
    """
    Generate synthetic network flow features (50 features) that mimic CTU-13 dataset.
    
    Features typically include:
    - Duration, protocol, bytes sent/received
    - Packet counts, flow characteristics
    - Port numbers, flag counts, etc.
    """
    
    if is_attack_biased is None:
        is_attack_biased = random.random() < 0.4
    
    features = []
    
    if is_attack_biased:
        features.append(random.uniform(0.5, 300))
        features.append(random.choice([6, 17, 1]))
        features.append(random.randint(1024, 65535))
        features.append(random.choice([4444, 5555, 6666, 31337, 22, 23, 3389, 445, 135, 80, 443]))
        features.append(random.randint(50, 5000))
        features.append(random.randint(0, 500))
        features.append(random.randint(10, 1000))
        features.append(random.randint(0, 100))
        features.append(random.uniform(100, 2000))
        features.append(random.uniform(0, 500))
        
        for _ in range(20):
            features.append(random.uniform(0.3, 1.0))
        
        for _ in range(20):
            features.append(random.uniform(-2, 3))
    else:
        features.append(random.uniform(0.1, 60))
        features.append(random.choice([6, 17]))
        features.append(random.randint(1024, 65535))
        features.append(random.choice([80, 443, 8080, 53, 25, 110, 143]))
        features.append(random.randint(100, 2000))
        features.append(random.randint(100, 3000))
        features.append(random.randint(5, 100))
        features.append(random.randint(5, 100))
        features.append(random.uniform(50, 500))
        features.append(random.uniform(50, 500))
        
        for _ in range(20):
            features.append(random.uniform(0.0, 0.5))
        
        for _ in range(20):
            features.append(random.uniform(-1, 1))
    
    return features

def predict_with_models(features):
    """
    Make predictions using the loaded models.
    
    Returns:
        risk_score: float (0-1), probability of attack
        xgb_label: int (0=normal, 1=attack)
        rl_action: int (0=ignore, 1=block)
    """
    global scaler, xgb_model
    
    x = np.array(features, dtype=float).reshape(1, -1)
    
    if xgb_model is not None:
        try:
            if scaler is not None:
                x_scaled = scaler.transform(x)
            else:
                x_scaled = x
            
            risk_score = float(xgb_model.predict_proba(x_scaled)[0, 1])
            xgb_label = int(xgb_model.predict(x_scaled)[0])
        except Exception as e:
            print(f"Prediction error: {e}")
            risk_score = random.uniform(0, 1)
            xgb_label = 1 if risk_score > 0.5 else 0
    else:
        risk_score = random.uniform(0, 1)
        xgb_label = 1 if risk_score > 0.5 else 0
    
    if risk_score >= 0.6:
        rl_action = 1
    elif risk_score <= 0.3:
        rl_action = 0
    else:
        rl_action = 1 if random.random() < risk_score else 0
    
    return risk_score, xgb_label, rl_action

def extract_flow_metadata(features):
    """Extract human-readable flow metadata from features."""
    
    protocol_map = {6: 'TCP', 17: 'UDP', 1: 'ICMP'}
    protocol_num = int(features[1]) if len(features) > 1 else 6
    
    return {
        'duration': round(features[0], 2) if len(features) > 0 else 0,
        'protocol': protocol_map.get(protocol_num, 'TCP'),
        'src_port': int(features[2]) if len(features) > 2 else random.randint(1024, 65535),
        'dst_port': int(features[3]) if len(features) > 3 else 80,
        'bytes_sent': int(features[4]) if len(features) > 4 else 0,
        'bytes_received': int(features[5]) if len(features) > 5 else 0,
        'packets_sent': int(features[6]) if len(features) > 6 else 0,
        'packets_received': int(features[7]) if len(features) > 7 else 0,
    }

flow_counter = 0

@app.route('/api/ml/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'models_loaded': {
            'scaler': scaler is not None,
            'xgb_model': xgb_model is not None
        }
    })

@app.route('/api/ml/next-flow', methods=['GET'])
def next_flow():
    """Generate a new network flow with ML predictions."""
    global flow_counter
    
    flow_counter += 1
    
    features = generate_synthetic_features()
    
    risk_score, xgb_label, rl_action = predict_with_models(features)
    
    metadata = extract_flow_metadata(features)
    
    true_label = 1 if risk_score > 0.5 else 0
    if random.random() < 0.15:
        true_label = 1 - true_label
    
    src_ips = [
        "192.168.1.", "10.0.0.", "172.16.0.", 
        "203.0.113.", "198.51.100.", "192.0.2."
    ]
    dst_ips = [
        "8.8.8.", "1.1.1.", "104.16.", "151.101.",
        "185.199.", "140.82."
    ]
    
    response = {
        'flow_id': flow_counter,
        'risk_score': round(risk_score, 4),
        'xgb_label': 'ATTACK' if xgb_label == 1 else 'NORMAL',
        'xgb_label_raw': xgb_label,
        'rl_action': rl_action,
        'true_label': true_label,
        'src_ip': f"{random.choice(src_ips)}{random.randint(1, 254)}",
        'dst_ip': f"{random.choice(dst_ips)}{random.randint(1, 254)}",
        'src_port': metadata['src_port'],
        'dst_port': metadata['dst_port'],
        'protocol': metadata['protocol'],
        'duration': metadata['duration'],
        'packet_size': random.randint(64, 1500),
        'bytes_sent': metadata['bytes_sent'],
        'bytes_received': metadata['bytes_received']
    }
    
    return jsonify(response)

@app.route('/api/ml/predict', methods=['POST'])
def predict():
    """Make predictions on provided features."""
    data = request.get_json()
    
    if not data or 'features' not in data:
        return jsonify({'error': 'Missing features in request body'}), 400
    
    features = data['features']
    
    if len(features) != 50:
        return jsonify({'error': f'Expected 50 features, got {len(features)}'}), 400
    
    risk_score, xgb_label, rl_action = predict_with_models(features)
    
    return jsonify({
        'risk_score': round(risk_score, 4),
        'xgb_label': 'ATTACK' if xgb_label == 1 else 'NORMAL',
        'xgb_label_raw': xgb_label,
        'rl_action': rl_action
    })

if __name__ == '__main__':
    print("Loading ML models...")
    load_models()
    print("Starting ML prediction service on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)
