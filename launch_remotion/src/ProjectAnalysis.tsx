import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

const sections = [
  {
    id: "overview",
    eyebrow: "A PROJECT WALKTHROUGH",
    title: "SceneNav AI",
    subtitle: "From aerial pixels to a mapped footprint",
    body: "A research prototype for matching an aerial query image to a stored reference, then estimating the corresponding region.",
    image: "overview.png",
    metric: "IMAGE MATCHING + GEOREFERENCING",
    note: "What the repository builds, measures, and does not claim",
    duration: 330,
  },
  {
    id: "purpose",
    eyebrow: "01 / THE TASK",
    title: "Find the same place",
    subtitle: "A query image is compared with a larger reference raster.",
    body: "The system searches for shared visual structure, estimates where the query sits, and returns a projected footprint with evidence artifacts.",
    image: "dashboard.png",
    metric: "QUERY → REFERENCE → FOOTPRINT",
    note: "A result is an image match first; geographic meaning depends on reference metadata.",
    duration: 330,
  },
  {
    id: "features",
    eyebrow: "02 / FEATURE MATCHING",
    title: "ORB and SIFT",
    subtitle: "Two classical feature pipelines, with different tradeoffs.",
    body: "Keypoints and descriptors are matched with a nearest-neighbor ratio test. Optional mutual consistency removes one-way matches before geometry is estimated.",
    image: "matches.png",
    metric: "SIFT CASE: 138 INLIERS / 173 FILTERED",
    note: "Green lines support the model; red lines are rejected correspondences.",
    duration: 390,
  },
  {
    id: "geometry",
    eyebrow: "03 / GEOMETRIC VERIFICATION",
    title: "RANSAC checks the fit",
    subtitle: "A homography maps query pixels into reference-image pixels.",
    body: "RANSAC keeps correspondences that agree with one projective transform, rejects outliers, and projects the four query corners. The model assumes the viewed scene is approximately planar.",
    image: "registration.png",
    metric: "INLIERS → HOMOGRAPHY → CORNER PROJECTION",
    note: "Strong relief, parallax, or oblique views can break this planar model.",
    duration: 360,
  },
  {
    id: "georeferencing",
    eyebrow: "04 / COORDINATE GATE",
    title: "Pixels become places only with metadata",
    subtitle: "The reference raster supplies the map transform and CRS.",
    body: "An affine transform converts reference pixels to projected coordinates; PyProj can then transform those coordinates to WGS-84. Without valid georeferencing, the output stays in pixel space.",
    image: "footprint.png",
    metric: "LOCALIZED  /  IMAGE-MATCH-ONLY  /  REJECTED",
    note: "The three-state result prevents coordinates from being fabricated.",
    duration: 390,
  },
  {
    id: "architecture",
    eyebrow: "05 / HOW THE REPOSITORY FITS TOGETHER",
    title: "A small, traceable application stack",
    subtitle: "The browser handles the workflow; the backend runs the vision pipeline.",
    body: "React sends uploads to FastAPI. Image validation, feature matching, RANSAC, footprint estimation, and georeferencing run as separate services. The API returns metrics and saved visual artifacts.",
    image: null,
    metric: "REACT → FASTAPI → OPENCV / PYPROJ → RESULTS",
    note: "Evaluation manifests, benchmark scripts, reports, and tests are included in the project.",
    duration: 360,
  },
  {
    id: "evaluation",
    eyebrow: "06 / EVALUATION",
    title: "Benchmarks include positives and negatives",
    subtitle: "The real-world suite uses public USGS and USDA aerial imagery.",
    body: "Across 15 pairs, the report lists 11 genuine overlaps and 4 unrelated negatives. ORB and SIFT each matched 11 of 11 positives and rejected 4 of 4 negatives in this sample.",
    image: "scorecard.png",
    metric: "15 PAIRS  ·  11 POSITIVE  ·  4 NEGATIVE",
    note: "Four negatives are a useful smoke test, not a reliable operational false-alarm estimate.",
    duration: 390,
  },
  {
    id: "case-study",
    eyebrow: "07 / MUNICH CASE STUDY",
    title: "Useful agreement, carefully named",
    subtitle: "The audited demo compares independent ORB and SIFT estimates.",
    body: "Their estimated centers differ by 0.42 metres, with 94.8% of the projected footprint inside the reference raster. The remaining 5.2% is extrapolated beyond the raster edge.",
    image: "overview.png",
    metric: "0.42 m CROSS-ALGORITHM REPEATABILITY",
    note: "That delta is agreement between two estimates on one reference, not absolute position error.",
    duration: 360,
  },
  {
    id: "temporal",
    eyebrow: "08 / CHANGING SCENES",
    title: "A changed scene can be rejected",
    subtitle: "The temporal example contrasts a 2012 reference with a 2024 image.",
    body: "In the documented tunnel-construction example, the newer scene falls below the inlier threshold and is rejected. That is a useful failure signal: the project does not force a match when evidence is weak.",
    image: "temporal.png",
    metric: "2024 REFERENCE: 5–6 INLIERS, BELOW THRESHOLD",
    note: "The example demonstrates change sensitivity, not general performance across all temporal imagery.",
    duration: 390,
  },
  {
    id: "limits",
    eyebrow: "09 / READ THE RESULTS CORRECTLY",
    title: "A research tool, with clear limits",
    subtitle: "The measurements describe a prototype and specific benchmark conditions.",
    body: "Half-metre-per-pixel is raster resolution, not accuracy. Reprojection residuals are pixel-space fit. No surveyed ground control points were established, and the prototype is not certified for flight operations.",
    image: "overview.png",
    metric: "PLANAR MODEL  ·  SMALL NEGATIVE SET  ·  NO EXTERNAL GCPS",
    note: "These boundaries are part of the project analysis, not fine print.",
    duration: 480,
  },
];

const sectionStarts: number[] = [];
let accumulated = 0;
for (const section of sections) {
  sectionStarts.push(accumulated);
  accumulated += section.duration;
}

const totalFrames = accumulated;

const ArchitectureDiagram: React.FC = () => {
  const groups = [
    ["React dashboard", "Upload · controls · results"],
    ["FastAPI routes", "Validation · API · artifacts"],
    ["Vision pipeline", "Load → ORB/SIFT → RANSAC"],
    ["Footprint + CRS", "Pixels → map coordinates"],
    ["Evidence", "Metrics · PNG · JSON"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      {groups.map(([title, detail], index) => (
        <div key={title} style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              flex: 1,
              border: "1px solid rgba(0,240,255,0.35)",
              borderRadius: 12,
              background: "rgba(7,16,27,0.94)",
              padding: "20px 24px",
              boxShadow: "0 0 24px rgba(0,240,255,0.06)",
            }}
          >
            <div style={{ color: "#00f0ff", fontSize: 24, fontWeight: 800 }}>{title}</div>
            <div style={{ color: "#a8b6c7", marginTop: 6, fontSize: 17 }}>{detail}</div>
          </div>
          {index < groups.length - 1 && (
            <div style={{ color: "#10b981", fontSize: 32, fontWeight: 700 }}>↓</div>
          )}
        </div>
      ))}
    </div>
  );
};

const ProjectSection: React.FC<{ section: (typeof sections)[number]; number: number }> = ({
  section,
  number,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = section.duration;
  const entrance = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const exit = interpolate(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: "clamp" });
  const opacity = Math.min(entrance, exit);
  const scale = interpolate(frame, [0, duration], [1.015, 1.055], { extrapolateRight: "clamp" });
  const elapsed = (sectionStarts[number] + frame) / totalFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: "#05080d", opacity, fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 76% 42%, rgba(0,240,255,0.12), transparent 34%), linear-gradient(120deg, #05080d 5%, #0b111a 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.15,
          backgroundImage:
            "linear-gradient(rgba(0,240,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,.12) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div style={{ position: "absolute", top: 32, left: 54, right: 54, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#e8f0fb", fontSize: 18, fontWeight: 800, letterSpacing: 2 }}>SCENENAV AI <span style={{ color: "#00f0ff", fontWeight: 500 }}> / PROJECT ANALYSIS</span></div>
        <div style={{ color: "#8191a5", fontFamily: "monospace", fontSize: 15 }}>TECHNICAL WALKTHROUGH · {String(number + 1).padStart(2, "0")} / {sections.length}</div>
      </div>

      <div style={{ position: "absolute", top: 85, left: 54, right: 54, height: 2, background: "rgba(255,255,255,.12)" }}>
        <div style={{ height: "100%", width: `${Math.max(3, elapsed * 100)}%`, background: "#00f0ff" }} />
      </div>

      <div style={{ position: "absolute", inset: "130px 54px 115px", display: "flex", gap: 56, alignItems: "center" }}>
        <div style={{ width: 690, flexShrink: 0, transform: `translateY(${(1 - entrance) * 24}px)` }}>
          <div style={{ color: "#00f0ff", fontFamily: "monospace", fontSize: 18, letterSpacing: 3, fontWeight: 700 }}>{section.eyebrow}</div>
          <h1 style={{ color: "#f8fafc", fontFamily: "'Segoe UI', sans-serif", fontSize: 58, lineHeight: 1.08, margin: "22px 0 18px", letterSpacing: -1.5 }}>{section.title}</h1>
          <div style={{ color: "#d3deea", fontSize: 28, lineHeight: 1.3, fontWeight: 600 }}>{section.subtitle}</div>
          <p style={{ color: "#9eacbc", fontSize: 22, lineHeight: 1.55, marginTop: 28 }}>{section.body}</p>
          <div style={{ marginTop: 24, display: "inline-flex", border: "1px solid rgba(0,240,255,.4)", background: "rgba(0,240,255,.08)", borderRadius: 8, padding: "12px 16px", color: "#b9faff", fontFamily: "monospace", fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>{section.metric}</div>
        </div>

        <div style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ height: "92%", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(0,240,255,.28)", background: "rgba(10,17,26,.84)", boxShadow: "0 20px 70px rgba(0,0,0,.45), 0 0 30px rgba(0,240,255,.09)", display: "flex", alignItems: "center", justifyContent: "center", padding: section.image ? 12 : 38 }}>
            {section.image ? (
              <Img
                src={staticFile(`project_analysis/${section.image}`)}
                style={{ width: "100%", height: "100%", objectFit: "contain", transform: `scale(${scale})` }}
              />
            ) : (
              <ArchitectureDiagram />
            )}
          </div>
          <div style={{ color: "#8394a7", fontSize: 16, lineHeight: 1.35, marginTop: 14, textAlign: "right" }}>{section.note}</div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 30, left: 54, right: 54, display: "flex", justifyContent: "space-between", color: "#627286", fontFamily: "monospace", fontSize: 13, letterSpacing: 1 }}>
        <span>SCENE AIDED NAVIGATION RESEARCH PROTOTYPE</span>
        <span>{Math.round((sectionStarts[number] + frame) / fps)}s</span>
      </div>
    </AbsoluteFill>
  );
};

export const ProjectAnalysis: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#05080d" }}>
    <Audio src={staticFile("cinematic_ambient_score.wav")} volume={0.22} loop />
    {sections.map((section, index) => (
      <Sequence key={section.id} from={sectionStarts[index]} durationInFrames={section.duration}>
        <ProjectSection section={section} number={index} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

export const projectAnalysisMetadata = { fps: FPS, width: WIDTH, height: HEIGHT, durationInFrames: totalFrames };
