import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {COLORS, HEIGHT, WIDTH, fontDisplay, fontMono} from '../constants';
import {enter, premiumSpring} from '../motion';
import {Atmosphere, ScanLine} from '../components/Atmosphere';
import {Caption, Glass, Kicker, SceneContainer, Title} from '../components/Primitives';

const terrainBackground = `
  linear-gradient(26deg, rgba(15, 78, 86,.82) 0 7%, transparent 7% 13%, rgba(22,89,82,.7) 13% 18%, transparent 18% 25%, rgba(10,57,73,.6) 25% 33%, transparent 33% 100%),
  repeating-linear-gradient(104deg, rgba(94,205,174,.18) 0 2px, transparent 2px 31px),
  repeating-linear-gradient(14deg, rgba(255,255,255,.07) 0 1px, transparent 1px 47px),
  radial-gradient(circle at 62% 42%, #20867c 0 7%, transparent 7.5%),
  radial-gradient(circle at 31% 72%, #1b5268 0 8%, transparent 8.5%),
  linear-gradient(135deg, #102d39, #071b28 53%, #0a2830)`;

const Plane: React.FC<{label: string; sub: string; style: React.CSSProperties; dim?: boolean; points?: boolean}> = ({label, sub, style, dim, points}) => (
  <div style={{position: 'absolute', width: 575, height: 350, border: `1px solid ${dim ? 'rgba(244,180,103,.52)' : 'rgba(19,216,255,.58)'}`, background: terrainBackground, boxShadow: `0 35px 100px ${dim ? 'rgba(244,180,103,.13)' : 'rgba(19,216,255,.15)'}`, overflow: 'hidden', ...style}}>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(114deg, transparent 45%, rgba(255,255,255,.1) 50%, transparent 55%)', transform: 'translateX(-25%)'}}/>
    <div style={{position: 'absolute', left: 22, top: 18, fontFamily: fontMono, fontSize: 16, letterSpacing: 2.1, color: COLORS.white, background: 'rgba(3,7,13,.72)', padding: '8px 11px', borderLeft: `2px solid ${dim ? COLORS.amber : COLORS.cyan}`}}>{label}</div>
    <div style={{position: 'absolute', left: 22, bottom: 18, fontFamily: fontMono, fontSize: 14, letterSpacing: 1.3, color: COLORS.muted}}>{sub}</div>
    {points && <Keypoints />}
  </div>
);

const pointCoords = [[15,18],[28,37],[44,22],[61,45],[79,29],[87,59],[20,72],[45,74],[65,72],[36,55],[73,13],[8,50]];
const Keypoints: React.FC<{color?: string}> = ({color = COLORS.cyan}) => <>{pointCoords.map(([x,y], i) => <span key={`${x}-${y}`} style={{position: 'absolute', left: `${x}%`, top: `${y}%`, width: 9, height: 9, border: `2px solid ${color}`, borderRadius: '50%', boxShadow: `0 0 13px ${color}`, transform: `scale(${0.9 + (i%3)*.12})`}}/>)}</>;

const Planet: React.FC = () => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const turn = f / fps * 0.045;
  return <>
    <ambientLight intensity={0.18}/>
    <pointLight color={COLORS.cyan} intensity={3.4} position={[-5, 3.5, 4]}/>
    <pointLight color="#fff" intensity={1.1} position={[4, -2, 5]}/>
    <mesh rotation={[0.24, turn, -0.12]}>
      <sphereGeometry args={[2.25, 54, 54]}/>
      <meshStandardMaterial color="#075c76" wireframe roughness={0.4} metalness={0.55}/>
    </mesh>
    <mesh rotation={[0.24, turn + .012, -0.12]} scale={[1.028, 1.028, 1.028]}>
      <sphereGeometry args={[2.25, 54, 54]}/>
      <meshBasicMaterial color={COLORS.cyan} wireframe transparent opacity={0.27}/>
    </mesh>
    <mesh rotation={[Math.PI / 2.3, 0.18, -0.35]}>
      <torusGeometry args={[3.35, .012, 8, 120]}/><meshBasicMaterial color={COLORS.cyan} transparent opacity={0.72}/>
    </mesh>
    {[0, 1, 2].map((i) => <mesh key={i} position={[Math.cos(turn*4 + i*2.1)*3.1, Math.sin(turn*3+i)*1.2, 0]} rotation={[0, 0, .65]}>
      <boxGeometry args={[.38,.07,.08]}/><meshBasicMaterial color={i === 1 ? COLORS.amber : COLORS.white}/>
    </mesh>)}
  </>;
};

export const HookOrbit: React.FC = () => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const signal = enter(f, fps, 0.4, 0.55); const fail = enter(f, fps, 2.5, 1.2);
  return <SceneContainer duration={8}><Atmosphere intensity={1.25}/>
    <div style={{position: 'absolute', right: -18, top: -74, width: 1190, height: 1170, opacity: signal, transform: `scale(${.92 + signal*.08})`, filter: `blur(${(1-signal)*10}px)`}}>
      <ThreeCanvas width={1190} height={1170} camera={{position: [0, 0, 7], fov: 42}} gl={{antialias: true, alpha: true}}><Planet/></ThreeCanvas>
    </div>
    <div style={{position:'absolute', left:145, top:160, zIndex:4}}><Kicker>SCENENAV AI / SIGNAL-DENIED ENVIRONMENT</Kicker><div style={{height:30}}/><Title size={74}>WHAT HAPPENS<br/>WHEN POSITIONING<br/>SIGNALS ARE<br/><span style={{color:COLORS.cyan}}>UNAVAILABLE?</span></Title><div style={{height:28}}/><Caption width={600}>The Earth is still there. Its visible structure remains available for analysis.</Caption></div>
    <Glass style={{position:'absolute', right:180, bottom:135, width:325, padding:'17px 20px', opacity: 1-fail*.2, zIndex:6}}><div style={{fontFamily:fontMono, fontSize:14, letterSpacing:2, color:COLORS.muted}}>POSITIONING SIGNALS</div><div style={{fontFamily:fontMono, fontSize:24, letterSpacing:1.2, color:fail>.7?COLORS.amber:COLORS.cyan, marginTop:9}}>{fail>.72?'UNAVAILABLE':'ACQUIRING...'}</div><div style={{height:3, background:'rgba(255,255,255,.1)', marginTop:16}}><div style={{height:'100%', width:`${100-fail*100}%`, background:COLORS.amber, boxShadow:`0 0 12px ${COLORS.amber}`}}/></div></Glass>
    <div style={{position:'absolute', left:145, bottom:86, fontFamily:fontMono, color:COLORS.muted, fontSize:15, letterSpacing:2}}>01 / OPTICAL EVIDENCE REMAINS</div>
  </SceneContainer>;
};

export const ProblemPair: React.FC = () => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const p = enter(f,fps,.2,.7); const q = enter(f,fps,1.1,.8);
  return <SceneContainer duration={9}><Atmosphere/>
    <div style={{position:'absolute', left:135, top:120}}><Kicker>02 / THE PROBLEM</Kicker><div style={{height:18}}/><Title size={65} width={700}>THE WORLD STILL<br/>LEAVES <span style={{color:COLORS.cyan}}>VISUAL CLUES.</span></Title></div>
    <Plane label="REFERENCE RASTER" sub="NADIR / STORED REFERENCE" style={{left:155, bottom:150, opacity:p, transform:`perspective(1400px) rotateX(4deg) rotateZ(-2deg) translateY(${(1-p)*40}px)`, filter:`blur(${(1-p)*8}px)`}}/>
    <Plane label="QUERY IMAGE" sub="SHIFTED SCALE / ORIENTATION" dim style={{right:170, top:260, opacity:q, transform:`perspective(1400px) rotateY(-12deg) rotateX(7deg) rotateZ(${ -13 + q*8}deg) translate(${(1-q)*100}px,${(1-q)*-30}px)`, filter:`blur(${(1-q)*9}px)`}}/>
    <svg width="100%" height="100%" style={{position:'absolute', inset:0, zIndex:3}}><path d="M 635 660 C 860 600, 976 502, 1236 420" fill="none" stroke={COLORS.cyan} strokeWidth="2" strokeDasharray="12 16" opacity=".7"/><circle cx="635" cy="660" r="8" fill={COLORS.cyan}/><circle cx="1236" cy="420" r="8" fill={COLORS.amber}/></svg>
    <div style={{position:'absolute', left:745, top:570, fontFamily:fontMono, color:COLORS.muted, fontSize:16, letterSpacing:2, transform:'rotate(-16deg)'}}>SCALE / VIEWPOINT / TIME</div><ScanLine top={74}/>
  </SceneContainer>;
};

export const TechnologyMatching: React.FC = () => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const phase = enter(f,fps,.8,.8); const accepted = enter(f,fps,5.6,.8); const rejected = enter(f,fps,3.4,.55);
  const paths = [[410,350,1030,270],[520,510,1100,480],[630,400,1240,330],[470,650,1100,690],[680,690,1270,570],[735,320,1370,410],[390,580,1025,620],[600,760,1225,750]];
  return <SceneContainer duration={12}><Atmosphere/>
    <div style={{position:'absolute', left:122, top:93}}><Kicker>03 / THE TECHNOLOGY</Kicker><div style={{height:14}}/><Title size={58} width={980}>FIND WHAT <span style={{color:COLORS.cyan}}>PERSISTS.</span><br/>REJECT WHAT DOESN'T.</Title></div>
    <Plane label="QUERY" sub="FEATURE SPACE" points style={{left:145, top:315, width:530, height:430, opacity:phase, transform:`perspective(1200px) rotateY(8deg) translateX(${(1-phase)*-70}px)`, filter:`blur(${(1-phase)*8}px)`}}/>
    <Plane label="REFERENCE" sub="FEATURE SPACE" points style={{right:145, top:315, width:530, height:430, opacity:phase, transform:`perspective(1200px) rotateY(-8deg) translateX(${(1-phase)*70}px)`, filter:`blur(${(1-phase)*8}px)`}}/>
    <svg width="100%" height="100%" style={{position:'absolute', inset:0, zIndex:4}}>{paths.map(([x1,y1,x2,y2],i)=>{const bad=i===1||i===5; const show=bad?rejected:accepted; return <path key={i} d={`M ${x1} ${y1} C ${x1+170} ${y1-120}, ${x2-170} ${y2+120}, ${x2} ${y2}`} fill="none" stroke={bad?COLORS.amber:COLORS.emerald} strokeWidth={bad?2.5:3.5} opacity={show*(bad?.42:0.9)} strokeDasharray={bad?'8 10':'0'} />})}</svg>
    <div style={{position:'absolute', left:770, top:347, width:380, zIndex:5, display:'flex', gap:10, justifyContent:'center'}}>{['ORB','SIFT','RANSAC'].map((word,i)=> <Glass key={word} style={{padding:'11px 14px', opacity:enter(f,fps,1.5+i*.35,.4), transform:`translateY(${(1-enter(f,fps,1.5+i*.35,.4))*22}px)`, filter:`blur(${(1-enter(f,fps,1.5+i*.35,.4))*6}px)`}}><span style={{fontFamily:fontMono,fontSize:16,fontWeight:700,letterSpacing:1.5,color:i===2?COLORS.emerald:COLORS.cyan}}>{word}</span></Glass>)}</div>
    <Glass style={{position:'absolute', left:620, bottom:80, width:680, padding:'15px 20px', textAlign:'center', zIndex:6, borderColor:'rgba(244,180,103,.38)'}}><span style={{fontFamily:fontMono, color:COLORS.white, fontSize:16, letterSpacing:1.3}}>IMAGE-SPACE MATCHING — NOT A CLAIM OF GEOGRAPHICAL LOCATION</span></Glass>
  </SceneContainer>;
};

export const TransformationFootprint: React.FC = () => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const q = enter(f,fps,.5,.75); const align = enter(f,fps,2.5,2.6); const footprint = enter(f,fps,6.1,.85);
  const left = 980 - align*230; const top = 310 + align*35; const rotate = -13 + align*13; const skew = -9 + align*9;
  return <SceneContainer duration={11}><Atmosphere accent={COLORS.emerald}/>
    <div style={{position:'absolute', left:130, top:100, zIndex:9}}><Kicker color={COLORS.emerald}>04 / THE TRANSFORMATION</Kicker><div style={{height:14}}/><Title size={63} width={780}>ALIGN THE<br/><span style={{color:COLORS.emerald}}>EVIDENCE.</span></Title><div style={{height:21}}/><Caption width={570}>A homography connects one image plane to another — revealing a projected footprint in reference-raster pixels.</Caption></div>
    <div style={{position:'absolute', right:112, top:175, width:920, height:690, border:`1px solid rgba(19,216,255,.38)`, background:terrainBackground, boxShadow:'0 28px 100px rgba(0,0,0,.35)', overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)',backgroundSize:'46px 46px'}}/>
      <div style={{position:'absolute',left:22,top:18,fontFamily:fontMono,fontSize:15,color:COLORS.white,letterSpacing:2}}>REFERENCE RASTER / PIXEL PLANE</div>
      <div style={{position:'absolute',left:23,bottom:18,fontFamily:fontMono,fontSize:13,color:COLORS.muted,letterSpacing:1.4}}>X → / Y ↓ / NO COORDINATE CLAIM WITHOUT VALID GEOREFERENCING</div>
      <svg viewBox="0 0 330 232" width="330" height="232" style={{position:'absolute',left:322,top:191,overflow:'visible',opacity:footprint,filter:`drop-shadow(0 0 13px ${COLORS.emerald})`}}>
        <defs><pattern id="footprint-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="rgba(66,231,179,.42)" strokeWidth="2"/></pattern></defs>
        <polygon points="23,0 330,28 300,232 0,186" fill="rgba(66,231,179,.12)" stroke={COLORS.emerald} strokeWidth="3"/>
        <polygon points="23,0 330,28 300,232 0,186" fill="url(#footprint-hatch)" opacity=".7"/>
        {[[23,0,'01'],[330,28,'02'],[300,232,'03'],[0,186,'04']].map(([x,y,n]) => <g key={String(n)} transform={`translate(${x},${y})`}><circle r="14" fill={COLORS.emerald}/><text textAnchor="middle" dominantBaseline="middle" fill={COLORS.ink} fontFamily="monospace" fontSize="10" fontWeight="700">{n}</text></g>)}
      </svg>
    </div>
    <div style={{position:'absolute',left,top,width:360,height:270,border:`2px solid ${COLORS.white}`,background:terrainBackground,opacity:q*(1-align*.3),transform:`perspective(1000px) rotateZ(${rotate}deg) skewX(${skew}deg) scale(${1-align*.07})`,zIndex:6,boxShadow:'0 20px 68px rgba(0,0,0,.55)'}}><div style={{position:'absolute',left:18,top:16,fontFamily:fontMono,fontSize:14,color:COLORS.white,letterSpacing:1.6}}>QUERY IMAGE</div><div style={{position:'absolute',right:-85,top:'45%',fontFamily:fontMono,color:COLORS.cyan,fontSize:28,opacity:align}}>H</div></div>
    <div style={{position:'absolute',right:980,top:498,fontFamily:fontMono,fontSize:34,color:COLORS.cyan,opacity:align,transform:`scale(${.7+align*.3})`,filter:`blur(${(1-align)*9}px)`}}>x′ = Hx</div>
    <ScanLine top={59} color={COLORS.emerald} width={80}/>
  </SceneContainer>;
};

const Instrument: React.FC<{x:number;y:number;label:string;value:string;delay:number;type:'ring'|'bars'|'matrix'|'scatter'}> = ({x,y,label,value,delay,type}) => {
  const f=useCurrentFrame();const {fps}=useVideoConfig();const p=enter(f,fps,delay,.55); const phase=f/fps;
  const content = type==='ring' ? <><div style={{width:90,height:90,border:`7px solid ${COLORS.cyan}`,borderLeftColor:'rgba(19,216,255,.13)',borderRadius:'50%',transform:`rotate(${phase*56}deg)`,boxShadow:`0 0 24px rgba(19,216,255,.25)`}}/><span style={{position:'absolute',fontFamily:fontMono,fontSize:20,color:COLORS.white}}>{value}</span></> : type==='bars' ? <div style={{display:'flex',gap:8,alignItems:'end',height:78}}>{[32,55,43,72,62].map((h,i)=><div key={i} style={{width:15,height:h*(.65+.35*Math.sin(phase+i)),background:i===3?COLORS.emerald:COLORS.cyan,boxShadow:`0 0 14px ${COLORS.cyan}`}}/>)}</div> : type==='matrix' ? <div style={{display:'grid',gridTemplateColumns:'repeat(3,18px)',gap:5}}>{Array.from({length:9},(_,i)=><span key={i} style={{width:18,height:18,background:i===4?COLORS.emerald:`rgba(19,216,255,${.15+(i%3)*.2})`,border:'1px solid rgba(255,255,255,.1)'}}/>)}</div> : <svg width="100" height="82">{Array.from({length:16},(_,i)=><circle key={i} cx={10+(i*23)%83} cy={10+(i*37)%64} r={i%4===0?4:2.2} fill={i%4===0?COLORS.emerald:COLORS.cyan}/>)}</svg>;
  return <Glass style={{position:'absolute',left:x,top:y,width:245,height:190,padding:'21px',opacity:p,transform:`translateY(${(1-p)*40}px) scale(${.94+p*.06})`,filter:`blur(${(1-p)*8}px)`}}><div style={{fontFamily:fontMono,fontSize:13,color:COLORS.muted,letterSpacing:1.4}}>{label}</div><div style={{height:19}}/><div style={{height:90,display:'grid',placeItems:'center',position:'relative'}}>{content}</div></Glass>;
};

export const IntelligenceReliability: React.FC = () => {
  const f=useCurrentFrame();const {fps}=useVideoConfig();const center=enter(f,fps,2.1,.8);
  return <SceneContainer duration={10}><Atmosphere accent={COLORS.emerald}/>
    <div style={{position:'absolute',left:0,top:93,width:'100%',textAlign:'center'}}><Kicker color={COLORS.emerald}>05 / THE INTELLIGENCE</Kicker><div style={{height:15}}/><Title size={58} width={1200}>RELIABILITY IS <span style={{color:COLORS.emerald}}>EXAMINED.</span></Title></div>
    <Instrument x={185} y={347} label="MULTI-SCALE MATCHING" value="σ" delay={.35} type="ring"/><Instrument x={495} y={347} label="SPATIAL DISPERSION" value="" delay={.58} type="scatter"/><Instrument x={1180} y={347} label="INLIER CONSISTENCY" value="" delay={.82} type="bars"/><Instrument x={1490} y={347} label="H CONDITIONING" value="" delay={1.05} type="matrix"/>
    <div style={{position:'absolute',left:800,top:390,width:320,height:145,display:'grid',placeItems:'center',opacity:center,transform:`scale(${.8+center*.2})`,filter:`blur(${(1-center)*10}px)`}}><div style={{width:144,height:144,border:`1px solid ${COLORS.emerald}`,borderRadius:'50%',display:'grid',placeItems:'center',boxShadow:`0 0 55px rgba(66,231,179,.22), inset 0 0 40px rgba(66,231,179,.09)`}}><div style={{textAlign:'center',fontFamily:fontMono,fontSize:16,color:COLORS.white,lineHeight:1.35}}>RELIABILITY<br/><span style={{color:COLORS.emerald}}>ASSESSMENT</span></div></div></div>
    <Glass style={{position:'absolute',left:242,bottom:68,width:1436,padding:'19px 28px',borderColor:'rgba(244,180,103,.55)',opacity:enter(f,fps,4,.55),transform:`translateY(${(1-enter(f,fps,4,.55))*25}px)`,filter:`blur(${(1-enter(f,fps,4,.55))*6}px)`}}><div style={{fontFamily:fontMono,fontSize:18,color:COLORS.white,letterSpacing:.3,textAlign:'center'}}><span style={{color:COLORS.amber}}>IMPORTANT / </span>CONFIDENCE INDEX IS AN UNCALIBRATED HEURISTIC — NOT A PROBABILITY OF CORRECT GEOGRAPHICAL LOCALIZATION.</div></Glass>
  </SceneContainer>;
};

const steps=['INPUT\nIMAGERY','FEATURE\nDETECTION','MATCHING','RANSAC','HOMOGRAPHY','FOOTPRINT\nESTIMATION','RELIABILITY\nASSESSMENT'];
export const Pipeline: React.FC = () => {
  const f=useCurrentFrame();const {fps}=useVideoConfig(); const pulse=interpolate(f,[fps*.8,fps*7.4],[130,1790],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <SceneContainer duration={8}><Atmosphere/>
    <div style={{position:'absolute',left:120,top:104}}><Kicker>06 / THE PIPELINE</Kicker><div style={{height:13}}/><Title size={62} width={900}>THE EVIDENCE<br/>MOVES <span style={{color:COLORS.cyan}}>FORWARD.</span></Title></div>
    <div style={{position:'absolute',left:130,right:130,top:612,height:4,background:'linear-gradient(90deg, transparent, rgba(19,216,255,.5), transparent)',boxShadow:'0 0 24px rgba(19,216,255,.35)'}}/><div style={{position:'absolute',left:pulse,top:601,width:25,height:25,borderRadius:'50%',background:COLORS.white,boxShadow:`0 0 12px 5px ${COLORS.cyan}, 0 0 70px 25px rgba(19,216,255,.33)`}}/>
    <div style={{position:'absolute',left:115,top:500,display:'flex',gap:19,alignItems:'center'}}>{steps.map((step,i)=>{const p=enter(f,fps,.65+i*.15,.42);const y=i%2===0?0:-44;return <Glass key={step} style={{width:226,height:108,padding:'17px 15px',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',opacity:p,transform:`translate(${(1-p)*48}px,${y+(1-p)*25}px) scale(${.94+p*.06})`,filter:`blur(${(1-p)*7}px)`,borderColor:i===6?'rgba(66,231,179,.6)':undefined}}><span style={{fontFamily:fontMono,fontSize:15,color:i===6?COLORS.emerald:COLORS.white,letterSpacing:1.2,lineHeight:1.3,whiteSpace:'pre-line'}}>{step}</span></Glass>})}</div>
    <div style={{position:'absolute',left:120,bottom:90,fontFamily:fontMono,fontSize:17,color:COLORS.muted,letterSpacing:1.5}}>EACH STAGE LEAVES AN INSPECTABLE TRACE.</div>
  </SceneContainer>;
};

export const BrandReveal: React.FC = () => {
  const f=useCurrentFrame();const {fps}=useVideoConfig(); const mark=premiumSpring(f,fps,.35);const word=enter(f,fps,1,.7); const pulse=1+Math.sin(f/fps*2.5)*.03;
  return <SceneContainer duration={7}><Atmosphere intensity={1.35}/>
    <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',paddingBottom:15}}><div style={{textAlign:'center',transform:`scale(${pulse})`}}>
      <div style={{height:156,display:'flex',justifyContent:'center',alignItems:'center',opacity:mark,transform:`scale(${.6+mark*.4}) rotate(${(1-mark)*-17}deg)`,filter:`blur(${(1-mark)*16}px)`}}><svg width="168" height="150" viewBox="0 0 168 150"><path d="M14 106 L84 18 L154 106 L110 106 L84 75 L58 106Z" fill="none" stroke={COLORS.cyan} strokeWidth="7"/><circle cx="84" cy="111" r="11" fill={COLORS.emerald}/><path d="M18 122 L150 122" stroke={COLORS.white} strokeWidth="1" opacity=".48"/></svg></div>
      <div style={{fontFamily:fontDisplay,fontWeight:700,fontSize:100,letterSpacing:-4,color:COLORS.white,opacity:word,transform:`translateY(${(1-word)*34}px) scale(${.95+word*.05})`,filter:`blur(${(1-word)*12}px)`,textShadow:'0 0 45px rgba(19,216,255,.25)'}}>SCENENAV <span style={{color:COLORS.cyan}}>AI</span></div>
      <div style={{marginTop:22,fontFamily:fontMono,fontSize:20,color:COLORS.muted,letterSpacing:3,opacity:enter(f,fps,1.65,.5),transform:`translateY(${(1-enter(f,fps,1.65,.5))*22}px)`}}>SCENE-AIDED NAVIGATION RESEARCH PROTOTYPE</div>
      <div style={{marginTop:56,fontFamily:fontDisplay,fontSize:31,color:COLORS.white,letterSpacing:2,opacity:enter(f,fps,2.15,.55)}}>VISUAL INTELLIGENCE. <span style={{color:COLORS.emerald}}>SPATIAL UNDERSTANDING.</span></div>
    </div></div>
    <div style={{position:'absolute',bottom:73,left:0,width:'100%',textAlign:'center',fontFamily:fontMono,fontSize:15,color:COLORS.muted,letterSpacing:3,opacity:enter(f,fps,2.8,.45)}}>IMAGE-SPACE EVIDENCE / CAREFUL INVESTIGATION</div>
  </SceneContainer>;
};
