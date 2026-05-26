# AI Expense Tracker

A full-stack AI-powered expense tracker built with React, Express, MongoDB, and Google Gemini.

## Features

- Upload bill and receipt images
- Gemini-powered expense category classification
- Create, read, update, and delete expenses
- Responsive dashboard UI with expense cards
- MongoDB persistence for all expense data

## Project Structure

```text
project-root/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── uploads/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Backend Setup

1. Open a terminal in the `backend` folder.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and set your values.

```bash
cp .env.example .env
```

4. Start the backend in development mode:

```bash
npm run dev
```

## Frontend Setup

1. Open a terminal in the `frontend` folder.
2. Install dependencies:

```bash
npm install
```

3. Start the React development server:

```bash
npm run dev
```

## Environment Variables

### Backend

- `MONGODB_URI`: MongoDB connection string
- `GEMINI_API_KEY`: Google Gemini API key
- `PORT`: API server port (default: `5000`)
- `CLIENT_ORIGIN`: Allowed frontend origin (default: `http://localhost:5173`)

## AI Classification

The backend reads the uploaded image, sends it to Gemini, and saves the returned category in MongoDB. Supported categories are:

- Food
- Shopping
- Travel
- Medical
- Entertainment
- Utilities

## Notes

- The Node SDK installation command used is `npm install @google/genai`.
- The Python package command used is `pip install -U google-genai` if you want to experiment with a Python-based flow.
- MongoDB must be running locally or remotely before starting the backend.
