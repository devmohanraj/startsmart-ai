import json
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import shap

from dotenv import load_dotenv
load_dotenv()

from langgraph_recommendations import run_recommendation_graph

app = FastAPI(
    title="StartSmart AI - Risk Prediction Service",
    description=(
        "Predicts startup success probability, risk score, and top risk "
        "factors from Budget and Industry — the two structured, "
        "historically-validated inputs. Business model, target market, "
        "and description are handled separately by Gemini."
    ),
    version="3.0.0",
)

# -------------------------------------------------
# Load model + schema artifacts once at startup
# -------------------------------------------------
model = joblib.load("risk_model.pkl")

with open("model_columns.json") as f:
    MODEL_COLUMNS = json.load(f)

with open("valid_categories.json") as f:
    VALID_CATEGORIES = json.load(f)

explainer = shap.TreeExplainer(model)

# Fixed INR -> USD conversion rate (documented assumption, not live).
# The model was trained on USD-denominated Crunchbase funding data.
INR_TO_USD_RATE = 1 / 83.0

# Maps the form's simplified Industry dropdown -> the model's trained
# category taxonomy (Crunchbase categories). Anything unmapped falls
# back to "Other".
INDUSTRY_TO_MODEL_CATEGORY = {
    "Technology": "Software",
    "Healthcare": "Health Care",
    "Finance": "Finance",
    "E-commerce": "E-Commerce",
    "Education": "Other",
    "Manufacturing": "Other",
    "Other": "Other",
}

# Below this raw USD-equivalent budget, predictions are at the extreme
# edge of what the model saw during training (idea-stage budgets are far
# below the typical funded-company amounts in the training data). This
# doesn't change the score — it just adds an honest confidence note
# instead of presenting a falsely-precise extreme number.
LOW_BUDGET_USD_THRESHOLD = 10_000


# -------------------------------------------------
# Request schema — matches the real submission form
# -------------------------------------------------
class ProjectFeatures(BaseModel):
    budget_inr: float = Field(..., gt=0, description="Project budget in INR")
    industry: str = Field(..., description="Industry/Sector dropdown value")
    is_india: int = Field(default=1, ge=0, le=1, description="1 if India-based (default)")


# -------------------------------------------------
# Response schema
# -------------------------------------------------
class RiskFactor(BaseModel):
    feature: str
    contribution: float
    direction: str  # "increases_risk" | "increases_success"


class PredictionResponse(BaseModel):
    success_probability: float
    overall_risk_score: float
    risk_level: str
    top_risk_factors: list[RiskFactor]
    confidence_note: str | None = None


class RecommendationRequest(BaseModel):
    """Input to the LangGraph recommendation agent — mirrors RecommendationState
    minus the two output fields populated by the graph nodes."""
    top_categories: list[dict] | None = None
    project_context: dict | None = None
    swot: dict | None = None


def encode_input(project: ProjectFeatures) -> tuple[pd.DataFrame, float]:
    """Converts a form-shaped request into the model's trained column structure."""
    budget_usd = project.budget_inr * INR_TO_USD_RATE
    budget_usd_log = np.log1p(budget_usd)

    model_category = INDUSTRY_TO_MODEL_CATEGORY.get(project.industry, "Other")
    if model_category not in VALID_CATEGORIES:
        model_category = "Other"

    row = {
        "funding_total_usd_log": budget_usd_log,
        "is_india": project.is_india,
    }
    for cat in VALID_CATEGORIES:
        row[f"primary_category_{cat}"] = 1 if cat == model_category else 0

    df = pd.DataFrame([row])
    df = df.reindex(columns=MODEL_COLUMNS, fill_value=0)
    return df, budget_usd


@app.get("/")
def health_check():
    return {"status": "ok", "service": "StartSmart AI Risk Prediction", "version": "3.0.0"}


@app.post("/predict", response_model=PredictionResponse)
def predict(project: ProjectFeatures):
    try:
        X, budget_usd = encode_input(project)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid input: {e}")

    success_prob = float(model.predict_proba(X)[0][1])
    risk_score = round((1 - success_prob) * 100, 1)

    if risk_score >= 67:
        risk_level = "High"
    elif risk_score >= 34:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    shap_values = explainer.shap_values(X)[0]
    contributions = pd.DataFrame({"feature": X.columns, "contribution": shap_values})
    top = contributions.reindex(
        contributions["contribution"].abs().sort_values(ascending=False).index
    ).head(5)

    top_risk_factors = [
        RiskFactor(
            feature=row["feature"],
            contribution=round(float(row["contribution"]), 4),
            direction="increases_success" if row["contribution"] > 0 else "increases_risk",
        )
        for _, row in top.iterrows()
    ]

    confidence_note = None
    if budget_usd < LOW_BUDGET_USD_THRESHOLD:
        confidence_note = (
            "This budget is well below the typical funding levels in the model's "
            "training data (funded companies with resolved outcomes). The score "
            "reflects a genuine historical pattern — very low budgets correlate "
            "with higher risk — but treat it as a directional signal rather than "
            "a precise measurement at this extreme."
        )

    return PredictionResponse(
        success_probability=round(success_prob * 100, 1),
        overall_risk_score=risk_score,
        risk_level=risk_level,
        top_risk_factors=top_risk_factors,
        confidence_note=confidence_note,
    )


@app.post("/langgraph/recommendations")
def langgraph_recommendations(request: RecommendationRequest):
    """Runs the 2-node LangGraph recommendation agent (analyze -> sequence) and
    returns the phased roadmap. Called by Spring Boot's RecommendationService."""
    if (
        request.top_categories is None
        or request.project_context is None
        or request.swot is None
    ):
        raise HTTPException(
            status_code=400,
            detail="top_categories, project_context, and swot are required",
        )

    try:
        final_roadmap = run_recommendation_graph(
            request.top_categories,
            request.project_context,
            request.swot,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Recommendation graph failed: {e}",
        )

    return {"recommendations": final_roadmap}