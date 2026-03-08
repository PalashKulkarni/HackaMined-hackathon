# Petpooja AI Ecosystem 🍽️🤖

A complete, dual-sided intelligent restaurant management solution built for the hackathon. This project features two main components working in tandem:
1. **Part 1: Owner Intelligence Dashboard (Streamlit)** - A backend analytics suite for pricing, combo generation, and ML demand forecasting.
2. **Part 2: AI Revenue Copilot (React)** - A 100% offline, WebGPU-powered Voice/Text Point-of-Sale (POS) interface for the restaurant staff.

---

## Part 1: Owner Intelligence Dashboard (Backend Analytics)
A powerful analytics suite built in Python that ingests POS data to optimize menu pricing, identify customer segments, and forecast future demand. 

### ✨ Dashboard Features
- **Menu Engineering (BCG Matrix):** Automatically categorizes menu items into *Stars*, *Plowhorses*, *Puzzles*, and *Dogs* based on popularity and contribution margin.
- **Smart Combo Generator:** Analyzes historical co-purchase frequencies to build intelligent, high-margin combo offers (e.g., pairing Butter Chicken with Naan).
- **Price Simulator & ML Forecasting:** Uses Scikit-Learn Linear Regression to predict how price changes will impact sales volume and overall profit.
- **Customer RFM Segmentation:** Groups customers based on Recency, Frequency, and Monetary value to identify champions and at-risk patrons.
- **Dynamic Upsell Engine:** Automatically generates and updates an `upsell_config.json` file based on real-time data filters.

### 💻 How to Run the Dashboard (Streamlit)
# IMPORTANT
**Prerequisites:** Python 3.9+ installed on your machine.

1. Open a terminal and navigate to the Streamlit project folder.
2. Install the required Python libraries:
   ```bash
   pip install streamlit pandas plotly scikit-learn numpy

## To Start the Streamlit Part: MODULE 1
1. streamlit run app.py

## 💻 How to Run Locally (For Judges) MODULE 2
### Prerequisites
* [Node.js](https://nodejs.org/) installed on your machine.
* A modern browser with WebGPU support (Google Chrome or Microsoft Edge recommended).
* **Important:** Ensure "Use graphics acceleration when available" is turned **ON** in your browser settings to allow the AI to access your GPU.

### Setup Instructions
1. Clone or extract this repository and navigate to the project folder.
2. Install the required dependencies:
   ```bash
   npm install

## TO START THE SERVER AFTER ALL DEPENDENCIES ARE INSTALLED!
1. npm run dev
2. Ctrl + Left Click on the Localhost link(for example: http://localhost:5173)

# IMPORTANT !
## 🛑 IMPORTANT TESTING NOTE FOR JUDGES: > On the very first run, navigate to the "Voice Copilot" tab and type a test order. The browser will download the compressed AI engine (~350MB) and cache it natively. After this initial load, completely disconnect your Wi-Fi and place another order to verify that the Natural Language Processing runs 100% offline!