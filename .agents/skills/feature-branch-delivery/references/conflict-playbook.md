# Conflict playbook

1. Record target, source, merge base, and conflicted paths.
2. Read both changes, tests, the feature manifest, and relevant migrations.
3. Classify each change: retained target, imported source, combined, or excluded.
4. Resolve the smallest semantic unit and run focused validation.

| Conflict | Resolve by | Verify |
| --- | --- | --- |
| UI | Intended user flow, not line count | Changed visual flow/tests |
| API/type | Producer and consumer contract together | Type and endpoint tests |
| D1 | Existing migration history plus a forward migration | Fresh local migration |
| Test | Required behavior, not obsolete implementation | Test explains behavior |
| Config/secret | Templates only; never credentials | Secret scan |

Escalate if branches implement incompatible product choices, data loss is possible, or destructive recovery is required.
