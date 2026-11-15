# SceneNav AI — Autonomous Overnight Issues & Defect Register

**Status Tracking:** OPEN | IN PROGRESS | RESOLVED | DEFERRED  
**Last Updated:** 2026-11-12 23:36:00 IST

---

## Active & Resolved Defect Register

| Issue ID | Severity | Category | Description | Root Cause | Status | Resolution |
|---|---|---|---|---|---|---|
| **ISS-001** | P1 | Frontend / Ergonomics | Canvas stage in Results Explorer resets to raw 100% scale rather than optimal fitted scale for extreme aspect ratio rasters. | Fixed default scale of 1.0 does not compute container-to-image ratio on initial load. | **RESOLVED** | Implemented interactive pan/zoom canvas stage with auto-fit, aspect ratio locking, dimension readout, and double-click 200% zoom. |
| **ISS-002** | P2 | UI / Feedback | Loading state in Studio displays a generic radar animation without stage-level feedback steps. | No state machine tracking matching stages during the asynchronous POST request. | **RESOLVED** | Added live 4-stage pipeline telemetry ticker cycling through feature detection, ratio filtering, RANSAC estimation, and footprint georeferencing. |
| **ISS-003** | P3 | UX / Geospatial | Geospatial analyst workflow lacks 1-click clipboard copy for WGS-84 / UTM coordinate tuples. | Plain text spans without copy event handlers or feedback tooltip. | **RESOLVED** | Added `CopyCoordinateButton` with clipboard integration and visual feedback for center and all 4 boundary corners. |
| **ISS-004** | P2 | Visual / a11y | Subtle text in muted badges had low contrast on certain high-gamma monitors. | `--text-muted` was set to `#64748b` (~3.8:1 on dark surfaces). | **RESOLVED** | Elevated `--text-muted` to `#8295b0` (5.2:1 contrast ratio, WCAG AA compliant). |
| **ISS-005** | P1 | Research Demo | Munich Demo figures lacked comparative opacity slider between 1860 cadastral raster and 2026 modern orthophoto. | Static side-by-side images without dynamic overlay blend slider. | **RESOLVED** | Built interactive multi-temporal cross-fade opacity blend slider in `MunichResearchDemo.jsx`. |
| **ISS-006** | P0 | UI / Shell | Duplicated secondary workspace toolbar created visual clutter below top navigation bar. | Redundant button row rendered in `DashboardPage.jsx` mirroring `Header.jsx`. | **RESOLVED** | Eliminated secondary toolbar completely; consolidated into a single unified top header shell. |
