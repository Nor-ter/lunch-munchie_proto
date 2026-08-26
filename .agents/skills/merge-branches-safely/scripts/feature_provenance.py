#!/usr/bin/env python3
"""Classify declared feature paths across target, source, and merge result."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

MISSING = "<missing>"
VALIDATION_STATUSES = {"passed", "failed", "not_run", "user_confirmed"}


def git(*args: str, check: bool = True) -> str:
    proc = subprocess.run(
        ["git", *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    if check and proc.returncode:
        raise RuntimeError(proc.stderr.strip() or "git command failed")
    return proc.stdout.strip()


def resolve(ref: str) -> str:
    return git("rev-parse", "--verify", f"{ref}^{{commit}}")


def object_at(ref: str, path: str) -> str:
    proc = subprocess.run(
        ["git", "rev-parse", "--verify", f"{ref}:{path}"],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    return proc.stdout.strip() if proc.returncode == 0 else MISSING


def path_commits(revision: str, paths: list[str], limit: int = 8) -> list[str]:
    raw = git("log", f"--max-count={limit}", "--format=%h %s", revision, "--", *paths)
    return raw.splitlines() if raw else []


def classify(
    intent: str,
    base_state: tuple[str, ...],
    target_state: tuple[str, ...],
    source_state: tuple[str, ...],
    result_state: tuple[str, ...],
    origin_state: tuple[str, ...] | None,
) -> tuple[str, str, str]:
    if result_state == base_state == target_state == source_state:
        return "ALREADY_COMMON", "All four snapshots match", "HIGH"

    if intent == "retain" and result_state != target_state:
        return (
            "UNKNOWN",
            "Protected behavior shares changed paths; inspect symbols or run its validation",
            "LOW",
        )

    if result_state == target_state and source_state != target_state:
        if intent == "import" and target_state == base_state:
            return "EXCLUDED_SOURCE", "Source change is absent; result matches target-before", "HIGH"
        return "RETAINED_TARGET", "Result matches target-before instead of source", "HIGH"

    if result_state == source_state and target_state != source_state:
        if origin_state is not None and origin_state == source_state:
            return "IMPORTED_TRANSITIVE", "Source state already existed at origin_ref", "HIGH"
        if origin_state is not None:
            return "IMPORTED_DIRECT", "Source changed after origin_ref", "HIGH"
        return "IMPORTED_DIRECT", "Result matches source; no earlier origin_ref was declared", "MEDIUM"

    if result_state != target_state and result_state != source_state:
        if intent == "combine":
            return "COMBINED", "Result differs from both sides as requested", "MEDIUM"
        return "UNKNOWN", "Result differs from both sides; semantic inspection is required", "LOW"

    if target_state == source_state == result_state:
        return "ALREADY_COMMON", "Target, source, and result match", "HIGH"

    return "UNKNOWN", "Path relationships do not prove feature behavior", "LOW"


def inspect_behavior_contract(feature: dict[str, Any]) -> dict[str, Any]:
    acceptance = feature.get("acceptance")
    validation = feature.get("validation")
    missing: list[str] = []

    if not isinstance(acceptance, dict):
        acceptance = {}
        missing.append("acceptance")
    if not isinstance(acceptance.get("entrypoint"), str) or not acceptance.get("entrypoint", "").strip():
        missing.append("acceptance.entrypoint")
    for field in ("preconditions", "actions", "observables", "edge_cases"):
        value = acceptance.get(field)
        if not isinstance(value, list) or not value or not all(
            isinstance(item, str) and item.strip() for item in value
        ):
            missing.append(f"acceptance.{field}")

    if not isinstance(validation, dict):
        validation = {}
        missing.append("validation")
    validation_status = validation.get("status")
    if validation_status not in VALIDATION_STATUSES:
        missing.append("validation.status")
        validation_status = "not_run"
    evidence = validation.get("evidence")
    if not isinstance(evidence, list) or not all(
        isinstance(item, str) and item.strip() for item in evidence
    ):
        missing.append("validation.evidence")
        evidence = []
    if validation_status in {"passed", "failed", "user_confirmed"} and not evidence:
        missing.append("validation.evidence(non-empty)")

    semantic_status = {
        "passed": "VERIFIED",
        "failed": "FAILED",
        "user_confirmed": "USER_CONFIRMED",
        "not_run": "NOT_VERIFIED",
    }[validation_status]
    if missing:
        semantic_status = "NOT_VERIFIED"

    return {
        "contract_complete": not missing,
        "missing_fields": missing,
        "validation_status": validation_status,
        "semantic_status": semantic_status,
        "validation_evidence": evidence,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-before", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--result", default="HEAD")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument(
        "--require-behavior-contract",
        action="store_true",
        help="Fail when a feature lacks a complete acceptance and validation contract",
    )
    parser.add_argument(
        "--require-passed-validation",
        action="store_true",
        help="Fail unless every feature has passed or user-confirmed result-level evidence",
    )
    args = parser.parse_args()

    try:
        target = resolve(args.target_before)
        source = resolve(args.source)
        result = resolve(args.result)
        base = git("merge-base", target, source)
        manifest: dict[str, Any] = json.loads(args.manifest.read_text())
        features = manifest.get("features")
        if not isinstance(features, list) or not features:
            raise RuntimeError("manifest must contain a non-empty features array")

        rows = []
        for feature in features:
            name = feature.get("name")
            intent = feature.get("intent")
            paths = feature.get("paths")
            if not name or intent not in {"import", "retain", "combine"}:
                raise RuntimeError(f"invalid feature name or intent: {feature!r}")
            if not isinstance(paths, list) or not paths or not all(isinstance(p, str) for p in paths):
                raise RuntimeError(f"feature {name!r} requires repository-relative paths")
            origin_name = feature.get("origin_ref")
            origin = resolve(origin_name) if origin_name else None
            states = {
                "merge_base": tuple(object_at(base, path) for path in paths),
                "target_before": tuple(object_at(target, path) for path in paths),
                "source": tuple(object_at(source, path) for path in paths),
                "result": tuple(object_at(result, path) for path in paths),
            }
            origin_state = tuple(object_at(origin, path) for path in paths) if origin else None
            label, evidence, confidence = classify(
                intent,
                states["merge_base"],
                states["target_before"],
                states["source"],
                states["result"],
                origin_state,
            )
            behavior = inspect_behavior_contract(feature)
            git_classification = label
            git_confidence = confidence
            if behavior["validation_status"] == "failed" and behavior["contract_complete"]:
                label = "REGRESSED"
                evidence = "Feature-level behavior validation failed on the result"
                confidence = "HIGH"
            elif behavior["semantic_status"] == "NOT_VERIFIED":
                confidence = "LOW"
            elif behavior["semantic_status"] == "USER_CONFIRMED" and confidence == "HIGH":
                confidence = "MEDIUM"
            rows.append(
                {
                    "feature": name,
                    "intent": intent,
                    "classification": label,
                    "git_classification": git_classification,
                    "origin_ref": origin_name,
                    "paths": paths,
                    "evidence": evidence,
                    "confidence": confidence,
                    "git_confidence": git_confidence,
                    **behavior,
                    "source_commits": path_commits(f"{base}..{source}", paths),
                    "result_commits": path_commits(f"{target}..{result}", paths),
                    "states": states,
                }
            )
        behavior_contracts_passed = all(row["contract_complete"] for row in rows)
        behavior_validations_passed = all(
            row["semantic_status"] in {"VERIFIED", "USER_CONFIRMED"}
            for row in rows
        )
        gate_passed = (
            (not args.require_behavior_contract or behavior_contracts_passed)
            and (not args.require_passed_validation or behavior_validations_passed)
        )
        report = {
            "merge_base": base,
            "target_before": target,
            "source": source,
            "result": result,
            "features": rows,
            "behavior_contracts_passed": behavior_contracts_passed,
            "behavior_validations_passed": behavior_validations_passed,
            "gate_passed": gate_passed,
        }
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0 if gate_passed else 1

    print("# Feature provenance report\n")
    print(f"- Merge base: `{base[:12]}`")
    print(f"- Target-before: `{target[:12]}`")
    print(f"- Source: `{source[:12]}`")
    print(f"- Result: `{result[:12]}`\n")
    print("| Feature | Intent | Classification | Origin | Git confidence | Behavior | Confidence | Evidence |")
    print("|---|---|---|---|---|---|---|---|")
    for row in rows:
        origin = row["origin_ref"] or "source"
        evidence_parts = [row["evidence"]]
        if row["validation_evidence"]:
            evidence_parts.append(
                "validation: " + "; ".join(row["validation_evidence"])
            )
        evidence = "; ".join(evidence_parts).replace("|", "\\|")
        print(
            f"| {row['feature']} | {row['intent']} | {row['classification']} | "
            f"{origin} | {row['git_confidence']} | {row['semantic_status']} | "
            f"{row['confidence']} | {evidence} |"
        )
    print("\nAutomated Git labels remain tentative until behavior is VERIFIED or USER_CONFIRMED.")
    if not behavior_contracts_passed:
        contract_mark = "FAIL" if args.require_behavior_contract or args.require_passed_validation else "NOTICE"
        print(f"- {contract_mark}: one or more features lack a complete behavior contract")
        for row in rows:
            if row["missing_fields"]:
                print(f"  - {row['feature']}: {', '.join(row['missing_fields'])}")
    if not behavior_validations_passed:
        validation_mark = "FAIL" if args.require_passed_validation else "NOTICE"
        print(f"- {validation_mark}: one or more result-level feature validations are not passed")
    return 0 if gate_passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
