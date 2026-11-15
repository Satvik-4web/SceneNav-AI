import { useState } from 'react';

export default function StudioWelcome({ ready, onRun }) {
  const [showFeatures, setShowFeatures] = useState(true);
  const [aerial, setAerial] = useState(true);
  const [motion, setMotion] = useState(true);
  return (
    <section className={`studio-welcome ${motion ? "" : "motion-paused"}`}>
      <div className="welcome-copy">
        <span className="eyebrow"><i /> SCENE UNDERSTANDING / WORKSPACE 01</span>
        <h2>Locate the overlap.<br /><span>See the evidence.</span></h2>
        <p>Find where your image belongs. Compare visual features, inspect the alignment, and understand the evidence behind every match.</p>
        <div className="welcome-actions">
          <button className="btn-primary" disabled={!ready} onClick={onRun}>Match your images <span aria-hidden="true">↗</span></button>
          <span>{ready ? 'Image pair ready to analyse' : 'Start with a preset or upload an image pair'}</span>
        </div>
      </div>
      <div className={`terrain-preview ${showFeatures ? 'with-features' : ''}`}>
        <div className="terrain-toolbar"><span className="mono">SCENE EXPLORER / PREVIEW</span><div className="terrain-toggles"><button aria-pressed={aerial} onClick={() => setAerial(!aerial)}>{aerial ? "Contour view" : "Aerial view"}</button><button aria-pressed={!motion} onClick={() => setMotion(!motion)}>{motion ? "Pause motion" : "Resume motion"}</button></div><button aria-pressed={showFeatures} onClick={() => setShowFeatures(!showFeatures)}>{showFeatures ? 'Hide' : 'Show'} features</button></div>
        <svg viewBox="0 0 760 330" role="img" aria-label="Illustration of a query footprint aligned to a reference terrain. Not a computed result.">
          <defs>
            <pattern id="map-grid" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M38 0H0V38" fill="none" stroke="#29424a" strokeWidth=".6" /></pattern>
            <linearGradient id="land" x2="1" y2="1"><stop stopColor="#183c3d"/><stop offset="1" stopColor="#0a1c28"/></linearGradient>
            <linearGradient id="scan" x2="0" y2="1"><stop stopColor="#7ce8c2" stopOpacity="0"/><stop offset="1" stopColor="#7ce8c2" stopOpacity=".2"/></linearGradient>
          </defs>
          <rect width="760" height="330" fill="url(#land)"/>
          <image className="aerial-layer" href="/aerial-preview.jpg" width="760" height="330" preserveAspectRatio="xMidYMid slice" opacity={aerial ? .72 : 0}/>
          <rect width="760" height="330" fill="url(#map-grid)"/>
          {Array.from({length: 13}, (_, i) => <path key={i} d={`M ${-90+i*9} ${290-i*17} C ${160+i*7} ${390-i*24}, ${130+i*19} ${15+i*8}, ${365+i*15} ${80-i*10} S ${600+i*9} ${310-i*8}, 850 ${120-i*19}`} fill="none" stroke="#568477" strokeOpacity={.25+i*.025} />)}
          <path d="M-20 250L180 205 310 235 440 105 600 135 800 30" fill="none" stroke="#8ba1a0" strokeWidth="9" strokeOpacity=".16"/>
          <path d="M-20 250L180 205 310 235 440 105 600 135 800 30" fill="none" stroke="#becbc4" strokeWidth="1.5" strokeDasharray="5 5" strokeOpacity=".6"/>
          <g className="footprint-illustration">
            <path d="M268 72L530 108 494 273 231 237Z" fill="#7ce8c2" fillOpacity=".09" stroke="#8ae8c6" strokeWidth="2"/>
            <path d="M268 72L530 108 494 273 231 237Z" fill="none" stroke="#ddfff1" strokeWidth="5" strokeDasharray="12 220"/>
            <text x="275" y="59" fill="#b7f4de" fontSize="11" fontFamily="monospace">QUERY FOOTPRINT</text>
          </g>
          <g className="illustrated-features" fill="#b5ffe2">
            {[[280,114],[420,135],[350,200],[480,220],[310,170],[456,170],[395,245],[258,220]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="8" fill="none" stroke="#91eac5" strokeOpacity=".5"/><circle cx={x} cy={y} r="2.5"/><path d={`M${x+8} ${y}h18`} stroke="#91eac5" strokeOpacity=".4"/></g>)}
          </g>
          <rect className="terrain-scan" x="220" y="70" width="325" height="40" fill="url(#scan)" />
          <text x="24" y="300" fill="#a0b8b4" fontSize="10" fontFamily="monospace">REFERENCE PLANE</text>
          <path d="M700 280v-32m-5 7 5-7 5 7" stroke="#bdd3cb" fill="none"/><text x="696" y="240" fill="#bdd3cb" fontSize="11">N</text>
        </svg>
        <div className="terrain-caption"><span><i /> Feature correspondence</span><span>USGS/TNRIS imagery · illustrative overlay</span></div>
      </div>
      <div className="workflow-cards">
        {[
          ['01', 'Choose your scene', 'Add a reference map and the image you want to locate.'],
          ['02', 'Find the overlap', 'ORB or SIFT features, verified with RANSAC geometry.'],
          ['03', 'Inspect the evidence', 'Review the footprint, residuals and match quality.'],
        ].map(([n,title,description])=><div key={n}><span className="step-number">{n}</span><h3>{title}</h3><p>{description}</p></div>)}
      </div>
      <p className="welcome-note">Coordinates require valid reference georeferencing. A strong visual match alone does not establish geographic accuracy.</p>
    </section>
  );
}
