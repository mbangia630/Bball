// ═══════════════════════════════════════════════════════
// STATIC CONFIG — never changes during tournament
// ═══════════════════════════════════════════════════════

const VENUES = {
  "Dayton":[39.758,-84.191],"Buffalo":[42.886,-78.878],"Greenville":[34.852,-82.394],
  "OKC":[35.468,-97.516],"Portland":[45.531,-122.666],"Tampa":[27.951,-82.457],
  "Philadelphia":[39.952,-75.164],"San Diego":[32.716,-117.161],"St. Louis":[38.627,-90.199],
  "Washington DC":[38.907,-77.037],"Houston":[29.760,-95.370],"Chicago":[41.878,-87.630],
  "San Jose":[37.338,-121.886],"Indianapolis":[39.768,-86.158],
};

const VENUE_TIMEZONES = {
  "Buffalo":0,"Greenville":0,"Tampa":0,"Philadelphia":0,"Washington DC":0,"Dayton":0,"Indianapolis":0,
  "OKC":-1,"St. Louis":-1,"Houston":-1,"Chicago":-1,
  "Portland":-3,"San Diego":-3,"San Jose":-3,
};

const LOCATIONS = {
  "Duke":[36.001,-78.938],"Arizona":[32.232,-110.950],"Michigan":[42.278,-83.738],"Florida":[29.644,-82.345],
  "UConn":[41.808,-72.254],"Houston":[29.720,-95.339],"Iowa State":[42.027,-93.648],"Purdue":[40.424,-86.913],
  "Gonzaga":[47.667,-117.402],"Michigan St.":[42.731,-84.482],"Illinois":[40.102,-88.227],"Arkansas":[36.068,-94.175],
  "Kansas":[38.955,-95.255],"Nebraska":[40.820,-96.706],"Wisconsin":[43.076,-89.412],"Texas Tech":[33.585,-101.845],
  "St. John's":[40.726,-73.795],"Vanderbilt":[36.144,-86.803],"Alabama":[33.214,-87.539],"Louisville":[38.213,-85.758],
  "N. Carolina":[35.905,-79.047],"BYU":[40.250,-111.649],"UCLA":[34.069,-118.445],"St. Mary's":[37.838,-122.108],
  "Kentucky":[38.039,-84.504],"Miami FL":[25.721,-80.279],"Ohio State":[40.007,-83.030],"Iowa":[41.661,-91.535],
  "Georgia":[33.948,-83.375],"TCU":[32.710,-97.363],"Missouri":[38.940,-92.328],"Clemson":[34.676,-82.837],
  "VCU":[37.549,-77.453],"Akron":[41.076,-81.512],"Saint Louis":[38.637,-90.234],"Santa Clara":[37.349,-121.938],
  "S. Florida":[28.064,-82.413],"Hofstra":[40.715,-73.601],"High Point":[35.949,-79.997],"McNeese":[30.211,-93.210],
  "Troy":[31.799,-85.956],"N. Iowa":[42.514,-92.456],"Cal Baptist":[33.930,-117.426],"UCF":[28.602,-81.200],
  "N. Dakota St.":[46.897,-96.801],"Furman":[34.850,-82.440],"Wright St.":[39.782,-84.062],"Miami OH":[39.509,-84.735],
  "SMU":[32.842,-96.783],"Texas":[30.284,-97.733],"Siena":[42.719,-73.752],"Penn":[39.952,-75.193],
  "Idaho":[46.726,-117.014],"Queens":[35.230,-80.843],"Hawaii":[21.297,-157.817],"UMBC":[39.255,-76.711],
  "Tennessee":[35.955,-83.925],"Villanova":[40.037,-75.346],"Utah State":[41.745,-111.810],"Tennessee St.":[36.167,-86.783],
  "Texas A&M":[30.612,-96.341],"Lehigh":[40.608,-75.378],"Virginia":[38.034,-78.508],"LIU":[40.689,-73.981],
  "Kennesaw St.":[34.036,-84.581],"NC State":[35.786,-78.663],"Howard":[38.922,-77.019],"Prairie View":[30.088,-95.986],
};

const VENUE_MAP = {
  E1:"Greenville",E2:"Greenville",E3:"Buffalo",E4:"Buffalo",E5:"Tampa",E6:"Buffalo",E7:"Philadelphia",E8:"Philadelphia",
  S1:"Tampa",S2:"Tampa",S3:"OKC",S4:"OKC",S5:"Greenville",S6:"Greenville",S7:"St. Louis",S8:"St. Louis",
  W1:"OKC",W2:"Philadelphia",W3:"OKC",W4:"Portland",W5:"Portland",W6:"Portland",W7:"San Diego",W8:"OKC",
  MW1:"Buffalo",MW2:"Buffalo",MW3:"OKC",MW4:"OKC",MW5:"St. Louis",MW6:"Philadelphia",MW7:"St. Louis",MW8:"St. Louis",
  FF1:"Dayton",FF2:"Dayton",FF3:"Dayton",FF4:"Dayton",
  E_R32_1:"Greenville",E_R32_2:"Buffalo",E_R32_3:"Tampa",E_R32_4:"Philadelphia",
  S_R32_1:"Tampa",S_R32_2:"OKC",S_R32_3:"Greenville",S_R32_4:"St. Louis",
  W_R32_1:"OKC",W_R32_2:"Portland",W_R32_3:"Portland",W_R32_4:"San Diego",
  MW_R32_1:"Buffalo",MW_R32_2:"OKC",MW_R32_3:"St. Louis",MW_R32_4:"St. Louis",
  E_S16_1:"Washington DC",E_S16_2:"Washington DC",S_S16_1:"Houston",S_S16_2:"Houston",
  W_S16_1:"San Jose",W_S16_2:"San Jose",MW_S16_1:"Chicago",MW_S16_2:"Chicago",
  E_E8:"Washington DC",S_E8:"Houston",W_E8:"San Jose",MW_E8:"Chicago",
  F4_1:"Indianapolis",F4_2:"Indianapolis",CHAMP:"Indianapolis",
};

const BRACKET = [
  {id:"FF1",a:"UMBC",b:"Howard",round:"First Four",feedsInto:"MW1",feedsAs:"b",rd:0},
  {id:"FF2",a:"Texas",b:"NC State",round:"First Four",feedsInto:"W5",feedsAs:"b",rd:0},
  {id:"FF3",a:"Lehigh",b:"Prairie View",round:"First Four",feedsInto:"S1",feedsAs:"b",rd:0},
  {id:"FF4",a:"SMU",b:"Miami OH",round:"First Four",feedsInto:"MW5",feedsAs:"b",rd:0},
  // EAST
  {id:"E1",a:"Duke",b:"Siena",round:"R64",feedsInto:"E_R32_1",feedsAs:"a",rd:1},
  {id:"E2",a:"Ohio State",b:"TCU",round:"R64",feedsInto:"E_R32_1",feedsAs:"b",rd:1},
  {id:"E3",a:"St. John's",b:"N. Iowa",round:"R64",feedsInto:"E_R32_2",feedsAs:"a",rd:1},
  {id:"E4",a:"Kansas",b:"Cal Baptist",round:"R64",feedsInto:"E_R32_2",feedsAs:"b",rd:1},
  {id:"E5",a:"Louisville",b:"S. Florida",round:"R64",feedsInto:"E_R32_3",feedsAs:"a",rd:1},
  {id:"E6",a:"Michigan St.",b:"N. Dakota St.",round:"R64",feedsInto:"E_R32_3",feedsAs:"b",rd:1},
  {id:"E7",a:"UCLA",b:"UCF",round:"R64",feedsInto:"E_R32_4",feedsAs:"a",rd:1},
  {id:"E8",a:"UConn",b:"Furman",round:"R64",feedsInto:"E_R32_4",feedsAs:"b",rd:1},
  // SOUTH
  {id:"S1",a:"Florida",b:null,round:"R64",feedsInto:"S_R32_1",feedsAs:"a",rd:1},
  {id:"S2",a:"Clemson",b:"Iowa",round:"R64",feedsInto:"S_R32_1",feedsAs:"b",rd:1},
  {id:"S3",a:"Vanderbilt",b:"McNeese",round:"R64",feedsInto:"S_R32_2",feedsAs:"a",rd:1},
  {id:"S4",a:"Nebraska",b:"Troy",round:"R64",feedsInto:"S_R32_2",feedsAs:"b",rd:1},
  {id:"S5",a:"N. Carolina",b:"VCU",round:"R64",feedsInto:"S_R32_3",feedsAs:"a",rd:1},
  {id:"S6",a:"Illinois",b:"Penn",round:"R64",feedsInto:"S_R32_3",feedsAs:"b",rd:1},
  {id:"S7",a:"St. Mary's",b:"Texas A&M",round:"R64",feedsInto:"S_R32_4",feedsAs:"a",rd:1},
  {id:"S8",a:"Houston",b:"Idaho",round:"R64",feedsInto:"S_R32_4",feedsAs:"b",rd:1},
  // WEST
  {id:"W1",a:"Arizona",b:"LIU",round:"R64",feedsInto:"W_R32_1",feedsAs:"a",rd:1},
  {id:"W2",a:"Villanova",b:"Utah State",round:"R64",feedsInto:"W_R32_1",feedsAs:"b",rd:1},
  {id:"W3",a:"Wisconsin",b:"High Point",round:"R64",feedsInto:"W_R32_2",feedsAs:"a",rd:1},
  {id:"W4",a:"Arkansas",b:"Hawaii",round:"R64",feedsInto:"W_R32_2",feedsAs:"b",rd:1},
  {id:"W5",a:"BYU",b:null,round:"R64",feedsInto:"W_R32_3",feedsAs:"a",rd:1},
  {id:"W6",a:"Gonzaga",b:"Kennesaw St.",round:"R64",feedsInto:"W_R32_3",feedsAs:"b",rd:1},
  {id:"W7",a:"Miami FL",b:"Missouri",round:"R64",feedsInto:"W_R32_4",feedsAs:"a",rd:1},
  {id:"W8",a:"Purdue",b:"Queens",round:"R64",feedsInto:"W_R32_4",feedsAs:"b",rd:1},
  // MIDWEST
  {id:"MW1",a:"Michigan",b:null,round:"R64",feedsInto:"MW_R32_1",feedsAs:"a",rd:1},
  {id:"MW2",a:"Georgia",b:"Saint Louis",round:"R64",feedsInto:"MW_R32_1",feedsAs:"b",rd:1},
  {id:"MW3",a:"Texas Tech",b:"Akron",round:"R64",feedsInto:"MW_R32_2",feedsAs:"a",rd:1},
  {id:"MW4",a:"Alabama",b:"Hofstra",round:"R64",feedsInto:"MW_R32_2",feedsAs:"b",rd:1},
  {id:"MW5",a:"Tennessee",b:null,round:"R64",feedsInto:"MW_R32_3",feedsAs:"a",rd:1},
  {id:"MW6",a:"Virginia",b:"Wright St.",round:"R64",feedsInto:"MW_R32_3",feedsAs:"b",rd:1},
  {id:"MW7",a:"Kentucky",b:"Santa Clara",round:"R64",feedsInto:"MW_R32_4",feedsAs:"a",rd:1},
  {id:"MW8",a:"Iowa State",b:"Tennessee St.",round:"R64",feedsInto:"MW_R32_4",feedsAs:"b",rd:1},
  // R32 → S16
  {id:"E_R32_1",a:null,b:null,round:"R32",feedsInto:"E_S16_1",feedsAs:"a",rd:2},
  {id:"E_R32_2",a:null,b:null,round:"R32",feedsInto:"E_S16_1",feedsAs:"b",rd:2},
  {id:"E_R32_3",a:null,b:null,round:"R32",feedsInto:"E_S16_2",feedsAs:"a",rd:2},
  {id:"E_R32_4",a:null,b:null,round:"R32",feedsInto:"E_S16_2",feedsAs:"b",rd:2},
  {id:"S_R32_1",a:null,b:null,round:"R32",feedsInto:"S_S16_1",feedsAs:"a",rd:2},
  {id:"S_R32_2",a:null,b:null,round:"R32",feedsInto:"S_S16_1",feedsAs:"b",rd:2},
  {id:"S_R32_3",a:null,b:null,round:"R32",feedsInto:"S_S16_2",feedsAs:"a",rd:2},
  {id:"S_R32_4",a:null,b:null,round:"R32",feedsInto:"S_S16_2",feedsAs:"b",rd:2},
  {id:"W_R32_1",a:null,b:null,round:"R32",feedsInto:"W_S16_1",feedsAs:"a",rd:2},
  {id:"W_R32_2",a:null,b:null,round:"R32",feedsInto:"W_S16_1",feedsAs:"b",rd:2},
  {id:"W_R32_3",a:null,b:null,round:"R32",feedsInto:"W_S16_2",feedsAs:"a",rd:2},
  {id:"W_R32_4",a:null,b:null,round:"R32",feedsInto:"W_S16_2",feedsAs:"b",rd:2},
  {id:"MW_R32_1",a:null,b:null,round:"R32",feedsInto:"MW_S16_1",feedsAs:"a",rd:2},
  {id:"MW_R32_2",a:null,b:null,round:"R32",feedsInto:"MW_S16_1",feedsAs:"b",rd:2},
  {id:"MW_R32_3",a:null,b:null,round:"R32",feedsInto:"MW_S16_2",feedsAs:"a",rd:2},
  {id:"MW_R32_4",a:null,b:null,round:"R32",feedsInto:"MW_S16_2",feedsAs:"b",rd:2},
  // S16 → E8
  {id:"E_S16_1",a:null,b:null,round:"S16",feedsInto:"E_E8",feedsAs:"a",rd:3},
  {id:"E_S16_2",a:null,b:null,round:"S16",feedsInto:"E_E8",feedsAs:"b",rd:3},
  {id:"S_S16_1",a:null,b:null,round:"S16",feedsInto:"S_E8",feedsAs:"a",rd:3},
  {id:"S_S16_2",a:null,b:null,round:"S16",feedsInto:"S_E8",feedsAs:"b",rd:3},
  {id:"W_S16_1",a:null,b:null,round:"S16",feedsInto:"W_E8",feedsAs:"a",rd:3},
  {id:"W_S16_2",a:null,b:null,round:"S16",feedsInto:"W_E8",feedsAs:"b",rd:3},
  {id:"MW_S16_1",a:null,b:null,round:"S16",feedsInto:"MW_E8",feedsAs:"a",rd:3},
  {id:"MW_S16_2",a:null,b:null,round:"S16",feedsInto:"MW_E8",feedsAs:"b",rd:3},
  // E8 → F4
  {id:"E_E8",a:null,b:null,round:"E8",feedsInto:"F4_1",feedsAs:"a",rd:4},
  {id:"S_E8",a:null,b:null,round:"E8",feedsInto:"F4_1",feedsAs:"b",rd:4},
  {id:"W_E8",a:null,b:null,round:"E8",feedsInto:"F4_2",feedsAs:"a",rd:4},
  {id:"MW_E8",a:null,b:null,round:"E8",feedsInto:"F4_2",feedsAs:"b",rd:4},
  // F4 → Championship
  {id:"F4_1",a:null,b:null,round:"F4",feedsInto:"CHAMP",feedsAs:"a",rd:5},
  {id:"F4_2",a:null,b:null,round:"F4",feedsInto:"CHAMP",feedsAs:"b",rd:5},
  {id:"CHAMP",a:null,b:null,round:"Championship",feedsInto:null,feedsAs:null,rd:6},
];

const ROUND_NAMES = ['FIRST FOUR','ROUND OF 64','ROUND OF 32','SWEET SIXTEEN','ELITE EIGHT','FINAL FOUR','CHAMPIONSHIP'];

// ESPN team IDs for live stat fetching
const ESPN_IDS = {
  "Duke":150,"Arizona":12,"Michigan":130,"Florida":57,"UConn":41,"Houston":248,
  "Iowa State":66,"Purdue":2509,"Michigan St.":127,"Illinois":356,"Gonzaga":2250,
  "Virginia":258,"Kansas":2305,"Nebraska":158,"Arkansas":8,"Alabama":333,
  "St. John's":2599,"Vanderbilt":238,"Texas Tech":2641,"Wisconsin":275,
  "Louisville":97,"N. Carolina":153,"BYU":252,"Tennessee":2633,"UCLA":26,
  "St. Mary's":2608,"Kentucky":96,"Miami FL":2390,"Ohio State":194,"Clemson":228,
  "Iowa":2294,"Georgia":61,"Villanova":222,"Utah State":328,"TCU":2628,
  "Saint Louis":139,"VCU":2670,"S. Florida":58,"UCF":2116,"Texas A&M":245,
  "Santa Clara":2488,"Missouri":142,"SMU":2567,"Texas":251,"Miami OH":193,
  "NC State":152,"N. Iowa":2460,"McNeese":2377,"Akron":2006,"High Point":2272,
  "Cal Baptist":2856,"Troy":2653,"Hofstra":2275,"Hawaii":62,"N. Dakota St.":2449,
  "Penn":219,"Wright St.":2750,"Kennesaw St.":2320,"Furman":231,"Idaho":70,
  "Queens":472610,"Tennessee St.":2634,"Siena":2561,"LIU":2335,"UMBC":2378,
  "Lehigh":2329,"Howard":47,"Prairie View":2504,
};

module.exports = { VENUES, VENUE_TIMEZONES, LOCATIONS, VENUE_MAP, BRACKET, ROUND_NAMES, ESPN_IDS };
