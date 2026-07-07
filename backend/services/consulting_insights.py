"""
Consulting-grade compliance insights — replaces traditional compliance consulting deliverables.
Produces deterministic, evidence-linked metrics that mirror Big-4 audit outputs.
"""

import json
import os
import logging
from typing import Any

logger = logging.getLogger(__name__)

CONSULTING_HOURLY_RATE_USD = 275
HOURS_PER_POLICY_TRADITIONAL = 6
HOURS_PER_REQUIREMENT_TRADITIONAL = 0.75
ALIGNIQ_ANALYSIS_MINUTES = 3


def _load_framework_mappings() -> dict:
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "framework_mappings.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _priority_for_gap(risk_level: str, status: str, risk_score: int) -> str:
    risk = (risk_level or "Medium").title()
    if status == "Not Satisfied" and risk in ("Critical", "High"):
        return "P0"
    if status == "Not Satisfied":
        return "P1"
    if status == "Partially Satisfied" and risk in ("Critical", "High"):
        return "P1"
    if status == "Partially Satisfied":
        return "P2"
    if risk_score >= 8:
        return "P2"
    return "P3"


def _framework_coverage(report: list[dict], mappings: dict) -> dict:
    """Compute framework coverage from actual compliance report data.
    Maps report policies to framework controls via category_mappings AND
    policy_control_mappings, then counts which controls are satisfied.
    """
    policy_controls = mappings.get("policy_control_mappings", {})
    category_maps = mappings.get("category_mappings", {})
    frameworks = mappings.get("frameworks", {})
    coverage: dict[str, dict] = {}

    for fw_key in frameworks:
        total_controls: set[str] = set()
        satisfied_controls: set[str] = set()
        gap_controls: set[str] = set()

        for pol in report:
            pid = pol.get("policy_id", "")
            cat = pol.get("category", "")

            # Collect controls for this policy from both specific + category maps
            controls: list[str] = []
            specific = policy_controls.get(pid, {}).get(fw_key, [])
            if specific:
                controls.extend(specific)
            cat_controls = category_maps.get(cat, {}).get(fw_key, [])
            if cat_controls:
                controls.extend(cat_controls)

            if not controls:
                continue

            total_controls.update(controls)

            pol_status = pol.get("overall_status", "Not Satisfied")
            if pol_status == "Satisfied":
                satisfied_controls.update(controls)
            else:
                gap_controls.update(controls)

        in_scope = len(total_controls)
        sat_count = len(satisfied_controls)

        # If no controls mapped at all, report as N/A rather than fake 0%
        if in_scope == 0:
            coverage[fw_key] = {
                "name": frameworks[fw_key]["name"],
                "controls_in_scope": 0,
                "controls_satisfied": 0,
                "controls_with_gaps": 0,
                "coverage_pct": None,  # null = not enough data to assess
                "note": "No uploaded policies map to this framework's controls. Upload policies from relevant categories to see coverage.",
            }
        else:
            coverage[fw_key] = {
                "name": frameworks[fw_key]["name"],
                "controls_in_scope": in_scope,
                "controls_satisfied": sat_count,
                "controls_with_gaps": len(gap_controls - satisfied_controls),
                "coverage_pct": round((sat_count / in_scope) * 100),
            }

    return coverage


def generate_consulting_insights(
    report: list[dict],
    company_meta: dict | None = None,
    extraction_metadata: dict | None = None,
) -> dict[str, Any]:
    """
    Generate a consulting-agency replacement deliverable from compliance analysis results.
    All metrics are computed deterministically from the report — no hallucinated figures.
    """
    company_meta = company_meta or {}
    extraction_metadata = extraction_metadata or {}

    total_policies = len(report)
    total_reqs = sum(p.get("summary", {}).get("total_requirements", 0) for p in report)
    satisfied = sum(p.get("summary", {}).get("satisfied", 0) for p in report)
    partial = sum(p.get("summary", {}).get("partially_satisfied", 0) for p in report)
    not_satisfied = sum(p.get("summary", {}).get("not_satisfied", 0) for p in report)
    gap_count = partial + not_satisfied

    mappings = _load_framework_mappings()

    compliance_score = (
        round(((satisfied + (partial * 0.5)) / total_reqs) * 100) if total_reqs > 0 else 0
    )

    traditional_hours = (total_policies * HOURS_PER_POLICY_TRADITIONAL) + (
        total_reqs * HOURS_PER_REQUIREMENT_TRADITIONAL
    )
    traditional_cost = round(traditional_hours * CONSULTING_HOURLY_RATE_USD)
    aligniq_hours = ALIGNIQ_ANALYSIS_MINUTES / 60
    aligniq_cost = round(aligniq_hours * CONSULTING_HOURLY_RATE_USD)
    cost_savings_usd = traditional_cost - aligniq_cost
    time_savings_hours = round(traditional_hours - aligniq_hours, 1)

    audit_readiness = compliance_score
    if not_satisfied > 0:
        audit_readiness = max(0, compliance_score - min(15, not_satisfied * 2))
    if any(
        p.get("master_policy_details", {}).get("risk_level") == "Critical"
        and p.get("overall_status") == "Not Satisfied"
        for p in report
    ):
        audit_readiness = max(0, audit_readiness - 10)

    gap_matrix: list[dict] = []
    policy_controls = mappings.get("policy_control_mappings", {})
    for pol in report:
        risk_level = pol.get("master_policy_details", {}).get("risk_level", "Medium")
        for req in pol.get("requirements", []):
            if req.get("status") == "Satisfied":
                continue
            priority = _priority_for_gap(
                risk_level, req.get("status", ""), req.get("risk_score", 0)
            )
            gap_matrix.append(
                {
                    "priority": priority,
                    "policy_id": pol.get("policy_id"),
                    "policy_title": pol.get("policy_title"),
                    "category": pol.get("category"),
                    "risk_level": risk_level,
                    "requirement_id": req.get("requirement_id"),
                    "requirement_text": req.get("requirement_text"),
                    "status": req.get("status"),
                    "risk_score": req.get("risk_score", 0),
                    "recommended_action": req.get("recommended_action"),
                    "framework_controls": policy_controls.get(pol.get("policy_id", ""), {}),
                }
            )

    gap_matrix.sort(key=lambda g: (g["priority"], -g["risk_score"]))

    p0 = [g for g in gap_matrix if g["priority"] == "P0"]
    p1 = [g for g in gap_matrix if g["priority"] == "P1"]

    remediation_roadmap = {
        "phase_1_immediate": {
            "timeline": "0–30 days",
            "focus": "Critical and high-risk gaps blocking audit readiness",
            "items": [
                {
                    "action": g["recommended_action"] or f"Remediate {g['policy_title']}",
                    "policy_id": g["policy_id"],
                    "priority": g["priority"],
                }
                for g in (p0 + p1)[:8]
            ],
        },
        "phase_2_structural": {
            "timeline": "30–90 days",
            "focus": "Partial compliance gaps and policy language hardening",
            "items": [
                {
                    "action": g["recommended_action"] or f"Strengthen {g['policy_title']}",
                    "policy_id": g["policy_id"],
                    "priority": g["priority"],
                }
                for g in gap_matrix if g["priority"] == "P2"
            ][:6],
        },
        "phase_3_optimization": {
            "timeline": "90+ days",
            "focus": "Continuous compliance monitoring and policy lifecycle",
            "items": [
                "Schedule quarterly re-analysis with AlignIQ drift detection",
                "Establish policy owner attestations per department",
                "Integrate remediation roadmap with engineering ticketing",
            ],
        },
    }

    framework_coverage = _framework_coverage(report, mappings)

    dept_exposure: dict[str, dict] = {}
    for pol in report:
        dept = pol.get("master_policy_details", {}).get("department", "Unknown")
        if dept not in dept_exposure:
            dept_exposure[dept] = {"policies": 0, "gaps": 0, "risk_score": 0}
        dept_exposure[dept]["policies"] += 1
        for req in pol.get("requirements", []):
            if req.get("status") != "Satisfied":
                dept_exposure[dept]["gaps"] += 1
                dept_exposure[dept]["risk_score"] += req.get("risk_score", 0)

    executive_briefing = _build_executive_briefing(
        company_meta.get("company_name", "the organization"),
        compliance_score,
        audit_readiness,
        gap_count,
        not_satisfied,
        cost_savings_usd,
        time_savings_hours,
        framework_coverage,
    )

    return {
        "deliverable_type": "AlignIQ Consulting Replacement Report",
        "company_name": company_meta.get("company_name", "Unknown Company"),
        "generated_for": "Executive & Audit Stakeholders",
        "compliance_score": compliance_score,
        "audit_readiness_score": audit_readiness,
        "summary": {
            "policies_analyzed": total_policies,
            "requirements_evaluated": total_reqs,
            "satisfied": satisfied,
            "partially_satisfied": partial,
            "not_satisfied": not_satisfied,
            "total_gaps": gap_count,
        },
        "consulting_replacement": {
            "traditional_consulting_hours": round(traditional_hours, 1),
            "traditional_consulting_cost_usd": traditional_cost,
            "aligniq_analysis_time_minutes": ALIGNIQ_ANALYSIS_MINUTES,
            "aligniq_equivalent_cost_usd": aligniq_cost,
            "cost_savings_usd": cost_savings_usd,
            "time_savings_hours": time_savings_hours,
            "hourly_rate_benchmark_usd": CONSULTING_HOURLY_RATE_USD,
            "value_proposition": (
                f"AlignIQ delivered a {total_reqs}-requirement compliance assessment in "
                f"~{ALIGNIQ_ANALYSIS_MINUTES} minutes — work that typically requires "
                f"{round(traditional_hours)} consultant-hours (${traditional_cost:,} at "
                f"${CONSULTING_HOURLY_RATE_USD}/hr Big-4 rates)."
            ),
        },
        "extraction_quality": extraction_metadata,
        "framework_coverage": framework_coverage,
        "gap_priority_matrix": gap_matrix[:25],
        "gap_summary_by_priority": {
            "P0_critical": len(p0),
            "P1_high": len(p1),
            "P2_medium": len([g for g in gap_matrix if g["priority"] == "P2"]),
            "P3_low": len([g for g in gap_matrix if g["priority"] == "P3"]),
            "priority_definitions": {
                "P0": "Critical — Not Satisfied + High/Critical risk. Requires immediate action.",
                "P1": "High — Not Satisfied (any risk) or Partially Satisfied + High/Critical risk.",
                "P2": "Medium — Partially Satisfied with moderate risk, or high risk score.",
                "P3": "Low — Minor gaps that can be addressed in normal planning cycles.",
            },
        },
        "departmental_risk_exposure": dept_exposure,
        "remediation_roadmap": remediation_roadmap,
        "executive_briefing": executive_briefing,
        "auditor_deliverables_included": [
            "Requirement-level gap analysis with evidence citations",
            "SOC 2 / ISO 27001 / NIST CSF control mapping",
            "Risk-weighted priority matrix (P0–P3)",
            "Phased remediation roadmap",
            "Departmental risk exposure breakdown",
            "Board-ready executive briefing",
        ],
    }


def _build_executive_briefing(
    company: str,
    compliance_score: int,
    audit_readiness: int,
    gap_count: int,
    critical_gaps: int,
    savings_usd: int,
    hours_saved: float,
    framework_coverage: dict,
) -> dict:
    posture = "strong" if compliance_score >= 80 else "moderate" if compliance_score >= 60 else "at risk"

    soc2 = framework_coverage.get("SOC2", {})
    iso = framework_coverage.get("ISO27001", {})

    return {
        "headline": f"{company} — Compliance Posture: {posture.title()} ({compliance_score}% aligned)",
        "situation": (
            f"AlignIQ analyzed internal policy documents against {soc2.get('controls_in_scope', 0)} "
            f"SOC 2 controls and {iso.get('controls_in_scope', 0)} ISO 27001 controls. "
            f"Current audit readiness is estimated at {audit_readiness}%."
        ),
        "key_findings": [
            f"{gap_count} compliance gaps identified across evaluated policies",
            f"{critical_gaps} requirements are fully non-compliant and require immediate remediation",
            f"SOC 2 coverage: {soc2.get('coverage_pct', 0)}% | ISO 27001 coverage: {iso.get('coverage_pct', 0)}%",
        ],
        "business_impact": (
            f"Unaddressed gaps expose {company} to audit findings, regulatory scrutiny, and "
            f"operational risk. Remediation should prioritize P0/P1 items before external audit cycles."
        ),
        "aligniq_advantage": (
            f"This assessment replaces an estimated {hours_saved} hours of external consulting "
            f"(~${savings_usd:,} saved). Every finding is evidence-linked to extracted policy text — "
            f"eliminating the 2–4 week turnaround typical of compliance consulting engagements."
        ),
        "recommended_next_steps": [
            "Review P0 critical gaps and assign accountable owners within 48 hours",
            "Deploy AlignIQ Auto-Fix to generate compliant policy language drafts",
            "Run Deep Audit on highest-risk policies for legal loophole analysis",
            "Export board-ready PDF report for leadership review",
        ],
    }
