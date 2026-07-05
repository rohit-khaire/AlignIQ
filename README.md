# AlignIQ

<p align="center">
  <img src="frontend/public/AlignIQ-Logo.png" width="120" alt="AlignIQ Logo" />
</p>

AlignIQ is an AI-assisted compliance analysis platform for reviewing policy documents, identifying gaps against regulatory standards, and generating actionable remediation recommendations.

The system combines a FastAPI backend with a React + TypeScript frontend so you can upload a policy PDF, run compliance analysis, inspect the results, and explore autofix and chat-based guidance in one experience.

## What the project does

- Uploads policy documents in PDF format
- Extracts content from the document and structures it for analysis
- Compares policy sections against a master policy dataset
- Produces a compliance report with findings and recommendations
- Supports autofix suggestions, exportable reports, and a chat-style compliance assistant
- Stores basic historical compliance score data locally for dashboard views

## Project structure

```text
AlignIQ/
├── backend/
│   ├── api/
│   │   └── main.py
│   ├── api/routes/compliance.py
│   ├── services/
│   │   ├── compliance_engine.py
│   │   ├── pdf_extractor.py
│   │   ├── autofix_engine.py
│   │   ├── chatbot_engine.py
│   │   └── export_service.py
│   ├── data/
│   │   ├── master_policies.json
│   │   └── Enterprise_Compliance_Manual_Fictional_Demo.md
│   ├── uploads/
│   ├── reports/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── package.json
│   ├── src/
│   └── vite.config.ts
└── README.md
```

## Tech stack

- Backend: Python, FastAPI, Pydantic, Uvicorn
- Frontend: React, TypeScript, Vite, Tailwind-inspired UI components
- AI integrations: Groq and Pinecone-based services for extraction, analysis, and reasoning
- Data storage: SQLite for historical compliance score logs

## Prerequisites

Make sure these are installed on your machine:

- Python 3.10+
- Node.js 18+
- npm 9+
- Git

## Local development setup

### 1. Clone the repository

```bash
git clone https://github.com/rohit-khaire/AlignIQ.git
cd AlignIQ
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Open the new `.env` file and fill in the required values:

```env
PINECONE_API=your_pinecone_api_key
PINECONE_HOST=your_pinecone_host
PINECONE_INDEX=company-policies
GROQ_API_KEY=your_groq_api_key
```

> The backend can start without these values, but the AI-driven analysis features will fail until the credentials are configured correctly.

Start the API server:

```bash
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend will be available at:

- http://127.0.0.1:8000
- http://localhost:8000

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at:

- http://localhost:5173

If your backend is running somewhere else, you can override the API URL:

```bash
VITE_API_URL=http://127.0.0.1:8000 npm run dev
```

## Typical local workflow

1. Start the backend.
2. Start the frontend.
3. Open the frontend in your browser.
4. Upload a PDF policy document.
5. Wait for the compliance analysis to finish.
6. Review the report, try autofix suggestions, and use the chat assistant for follow-up questions.

## Main API endpoints

Base URL: http://127.0.0.1:8000

- GET `/` - Health/welcome endpoint
- POST `/api/v1/compliance/analyze` - Upload a policy PDF and run analysis
- GET `/api/v1/compliance/export` - Export the latest report as JSON, CSV, or PDF
- POST `/api/v1/compliance/autofix` - Trigger remediation suggestions
- POST `/api/v1/compliance/chat` - Ask the compliance assistant a question
- GET `/api/v1/compliance/history` - Retrieve historical compliance score data
- POST `/api/v1/compliance/reset` - Clear temporary uploaded files and generated reports

Example upload with curl:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/compliance/analyze" \
  -H "accept: application/json" \
  -F "file=@/path/to/policy.pdf"
```

## Troubleshooting

- If the frontend cannot reach the backend, confirm that the backend is running and that the API URL points to port 8000.
- If analysis fails, verify your Groq and Pinecone environment variables in the backend `.env` file.
- If Python dependencies fail to install, make sure your virtual environment is active and that you are using a compatible Python version.

## Notes

- Generated reports are written to the backend `reports` directory.
- Uploaded files are stored under the backend `uploads` directory.
- Local historical score logs are stored in the backend `data/compliance_history.db` SQLite database.

## Contributing

1. Create a feature branch.
2. Make your changes.
3. Test locally.
4. Open a pull request with a clear summary of the update.

## Author

**Rohit Khaire**

GitHub: https://github.com/rohit-khaire

