# AlignIQ - Enterprise Compliance Intelligence

![AlignIQ Logo](frontend/public/AlignIQ-Logo.png)

AlignIQ is a working product that solves a practical enterprise problem: automating policy review, gap analysis, and remediation so security, privacy, and compliance teams can scale with confidence.

This repository is an active full‑stack prototype (backend + frontend + datasets). I am currently developing new features, improving extraction accuracy, and hardening the product for real deployments.

**Why AlignIQ matters**
- Manual policy review is slow, inconsistent, and costly. AlignIQ automates evidence discovery, scoring, and remediation drafting so teams focus on decisions instead of paperwork.
- The product standardizes assessments against a configurable master policy set and generates prioritized, auditable outputs.

**What AlignIQ does (high level)**
- Ingests policy PDFs and converts them to structured policy JSON (hybrid: layout parser → regex fast-path → LLM fallback).
- Indexes company policies in a vector store and compares them to `data/master_policies.json`.
- Produces a scored compliance report with per-requirement evaluations, confidence, reasoning, and recommended actions.
- Offers multi-agent "Deep Audit" investigations that produce a debate transcript and a final consensus evaluation for a selected master policy.
- Auto-generates remediated policy drafts (Auto-Fixer) and exports (JSON, CSV, PDF, DOCX, MD).
- Provides an interactive Policy Oracle chat assistant for follow-up questions and forensic review.
- Delivers rich frontend dashboards: 3D knowledge graph, risk matrix, remediation roadmap, executive deck, and per-requirement runbooks.

**Key implemented features (detailed)**
- Extraction pipeline: `backend/services/pdf_extractor.py` - PyMuPDF-based layout extraction, regex document fast-path, and GROQ LLM fallback for unstructured text.
- Analysis engine: `backend/services/compliance_engine.py` - ingest, vector indexing (Pinecone), LLM-based per-requirement evaluation, scoring, and cancellation support.
- Auto-Fix: `backend/services/autofix_engine.py` + frontend `AutoFixer.tsx` - produces consolidated remediated policy drafts per category and supports downloads in `docx`, `pdf`, `md`, and `json`.
- Chat assistant: `backend/services/chatbot_engine.py` + frontend `ChatOracle.tsx` - lightweight conversational interface that uses analysis context to answer questions.
- Multi-Agent Deep Audit: `backend/services/agent_engine.py` + `ReportDashboard` UI - runs multiple agent personas and returns a transcript, final consensus, and premium intelligence (financial exposure, runbooks, one-click patches).
- Progress & control: live progress endpoint, cancel endpoint, and session reset to manage temporary uploads and vector DB namespaces.
- Export & caching: cached reports use file-hash + session-id to avoid re-running expensive LLM work; export endpoints support JSON, CSV, PDF and remediated exports.

**Important API endpoints**
Base: `http://127.0.0.1:8000/api/v1/compliance`
- `POST /analyze` — Upload PDF (header: `X-User-ID`, `X-Session-ID`) — returns report, consulting insights, extraction metadata. PDF size limit: 25MB.
- `GET /progress` — Live analysis progress for UI.
- `POST /cancel` — Cancel running analysis.
- `POST /autofix` — Run AI Auto-Fixer; produces remediated_policies.json.
- `GET /export` — Export the latest report (`?format=json|csv|pdf`).
- `GET /export-remediated` — Export remediated policies (`?format=json|md|docx|pdf`).
- `POST /chat` — Conversational queries to the Policy Oracle (body: `{query, history}`).
- `POST /deep-audit` — Trigger multi-agent deep audit for a master policy id.
- `GET /deep-audit/{policy_id}` — Retrieve the latest deep audit for a policy.
- `GET /history` — Historical compliance score logs for a user.
- `GET|POST /reset` — Reset session and delete temporary files for a user.

**Authentication & headers**
- The API respects the `X-User-ID` header for namespacing and persistence; pass `anonymous` when not using auth.
- Frontend integrates with Clerk for optional auth; components read `userId` and set the header automatically.

**Environment & keys**
- Required for full functionality:
  - `GROQ_API_KEY` — required for LLM extraction, analysis and remediation features.
  - `PINECONE_API` or `PINECONE_API_KEY` — used for vector embeddings/storage (optional local fallbacks exist).
- If these keys are absent, the system will run regex-only extraction and fail early for features that need LLM/vector access.

**Developer quick start**
1. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# set GROQ_API_KEY and PINECONE_* in .env to enable full features
uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```
2. Frontend (separate terminal)
```bash
cd frontend
npm install
npm run dev
```
Open the UI at `http://localhost:5173` and point it to the backend at `http://127.0.0.1:8000` (default).

**Typical developer workflow**
1. Start backend and frontend.
2. Upload a policy PDF via the UI or `POST /analyze`.
3. Monitor progress via `/progress` and the frontend progress bar.
4. Review the `ReportDashboard` for prioritized gaps, use Auto-Fixer to generate remediated drafts, and consult the Policy Oracle for follow-ups.
5. Use Deep Audit to get multi-agent reasoning and export remediations or the full report for audits.

**Where to look in the code**
- API routes: `backend/api/routes/compliance.py`
- Extraction: `backend/services/pdf_extractor.py`
- Analysis & vector indexing: `backend/services/compliance_engine.py`, `backend/services/retrieval_utils.py`
- Auto-fix / remediation: `backend/services/autofix_engine.py`
- Agents & deep audit: `backend/services/agent_engine.py`
- Frontend UI: `frontend/src/components/analyze` (key components: `ReportDashboard.tsx`, `AutoFixer.tsx`, `ChatOracle.tsx`, `KnowledgeGraph3D.tsx`, `ProgressTracker.tsx`).

**Notes & operational considerations**
- Caching: the backend caches analysis results using a SHA256 of the uploaded file and `X-Session-ID`. If a repeat upload with the same hash+session is detected, the cached report is returned to save LLM tokens.
- Rate limits: LLM calls are rate-limited and may queue; Auto-Fixer includes delays to avoid exceeding free-tier limits.
- Vector store: Pinecone eventual consistency is handled; clearing a namespace waits briefly for vector counts to drop.
- Files: uploads are stored in `backend/uploads/<user_id>` and reports in `backend/reports/<user_id>`.

**Roadmap (active work)**
- Improve extraction accuracy and regex coverage to reduce LLM fallback.
- Add enterprise connectors (SharePoint, Google Drive, S3) and audit log exports.
- Harden multi-agent orchestration and provide role-based access controls.
- Add CI/CD, automated tests, and a cloud deployment guide.

**Contributing**
- Open an issue describing the feature or dataset you'd like to add.
- Create a branch, implement, and submit a PR - include tests and a clear description of changes.

**Author & contact**
- Rohit Khaire — https://github.com/rohit-khaire


