<div align="center">

# AI Intrusion Detection System

### An AI-powered cybersecurity platform for network intrusion detection and SOC decision support

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-46E3FF?style=for-the-badge&logo=render&logoColor=white)](https://ai-intrusion-detection-system-xisz.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](#)
[![Python](https://img.shields.io/badge/Python-ML-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
[![XGBoost](https://img.shields.io/badge/XGBoost-Classification-FF6600?style=for-the-badge)](#)
[![PPO](https://img.shields.io/badge/Reinforcement%20Learning-PPO-8A2BE2?style=for-the-badge)](#)

</div>

---

## Overview

The **AI Intrusion Detection System** is an interactive cybersecurity platform designed to help SOC analysts analyze network traffic and make security decisions.

The system combines **Machine Learning** and **Reinforcement Learning** to classify network flows, estimate risk levels, and recommend whether suspicious traffic should be blocked or ignored.

The platform also provides an interactive dashboard that allows users to review network flows, make decisions, and track their performance during each session.

---

## Live Demo

Try the deployed application here:

### [Open AI Intrusion Detection System](https://ai-intrusion-detection-system-xisz.onrender.com)

> The application is hosted on Render’s free plan, so the first load may take a few seconds after inactivity.

---

## Features

- Network flow analysis
- XGBoost-based attack classification
- Reinforcement Learning recommendation using PPO
- Risk score visualization
- SOC analyst decision simulation
- Block or ignore network traffic
- Session score and accuracy tracking
- Difficulty level selection
- PostgreSQL database integration
- Responsive cybersecurity dashboard
- Automatic fallback simulation when ML services are unavailable

---

## How It Works

1. A new network flow is generated or processed by the ML service.
2. The XGBoost model predicts whether the flow is normal or malicious.
3. A risk score is calculated.
4. The PPO agent recommends either:
   - `BLOCK`
   - `IGNORE`
5. The SOC analyst makes a decision.
6. The system compares the decision with the true label.
7. The score, accuracy, and session statistics are updated.

---

## System Architecture

```text
User Interface
     │
     ▼
React + Vite Frontend
     │
     ▼
Express.js API
     │
     ├── PostgreSQL Database
     │
     └── Python ML Service
           ├── XGBoost Model
           ├── Scikit-learn Scaler
           └── PPO Agent
