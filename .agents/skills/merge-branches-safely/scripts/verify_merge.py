#!/usr/bin/env python3
"""Verify merge topology and repository conflict state without changing it."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys


def git(*args: str, check: bool = True) -> str:
    proc = subprocess.run(
        ["git", *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    if check and proc.returncode:
        raise RuntimeError(proc.stderr.strip() or "git command failed")
    return proc.stdout.strip()


def resolve(ref: str) -> str:
    return git("rev-parse", "--verify", f"{ref}^{{commit}}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--merge-commit", default="HEAD")
    parser.add_argument("--expected-target-parent")
    parser.add_argument("--expected-source-parent")
    parser.add_argument("--require-clean", action="store_true")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    args = parser.parse_args()

    try:
        merge_commit = resolve(args.merge_commit)
        parent_line = git("rev-list", "--parents", "-n", "1", merge_commit).split()
        parents = parent_line[1:]
        checks = []
        checks.append({"name": "two-parent merge commit", "passed": len(parents) == 2})
        if args.expected_target_parent:
            expected = resolve(args.expected_target_parent)
            checks.append(
                {"name": "target-before is parent 1", "passed": len(parents) > 0 and parents[0] == expected}
            )
        if args.expected_source_parent:
            expected = resolve(args.expected_source_parent)
            checks.append(
                {"name": "source is parent 2", "passed": len(parents) > 1 and parents[1] == expected}
            )
        unmerged = git("diff", "--name-only", "--diff-filter=U").splitlines()
        checks.append({"name": "no unresolved conflict entries", "passed": not unmerged})
        if args.require_clean:
            checks.append({"name": "working tree is clean", "passed": not git("status", "--porcelain")})
        report = {
            "merge_commit": merge_commit,
            "parents": parents,
            "checks": checks,
            "passed": all(check["passed"] for check in checks),
        }
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.format == "json":
        print(json.dumps(report, indent=2))
    else:
        print("# Merge verification\n")
        print(f"- Commit: `{merge_commit[:12]}`")
        print(f"- Parents: {', '.join(f'`{p[:12]}`' for p in parents) or 'none'}\n")
        for check in checks:
            mark = "PASS" if check["passed"] else "FAIL"
            print(f"- {mark}: {check['name']}")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
