import { useState } from 'react';
import { fetchSampleImageFile } from '../api/client';

import { MANUAL_CASES, assessManualResult } from './manualCases';
const REF = 'real_usgs_harrishill_ref.png';
export default function ManualTestLab({selected,onSelect,disabled,result}) {
 const [busy,setBusy]=useState(null);
 const [error,setError]=useState(null);
 const [open,setOpen]=useState(false);
 const assessment=assessManualResult(selected,result);
 async function load(test) {
  setBusy(test.id);setError(null);
  try {
   const [ref,query]=await Promise.all([fetchSampleImageFile('references',REF),fetchSampleImageFile(test.category||'queries',test.file)]);
   onSelect(ref,query,test);
  } catch(e) {setError(e.message);} finally {setBusy(null);}
 }
 return <section className="manual-lab">
  <button className="lab-heading" aria-expanded={open} onClick={()=>setOpen(!open)}><span><span className="eyebrow">GUIDED VALIDATION</span><strong>Don't just match. Verify.</strong></span><span className="lab-open">{open?'Close tests':'Try 6 test cases'} <span aria-hidden="true">{open?'−':'+'}</span></span></button>
  {open && <div className="lab-content"><p>Choose a case, then click <strong>Run Matching</strong>. Start with SIFT and default settings. These are controlled checks from one real photo, not independent field validation.</p>
   <div className="lab-grid">{MANUAL_CASES.map(test=><button key={test.id} className={`lab-case ${selected?.id===test.id?'selected':''}`} disabled={disabled||Boolean(busy)} onClick={()=>load(test)}><span className="case-number">{test.icon}</span><strong>{busy===test.id?'Loading images…':test.name}</strong><small>{test.detail}</small><span className={`case-kind ${test.negative?'negative':''}`}>{test.negative?'SHOULD REJECT':'SHOULD MATCH'}</span></button>)}</div>
  </div>}
  {error && <p className="lab-error" role="alert">{error}</p>}
  {selected && <div className="lab-expectation" aria-live="polite"><span className="eyebrow">{selected.name} / EXPECTED RESULT</span><p>{selected.expect}</p>{assessment && <div className={`lab-verdict ${assessment.pass?'pass':'fail'}`}><strong>{assessment.pass?'PASS':'CHECK FAILED'}</strong> {assessment.text}</div>}</div>}
 </section>;
}
