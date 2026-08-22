"""Basic tests for the LangGraph recommendation agent.

The Groq calls are mocked so the tests verify the graph wiring and state flow
(Node 1 -> Node 2) without hitting the real API.
"""

import json

import pytest

import langgraph_recommendations as lg


def _sample_inputs():
    top_categories = [
        {"category": "financial", "score": 80.0, "reason": "High burn rate"},
        {"category": "market", "score": 60.0, "reason": "Weak go-to-market"},
    ]
    project_context = {
        "budget": 100000,
        "industry": "Technology",
        "target_market": "India",
        "description": "SaaS analytics for SMEs",
    }
    swot = {
        "strengths": ["Strong founding team"],
        "weaknesses": ["No sales channel"],
        "opportunities": ["Untapped SME segment"],
        "threats": ["Incumbent platforms"],
    }
    return top_categories, project_context, swot


def test_graph_flows_node1_to_node2_and_produces_final_roadmap(monkeypatch):
    """Both nodes execute in order and the final output carries phase fields."""
    node1_payload = [
        {"riskCategory": "financial", "recommendation": "Cut burn rate", "mitigation": "Trim non-essential spend"},
        {"riskCategory": "market", "recommendation": "Hire a sales lead", "mitigation": "Post a funded headcount req"},
    ]
    node2_payload = [
        {"riskCategory": "financial", "recommendation": "Cut burn rate", "mitigation": "Trim non-essential spend", "phase": "Immediate"},
        {"riskCategory": "market", "recommendation": "Hire a sales lead", "mitigation": "Post a funded headcount req", "phase": "Next 30 Days"},
    ]

    calls = []

    def fake_call_groq(prompt):
        if "STRICT REQUIREMENTS" in prompt and '"phase"' not in prompt:
            calls.append("Node 1 (analyze)")
            return json.dumps(node1_payload)
        calls.append("Node 2 (sequence)")
        return json.dumps(node2_payload)

    monkeypatch.setattr(lg, "_call_groq", fake_call_groq)

    top_categories, project_context, swot = _sample_inputs()
    result = lg.run_recommendation_graph(top_categories, project_context, swot)

    assert calls == ["Node 1 (analyze)", "Node 2 (sequence)"]
    assert isinstance(result, list)
    assert len(result) == 2
    required_keys = {"riskCategory", "recommendation", "mitigation", "phase"}
    for entry in result:
        assert required_keys.issubset(entry.keys())
    assert result[0]["phase"] == "Immediate"
    assert result[1]["phase"] == "Next 30 Days"


def test_strip_markdown_removes_code_fences():
    text = '```json\n[{"riskCategory": "financial"}]\n```'
    assert lg._strip_markdown(text) == '[{"riskCategory": "financial"}]'


def test_node1_failure_is_debuggable(monkeypatch):
    """A failed Node 1 raises an error that names the failing node."""

    def fake_call_groq(prompt):
        raise RuntimeError("network down")

    monkeypatch.setattr(lg, "_call_groq", fake_call_groq)

    top_categories, project_context, swot = _sample_inputs()
    with pytest.raises(RuntimeError, match="Node 1 \\(analyze\\)"):
        lg.run_recommendation_graph(top_categories, project_context, swot)


def test_node2_failure_is_debuggable(monkeypatch):
    """A failed Node 2 raises an error that names the failing node."""

    def fake_call_groq(prompt):
        if '"phase"' not in prompt:
            return json.dumps([{"riskCategory": "financial", "recommendation": "r", "mitigation": "m"}])
        raise RuntimeError("network down")

    monkeypatch.setattr(lg, "_call_groq", fake_call_groq)

    top_categories, project_context, swot = _sample_inputs()
    with pytest.raises(RuntimeError, match="Node 2 \\(sequence\\)"):
        lg.run_recommendation_graph(top_categories, project_context, swot)