// ═══════════════════════════════════════════════════════
// TEAM NAME MAPPER
// ESPN uses full names like "Duke Blue Devils"
// Our database uses short names like "Duke"
// This file maps between them.
// ═══════════════════════════════════════════════════════

const NAME_MAP = {
  // 1-seeds
  "Duke Blue Devils": "Duke",
  "Arizona Wildcats": "Arizona",
  "Michigan Wolverines": "Michigan",
  "Florida Gators": "Florida",

  // 2-seeds
  "UConn Huskies": "UConn",
  "Connecticut Huskies": "UConn",
  "Purdue Boilermakers": "Purdue",
  "Iowa State Cyclones": "Iowa State",
  "Houston Cougars": "Houston",

  // 3-seeds
  "Michigan State Spartans": "Michigan St.",
  "Illinois Fighting Illini": "Illinois",
  "Gonzaga Bulldogs": "Gonzaga",
  "Virginia Cavaliers": "Virginia",

  // 4-seeds
  "Kansas Jayhawks": "Kansas",
  "Nebraska Cornhuskers": "Nebraska",
  "Arkansas Razorbacks": "Arkansas",
  "Alabama Crimson Tide": "Alabama",

  // 5-seeds
  "St. John's Red Storm": "St. John's",
  "Saint John's Red Storm": "St. John's",
  "Vanderbilt Commodores": "Vanderbilt",
  "Wisconsin Badgers": "Wisconsin",
  "Texas Tech Red Raiders": "Texas Tech",

  // 6-seeds
  "Louisville Cardinals": "Louisville",
  "North Carolina Tar Heels": "N. Carolina",
  "UNC Tar Heels": "N. Carolina",
  "BYU Cougars": "BYU",
  "Tennessee Volunteers": "Tennessee",

  // 7-seeds
  "UCLA Bruins": "UCLA",
  "Saint Mary's Gaels": "St. Mary's",
  "Miami Hurricanes": "Miami FL",
  "Miami (FL) Hurricanes": "Miami FL",
  "Kentucky Wildcats": "Kentucky",

  // 8-seeds
  "Ohio State Buckeyes": "Ohio State",
  "Clemson Tigers": "Clemson",
  "Villanova Wildcats": "Villanova",
  "Georgia Bulldogs": "Georgia",

  // 9-seeds
  "TCU Horned Frogs": "TCU",
  "Iowa Hawkeyes": "Iowa",
  "Utah State Aggies": "Utah State",
  "Saint Louis Billikens": "Saint Louis",

  // 10-seeds
  "UCF Knights": "UCF",
  "Texas A&M Aggies": "Texas A&M",
  "Missouri Tigers": "Missouri",
  "Santa Clara Broncos": "Santa Clara",

  // 11-seeds
  "South Florida Bulls": "S. Florida",
  "USF Bulls": "S. Florida",
  "VCU Rams": "VCU",
  "Texas Longhorns": "Texas",
  "NC State Wolfpack": "NC State",
  "SMU Mustangs": "SMU",
  "Miami (OH) RedHawks": "Miami OH",
  "Miami Ohio RedHawks": "Miami OH",

  // 12-seeds
  "Northern Iowa Panthers": "N. Iowa",
  "McNeese Cowboys": "McNeese",
  "High Point Panthers": "High Point",
  "Akron Zips": "Akron",

  // 13-seeds
  "Cal Baptist Lancers": "Cal Baptist",
  "California Baptist Lancers": "Cal Baptist",
  "Troy Trojans": "Troy",
  "Hawai'i Rainbow Warriors": "Hawaii",
  "Hawaii Rainbow Warriors": "Hawaii",
  "Hofstra Pride": "Hofstra",

  // 14-seeds
  "North Dakota State Bison": "N. Dakota St.",
  "Penn Quakers": "Penn",
  "Kennesaw State Owls": "Kennesaw St.",
  "Wright State Raiders": "Wright St.",

  // 15-seeds
  "Furman Paladins": "Furman",
  "Idaho Vandals": "Idaho",
  "Queens Royals": "Queens",
  "Tennessee State Tigers": "Tennessee St.",

  // 16-seeds
  "Siena Saints": "Siena",
  "UMBC Retrievers": "UMBC",
  "Howard Bison": "Howard",
  "LIU Sharks": "LIU",
  "Long Island University Sharks": "LIU",
  "Long Island University": "LIU",
  "Queens University Royals": "Queens",
  "Lehigh Mountain Hawks": "Lehigh",
  "Prairie View A&M Panthers": "Prairie View",
};

// Resolve a name: try exact match, then map, then fuzzy
function resolve(espnName, teamDB) {
  // Direct hit
  if (teamDB[espnName]) return espnName;

  // Map lookup
  if (NAME_MAP[espnName]) return NAME_MAP[espnName];

  // Fuzzy: strip suffixes and try
  const words = espnName.split(' ');
  // Try first word (e.g. "Duke" from "Duke Blue Devils")
  if (teamDB[words[0]]) return words[0];
  // Try first two words (e.g. "Iowa State" from "Iowa State Cyclones")
  if (words.length >= 2 && teamDB[words.slice(0, 2).join(' ')]) return words.slice(0, 2).join(' ');
  // Try first three
  if (words.length >= 3 && teamDB[words.slice(0, 3).join(' ')]) return words.slice(0, 3).join(' ');

  return null; // no match
}

module.exports = { NAME_MAP, resolve };
