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

| Name | Source | Status | Scope | Install command used or reason skipped | Primary use | When to use | When not to use | KireiApp guardrails | Risks and overlap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Graphify | https://github.com/safishamsi/graphify | Installed / active | Global Codex skill + uv tool | Existing install: `uv tool install graphifyy`; `graphify install --platform codex` | Repo-doc-schema relationship mapping | Larger audits, relationship tracing, PRD-to-code checks, tracker/RPC/auth/component mapping | Small changes where `rg` and direct reads are faster; product decisions by itself; Neo4j push or watch mode without approval | Graph output is analysis only; it must not create new v1 requirements | Local graph can be stale or noisy; complements `rg`, planning, security review, and debugging |
| RTK | https://github.com/rtk-ai/rtk | Installed / restricted | Global Homebrew CLI + Codex global instructions | `brew install rtk`; `rtk init -g --codex` | Token-saving command output compression | Long, routine command sessions where compact output is acceptable | Security review, RLS audit, migration debugging, failing tests, build errors, or any high-fidelity command-output inspection | Do not hide evidence needed to verify auth, RLS, scope, or state-machine behavior | Can obscure detail; overlaps with disciplined shell usage and must be opt-in for audits |
| CodeBurn | https://github.com/getagentseal/codeburn | Installed / active | Global npm CLI | `npm install -g codeburn` | Token, cost, and session observability | Budget review, usage review, model/task cost summaries | Deciding code correctness, architecture, product scope, or security risk | Observability only; not a coding authority | Reads local agent session metadata; low functional overlap with existing skills |
| Caveman suite | https://github.com/JuliusBrussee/caveman | Installed / active but selective | Global Codex skills in `~/.agents/skills` | `npx -y skills add JuliusBrussee/caveman -a codex -g -y` | Concise/token-saving communication | Short status updates, commit summaries, diff summaries, lightweight reports | PRD interpretation, security review, Supabase/RLS review, state-machine reasoning, migration review, or complex debugging | Must not compress away v1 guardrails or acceptance criteria | Installed skills include `caveman-compress`, which installer flagged High Risk; use only on low-risk communication tasks |
| Design-extract | https://github.com/Manavarya09/design-extract | Installed / gated | Global npm CLI + global Codex skill `extract-design` | `npm i -g designlang`; `npx -y skills add Manavarya09/design-extract -a codex -g -y` | Controlled website design extraction and audit | Explicit UI/design audits, external-reference analysis, design-system comparison, WCAG/design report review | Uncontrolled redesign, cloning external designs into KireiApp, `apply`, `clone`, token application, theme swap, or PRD expansion | External designs never override KireiApp PRD, `DESIGN.md`, or frozen v1 surfaces | Uses browser automation and may write `design-extract-output/`; overlaps with Impeccable and `frontend-design` |
| Open Design | https://github.com/nexu-io/open-design | Skipped / gated | Manual app/MCP later | Skipped because the documented `curl -fsSL https://open-design.ai/install.sh \| sh -s codex` returned HTML and failed as shell on 2026-06-08 | Broad design, prototype, deck, media generation | Future manual design exploration outside v1 implementation | Current v1 delivery, source-of-truth decisions, or automatic repo mutation | Too broad for frozen v1; manual approval required before any retry | Broad MCP/app surface; overlaps with Impeccable, `frontend-design`, and Presentations |
| Browser Harness | https://github.com/browser-use/browser-harness | Installed / gated | Global uv tool + Codex skill symlink | `git clone` to `~/Developer/browser-harness`; `uv tool install -e .`; symlink `SKILL.md` to `~/.codex/skills/browser-harness/SKILL.md` | Self-healing real-browser automation | Explicit local-only browser QA with non-destructive flows | Production sessions, secret-bearing flows, unattended destructive actions, or uncontrolled helper-file generation in KireiApp | Existing Browser plugin and `webapp-testing` remain preferred for v1; use only with local safe targets | Can attach to real Chrome and inherited sessions; overlaps with Browser plugin, `webapp-testing`, and Vercel browser skills |
| Impeccable | https://github.com/pbakaus/impeccable | Already installed | Local agent skill in `~/.agents/skills` | Verified existing `~/.agents/skills/impeccable/SKILL.md`; not reinstalled | Frontend critique, polish, UX hardening | Reviewing or polishing existing UI against `DESIGN.md` and v1 constraints | Inventing new UI surfaces or redesigning frozen product scope | Must preserve landing/admin distinction and frozen v1 features | Overlaps with `frontend-design`, `emil-design-eng`, and `web-design-guidelines` |

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
| `caveman` / Caveman suite | Concise, low-risk status and summary responses |
| `extract-design` | Gated design extraction and external-reference audit |
| `browser-harness` | Gated local browser QA through real-browser CDP harness |

## Recommended Routing

| Work type | Use first | Optional support | Notes |
| --- | --- | --- | --- |
| PRD/scope analysis | `brainstorming`, `writing-plans` | Graphify, `find-skills` | Always start from PRD and `docs/plans/*`; Graphify may map relationships but cannot alter scope |
| Supabase/database | `supabase` | `postgresql-table-design`, `postgresql-code-review`, `supabase-postgres-best-practices`, `security-review`, Graphify | Preserve RLS, service-role, Member self-only, and derived status rules |
| Next.js/React | `next-best-practices` | `vercel-react-best-practices`, `shadcn`, `test-driven-development` | Read current Next docs before code changes as required by `AGENTS.md` |
| UI/design polish | `impeccable` | `emil-design-eng`, `web-design-guidelines`, `frontend-design`, `shadcn`, gated `extract-design` | Polish existing scoped surfaces; do not add new product surfaces |
| Browser QA | Browser plugin or `webapp-testing` | Gated Browser Harness, Graphify for context mapping | Browser Harness is local-only and must avoid production, real secrets, and destructive flows |
| Security review | `security-review` | `supabase`, PostgreSQL skills, full command output | Do not use RTK or Caveman compression for high-fidelity review unless explicitly accepted |
| Token/cost observability | CodeBurn | RTK for low-risk command compression, Caveman for short summaries | CodeBurn observes usage only; RTK and Caveman must not hide audit evidence |
| Concise reporting | Caveman suite | CodeBurn stats when relevant | Use only for short status, commit summaries, diff summaries, and lightweight reports |

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
