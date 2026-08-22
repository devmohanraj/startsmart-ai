# StartSmart AI

**AI-Powered Startup & Project Risk Analysis Platform**

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.16-green)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![Java](https://img.shields.io/badge/Java-17-orange)](https://www.oracle.com/java/)

StartSmart AI analyzes startup and project ideas to predict failure risks, calculate success probabilities, evaluate market fit, and provide actionable strategic recommendations. Powered by advanced AI models and real-time market data.

---

## Features

- **AI-Powered Market Analysis** - TAM/SAM/SOM calculations, market trends, industry sizing
- **Competitor Landscape Mapping** - Direct/indirect competitors, market share, revenue comparisons
- **Risk Assessment Engine** - Risk scoring, failure probability, success factors, mitigation strategies
- **Strategic Recommendations** - AI-generated insights, market entry strategies, business model optimization
- **User Management** - Secure authentication, project history, multi-project management
- **Modern Dark UI** - Responsive design, real-time loading states, interactive visualizations

---

## Tech Stack

### Backend
- **Spring Boot 3.5.16** - Application framework
- **Java 17** - Programming language
- **PostgreSQL 15+** - Primary database
- **Lombok** - Code generation
- **SpringDoc OpenAPI** - API documentation
- **Maven** - Build automation

### Frontend
- **React 18.2** - UI framework
- **Vite 5.0** - Build tool & dev server
- **Tailwind CSS 3.4** - Styling framework
- **React Hot Toast** - Notifications

---

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+ and npm
- PostgreSQL 15+
- Maven 3.8+

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/smart-failure-detection.git
cd smart-failure-detection
```

#### 2. Database Setup

```sql
CREATE DATABASE startsmart_db;
CREATE USER startsmart_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE startsmart_db TO startsmart_user;
```

#### 3. Backend Configuration

```bash
cd backend/risk-analyzer/src/main/resources
cp application-local.properties.example application-local.properties
```

Edit `application-local.properties` with your database credentials and API keys.

```bash
cd ../../../../..
mvn clean install
mvn spring-boot:run
```

Backend runs at `http://localhost:8080`

#### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## API Documentation

### Authentication

```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### Projects

```http
POST /api/projects?userId={userId}
Content-Type: application/json

{
  "projectName": "TechVenture AI",
  "industrySector": "Technology",
  "businessModel": "SaaS",
  "targetMarket": "SMBs",
  "budget": 5000000,
  "description": "AI-powered SaaS platform"
}
```

```http
GET /api/projects/user/{userId}
GET /api/projects/{projectId}/market-analysis
POST /api/projects/{projectId}/market-analysis
```

---

## Project Structure

```
├── backend/risk-analyzer/
│   ├── src/main/java/com/startsmart/ai/riskanalyzer/
│   │   ├── config/          # Configuration classes
│   │   ├── controller/      # REST controllers
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── entity/          # JPA entities
│   │   ├── repository/      # Data repositories
│   │   └── service/         # Business logic
│   └── src/main/resources/
│       ├── application.properties
│       └── application-local.properties.example
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   └── package.json
│
└── README.md
```

---

## Configuration

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `spring.datasource.url` | PostgreSQL database URL | Yes |
| `spring.datasource.username` | Database username | Yes |
| `spring.datasource.password` | Database password | Yes |
| `groq.api.key` | Groq AI API key (risk assessment) | Yes |
| `groq.api.key.analysis` | Groq AI API key (market analysis) | Yes |
| `server.port` | Server port (default: 8080) | No |

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | No |

---

## Development

### Backend

```bash
cd backend/risk-analyzer
mvn clean package
mvn spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Build

```bash
# Backend
cd backend/risk-analyzer
mvn clean package -DskipTests

# Frontend
cd frontend
npm run build
```

---

## Troubleshooting

**Database Connection Error**
- Ensure PostgreSQL is running
- Verify credentials in `application-local.properties`

**CORS Errors**
- Backend CORS is configured in `WebConfig.java`
- Frontend should run on `http://localhost:5173`

**Build Failures**
- Clear Maven cache: `mvn clean`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

---

## Roadmap

- Multi-language support
- Advanced ML models for risk prediction
- Integration with more AI providers (OpenAI, Claude)
- Real-time collaboration features
- Export analysis reports (PDF, Excel)
- Historical trend analysis
- Docker containerization