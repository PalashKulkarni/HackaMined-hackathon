# Petpooja AI Revenue Copilot 🍽️🤖

An intelligent, fully offline Point-of-Sale (POS) and Revenue Management assistant built for the browser. 

Designed for high-speed restaurant environments where internet connections can be unreliable, this project completely eliminates the need for cloud APIs. It runs a **360 Million Parameter Large Language Model (LLM)** entirely locally inside the user's browser tab using WebGPU.

---

## 🚀 The Hackathon Challenge & Our Solution
**The Challenge:** Build an AI-powered POS system without using external cloud APIs (No Groq, No OpenAI, No Claude).
**The Solution:** We engineered an "Edge-AI" architecture. By leveraging `@huggingface/transformers` and WebGPU, we brought the AI directly to the client's device. 

This guarantees:
- **Zero Cloud Latency:** Orders are processed instantly on the local machine.
- **100% Data Privacy:** Customer data and order histories never leave the restaurant's local network.
- **Offline Reliability:** If the restaurant's Wi-Fi goes down, the AI keeps taking orders seamlessly.
- **Zero API Costs:** Infinite scaling without worrying about token limits or API subscription fees.

---

## ✨ Key Features

### 🎙️ 1. Edge-AI Voice & Text Copilot
- **Local LLM Integration:** Powered by a highly compressed (4-bit quantized) `SmolLM2-360M-Instruct` model running directly on the user's graphics card.
- **Hinglish & Slang Support:** The AI is meticulously pre-prompted with a "Golden Dataset" to understand colloquial Indian ordering patterns (e.g., *"ek mango lassi aur char butter naan"*).
- **Indestructible Data Parser:** Features a custom Regex-based fallback engine that ensures the AI's natural language output is flawlessly translated into strict JSON payload for the POS cart, preventing any hallucination errors.

### 📊 2. Revenue Intelligence Dashboard
- **BCG Matrix Analysis:** Automatically categorizes menu items into *Stars*, *Plowhorses*, *Puzzles*, and *Dogs* based on popularity and contribution margin.
- **Association Rule Upselling:** Analyzes co-purchase frequencies to generate smart combo recommendations dynamically (e.g., pairing Butter Chicken with Naan).
- **Dynamic Price Optimization:** Suggests actionable pricing strategies to achieve a target 68% profit margin on underperforming items.

### 🧑‍🍳 3. Seamless KOT Management
- One-click Kitchen Order Ticket (KOT) generation.
- Real-time status tracking (Pending → Preparing → Ready → Served).
- JSON payload exporting for easy integration with legacy thermal printers and backend databases.

---

## 🛠️ Technical Architecture

* **Frontend Framework:** React 19 + Vite
* **Styling & UI:** Custom CSS, `lucide-react` for iconography, `recharts` for data visualization.
* **AI Engine:** `@huggingface/transformers` (v3) running WebAssembly (WASM) and WebGPU.
* **The Brain:** `HuggingFaceTB/SmolLM2-360M-Instruct` (q4f16 format).
* **Multi-threading:** The AI engine is offloaded to a dedicated Web Worker (`worker.js`) so the massive matrix multiplications never freeze the main React UI thread.

---

## 💻 How to Run Locally (For Judges)

### Prerequisites
* [Node.js](https://nodejs.org/) installed on your machine.
* A modern browser with WebGPU support (Google Chrome or Microsoft Edge recommended).
* **Important:** Ensure "Use graphics acceleration when available" is turned **ON** in your browser settings to allow the AI to access your GPU.

### Setup Instructions
1. Clone or extract this repository and navigate to the project folder.
2. Install the required dependencies:
   ```bash
   npm install

## TO START THE SERVER AFTER ALL DEPENDENCIES ARE INSTALLED
1. npm run dev
2. Ctrl + Left Click on the Localhost link(for example: http://localhost:5173)