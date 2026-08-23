# StartSmart AI

### AI-Powered Startup & Project Risk Analysis Platform

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.16-green)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-purple)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![Java](https://img.shields.io/badge/Java-17-orange)](https://www.oracle.com/java/)

StartSmart AI evaluates startup and project ideas end-to-end. An XGBoost model predicts success probability and failure risk, while Groq-powered AI generates market and competitor intelligence, SWOT analysis, and risk assessments. A LangGraph-based recommendation pipeline converts the findings into a phased action roadmap.

---

## 🌐 Live Demo

**[Launch StartSmart AI →](https://startsmartai.vercel.app/)**

---

## 📌 Overview

StartSmart AI is an AI-powered decision-support platform designed for entrepreneurs, students, and project teams who want to evaluate an idea before committing significant time or resources.

Users submit project information such as:

- Project name
- Industry
- Business model
- Target market
- Budget
- Project description

The platform combines **Machine Learning** with **Generative AI** to quantify project risk, analyze the market and competitors, evaluate feasibility, and provide actionable recommendations.

All projects are managed under a user account and can be viewed and analyzed through a centralized dashboard.

---

## ✨ Key Features

### 📁 Project Management

- Structured project submission
- Project history for each user
- Multiple project management
- Project catalog and selection
- Persistent project data

### 📊 ML-Based Risk Assessment

- XGBoost-based success probability prediction
- Overall risk score calculation
- Risk level classification
- SHAP-based risk factor explanation
- Five-category risk analysis

### 🏢 Market & Competitor Intelligence

- TAM / SAM / SOM analysis
- Market trends
- Market growth information
- Industry analysis
- Competitor landscape
- Competitor market-share comparison

### 🧠 SWOT Analysis

- Strengths
- Weaknesses
- Opportunities
- Threats

### 📈 Feasibility Scoring

Weighted evaluation across seven metrics:

- Financial sustainability
- Team capability
- Competitive advantage
- Resource availability
- Market opportunity
- Execution readiness
- Scalability potential

### 💡 AI-Generated Recommendations

- Risk mitigation strategies
- Category-specific recommendations
- Immediate actions
- Next 30 Days roadmap
- Next Quarter roadmap

### 📊 Portfolio Dashboard

- Average risk score
- Average success probability
- Risk distribution
- Assessment coverage
- Top risk driver insights

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 | User interface |
| Vite | Build tool and development server |
| Tailwind CSS 4 | Styling |
| React Router | Client-side routing |
| Axios | API communication |
| React Hot Toast | Notifications |

### Backend

| Technology | Purpose |
|---|---|
| Spring Boot 3.5.16 | REST API and application framework |
| Java 17 | Backend development |
| Spring Data JPA | Database access |
| PostgreSQL | Application database |
| Neon PostgreSQL | Cloud database |
| SpringDoc OpenAPI | API documentation |
| Maven | Build automation |

### Machine Learning & AI

| Technology | Purpose |
|---|---|
| Python 3.12 | ML service |
| FastAPI | ML service API |
| XGBoost | Risk prediction |
| SHAP | Model explainability |
| Scikit-learn | ML preprocessing |
| LangGraph | Recommendation workflow |
| Groq | Generative AI |

---

## 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │        User         │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   React Frontend    │
                         │       + Vite        │
                         └──────────┬──────────┘
                                    │
                               REST / JSON
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Spring Boot API   │
                         │ Authentication      │
                         │ Business Logic      │
                         │ Orchestration       │
                         └──────┬─────────┬────┘
                                │         │
                    ┌───────────▼───┐   ┌─▼─────────────────┐
                    │ PostgreSQL    │   │  FastAPI ML       │
                    │    (Neon)     │   │     Service       │
                    └───────────────┘   └────────┬──────────┘
                                                 │
                                  ┌──────────────┴──────────────┐
                                  │                             │
                         ┌────────▼────────┐         ┌─────────▼─────────┐
                         │ XGBoost Model   │         │ LangGraph Agent  │
                         │ SHAP Analysis   │         │ 2-Node Workflow  │
                         └─────────────────┘         └─────────┬─────────┘
                                                               │
                                                               ▼
                                                        ┌─────────────┐
                                                        │  Groq API   │
                                                        │ Generative  │
                                                        │     AI      │
                                                        └─────────────┘
```

### AI Processing Flow

```text
Project Data
     │
     ├──────────────► XGBoost ──────► Success Probability
     │                    │
     │                    └──────────► SHAP Risk Factors
     │
     └──────────────► Groq ─────────► Market Analysis
                          │
                          ├──────────► Competitor Analysis
                          │
                          └──────────► SWOT / Risk Analysis
                                      │
                                      ▼
                                  LangGraph
                                      │
                                      ▼
                              Phased Recommendations
```

The recommendation pipeline uses a two-node LangGraph workflow:

1. `analyze_and_recommend` — generates mitigations for the top risk categories.
2. `sequence_into_roadmap` — organizes the recommendations into Immediate, Next 30 Days, and Next Quarter phases.

---

## 📁 Project Structure

```text
startsmart-ai/
│
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API services (Axios)
│   │   ├── utils/            # Utility functions
│   │   ├── App.jsx           # Main application component
│   │   └── main.jsx          # Application entry point
│   ├── public/
│   └── package.json
│
├── backend/
│   └── risk-analyzer/
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/
│       │   │   │   └── com/startsmart/ai/riskanalyzer/
│       │   │   │       ├── config/        # Configuration
│       │   │   │       ├── controller/    # REST controllers
│       │   │   │       ├── dto/           # Data transfer objects
│       │   │   │       ├── entity/        # JPA entities
│       │   │   │       ├── repository/    # Data repositories
│       │   │   │       └── service/       # Business logic
│       │   │   └── resources/
│       │   │       ├── application.properties
│       │   │       └── application-local.properties.example
│       │   └── test/
│       ├── pom.xml
│       └── Dockerfile
│
├── ml-service/
│   ├── train.py
│   ├── data.py
│   ├── data.csv
│   ├── main.py
│   ├── langgraph_recommendations.py
│   ├── shap_analysis.py
│   ├── export_model.py
│   ├── test_langgraph_recommendations.py
│   ├── risk_model.pkl
│   ├── model_columns.json
│   ├── valid_categories.json
│   ├── requirements.txt
│   └── .env.example
│
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 20.19+ or 22.12+
- npm
- Python 3.12
- PostgreSQL 15+ or a Neon PostgreSQL database
- Groq API key(s)

### 1. Clone the Repository

```bash
git clone https://github.com/devmohanraj/startsmart-ai.git

cd startsmart-ai
```

### 2. Backend Setup

```bash
cd backend/risk-analyzer/src/main/resources

cp application-local.properties.example application-local.properties
```

Configure the database and Groq credentials in:

```text
application-local.properties
```

Then run:

```bash
cd ../../..

mvn spring-boot:run
```

Backend:

```text
http://localhost:8080
```

### 3. Frontend Setup

```bash
cd frontend

cp .env.example .env

npm install

npm run dev
```

Frontend:

```text
http://localhost:5173
```

### 4. ML Service Setup

```bash
cd ml-service

python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create the environment file:

```bash
cp .env.example .env
```

Configure the required Groq API key and start the service:

```bash
uvicorn main:app --reload --port 8000
```

### API Documentation

Once the backend is running, Swagger UI is available at:

```text
http://localhost:8080/swagger-ui/index.html
```

---

## 🔑 Environment Variables

The environment configuration templates are:

- `backend/.../application-local.properties.example`
- `frontend/.env.example`
- `ml-service/.env.example`

### Backend

| Variable | Purpose |
|---|---|
| `spring.datasource.url` | PostgreSQL connection URL |
| `spring.datasource.username` | PostgreSQL username |
| `spring.datasource.password` | PostgreSQL password |
| `groq.api.key.analysis` | Groq key for Market Analysis |
| `groq.api.key` | Groq key for Risk Assessment |
| `groq.model` | Groq model |
| `groq.api.url` | Groq API endpoint |
| `ml.service.url` | FastAPI ML service URL |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL |

### ML Service

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Groq key for Recommendations |
| `GROQ_MODEL` | Groq model |

### Production Configuration

For production/containerized deployment, the backend uses environment variables through `application-prod.properties`:

```text
DB_URL
DB_USERNAME
DB_PASSWORD
GROQ_API_URL
GROQ_API_KEY_ANALYSIS
GROQ_API_KEY
GROQ_MODEL
ML_SERVICE_URL
CORS_ALLOWED_ORIGINS
```

---

## 🔄 Application Workflow

```text
1. User registers / logs in
             ↓
2. User creates a project
             ↓
3. Project information is stored in PostgreSQL
             ↓
4. Market Analysis is generated using Groq
             ↓
5. XGBoost predicts success probability and risk
             ↓
6. SHAP identifies important risk factors
             ↓
7. Groq generates SWOT and category-level risk analysis
             ↓
8. Results are blended and stored
             ↓
9. Top risk categories are sent to LangGraph
             ↓
10. LangGraph generates mitigation strategies
             ↓
11. Recommendations are organized into phases
             ↓
12. Dashboard displays project and portfolio insights
```

---

## 📊 Machine Learning

StartSmart AI uses an **XGBoost classifier** to predict startup success probability.

### Model Inputs

The model uses:

- Budget
- Industry
- India-specific context

The budget is log-transformed and entered in USD-equivalent terms, while industry is represented using one-hot encoding.

### Model Outputs

- Success Probability
- Overall Risk Score
- Risk Level

The overall risk score is derived from the predicted success probability.

### Model Explainability

**SHAP** is used to explain the model prediction and identify the most influential factors contributing to the result.

### Training Data

The model was trained using Crunchbase-derived startup funding data restricted to resolved outcomes:

- Acquired / IPO → Success
- Closed → Failure

India-related rows are weighted to better reflect the intended local context.

Training and inference files are maintained in:

```text
ml-service/
├── train.py
├── data.py
├── data.csv
├── shap_analysis.py
├── risk_model.pkl
├── model_columns.json
└── valid_categories.json
```

---

## 🤖 Generative AI

All generative AI features use **Groq**.

### Market Analysis

Groq generates:

- TAM / SAM / SOM
- Market trends
- Growth information
- Competitor landscape
- Market-share comparison

### Risk Assessment

Groq contributes:

- SWOT analysis
- Technical risk analysis
- Operational risk analysis
- Market risk analysis
- Execution risk analysis

These results are combined with the ML-based financial risk baseline to produce the final risk assessment.

### Recommendations

Recommendations use a **two-node LangGraph workflow**:

```text
Top Risk Categories
        ↓
Node 1: analyze_and_recommend
        ↓
Risk Mitigations
        ↓
Node 2: sequence_into_roadmap
        ↓
Immediate
Next 30 Days
Next Quarter
```

Separate Groq API keys are used for the major AI features to isolate their usage and quotas.

---

## 🔌 API Overview

Complete request and response schemas are available through Swagger UI.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Authenticate user |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/user/{userId}` | List user's projects |
| DELETE | `/api/projects/{projectId}` | Delete project |
| GET / POST | `/api/projects/{projectId}/market-analysis` | Fetch / generate market analysis |
| GET / POST | `/api/projects/{projectId}/risk-analysis` | Fetch / generate risk assessment |
| GET / POST | `/api/projects/{projectId}/recommendations` | Fetch / generate recommendations |
| GET | `/api/dashboard/summary?userId=` | Portfolio dashboard summary |

### ML Service

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Health check |
| POST | `/predict` | Generate ML prediction |
| POST | `/langgraph/recommendations` | Generate AI recommendations |

---

## 🌐 Deployment

The application is hosted using cloud services.

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | Neon PostgreSQL |
| ML Service | Render |

---

## 🔒 Security

The application follows basic security practices including:

- Password hashing using BCrypt
- Environment-based secret management
- Database credentials stored outside source code
- Groq API keys stored in environment/local configuration
- Sensitive configuration excluded using `.gitignore`
- CORS configuration

---

## 👨‍💻 Author

**Mohanraj A**

- GitHub: [github.com/devmohanraj](https://github.com/devmohanraj)
- LinkedIn: [linkedin.com/in/mohanraj153](https://linkedin.com/in/mohanraj153)