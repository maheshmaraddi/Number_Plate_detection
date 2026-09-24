# Car License Plate Detection App

A modern web app for detecting and analyzing license plates from uploaded vehicle images or live camera captures. The project uses FastAPI on the backend, Jinja templates for the frontend UI, and an external Ultralytics-based prediction service for inference.

## Features

- Upload vehicle images in JPG, PNG, or WEBP format
- Capture images from the browser camera
- Adjust inference settings such as confidence, IoU, and image size
- Display detection results with visual overlays and JSON output
- Clean, responsive UI with a polished dark theme

## Project Structure

```text
Car-License/
├── app.py
├── requirements.txt
├── static/
│   ├── script.js
│   └── style.css
└── templates/
    └── index.html
```

## Tech Stack

- Python 3.10+
- FastAPI
- Jinja2 Templates
- Uvicorn
- HTTPX
- Python-dotenv
- HTML, CSS, and JavaScript

## Prerequisites

Make sure you have the following installed:

- Python 3.10 or newer
- pip
- A working internet connection for the prediction API

## Setup

1. Clone the repository or open the project folder.
2. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate
```

On Windows PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

3. Install the dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the project root with your prediction API key:

```env
ULTRALYTICS_API_KEY=your_api_key_here
```

You can also override the prediction endpoint if needed:

```env
ULTRALYTICS_PREDICTION_URL=https://your-prediction-endpoint/predict
```

## Run the App

Start the development server:

```bash
python app.py
```

Then open your browser at:

```text
http://127.0.0.1:8000/
```

## API Endpoints

- `GET /` – Renders the homepage UI
- `POST /predict` – Accepts an uploaded image and returns prediction results
- `GET /health` – Health check endpoint

## Notes

- The app expects a valid API key for the prediction service.
- Uploaded files must be smaller than 10 MB.
- Supported image types: JPG, PNG, and WEBP.

## License

This project is open for learning and development purposes.
