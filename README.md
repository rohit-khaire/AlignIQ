# AlignIQ

**See compliance with clarity. Intelligent policy alignment.**

AlignIQ is an intelligent compliance management platform that helps organizations align their policies with compliance requirements, extract insights from policy documents, and generate comprehensive compliance reports.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)

## 🎯 Overview

AlignIQ streamlines compliance management by:
- Extracting text from policy documents (PDF support)
- Analyzing policy compliance against regulatory requirements
- Generating detailed compliance reports
- Exporting compliance data in multiple formats
- Providing intelligent policy alignment recommendations

## ✨ Features

- **PDF Text Extraction** - Extract and process compliance documents
- **Compliance Engine** - Intelligent analysis of policy alignment
- **Report Generation** - Generate structured compliance reports
- **Multi-format Export** - Export data to JSON, CSV, and other formats
- **RESTful API** - Easy-to-use API endpoints for integration
- **React Frontend** - Intuitive user interface for compliance management

## 📁 Project Structure

```
AlignIQ/
├── backend/
│   ├── api/
│   │   ├── main.py              # FastAPI application entry point
│   │   └── routes/
│   │       └── compliance.py     # Compliance API endpoints
│   ├── services/
│   │   ├── compliance_engine.py  # Core compliance analysis logic
│   │   ├── pdf_extractor.py      # PDF text extraction
│   │   └── export_service.py     # Report export functionality
│   ├── models/
│   │   └── responses.py          # Pydantic response models
│   ├── data/
│   │   ├── master_policies.json  # Policy database
│   │   └── Enterprise_Compliance_Manual_Fictional_Demo.md
│   ├── extract-text/             # Text extraction utilities
│   ├── store-to-db/              # Database operations
│   ├── uploads/                  # User uploaded files
│   ├── user_uploaded_data/       # Processed user data
│   ├── reports/                  # Generated reports
│   └── requirements.txt          # Python dependencies
├── frontend/
│   └── .oxlintrc.json            # Linting configuration
└── README.md                      # This file
```

## 🛠 Tech Stack

**Backend:**
- Python 3.x
- FastAPI - Web framework
- Pydantic - Data validation
- PyPDF / Pymupdf4llm PDF extraction libraries

**Frontend:**
- React
- TypeScript
- Oxlint - Code linting

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 14+
- Git

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/rohit-khaire/AlignIQ.git
cd AlignIQ/backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the API server:
```bash
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd ../frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

## 📖 Usage

### API Endpoints

Base URL: `http://127.0.0.1:8000`

#### 1. Welcome Endpoint
```
GET /
```
**Response:**
```json
{
  "message": "Welcome to the AlignIQ Compliance API"
}
```

#### 2. Analyze Compliance (Upload PDF Policy)
```
POST /api/v1/compliance/analyze
Content-Type: multipart/form-data

Body:
  file: <your-policy-document.pdf>
```
**Response:**
```json
{
  "status": "success",
  "report": [
    {
      "policy_section": "...",
      "compliance_status": "...",
      "findings": [...],
      "recommendations": [...]
    }
  ]
}
```
**Status Codes:**
- `200` - Analysis completed successfully
- `400` - Invalid file format (only PDF supported)
- `500` - Server error during analysis

#### 3. Export Compliance Report
```
GET /api/v1/compliance/export?format=json
```
**Query Parameters:**
- `format` (required): Export format - `json`, `csv`, or `pdf`

**Response:**
- Returns the compliance report file in the requested format
- File is automatically downloaded as an attachment

**Status Codes:**
- `200` - Export successful
- `400` - Invalid format specified
- `404` - No compliance report found
- `500` - Server error during export

### Example Usage with cURL

**Upload and Analyze:**
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/compliance/analyze" \
  -H "accept: application/json" \
  -F "file=@policy.pdf"
```

**Export Report as JSON:**
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/compliance/export?format=json" \
  -o compliance_report.json
```

**Export Report as CSV:**
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/compliance/export?format=csv" \
  -o compliance_report.csv
```

### Frontend Integration

Frontend available at: `http://localhost:5173` (after `npm run dev`)

CORS is configured to allow requests from both `http://localhost:5173` and `http://127.0.0.1:5173`

## 🔧 Configuration

- **Policy Database**: Update `backend/data/master_policies.json`
- **Compliance Rules**: Modify `backend/services/compliance_engine.py`
- **Frontend Linting**: Edit `frontend/.oxlintrc.json`

## 📝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add your feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## 📧 Support

For issues, questions, or suggestions, please open an issue on GitHub.

## 👤 Author

**Rohit Khaire**

- GitHub: [@rohit-khaire](https://github.com/rohit-khaire)
- Repository: [AlignIQ](https://github.com/rohit-khaire/AlignIQ)

---

*Built with ❤️ for compliance management excellence*
