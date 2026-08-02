#!/usr/bin/env python3
"""Read-only Git branch ancestry and scope audit."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


def git(*args: str, check: bool = True) -> str:
    proc = subprocess.run(
        ["git", *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    if check and proc.returncode:
        raise RuntimeError(proc.stderr.strip() or "git command failed")
    return proc.stdout.strip()


def resolve(ref: str) -> str:
    return git("rev-parse", "--verify", f"{ref}^{{commit}}")


def commits(revision: str, limit: int) -> list[dict[str, str]]:
    raw = git("log", f"--max-count={limit}", "--format=%H%x09%h%x09%s", revision)
    result = []
    for line in raw.splitlines():
        full, short, subject = line.split("\t", 2)
        result.append({"commit": full, "short": short, "subject": subject})
    return result


def changed_files(revision: str) -> list[dict[str, str]]:
    raw = git("diff", "--name-status", revision)
    result = []
    for line in raw.splitlines():
        parts = line.split("\t")
        if not parts:
            continue
        item = {"status": parts[0], "path": parts[-1]}
        if len(parts) == 3:
            item["old_path"] = parts[1]
        result.append(item)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--target", help="Defaults to the current branch")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    args = parser.parse_args()

    try:
        git("rev-parse", "--show-toplevel")
        target_name = args.target or git("branch", "--show-current")
        if not target_name:
            raise RuntimeError("detached HEAD: pass --target explicitly")
        target = resolve(target_name)
        source = resolve(args.source)
        base = git("merge-base", target, source)
        report = {
            "target": {"name": target_name, "commit": target},
            "source": {"name": args.source, "commit": source},
            "merge_base": base,
            "source_unique_commits": commits(f"{target}..{source}", args.limit),
            "target_unique_commits": commits(f"{source}..{target}", args.limit),
            "source_changed_files": changed_files(f"{base}..{source}"),
            "target_changed_files": changed_files(f"{base}..{target}"),
            "working_tree_changes": git("status", "--short").splitlines(),
        }
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0

    print("# Merge audit")
    print(f"\n- Target: `{target_name}` (`{target[:12]}`)")
    print(f"- Source: `{args.source}` (`{source[:12]}`)")
    print(f"- Merge base: `{base[:12]}`")
    print(f"- Source-only commits: {len(report['source_unique_commits'])}")
    print(f"- Target-only commits: {len(report['target_unique_commits'])}")
    print(f"- Dirty working-tree entries: {len(report['working_tree_changes'])}")
    for title, key in (
        ("Source-only commits", "source_unique_commits"),
        ("Target-only commits", "target_unique_commits"),
    ):
        print(f"\n## {title}\n")
        rows = report[key]
        if not rows:
            print("None")
        for row in rows:
            print(f"- `{row['short']}` {row['subject']}")
    print("\n## Changed path counts\n")
    print(f"- Merge base to source: {len(report['source_changed_files'])}")
    print(f"- Merge base to target: {len(report['target_changed_files'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
