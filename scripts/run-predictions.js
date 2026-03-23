const fs = require('fs');
const { resolve } = require('./team-names');

// ═══════════════════════════════════════════════════════
// PREDICTION RUNNER v5 — FULL V8 ENGINE + LIVE STATS
//
// Complete v8 engine with ALL features:
// - L1-L5 algorithm layers
// - V8 Tier 1+2 advanced adjustments
// - Matchup details passthrough (3PT, size, TO, tempo)
// - Live ESPN stats via fetch-all-data
// - Moneyline passthrough for betting tab
// - Auto-advancing bracket with snapshot for grading
// ═══════════════════════════════════════════════════════

const data = JSON.parse(fs.readFileSync('data/latest.json', 'utf8'));
let teamDB = JSON.parse(fs.readFileSync('data/teams.json', 'utf8'));

let weights;
try { weights = JSON.parse(fs.readFileSync('data/weights.json', 'utf8')); }
catch { weights = { vegasBlend: 0.55, sigma: 11, recency: { em:.60, mg:.62, efg:.55, ast:.52, ftr:.47, orb:.47, tor:.42, tpt:.37 }, layers: { L1:.42, L2:.28, L3:.18, L4:.08, L5:.04 }, ensemble: { main:.80 }, version: 1 }; }

const BRACKET_FILE = 'data/bracket-state.json';
let bracketState;
try { bracketState = JSON.parse(fs.readFileSync(BRACKET_FILE, 'utf8')); }
catch { bracketState = { results: {}, advancedTo: {} }; }

console.log('\n🧠 Prediction Runner v5 — FULL V8 ENGINE');
console.log(`   Data: ${data.timestamp}`);
console.log(`   Weights v${weights.version || 1}, Vegas blend: ${(weights.vegasBlend * 100).toFixed(1)}%\n`);

// ═══════════════════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════════════════
function Phi(x) { const s=x<0?-1:1,a=Math.abs(x)/1.414;const t=1/(1+.3275911*a);return .5*(1+s*(1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a)))); }
function iso(r) { const b=[[.5,.5],[.55,.543],[.6,.576],[.65,.625],[.7,.688],[.75,.74],[.8,.798],[.85,.83],[.9,.889],[.95,.955],[1,1]];const p=Math.max(.5,Math.min(1,r));for(let i=0;i<b.length-1;i++){const[x0,y0]=b[i],[x1,y1]=b[i+1];if(p>=x0&&p<=x1)return y0+(p-x0)/(x1-x0)*(y1-y0);}return p; }
function hav(a1,o1,a2,o2) { const R=3959,dL=(a2-a1)*Math.PI/180,dO=(o2-o1)*Math.PI/180;const a=Math.sin(dL/2)**2+Math.cos(a1*Math.PI/180)*Math.cos(a2*Math.PI/180)*Math.sin(dO/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
function rw(s,r,w) { return s*(1-w)+r*w; }

const RW = weights.recency || { em:.60, mg:.62, efg:.55, ast:.52, ftr:.47, orb:.47, tor:.42, tpt:.37 };

// ═══════════════════════════════════════════════════════
// VENUE & LOCATION DATA
// ═══════════════════════════════════════════════════════
const VEN={"Dayton":[39.758,-84.191],"Buffalo":[42.886,-78.878],"Greenville":[34.852,-82.394],"OKC":[35.468,-97.516],"Portland":[45.531,-122.666],"Tampa":[27.951,-82.457],"Philadelphia":[39.952,-75.164],"San Diego":[32.716,-117.161],"St. Louis":[38.627,-90.199],"Washington DC":[38.907,-77.037],"Houston":[29.760,-95.370],"Chicago":[41.878,-87.630],"San Jose":[37.338,-121.886],"Indianapolis":[39.768,-86.158]};
const LOC={"Duke":[36.001,-78.938],"Arizona":[32.232,-110.950],"Michigan":[42.278,-83.738],"Florida":[29.644,-82.345],"UConn":[41.808,-72.254],"Houston":[29.720,-95.339],"Iowa State":[42.027,-93.648],"Purdue":[40.424,-86.913],"Gonzaga":[47.667,-117.402],"Michigan St.":[42.731,-84.482],"Illinois":[40.102,-88.227],"Arkansas":[36.068,-94.175],"Kansas":[38.955,-95.255],"Nebraska":[40.820,-96.706],"Wisconsin":[43.076,-89.412],"Texas Tech":[33.585,-101.845],"St. John's":[40.726,-73.795],"Vanderbilt":[36.144,-86.803],"Alabama":[33.214,-87.539],"Louisville":[38.213,-85.758],"N. Carolina":[35.905,-79.047],"BYU":[40.250,-111.649],"UCLA":[34.069,-118.445],"St. Mary's":[37.838,-122.108],"Kentucky":[38.039,-84.504],"Miami FL":[25.721,-80.279],"Ohio State":[40.007,-83.030],"Iowa":[41.661,-91.535],"Georgia":[33.948,-83.375],"TCU":[32.710,-97.363],"Missouri":[38.940,-92.328],"Clemson":[34.676,-82.837],"VCU":[37.549,-77.453],"Akron":[41.076,-81.512],"Saint Louis":[38.637,-90.234],"Santa Clara":[37.349,-121.938],"S. Florida":[28.064,-82.413],"Hofstra":[40.715,-73.601],"High Point":[35.949,-79.997],"McNeese":[30.211,-93.210],"Troy":[31.799,-85.956],"N. Iowa":[42.514,-92.456],"Cal Baptist":[33.930,-117.426],"UCF":[28.602,-81.200],"N. Dakota St.":[46.897,-96.801],"Furman":[34.850,-82.440],"Wright St.":[39.782,-84.062],"Miami OH":[39.509,-84.735],"SMU":[32.842,-96.783],"Texas":[30.284,-97.733],"Siena":[42.719,-73.752],"Penn":[39.952,-75.193],"Idaho":[46.726,-117.014],"Queens":[35.230,-80.843],"Hawaii":[21.297,-157.817],"UMBC":[39.255,-76.711],"Tennessee":[35.955,-83.925],"Villanova":[40.037,-75.346],"Utah State":[41.745,-111.810],"Tennessee St.":[36.167,-86.783],"Texas A&M":[30.612,-96.341],"Lehigh":[40.608,-75.378],"Virginia":[38.034,-78.508],"LIU":[40.689,-73.981],"Kennesaw St.":[34.036,-84.581],"NC State":[35.786,-78.663],"Howard":[38.922,-77.019],"Prairie View":[30.088,-95.986]};

function getDist(team,venue) { const s=LOC[team],v=VEN[venue];if(!s||!v)return 999;return Math.round(hav(s[0],s[1],v[0],v[1])); }
function getHCA(team,venue,hb) { const d=getDist(team,venue);if(d<=50)return{d,b:hb||3.3,tag:"HOME"};if(d<=150)return{d,b:(hb||3.3)*.4,tag:"NEAR"};return{d,b:0,tag:null}; }

// ═══════════════════════════════════════════════════════
// FATIGUE SYSTEM (L5)
// ═══════════════════════════════════════════════════════
const FAT={"Duke":{bp:26,ctg:3,sm:33.5,rot:7,gp:35},"Arizona":{bp:30,ctg:3,sm:32.0,rot:8,gp:35},"Michigan":{bp:24,ctg:3,sm:34.5,rot:7,gp:35},"Florida":{bp:28,ctg:2,sm:33.0,rot:8,gp:34},"UConn":{bp:27,ctg:2,sm:34.0,rot:7,gp:35},"Houston":{bp:25,ctg:2,sm:34.5,rot:7,gp:35},"Iowa State":{bp:29,ctg:2,sm:32.5,rot:8,gp:35},"Purdue":{bp:23,ctg:3,sm:35.0,rot:7,gp:38},"Michigan St.":{bp:32,ctg:2,sm:31.0,rot:9,gp:34},"Illinois":{bp:27,ctg:2,sm:33.5,rot:7,gp:34},"Gonzaga":{bp:28,ctg:2,sm:33.0,rot:7,gp:35},"Virginia":{bp:25,ctg:3,sm:33.5,rot:7,gp:37},"Kansas":{bp:17,ctg:2,sm:36.0,rot:6,gp:35},"Nebraska":{bp:28,ctg:2,sm:33.0,rot:8,gp:34},"Arkansas":{bp:30,ctg:4,sm:32.0,rot:8,gp:38},"Alabama":{bp:31,ctg:2,sm:31.5,rot:9,gp:34},"St. John's":{bp:24,ctg:4,sm:34.0,rot:7,gp:37},"Vanderbilt":{bp:27,ctg:3,sm:33.0,rot:8,gp:36},"Texas Tech":{bp:22,ctg:1,sm:35.5,rot:6,gp:34},"Wisconsin":{bp:26,ctg:2,sm:33.5,rot:7,gp:35},"Louisville":{bp:33,ctg:2,sm:30.5,rot:9,gp:34},"N. Carolina":{bp:24,ctg:2,sm:34.0,rot:7,gp:35},"BYU":{bp:28,ctg:2,sm:33.0,rot:8,gp:35},"Tennessee":{bp:27,ctg:2,sm:33.5,rot:7,gp:35},"UCLA":{bp:27,ctg:2,sm:33.0,rot:8,gp:34},"St. Mary's":{bp:25,ctg:2,sm:34.0,rot:7,gp:34},"Kentucky":{bp:29,ctg:1,sm:32.5,rot:8,gp:34},"Miami FL":{bp:28,ctg:2,sm:33.0,rot:8,gp:34},"Ohio State":{bp:26,ctg:2,sm:34.0,rot:7,gp:35},"Clemson":{bp:24,ctg:2,sm:34.5,rot:7,gp:35},"Iowa":{bp:26,ctg:1,sm:33.5,rot:7,gp:35},"Georgia":{bp:34,ctg:2,sm:30.0,rot:9,gp:34},"Villanova":{bp:27,ctg:2,sm:33.0,rot:8,gp:34},"Utah State":{bp:28,ctg:2,sm:33.0,rot:8,gp:36},"TCU":{bp:26,ctg:1,sm:34.0,rot:7,gp:34},"Saint Louis":{bp:30,ctg:3,sm:32.0,rot:8,gp:36},"VCU":{bp:29,ctg:3,sm:32.5,rot:8,gp:36},"S. Florida":{bp:28,ctg:3,sm:33.0,rot:8,gp:36},"UCF":{bp:27,ctg:1,sm:33.5,rot:7,gp:34},"Texas A&M":{bp:32,ctg:1,sm:30.5,rot:9,gp:34},"Santa Clara":{bp:27,ctg:2,sm:33.5,rot:7,gp:35},"Missouri":{bp:28,ctg:1,sm:33.0,rot:8,gp:34},"SMU":{bp:30,ctg:2,sm:32.0,rot:8,gp:35},"Texas":{bp:27,ctg:1,sm:33.5,rot:7,gp:34},"Miami OH":{bp:25,ctg:1,sm:34.5,rot:7,gp:34},"NC State":{bp:28,ctg:2,sm:33.0,rot:8,gp:35},"N. Iowa":{bp:27,ctg:2,sm:33.5,rot:7,gp:34},"McNeese":{bp:30,ctg:2,sm:31.5,rot:8,gp:35},"Akron":{bp:27,ctg:3,sm:33.0,rot:8,gp:38},"High Point":{bp:29,ctg:3,sm:32.5,rot:8,gp:36},"Cal Baptist":{bp:28,ctg:2,sm:33.0,rot:8,gp:35},"Troy":{bp:28,ctg:3,sm:33.0,rot:8,gp:37},"Hofstra":{bp:27,ctg:3,sm:33.5,rot:7,gp:36},"Hawaii":{bp:28,ctg:2,sm:33.0,rot:8,gp:35},"N. Dakota St.":{bp:28,ctg:2,sm:33.0,rot:8,gp:36},"Penn":{bp:26,ctg:2,sm:34.0,rot:7,gp:30},"Wright St.":{bp:27,ctg:3,sm:33.0,rot:8,gp:36},"Kennesaw St.":{bp:29,ctg:3,sm:32.5,rot:8,gp:37},"Furman":{bp:28,ctg:3,sm:33.0,rot:8,gp:37},"Idaho":{bp:29,ctg:2,sm:32.5,rot:8,gp:35},"Queens":{bp:27,ctg:2,sm:33.5,rot:7,gp:36},"Tennessee St.":{bp:29,ctg:2,sm:32.5,rot:8,gp:34},"Siena":{bp:28,ctg:3,sm:33.0,rot:8,gp:37},"LIU":{bp:28,ctg:2,sm:33.0,rot:8,gp:36},"UMBC":{bp:28,ctg:2,sm:33.0,rot:8,gp:34},"Lehigh":{bp:27,ctg:2,sm:33.5,rot:7,gp:36},"Howard":{bp:28,ctg:2,sm:33.0,rot:8,gp:35},"Prairie View":{bp:29,ctg:2,sm:32.5,rot:8,gp:35}};

function fatigue(name, round) {
  const f=FAT[name];if(!f||round<=1)return 0;
  const benchVuln=Math.max(0,(30-f.bp)/20),starLoad=Math.max(0,(f.sm-31)/7),rotVuln=Math.max(0,(8-f.rot)/3),seasonWear=Math.max(0,(f.gp-33)/8),confTax=Math.max(0,(f.ctg-1)*0.15);
  const baseVuln=benchVuln*0.30+starLoad*0.25+rotVuln*0.25+seasonWear*0.10+confTax*0.10;
  const roundMult=[0,0,0.3,0.7,1.2,1.8,2.5][Math.min(round,6)];
  return -Math.round(baseVuln*roundMult*100)/100;
}

// ═══════════════════════════════════════════════════════
// V8 TIER 1+2 DATA
// ═══════════════════════════════════════════════════════
const V8={"Duke":{refSens:.7,starBPR:9.8,gsLead:44,gsTrail:35,closeW:5,closeL:1,lineDir:.7,minCont:42,expRk:180,tz:0,foulStar:2.1,backupDrop:8},"Arizona":{refSens:.5,starBPR:7.5,gsLead:40,gsTrail:33,closeW:4,closeL:2,lineDir:.3,minCont:35,expRk:45,tz:-2,foulStar:2.5,backupDrop:5},"Michigan":{refSens:.5,starBPR:8.2,gsLead:42,gsTrail:34,closeW:3,closeL:2,lineDir:-.2,minCont:28,expRk:120,tz:0,foulStar:2.3,backupDrop:6},"Florida":{refSens:.8,starBPR:7.0,gsLead:35,gsTrail:28,closeW:6,closeL:3,lineDir:.2,minCont:55,expRk:60,tz:0,foulStar:2.8,backupDrop:5},"UConn":{refSens:.6,starBPR:7.8,gsLead:34,gsTrail:27,closeW:3,closeL:3,lineDir:.3,minCont:48,expRk:90,tz:0,foulStar:2.2,backupDrop:6},"Houston":{refSens:.7,starBPR:6.5,gsLead:32,gsTrail:25,closeW:5,closeL:3,lineDir:0,minCont:52,expRk:35,tz:-1,foulStar:2.0,backupDrop:4},"Iowa State":{refSens:.5,starBPR:6.8,gsLead:30,gsTrail:25,closeW:4,closeL:3,lineDir:.2,minCont:68,expRk:15,tz:-1,foulStar:2.4,backupDrop:5},"Purdue":{refSens:.6,starBPR:8.5,gsLead:32,gsTrail:24,closeW:3,closeL:4,lineDir:.5,minCont:72,expRk:25,tz:0,foulStar:3.0,backupDrop:7},"Michigan St.":{refSens:.5,starBPR:6.5,gsLead:30,gsTrail:24,closeW:5,closeL:2,lineDir:.2,minCont:58,expRk:40,tz:0,foulStar:2.3,backupDrop:4},"Illinois":{refSens:.6,starBPR:7.2,gsLead:32,gsTrail:22,closeW:0,closeL:4,lineDir:-.3,minCont:45,expRk:75,tz:-1,foulStar:2.6,backupDrop:6},"Gonzaga":{refSens:.5,starBPR:6.8,gsLead:30,gsTrail:23,closeW:3,closeL:1,lineDir:-.2,minCont:60,expRk:55,tz:-3,foulStar:2.4,backupDrop:5},"Virginia":{refSens:.4,starBPR:5.8,gsLead:25,gsTrail:20,closeW:5,closeL:2,lineDir:.1,minCont:50,expRk:30,tz:0,foulStar:2.2,backupDrop:4},"Kansas":{refSens:.7,starBPR:8.0,gsLead:28,gsTrail:16,closeW:2,closeL:5,lineDir:-.5,minCont:30,expRk:160,tz:-1,foulStar:2.8,backupDrop:9},"Nebraska":{refSens:.5,starBPR:5.5,gsLead:24,gsTrail:19,closeW:4,closeL:2,lineDir:.1,minCont:55,expRk:50,tz:-1,foulStar:2.5,backupDrop:5},"Arkansas":{refSens:.7,starBPR:6.8,gsLead:28,gsTrail:22,closeW:3,closeL:4,lineDir:.3,minCont:25,expRk:130,tz:-1,foulStar:2.6,backupDrop:5},"Alabama":{refSens:.5,starBPR:8.5,gsLead:26,gsTrail:20,closeW:3,closeL:4,lineDir:-.5,minCont:38,expRk:110,tz:-1,foulStar:2.2,backupDrop:7},"St. John's":{refSens:.5,starBPR:6.2,gsLead:28,gsTrail:22,closeW:4,closeL:3,lineDir:.8,minCont:40,expRk:70,tz:0,foulStar:2.5,backupDrop:5},"Vanderbilt":{refSens:.6,starBPR:7.0,gsLead:26,gsTrail:20,closeW:3,closeL:2,lineDir:.2,minCont:50,expRk:65,tz:-1,foulStar:2.4,backupDrop:5},"Texas Tech":{refSens:.8,starBPR:7.2,gsLead:26,gsTrail:18,closeW:2,closeL:3,lineDir:-.5,minCont:35,expRk:100,tz:-1,foulStar:2.7,backupDrop:8},"Wisconsin":{refSens:.4,starBPR:5.8,gsLead:24,gsTrail:18,closeW:4,closeL:3,lineDir:0,minCont:65,expRk:20,tz:-1,foulStar:2.3,backupDrop:4},"Louisville":{refSens:.6,starBPR:7.5,gsLead:24,gsTrail:18,closeW:2,closeL:3,lineDir:-.2,minCont:30,expRk:140,tz:0,foulStar:2.5,backupDrop:7},"N. Carolina":{refSens:.5,starBPR:5.0,gsLead:22,gsTrail:15,closeW:3,closeL:5,lineDir:-.3,minCont:52,expRk:80,tz:0,foulStar:2.6,backupDrop:6},"BYU":{refSens:.5,starBPR:9.2,gsLead:24,gsTrail:16,closeW:2,closeL:4,lineDir:0,minCont:32,expRk:150,tz:-2,foulStar:2.8,backupDrop:10},"Tennessee":{refSens:.6,starBPR:6.0,gsLead:25,gsTrail:19,closeW:3,closeL:4,lineDir:.1,minCont:48,expRk:55,tz:0,foulStar:2.4,backupDrop:5},"UCLA":{refSens:.5,starBPR:6.0,gsLead:22,gsTrail:16,closeW:3,closeL:3,lineDir:.1,minCont:55,expRk:45,tz:-3,foulStar:2.3,backupDrop:5},"St. Mary's":{refSens:.4,starBPR:5.5,gsLead:22,gsTrail:18,closeW:4,closeL:2,lineDir:0,minCont:70,expRk:10,tz:-3,foulStar:2.2,backupDrop:4},"Kentucky":{refSens:.7,starBPR:5.8,gsLead:20,gsTrail:14,closeW:2,closeL:5,lineDir:-.2,minCont:22,expRk:190,tz:0,foulStar:3.0,backupDrop:6},"Miami FL":{refSens:.5,starBPR:6.5,gsLead:20,gsTrail:16,closeW:3,closeL:3,lineDir:.1,minCont:45,expRk:60,tz:0,foulStar:2.4,backupDrop:5},"Ohio State":{refSens:.5,starBPR:6.8,gsLead:20,gsTrail:15,closeW:3,closeL:4,lineDir:0,minCont:42,expRk:85,tz:0,foulStar:2.5,backupDrop:6},"Clemson":{refSens:.5,starBPR:5.5,gsLead:20,gsTrail:14,closeW:2,closeL:4,lineDir:-.2,minCont:48,expRk:70,tz:0,foulStar:2.6,backupDrop:5},"Iowa":{refSens:.5,starBPR:5.8,gsLead:19,gsTrail:14,closeW:3,closeL:3,lineDir:.1,minCont:35,expRk:95,tz:-1,foulStar:2.4,backupDrop:5},"Georgia":{refSens:.5,starBPR:6.0,gsLead:20,gsTrail:14,closeW:2,closeL:3,lineDir:-.1,minCont:40,expRk:75,tz:0,foulStar:2.5,backupDrop:5},"Villanova":{refSens:.5,starBPR:5.8,gsLead:20,gsTrail:14,closeW:3,closeL:3,lineDir:0,minCont:38,expRk:90,tz:0,foulStar:2.4,backupDrop:5},"Utah State":{refSens:.5,starBPR:6.0,gsLead:22,gsTrail:17,closeW:3,closeL:2,lineDir:.1,minCont:60,expRk:30,tz:-2,foulStar:2.3,backupDrop:4},"TCU":{refSens:.5,starBPR:5.5,gsLead:18,gsTrail:13,closeW:2,closeL:3,lineDir:0,minCont:45,expRk:65,tz:-1,foulStar:2.5,backupDrop:5},"Saint Louis":{refSens:.5,starBPR:6.5,gsLead:22,gsTrail:16,closeW:4,closeL:2,lineDir:.2,minCont:65,expRk:25,tz:-1,foulStar:2.3,backupDrop:4},"VCU":{refSens:.5,starBPR:5.8,gsLead:22,gsTrail:16,closeW:4,closeL:2,lineDir:.5,minCont:60,expRk:35,tz:0,foulStar:2.4,backupDrop:4},"S. Florida":{refSens:.5,starBPR:5.5,gsLead:20,gsTrail:14,closeW:3,closeL:2,lineDir:.1,minCont:55,expRk:50,tz:0,foulStar:2.5,backupDrop:5},"UCF":{refSens:.5,starBPR:5.2,gsLead:18,gsTrail:12,closeW:2,closeL:3,lineDir:-.1,minCont:30,expRk:110,tz:0,foulStar:2.5,backupDrop:5},"Texas A&M":{refSens:.5,starBPR:5.0,gsLead:20,gsTrail:15,closeW:3,closeL:3,lineDir:0,minCont:50,expRk:8,tz:-1,foulStar:2.3,backupDrop:4},"Santa Clara":{refSens:.4,starBPR:5.8,gsLead:20,gsTrail:15,closeW:3,closeL:2,lineDir:.1,minCont:62,expRk:20,tz:-3,foulStar:2.3,backupDrop:4},"Missouri":{refSens:.5,starBPR:6.2,gsLead:18,gsTrail:13,closeW:2,closeL:3,lineDir:0,minCont:32,expRk:105,tz:-1,foulStar:2.5,backupDrop:6},"SMU":{refSens:.5,starBPR:5.5,gsLead:20,gsTrail:15,closeW:3,closeL:3,lineDir:0,minCont:40,expRk:80,tz:-1,foulStar:2.4,backupDrop:5},"Texas":{refSens:.5,starBPR:5.0,gsLead:16,gsTrail:12,closeW:2,closeL:4,lineDir:-.2,minCont:35,expRk:100,tz:-1,foulStar:2.6,backupDrop:5},"Akron":{refSens:.5,starBPR:5.5,gsLead:16,gsTrail:11,closeW:4,closeL:1,lineDir:.2,minCont:72,expRk:12,tz:0,foulStar:2.4,backupDrop:4},"N. Iowa":{refSens:.4,starBPR:5.0,gsLead:14,gsTrail:8,closeW:3,closeL:2,lineDir:0,minCont:75,expRk:5,tz:-1,foulStar:2.3,backupDrop:4},"McNeese":{refSens:.5,starBPR:5.5,gsLead:16,gsTrail:10,closeW:3,closeL:1,lineDir:0,minCont:55,expRk:40,tz:-1,foulStar:2.5,backupDrop:5},"High Point":{refSens:.5,starBPR:5.0,gsLead:12,gsTrail:6,closeW:3,closeL:2,lineDir:0,minCont:50,expRk:45,tz:0,foulStar:2.5,backupDrop:5},"Hofstra":{refSens:.5,starBPR:6.0,gsLead:14,gsTrail:8,closeW:3,closeL:2,lineDir:.1,minCont:50,expRk:50,tz:0,foulStar:2.4,backupDrop:5},"NC State":{refSens:.5,starBPR:5.8,gsLead:12,gsTrail:8,closeW:2,closeL:4,lineDir:0,minCont:20,expRk:170,tz:0,foulStar:2.5,backupDrop:5},"Miami OH":{refSens:.5,starBPR:5.5,gsLead:22,gsTrail:15,closeW:5,closeL:1,lineDir:.3,minCont:70,expRk:15,tz:0,foulStar:2.3,backupDrop:4}};
const V8D={refSens:.5,starBPR:4.5,gsLead:10,gsTrail:5,closeW:2,closeL:2,lineDir:0,minCont:40,expRk:200,tz:0,foulStar:2.5,backupDrop:5};
function v8get(n){return V8[n]||V8D;}

// ═══════════════════════════════════════════════════════
// BUILD TEAM (recency-weighted stats from DB)
// ═══════════════════════════════════════════════════════
function buildT(n) {
  const t=teamDB[n];if(!t)return null;
  return{em:rw(t.em,t.em_r,RW.em),efg:rw(t.efg,t.efg_r,RW.efg),tor:rw(t.tor,t.tor_r,RW.tor),orb:rw(t.orb,t.orb_r,RW.orb),ftr:rw(t.ftr,t.ftr_r,RW.ftr),tpt:rw(t.tpt,t.tpt_r,RW.tpt),ast:rw(t.ast,t.ast_r,RW.ast),mg:rw(t.mg,t.mg_r,RW.mg),o:rw(t.o,t.o_r,RW.em),d:rw(t.d,t.d_r,RW.em),t:t.t,elo:t.elo||1500,lk:t.lk||0,st:t.st||0,ci:t.ci||0,ij:t.ij||0,s:t.s,hb:t.hb||3.3,kp:t.kp,rec:t.rec,coach:t.coach,cAdj:t.cAdj||0,sty:t.style,name:n};
}

// ═══════════════════════════════════════════════════════
// MATCHUP-ADJUSTED FOUR FACTORS (with detail passthrough)
// ═══════════════════════════════════════════════════════
function matchupAdjust(nA,nB) {
  const a=teamDB[nA]?.style, b=teamDB[nB]?.style;
  const adjA={efg:0,tor:0,orb:0,ftr:0}, adjB={efg:0,tor:0,orb:0,ftr:0};
  const det=[];
  let tempoAdj=0;
  if(!a||!b) return {adjA,adjB,det,tempoAdj};

  // 1. 3PT OFFENSE vs 3PT DEFENSE
  if(a.p3>=0.42&&b.d3r<=25){
    const pen=-(a.p3-0.35)*5.0;
    adjA.efg+=pen;
    det.push({t:"3PT vs Elite 3PT-D",stat:"eFG%",team:nA,i:pen,d:`${nA}'s 3PT-heavy (${(a.p3*100).toFixed(0)}%) faces ${nB}'s #${b.d3r} 3PT D`});
  }
  if(b.p3>=0.42&&a.d3r<=25){
    const pen=-(b.p3-0.35)*5.0;
    adjB.efg+=pen;
    det.push({t:"3PT vs Elite 3PT-D",stat:"eFG%",team:nB,i:pen,d:`${nB}'s 3PT-heavy (${(b.p3*100).toFixed(0)}%) faces ${nA}'s #${a.d3r} 3PT D`});
  }
  if(a.p3>=0.42&&b.d3r>=100){
    const bst=(a.p3-0.38)*3.5;
    adjA.efg+=bst;
    det.push({t:"3PT feast",stat:"eFG%",team:nA,i:bst,d:`${nA}'s 3PT attack vs ${nB}'s weak 3PT D (#${b.d3r})`});
  }
  if(b.p3>=0.42&&a.d3r>=100){
    const bst=(b.p3-0.38)*3.5;
    adjB.efg+=bst;
    det.push({t:"3PT feast",stat:"eFG%",team:nB,i:bst,d:`${nB}'s 3PT attack vs ${nA}'s weak 3PT D (#${a.d3r})`});
  }

  // 2. SIZE MISMATCH
  const htDiff=a.ht-b.ht;
  if(Math.abs(htDiff)>=2){
    adjA.orb+=htDiff*0.4;adjB.orb-=htDiff*0.4;
    adjA.ftr+=htDiff*0.25;adjB.ftr-=htDiff*0.25;
    det.push({t:"Size mismatch",stat:"ORB% & FTR",team:htDiff>0?nA:nB,i:Math.abs(htDiff*0.4),
      d:`${htDiff>0?nA:nB} has ${Math.abs(htDiff)}" height edge`});
  }

  // 3. TURNOVER-FORCING DEFENSE
  if(a.toF>=11.0){
    const toAdj=(a.toF-10.0)*0.5;
    adjB.tor+=toAdj;
    det.push({t:"Disruptive defense",stat:"TO Rate",team:nB,i:toAdj,
      d:`${nA} forces ${a.toF} TOs/g → ${nB}'s TO rate +${toAdj.toFixed(1)}%`});
  }
  if(b.toF>=11.0){
    const toAdj=(b.toF-10.0)*0.5;
    adjA.tor+=toAdj;
    det.push({t:"Disruptive defense",stat:"TO Rate",team:nA,i:toAdj,
      d:`${nB} forces ${b.toF} TOs/g → ${nA}'s TO rate +${toAdj.toFixed(1)}%`});
  }

  // 4. TEMPO CLASH
  const td=Math.abs(a.t-b.t);
  if(td>=5){
    tempoAdj=a.t<b.t?0.3:-0.3;
    det.push({t:"Tempo clash",stat:"Pace",team:a.t<b.t?nA:nB,i:tempoAdj,
      d:`${Math.round(td)}-possession gap — ${a.t<b.t?nA:nB}'s pace controls`});
  }

  return {adjA,adjB,det,tempoAdj};
}

// ═══════════════════════════════════════════════════════
// V8 TIER 1+2 ADJUSTMENT FUNCTIONS
// ═══════════════════════════════════════════════════════
function refAdj(nA,nB){const a=v8get(nA),b=v8get(nB);return(b.refSens-a.refSens)*0.3;}
function gameStateAdj(nA,nB,spread){const a=v8get(nA),b=v8get(nB);let adj=0;if(spread>0){adj+=(a.gsLead-a.gsTrail)/200;adj-=(b.gsTrail-b.gsLead+10)/200;}else{adj-=(b.gsLead-b.gsTrail)/200;adj+=(a.gsTrail-a.gsLead+10)/200;}const aWP=a.closeW/(a.closeW+a.closeL+.001),bWP=b.closeW/(b.closeW+b.closeL+.001);adj+=(aWP-bWP)*0.8;return Math.round(adj*100)/100;}
function sharpAdj(nA,nB){const a=v8get(nA),b=v8get(nB);return(a.lineDir-b.lineDir)*0.5;}
function continuityAdj(nA,nB){const a=v8get(nA),b=v8get(nB);return Math.round(((a.minCont-b.minCont)/100*0.6+(b.expRk-a.expRk)/200*0.4)*100)/100;}
function tzAdj(nA,nB,ven){const a=v8get(nA),b=v8get(nB);const vtz={"Buffalo":0,"Greenville":0,"Tampa":0,"Philadelphia":0,"Washington DC":0,"OKC":-1,"St. Louis":-1,"Houston":-1,"Chicago":-1,"Dayton":0,"Portland":-3,"San Diego":-3,"San Jose":-3,"Indianapolis":0}[ven]||0;return(Math.abs((b.tz||0)-vtz)-Math.abs((a.tz||0)-vtz))*0.15;}
function foulAdj(nA,nB){const a=v8get(nA),b=v8get(nB);return Math.round(((b.foulStar/5)*(b.backupDrop/10)*0.3-(a.foulStar/5)*(a.backupDrop/10)*0.3)*100)/100;}
function ensemble(a,b,tf){const m1=1.1*(a.em-b.em)*tf;const m2=(a.elo-b.elo)/25*1.2;const m3=((a.efg-b.efg)*1.8*.4+(b.tor-a.tor)*1.2*.25+(a.orb-b.orb)*.7*.18+(a.ftr-b.ftr)*.6*.17)*tf;return{avg:Math.round((m1+m2+m3)/3*10)/10,agree:Math.sign(m1)===Math.sign(m2)&&Math.sign(m2)===Math.sign(m3)};}

// ═══════════════════════════════════════════════════════
// FULL SIM FUNCTION — v8 engine with matchup details
// ═══════════════════════════════════════════════════════
function sim(nA, nB, venue, round) {
  const a=buildT(nA), b=buildT(nB);
  if(!a||!b) return null;

  const pA=getHCA(nA,venue,a.hb), pB=getHCA(nB,venue,b.hb);
  let hcav=0;
  if(pA.tag==="HOME"&&!pB.tag)hcav=pA.b;else if(pB.tag==="HOME"&&!pA.tag)hcav=-pB.b;
  else if(pA.tag==="NEAR"&&!pB.tag)hcav=pA.b;else if(pB.tag==="NEAR"&&!pA.tag)hcav=-pB.b;

  const mu=matchupAdjust(nA,nB);
  const aEfg=a.efg+mu.adjA.efg, bEfg=b.efg+mu.adjB.efg;
  const aTor=a.tor+mu.adjA.tor, bTor=b.tor+mu.adjB.tor;
  const aOrb=a.orb+mu.adjA.orb, bOrb=b.orb+mu.adjB.orb;
  const aFtr=a.ftr+mu.adjA.ftr, bFtr=b.ftr+mu.adjB.ftr;

  const cDiff=((a.cAdj||0)-(b.cAdj||0))*0.6;
  const tf=(a.t+b.t)/200;
  const rd=round||1;

  const L1=1.1*(a.em-b.em)*tf;
  const L2=((aEfg-bEfg)*1.8*.4+(bTor-aTor)*1.2*.25+(aOrb-bOrb)*.7*.18+(aFtr-bFtr)*.6*.17)*tf*.65;
  const L3=((a.ast-b.ast)*.06+(a.elo-b.elo)/25*.3-((a.lk||0)-(b.lk||0))*4+((a.st||0)-(b.st||0))*1.2-(b.ci||0)*.5+(a.ij||0)-(b.ij||0)+hcav)*.65;
  const L4=(mu.tempoAdj+cDiff)*.65;
  const L5=fatigue(nA,rd)-fatigue(nB,rd);

  const rawSp0=L1+L2+L3+L4+L5;
  const v8total=refAdj(nA,nB)+gameStateAdj(nA,nB,rawSp0)+sharpAdj(nA,nB)+continuityAdj(nA,nB)+tzAdj(nA,nB,venue)+foulAdj(nA,nB);
  const ens=ensemble(a,b,tf);

  const modelSp=(rawSp0+v8total)*0.80+ens.avg*0.20;

  // Vegas blend
  const vKey1=`${nA} vs ${nB}`;
  const vKey2=`${nB} vs ${nA}`;
  const vegasLine=vegasLines[vKey1]??(vegasLines[vKey2]!=null?-vegasLines[vKey2]:null);
  const blend=weights.vegasBlend||0.55;
  const finalSp=vegasLine!==null?modelSp*(1-blend)+vegasLine*blend:modelSp;

  const sigma=weights.sigma||11;
  const rawP=Phi(finalSp/sigma);
  const wp=iso(Math.max(rawP,1-rawP));

  const w=finalSp>=0?nA:nB, l=finalSp>=0?nB:nA;
  const at=(a.t+b.t)/2;
  const avgPts=(at*(a.o+b.d)/200+at*(b.o+a.d)/200)/2;
  const sW=Math.round(avgPts+Math.abs(finalSp)/2);
  const sL=Math.round(avgPts-Math.abs(finalSp)/2);
  const edge=vegasLine!==null?Math.round((modelSp-vegasLine)*10)/10:null;

  const r5=v=>Math.round(v*2)/2; // round to nearest 0.5

  return{
    teamA:nA,teamB:nB,round:rd,venue,
    winner:w,loser:l,w:w,l:l,
    scoreW:Math.max(sW,sL+1),scoreL:Math.min(sL,sW-1),
    sW:Math.max(sW,sL+1),sL:Math.min(sL,sW-1),
    winProb:Math.round(wp*1000)/10,
    wp:Math.round(wp*1000)/10,
    sp:Math.abs(r5(finalSp)),
    modelSpread:r5(modelSp),
    blendedSpread:r5(finalSp),
    vegasLine:vegasLine!==null?Math.round(vegasLine*10)/10:null,
    edge,
    moneyline:moneyLines[`${nA} vs ${nB}`]||null,
    hca:Math.round(hcav*10)/10,
    L1:Math.round(L1*10)/10,L2:Math.round(L2*10)/10,L3:Math.round(L3*10)/10,L4:Math.round(L4*10)/10,L5:Math.round(L5*10)/10,
    v8adj:Math.round(v8total*100)/100,
    ensAvg:ens.avg,ensAgree:ens.agree,
    injuryFlagA:injuredTeams[nA]?injuredTeams[nA].length+' articles':null,
    injuryFlagB:injuredTeams[nB]?injuredTeams[nB].length+' articles':null,
    status:'UPCOMING',
    sW2:(buildT(w)||{}).s||0,sL2:(buildT(l)||{}).s||0,
    ven:venue,
    modelSp:r5(modelSp),
    vegasSp:vegasLine!==null?r5(vegasLine):null,
    rawSp:r5(finalSp),
    mu:{det:mu.det||[],adjA:mu.adjA,adjB:mu.adjB,tempoAdj:mu.tempoAdj},
    cDiff:Math.round(cDiff*10)/10,
    fatA:{pts:fatigue(nA,rd)},fatB:{pts:fatigue(nB,rd)},
    rd:rd,
    v8:{ref:Math.round(refAdj(nA,nB)*100)/100,gs:Math.round(gameStateAdj(nA,nB,rawSp0)*100)/100,sharp:Math.round(sharpAdj(nA,nB)*100)/100,cont:Math.round(continuityAdj(nA,nB)*100)/100,tz:Math.round(tzAdj(nA,nB,venue)*100)/100,foul:Math.round(foulAdj(nA,nB)*100)/100,ens:ens,total:Math.round(v8total*100)/100},
    adjStats:{aEfg:Math.round(aEfg*10)/10,bEfg:Math.round(bEfg*10)/10,aTor:Math.round(aTor*10)/10,bTor:Math.round(bTor*10)/10,aOrb:Math.round(aOrb*10)/10,bOrb:Math.round(bOrb*10)/10,aFtr:Math.round(aFtr*10)/10,bFtr:Math.round(bFtr*10)/10},
    ha:pA.tag==="HOME"?nA:pB.tag==="HOME"?nB:null,hb:Math.round(hcav*10)/10,
    a:a,b:b,
  };
}

// ═══════════════════════════════════════════════════════
// VEGAS LINES + MONEYLINES + ELO + INJURIES
// ═══════════════════════════════════════════════════════
const vegasLines={};
for(const[key,val]of Object.entries(data.odds)){
  if(val.spread!==null){
    const parts=key.split(' vs ');
    if(parts.length===2){
      const a=resolve(parts[0].trim(),teamDB)||parts[0].trim();
      const b=resolve(parts[1].trim(),teamDB)||parts[1].trim();
      vegasLines[`${a} vs ${b}`]=-val.spread;
      vegasLines[`${b} vs ${a}`]=val.spread;
    }
  }
}
const moneyLines={};
for(const[key,val]of Object.entries(data.odds)){
  if(val.mlHome!==null||val.mlAway!==null){
    const parts=key.split(' vs ');
    if(parts.length===2){
      const a=resolve(parts[0].trim(),teamDB)||parts[0].trim();
      const b=resolve(parts[1].trim(),teamDB)||parts[1].trim();
      moneyLines[`${a} vs ${b}`]=[val.mlHome||0,val.mlAway||0];
      moneyLines[`${b} vs ${a}`]=[val.mlAway||0,val.mlHome||0];
    }
  }
}
console.log(`📊 Loaded ${Object.keys(data.odds).length} Vegas lines`);
const vKeys = Object.keys(vegasLines).slice(0, 10);
vKeys.forEach(k => console.log(`   📈 ${k}: ${vegasLines[k] > 0 ? '+' : ''}${vegasLines[k]}`));

let eloUpdates=0;
for(const game of data.yesterdayResults||[]){const aName=resolve(game.teamA,teamDB),bName=resolve(game.teamB,teamDB);const a=aName?teamDB[aName]:null,b=bName?teamDB[bName]:null;if(!a||!b)continue;const K=20;const expected=1/(1+Math.pow(10,((b.elo||1500)-(a.elo||1500))/400));const actual=game.scoreA>game.scoreB?1:0;const mov=Math.min(Math.abs(game.scoreA-game.scoreB),25);const movMult=Math.log(mov+1)*0.8;a.elo=Math.round((a.elo||1500)+K*movMult*(actual-expected));b.elo=Math.round((b.elo||1500)+K*movMult*(expected-actual));eloUpdates++;}
console.log(`⚡ Updated Elo for ${eloUpdates} games`);

const injuredTeams={};
for(const article of data.injuries||[]){const text=(article.headline+' '+(article.description||'')).toLowerCase();for(const team of Object.keys(teamDB)){if(text.includes(team.toLowerCase())){if(!injuredTeams[team])injuredTeams[team]=[];injuredTeams[team].push(article.headline);}}}
if(Object.keys(injuredTeams).length>0)console.log(`🏥 Injury news for: ${Object.keys(injuredTeams).join(', ')}`);

// ═══════════════════════════════════════════════════════
// AUTO-ADVANCING BRACKET
// ═══════════════════════════════════════════════════════
const VENUE_MAP={
  E1:"Greenville",E2:"Greenville",E3:"Buffalo",E4:"Buffalo",E5:"Tampa",E6:"Buffalo",E7:"Philadelphia",E8:"Philadelphia",
  S1:"Tampa",S2:"Tampa",S3:"OKC",S4:"OKC",S5:"Greenville",S6:"Greenville",S7:"St. Louis",S8:"St. Louis",
  W1:"OKC",W2:"Philadelphia",W3:"OKC",W4:"Portland",W5:"Portland",W6:"Portland",W7:"San Diego",W8:"OKC",
  MW1:"Buffalo",MW2:"Buffalo",MW3:"OKC",MW4:"OKC",MW5:"St. Louis",MW6:"Philadelphia",MW7:"St. Louis",MW8:"St. Louis",
  FF1:"Dayton",FF2:"Dayton",FF3:"Dayton",FF4:"Dayton",
  E_R32_1:"Greenville",E_R32_2:"Buffalo",E_R32_3:"Tampa",E_R32_4:"Philadelphia",
  S_R32_1:"Tampa",S_R32_2:"OKC",S_R32_3:"Greenville",S_R32_4:"St. Louis",
  W_R32_1:"OKC",W_R32_2:"Portland",W_R32_3:"Portland",W_R32_4:"San Diego",
  MW_R32_1:"Buffalo",MW_R32_2:"OKC",MW_R32_3:"St. Louis",MW_R32_4:"St. Louis",
  E_S16_1:"Washington DC",E_S16_2:"Washington DC",S_S16_1:"Houston",S_S16_2:"Houston",W_S16_1:"San Jose",W_S16_2:"San Jose",MW_S16_1:"Chicago",MW_S16_2:"Chicago",
  E_E8:"Washington DC",S_E8:"Houston",W_E8:"San Jose",MW_E8:"Chicago",
  F4_1:"Indianapolis",F4_2:"Indianapolis",CHAMP:"Indianapolis",
};

const BRACKET=[
  {id:"FF1",a:"UMBC",b:"Howard",round:"First Four",feedsInto:"MW1",feedsAs:"b",rd:0},
  {id:"FF2",a:"Texas",b:"NC State",round:"First Four",feedsInto:"W5",feedsAs:"b",rd:0},
  {id:"FF3",a:"Lehigh",b:"Prairie View",round:"First Four",feedsInto:"S1",feedsAs:"b",rd:0},
  {id:"FF4",a:"SMU",b:"Miami OH",round:"First Four",feedsInto:"MW5",feedsAs:"b",rd:0},
  {id:"E1",a:"Duke",b:"Siena",round:"R64",feedsInto:"E_R32_1",feedsAs:"a",rd:1},{id:"E2",a:"Ohio State",b:"TCU",round:"R64",feedsInto:"E_R32_1",feedsAs:"b",rd:1},
  {id:"E3",a:"St. John's",b:"N. Iowa",round:"R64",feedsInto:"E_R32_2",feedsAs:"a",rd:1},{id:"E4",a:"Kansas",b:"Cal Baptist",round:"R64",feedsInto:"E_R32_2",feedsAs:"b",rd:1},
  {id:"E5",a:"Louisville",b:"S. Florida",round:"R64",feedsInto:"E_R32_3",feedsAs:"a",rd:1},{id:"E6",a:"Michigan St.",b:"N. Dakota St.",round:"R64",feedsInto:"E_R32_3",feedsAs:"b",rd:1},
  {id:"E7",a:"UCLA",b:"UCF",round:"R64",feedsInto:"E_R32_4",feedsAs:"a",rd:1},{id:"E8",a:"UConn",b:"Furman",round:"R64",feedsInto:"E_R32_4",feedsAs:"b",rd:1},
  {id:"S1",a:"Florida",b:null,round:"R64",feedsInto:"S_R32_1",feedsAs:"a",rd:1},{id:"S2",a:"Clemson",b:"Iowa",round:"R64",feedsInto:"S_R32_1",feedsAs:"b",rd:1},
  {id:"S3",a:"Vanderbilt",b:"McNeese",round:"R64",feedsInto:"S_R32_2",feedsAs:"a",rd:1},{id:"S4",a:"Nebraska",b:"Troy",round:"R64",feedsInto:"S_R32_2",feedsAs:"b",rd:1},
  {id:"S5",a:"N. Carolina",b:"VCU",round:"R64",feedsInto:"S_R32_3",feedsAs:"a",rd:1},{id:"S6",a:"Illinois",b:"Penn",round:"R64",feedsInto:"S_R32_3",feedsAs:"b",rd:1},
  {id:"S7",a:"St. Mary's",b:"Texas A&M",round:"R64",feedsInto:"S_R32_4",feedsAs:"a",rd:1},{id:"S8",a:"Houston",b:"Idaho",round:"R64",feedsInto:"S_R32_4",feedsAs:"b",rd:1},
  {id:"W1",a:"Arizona",b:"LIU",round:"R64",feedsInto:"W_R32_1",feedsAs:"a",rd:1},{id:"W2",a:"Villanova",b:"Utah State",round:"R64",feedsInto:"W_R32_1",feedsAs:"b",rd:1},
  {id:"W3",a:"Wisconsin",b:"High Point",round:"R64",feedsInto:"W_R32_2",feedsAs:"a",rd:1},{id:"W4",a:"Arkansas",b:"Hawaii",round:"R64",feedsInto:"W_R32_2",feedsAs:"b",rd:1},
  {id:"W5",a:"BYU",b:null,round:"R64",feedsInto:"W_R32_3",feedsAs:"a",rd:1},{id:"W6",a:"Gonzaga",b:"Kennesaw St.",round:"R64",feedsInto:"W_R32_3",feedsAs:"b",rd:1},
  {id:"W7",a:"Miami FL",b:"Missouri",round:"R64",feedsInto:"W_R32_4",feedsAs:"a",rd:1},{id:"W8",a:"Purdue",b:"Queens",round:"R64",feedsInto:"W_R32_4",feedsAs:"b",rd:1},
  {id:"MW1",a:"Michigan",b:null,round:"R64",feedsInto:"MW_R32_1",feedsAs:"a",rd:1},{id:"MW2",a:"Georgia",b:"Saint Louis",round:"R64",feedsInto:"MW_R32_1",feedsAs:"b",rd:1},
  {id:"MW3",a:"Texas Tech",b:"Akron",round:"R64",feedsInto:"MW_R32_2",feedsAs:"a",rd:1},{id:"MW4",a:"Alabama",b:"Hofstra",round:"R64",feedsInto:"MW_R32_2",feedsAs:"b",rd:1},
  {id:"MW5",a:"Tennessee",b:null,round:"R64",feedsInto:"MW_R32_3",feedsAs:"a",rd:1},{id:"MW6",a:"Virginia",b:"Wright St.",round:"R64",feedsInto:"MW_R32_3",feedsAs:"b",rd:1},
  {id:"MW7",a:"Kentucky",b:"Santa Clara",round:"R64",feedsInto:"MW_R32_4",feedsAs:"a",rd:1},{id:"MW8",a:"Iowa State",b:"Tennessee St.",round:"R64",feedsInto:"MW_R32_4",feedsAs:"b",rd:1},
  {id:"E_R32_1",a:null,b:null,round:"R32",feedsInto:"E_S16_1",feedsAs:"a",rd:2},{id:"E_R32_2",a:null,b:null,round:"R32",feedsInto:"E_S16_1",feedsAs:"b",rd:2},
  {id:"E_R32_3",a:null,b:null,round:"R32",feedsInto:"E_S16_2",feedsAs:"a",rd:2},{id:"E_R32_4",a:null,b:null,round:"R32",feedsInto:"E_S16_2",feedsAs:"b",rd:2},
  {id:"S_R32_1",a:null,b:null,round:"R32",feedsInto:"S_S16_1",feedsAs:"a",rd:2},{id:"S_R32_2",a:null,b:null,round:"R32",feedsInto:"S_S16_1",feedsAs:"b",rd:2},
  {id:"S_R32_3",a:null,b:null,round:"R32",feedsInto:"S_S16_2",feedsAs:"a",rd:2},{id:"S_R32_4",a:null,b:null,round:"R32",feedsInto:"S_S16_2",feedsAs:"b",rd:2},
  {id:"W_R32_1",a:null,b:null,round:"R32",feedsInto:"W_S16_1",feedsAs:"a",rd:2},{id:"W_R32_2",a:null,b:null,round:"R32",feedsInto:"W_S16_1",feedsAs:"b",rd:2},
  {id:"W_R32_3",a:null,b:null,round:"R32",feedsInto:"W_S16_2",feedsAs:"a",rd:2},{id:"W_R32_4",a:null,b:null,round:"R32",feedsInto:"W_S16_2",feedsAs:"b",rd:2},
  {id:"MW_R32_1",a:null,b:null,round:"R32",feedsInto:"MW_S16_1",feedsAs:"a",rd:2},{id:"MW_R32_2",a:null,b:null,round:"R32",feedsInto:"MW_S16_1",feedsAs:"b",rd:2},
  {id:"MW_R32_3",a:null,b:null,round:"R32",feedsInto:"MW_S16_2",feedsAs:"a",rd:2},{id:"MW_R32_4",a:null,b:null,round:"R32",feedsInto:"MW_S16_2",feedsAs:"b",rd:2},
  {id:"E_S16_1",a:null,b:null,round:"S16",feedsInto:"E_E8",feedsAs:"a",rd:3},{id:"E_S16_2",a:null,b:null,round:"S16",feedsInto:"E_E8",feedsAs:"b",rd:3},
  {id:"S_S16_1",a:null,b:null,round:"S16",feedsInto:"S_E8",feedsAs:"a",rd:3},{id:"S_S16_2",a:null,b:null,round:"S16",feedsInto:"S_E8",feedsAs:"b",rd:3},
  {id:"W_S16_1",a:null,b:null,round:"S16",feedsInto:"W_E8",feedsAs:"a",rd:3},{id:"W_S16_2",a:null,b:null,round:"S16",feedsInto:"W_E8",feedsAs:"b",rd:3},
  {id:"MW_S16_1",a:null,b:null,round:"S16",feedsInto:"MW_E8",feedsAs:"a",rd:3},{id:"MW_S16_2",a:null,b:null,round:"S16",feedsInto:"MW_E8",feedsAs:"b",rd:3},
  {id:"E_E8",a:null,b:null,round:"E8",feedsInto:"F4_1",feedsAs:"a",rd:4},{id:"S_E8",a:null,b:null,round:"E8",feedsInto:"F4_1",feedsAs:"b",rd:4},
  {id:"W_E8",a:null,b:null,round:"E8",feedsInto:"F4_2",feedsAs:"a",rd:4},{id:"MW_E8",a:null,b:null,round:"E8",feedsInto:"F4_2",feedsAs:"b",rd:4},
  {id:"F4_1",a:null,b:null,round:"F4",feedsInto:"CHAMP",feedsAs:"a",rd:5},{id:"F4_2",a:null,b:null,round:"F4",feedsInto:"CHAMP",feedsAs:"b",rd:5},
  {id:"CHAMP",a:null,b:null,round:"Championship",feedsInto:null,feedsAs:null,rd:6},
];

const slotMap={};BRACKET.forEach(g=>slotMap[g.id]=g);

// ═══ Apply saved advances ═══
for(const[slotId,teams]of Object.entries(bracketState.advancedTo)){if(slotMap[slotId]){if(teams.a)slotMap[slotId].a=teams.a;if(teams.b)slotMap[slotId].b=teams.b;}}

// ═══ Check for newly completed games ═══
const allResults=[...(data.yesterdayResults||[]),...(data.games||[]).filter(g=>g.status==='Final')];
let newAdvances=0;
for(const result of allResults){
  const aName=resolve(result.teamA,teamDB)||result.teamA,bName=resolve(result.teamB,teamDB)||result.teamB;
  const scoreA=parseInt(result.scoreA),scoreB=parseInt(result.scoreB);if(isNaN(scoreA)||isNaN(scoreB))continue;
  const actualWinner=scoreA>scoreB?aName:bName,actualLoser=scoreA>scoreB?bName:aName;
  for(const slot of BRACKET){
    if(bracketState.results[slot.id])continue;if(!slot.a||!slot.b)continue;
    if((slot.a===aName||slot.a===bName)&&(slot.b===aName||slot.b===bName)){
      bracketState.results[slot.id]={winner:actualWinner,loser:actualLoser,scoreW:Math.max(scoreA,scoreB),scoreL:Math.min(scoreA,scoreB),date:new Date().toISOString().slice(0,10)};
      if(slot.feedsInto&&slotMap[slot.feedsInto]){const ns=slotMap[slot.feedsInto];if(slot.feedsAs==='a')ns.a=actualWinner;else ns.b=actualWinner;bracketState.advancedTo[slot.feedsInto]=bracketState.advancedTo[slot.feedsInto]||{};bracketState.advancedTo[slot.feedsInto][slot.feedsAs]=actualWinner;}
      console.log(`   ✅ ${slot.id}: ${actualWinner} beat ${actualLoser} → advances to ${slot.feedsInto||'CHAMPION'}`);newAdvances++;break;
    }
  }
}
console.log(`🔄 ${newAdvances} new advances. ${Object.keys(bracketState.results).length} total completed.\n`);

// ═══ PREDICT ALL UPCOMING GAMES ═══
const predictions=[], completed=[];
for(const slot of BRACKET){
  if(bracketState.results[slot.id]){completed.push({id:slot.id,round:slot.round,...bracketState.results[slot.id],status:'FINAL'});continue;}
  if(!slot.a||!slot.b)continue;
  const venue=VENUE_MAP[slot.id]||VENUE_MAP[slot.id.split('_')[0]]||"Indianapolis";
  const result=sim(slot.a,slot.b,venue,slot.rd);
  if(result){result.id=slot.id;result.region=slot.round;predictions.push(result);}
  else{console.log(`   ⚠️ ${slot.id}: Can't sim ${slot.a} vs ${slot.b}`);}
}

// ═══ SAVE ═══
const fullOutput={timestamp:new Date().toISOString(),weightsVersion:weights.version||1,engineVersion:"v5-full-v8-live-stats",completed,predictions,bracketProgress:{gamesPlayed:completed.length,gamesRemaining:BRACKET.length-completed.length,currentRound:predictions.length>0?predictions[0].round:'Complete'}};
fs.writeFileSync('data/predictions.json',JSON.stringify(fullOutput,null,2));
// ═══ IMMUTABLE PREDICTION SNAPSHOT ═══
// Once a prediction is saved for a matchup, it NEVER gets overwritten.
let lockedSnap = [];
try { lockedSnap = JSON.parse(fs.readFileSync('data/predictions-snapshot.json', 'utf8')); } catch {}
const locked = {};
for (const p of lockedSnap) {
  if (p.teamA && p.teamB) locked[`${p.teamA}|${p.teamB}`] = p;
}
let newAdded = 0;
for (const p of predictions) {
  const key = `${p.teamA}|${p.teamB}`;
  const keyRev = `${p.teamB}|${p.teamA}`;
  if (!locked[key] && !locked[keyRev]) {
    p.predictedAt = new Date().toISOString();
    locked[key] = p;
    newAdded++;
  }
}
fs.writeFileSync('data/predictions-snapshot.json', JSON.stringify(Object.values(locked), null, 2));
console.log(`📸 Snapshot: ${Object.keys(locked).length} total predictions (${newAdded} new, ${Object.keys(locked).length - newAdded} locked)`);
fs.writeFileSync('data/teams.json',JSON.stringify(teamDB,null,2));
fs.writeFileSync(BRACKET_FILE,JSON.stringify(bracketState,null,2));

// ═══════════════════════════════════════════════════════
// PROJECT FULL BRACKET FOR DISPLAY
// ═══════════════════════════════════════════════════════
console.log('\n🏆 Projecting full bracket for display...');

const projSlots = JSON.parse(JSON.stringify(BRACKET));
const projMap = {};
projSlots.forEach(s => projMap[s.id] = s);

for (const [id, res] of Object.entries(bracketState.results)) {
  if (projMap[id]) projMap[id].actualResult = res;
}
for (const [id, teams] of Object.entries(bracketState.advancedTo)) {
  if (projMap[id]) {
    if (teams.a) projMap[id].a = teams.a;
    if (teams.b) projMap[id].b = teams.b;
  }
}

const roundOrder = [0, 1, 2, 3, 4, 5, 6];
const roundNames = ['FIRST FOUR', 'ROUND OF 64', 'ROUND OF 32', 'SWEET SIXTEEN', 'ELITE EIGHT', 'FINAL FOUR', 'CHAMPIONSHIP'];
const displayRounds = [];

for (const rd of roundOrder) {
  const roundSlots = projSlots.filter(s => s.rd === rd);
  const games = [];

  for (const slot of roundSlots) {
    if (slot.actualResult) {
      const res = slot.actualResult;
      const aTeam = teamDB[res.winner] || {};
      const bTeam = teamDB[res.loser] || {};
      games.push({
        w: res.winner, l: res.loser, sW: res.scoreW, sL: res.scoreL,
        wp: 100, sp: res.scoreW - res.scoreL, ven: VENUE_MAP[slot.id] || 'TBD',
        sW2: aTeam.s || 0, sL2: bTeam.s || 0,
        status: 'FINAL', id: slot.id,
        mu: { det: [] }, cDiff: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0,
        fatA: { pts: 0 }, fatB: { pts: 0 }, rd: slot.rd,
        v8: { ref: 0, gs: 0, sharp: 0, cont: 0, tz: 0, foul: 0, ens: { avg: 0, agree: true }, total: 0 },
        adjStats: { aEfg: 0, bEfg: 0, aTor: 0, bTor: 0, aOrb: 0, bOrb: 0, aFtr: 0, bFtr: 0 },
        modelSp: 0, vegasSp: null, a: buildT(res.winner), b: buildT(res.loser), rawSp: 0, ha: null, hb: 0,
      });
      if (slot.feedsInto && projMap[slot.feedsInto]) {
        if (slot.feedsAs === 'a') projMap[slot.feedsInto].a = res.winner;
        else projMap[slot.feedsInto].b = res.winner;
      }
      continue;
    }

    if (!slot.a || !slot.b) continue;
    const venue = VENUE_MAP[slot.id] || 'Indianapolis';
    const result = sim(slot.a, slot.b, venue, slot.rd);
    if (!result) continue;

    games.push({
      ...result,
      id: slot.id,
      status: 'PROJECTED',
    });

    if (slot.feedsInto && projMap[slot.feedsInto]) {
      if (slot.feedsAs === 'a') projMap[slot.feedsInto].a = result.winner;
      else projMap[slot.feedsInto].b = result.winner;
    }
  }

  if (games.length > 0) {
    displayRounds.push({ n: roundNames[rd] || `Round ${rd}`, g: games });
  }
}

const bracketDisplay = {
  timestamp: new Date().toISOString(),
  timestampCST: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST',
  engineVersion: 'v5-full-v8-live-stats',
  weightsVersion: weights.version || 1,
  rounds: displayRounds,
  teamDB: teamDB,
};

fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/bracket-display.json', JSON.stringify(bracketDisplay));
fs.writeFileSync('data/bracket-display.json', JSON.stringify(bracketDisplay));
console.log(`   Projected ${displayRounds.reduce((s, r) => s + r.g.length, 0)} games across ${displayRounds.length} rounds`);
console.log(`   Champion: ${displayRounds[displayRounds.length - 1]?.g[0]?.w || 'TBD'}`);

// ═══ SUMMARY ═══
console.log(`\n📊 FULL V8 ENGINE RESULTS:`);
console.log(`   Completed: ${completed.length} | Upcoming: ${predictions.length} | Waiting: ${BRACKET.length-completed.length-predictions.length}`);

const printRounds=['First Four','R64','R32','S16','E8','F4','Championship'];
const byRound={};predictions.forEach(p=>{const r=p.round==='First Four'?'First Four':['','R64','R32','S16','E8','F4','Championship'][p.round]||p.round;if(!byRound[r])byRound[r]=[];byRound[r].push(p);});
for(const round of printRounds){const games=byRound[round];if(!games)continue;console.log(`\n📋 ${round} (${games.length} games):`);games.forEach(p=>{const edgeStr=p.edge!==null?` | edge:${Math.abs(p.edge)}`:'';const layers=` [L1:${p.L1} L2:${p.L2} L3:${p.L3} L4:${p.L4} L5:${p.L5} v8:${p.v8adj}]`;console.log(`   ${p.winner} ${p.scoreW}-${p.scoreL} ${p.loser} (${p.winProb}%)${edgeStr}${layers}`);});}

const edges=predictions.filter(p=>p.edge!==null).sort((a,b)=>Math.abs(b.edge)-Math.abs(a.edge));
if(edges.length>0){console.log('\n🔥 TOP 5 BETTING EDGES:');edges.slice(0,5).forEach(p=>{console.log(`   ${p.teamA} vs ${p.teamB}: model ${p.modelSpread>0?'+':''}${p.modelSpread} / vegas ${p.vegasLine>0?'+':''}${p.vegasLine} → edge ${Math.abs(p.edge)}`);});}

console.log('\n✅ Full v8 engine complete.\n');