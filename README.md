# IncidentIQ — AI Incident Response Agent

**Turning past incidents into better future responses.**

IncidentIQ is an AI-powered incident response agent that helps engineering teams troubleshoot production incidents using historical incident knowledge.

It uses **Hindsight** for persistent memory and **Groq** for LLM-powered recommendations. The agent recalls relevant past incidents, considers successful and failed resolutions, and uses engineer feedback to improve future troubleshooting recommendations.

## Key Features

- **AI-Powered Incident Analysis:** Analyse incident descriptions, services, environments, severity levels and technical logs.
- **Persistent Incident Memory:** Use Hindsight to retain and recall historical incident information.
- **Context-Aware Recommendations:** Generate troubleshooting recommendations using Groq, informed by relevant historical incidents.
- **Success and Failure Awareness:** Consider previous successful resolutions and failed fixes when recommending actions.
- **Feedback-Based Learning:** Collect WORKED and FAILED feedback and retain outcomes in Hindsight for use in subsequent incident analysis.
- **Incident History:** View previously analysed incidents and their outcomes.
- **Memory Insights:** Explore recurring incident patterns, resolution outcomes and lessons.
- **Failed-Fix Warnings:** Highlight previously unsuccessful approaches to help engineers avoid repeating them.
- **Responsive Interface:** Access the application through a responsive web interface with light and dark themes.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, FastAPI |
| LLM | Groq |
| Persistent Memory | Hindsight |
| API Communication | REST API, Fetch |
| Version Control | Git and GitHub |

## Project Structure

```text
HackWithBangalore_4.O_project/
│
├── backend/
│   ├── agent.py
│   ├── main.py
│   ├── memory.py
│   ├── seed_memory.py
│   └── test_recall.py
│
├── data/
│   └── seed_incidents.json
│
├── docs/
│   ├── demo_script.md
│   └── video_outline.md
│
├── web/
│   ├── assets/
│   │   └── incidentiq-mark.svg
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── api.js
│   │   ├── app.js
│   │   ├── mock-data.js
│   │   └── theme.js
│   └── index.html
│
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

## Getting Started

### 1. Clone the repository

```powershell
git clone https://github.com/poojamm18/HackWithBangalore_4.O_project.git
cd HackWithBangalore_4.O_project
```

### 2. Install dependencies

```powershell
python -m pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root using `.env.example` as a reference.

Add the following configuration:

```env
HINDSIGHT_API_KEY=your_hindsight_api_key
HINDSIGHT_BANK_ID=incident-demo
GROQ_API_KEY=your_groq_api_key
```

Replace the placeholder values with your actual API credentials.

**Important:**
- Keep API keys private.
- Never commit `.env` to GitHub.
- The `.env` file is excluded through `.gitignore`.
- Use the same Hindsight bank ID that contains the intended incident memories.

### 4. Start the FastAPI backend

From the project root:

```powershell
python -m uvicorn backend.main:app --reload --port 8001
```

Backend URL:

http://127.0.0.1:8001

Interactive API documentation:

http://127.0.0.1:8001/docs

### 5. Start the frontend

Open a second terminal in the project root:

```powershell
python -m http.server 8000 --directory web
```

Open the application:

http://127.0.0.1:8000

Keep both servers running while using the application.

No npm installation or frontend build step is required.

## How IncidentIQ Works

The application follows a memory-informed incident response workflow:

1. **Incident Submission:** An engineer submits a production incident with its description, service, environment, severity and optional technical details.
2. **Memory Retrieval:** IncidentIQ uses Hindsight to recall relevant historical incidents and their recorded outcomes.
3. **AI Recommendation Generation:** Groq generates troubleshooting recommendations using the current incident and retrieved historical context.
4. **Evidence-Based Guidance:** Previous successful and failed fixes are considered when generating recommendations. Previously unsuccessful approaches can be highlighted.
5. **Engineer Feedback:** Engineers indicate whether a recommended fix WORKED or FAILED.
6. **Memory Retention:** Feedback and incident outcomes are retained in Hindsight.
7. **Future Recall:** Subsequent incident analysis can retrieve those recorded outcomes to inform future recommendations.

## Backend API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/incidents/analyze` | Analyse an incident |
| POST | `/api/incidents/{incident_id}/feedback` | Submit recommendation feedback |
| GET | `/api/incidents` | Retrieve incident history |
| GET | `/api/insights` | Retrieve incident insights |
| GET | `/api/services` | Check service configuration and status |

Refer to the FastAPI Swagger documentation at `/docs` for the actual request and response schemas.

## Seed Incident Data

The repository includes `data/seed_incidents.json`, which contains the initial sample incident dataset.

The backend includes `backend/seed_memory.py` for loading incident records into the configured Hindsight memory bank.

Run the seed script only when setting up or intentionally resetting the memory bank:

```powershell
python backend/seed_memory.py
```

Avoid running it repeatedly against an already populated bank unless duplicate handling has been verified.

The project also includes `backend/test_recall.py` for testing memory retrieval.

## Important Limitations

- IncidentIQ provides recommendations to assist engineers; it does not guarantee that a suggested fix will resolve an incident.
- AI-generated explanations may contain inferences. A recorded failed outcome does not necessarily establish why a fix failed.
- Engineers should verify recommendations before applying changes to production systems.
- The application does not automatically monitor production infrastructure, detect incidents in real time, or execute fixes.
- Never include passwords, API keys, tokens or other secrets in incident descriptions or logs.

## Team

Built collaboratively for Hack With Bangalore 4.0.

---

**IncidentIQ — Learn from every incident. Make the next response better.**