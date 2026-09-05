"""Two-node LangGraph recommendation agent (analyze -> sequence) called by the
Java backend, which ranks risk categories and ships the top three plus project
context + SWOT. Uses its own dedicated GROQ_API_KEY, independent of the
backend's other Groq keys.
"""

import json
import os

from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph
from typing_extensions import TypedDict

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
print(f"DEBUG: GROQ_API_KEY loaded as: {repr(GROQ_API_KEY)}")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

PHASES = ("Immediate", "Next 30 Days", "Next Quarter")


class RecommendationState(TypedDict):
    # Inputs from Spring Boot: top_categories=[{category, score, reason}], project_context, swot.
    top_categories: list
    project_context: dict
    swot: dict
    # analyze fills the flat list; sequence appends phase for the final roadmap.
    raw_recommendations: list
    final_roadmap: list


def _build_llm() -> ChatGroq:
    api_key = GROQ_API_KEY or os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is not set")
    return ChatGroq(
        model=GROQ_MODEL,
        groq_api_key=api_key,
        temperature=0.7,
    )


def _call_groq(prompt: str) -> str:
    """Calls Groq; retries once, then raises RuntimeError with the underlying
    cause. Node wrappers append the node name, raising outside the except."""
    llm = _build_llm()
    last_error = None
    for _ in range(2):
        try:
            response = llm.invoke([HumanMessage(content=prompt)])
            text = getattr(response, "content", None)

            # ChatGroq can return a list of content blocks instead of a plain string; join them.
            if isinstance(text, list):
                extracted = []
                for block in text:
                    if isinstance(block, dict) and "text" in block:
                        extracted.append(block["text"])
                    elif isinstance(block, str):
                        extracted.append(block)
                text = "".join(extracted)

            if text is None or (isinstance(text, str) and not text.strip()):
                raise ValueError("Groq returned an empty response")
            return text
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    raise RuntimeError(f"Groq call failed after 1 retry: {last_error}")


# Mirrors LlmService.stripMarkdown on the Java side so both stacks normalize LLM output.
def _strip_markdown(text: str) -> str:
    text = (text or "").strip()
    had_fence = False
    if text.startswith("```json"):
        text = text[len("```json"):]
        had_fence = True
    elif text.startswith("```"):
        text = text[len("```"):]
        had_fence = True
    if had_fence and text.endswith("```"):
        text = text[: -len("```")]
    return text.strip()


def _parse_json_array(text: str) -> list:
    # Raising outside the except keeps the caught JSONDecodeError out of LangGraph's message.
    error = None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        error = (
            f"Groq returned unparseable JSON: {exc}. "
            f"Raw output: {text[:500]}"
        )
    if error:
        raise RuntimeError(error)
    if not isinstance(parsed, list):
        raise RuntimeError(
            f"Expected a JSON array, got {type(parsed).__name__}"
        )
    return parsed


# Mirrors Java-side RecommendationService/LlmService label and list-formatting conventions.
def _capitalize(value: str) -> str:
    value = (value or "").strip()
    return value[:1].upper() + value[1:] if value else value


def _join_list(items) -> str:
    if not items:
        return "None"
    return "; ".join(str(item) for item in items)


def _categories_text(state: RecommendationState) -> str:
    top = state.get("top_categories") or []
    if not top:
        return "None"
    lines = []
    for c in top:
        label = _capitalize(c.get("category", "Unknown")) + " Risk"
        score = c.get("score")
        score_text = f"{score}/100" if score is not None else "N/A"
        reason = c.get("reason") or "Not available"
        lines.append(f"- {label} (score {score_text}): {reason}")
    return "\n".join(lines)


def _swot_text(state: RecommendationState) -> str:
    swot = state.get("swot") or {}
    return (
        f"Strengths: {_join_list(swot.get('strengths'))}\n"
        f"Weaknesses: {_join_list(swot.get('weaknesses'))}\n"
        f"Opportunities: {_join_list(swot.get('opportunities'))}\n"
        f"Threats: {_join_list(swot.get('threats'))}"
    )


def _project_context_text(state: RecommendationState) -> str:
    ctx = state.get("project_context") or {}
    budget = ctx.get("budget")
    budget_text = f"₹{budget}" if budget not in (None, "") else "Not specified"
    return (
        f"- Industry: {ctx.get('industry') or 'Not specified'}\n"
        f"- Target Market: {ctx.get('target_market') or 'Not specified'}\n"
        f"- Budget: {budget_text}\n"
        f"- Description: {ctx.get('description') or 'Not specified'}"
    )


def _build_analyze_prompt(state: RecommendationState) -> str:
    category_count = len(state.get("top_categories") or [])
    return f"""You are a startup risk mitigation strategist. The risk assessment for the project below has already been completed. Your task is to produce SPECIFIC, ACTIONABLE recommendations that address the top risk categories listed below — all in a SINGLE response covering every listed category.

Project details:
{_project_context_text(state)}

Top risk categories to address (ranked highest first):
{_categories_text(state)}

Overall SWOT of the project (your recommendations must not contradict identified strengths):
{_swot_text(state)}

STRICT REQUIREMENTS:
1. Produce 1-2 recommendations for EACH of the {category_count} risk categories listed above, all inside ONE JSON array.
2. Recommendations must be specific and actionable for THIS exact project - reference the actual budget, industry, scope, and target market given above. Do NOT give generic advice such as "improve marketing", "hire a team", or "raise more funding" without grounding it in this project's specifics.
3. Do not repeat or summarize the risk reasons above. Only NEW, concrete guidance on what to do about each risk.
4. Each recommendation must include a realistic mitigation strategy explaining HOW to execute it.
5. Return ONLY valid JSON - no markdown, no code fences, no preamble. Exactly a JSON array of objects in this shape:
[
  {{
    "riskCategory": "<exact category key: financial|market|technical|operational|execution>",
    "recommendation": "<specific actionable recommendation>",
    "mitigation": "<concrete mitigation strategy>"
  }}
]
Include at least one entry for every risk category listed above, and set the "riskCategory" field to the EXACT category key you were given for it."""


def analyze_and_recommend(state: RecommendationState) -> dict:
    error = None
    recommendations = None
    try:
        prompt = _build_analyze_prompt(state)
        raw = _call_groq(prompt)
        cleaned = _strip_markdown(raw)
        recommendations = _parse_json_array(cleaned)
    except Exception as exc:  # noqa: BLE001
        error = exc
    if error is not None:
        # Raise outside the except so LangGraph surfaces the clean node-named message.
        raise RuntimeError(f"Node 1 (analyze) failed: {error}")
    return {"raw_recommendations": recommendations}


def _build_sequence_prompt(state: RecommendationState) -> str:
    raw = state.get("raw_recommendations") or []
    recommendations_json = json.dumps(raw, indent=2, ensure_ascii=False)
    return f"""You are a startup roadmap planner. Below is a flat list of risk-mitigation recommendations (already generated for this project) that need to be phased.

Overall SWOT of the project (your recommendations must not contradict identified strengths):
{_swot_text(state)}

Recommendations to phase:
{recommendations_json}

STRICT REQUIREMENTS:
1. Assign each recommendation EXACTLY one phase: "Immediate" (action within the next week), "Next 30 Days", or "Next Quarter".
2. Reason about dependencies between recommendations when choosing phases: do NOT schedule something "Immediate" if it logically depends on another recommendation being completed first. Sequence dependent work before its dependents.
3. Where dependencies allow it, distribute the recommendations evenly across the three phases — aim for one recommendation per phase rather than clustering multiple into a single phase, unless the dependency reasoning above genuinely requires otherwise.
4. Keep every existing field (riskCategory, recommendation, mitigation) exactly as provided — change nothing but add the phase field.
5. Return ONLY valid JSON - no markdown, no code fences, no preamble. Exactly a JSON array with the SAME number of entries as the input, one per recommendation, in this shape:
[
  {{
    "riskCategory": "<unchanged category key>",
    "recommendation": "<unchanged recommendation text>",
    "mitigation": "<unchanged mitigation strategy>",
    "phase": "Immediate|Next 30 Days|Next Quarter"
  }}
]"""

def sequence_into_roadmap(state: RecommendationState) -> dict:
    error = None
    roadmap = None
    try:
        prompt = _build_sequence_prompt(state)
        raw = _call_groq(prompt)
        cleaned = _strip_markdown(raw)
        roadmap = _parse_json_array(cleaned)
    except Exception as exc:  # noqa: BLE001
        error = exc
    if error is not None:
        # Raise outside the except so LangGraph surfaces the clean node-named message.
        raise RuntimeError(f"Node 2 (sequence) failed: {error}")
    return {"final_roadmap": roadmap}


def _build_graph():
    workflow = StateGraph(RecommendationState)
    workflow.add_node("analyze", analyze_and_recommend)
    workflow.add_node("sequence", sequence_into_roadmap)
    workflow.set_entry_point("analyze")
    workflow.add_edge("analyze", "sequence")
    workflow.set_finish_point("sequence")
    return workflow.compile()


compiled_graph = _build_graph()


def run_recommendation_graph(top_categories, project_context, swot) -> list:
    initial_state: RecommendationState = {
        "top_categories": top_categories,
        "project_context": project_context,
        "swot": swot,
        "raw_recommendations": [],
        "final_roadmap": [],
    }
    result = compiled_graph.invoke(initial_state)
    return result["final_roadmap"]