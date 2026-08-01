# Unified serving contract — Lunchie ↔ Munchie

## Non-negotiable invariants

1. **One canonical candidate pipeline.** All Lunchie, group, and Munchie rankers call the same server-side eligibility and feature-scoring boundary. A client never recomputes or substitutes a candidate slate.
2. **Hard constraints before ranking.** Availability, distance, budget, and the union of group hard dietary restrictions remove candidates before any score is calculated. A ranker cannot override a veto.
3. **Slates are immutable evidence.** Each response has `slate_id`, ordered `candidate_ids`, `policy_version`, `context_snapshot`, and per-item inclusion propensity. Votes reference that slate; retries are idempotent.
4. **Personal and group objectives are different.** A personal slate maximises expected fit plus exploration. A group slate maximises the minimum eligible member fit, then aggregate fit and diversity. It is generated once after the participant snapshot is closed and is shared verbatim.
5. **Munchie signal isolation.** Feed open/like/save can update taste affinity only. It may not update visit-derived satiation, personal transition history, or an inferred physical visit.
6. **A winner is not a visit.** `WINNER` is an intent signal; `VISIT` requires an explicit confirmation or approved location evidence. Chain learning uses only `VISIT` and public course order.

## Canonical pipeline

```text
request + identity + context
  -> eligibility (hard vetoes)
  -> feature snapshot (versioned)
  -> policy score / Thompson sample
  -> diversity-aware sampling (with inclusion propensity)
  -> immutable slate record
  -> impression / action events (idempotent)
  -> signal router
     -> taste posterior              [Lunchie + Munchie]
     -> exposure/satiation           [Lunchie/visit only]
     -> personal chain P_u           [VISIT only]
     -> global chain prior P_0       [public course order only]
```

## Serving modes

| Mode | Objective | Candidate ownership | Learning writes |
|---|---|---|---|
| Personal Lunchie | Thompson fit + context + novelty | server-generated per user | impression, swipe, winner, visit |
| Group Lunchie | hard-veto → least-misery → aggregate fit → diversity | one server slate per session generation | each member’s impression/swipe; group winner as intent |
| Munchie feed | course relevance + diversity | server-generated per user | open/like/save only to taste |
| Munchie next stop | fit + `P_u/P_0` chain fit + geography | server-generated per user | confirmed visit only to `P_u` |

## Group decision contract

1. The lobby accepts a bounded preference snapshot and hard restrictions from each participant.
2. On host start, the server closes the participant snapshot, creates generation `g=1`, and stores the ordered shared slate.
3. Every client receives exactly those IDs. Missing catalogue data is a retriable API error, never a local re-rank.
4. Preliminary votes compute least-misery eligibility. Finalists are the two highest eligible candidates.
5. Final voting chooses candidate A, candidate B, or reject. Reject creates a new server generation with all rejected/majority-vetoed IDs excluded.
6. All transitions are idempotent and authorized; only the host may force a timeout transition.

## Required durable records

- `recommendation_slates`: id, owner/session, generation, mode, policy/feature version, context JSON, ordered IDs, propensities, created/expiry times.
- `rec_events`: immutable action facts with a client idempotency key; no derived state is the source of truth.
- `session_members`: frozen preference snapshot and restrictions for the active generation.
- `sessions`: status, generation, active slate id, finalists, decision revision, deadline.

## Rollout order

1. Make `/api/recommend` delegate to `server/engine` and persist a slate record.
2. Make group creation/start use that same eligibility and group policy; remove the duplicate inline group scorer.
3. Route all client actions through one event endpoint and enforce event-type access rules.
4. Add replay fixtures: a recorded slate plus events must reproduce the result exactly.
5. Only then enable model/feature version changes and offline evaluation.
