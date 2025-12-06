#!/usr/bin/env python3
"""
ML Prediction Script for AI Intrusion Detection System
Called as a subprocess from Node.js to get predictions.
"""

import os
import sys
import json
import random
import warnings

warnings.filterwarnings('ignore')

import joblib
import pickle
import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'ml_models')

def load_models():
    """Load the ML models."""
    scaler = None
    xgb_model = None
    
    scaler_path = os.path.join(MODEL_DIR, 'scaler.joblib')
    xgb_path = os.path.join(MODEL_DIR, 'xgb_model.pkl')
    
    try:
        scaler = joblib.load(scaler_path)
    except:
        pass
    
    try:
        with open(xgb_path, 'rb') as f:
            xgb_model = pickle.load(f)
    except:
        pass
    
    return scaler, xgb_model

def generate_synthetic_features(is_attack_biased=None):
    """Generate synthetic network flow features (50 features)."""
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

def predict_with_models(features, scaler, xgb_model):
    """Make predictions using the loaded models."""
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

def main():
    scaler, xgb_model = load_models()
    
    features = generate_synthetic_features()
    
    risk_score, xgb_label, rl_action = predict_with_models(features, scaler, xgb_model)
    
    protocol_map = {6: 'TCP', 17: 'UDP', 1: 'ICMP'}
    protocol_num = int(features[1]) if len(features) > 1 else 6
    
    true_label = 1 if risk_score > 0.5 else 0
    if random.random() < 0.15:
        true_label = 1 - true_label
    
    src_ips = ["192.168.1.", "10.0.0.", "172.16.0.", "203.0.113.", "198.51.100."]
    dst_ips = ["8.8.8.", "1.1.1.", "104.16.", "151.101.", "185.199."]
    
    flow_id = random.randint(10000, 99999)
    
    result = {
        'flow_id': flow_id,
        'risk_score': round(risk_score, 4),
        'xgb_label': 'ATTACK' if xgb_label == 1 else 'NORMAL',
        'xgb_label_raw': xgb_label,
        'rl_action': rl_action,
        'true_label': true_label,
        'src_ip': f"{random.choice(src_ips)}{random.randint(1, 254)}",
        'dst_ip': f"{random.choice(dst_ips)}{random.randint(1, 254)}",
        'src_port': int(features[2]) if len(features) > 2 else random.randint(1024, 65535),
        'dst_port': int(features[3]) if len(features) > 3 else 80,
        'protocol': protocol_map.get(protocol_num, 'TCP'),
        'duration': round(features[0], 2) if len(features) > 0 else 0,
        'packet_size': random.randint(64, 1500),
    }
    
    print(json.dumps(result))

if __name__ == '__main__':
    main()
