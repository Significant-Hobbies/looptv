## MODIFIED Requirements

### Requirement: Stable bounded quality selection

The fetcher SHALL apply source quality percentages exactly once against a persisted candidate baseline, the catalog builder SHALL NOT reapply a percentage to an API-preselected working set, and incremental refreshes SHALL retain a verified full-history top set while considering newly discovered uploads.

#### Scenario: Verified full-history source refresh

- **WHEN** a source has a full-history checkpoint and an incremental refresh discovers recent uploads
- **THEN** selection reranks the retained verified top set and recent qualifying uploads together without rescanning full history or reapplying the percentile

#### Scenario: Unverified legacy baseline

- **WHEN** a source has only a historical candidate count without a verified full-history top set
- **THEN** source health identifies that baseline as incremental-only rather than claiming a verified ranking
