# Agent Skills Registry

This registry is durable project memory for KireiApp agent skills and workflow tools. It records what is installed, what is deferred, and the guardrails that keep tooling from expanding the frozen v1 product scope.

## Default Policy

- Use the smallest relevant set of skills for each task.
- Do not use every skill for every task.
- Prefer KireiApp docs and source-of-truth plans over generated tool suggestions.
- Treat workflow tools as advisory helpers, not product authorities.
- Never let design, prototype, graph, browser, or observability tools add PRD v1 scope.
- Use full command output for security, debugging, and audit work when detail matters.

## KireiApp V1 Guardrails

- PRD v1 is frozen.
- No authenticated Customer v1.
- Member remains self-only.
- LATE is derived-only and is not stored in the database.
- ALPHA correction is not from tracker.
- Access Manager UI is out of scope v1.
- Hard delete worker UI is out of scope v1.
- Future scheduling is out of scope v1.
- Customer account features are out of scope v1.

## Skills And Tools

| Name | Source | Status | Scope | Primary use case | Use when | Do not use when | KireiApp guardrails | Overlap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Graphify | https://github.com/safishamsi/graphify | Installed / active | Global Codex skill + uv tool | Repo-doc-schema relationship mapping | Mapping PRD, plans, code, schema, and dependency relationships | Making product decisions by itself, changing hooks, pushing to Neo4j, or running watch mode without approval | Graph output is analysis only; it must not create new v1 requirements | Complements `rg`, planning, security review, and debugging |
| Impeccable | https://github.com/pbakaus/impeccable | Already installed | Local agent skill | Frontend critique, polish, UX hardening | Reviewing or polishing existing UI against `DESIGN.md` and v1 constraints | Inventing new UI surfaces or redesigning frozen product scope | Must preserve landing/admin distinction and frozen v1 features | Overlaps with `frontend-design`, `emil-design-eng`, `web-design-guidelines` |
| RTK | https://github.com/rtk-ai/rtk | Deferred | Manual/global later | Command output compression | Long routine command sessions where compact output is acceptable | Security review, debugging, audit, or any high-fidelity command-output inspection | Do not hide evidence needed to verify auth, RLS, scope, or state-machine behavior | Overlaps with disciplined shell usage |
| CodeBurn | https://github.com/getagentseal/codeburn | Deferred | Manual/global later | Token, cost, and session observability | Budget or usage review across agent sessions | Deciding code correctness or product scope | Observability only; not a coding authority | Low overlap with existing skills |
| Design-extract | https://github.com/Manavarya09/design-extract | Deferred / gated | Manual/global later | Controlled design-system extraction and audit | Auditing an external reference or live KireiApp visual system under explicit scope | Cloning, remixing, theme-swapping, applying tokens, or uncontrolled redesign | No external extraction may override KireiApp PRD or `DESIGN.md` | Overlaps with Impeccable and frontend-design |
| Open Design | https://github.com/nexu-io/open-design | Skipped / gated for v1 | Manual app/MCP later | Broad design, prototype, deck, media generation | Future design exploration outside v1 implementation | Current v1 product delivery or source-of-truth decisions | Too broad for frozen v1; manual approval required | Overlaps with Impeccable, frontend-design, Presentations |
| Browser Harness | https://github.com/browser-use/browser-harness | Skipped / gated for v1 | Manual/global later | Self-healing real-browser automation | Explicit local-only browser QA with non-destructive flows | Production sessions, secret-bearing flows, unattended destructive actions, or helper-file generation in repo | Existing Browser and Playwright tooling should be preferred for v1 | Overlaps with Browser plugin, `webapp-testing`, Vercel browser skills |

## Existing Local Skills

| Skill | Primary routing |
| --- | --- |
| `brainstorming` | Scope shaping and design exploration before changes |
| `writing-plans` | Detailed implementation plans from approved specs |
| `executing-plans` | Executing written plans with checkpoints |
| `requesting-code-review` | Review before merge or after meaningful task completion |
| `security-review` | Auth, authorization, RLS, injection, supply-chain, and sensitive-flow review |
| `systematic-debugging` | Root-cause investigation for failures and unexpected behavior |
| `test-driven-development` | Feature or bugfix implementation with failing tests first |
| `supabase` | Any Supabase Auth, RLS, database, CLI, MCP, storage, or realtime work |
| `supabase-postgres-best-practices` | Postgres performance and Supabase database optimization |
| `postgresql-table-design` | PostgreSQL schema design and review |
| `postgresql-code-review` | PostgreSQL-specific SQL and migration review |
| `next-best-practices` | Next.js conventions, routing, RSC, and async API checks |
| `vercel-react-best-practices` | React and Next.js performance review |
| `shadcn` / `vercel:shadcn` | shadcn component usage, registry docs, and composition patterns |
| `frontend-design` | New frontend UI work after approved scope |
| `impeccable` | UI critique, polish, hardening, and design-system refinement |
| `emil-design-eng` | Motion and interaction polish review |
| `web-design-guidelines` | Web UI and accessibility guideline review |
| `webapp-testing` | Playwright-based local app QA |
| `find-skills` | Skill discovery and install-command verification |

## Recommended Routing

| Work type | Use first | Optional support | Notes |
| --- | --- | --- | --- |
| PRD/scope analysis | `brainstorming`, `writing-plans` | Graphify, `find-skills` | Always start from PRD and `docs/plans/*`; Graphify may map relationships but cannot alter scope |
| Supabase/database | `supabase` | `postgresql-table-design`, `postgresql-code-review`, `supabase-postgres-best-practices`, `security-review`, Graphify | Preserve RLS, service-role, Member self-only, and derived status rules |
| Next.js/React | `next-best-practices` | `vercel-react-best-practices`, `shadcn`, `test-driven-development` | Read current Next docs before code changes as required by `AGENTS.md` |
| UI/design polish | `impeccable` | `emil-design-eng`, `web-design-guidelines`, `frontend-design`, `shadcn` | Polish existing scoped surfaces; do not add new product surfaces |
| Browser QA | Browser plugin or `webapp-testing` | Graphify for context mapping | Browser Harness remains gated and is not default v1 QA |
| Security review | `security-review` | `supabase`, PostgreSQL skills, full command output | Avoid RTK compression for high-fidelity review unless explicitly accepted |
| Token/cost observability | Manual CodeBurn later | RTK later for low-risk command compression | Deferred until cost observability becomes necessary |

## Graphify Usage Notes

- Installed package: `graphifyy`.
- Installed command: `graphify`.
- Codex global skill path: `~/.codex/skills/graphify/SKILL.md`.
- Default generated artifact directory: `graphify-out/`.
- Use Graphify for context mapping, dependency exploration, PRD-to-code relationship checks, and focused architecture questions.
- Do not install Graphify project hooks or project-scoped skill files without explicit approval.
- Do not commit generated `graphify-out/` artifacts unless a future task explicitly asks for a graph artifact.

## Graphify Baseline Notes

First baseline run: `graphify extract .` stopped safely because docs and images require an LLM API key for semantic extraction. Use `graphify update .` for safe no-key structural audits when the goal is code relationship mapping.

Baseline shape: 144 files, about 113,186 words, 1,496 nodes, 2,368 links, and 101 communities. No import cycles were detected.

Graphify was useful for larger audits and relationship tracing, especially tracker/RPC/auth/component mapping:

- `applyTrackerAction()` calls `getCurrentStaffUser()`.
- `applyTrackerAction()` calls `mapTrackerRpcError()`.
- `applyAbsensiCorrection()` calls `applyAbsensiCorrectionMutation()`.
- `computeWorkerDisplayStatus()` connects through `helpers.ts` to `workerStatusDisplayLabels`.

Do not run Graphify by default for every small change. Use it when repeated context reads, cross-file tracing, or scope-risk review would cost more than refreshing the graph.

Generated output stays local under ignored `graphify-out/`. Do not commit graph output unless a future task explicitly requests a graph artifact.

Community labels are generic without LLM semantic extraction, and legacy planning docs can dominate top communities. Always prioritize the current PRD, freeze checklist, state-machine truth table, auth/RLS matrix, release-sliced plan, and repo source over generated graph suggestions.
