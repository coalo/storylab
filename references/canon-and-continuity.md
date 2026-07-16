# Canon and continuity

Treat truth, proposal, taste, and workflow as different data classes.

## Authority classes

- **Canon**: facts established in accepted prose or explicitly approved by the user.
- **Plan**: future possibilities that may change without retconning canon.
- **Taste evidence**: explicit user approvals and rejections about reading experience.
- **Continuity state**: structured current values derived from canon.
- **Production state**: workflow status and evidence validity.

Never store rejected drafts, brainstorms, or proposed endings in `故事项目/故事圣经.md` as facts.

## Continuity domains

Use stable keys within:

- `time`
- `location`
- `money`
- `inventory`
- `injury`
- `knowledge`
- `permission`
- `contract`
- `power`
- `relationship_action`
- `world_rule`

Each state entry should include a value, source chapter or approval, effective time, and optional confidence or notes. Unknown values remain unknown; do not invent precision.

## Postflight evidence

Every material check records expected value, observed value, status, and a short evidence location. The continuity editor may propose updates, but only accepted chapters can commit them.

`overall` must be:

- `clear` when every check is clear;
- `conflict` when any check conflicts;
- `insufficient` when there are no conflicts but at least one material value is unknown.

## Repair discipline

State the conflict and its evidence. Do not prescribe dialogue or action. If repair changes prose, increment the draft revision and invalidate downstream evidence. If an accepted fact must change, obtain explicit retcon approval and record both the old and new authority sources.
