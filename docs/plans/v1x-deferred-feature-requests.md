# V1.x Deferred Feature Requests

## Status

Tracked ideas and requests that are explicitly **out of scope for KireiApp PRD v1**.
These are preserved here for direct implementation in v1.x or v2.

---

## Records Override — Delta/Cumulative Adjustment

**Request Summary:**
Change the Records Manual Override architecture from an **Absolute Lock** model to a **Delta/Cumulative Adjustment** model.

**Current Behavior (V1 Absolute Lock):**
When an Admin/Owner sets a manual override on a record field (e.g., `alpha_override_count = 3`), the system stores this as an absolute value. It completely replaces any auto-aggregated calculation. The override "locks" the value until explicitly cleared (`null`).

**Requested Behavior (v1.x Delta Adjustment):**
An override should be able to represent a *delta* — an additive or subtractive adjustment on top of the system's ongoing auto-aggregated calculation. Example: if the auto-aggregate calculates Alpha = 2, and an Admin applies a delta of +1, the effective value becomes 3. If the system later recalculates Alpha = 4, the effective value would become 5 (4 + 1), without requiring the Admin to re-lock.

**Why Deferred:**
- Requires a separate `delta_value` column alongside `override_value` in `worker_records`.
- Requires changes to the `apply_records_override` RPC to handle delta vs. absolute mode.
- Requires changes to the effective metric derivation logic in `lib/records/helpers.ts`.
- Needs careful audit trail: delta source, delta value, and resolved effective value must all be logged.
- The UI must clearly communicate "This is a delta adjustment (+X)" vs. "This is a locked value".
- Impact on `records.stale_override` optimistic locking must be re-evaluated.

**Candidate Future Slice:** R3-RO-Delta / v1.x Records architecture amendment.

**Open Design Questions:**
- Should delta and absolute be mutually exclusive per field, or can both coexist?
- If auto-aggregation is later corrected, should the delta re-apply automatically?
- How should the delta be displayed in the Records table UI?
- Should `before_value` in the audit log reflect the auto-aggregated value or the prior delta?

---

*Last updated: 2026-06-28*
