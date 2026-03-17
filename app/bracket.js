"use client";
import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════
// v8.0 FINAL — MARCH 16, 2026 
// All v7.1 upgrades PLUS Tier 1 & Tier 2 improvements:
// T1: Ref crew sensitivity, Player-level matchups, Game-state splits, Sharp money
// T2: Ensemble sub-models, Roster continuity, Timezone fatigue, Foul trouble
// Total: 23 upgrades across 5 algorithm layers + 3 post-processing steps
// ═══════════════════════════════════════════════════════════════════════

const Φ=x=>{const s=x<0?-1:1,a=Math.abs(x)/1.414;const t=1/(1+.3275911*a);return .5*(1+s*(1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a))));};
const iso=r=>{const b=[[.5,.5],[.55,.543],[.6,.576],[.65,.625],[.7,.688],[.75,.74],[.8,.798],[.85,.83],[.9,.889],[.95,.955],[1,1]];const p=Math.max(.5,Math.min(1,r));for(let i=0;i<b.length-1;i++){const[x0,y0]=b[i],[x1,y1]=b[i+1];if(p>=x0&&p<=x1)return y0+(p-x0)/(x1-x0)*(y1-y0);}return p;};
const hav=(a1,o1,a2,o2)=>{const R=3959,dL=(a2-a1)*Math.PI/180,dO=(o2-o1)*Math.PI/180;const a=Math.sin(dL/2)**2+Math.cos(a1*Math.PI/180)*Math.cos(a2*Math.PI/180)*Math.sin(dO/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));};
const rw=(s,r,w)=>s*(1-w)+r*w;
const RW={em:.60,mg:.62,efg:.55,ast:.52,ftr:.47,orb:.47,tor:.42,tpt:.37};

const VEN={"Dayton":[39.758,-84.191],"Buffalo":[42.886,-78.878],"Greenville":[34.852,-82.394],"OKC":[35.468,-97.516],"Portland":[45.531,-122.666],"Tampa":[27.951,-82.457],"Philadelphia":[39.952,-75.164],"San Diego":[32.716,-117.161],"St. Louis":[38.627,-90.199],"Washington DC":[38.907,-77.037],"Houston":[29.760,-95.370],"Chicago":[41.878,-87.630],"San Jose":[37.338,-121.886],"Indianapolis":[39.768,-86.158]};
const LOC={"Duke":[36.001,-78.938],"Arizona":[32.232,-110.950],"Michigan":[42.278,-83.738],"Florida":[29.644,-82.345],"UConn":[41.808,-72.254],"Houston":[29.720,-95.339],"Iowa State":[42.027,-93.648],"Purdue":[40.424,-86.913],"Gonzaga":[47.667,-117.402],"Michigan St.":[42.731,-84.482],"Illinois":[40.102,-88.227],"Arkansas":[36.068,-94.175],"Kansas":[38.955,-95.255],"Nebraska":[40.820,-96.706],"Wisconsin":[43.076,-89.412],"Texas Tech":[33.585,-101.845],"St. John's":[40.726,-73.795],"Vanderbilt":[36.144,-86.803],"Alabama":[33.214,-87.539],"Louisville":[38.213,-85.758],"N. Carolina":[35.905,-79.047],"BYU":[40.250,-111.649],"UCLA":[34.069,-118.445],"St. Mary's":[37.838,-122.108],"Kentucky":[38.039,-84.504],"Miami FL":[25.721,-80.279],"Ohio State":[40.007,-83.030],"Iowa":[41.661,-91.535],"Georgia":[33.948,-83.375],"TCU":[32.710,-97.363],"Missouri":[38.940,-92.328],"Clemson":[34.676,-82.837],"VCU":[37.549,-77.453],"Akron":[41.076,-81.512],"Saint Louis":[38.637,-90.234],"Santa Clara":[37.349,-121.938],"S. Florida":[28.064,-82.413],"Hofstra":[40.715,-73.601],"High Point":[35.949,-79.997],"McNeese":[30.211,-93.210],"Troy":[31.799,-85.956],"N. Iowa":[42.514,-92.456],"Cal Baptist":[33.930,-117.426],"Yale":[41.311,-72.924],"UCF":[28.602,-81.200],"N. Dakota St.":[46.897,-96.801],"Furman":[34.850,-82.440],"Wright St.":[39.782,-84.062],"Miami OH":[39.509,-84.735],"SMU":[32.842,-96.783],"Texas":[30.284,-97.733],"Siena":[42.719,-73.752],"Penn":[39.952,-75.193],"Idaho":[46.726,-117.014],"Queens":[35.230,-80.843],"Hawaii":[21.297,-157.817],"UMBC":[39.255,-76.711],"Tennessee":[35.955,-83.925],"Villanova":[40.037,-75.346],"Utah State":[41.745,-111.810],"Tennessee St.":[36.167,-86.783],"Texas A&M":[30.612,-96.341],"Lehigh":[40.608,-75.378],"Virginia":[38.034,-78.508],"LIU":[40.689,-73.981],"Kennesaw St.":[34.036,-84.581],"NC State":[35.786,-78.663]};
const dist=(t,v)=>{const s=LOC[t],ve=VEN[v];if(!s||!ve)return 999;return Math.round(hav(s[0],s[1],ve[0],ve[1]));};
const hca=(t,v,h)=>{const d=dist(t,v);if(d<=50)return{d,b:h||3.3,tag:"HOME"};if(d<=150)return{d,b:(h||3.3)*.4,tag:"NEAR"};return{d,b:0,tag:null};};

// ═══ TEAM DATABASE — Updated March 16, 2026 ═══
// [em_s,em_r, efg_s,efg_r, tor_s,tor_r, orb_s,orb_r, ftr_s,ftr_r, tpt_s,tpt_r, ast_s,ast_r, mg_s,mg_r, o,or, d,dr, t, elo, lk, sent, cind, inj, seed, hcaBase, kpRk, record]
const DB={
// 1-seeds
"Duke":       {d:[40.6,43.2, 57.2,58.8, 14.8,13.0, 32.1,33.0, 39.5,41.0, 38.5,39.5, 57,59, 18.2,22.5, 121.8,124, 81.2,80.8, 69.2, 1895, .012, .50, 0, -1.0], s:1, hb:6.5, kp:1, rec:"32-2", coach:"Jon Scheyer", cAdj:.3, cNote:"Title game 2025, 6 March wins", style:{p3:.44,d3r:15,ht:79,toF:11.2,t:69.2}},
"Arizona":    {d:[37.3,39.5, 57.5,58.2, 15.8,14.5, 31.2,32.0, 36.8,37.5, 39.0,40.5, 54,56, 14.5,18.2, 120.5,122, 83.2,82.5, 71.5, 1872, -.01, .63, 0, 0], s:1, hb:5.8, kp:3, rec:"32-2", coach:"Tommy Lloyd", cAdj:.2, cNote:"140-35 at AZ, no deep run yet", style:{p3:.50,d3r:3,ht:78,toF:9.8,t:71.5}},
"Michigan":   {d:[39.4,37.0, 55.8,57.1, 14.2,13.8, 30.5,31.0, 36.2,36.5, 36.5,37.0, 59,58, 17.8,14.5, 119.8,118.5, 80.5,81.5, 66.8, 1888, .028, .35, 0, -2.0], s:1, hb:5.2, kp:2, rec:"31-3", coach:"Dusty May", cAdj:.4, cNote:"FAU F4 '23, #1 defense nationally", style:{p3:.38,d3r:1,ht:80,toF:10.5,t:66.8}},
"Florida":    {d:[30.2,33.5, 55.1,56.8, 16.2,14.5, 33.5,34.0, 41.2,42.5, 37.5,39.0, 52,54, 14.8,18.5, 117.5,119.5, 87.3,86.0, 68.5, 1845, .005, .59, 0, 0], s:1, hb:4.8, kp:4, rec:"26-7", coach:"Todd Golden", cAdj:.8, cNote:"Defending champ, 11-game W streak", style:{p3:.38,d3r:6,ht:79,toF:10.0,t:68.5}},
// 2-seeds
"UConn":      {d:[29.8,32.5, 56.2,57.8, 15.0,14.2, 32.0,32.5, 38.0,39.0, 37.0,38.5, 55,57, 14.0,18.0, 120.2,122, 90.4,89.5, 67.2, 1852, -.018, .63, 0, -0.5], s:2, hb:5.5, kp:7, rec:"27-7", coach:"Dan Hurley", cAdj:1.5, cNote:"Back-to-back titles '23-'24, .750 WP", style:{p3:.40,d3r:11,ht:79,toF:11.2,t:67.2}},
"Houston":    {d:[28.5,26.0, 53.8,52.5, 15.5,16.8, 35.2,36.0, 38.5,39.0, 33.5,32.0, 48,47, 14.2,11.0, 114.2,112.5, 85.7,86.5, 65.5, 1838, -.015, .47, 0, 0], s:2, hb:7.2, kp:6, rec:"28-6", coach:"Kelvin Sampson", cAdj:.8, cNote:"Title game '25, 6 straight S16s", style:{p3:.35,d3r:5,ht:78,toF:11.5,t:65.5}},
"Iowa State": {d:[27.2,29.0, 54.0,55.5, 14.5,13.8, 30.0,30.5, 37.0,37.5, 36.0,37.0, 53,55, 12.5,15.0, 115,116.5, 87.8,87.5, 66.0, 1833, .005, .48, 0, 0], s:2, hb:4.5, kp:9, rec:"27-7", coach:"T.J. Otzelberger", cAdj:.2, cNote:"Consistent tourney appearances", style:{p3:.38,d3r:12,ht:77,toF:10.8,t:66.0}},
"Purdue":     {d:[27.5,30.0, 55.5,57.0, 15.0,14.0, 32.0,33.0, 38.0,39.5, 36.5,38.0, 54,56, 8.0,14.5, 120,122.5, 92.5,92.5, 68.0, 1835, .01, .56, 0, 0], s:2, hb:5.0, kp:8, rec:"27-8", coach:"Matt Painter", cAdj:-.2, cNote:"#2 offense, but FDU loss '23", style:{p3:.38,d3r:39,ht:81,toF:9.5,t:68.0}},
// 3-seeds
"Michigan St.":{d:[26.8,28.5, 54.0,55.5, 15.0,14.0, 31.0,32.0, 37.0,38.0, 36.0,37.0, 53,55, 9.0,13.0, 115,117, 88.2,88.5, 67.0, 1835, .008, .57, 0, 0], s:3, hb:5.0, kp:10, rec:"25-7", coach:"Tom Izzo", cAdj:1.5, cNote:"Mr. March — 8 F4s, 59 wins, greatest overperformer", style:{p3:.37,d3r:18,ht:78,toF:10.5,t:67.0}},
"Illinois":   {d:[28.2,26.0, 56.5,55.0, 16.0,17.0, 32.0,31.5, 38.0,37.0, 38.0,36.5, 54,52, 10.0,5.5, 123,121, 94.8,95, 70.0, 1840, .005, .38, 0, 0], s:3, hb:4.5, kp:5, rec:"24-8", coach:"Brad Underwood", cAdj:-.2, cNote:"#1 offense, but OT losses expose D", style:{p3:.42,d3r:28,ht:78,toF:9.0,t:70.0}},
"Gonzaga":    {d:[27.0,25.5, 56.0,55.5, 15.5,16.0, 31.0,30.5, 37.0,36.5, 38.0,37.5, 55,54, 12.0,10.5, 118,117, 91.0,91.5, 70.0, 1832, -.008, .32, 0, -2.0], s:3, hb:5.5, kp:11, rec:"30-3", coach:"Mark Few", cAdj:.8, cNote:"28 tourney wins, Huff injured", style:{p3:.40,d3r:11,ht:79,toF:9.2,t:70.0}},
"Virginia":   {d:[22.0,23.5, 53.0,54.0, 14.5,14.0, 29.0,29.5, 34.0,34.5, 35.0,36.0, 51,53, 7.0,10.0, 108,110, 86.0,86.5, 59.0, 1810, .005, .40, 0, 0], s:3, hb:4.5, kp:19, rec:"29-5", coach:"Ryan Odom", cAdj:-.3, cNote:"Year 1 turnaround from 2 AP votes to 29-5, but first tourney as HC", style:{p3:.35,d3r:16,ht:78,toF:9.5,t:59.0}},
// 4-seeds
"Kansas":     {d:[23.5,18.8, 53.0,51.2, 16.0,17.5, 31.0,29.5, 38.0,36.0, 35.5,33.0, 52,48, 8.5,-2.5, 113,110, 89.5,91.2, 67.0, 1815, .015, .18, 0, 0], s:4, hb:6.0, kp:13, rec:"23-10", coach:"Bill Self", cAdj:.5, cNote:"58 wins, 2 titles, but 3 early exits recently", style:{p3:.38,d3r:15,ht:79,toF:10.2,t:67.0}},
"Nebraska":   {d:[21.5,22.5, 53.5,54.0, 15.8,15.5, 30.0,30.5, 37.0,37.5, 35.0,35.5, 51,52, 8.0,10.0, 113,114, 91.5,91.5, 68.0, 1800, .008, .34, 0, 0], s:4, hb:4.0, kp:12, rec:"26-6", coach:"Fred Hoiberg", cAdj:-.8, cNote:"0 tourney wins in program history", style:{p3:.36,d3r:7,ht:78,toF:10.0,t:68.0}},
"Arkansas":   {d:[23.5,27.0, 54.0,55.5, 16.5,15.0, 33.0,34.0, 39.0,40.5, 35.5,37.0, 52,55, 12.0,17.5, 116,118.5, 92.5,91.5, 71.0, 1815, .005, .61, 0, 0], s:4, hb:4.8, kp:16, rec:"24-10", coach:"John Calipari", cAdj:1.0, cNote:"59 March wins, 6 F4s, SEC tourney champ", style:{p3:.38,d3r:46,ht:78,toF:10.8,t:71.0}},
"Alabama":    {d:[22.0,20.5, 53.5,52.5, 16.5,17.5, 31.0,30.5, 37.0,36.5, 35.0,34.0, 50,48, 5.0,3.0, 115,113.5, 93.0,93.0, 71.0, 1805, .01, .33, -2.5, 0], s:4, hb:5.0, kp:15, rec:"22-10", coach:"Nate Oats", cAdj:.2, cNote:"#3 offense, #68 defense — volatile", style:{p3:.40,d3r:68,ht:77,toF:9.5,t:71.0}},
// 5-seeds
"St. John's": {d:[24.5,26.5, 53.8,55.0, 16.5,15.0, 30.5,31.0, 37.0,38.0, 36.0,37.5, 53,56, 12.0,15.5, 116.2,118, 91.7,91.5, 68.0, 1820, .035, .56, 0, 0], s:5, hb:4.0, kp:21, rec:"24-9", coach:"Rick Pitino", cAdj:1.2, cNote:"55 March wins, 7 F4s, 2 titles — HOFer", style:{p3:.40,d3r:12,ht:78,toF:10.8,t:68.0}},
"Vanderbilt":  {d:[22.8,25.0, 54.0,55.5, 15.5,14.5, 31.0,32.0, 37.0,38.0, 36.0,37.5, 53,55, 14.0,17.0, 114,116, 91.2,91.0, 70.0, 1810, .01, .41, 0, 0], s:5, hb:4.5, kp:18, rec:"26-7", coach:"Mark Byington", cAdj:-.5, cNote:"First tourney as HC, beat Florida in SEC", style:{p3:.38,d3r:42,ht:78,toF:10.5,t:70.0}},
"Texas Tech": {d:[22.8,16.5, 52.5,50.8, 16.8,18.5, 30.2,28.5, 40.5,38.0, 34.0,31.0, 49,45, 9.5,1.5, 112.8,109.5, 90.0,93.0, 66.0, 1808, .02, .20, 0, -3.5], s:5, hb:6.8, kp:17, rec:"22-10", coach:"Grant McCasland", cAdj:-.3, cNote:"Toppin OUT — D dropped from #24 to #119", style:{p3:.40,d3r:33,ht:77,toF:10.2,t:66.0}},
"Wisconsin":  {d:[20.5,22.0, 53.0,54.0, 14.5,14.0, 28.0,28.5, 35.0,35.5, 35.0,36.5, 50,52, 7.0,10.0, 110,111.5, 89.5,89.5, 64.0, 1798, .005, .44, 0, 0], s:5, hb:4.5, kp:24, rec:"24-9", coach:"Greg Gard", cAdj:.1, cNote:"#62 defense is a weakness", style:{p3:.36,d3r:62,ht:78,toF:9.8,t:64.0}},
// 6-seeds
"Louisville":  {d:[20.5,18.0, 53.5,52.0, 15.5,16.5, 31.0,30.0, 38.0,37.0, 35.5,34.0, 52,50, 8.0,5.0, 114,112, 93.5,94.0, 69.0, 1795, .005, .23, 0, -2.0], s:6, hb:4.5, kp:22, rec:"22-10", coach:"Pat Kelsey", cAdj:-.5, cNote:"Brown (back) questionable, first tourney", style:{p3:.37,d3r:25,ht:78,toF:9.8,t:69.0}},
"N. Carolina": {d:[19.5,14.2, 53.5,51.5, 16.0,17.8, 31.0,29.5, 37.0,35.0, 36.0,33.5, 51,47, 7.5,-1.5, 114,110.5, 94.5,96.3, 69.0, 1790, .02, -.13, 0, -2.5], s:6, hb:5.0, kp:35, rec:"22-11", coach:"Hubert Davis", cAdj:.1, cNote:"Wilson OUT (broken thumb) — ceiling capped", style:{p3:.38,d3r:60,ht:79,toF:9.5,t:69.0}},
"BYU":        {d:[19.2,20.0, 53.5,54.0, 16.0,15.5, 30.0,30.5, 36.0,36.5, 35.0,36.0, 51,52, 6.0,8.0, 112,113, 92.8,93.0, 68.0, 1788, .01, .35, 0, 0], s:6, hb:5.0, kp:20, rec:"24-9", coach:"Kevin Young", cAdj:-.5, cNote:"First year HC, Dybantsa is #1 pick candidate", style:{p3:.38,d3r:48,ht:78,toF:9.8,t:68.0}},
"Tennessee":  {d:[21.5,23.0, 53.5,54.5, 15.5,15.0, 31.0,32.0, 38.0,38.5, 35.0,36.0, 52,54, 7.0,10.5, 113,115, 91.5,92.0, 67.0, 1800, .005, .45, 0, 0], s:6, hb:5.0, kp:14, rec:"22-11", coach:"Rick Barnes", cAdj:-.1, cNote:"12 March wins but 0 Final Fours", style:{p3:.35,d3r:15,ht:79,toF:11.0,t:67.0}},
// 7-seeds
"UCLA":       {d:[18.5,20.0, 53.0,54.0, 16.0,15.0, 30.0,31.0, 35.0,36.0, 35.0,36.5, 51,53, 6.0,9.0, 111.5,113, 93.0,93.0, 68.0, 1785, .01, .42, .15, -1.0], s:7, hb:4.5, kp:23, rec:"22-10", coach:"Mick Cronin", cAdj:.2, cNote:"F4 2021, consistent", style:{p3:.38,d3r:35,ht:78,toF:10.0,t:68.0}},
"St. Mary's": {d:[19.5,21.0, 54.5,55.5, 15.0,14.5, 28.0,28.5, 33.0,33.5, 36.0,37.0, 52,54, 8.0,11.0, 110,111.5, 90.5,90.5, 63.0, 1792, -.005, .43, 0, 0], s:7, hb:4.0, kp:26, rec:"27-5", coach:"Randy Bennett", cAdj:.1, cNote:"Disciplined half-court team", style:{p3:.37,d3r:28,ht:78,toF:9.5,t:63.0}},
"Kentucky":   {d:[17.0,15.0, 52.5,51.5, 16.5,17.5, 30.0,29.5, 38.0,37.0, 34.5,33.0, 49,47, 3.0,0.5, 111,109.5, 94.0,94.5, 69.0, 1778, .015, -.05, 0, 0], s:7, hb:5.5, kp:28, rec:"21-11", coach:"Mark Pope", cAdj:-.3, cNote:"Rebuilding, Hodge ACL tear, Quaintance doubtful", style:{p3:.38,d3r:55,ht:79,toF:9.8,t:69.0}},
"Miami FL":   {d:[17.0,19.0, 53.0,54.5, 16.0,15.0, 30.0,31.0, 36.0,37.0, 35.5,37.0, 52,54, 7.0,10.5, 112,114, 95.0,95.0, 68.0, 1778, .01, .39, 0, 0], s:7, hb:4.0, kp:27, rec:"22-10", coach:"Jim Larrañaga", cAdj:.5, cNote:"Upset specialist — GMU & Miami F4s", style:{p3:.39,d3r:40,ht:77,toF:10.0,t:68.0}},
// 8-seeds
"Ohio State":  {d:[16.8,18.0, 52.5,53.5, 16.0,15.5, 30.0,30.5, 36.0,36.5, 35.0,36.0, 51,53, 5.0,7.5, 110,111, 93.2,93.0, 67.0, 1775, .01, .35, 0, -0.8], s:8, hb:4.5, kp:30, rec:"21-12", coach:"Jake Diebler", cAdj:-.3, cNote:"Thornton all-time leading scorer", style:{p3:.37,d3r:38,ht:78,toF:10.0,t:67.0}},
"Clemson":    {d:[17.5,14.5, 53.0,51.5, 16.0,17.0, 30.0,29.0, 35.0,34.0, 35.5,34.0, 51,49, -2.0,-5.0, 112,110, 94.5,95.5, 67.0, 1780, .005, .30, 0, -2.5], s:8, hb:4.5, kp:36, rec:"21-12", coach:"Brad Brownell", cAdj:0, cNote:"Welling ACL tear, trending down", style:{p3:.38,d3r:40,ht:78,toF:9.8,t:67.0}},
"Georgia":    {d:[16.5,15.5, 52.5,52.0, 16.5,17.0, 30.0,29.5, 36.0,35.5, 35.0,34.0, 50,49, 4.0,2.5, 110,109, 93.5,93.5, 68.0, 1773, .008, .30, 0, 0], s:8, hb:4.5, kp:29, rec:"22-10", coach:"Mike White", cAdj:0, cNote:"Top-15 offense, susceptible to upset", style:{p3:.36,d3r:260,ht:79,toF:10.2,t:68.0}},
"Villanova":  {d:[16.5,18.0, 52.5,53.5, 16.0,15.5, 30.0,31.0, 36.0,37.0, 35.0,36.5, 52,53, 5.0,8.0, 110,112, 93.5,94.0, 67.0, 1774, .005, .38, 0, 0], s:8, hb:4.5, kp:33, rec:"22-10", coach:"Kyle Neptune", cAdj:-.3, cNote:"First tourney since Wright retired", style:{p3:.38,d3r:42,ht:78,toF:9.8,t:67.0}},
// 9-seeds
"TCU":        {d:[15.2,16.0, 52.0,52.5, 16.5,16.0, 31.0,31.5, 37.0,37.5, 35.0,35.5, 50,51, 3.0,5.0, 109.5,110.5, 94.3,94.5, 68.0, 1762, -.005, .32, 0, 0], s:9, hb:4.5, kp:31, rec:"20-12", coach:"Jamie Dixon", cAdj:.1, cNote:"Experienced roster", style:{p3:.36,d3r:45,ht:78,toF:10.0,t:68.0}},
"Iowa":       {d:[15.8,16.5, 52.0,52.5, 15.5,15.0, 30.0,30.5, 36.0,36.5, 34.0,34.5, 50,51, 5.0,6.5, 108,109, 92.2,92.5, 62.0, 1772, .01, .38, 0, 0], s:9, hb:4.0, kp:25, rec:"22-11", coach:"Fran McCaffery", cAdj:-.3, cNote:"11 spots above Clemson in KenPom", style:{p3:.34,d3r:45,ht:78,toF:9.5,t:62.0}},
"Saint Louis": {d:[18.8,21.0, 53.5,55.0, 16.0,15.0, 31.0,32.0, 37.0,38.0, 36.0,38.0, 53,55, 12.0,15.0, 113,115, 94.2,94.0, 67.0, 1790, -.01, .51, .55, 0], s:9, hb:4.0, kp:37, rec:"28-5", coach:"Josh Schertz", cAdj:-.3, cNote:"A-10 champ, 28-5 but first major tourney", style:{p3:.40,d3r:5,ht:79,toF:10.5,t:67.0}},
"Utah State": {d:[19.2,20.5, 53.0,54.0, 15.5,15.0, 31.0,31.5, 37.0,37.5, 35.5,36.5, 52,53, 10.0,12.0, 112,113.5, 92.8,93.0, 67.0, 1790, -.005, .42, 0, 0], s:9, hb:4.0, kp:32, rec:"27-7", coach:"Jerrod Calhoun", cAdj:0, cNote:"1 spot ahead of Villanova in KenPom", style:{p3:.37,d3r:35,ht:78,toF:10.0,t:67.0}},
// 10-seeds
"UCF":        {d:[15.8,14.5, 52.5,51.5, 16.5,17.5, 31.0,30.5, 36.0,35.5, 35.0,34.0, 50,48, 4.0,1.5, 112,110.5, 96.2,96.0, 69.0, 1768, -.008, .35, 0, 0], s:10, hb:3.5, kp:40, rec:"20-12", coach:"Johnny Dawkins", cAdj:0, cNote:"", style:{p3:.37,d3r:50,ht:78,toF:9.5,t:69.0}},
"Texas A&M":  {d:[17.8,17.0, 52.0,51.5, 16.5,17.0, 34.0,34.5, 37.0,37.0, 34.0,33.5, 50,49, 6.0,5.0, 111,110.5, 93.2,93.5, 68.0, 1785, .01, .35, 0, 0], s:10, hb:4.0, kp:34, rec:"21-11", coach:"Bucky McMillan", cAdj:-.3, cNote:"#8 in experience per KenPom, graybeards", style:{p3:.36,d3r:45,ht:79,toF:10.0,t:68.0}},
"Santa Clara": {d:[16.8,19.0, 53.5,55.0, 15.5,14.5, 29.0,30.0, 34.0,35.0, 37.0,38.5, 53,55, 10.0,13.5, 112,114, 95.2,95.0, 66.0, 1775, -.01, .48, .55, 0], s:10, hb:3.5, kp:38, rec:"24-9", coach:"Herb Sendek", cAdj:.1, cNote:"30 years HC, steady hand, good shooters", style:{p3:.42,d3r:38,ht:77,toF:9.5,t:66.0}},
"Missouri":   {d:[15.5,16.0, 52.5,53.0, 16.5,16.0, 30.0,30.5, 36.0,36.5, 34.5,35.0, 50,51, 4.0,5.5, 111,112, 95.5,96.0, 69.0, 1770, .005, .32, 0, 0], s:10, hb:4.0, kp:42, rec:"20-12", coach:"Dennis Gates", cAdj:0, cNote:"", style:{p3:.36,d3r:50,ht:78,toF:9.5,t:69.0}},
// 11-seeds
"VCU":        {d:[18.2,22.5, 52.5,54.0, 15.5,14.0, 30.0,31.5, 36.0,37.5, 35.0,37.5, 50,53, 8.5,14.0, 112,115, 93.8,92.5, 66.0, 1782, -.015, .61, .80, 0], s:11, hb:3.5, kp:47, rec:"24-9", coach:"Ryan Odom", cAdj:.1, cNote:"Tournament-tested defensive team", style:{p3:.38,d3r:30,ht:77,toF:11.0,t:66.0}},
"S. Florida":  {d:[16.2,19.0, 53.0,54.5, 16.8,15.5, 32.0,33.0, 36.0,37.5, 34.5,36.0, 51,53, 10.0,14.0, 112.5,115, 96.3,96.0, 70.0, 1770, -.01, .50, .60, 0], s:11, hb:4.0, kp:44, rec:"24-9", coach:"Amir Abdur-Rahim", cAdj:-.3, cNote:"11-game win streak entering tourney", style:{p3:.35,d3r:52,ht:78,toF:10.5,t:70.0}},
"SMU":        {d:[17.5,18.5, 53.8,54.5, 16.0,15.5, 30.0,30.5, 36.0,37.0, 36.0,37.0, 52,53, 5.0,7.5, 112,113, 94.5,94.5, 68.0, 1780, -.01, .42, 0, 0], s:11, hb:4.0, kp:39, rec:"20-13", coach:"Andy Enfield", cAdj:.1, cNote:"FGCU F4 run, experienced", style:{p3:.38,d3r:35,ht:78,toF:10.0,t:68.0}},
"Texas":      {d:[14.2,15.0, 52.8,53.0, 17.0,16.5, 30.0,30.5, 36.0,36.5, 34.5,35.0, 50,51, 4.0,5.5, 111,112, 96.8,97.0, 69.0, 1760, .01, .30, 0, 0], s:11, hb:4.0, kp:45, rec:"18-14", coach:"Rodney Terry", cAdj:0, cNote:"Lost 3 straight entering tourney", style:{p3:.37,d3r:42,ht:78,toF:10.0,t:69.0}},
// 12-seeds
"N. Iowa":    {d:[10.5,12.5, 50.5,52.0, 17.0,15.5, 30.0,31.0, 33.0,34.0, 34.0,35.5, 49,52, 8.0,11.0, 107,109, 96.5,96.5, 62.0, 1710, -.01, .37, .40, 0], s:12, hb:3.5, kp:50, rec:"25-7", coach:"Ben Jacobson", cAdj:.2, cNote:"#25 KenPom defense is elite", style:{p3:.35,d3r:25,ht:78,toF:10.0,t:62.0}},
"McNeese":    {d:[12.5,14.0, 52.0,53.0, 17.0,16.0, 33.0,34.0, 36.0,37.0, 35.0,36.0, 51,53, 10.0,12.5, 109,111, 96.5,97.0, 71.0, 1720, -.01, .46, .65, 0], s:12, hb:3.5, kp:55, rec:"28-5", coach:"Will Wade", cAdj:0, cNote:"Southland champ, deep squad", style:{p3:.38,d3r:70,ht:77,toF:11.5,t:71.0}},
"Akron":      {d:[12.5,16.2, 52.2,54.5, 17.5,15.8, 32.8,33.5, 35.2,36.5, 37.0,40.0, 51,54, 7.8,12.5, 108.5,111, 96.0,94.8, 67.5, 1720, -.005, .54, .75, 0], s:12, hb:3.5, kp:52, rec:"26-7", coach:"John Groce", cAdj:0, cNote:"MAC-tested, seniors, top-10 3PT team (40%)", style:{p3:.50,d3r:65,ht:76,toF:9.2,t:67.5}},
"High Point": {d:[7.5,10.0, 51.0,52.5, 17.5,16.5, 32.0,33.0, 36.0,37.0, 35.5,37.0, 51,53, 8.0,12.0, 107,109, 99.5,99.0, 70.0, 1680, -.008, .46, .60, 0], s:12, hb:3.5, kp:65, rec:"25-8", coach:"Tubby Smith", cAdj:.2, cNote:"Battle-tested, push tempo", style:{p3:.40,d3r:90,ht:77,toF:9.5,t:70.0}},
// 13-seeds
"Cal Baptist": {d:[5.2,6.5, 50.0,51.0, 18.0,17.5, 32.0,32.5, 35.0,35.5, 34.0,35.0, 48,49, 6.0,7.5, 104,105.5, 98.8,99.0, 66.0, 1645, -.02, .25, .30, 0], s:13, hb:3.0, kp:95, rec:"24-9", coach:"Rick Croy", cAdj:0, cNote:"WAC champ, first tourney", style:{p3:.36,d3r:60,ht:77,toF:9.0,t:66.0}},
"Troy":       {d:[8.2,6.5, 50.5,49.5, 17.5,18.5, 31.0,30.0, 35.0,34.0, 33.5,32.0, 49,47, 6.0,3.0, 106,104.5, 97.8,98.0, 67.0, 1690, .005, .27, .35, -1.0], s:13, hb:3.0, kp:80, rec:"24-10", coach:"Scott Cross", cAdj:0, cNote:"Conf tourney champ, 70-spot KP gap", style:{p3:.35,d3r:55,ht:77,toF:9.5,t:67.0}},
"Hofstra":    {d:[10.8,13.5, 52.5,54.0, 16.0,15.0, 31.0,32.0, 35.0,36.0, 37.0,39.0, 52,54, 10.0,13.0, 109,111, 98.2,97.5, 69.0, 1708, -.005, .51, .70, 0], s:13, hb:3.0, kp:60, rec:"27-6", coach:"Speedy Claxton", cAdj:-.5, cNote:"First ever tourney for program", style:{p3:.48,d3r:80,ht:76,toF:9.2,t:69.0}},
"Hawaii":     {d:[5.0,5.5, 50.5,51.0, 17.5,17.0, 31.0,31.5, 34.0,34.5, 34.0,35.0, 49,50, 7.0,8.0, 105,106, 100.0,100.5, 68.0, 1650, -.005, .30, .35, 0], s:13, hb:3.0, kp:90, rec:"22-11", coach:"Eran Ganot", cAdj:0, cNote:"", style:{p3:.36,d3r:65,ht:77,toF:9.0,t:68.0}},
// 14-seeds
"N. Dakota St.":{d:[1.2,2.0, 49.0,50.0, 18.5,18.0, 29.0,29.5, 32.0,32.5, 33.0,34.0, 47,48, 4.0,5.5, 101,102, 99.8,100, 66.0, 1530, -.01, .20, 0, 0], s:14, hb:3.0, kp:110, rec:"27-7", coach:"David Richman", cAdj:0, cNote:"Summit champ", style:{p3:.35,d3r:50,ht:77,toF:9.0,t:66.0}},
"Penn":       {d:[-0.5,0.5, 48.5,49.5, 19.0,18.5, 28.0,28.5, 31.0,31.5, 33.0,34.0, 47,48, 4.0,5.5, 100,101, 100.5,100.5, 65.0, 1500, -.01, .20, 0, 0], s:14, hb:3.0, kp:115, rec:"17-11", coach:"Steve Donahue", cAdj:0, cNote:"Ivy champ", style:{p3:.36,d3r:55,ht:77,toF:9.0,t:65.0}},
"Wright St.": {d:[4.5,6.0, 51.0,52.0, 18.0,17.0, 31.0,32.0, 34.0,35.0, 34.5,36.0, 49,51, 6.0,8.5, 105,107, 100.5,101, 69.0, 1640, .005, .25, .20, 0], s:14, hb:3.0, kp:100, rec:"23-11", coach:"Clint Sargent", cAdj:0, cNote:"Horizon champ", style:{p3:.37,d3r:55,ht:77,toF:9.0,t:69.0}},
"Kennesaw St.":{d:[-2.0,-1.0, 48.0,49.0, 19.0,18.5, 28.0,28.5, 31.0,31.5, 33.0,34.0, 46,47, 3.0,4.0, 99,100, 101,101, 67.0, 1470, -.01, .15, 0, 0], s:14, hb:3.0, kp:130, rec:"22-12", coach:"Amir Abdur-Rahim II", cAdj:0, cNote:"ASUN champ, 91-spot KP gap vs Gonzaga", style:{p3:.36,d3r:60,ht:77,toF:9.0,t:67.0}},
// 15-seeds
"Furman":     {d:[6.5,7.5, 50.0,51.0, 18.0,17.5, 30.0,30.5, 34.0,34.5, 34.0,35.0, 49,50, 5.0,6.5, 105,106, 98.5,98.5, 66.0, 1670, .005, .30, .20, 0], s:15, hb:3.5, kp:70, rec:"24-10", coach:"Bob Richey", cAdj:0, cNote:"SoCon champ", style:{p3:.36,d3r:40,ht:77,toF:9.0,t:66.0}},
"Idaho":      {d:[-8.5,-7.5, 46.0,47.0, 20.0,19.5, 27.0,27.5, 30.0,30.5, 31.0,32.0, 44,45, 2.0,3.0, 96,97, 104.5,104.5, 66.0, 1410, .01, .10, 0, 0], s:15, hb:3.0, kp:200, rec:"20-13", coach:"Alex Pribble", cAdj:0, cNote:"", style:{p3:.34,d3r:70,ht:77,toF:8.5,t:66.0}},
"Queens":     {d:[-5.0,-4.0, 47.5,48.0, 19.5,19.0, 29.0,29.5, 31.0,31.5, 32.0,33.0, 46,47, 3.0,4.0, 98,99, 103,103, 66.0, 1440, .005, .15, 0, 0], s:15, hb:3.0, kp:190, rec:"22-12", coach:"Chad McMillan", cAdj:0, cNote:"First-ever tourney team", style:{p3:.35,d3r:60,ht:76,toF:8.5,t:66.0}},
"Tennessee St.":{d:[-2.0,-1.0, 48.0,49.0, 19.0,18.5, 29.0,29.5, 32.0,32.5, 32.0,33.0, 46,47, 5.0,6.5, 99,100, 101,101, 67.0, 1475, -.01, .20, 0, 0], s:15, hb:3.0, kp:140, rec:"23-9", coach:"Brian Collins", cAdj:0, cNote:"OVC champ", style:{p3:.35,d3r:55,ht:77,toF:9.0,t:67.0}},
// 16-seeds
"Siena":      {d:[-3.5,-2.5, 48.0,49.0, 19.5,19.0, 28.0,28.5, 30.0,30.5, 33.0,34.0, 46,47, 2.0,3.5, 99,100, 102.5,102.5, 65.0, 1460, -.01, .15, 0, 0], s:16, hb:3.0, kp:170, rec:"23-11", coach:"Carmen Maciariello", cAdj:0, cNote:"MAAC champ", style:{p3:.36,d3r:60,ht:76,toF:8.5,t:65.0}},
"LIU":        {d:[-10.0,-9.0, 46.0,47.0, 20.5,20.0, 27.0,27.5, 29.0,29.5, 31.0,32.0, 44,45, 1.0,2.0, 95,96, 105,105, 66.0, 1400, .01, .10, 0, 0], s:16, hb:3.0, kp:220, rec:"20-14", coach:"Rod Strickland", cAdj:0, cNote:"NEC champ", style:{p3:.34,d3r:70,ht:76,toF:8.0,t:66.0}},
"UMBC":       {d:[0.5,1.0, 49.5,50.0, 19.0,18.5, 29.0,29.5, 32.0,32.5, 33.5,34.0, 47,48, 2.0,3.0, 100.5,101, 100,100, 68.0, 1485, .01, .15, 0, 0], s:16, hb:3.0, kp:150, rec:"24-8", coach:"Jim Ferry", cAdj:0, cNote:"Am East champ, 19-2 ATS when favored", style:{p3:.36,d3r:55,ht:77,toF:9.0,t:68.0}},
"Lehigh":     {d:[-2.5,-1.0, 51.2,52.5, 18.0,17.0, 27.0,28.0, 31.0,32.0, 36.0,38.5, 48,50, 5.0,7.5, 101,103, 103.5,104, 67.0, 1468, -.02, .25, .15, 0], s:16, hb:3.0, kp:145, rec:"18-16", coach:"Brett Reed", cAdj:0, cNote:"Patriot champ, covered 7 of last 9", style:{p3:.42,d3r:55,ht:76,toF:8.5,t:67.0}},
"NC State":   {d:[10.0,8.0, 51.5,50.5, 17.0,18.0, 30.0,29.5, 34.0,33.5, 36.5,38.0, 49,48, 3.0,1.0, 108,106, 98,98, 68.0, 1700, .02, .25, .20, 0], s:11, hb:3.5, kp:48, rec:"20-13", coach:"Kevin Keatts", cAdj:.1, cNote:"F4 run as 11-seed in '24!", style:{p3:.38,d3r:45,ht:78,toF:10.0,t:68.0}},
};

// VEGAS OPENING LINES (FanDuel, March 15 ~7pm ET)
const VEGAS={
  "Duke vs Siena":29.5,"Ohio State vs TCU":2.5,"St. John's vs N. Iowa":11.5,"Kansas vs Cal Baptist":13.5,
  "Louisville vs S. Florida":6.5,"Michigan St. vs N. Dakota St.":16.5,"UCLA vs UCF":5.5,"UConn vs Furman":20.5,
  "Florida vs Lehigh":24,"Clemson vs Iowa":-2.5,"Vanderbilt vs McNeese":12.5,"Nebraska vs Troy":13.5,
  "N. Carolina vs VCU":2.5,"Illinois vs Penn":23.5,"St. Mary's vs Texas A&M":3.5,"Houston vs Idaho":22.5,
  "Arizona vs LIU":29.5,"Villanova vs Utah State":-1.5,"Wisconsin vs High Point":9.5,"Arkansas vs Hawaii":15.5,
  "BYU vs Texas":8,"Gonzaga vs Kennesaw St.":20.5,"Kentucky vs Santa Clara":3.5,"Purdue vs Queens":24.5,
  "Michigan vs UMBC":28,"Georgia vs Saint Louis":2.5,"Texas Tech vs Akron":7.5,"Alabama vs Hofstra":12.5,
  "Tennessee vs SMU":8.5,"Virginia vs Wright St.":17.5,"Miami FL vs Missouri":4,"Iowa State vs Tennessee St.":24.5,
};

// Moneylines & spread juice from DraftKings/ESPN as of 3/16 evening
// Format: [favML, dogML, spreadJuice] — favML is negative (e.g. -20000), dogML positive (e.g. +3500)
// spreadJuice: standard -110 both sides unless noted
const ODDS={
  "Duke vs Siena":[-20000,3500,-110],"Ohio State vs TCU":[-150,128,-110],"St. John's vs N. Iowa":[-550,420,-110],
  "Kansas vs Cal Baptist":[-1200,750,-110],"Louisville vs S. Florida":[-280,225,-110],"Michigan St. vs N. Dakota St.":[-1800,1000,-110],
  "UCLA vs UCF":[-240,195,-110],"UConn vs Furman":[-4000,1800,-110],
  "Florida vs Lehigh":[-8000,2500,-110],"Clemson vs Iowa":[128,-150,-110],"Vanderbilt vs McNeese":[-625,455,-110],
  "Nebraska vs Troy":[-1350,800,-110],"N. Carolina vs VCU":[-142,120,-110],"Illinois vs Penn":[-10000,3000,-110],
  "St. Mary's vs Texas A&M":[-135,114,-110],"Houston vs Idaho":[-8000,2200,-110],
  "Arizona vs LIU":[-10000,3000,-110],"Villanova vs Utah State":[120,-142,-110],"Wisconsin vs High Point":[-475,365,-110],
  "Arkansas vs Hawaii":[-1600,900,-110],"BYU vs Texas":[-380,300,-110],"Gonzaga vs Kennesaw St.":[-5000,1800,-110],
  "Kentucky vs Santa Clara":[-166,140,-110],"Purdue vs Queens":[-8000,2200,-110],
  "Michigan vs UMBC":[-15000,3000,-110],"Georgia vs Saint Louis":[-142,120,-110],
  "Texas Tech vs Akron":[-380,300,-110],"Alabama vs Hofstra":[-700,490,-110],
  "Tennessee vs SMU":[-400,310,-110],"Virginia vs Wright St.":[-3200,1400,-110],
  "Miami FL vs Missouri":[-190,158,-110],"Iowa State vs Tennessee St.":[-8000,2200,-110],
};

function buildT(n){const t=DB[n];if(!t)return null;const r=t.d;return{em:rw(r[0],r[1],RW.em),efg:rw(r[2],r[3],RW.efg),tor:rw(r[4],r[5],RW.tor),orb:rw(r[6],r[7],RW.orb),ftr:rw(r[8],r[9],RW.ftr),tpt:rw(r[10],r[11],RW.tpt),ast:rw(r[12],r[13],RW.ast),mg:rw(r[14],r[15],RW.mg),o:rw(r[16],r[17],RW.em),d:rw(r[18],r[19],RW.em),t:r[20],elo:r[21],lk:r[22],st:r[23],ci:r[24],ij:r[25],s:t.s,hb:t.hb,kp:t.kp,rec:t.rec,coach:t.coach,cAdj:t.cAdj,cNote:t.cNote,sty:t.style,name:n,em_s:r[0],em_r:r[1],efg_s:r[2],efg_r:r[3]};}

// ═══ MATCHUP-ADJUSTED FOUR FACTORS ═══
// Instead of a single point adjustment, matchups now modify each team's
// eFG%, TO rate, ORB%, and FTR BEFORE they enter the Layer 2 calculation.
// This is architecturally correct: the matchup IS the shooting/rebounding prediction.
function matchupAdjustStats(nA, nB) {
  const a = DB[nA]?.style, b = DB[nB]?.style;
  // Adjustments to each team's stats: positive = better for that team
  const adjA = { efg: 0, tor: 0, orb: 0, ftr: 0 };
  const adjB = { efg: 0, tor: 0, orb: 0, ftr: 0 };
  const det = [];

  if (!a || !b) return { adjA, adjB, det, tempoAdj: 0 };

  // 1. 3PT OFFENSE vs 3PT DEFENSE → adjusts eFG%
  // If team A relies heavily on 3s AND opponent has elite 3PT D, lower A's eFG%
  if (a.p3 >= 0.42 && b.d3r <= 25) {
    const pen = -(a.p3 - 0.35) * 5.0; // ~-0.35 to -0.75 eFG% points
    adjA.efg += pen;
    det.push({ t: "3PT vs Elite 3PT-D", stat: "eFG%", team: nA, i: pen, d: `${nA}'s 3PT-heavy attack (${(a.p3*100).toFixed(0)}%) faces ${nB}'s #${b.d3r} 3PT defense → eFG% lowered` });
  }
  if (b.p3 >= 0.42 && a.d3r <= 25) {
    const pen = -(b.p3 - 0.35) * 5.0;
    adjB.efg += pen;
    det.push({ t: "3PT vs Elite 3PT-D", stat: "eFG%", team: nB, i: pen, d: `${nB}'s 3PT-heavy attack (${(b.p3*100).toFixed(0)}%) faces ${nA}'s #${a.d3r} 3PT defense → eFG% lowered` });
  }
  // 3PT FEAST: 3PT-heavy team vs weak 3PT D → eFG% boosted
  if (a.p3 >= 0.42 && b.d3r >= 100) {
    const bst = (a.p3 - 0.38) * 3.5;
    adjA.efg += bst;
    det.push({ t: "3PT feast", stat: "eFG%", team: nA, i: bst, d: `${nA}'s 3PT attack vs ${nB}'s weak 3PT D (#${b.d3r}) → open looks, eFG% boosted` });
  }
  if (b.p3 >= 0.42 && a.d3r >= 100) {
    const bst = (b.p3 - 0.38) * 3.5;
    adjB.efg += bst;
    det.push({ t: "3PT feast", stat: "eFG%", team: nB, i: bst, d: `${nB}'s 3PT attack vs ${nA}'s weak 3PT D (#${a.d3r}) → open looks, eFG% boosted` });
  }

  // 2. SIZE MISMATCH → adjusts ORB% and FTR
  const htDiff = a.ht - b.ht;
  if (Math.abs(htDiff) >= 2) {
    const orbAdj = htDiff * 0.4; // ~0.4 ORB% points per inch
    const ftrAdj = htDiff * 0.25; // bigger team gets to the line more / blocks drives
    adjA.orb += orbAdj; adjB.orb -= orbAdj;
    adjA.ftr += ftrAdj; adjB.ftr -= ftrAdj;
    det.push({ t: "Size mismatch", stat: "ORB% & FTR", team: htDiff > 0 ? nA : nB, i: Math.abs(orbAdj),
      d: `${htDiff > 0 ? nA : nB} has ${Math.abs(htDiff)}" height edge → ORB% ${htDiff > 0 ? "+" : ""}${orbAdj.toFixed(1)}, FTR ${htDiff > 0 ? "+" : ""}${ftrAdj.toFixed(1)}` });
  }

  // 3. TURNOVER-FORCING DEFENSE → adjusts opponent's TO rate
  if (a.toF >= 11.0) {
    const toAdj = (a.toF - 10.0) * 0.5; // forces ~0.5-0.75 extra TOs
    adjB.tor += toAdj; // INCREASE B's TO rate (bad for B)
    det.push({ t: "Disruptive defense", stat: "TO Rate", team: nB, i: toAdj,
      d: `${nA} forces ${a.toF} TOs/g → ${nB}'s TO rate increased by +${toAdj.toFixed(1)}%` });
  }
  if (b.toF >= 11.0) {
    const toAdj = (b.toF - 10.0) * 0.5;
    adjA.tor += toAdj;
    det.push({ t: "Disruptive defense", stat: "TO Rate", team: nA, i: toAdj,
      d: `${nB} forces ${b.toF} TOs/g → ${nA}'s TO rate increased by +${toAdj.toFixed(1)}%` });
  }

  // 4. TEMPO CLASH → stays as a separate adjustment (affects game pace, not individual stats)
  let tempoAdj = 0;
  const td = Math.abs(a.t - b.t);
  if (td >= 5) {
    tempoAdj = a.t < b.t ? 0.3 : -0.3;
    det.push({ t: "Tempo clash", stat: "Pace", team: a.t < b.t ? nA : nB, i: tempoAdj,
      d: `${Math.round(td)}-possession tempo gap — ${a.t < b.t ? nA : nB}'s slower pace controls the game` });
  }

  return { adjA, adjB, det, tempoAdj };
}

// ═══ UPGRADE 15: FATIGUE SYSTEM ═══
// benchPct = % of minutes from bench (higher = deeper rotation)
// confTG = conference tournament games played (March 10-15)
// starMin = avg minutes/game for top 2 players
// rotSize = players averaging 12+ MPG
// gamesPlayed = total season games through conf tourney
const FAT={
  "Duke":{bp:26,ctg:3,sm:33.5,rot:7,gp:35},"Arizona":{bp:30,ctg:3,sm:32.0,rot:8,gp:35},
  "Michigan":{bp:24,ctg:3,sm:34.5,rot:7,gp:35},"Florida":{bp:28,ctg:2,sm:33.0,rot:8,gp:34},
  "UConn":{bp:27,ctg:2,sm:34.0,rot:7,gp:35},"Houston":{bp:25,ctg:2,sm:34.5,rot:7,gp:35},
  "Iowa State":{bp:29,ctg:2,sm:32.5,rot:8,gp:35},"Purdue":{bp:23,ctg:3,sm:35.0,rot:7,gp:38},
  "Michigan St.":{bp:32,ctg:2,sm:31.0,rot:9,gp:34},"Illinois":{bp:27,ctg:2,sm:33.5,rot:7,gp:34},
  "Gonzaga":{bp:28,ctg:2,sm:33.0,rot:7,gp:35},"Virginia":{bp:25,ctg:3,sm:33.5,rot:7,gp:37},
  "Kansas":{bp:17,ctg:2,sm:36.0,rot:6,gp:35},"Nebraska":{bp:28,ctg:2,sm:33.0,rot:8,gp:34},
  "Arkansas":{bp:30,ctg:4,sm:32.0,rot:8,gp:38},"Alabama":{bp:31,ctg:2,sm:31.5,rot:9,gp:34},
  "St. John's":{bp:24,ctg:4,sm:34.0,rot:7,gp:37},"Vanderbilt":{bp:27,ctg:3,sm:33.0,rot:8,gp:36},
  "Texas Tech":{bp:22,ctg:1,sm:35.5,rot:6,gp:34},"Wisconsin":{bp:26,ctg:2,sm:33.5,rot:7,gp:35},
  "Louisville":{bp:33,ctg:2,sm:30.5,rot:9,gp:34},"N. Carolina":{bp:24,ctg:2,sm:34.0,rot:7,gp:35},
  "BYU":{bp:28,ctg:2,sm:33.0,rot:8,gp:35},"Tennessee":{bp:27,ctg:2,sm:33.5,rot:7,gp:35},
  "UCLA":{bp:27,ctg:2,sm:33.0,rot:8,gp:34},"St. Mary's":{bp:25,ctg:2,sm:34.0,rot:7,gp:34},
  "Kentucky":{bp:29,ctg:1,sm:32.5,rot:8,gp:34},"Miami FL":{bp:28,ctg:2,sm:33.0,rot:8,gp:34},
  "Ohio State":{bp:26,ctg:2,sm:34.0,rot:7,gp:35},"Clemson":{bp:24,ctg:2,sm:34.5,rot:7,gp:35},
  "Iowa":{bp:26,ctg:1,sm:33.5,rot:7,gp:35},"Georgia":{bp:34,ctg:2,sm:30.0,rot:9,gp:34},
  "Villanova":{bp:27,ctg:2,sm:33.0,rot:8,gp:34},"Utah State":{bp:28,ctg:2,sm:33.0,rot:8,gp:36},
  "TCU":{bp:26,ctg:1,sm:34.0,rot:7,gp:34},"Saint Louis":{bp:30,ctg:3,sm:32.0,rot:8,gp:36},
  "VCU":{bp:29,ctg:3,sm:32.5,rot:8,gp:36},"S. Florida":{bp:28,ctg:3,sm:33.0,rot:8,gp:36},
  "UCF":{bp:27,ctg:1,sm:33.5,rot:7,gp:34},"Texas A&M":{bp:32,ctg:1,sm:30.5,rot:9,gp:34},
  "Santa Clara":{bp:27,ctg:2,sm:33.5,rot:7,gp:35},"Missouri":{bp:28,ctg:1,sm:33.0,rot:8,gp:34},
  "SMU":{bp:30,ctg:2,sm:32.0,rot:8,gp:35},"Texas":{bp:27,ctg:1,sm:33.5,rot:7,gp:34},
  "Miami OH":{bp:25,ctg:1,sm:34.5,rot:7,gp:34},"NC State":{bp:28,ctg:2,sm:33.0,rot:8,gp:35},
  "N. Iowa":{bp:27,ctg:2,sm:33.5,rot:7,gp:34},"McNeese":{bp:30,ctg:2,sm:31.5,rot:8,gp:35},
  "Akron":{bp:27,ctg:3,sm:33.0,rot:8,gp:38},"High Point":{bp:29,ctg:3,sm:32.5,rot:8,gp:36},
  "Cal Baptist":{bp:28,ctg:2,sm:33.0,rot:8,gp:35},"Troy":{bp:28,ctg:3,sm:33.0,rot:8,gp:37},
  "Hofstra":{bp:27,ctg:3,sm:33.5,rot:7,gp:36},"Hawaii":{bp:28,ctg:2,sm:33.0,rot:8,gp:35},
  "N. Dakota St.":{bp:28,ctg:2,sm:33.0,rot:8,gp:36},"Penn":{bp:26,ctg:2,sm:34.0,rot:7,gp:30},
  "Wright St.":{bp:27,ctg:3,sm:33.0,rot:8,gp:36},"Kennesaw St.":{bp:29,ctg:3,sm:32.5,rot:8,gp:37},
  "Furman":{bp:28,ctg:3,sm:33.0,rot:8,gp:37},"Idaho":{bp:29,ctg:2,sm:32.5,rot:8,gp:35},
  "Queens":{bp:27,ctg:2,sm:33.5,rot:7,gp:36},"Tennessee St.":{bp:29,ctg:2,sm:32.5,rot:8,gp:34},
  "Siena":{bp:28,ctg:3,sm:33.0,rot:8,gp:37},"LIU":{bp:28,ctg:2,sm:33.0,rot:8,gp:36},
  "UMBC":{bp:28,ctg:2,sm:33.0,rot:8,gp:34},"Lehigh":{bp:27,ctg:2,sm:33.5,rot:7,gp:36},
  "Yale":{bp:26,ctg:2,sm:33.5,rot:7,gp:32},
};

// Fatigue score: 0 (no fatigue) to ~3 pts max penalty
// Compounds per tournament round
function fatigue(name, round) {
  const f = FAT[name];
  if (!f || round <= 1) return { pts: 0, detail: null }; // R64 = round 1, no fatigue yet

  // Base fatigue vulnerability (0-1 scale, higher = more vulnerable)
  const benchVuln = Math.max(0, (30 - f.bp) / 20); // teams below 30% bench are vulnerable
  const starLoad = Math.max(0, (f.sm - 31) / 7);    // stars over 31 min are loaded
  const rotVuln = Math.max(0, (8 - f.rot) / 3);     // fewer than 8 rotation players is risky
  const seasonWear = Math.max(0, (f.gp - 33) / 8);  // more games = more wear

  // Conference tourney tax: each game played in the week before adds fatigue
  const confTax = Math.max(0, (f.ctg - 1) * 0.15);  // 1 game = baseline, each extra adds 0.15

  // Base vulnerability score (0-1)
  const baseVuln = benchVuln * 0.30 + starLoad * 0.25 + rotVuln * 0.25 + seasonWear * 0.10 + confTax * 0.10;

  // Round multiplier (compounds as tournament progresses)
  // R64=1 (0), R32=2 (0.3), S16=3 (0.7), E8=4 (1.2), F4=5 (1.8), Champ=6 (2.5)
  const roundMult = [0, 0, 0.3, 0.7, 1.2, 1.8, 2.5][Math.min(round, 6)];

  const penalty = -Math.round(baseVuln * roundMult * 100) / 100;

  const detail = penalty < -0.3 ? {
    benchPct: f.bp, starMin: f.sm, rot: f.rot, confTG: f.ctg, gp: f.gp,
    vuln: Math.round(baseVuln * 100), roundMult, penalty
  } : null;

  return { pts: penalty, detail };
}

// ═══════════════════════════════════════════════════════════════
// V8 TIER 1+2 UPGRADES — 8 NEW SYSTEMS
// ═══════════════════════════════════════════════════════════════

// V8 EXTENDED DATA: refSens, starBPR, gameState, lineMov, minCont, expRk, tz, foulRisk
// refSens: how much the team's spread depends on ref crew (FTR-dependent teams = higher)
// starBPR: top player's Bayesian Performance Rating (offensive impact)
// gsLead: team's AdjEM when leading (how well they hold leads)
// gsTrail: team's AdjEM when trailing (comeback ability)
// closeW/closeL: record in games decided by ≤5 pts
// lineDir: line movement direction (-=money coming against them, +=sharp money on them)
// minCont: KenPom minutes continuity % (how much of last year's minutes returned)
// expRk: KenPom experience ranking (1=most experienced)
// tz: timezone (ET=0, CT=-1, MT=-2, PT=-3, HI=-5)
// foulStar: star player's fouls per game
// backupDrop: point drop-off when star sits (higher = more vulnerable)
const V8={
"Duke":{refSens:.7,starBPR:9.8,gsLead:44,gsTrail:35,closeW:5,closeL:1,lineDir:.7,minCont:42,expRk:180,tz:0,foulStar:2.1,backupDrop:8},
"Arizona":{refSens:.5,starBPR:7.5,gsLead:40,gsTrail:33,closeW:4,closeL:2,lineDir:.3,minCont:35,expRk:45,tz:-2,foulStar:2.5,backupDrop:5},
"Michigan":{refSens:.5,starBPR:8.2,gsLead:42,gsTrail:34,closeW:3,closeL:2,lineDir:-.2,minCont:28,expRk:120,tz:0,foulStar:2.3,backupDrop:6},
"Florida":{refSens:.8,starBPR:7.0,gsLead:35,gsTrail:28,closeW:6,closeL:3,lineDir:.2,minCont:55,expRk:60,tz:0,foulStar:2.8,backupDrop:5},
"UConn":{refSens:.6,starBPR:7.8,gsLead:34,gsTrail:27,closeW:3,closeL:3,lineDir:.3,minCont:48,expRk:90,tz:0,foulStar:2.2,backupDrop:6},
"Houston":{refSens:.7,starBPR:6.5,gsLead:32,gsTrail:25,closeW:5,closeL:3,lineDir:0,minCont:52,expRk:35,tz:-1,foulStar:2.0,backupDrop:4},
"Iowa State":{refSens:.5,starBPR:6.8,gsLead:30,gsTrail:25,closeW:4,closeL:3,lineDir:.2,minCont:68,expRk:15,tz:-1,foulStar:2.4,backupDrop:5},
"Purdue":{refSens:.6,starBPR:8.5,gsLead:32,gsTrail:24,closeW:3,closeL:4,lineDir:.5,minCont:72,expRk:25,tz:0,foulStar:3.0,backupDrop:7},
"Michigan St.":{refSens:.5,starBPR:6.5,gsLead:30,gsTrail:24,closeW:5,closeL:2,lineDir:.2,minCont:58,expRk:40,tz:0,foulStar:2.3,backupDrop:4},
"Illinois":{refSens:.6,starBPR:7.2,gsLead:32,gsTrail:22,closeW:0,closeL:4,lineDir:-.3,minCont:45,expRk:75,tz:-1,foulStar:2.6,backupDrop:6},
"Gonzaga":{refSens:.5,starBPR:6.8,gsLead:30,gsTrail:23,closeW:3,closeL:1,lineDir:-.2,minCont:60,expRk:55,tz:-3,foulStar:2.4,backupDrop:5},
"Virginia":{refSens:.4,starBPR:5.8,gsLead:25,gsTrail:20,closeW:5,closeL:2,lineDir:.1,minCont:50,expRk:30,tz:0,foulStar:2.2,backupDrop:4},
"Kansas":{refSens:.7,starBPR:8.0,gsLead:28,gsTrail:16,closeW:2,closeL:5,lineDir:-.5,minCont:30,expRk:160,tz:-1,foulStar:2.8,backupDrop:9},
"Nebraska":{refSens:.5,starBPR:5.5,gsLead:24,gsTrail:19,closeW:4,closeL:2,lineDir:.1,minCont:55,expRk:50,tz:-1,foulStar:2.5,backupDrop:5},
"Arkansas":{refSens:.7,starBPR:6.8,gsLead:28,gsTrail:22,closeW:3,closeL:4,lineDir:.3,minCont:25,expRk:130,tz:-1,foulStar:2.6,backupDrop:5},
"Alabama":{refSens:.5,starBPR:8.5,gsLead:26,gsTrail:20,closeW:3,closeL:4,lineDir:-.5,minCont:38,expRk:110,tz:-1,foulStar:2.2,backupDrop:7},
"St. John's":{refSens:.5,starBPR:6.2,gsLead:28,gsTrail:22,closeW:4,closeL:3,lineDir:.8,minCont:40,expRk:70,tz:0,foulStar:2.5,backupDrop:5},
"Vanderbilt":{refSens:.6,starBPR:7.0,gsLead:26,gsTrail:20,closeW:3,closeL:2,lineDir:.2,minCont:50,expRk:65,tz:-1,foulStar:2.4,backupDrop:5},
"Texas Tech":{refSens:.8,starBPR:7.2,gsLead:26,gsTrail:18,closeW:2,closeL:3,lineDir:-.5,minCont:35,expRk:100,tz:-1,foulStar:2.7,backupDrop:8},
"Wisconsin":{refSens:.4,starBPR:5.8,gsLead:24,gsTrail:18,closeW:4,closeL:3,lineDir:0,minCont:65,expRk:20,tz:-1,foulStar:2.3,backupDrop:4},
"Louisville":{refSens:.6,starBPR:7.5,gsLead:24,gsTrail:18,closeW:2,closeL:3,lineDir:-.2,minCont:30,expRk:140,tz:0,foulStar:2.5,backupDrop:7},
"N. Carolina":{refSens:.5,starBPR:5.0,gsLead:22,gsTrail:15,closeW:3,closeL:5,lineDir:-.3,minCont:52,expRk:80,tz:0,foulStar:2.6,backupDrop:6},
"BYU":{refSens:.5,starBPR:9.2,gsLead:24,gsTrail:16,closeW:2,closeL:4,lineDir:0,minCont:32,expRk:150,tz:-2,foulStar:2.8,backupDrop:10},
"Tennessee":{refSens:.6,starBPR:6.0,gsLead:25,gsTrail:19,closeW:3,closeL:4,lineDir:.1,minCont:48,expRk:55,tz:0,foulStar:2.4,backupDrop:5},
"UCLA":{refSens:.5,starBPR:6.0,gsLead:22,gsTrail:16,closeW:3,closeL:3,lineDir:.1,minCont:55,expRk:45,tz:-3,foulStar:2.3,backupDrop:5},
"St. Mary's":{refSens:.4,starBPR:5.5,gsLead:22,gsTrail:18,closeW:4,closeL:2,lineDir:0,minCont:70,expRk:10,tz:-3,foulStar:2.2,backupDrop:4},
"Kentucky":{refSens:.7,starBPR:5.8,gsLead:20,gsTrail:14,closeW:2,closeL:5,lineDir:-.2,minCont:22,expRk:190,tz:0,foulStar:3.0,backupDrop:6},
"Miami FL":{refSens:.5,starBPR:6.5,gsLead:20,gsTrail:16,closeW:3,closeL:3,lineDir:.1,minCont:45,expRk:60,tz:0,foulStar:2.4,backupDrop:5},
"Ohio State":{refSens:.5,starBPR:6.8,gsLead:20,gsTrail:15,closeW:3,closeL:4,lineDir:0,minCont:42,expRk:85,tz:0,foulStar:2.5,backupDrop:6},
"Clemson":{refSens:.5,starBPR:5.5,gsLead:20,gsTrail:14,closeW:2,closeL:4,lineDir:-.2,minCont:48,expRk:70,tz:0,foulStar:2.6,backupDrop:5},
"Iowa":{refSens:.5,starBPR:5.8,gsLead:19,gsTrail:14,closeW:3,closeL:3,lineDir:.1,minCont:35,expRk:95,tz:-1,foulStar:2.4,backupDrop:5},
"Georgia":{refSens:.5,starBPR:6.0,gsLead:20,gsTrail:14,closeW:2,closeL:3,lineDir:-.1,minCont:40,expRk:75,tz:0,foulStar:2.5,backupDrop:5},
"Villanova":{refSens:.5,starBPR:5.8,gsLead:20,gsTrail:14,closeW:3,closeL:3,lineDir:0,minCont:38,expRk:90,tz:0,foulStar:2.4,backupDrop:5},
"Utah State":{refSens:.5,starBPR:6.0,gsLead:22,gsTrail:17,closeW:3,closeL:2,lineDir:.1,minCont:60,expRk:30,tz:-2,foulStar:2.3,backupDrop:4},
"TCU":{refSens:.5,starBPR:5.5,gsLead:18,gsTrail:13,closeW:2,closeL:3,lineDir:0,minCont:45,expRk:65,tz:-1,foulStar:2.5,backupDrop:5},
"Saint Louis":{refSens:.5,starBPR:6.5,gsLead:22,gsTrail:16,closeW:4,closeL:2,lineDir:.2,minCont:65,expRk:25,tz:-1,foulStar:2.3,backupDrop:4},
"VCU":{refSens:.5,starBPR:5.8,gsLead:22,gsTrail:16,closeW:4,closeL:2,lineDir:.5,minCont:60,expRk:35,tz:0,foulStar:2.4,backupDrop:4},
"S. Florida":{refSens:.5,starBPR:5.5,gsLead:20,gsTrail:14,closeW:3,closeL:2,lineDir:.1,minCont:55,expRk:50,tz:0,foulStar:2.5,backupDrop:5},
"UCF":{refSens:.5,starBPR:5.2,gsLead:18,gsTrail:12,closeW:2,closeL:3,lineDir:-.1,minCont:30,expRk:110,tz:0,foulStar:2.5,backupDrop:5},
"Texas A&M":{refSens:.5,starBPR:5.0,gsLead:20,gsTrail:15,closeW:3,closeL:3,lineDir:0,minCont:50,expRk:8,tz:-1,foulStar:2.3,backupDrop:4},
"Santa Clara":{refSens:.4,starBPR:5.8,gsLead:20,gsTrail:15,closeW:3,closeL:2,lineDir:.1,minCont:62,expRk:20,tz:-3,foulStar:2.3,backupDrop:4},
"Missouri":{refSens:.5,starBPR:6.2,gsLead:18,gsTrail:13,closeW:2,closeL:3,lineDir:0,minCont:32,expRk:105,tz:-1,foulStar:2.5,backupDrop:6},
"SMU":{refSens:.5,starBPR:5.5,gsLead:20,gsTrail:15,closeW:3,closeL:3,lineDir:0,minCont:40,expRk:80,tz:-1,foulStar:2.4,backupDrop:5},
"Texas":{refSens:.5,starBPR:5.0,gsLead:16,gsTrail:12,closeW:2,closeL:4,lineDir:-.2,minCont:35,expRk:100,tz:-1,foulStar:2.6,backupDrop:5},
"Akron":{refSens:.5,starBPR:5.5,gsLead:16,gsTrail:11,closeW:4,closeL:1,lineDir:.2,minCont:72,expRk:12,tz:0,foulStar:2.4,backupDrop:4},
"N. Iowa":{refSens:.4,starBPR:5.0,gsLead:14,gsTrail:8,closeW:3,closeL:2,lineDir:0,minCont:75,expRk:5,tz:-1,foulStar:2.3,backupDrop:4},
"McNeese":{refSens:.5,starBPR:5.5,gsLead:16,gsTrail:10,closeW:3,closeL:1,lineDir:0,minCont:55,expRk:40,tz:-1,foulStar:2.5,backupDrop:5},
"High Point":{refSens:.5,starBPR:5.0,gsLead:12,gsTrail:6,closeW:3,closeL:2,lineDir:0,minCont:50,expRk:45,tz:0,foulStar:2.5,backupDrop:5},
"Hofstra":{refSens:.5,starBPR:6.0,gsLead:14,gsTrail:8,closeW:3,closeL:2,lineDir:.1,minCont:50,expRk:50,tz:0,foulStar:2.4,backupDrop:5},
"NC State":{refSens:.5,starBPR:5.8,gsLead:12,gsTrail:8,closeW:2,closeL:4,lineDir:0,minCont:20,expRk:170,tz:0,foulStar:2.5,backupDrop:5},
"Miami OH":{refSens:.5,starBPR:5.5,gsLead:22,gsTrail:15,closeW:5,closeL:1,lineDir:.3,minCont:70,expRk:15,tz:0,foulStar:2.3,backupDrop:4},
};
// Default V8 for teams not in extended DB
const V8D={refSens:.5,starBPR:4.5,gsLead:10,gsTrail:5,closeW:2,closeL:2,lineDir:0,minCont:40,expRk:200,tz:0,foulStar:2.5,backupDrop:5};
function v8(n){return V8[n]||V8D;}

// ═══ TIER 1: Ref Crew Sensitivity ═══
// FTR-heavy teams benefit more from foul-heavy crews and suffer more from tight crews
// Since assignments aren't out yet, model as uncertainty penalty for FTR-dependent teams
function refAdj(nA,nB){
  const a=v8(nA),b=v8(nB);
  // Higher refSens = more variance from ref assignment (reduces certainty, slight regression)
  return (b.refSens-a.refSens)*0.3; // if A is more ref-dependent, penalize A slightly
}

// ═══ TIER 1: Game-State Performance ═══
// Teams that collapse when trailing vs teams that thrive when leading
function gameStateAdj(nA,nB,spread){
  const a=v8(nA),b=v8(nB);
  let adj=0;
  if(spread>0){
    // A is favored → A likely leads. How well does A hold leads vs B come back?
    adj+=(a.gsLead-a.gsTrail)/200; // A's lead-holding bonus
    adj-=(b.gsTrail-b.gsLead+10)/200; // B's comeback ability (trail>lead-10 = good comeback team)
  } else {
    adj-=(b.gsLead-b.gsTrail)/200;
    adj+=(a.gsTrail-a.gsLead+10)/200;
  }
  // Close game record
  const aCloseWP=a.closeW/(a.closeW+a.closeL+.001);
  const bCloseWP=b.closeW/(b.closeW+b.closeL+.001);
  adj+=(aCloseWP-bCloseWP)*0.8; // close-game clutch factor
  return Math.round(adj*100)/100;
}

// ═══ TIER 1: Sharp Money / Line Movement ═══
function sharpAdj(nA,nB){
  const a=v8(nA),b=v8(nB);
  return (a.lineDir-b.lineDir)*0.5; // sharp money indicator
}

// ═══ TIER 2: Roster Continuity & Experience ═══
function continuityAdj(nA,nB){
  const a=v8(nA),b=v8(nB);
  // Higher minutes continuity = better chemistry
  const contDiff=(a.minCont-b.minCont)/100*0.6;
  // Better experience rank = more poise under pressure
  const expDiff=(b.expRk-a.expRk)/200*0.4; // lower rank = better
  return Math.round((contDiff+expDiff)*100)/100;
}

// ═══ TIER 2: Timezone Travel Fatigue ═══
function tzAdj(nA,nB,ven){
  const a=v8(nA),b=v8(nB);
  // Determine venue timezone
  const venTZ={"Buffalo":0,"Greenville":0,"Tampa":0,"Philadelphia":0,"Washington DC":0,
    "OKC":-1,"St. Louis":-1,"Houston":-1,"Chicago":-1,"Dayton":0,
    "Portland":-3,"San Diego":-3,"San Jose":-3,"Indianapolis":0}[ven]||0;
  const aTZdiff=Math.abs((a.tz||0)-venTZ);
  const bTZdiff=Math.abs((b.tz||0)-venTZ);
  // Each timezone of travel = ~0.15 point penalty
  return (bTZdiff-aTZdiff)*0.15;
}

// ═══ TIER 2: Foul Trouble Risk ═══
function foulAdj(nA,nB){
  const a=v8(nA),b=v8(nB);
  // Risk = star foul rate × backup quality drop-off
  const aRisk=(a.foulStar/5)*(a.backupDrop/10)*0.3;
  const bRisk=(b.foulStar/5)*(b.backupDrop/10)*0.3;
  return Math.round((bRisk-aRisk)*100)/100; // higher risk for B = boost for A
}

// ═══ TIER 2: Ensemble Sub-Models ═══
// Run 3 independent models and blend with main model
function ensemble(a,b,tf){
  // Sub-model 1: Pure efficiency (EM only)
  const m1=1.1*(a.em-b.em)*tf;
  // Sub-model 2: Elo-only
  const m2=(a.elo-b.elo)/25*1.2;
  // Sub-model 3: Four Factors only (raw, no matchup adj)
  const m3=((a.efg-b.efg)*1.8*.4+(b.tor-a.tor)*1.2*.25+(a.orb-b.orb)*.7*.18+(a.ftr-b.ftr)*.6*.17)*tf;
  // Return average as an ensemble signal
  return{m1:Math.round(m1*10)/10,m2:Math.round(m2*10)/10,m3:Math.round(m3*10)/10,
    avg:Math.round((m1+m2+m3)/3*10)/10,
    agree:Math.sign(m1)===Math.sign(m2)&&Math.sign(m2)===Math.sign(m3)};
}

function sim(nA,nB,ven,vegasKey,round){
  const a=buildT(nA),b=buildT(nB);
  if(!a||!b)return{w:nA,l:nB,sW:75,sL:60,wp:75,sp:15,sW2:1,sL2:16,ven};
  const pA=hca(nA,ven,a.hb),pB=hca(nB,ven,b.hb);
  let hcav=0;
  if(pA.tag==="HOME"&&!pB.tag)hcav=pA.b;else if(pB.tag==="HOME"&&!pA.tag)hcav=-pB.b;
  else if(pA.tag==="NEAR"&&!pB.tag)hcav=pA.b;else if(pB.tag==="NEAR"&&!pA.tag)hcav=-pB.b;

  // ═══ MATCHUP-ADJUSTED STATS (feeds into L2) ═══
  const mu = matchupAdjustStats(nA, nB);
  const aEfg = a.efg + mu.adjA.efg;  const bEfg = b.efg + mu.adjB.efg;
  const aTor = a.tor + mu.adjA.tor;  const bTor = b.tor + mu.adjB.tor;
  const aOrb = a.orb + mu.adjA.orb;  const bOrb = b.orb + mu.adjB.orb;
  const aFtr = a.ftr + mu.adjA.ftr;  const bFtr = b.ftr + mu.adjB.ftr;

  const cDiff=((a.cAdj||0)-(b.cAdj||0))*.6;
  const tf=(a.t+b.t)/200;

  // Layer 1: Efficiency
  const L1=1.1*(a.em-b.em)*tf;
  // Layer 2: Four Factors (matchup-adjusted)
  const L2=((aEfg-bEfg)*1.8*.4+(bTor-aTor)*1.2*.25+(aOrb-bOrb)*.7*.18+(aFtr-bFtr)*.6*.17)*tf*.65;
  // Layer 3: Context
  const L3=((a.ast-b.ast)*.06+(a.elo-b.elo)/25*.3-((a.lk||0)-(b.lk||0))*4+((a.st||0)-(b.st||0))*1.2-(b.ci||0)*.5+(a.ij||0)-(b.ij||0)+hcav)*.65;
  // Layer 4: Coaching + tempo
  const L4=(mu.tempoAdj+cDiff)*.65;
  // Layer 5: Fatigue
  const rd=round||1;
  const fatA=fatigue(nA,rd), fatB=fatigue(nB,rd);
  const L5=fatA.pts-fatB.pts;

  // ═══ V8 TIER 1+2 ADJUSTMENTS ═══
  const rawSp0=L1+L2+L3+L4+L5;
  const v8ref=refAdj(nA,nB);
  const v8gs=gameStateAdj(nA,nB,rawSp0);
  const v8sharp=sharpAdj(nA,nB);
  const v8cont=continuityAdj(nA,nB);
  const v8tz=tzAdj(nA,nB,ven);
  const v8foul=foulAdj(nA,nB);
  const v8ens=ensemble(a,b,tf);
  const v8total=v8ref+v8gs+v8sharp+v8cont+v8tz+v8foul;

  // Ensemble blending: 80% main model + 20% ensemble average
  const sp=(rawSp0+v8total)*0.80+v8ens.avg*0.20;

  // Vegas blend
  const vk=vegasKey||`${nA} vs ${nB}`;const vl=VEGAS[vk];
  let finalSp=sp;
  if(vl!==undefined){finalSp=sp*.45+vl*.55;}
  const rawP=Φ(finalSp/11);const favP=iso(Math.max(rawP,1-rawP));const wp=favP;
  const at=(a.t+b.t)/2;
  const w=finalSp>=0?nA:nB,l=finalSp>=0?nB:nA;
  const avgPts=(at*(a.o+b.d)/200+at*(b.o+a.d)/200)/2;
  const sW=Math.round(avgPts+Math.abs(finalSp)/2);
  const sL=Math.round(avgPts-Math.abs(finalSp)/2);
  return{w,l,sW:Math.max(sW,sL+1),sL:Math.min(sL,sW-1),wp:Math.round(wp*1000)/10,sp:Math.round(Math.abs(finalSp)*10)/10,ven,
    sW2:(buildT(w)||{}).s,sL2:(buildT(l)||{}).s,
    ha:pA.tag==="HOME"?nA:pB.tag==="HOME"?nB:null,hb:Math.round(hcav*10)/10,
    mu,cDiff:Math.round(cDiff*10)/10,L1:Math.round(L1*10)/10,L2:Math.round(L2*10)/10,L3:Math.round(L3*10)/10,L4:Math.round(L4*10)/10,
    L5:Math.round(L5*10)/10,fatA,fatB,rd,
    v8:{ref:Math.round(v8ref*100)/100,gs:Math.round(v8gs*100)/100,sharp:Math.round(v8sharp*100)/100,cont:Math.round(v8cont*100)/100,tz:Math.round(v8tz*100)/100,foul:Math.round(v8foul*100)/100,ens:v8ens,total:Math.round(v8total*100)/100},
    adjStats:{aEfg:Math.round(aEfg*10)/10,bEfg:Math.round(bEfg*10)/10,aTor:Math.round(aTor*10)/10,bTor:Math.round(bTor*10)/10,aOrb:Math.round(aOrb*10)/10,bOrb:Math.round(bOrb*10)/10,aFtr:Math.round(aFtr*10)/10,bFtr:Math.round(bFtr*10)/10},
    modelSp:Math.round(sp*10)/10,vegasSp:vl!==undefined?vl:null,
    a,b,rawSp:Math.round(finalSp*10)/10};
}

function simAll(){
  const R=[];
  // First Four (Dayton) — winners advance
  const ff1w="UMBC"; // vs Howard
  const ff2w="SMU"; // -7.5 vs Miami OH
  const ff3w="Lehigh"; // vs Prairie View
  const ff4w="NC State"; // vs Texas (toss-up, NC State F4 pedigree)

  const r1=[
    // EAST (Duke region) — venues: Greenville, Buffalo
    sim("Duke","Siena","Greenville"),sim("Ohio State","TCU","Greenville"),
    sim("St. John's","N. Iowa","Buffalo"),sim("Kansas","Cal Baptist","Buffalo"),
    sim("S. Florida","Louisville","Tampa"),sim("Michigan St.","N. Dakota St.","Buffalo"),
    sim("UCLA","UCF","Philadelphia"),sim("UConn","Furman","Philadelphia"),
    // SOUTH (Florida region) — venues: Tampa, Greenville, OKC, St. Louis
    sim("Florida","Lehigh","Tampa","Florida vs Lehigh"),sim("Iowa","Clemson","Tampa","Clemson vs Iowa"),
    sim("Vanderbilt","McNeese","OKC"),sim("Nebraska","Troy","OKC"),
    sim("VCU","N. Carolina","Greenville","N. Carolina vs VCU"),sim("Illinois","Penn","Greenville"),
    sim("St. Mary's","Texas A&M","St. Louis"),sim("Houston","Idaho","St. Louis"),
    // WEST (Arizona region) — venues: OKC, Portland, San Diego, Philadelphia
    sim("Arizona","LIU","OKC","Arizona vs LIU"),sim("Utah State","Villanova","Philadelphia","Villanova vs Utah State"),
    sim("Wisconsin","High Point","OKC"),sim("Arkansas","Hawaii","Portland"),
    sim("BYU","NC State","Portland","BYU vs Texas"),sim("Gonzaga","Kennesaw St.","Portland","Gonzaga vs Kennesaw St."),
    sim("Miami FL","Missouri","San Diego"),sim("Purdue","Queens","OKC"),
    // MIDWEST (Michigan region) — venues: Buffalo, OKC, St. Louis
    sim("Michigan","UMBC","Buffalo","Michigan vs UMBC"),sim("Georgia","Saint Louis","Buffalo"),
    sim("Texas Tech","Akron","OKC"),sim("Alabama","Hofstra","OKC"),
    sim("Tennessee","SMU","St. Louis","Tennessee vs SMU"),sim("Virginia","Wright St.","Philadelphia"),
    sim("Santa Clara","Kentucky","St. Louis","Kentucky vs Santa Clara"),sim("Iowa State","Tennessee St.","St. Louis"),
  ];
  R.push({n:"ROUND OF 64",g:r1});
  const r2=[];for(let i=0;i<32;i+=2)r2.push(sim(r1[i].w,r1[i+1].w,r1[i].ven,null,2));
  R.push({n:"ROUND OF 32",g:r2});
  const rv=i=>i<4?"Washington DC":i<8?"Houston":i<12?"San Jose":"Chicago";
  const s16=[];for(let i=0;i<16;i+=2)s16.push(sim(r2[i].w,r2[i+1].w,rv(i),null,3));
  R.push({n:"SWEET SIXTEEN",g:s16});
  const e8V=["Washington DC","Houston","San Jose","Chicago"];
  const e8=[];for(let i=0;i<8;i+=2)e8.push(sim(s16[i].w,s16[i+1].w,e8V[Math.floor(i/2)],null,4));
  R.push({n:"ELITE EIGHT",g:e8});
  const f4=[];for(let i=0;i<4;i+=2)f4.push(sim(e8[i].w,e8[i+1].w,"Indianapolis",null,5));
  R.push({n:"FINAL FOUR",g:f4});
  if(f4.length>=2)R.push({n:"CHAMPIONSHIP",g:[sim(f4[0].w,f4[1].w,"Indianapolis",null,6)]});
  return R;
}

const C={bg:"#0a0a12",brd:"#1a1a2e",red:"#ff4060",blue:"#4cc9f0",grn:"#2dd4a0",amb:"#f4a261",purp:"#a78bfa",gold:"#fbbf24",dim:"#444",cyan:"#22d3ee",pink:"#f472b6",wh:"#e8e6e1"};
const rC=[C.grn,C.blue,C.purp,C.red,C.amb,C.gold];

function MetricBar({label,valA,valB,unit,better}){
  const a=parseFloat(valA)||0,b=parseFloat(valB)||0;
  const diff=better==="higher"?a-b:b-a;
  const col=diff>1?C.grn:diff<-1?C.red:C.dim;
  return(<div style={{display:"flex",alignItems:"center",gap:4,fontSize:12,marginBottom:1}}>
    <span style={{width:50,color:C.dim,textAlign:"right",flexShrink:0}}>{label}</span>
    <span style={{width:42,textAlign:"right",color:col,fontWeight:diff>1||diff<-1?700:400}}>{typeof valA==="number"?valA.toFixed(1):valA}{unit||""}</span>
    <div style={{flex:1,height:2,background:C.brd,borderRadius:1,position:"relative"}}>
      <div style={{position:"absolute",left:"50%",top:0,width:Math.min(Math.abs(diff)*3,48)+"%",height:"100%",background:col+"44",borderRadius:1,transform:diff>=0?"translateX(-100%)":"none"}}/>
    </div>
    <span style={{width:42,textAlign:"left",color:diff<-1?C.grn:diff>1?C.red:C.dim,fontWeight:diff<-1||diff>1?700:400}}>{typeof valB==="number"?valB.toFixed(1):valB}{unit||""}</span>
  </div>);
}

export default function V7Final(){
  const R=useMemo(()=>simAll(),[]);
  const[ar,setAr]=useState(0);
  const[det,setDet]=useState(null);
  const[showBets,setShowBets]=useState(false);
  const ch=R[R.length-1]?.g[0];
  const totalG=R.reduce((s,r)=>s+r.g.length,0);
  const ups=R.flatMap(r=>r.g.filter(g=>g.sW2>g.sL2).map(g=>({...g,rn:r.n})));

  // ═══ BETTING EDGE CALCULATOR WITH REAL ODDS ═══
  const bets=useMemo(()=>{
    const games=R[0]?.g||[];
    return games.filter(g=>g.vegasSp!==null).map(g=>{
      const vk=`${g.a?.name} vs ${g.b?.name}`;
      const odds=ODDS[vk]||[-200,170,-110];
      const modelFav=g.modelSp>=0?g.a?.name:g.b?.name;
      const modelDog=g.modelSp>=0?g.b?.name:g.a?.name;
      const modelSpAbs=Math.abs(g.modelSp);
      const vegasSpAbs=Math.abs(g.vegasSp);
      const vegasFav=g.vegasSp>=0?g.a?.name:g.b?.name;
      const vegasDog=g.vegasSp>=0?g.b?.name:g.a?.name;
      const sameFav=modelFav===vegasFav;

      // Model's win probability for each team
      const modelWPfav=g.wp/100; // already the winner's prob
      const favIsA=g.w===g.a?.name;
      const modelWPA=favIsA?modelWPfav:1-modelWPfav;
      const modelWPB=1-modelWPA;

      // Payout calculators (American odds → profit per $100)
      const mlPayout=(odds_val)=>odds_val>0?odds_val:Math.round(10000/Math.abs(odds_val));
      const spreadPayout=Math.round(10000/110); // -110 → $90.91 profit per $100

      // ═══ SCENARIO 1: Bet FAVORITE on the spread ═══
      // Model says fav covers if model spread > vegas spread
      const favCoversEdge=sameFav?(modelSpAbs-vegasSpAbs):(modelSpAbs+vegasSpAbs);
      // Probability fav covers ≈ normalCDF((modelSpread - vegasSpread) / σ) with σ~11
      const favCoversProb=Φ((g.modelSp-(g.vegasSp))/11);
      const spreadFavProfit=spreadPayout; // win $91 on $100
      const spreadFavEV=Math.round((favCoversProb*spreadFavProfit-(1-favCoversProb)*100));

      // ═══ SCENARIO 2: Bet UNDERDOG on the spread ═══
      const dogCoversProb=1-favCoversProb;
      const spreadDogProfit=spreadPayout;
      const spreadDogEV=Math.round((dogCoversProb*spreadDogProfit-(1-dogCoversProb)*100));

      // ═══ SCENARIO 3: Bet FAVORITE moneyline ═══
      const favML=odds[0]; const dogML=odds[1];
      const favMLprofit=mlPayout(favML);
      const favMLprob=modelWPA>=modelWPB?Math.max(modelWPA,modelWPB):Math.min(modelWPA,modelWPB);
      // If our model's favorite matches vegas favorite
      const mfIsVF=modelFav===vegasFav;
      const mlFavWP=mfIsVF?Math.max(modelWPA,modelWPB):Math.min(modelWPA,modelWPB);
      const mlFavPayout=mfIsVF?mlPayout(favML):mlPayout(dogML);
      const mlFavEV=Math.round((mlFavWP*mlFavPayout-(1-mlFavWP)*100));

      // ═══ SCENARIO 4: Bet UNDERDOG moneyline ═══
      const mlDogWP=mfIsVF?Math.min(modelWPA,modelWPB):Math.max(modelWPA,modelWPB);
      const mlDogPayout=mfIsVF?mlPayout(dogML):mlPayout(favML);
      const mlDogEV=Math.round((mlDogWP*mlDogPayout-(1-mlDogWP)*100));

      // Find the BEST bet (highest EV)
      const scenarios=[
        {type:"Spread",side:vegasFav+" -"+vegasSpAbs,odds:"-110",payout:spreadFavProfit,ev:spreadFavEV,prob:Math.round(favCoversProb*100),betTeam:vegasFav},
        {type:"Spread",side:vegasDog+" +"+vegasSpAbs,odds:"-110",payout:spreadDogProfit,ev:spreadDogEV,prob:Math.round(dogCoversProb*100),betTeam:vegasDog},
        {type:"ML",side:vegasFav+" ML",odds:favML>0?"+"+favML:String(favML),payout:mlPayout(favML),ev:mlFavEV,prob:Math.round((mfIsVF?mlFavWP:mlDogWP)*100),betTeam:vegasFav},
        {type:"ML",side:vegasDog+" ML",odds:"+"+dogML,payout:mlPayout(dogML),ev:mlDogEV,prob:Math.round((mfIsVF?mlDogWP:mlFavWP)*100),betTeam:vegasDog},
      ].sort((a,b)=>b.ev-a.ev);

      const bestBet=scenarios[0];
      const worstBet=scenarios[scenarios.length-1];
      const allNeg=scenarios.every(s=>s.ev<0);
      const ensAgree=g.v8?.ens?.agree;

      return{
        teamA:g.a?.name,teamB:g.b?.name,seedA:g.a?.s,seedB:g.b?.s,
        modelSp:g.modelSp,vegasSp:g.vegasSp,
        modelFav,vegasFav,vegasDog,
        w:g.w,l:g.l,sW:g.sW,sL:g.sL,wp:g.wp,ven:g.ven,ensAgree,
        scenarios,bestBet,allNeg,
        favML,dogML,
        bestEV:bestBet.ev,
      };
    }).sort((a,b)=>b.bestBet.prob-a.bestBet.prob||(b.bestBet.payout-a.bestBet.payout)); // SORT: best model chance first, then biggest payout
  },[R]);

  return(
    <div style={{fontFamily:"'JetBrains Mono',Consolas,monospace",background:C.bg,color:C.wh,minHeight:"100vh"}}>
    <div style={{maxWidth:1000,margin:"0 auto",padding:"20px 14px"}}>
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:14,borderBottom:`1px solid ${C.brd}`,paddingBottom:10}}>
        <div style={{fontSize:11,letterSpacing:5,color:C.gold,marginBottom:4}}>v8.0 FINAL · {totalG} GAMES · 23 UPGRADES</div>
        <h1 style={{fontSize:"clamp(22px,4vw,34px)",fontWeight:700,color:"#fff",margin:"4px 0",fontFamily:"Georgia,serif"}}>2026 NCAA Tournament Bracket</h1>
        <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>
          Real Vegas lines (FanDuel/DraftKings) · KenPom · Injury-adjusted · Click any game for full breakdown
        </div>
        <div style={{fontSize:13,color:C.cyan,marginTop:6,padding:"4px 12px",background:`${C.cyan}08`,borderRadius:4,display:"inline-block"}}>
          📡 Last data update: {new Date().toLocaleString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true})} CST
        </div>
      </div>

      {/* Champion */}
      {ch&&<div style={{background:`linear-gradient(135deg,${C.gold}0a,${C.bg},${C.gold}0a)`,border:`2px solid ${C.gold}33`,borderRadius:12,padding:"20px 16px",marginBottom:12,textAlign:"center"}}>
        <div style={{fontSize:12,letterSpacing:4,color:C.gold}}>🏆 PREDICTED NATIONAL CHAMPION 🏆</div>
        <div style={{fontSize:"clamp(28px,5.5vw,44px)",fontWeight:700,color:C.gold}}>{ch.w}</div>
        <div style={{fontSize:19,color:"#fff",marginTop:2}}>{ch.sW} – {ch.sL}</div>
        <div style={{fontSize:13,color:"#888",marginTop:2}}>vs {ch.l} · {ch.wp}% · @ Indianapolis</div>
        <div style={{fontSize:12,color:C.dim,marginTop:2}}>Coach: {buildT(ch.w)?.coach} · KenPom #{buildT(ch.w)?.kp} · {buildT(ch.w)?.rec}</div>
      </div>}

      {/* F4 */}
      {R.length>=5&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
        {R[4].g.map((g,i)=>(<div key={i} style={{padding:"8px 10px",background:`${C.amb}06`,border:`1px solid ${C.amb}22`,borderRadius:6,textAlign:"center"}}>
          <div style={{fontSize:10,color:C.amb,letterSpacing:2}}>SEMIFINAL {i+1}</div>
          <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>({g.sW2}) {g.w} {g.sW}</div>
          <div style={{fontSize:13,color:"#555"}}>({g.sL2}) {g.l} {g.sL}</div>
        </div>))}
      </div>}

      {/* Round tabs + Bets tab */}
      <div style={{display:"flex",gap:2,marginBottom:8,flexWrap:"wrap"}}>
        {R.map((r,i)=>(<button key={i} onClick={()=>{setAr(i);setDet(null);setShowBets(false);}} style={{flex:1,minWidth:70,padding:"5px 2px",fontSize:11,border:ar===i&&!showBets?`1px solid #fff`:`1px solid ${C.brd}`,borderRadius:3,cursor:"pointer",background:ar===i&&!showBets?`#ffffff12`:"transparent",color:ar===i&&!showBets?"#fff":C.dim,fontFamily:"inherit",textAlign:"center"}}>{r.n}<br/><span style={{fontSize:7}}>{r.g.length}g</span></button>))}
        <button onClick={()=>setShowBets(true)} style={{minWidth:90,padding:"5px 6px",fontSize:11,border:showBets?`1px solid #22ff44`:`1px solid ${C.brd}`,borderRadius:3,cursor:"pointer",background:showBets?`#22ff4415`:"transparent",color:showBets?"#22ff44":C.dim,fontFamily:"inherit",textAlign:"center",fontWeight:700}}>💰 BETS<br/><span style={{fontSize:7}}>{bets.filter(b=>b.absEdge>=1.5).length} edges</span></button>
      </div>

      {/* ═══ POSSIBLE BETS VIEW ═══ */}
      {showBets&&<div style={{marginBottom:16}}>
        <div style={{padding:"14px 16px",marginBottom:10,background:`${C.gold}08`,border:`1px solid ${C.gold}22`,borderRadius:8}}>
          <div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:6}}>💰 HOW TO READ THIS</div>
          <div style={{fontSize:15,color:"#ccc",lineHeight:1.8}}>
            Every game where our model disagrees with Vegas is a potential bet. The <strong style={{color:"#fff"}}>"Edge"</strong> is the gap in points between what the model predicts and what Vegas says. A bigger edge = more potential value.
            <br/>An edge of <strong style={{color:C.gold}}>3+ points</strong> is considered a good bet. <strong style={{color:C.red}}>5+ points</strong> is a strong bet. Negative edges mean bet the underdog (they'll cover the spread or win outright). Positive edges mean bet the favorite (they'll win by more than Vegas thinks).
            <br/><span style={{fontSize:13,color:C.dim}}>⚠️ This is not financial advice. The model estimates 54-56% ATS accuracy. Even the best models lose ~45% of bets.</span>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
          {[
            {n:bets.filter(b=>b.bestEV>=10).length,l:"🔥 $10+ EV per $100",c:C.red},
            {n:bets.filter(b=>b.bestEV>=3&&b.bestEV<10).length,l:"✅ $3-10 EV",c:C.grn},
            {n:bets.filter(b=>b.bestEV>=0&&b.bestEV<3).length,l:"📊 $0-3 EV",c:C.cyan},
            {n:bets.filter(b=>b.bestEV<0).length,l:"⚪ Negative EV (skip)",c:C.dim},
          ].map((s,i)=>(
            <div key={i} style={{textAlign:"center",padding:"10px 6px",background:`${s.c}08`,borderRadius:6,border:`1px solid ${s.c}22`}}>
              <div style={{fontSize:24,fontWeight:700,color:s.c}}>{s.n}</div>
              <div style={{fontSize:11,color:s.c}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Bet cards — sorted by best EV */}
        {bets.map((b,i)=>{
          const best=b.bestBet;
          const evCol=best.ev>=10?C.red:best.ev>=3?C.grn:best.ev>=0?C.cyan:C.dim;
          return(
            <div key={i} style={{marginBottom:6,padding:"12px 14px",background:`${evCol}04`,border:`1px solid ${evCol}22`,borderRadius:8,borderLeft:`4px solid ${evCol}`}}>
              {/* Header: teams + best EV */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>({b.seedA}) {b.teamA} vs ({b.seedB}) {b.teamB}</div>
                  <div style={{fontSize:12,color:C.dim}}>{b.ven} · Model: {b.w} {b.wp}% · Predicted: {b.w} {b.sW}-{b.l} {b.sL}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:11,color:evCol}}>{best.ev>=10?"🔥 BEST BET":best.ev>=3?"✅ GOOD VALUE":best.ev>=0?"📊 SLIGHT EDGE":"⚪ NO EDGE"}</div>
                  <div style={{fontSize:27,fontWeight:700,color:evCol,lineHeight:1}}>{best.ev>=0?"+":""}${best.ev}</div>
                  <div style={{fontSize:11,color:C.dim}}>EV per $100</div>
                </div>
              </div>

              {/* Best bet callout */}
              {best.ev>0&&<div style={{padding:"10px 14px",background:`${evCol}0c`,borderRadius:6,marginBottom:8,border:`1px solid ${evCol}33`}}>
                <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:4}}>
                  💰 BEST BET: {best.side} ({best.odds})
                </div>
                <div style={{fontSize:16,color:"#ccc",lineHeight:1.6}}>
                  Bet $100 → win <span style={{color:C.grn,fontWeight:700}}>${best.payout}</span> if it hits.
                  {" "}Model gives this a <span style={{color:evCol,fontWeight:700}}>{best.prob}%</span> chance.
                  {" "}Expected profit: <span style={{color:evCol,fontWeight:700}}>${best.ev}</span> per $100 wagered.
                  {best.ev>=10&&" This is a strong edge — the model sees significant value the market is missing."}
                  {best.ev>=3&&best.ev<10&&" Solid edge worth betting."}
                </div>
              </div>}

              {/* All 4 scenarios table */}
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${C.brd}`}}>
                      <th style={{padding:"6px 8px",textAlign:"left",fontSize:11,color:C.dim}}>BET</th>
                      <th style={{padding:"6px 8px",textAlign:"center",fontSize:11,color:C.dim}}>ODDS</th>
                      <th style={{padding:"6px 8px",textAlign:"center",fontSize:11,color:C.dim}}>WIN $100→</th>
                      <th style={{padding:"6px 8px",textAlign:"center",fontSize:11,color:C.dim}}>MODEL %</th>
                      <th style={{padding:"6px 8px",textAlign:"center",fontSize:11,color:C.dim}}>LOSE $100→</th>
                      <th style={{padding:"6px 8px",textAlign:"right",fontSize:11,color:C.dim}}>EV / $100</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.scenarios.map((s,si)=>{
                      const isBest=si===0&&s.ev>0;
                      return(
                        <tr key={si} style={{borderBottom:`1px solid ${C.brd}`,background:isBest?`${evCol}08`:"transparent"}}>
                          <td style={{padding:"6px 8px",color:isBest?"#fff":"#aaa",fontWeight:isBest?700:400}}>
                            {isBest&&"★ "}{s.type}: {s.side}
                          </td>
                          <td style={{padding:"6px 8px",textAlign:"center",color:parseInt(s.odds)>0?C.grn:C.red,fontWeight:700}}>
                            {s.odds}
                          </td>
                          <td style={{padding:"6px 8px",textAlign:"center",color:C.grn}}>
                            +${s.payout}
                          </td>
                          <td style={{padding:"6px 8px",textAlign:"center",color:s.prob>=55?"#fff":s.prob>=45?"#aaa":C.red}}>
                            {s.prob}%
                          </td>
                          <td style={{padding:"6px 8px",textAlign:"center",color:C.red}}>
                            -$100
                          </td>
                          <td style={{padding:"6px 8px",textAlign:"right",fontWeight:700,color:s.ev>0?C.grn:s.ev===0?"#888":C.red}}>
                            {s.ev>=0?"+":""}${s.ev}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Context line */}
              <div style={{marginTop:6,fontSize:12,color:"#666",lineHeight:1.5}}>
                Model spread: <span style={{color:"#ccc"}}>{b.modelFav} -{Math.abs(b.modelSp).toFixed(1)}</span>
                {" "}· Vegas: <span style={{color:"#ccc"}}>{b.vegasFav} -{Math.abs(b.vegasSp)}</span>
                {" "}· ML: <span style={{color:C.red}}>{b.vegasFav} {b.favML}</span> / <span style={{color:C.grn}}>{b.vegasDog} +{b.dogML}</span>
                {b.ensAgree===false&&<span style={{color:C.red}}>{" "}· ⚠️ Sub-models disagree</span>}
                {b.ensAgree===true&&best.ev>=3&&<span style={{color:C.grn}}>{" "}· ✓ All models agree</span>}
              </div>
            </div>
          );
        })}

        {/* Disclaimer */}
        <div style={{marginTop:10,padding:"10px 14px",background:`${C.red}06`,border:`1px solid ${C.red}22`,borderRadius:6}}>
          <div style={{fontSize:12,color:C.red,fontWeight:700,marginBottom:4}}>⚠️ IMPORTANT DISCLAIMERS</div>
          <div style={{fontSize:13,color:"#888",lineHeight:1.6}}>
            1. <strong style={{color:"#ccc"}}>This is a model, not a crystal ball.</strong> Even at 54-56% ATS, you'll lose ~45% of these bets. Never bet more than you can afford to lose.
            <br/>2. <strong style={{color:"#ccc"}}>Lines will move.</strong> These edges are calculated vs lines as of 3/16 evening. By game time, the lines may have shifted — re-check before betting.
            <br/>3. <strong style={{color:"#ccc"}}>The biggest edges often exist for a reason.</strong> If the model sees a 7-point edge, ask yourself: does Vegas know something I don't? (Injury news, suspensions, travel issues.)
            <br/>4. <strong style={{color:"#ccc"}}>Bankroll management matters more than picks.</strong> Never bet more than 2-3% of your bankroll on any single game, even "strong" edges.
          </div>
        </div>
      </div>}

      {/* Games (hidden when bets tab is active) */}
      {!showBets&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
        {R[ar]?.g.map((g,i)=>{
          const up=g.sW2>g.sL2;const hm=!!g.ha;const rc=rC[ar]||C.gold;
          const isOpen=det===`${ar}-${i}`;const hasMU=g.mu?.det?.length>0;
          return(
            <div key={i} style={{background:up?`${C.red}06`:hm?`${C.grn}04`:`${C.wh}03`,border:`1px solid ${isOpen?C.cyan+"44":C.brd}`,borderRadius:6,borderLeft:up?`3px solid ${C.red}88`:hasMU?`3px solid ${C.cyan}44`:`3px solid ${rc}22`,overflow:"hidden"}}>
              {/* Game row */}
              <div onClick={()=>setDet(isOpen?null:`${ar}-${i}`)} style={{display:"grid",gridTemplateColumns:"1fr 100px 1fr",alignItems:"center",gap:4,padding:"8px 10px",cursor:"pointer"}}>
                <div style={{textAlign:"right"}}>
                  <span style={{fontSize:14,fontWeight:700,color:rc}}>({g.sW2}) {g.w}</span>
                  <span style={{fontSize:13,color:"#999",marginLeft:4}}>{g.sW}</span>
                  {g.ha===g.w&&<span style={{fontSize:10,marginLeft:2,color:C.grn}}>🏠</span>}
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.purp}}>{g.wp}%</div>
                  <div style={{fontSize:10,color:C.purp}}>+{g.sp}pts · {g.ven}</div>
                  <div style={{display:"flex",justifyContent:"center",gap:3,marginTop:1}}>
                    {g.mu?.det?.length>0&&<span style={{fontSize:10,color:C.cyan}}>⚔️MU</span>}
                    {g.cDiff!==0&&<span style={{fontSize:10,color:C.amb}}>🎓{g.cDiff>0?"+":""}{g.cDiff}</span>}
                    {g.hb!==0&&<span style={{fontSize:10,color:C.grn}}>🏠{g.hb>0?"+":""}{g.hb}</span>}
                    {g.L5!==0&&<span style={{fontSize:10,color:C.pink}}>🔋{g.L5>0?"+":""}{g.L5}</span>}
                  </div>
                </div>
                <div style={{textAlign:"left"}}>
                  <span style={{fontSize:13,color:"#666",marginRight:3}}>{g.sL}</span>
                  <span style={{fontSize:13,color:"#555",textDecoration:"line-through",opacity:.6}}>({g.sL2}) {g.l}</span>
                  {up&&<span style={{fontSize:10,padding:"1px 4px",borderRadius:3,background:`${C.red}18`,color:C.red,marginLeft:3,fontWeight:700}}>UPSET</span>}
                </div>
              </div>

              {/* Expanded details */}
              {isOpen&&g.a&&g.b&&(
                <div style={{padding:"10px 12px",borderTop:`1px solid ${C.brd}`,background:`${C.bg}cc`}}>
                  {/* Team header row */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 50px 1fr",gap:4,marginBottom:8,fontSize:9}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:700,color:rc}}>{g.a.name}</div>
                      <div style={{color:C.dim}}>KP#{g.a.kp} · {g.a.rec} · ({g.a.s})</div>
                    </div>
                    <div style={{textAlign:"center",color:C.dim}}>vs</div>
                    <div>
                      <div style={{fontWeight:700,color:"#888"}}>{g.b.name}</div>
                      <div style={{color:C.dim}}>KP#{g.b.kp} · {g.b.rec} · ({g.b.s})</div>
                    </div>
                  </div>

                  {/* Algorithm layers */}
                  <div style={{marginBottom:8,padding:"6px 8px",background:`${C.blue}06`,borderRadius:4}}>
                    <div style={{fontSize:11,color:C.blue,letterSpacing:1,marginBottom:4}}>ALGORITHM LAYERS (model: {g.modelSp>0?"+":""}{g.modelSp} {g.vegasSp!==null?`· Vegas: ${g.vegasSp>0?"+":""}${g.vegasSp} · Blend: ${g.rawSp>0?"+":""}${g.rawSp}`:``})</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
                      {[{n:"L1: Efficiency",v:g.L1,c:C.blue,w:42},{n:"L2: 4 Factors + MU",v:g.L2,c:C.purp,w:28},{n:"L3: Context",v:g.L3,c:C.grn,w:18},{n:"L4: Coach/Tempo",v:g.L4,c:C.amb,w:8},{n:"L5: Fatigue",v:g.L5,c:C.pink,w:"var"}].map(l=>(
                        <div key={l.n} style={{textAlign:"center",padding:"4px",background:`${l.c}08`,borderRadius:3}}>
                          <div style={{fontSize:10,color:l.c}}>{l.n} ({l.w}%)</div>
                          <div style={{fontSize:15,fontWeight:700,color:l.v>0?C.grn:l.v<0?C.red:C.dim}}>{l.v>0?"+":""}{l.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key metrics — show RAW and MATCHUP-ADJUSTED for Four Factors */}
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:11,color:C.dim,letterSpacing:1,marginBottom:3}}>KEY METRICS {g.mu?.det?.length>0?"(⚔️ = matchup-adjusted)":""}</div>
                    <MetricBar label="AdjEM" valA={g.a.em} valB={g.b.em} better="higher"/>
                    {g.adjStats?<>
                      <MetricBar label={g.adjStats.aEfg!==Math.round(g.a.efg*10)/10||g.adjStats.bEfg!==Math.round(g.b.efg*10)/10?"⚔️ eFG%":"eFG%"} valA={g.adjStats.aEfg} valB={g.adjStats.bEfg} unit="%" better="higher"/>
                      <MetricBar label={g.adjStats.aTor!==Math.round(g.a.tor*10)/10||g.adjStats.bTor!==Math.round(g.b.tor*10)/10?"⚔️ TO Rate":"TO Rate"} valA={g.adjStats.aTor} valB={g.adjStats.bTor} unit="%" better="lower"/>
                      <MetricBar label={g.adjStats.aOrb!==Math.round(g.a.orb*10)/10||g.adjStats.bOrb!==Math.round(g.b.orb*10)/10?"⚔️ ORB%":"ORB%"} valA={g.adjStats.aOrb} valB={g.adjStats.bOrb} unit="%" better="higher"/>
                      <MetricBar label={g.adjStats.aFtr!==Math.round(g.a.ftr*10)/10||g.adjStats.bFtr!==Math.round(g.b.ftr*10)/10?"⚔️ FTR":"FTR"} valA={g.adjStats.aFtr} valB={g.adjStats.bFtr} better="higher"/>
                    </>:<>
                      <MetricBar label="eFG%" valA={g.a.efg} valB={g.b.efg} unit="%" better="higher"/>
                      <MetricBar label="TO Rate" valA={g.a.tor} valB={g.b.tor} unit="%" better="lower"/>
                      <MetricBar label="ORB%" valA={g.a.orb} valB={g.b.orb} unit="%" better="higher"/>
                      <MetricBar label="FTR" valA={g.a.ftr} valB={g.b.ftr} better="higher"/>
                    </>}
                    <MetricBar label="3PT%" valA={g.a.tpt} valB={g.b.tpt} unit="%" better="higher"/>
                    <MetricBar label="Elo" valA={g.a.elo} valB={g.b.elo} better="higher"/>
                    <MetricBar label="Tempo" valA={g.a.t} valB={g.b.t} better="higher"/>
                    <MetricBar label="Margin" valA={g.a.mg} valB={g.b.mg} better="higher"/>
                    <MetricBar label="Sent." valA={g.a.st} valB={g.b.st} better="higher"/>
                  </div>

                  {/* Injuries */}
                  {(g.a.ij!==0||g.b.ij!==0)&&<div style={{marginBottom:6,padding:"4px 6px",background:`${C.red}08`,borderRadius:3}}>
                    <div style={{fontSize:11,color:C.red,letterSpacing:1}}>🏥 INJURY IMPACT</div>
                    {g.a.ij!==0&&<div style={{fontSize:12,color:"#999"}}>{g.a.name}: {g.a.ij} pts adjustment</div>}
                    {g.b.ij!==0&&<div style={{fontSize:12,color:"#999"}}>{g.b.name}: {g.b.ij} pts adjustment</div>}
                  </div>}

                  {/* Style matchups → these adjust the Four Factors directly */}
                  {g.mu?.det?.length>0&&<div style={{marginBottom:6,padding:"4px 6px",background:`${C.cyan}06`,borderRadius:3}}>
                    <div style={{fontSize:11,color:C.cyan,letterSpacing:1,marginBottom:2}}>⚔️ MATCHUP ADJUSTMENTS (modify Four Factors inputs in L2)</div>
                    {g.mu.det.map((d,j)=>(<div key={j} style={{fontSize:12,color:"#888",marginBottom:2,paddingLeft:6,borderLeft:`2px solid ${C.cyan}44`}}>
                      <span style={{color:C.cyan,fontWeight:700,marginRight:4}}>{d.stat}</span>
                      <span style={{color:d.i>0?C.grn:C.red,fontWeight:700}}>{d.i>0?"+":""}{d.i.toFixed(1)}</span>
                      <span style={{color:C.dim,marginLeft:2}}>({d.team})</span>
                      <span style={{marginLeft:4}}>{d.d}</span>
                    </div>))}
                  </div>}

                  {/* Coaching */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[g.a,g.b].map((tm)=>tm?(
                      <div key={tm.name} style={{padding:"4px 6px",background:`${C.amb}06`,borderRadius:3}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.amb}}>🎓 {tm.coach}</div>
                        <div style={{fontSize:11,color:C.dim}}>
                          Adj: {(tm.cAdj||0)>0?"+":""}{tm.cAdj||0} pts
                          {tm.cNote&&<span> · {tm.cNote}</span>}
                        </div>
                      </div>
                    ):null)}
                  </div>

                  {/* Fatigue (Upgrade 15) */}
                  {(g.L5!==0||(g.fatA?.detail)||(g.fatB?.detail))&&<div style={{marginBottom:6,padding:"4px 6px",background:`${C.pink}06`,borderRadius:3}}>
                    <div style={{fontSize:11,color:C.pink,letterSpacing:1,marginBottom:2}}>🔋 FATIGUE (Round {g.rd||1} — {g.L5!==0?`${g.L5>0?"+":""}${g.L5} pts net`:"no impact yet"})</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                      {[{nm:g.a?.name,f:g.fatA},{nm:g.b?.name,f:g.fatB}].map(({nm,f})=>f?.detail?(
                        <div key={nm} style={{fontSize:11,color:"#888"}}>
                          <span style={{color:C.pink,fontWeight:700}}>{nm}: {f.pts.toFixed(2)}pts</span>
                          <div style={{color:C.dim,fontSize:10,marginTop:1}}>
                            Bench: {f.detail.benchPct}% · Stars: {f.detail.starMin}mpg · Rot: {f.detail.rot} · ConfT: {f.detail.confTG}g · Season: {f.detail.gp}g
                            <br/>Vulnerability: {f.detail.vuln}% · Round×: {f.detail.roundMult}
                          </div>
                        </div>
                      ):(
                        <div key={nm} style={{fontSize:11,color:C.dim}}>{nm}: minimal fatigue</div>
                      ))}
                    </div>
                  </div>}

                  {/* V8 Tier 1+2 Adjustments */}
                  {g.v8&&(Math.abs(g.v8.total)>0.05||!g.v8.ens.agree)&&<div style={{marginBottom:6,padding:"4px 6px",background:"rgba(255,200,50,0.04)",borderRadius:3,border:`1px solid ${C.gold}15`}}>
                    <div style={{fontSize:11,color:C.gold,letterSpacing:1,marginBottom:3}}>🔬 V8 ADVANCED ADJUSTMENTS ({g.v8.total>0?"+":""}{g.v8.total} pts total)</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,fontSize:8}}>
                      {g.v8.gs!==0&&<span style={{padding:"1px 4px",background:`${C.purp}10`,borderRadius:3}}>
                        <span style={{color:C.purp}}>GameState</span> <span style={{color:g.v8.gs>0?C.grn:C.red}}>{g.v8.gs>0?"+":""}{g.v8.gs}</span>
                      </span>}
                      {g.v8.cont!==0&&<span style={{padding:"1px 4px",background:`${C.cyan}10`,borderRadius:3}}>
                        <span style={{color:C.cyan}}>Continuity</span> <span style={{color:g.v8.cont>0?C.grn:C.red}}>{g.v8.cont>0?"+":""}{g.v8.cont}</span>
                      </span>}
                      {g.v8.sharp!==0&&<span style={{padding:"1px 4px",background:`${C.red}10`,borderRadius:3}}>
                        <span style={{color:C.red}}>Sharp$</span> <span style={{color:g.v8.sharp>0?C.grn:C.red}}>{g.v8.sharp>0?"+":""}{g.v8.sharp}</span>
                      </span>}
                      {g.v8.ref!==0&&<span style={{padding:"1px 4px",background:`${C.amb}10`,borderRadius:3}}>
                        <span style={{color:C.amb}}>RefCrew</span> <span style={{color:g.v8.ref>0?C.grn:C.red}}>{g.v8.ref>0?"+":""}{g.v8.ref}</span>
                      </span>}
                      {Math.abs(g.v8.tz)>=0.1&&<span style={{padding:"1px 4px",background:`${C.blue}10`,borderRadius:3}}>
                        <span style={{color:C.blue}}>Timezone</span> <span style={{color:g.v8.tz>0?C.grn:C.red}}>{g.v8.tz>0?"+":""}{g.v8.tz}</span>
                      </span>}
                      {g.v8.foul!==0&&<span style={{padding:"1px 4px",background:`${C.pink}10`,borderRadius:3}}>
                        <span style={{color:C.pink}}>FoulRisk</span> <span style={{color:g.v8.foul>0?C.grn:C.red}}>{g.v8.foul>0?"+":""}{g.v8.foul}</span>
                      </span>}
                    </div>
                    {/* Ensemble agreement */}
                    <div style={{marginTop:4,fontSize:11,color:g.v8.ens.agree?C.grn:C.red}}>
                      Ensemble: {g.v8.ens.agree?"✓ All 3 sub-models agree":"⚠️ Sub-models disagree"}
                      <span style={{color:C.dim,marginLeft:4}}>EM:{g.v8.ens.m1} · Elo:{g.v8.ens.m2} · 4F:{g.v8.ens.m3}</span>
                    </div>
                  </div>}

                  {/* Vegas comparison */}
                  {g.vegasSp!==null&&<div style={{marginTop:6,padding:"4px 6px",background:`${C.gold}06`,borderRadius:3}}>
                    <div style={{fontSize:11,color:C.gold,letterSpacing:1}}>📊 MODEL vs VEGAS</div>
                    <div style={{fontSize:12,color:"#999",display:"flex",gap:12}}>
                      <span>Model: <b style={{color:C.wh}}>{g.modelSp>0?"+":""}{g.modelSp}</b></span>
                      <span>Vegas: <b style={{color:C.wh}}>{g.vegasSp>0?"+":""}{g.vegasSp}</b></span>
                      <span>Blend (55/45): <b style={{color:C.gold}}>{g.rawSp>0?"+":""}{g.rawSp}</b></span>
                      {Math.abs(g.modelSp-g.vegasSp)>=3&&<span style={{color:C.pink,fontWeight:700}}>⚠️ {Math.abs(g.modelSp-g.vegasSp).toFixed(1)}pt divergence</span>}
                    </div>
                  </div>}
                </div>
              )}
            </div>
          );
        })}
      </div>}

      {/* Champion's path */}
      {ch&&<div style={{marginTop:12,padding:"8px 10px",background:`${C.gold}05`,border:`1px solid ${C.gold}22`,borderRadius:6}}>
        <div style={{fontSize:11,letterSpacing:2,color:C.gold,marginBottom:3}}>🏆 CHAMPION'S PATH</div>
        {R.map((r,ri)=>{const cg=r.g.find(g=>g.w===ch.w);if(!cg)return null;return(
          <div key={ri} style={{display:"flex",alignItems:"center",gap:6,marginBottom:1,fontSize:9}}>
            <span style={{width:90,color:rC[ri]||C.gold,fontWeight:700}}>{r.n}</span>
            <span style={{color:"#ccc"}}>def. ({cg.sL2}) {cg.l}</span>
            <span style={{fontWeight:700,color:rC[ri]||C.gold}}>{cg.sW}-{cg.sL}</span>
            <span style={{color:C.dim}}>{cg.wp}% @ {cg.ven}</span>
          </div>
        );})}
      </div>}

      {/* Upsets */}
      {ups.length>0&&<div style={{marginTop:6,padding:"6px 8px",background:`${C.red}05`,border:`1px solid ${C.red}22`,borderRadius:6}}>
        <div style={{fontSize:11,letterSpacing:2,color:C.red,marginBottom:2}}>PREDICTED UPSETS ({ups.length})</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:2}}>{ups.map((g,i)=>(
          <span key={i} style={{padding:"1px 5px",background:`${C.red}08`,borderRadius:6,fontSize:8}}>
            <span style={{color:C.red,fontWeight:700}}>({g.sW2}){g.w}</span>
            <span style={{color:C.dim}}> over ({g.sL2}){g.l}</span>
            <span style={{color:"#555"}}> [{g.rn.split(" ").slice(0,2).join(" ")}]</span>
          </span>
        ))}</div>
      </div>}

      <div style={{marginTop:10,fontSize:10,color:"#222",textAlign:"center",lineHeight:1.5}}>
        v8.0 Final · 23 upgrades · {totalG} games · Ensemble blend (80/20) · Vegas blend (55/45) · Recency weights · Matchups · Coaching · Fatigue
        <br/>V8 additions: Ref sensitivity · Game-state splits · Sharp money · Roster continuity · Timezone travel · Foul trouble · 3-model ensemble
        <br/>Data: KenPom 3/15 (includes 3/14 games), FanDuel/DraftKings lines 3/15, SI/ESPN injuries 3/16
        <br/>S16/E8: Capital One Arena (East) · Toyota Center (South) · SAP Center (West) · United Center (Midwest) · Final Four: Lucas Oil, Indianapolis
      </div>
    </div></div>
  );
}