export type Position = "QB" | "RB" | "WR";

export type QBInfo = {
  id: string;
  name: string;
  team: string;
  teamAbbr: string;
  conference: "AFC" | "NFC";
  division: "AFC East" | "AFC West" | "AFC North" | "AFC South" | "NFC East" | "NFC West" | "NFC North" | "NFC South";
  heightIn: number;
  age: number;
  jersey: number;
  draftRound: number;
  yearsExp: number;
  tier: "easy" | "medium" | "hard";
  position: Position;
};

export const NFL_QBS: QBInfo[] = [
  // ── EASY ──────────────────────────────────────────────────────────
  {
    id: "patrick-mahomes",
    name: "Patrick Mahomes",
    team: "Kansas City Chiefs",
    teamAbbr: "KC",
    conference: "AFC",
    division: "AFC West",
    heightIn: 75,  // 6'3"
    age: 29,
    jersey: 15,
    draftRound: 1,
    yearsExp: 8,
    tier: "easy", position: "QB",
  },
  {
    id: "josh-allen",
    name: "Josh Allen",
    team: "Buffalo Bills",
    teamAbbr: "BUF",
    conference: "AFC",
    division: "AFC East",
    heightIn: 77,  // 6'5"
    age: 29,
    jersey: 17,
    draftRound: 1,
    yearsExp: 7,
    tier: "easy", position: "QB",
  },
  {
    id: "lamar-jackson",
    name: "Lamar Jackson",
    team: "Baltimore Ravens",
    teamAbbr: "BAL",
    conference: "AFC",
    division: "AFC North",
    heightIn: 74,  // 6'2"
    age: 28,
    jersey: 8,
    draftRound: 1,
    yearsExp: 7,
    tier: "easy", position: "QB",
  },
  {
    id: "joe-burrow",
    name: "Joe Burrow",
    team: "Cincinnati Bengals",
    teamAbbr: "CIN",
    conference: "AFC",
    division: "AFC North",
    heightIn: 76,  // 6'4"
    age: 28,
    jersey: 9,
    draftRound: 1,
    yearsExp: 5,
    tier: "easy", position: "QB",
  },
  {
    id: "jalen-hurts",
    name: "Jalen Hurts",
    team: "Philadelphia Eagles",
    teamAbbr: "PHI",
    conference: "NFC",
    division: "NFC East",
    heightIn: 72,  // 6'0"
    age: 26,
    jersey: 1,
    draftRound: 2,
    yearsExp: 5,
    tier: "easy", position: "QB",
  },
  {
    id: "trevor-lawrence",
    name: "Trevor Lawrence",
    team: "Jacksonville Jaguars",
    teamAbbr: "JAX",
    conference: "AFC",
    division: "AFC South",
    heightIn: 78,  // 6'6"
    age: 25,
    jersey: 16,
    draftRound: 1,
    yearsExp: 4,
    tier: "easy", position: "QB",
  },
  {
    id: "jordan-love",
    name: "Jordan Love",
    team: "Green Bay Packers",
    teamAbbr: "GB",
    conference: "NFC",
    division: "NFC North",
    heightIn: 75,  // 6'3"
    age: 26,
    jersey: 10,
    draftRound: 1,
    yearsExp: 5,
    tier: "easy", position: "QB",
  },
  {
    id: "cj-stroud",
    name: "C.J. Stroud",
    team: "Houston Texans",
    teamAbbr: "HOU",
    conference: "AFC",
    division: "AFC South",
    heightIn: 75,  // 6'3"
    age: 23,
    jersey: 7,
    draftRound: 1,
    yearsExp: 2,
    tier: "easy", position: "QB",
  },
  {
    id: "kyler-murray",
    name: "Kyler Murray",
    team: "Arizona Cardinals",
    teamAbbr: "ARI",
    conference: "NFC",
    division: "NFC West",
    heightIn: 70,  // 5'10"
    age: 27,
    jersey: 1,
    draftRound: 1,
    yearsExp: 6,
    tier: "easy", position: "QB",
  },
  {
    id: "justin-herbert",
    name: "Justin Herbert",
    team: "Los Angeles Chargers",
    teamAbbr: "LAC",
    conference: "AFC",
    division: "AFC West",
    heightIn: 78,  // 6'6"
    age: 27,
    jersey: 10,
    draftRound: 1,
    yearsExp: 5,
    tier: "easy", position: "QB",
  },
  {
    id: "dak-prescott",
    name: "Dak Prescott",
    team: "Dallas Cowboys",
    teamAbbr: "DAL",
    conference: "NFC",
    division: "NFC East",
    heightIn: 74,  // 6'2"
    age: 31,
    jersey: 4,
    draftRound: 4,
    yearsExp: 9,
    tier: "easy", position: "QB",
  },
  {
    id: "brock-purdy",
    name: "Brock Purdy",
    team: "San Francisco 49ers",
    teamAbbr: "SF",
    conference: "NFC",
    division: "NFC West",
    heightIn: 73,  // 6'1"
    age: 25,
    jersey: 13,
    draftRound: 7,
    yearsExp: 3,
    tier: "easy", position: "QB",
  },
  {
    id: "sam-darnold",
    name: "Sam Darnold",
    team: "Minnesota Vikings",
    teamAbbr: "MIN",
    conference: "NFC",
    division: "NFC North",
    heightIn: 75,  // 6'3"
    age: 27,
    jersey: 14,
    draftRound: 1,
    yearsExp: 7,
    tier: "easy", position: "QB",
  },
  {
    id: "baker-mayfield",
    name: "Baker Mayfield",
    team: "Tampa Bay Buccaneers",
    teamAbbr: "TB",
    conference: "NFC",
    division: "NFC South",
    heightIn: 73,  // 6'1"
    age: 30,
    jersey: 6,
    draftRound: 1,
    yearsExp: 7,
    tier: "easy", position: "QB",
  },
  {
    id: "caleb-williams",
    name: "Caleb Williams",
    team: "Chicago Bears",
    teamAbbr: "CHI",
    conference: "NFC",
    division: "NFC North",
    heightIn: 74,  // 6'2"
    age: 23,
    jersey: 18,
    draftRound: 1,
    yearsExp: 1,
    tier: "easy", position: "QB",
  },
  {
    id: "jayden-daniels",
    name: "Jayden Daniels",
    team: "Washington Commanders",
    teamAbbr: "WAS",
    conference: "NFC",
    division: "NFC East",
    heightIn: 75,  // 6'3"
    age: 24,
    jersey: 5,
    draftRound: 1,
    yearsExp: 1,
    tier: "easy", position: "QB",
  },
  {
    id: "drake-maye",
    name: "Drake Maye",
    team: "New England Patriots",
    teamAbbr: "NE",
    conference: "AFC",
    division: "AFC East",
    heightIn: 77,  // 6'5"
    age: 22,
    jersey: 10,
    draftRound: 1,
    yearsExp: 1,
    tier: "easy", position: "QB",
  },

  // ── MEDIUM ────────────────────────────────────────────────────────
  {
    id: "matthew-stafford",
    name: "Matthew Stafford",
    team: "Los Angeles Rams",
    teamAbbr: "LAR",
    conference: "NFC",
    division: "NFC West",
    heightIn: 75,  // 6'3"
    age: 37,
    jersey: 9,
    draftRound: 1,
    yearsExp: 16,
    tier: "medium", position: "QB",
  },
  {
    id: "jared-goff",
    name: "Jared Goff",
    team: "Detroit Lions",
    teamAbbr: "DET",
    conference: "NFC",
    division: "NFC North",
    heightIn: 76,  // 6'4"
    age: 30,
    jersey: 16,
    draftRound: 1,
    yearsExp: 9,
    tier: "medium", position: "QB",
  },
  {
    id: "kirk-cousins",
    name: "Kirk Cousins",
    team: "Atlanta Falcons",
    teamAbbr: "ATL",
    conference: "NFC",
    division: "NFC South",
    heightIn: 75,  // 6'3"
    age: 36,
    jersey: 18,
    draftRound: 4,
    yearsExp: 13,
    tier: "medium", position: "QB",
  },
  {
    id: "derek-carr",
    name: "Derek Carr",
    team: "New Orleans Saints",
    teamAbbr: "NO",
    conference: "NFC",
    division: "NFC South",
    heightIn: 75,  // 6'3"
    age: 34,
    jersey: 4,
    draftRound: 2,
    yearsExp: 11,
    tier: "medium", position: "QB",
  },
  {
    id: "daniel-jones",
    name: "Daniel Jones",
    team: "New York Giants",
    teamAbbr: "NYG",
    conference: "NFC",
    division: "NFC East",
    heightIn: 77,  // 6'5"
    age: 27,
    jersey: 8,
    draftRound: 1,
    yearsExp: 6,
    tier: "medium", position: "QB",
  },
  {
    id: "justin-fields",
    name: "Justin Fields",
    team: "Pittsburgh Steelers",
    teamAbbr: "PIT",
    conference: "AFC",
    division: "AFC North",
    heightIn: 74,  // 6'2"
    age: 26,
    jersey: 2,
    draftRound: 1,
    yearsExp: 4,
    tier: "medium", position: "QB",
  },
  {
    id: "geno-smith",
    name: "Geno Smith",
    team: "Seattle Seahawks",
    teamAbbr: "SEA",
    conference: "NFC",
    division: "NFC West",
    heightIn: 75,  // 6'3"
    age: 34,
    jersey: 7,
    draftRound: 2,
    yearsExp: 12,
    tier: "medium", position: "QB",
  },
  {
    id: "tua-tagovailoa",
    name: "Tua Tagovailoa",
    team: "Miami Dolphins",
    teamAbbr: "MIA",
    conference: "AFC",
    division: "AFC East",
    heightIn: 73,  // 6'1"
    age: 27,
    jersey: 1,
    draftRound: 1,
    yearsExp: 5,
    tier: "medium", position: "QB",
  },
  {
    id: "will-levis",
    name: "Will Levis",
    team: "Tennessee Titans",
    teamAbbr: "TEN",
    conference: "AFC",
    division: "AFC South",
    heightIn: 76,  // 6'4"
    age: 25,
    jersey: 8,
    draftRound: 2,
    yearsExp: 2,
    tier: "medium", position: "QB",
  },
  {
    id: "anthony-richardson",
    name: "Anthony Richardson",
    team: "Indianapolis Colts",
    teamAbbr: "IND",
    conference: "AFC",
    division: "AFC South",
    heightIn: 78,  // 6'6"
    age: 23,
    jersey: 5,
    draftRound: 1,
    yearsExp: 2,
    tier: "medium", position: "QB",
  },
  {
    id: "bryce-young",
    name: "Bryce Young",
    team: "Carolina Panthers",
    teamAbbr: "CAR",
    conference: "NFC",
    division: "NFC South",
    heightIn: 71,  // 5'11"
    age: 23,
    jersey: 9,
    draftRound: 1,
    yearsExp: 2,
    tier: "medium", position: "QB",
  },
  {
    id: "bo-nix",
    name: "Bo Nix",
    team: "Denver Broncos",
    teamAbbr: "DEN",
    conference: "AFC",
    division: "AFC West",
    heightIn: 74,  // 6'2"
    age: 24,
    jersey: 10,
    draftRound: 1,
    yearsExp: 1,
    tier: "medium", position: "QB",
  },
  {
    id: "jj-mccarthy",
    name: "J.J. McCarthy",
    team: "Minnesota Vikings",
    teamAbbr: "MIN",
    conference: "NFC",
    division: "NFC North",
    heightIn: 75,  // 6'3"
    age: 22,
    jersey: 9,
    draftRound: 1,
    yearsExp: 1,
    tier: "medium", position: "QB",
  },
  {
    id: "michael-penix",
    name: "Michael Penix Jr.",
    team: "Atlanta Falcons",
    teamAbbr: "ATL",
    conference: "NFC",
    division: "NFC South",
    heightIn: 75,  // 6'3"
    age: 24,
    jersey: 9,
    draftRound: 1,
    yearsExp: 1,
    tier: "medium", position: "QB",
  },

  // ── HARD ──────────────────────────────────────────────────────────
  {
    id: "gardner-minshew",
    name: "Gardner Minshew",
    team: "Las Vegas Raiders",
    teamAbbr: "LV",
    conference: "AFC",
    division: "AFC West",
    heightIn: 73,  // 6'1"
    age: 29,
    jersey: 15,
    draftRound: 6,
    yearsExp: 6,
    tier: "hard", position: "QB",
  },
  {
    id: "jacoby-brissett",
    name: "Jacoby Brissett",
    team: "Washington Commanders",
    teamAbbr: "WAS",
    conference: "NFC",
    division: "NFC East",
    heightIn: 76,  // 6'4"
    age: 32,
    jersey: 14,
    draftRound: 3,
    yearsExp: 9,
    tier: "hard", position: "QB",
  },
  {
    id: "marcus-mariota",
    name: "Marcus Mariota",
    team: "Philadelphia Eagles",
    teamAbbr: "PHI",
    conference: "NFC",
    division: "NFC East",
    heightIn: 76,  // 6'4"
    age: 31,
    jersey: 8,
    draftRound: 1,
    yearsExp: 10,
    tier: "hard", position: "QB",
  },
  {
    id: "ryan-tannehill",
    name: "Ryan Tannehill",
    team: "Tennessee Titans",
    teamAbbr: "TEN",
    conference: "AFC",
    division: "AFC South",
    heightIn: 76,  // 6'4"
    age: 36,
    jersey: 17,
    draftRound: 1,
    yearsExp: 13,
    tier: "hard", position: "QB",
  },
  {
    id: "andy-dalton",
    name: "Andy Dalton",
    team: "Carolina Panthers",
    teamAbbr: "CAR",
    conference: "NFC",
    division: "NFC South",
    heightIn: 74,  // 6'2"
    age: 37,
    jersey: 14,
    draftRound: 2,
    yearsExp: 14,
    tier: "hard", position: "QB",
  },
  {
    id: "colt-mccoy",
    name: "Colt McCoy",
    team: "Arizona Cardinals",
    teamAbbr: "ARI",
    conference: "NFC",
    division: "NFC West",
    heightIn: 73,  // 6'1"
    age: 38,
    jersey: 12,
    draftRound: 3,
    yearsExp: 15,
    tier: "hard", position: "QB",
  },
  {
    id: "nick-foles",
    name: "Nick Foles",
    team: "Indianapolis Colts",
    teamAbbr: "IND",
    conference: "AFC",
    division: "AFC South",
    heightIn: 77,  // 6'5"
    age: 36,
    jersey: 9,
    draftRound: 3,
    yearsExp: 13,
    tier: "hard", position: "QB",
  },
  {
    id: "case-keenum",
    name: "Case Keenum",
    team: "Cleveland Browns",
    teamAbbr: "CLE",
    conference: "AFC",
    division: "AFC North",
    heightIn: 73,  // 6'1"
    age: 37,
    jersey: 5,
    draftRound: 0,
    yearsExp: 12,
    tier: "hard", position: "QB",
  },
  {
    id: "blaine-gabbert",
    name: "Blaine Gabbert",
    team: "Tampa Bay Buccaneers",
    teamAbbr: "TB",
    conference: "NFC",
    division: "NFC South",
    heightIn: 77,  // 6'5"
    age: 35,
    jersey: 11,
    draftRound: 1,
    yearsExp: 14,
    tier: "hard", position: "QB",
  },
  {
    id: "tommy-devito",
    name: "Tommy DeVito",
    team: "New York Giants",
    teamAbbr: "NYG",
    conference: "NFC",
    division: "NFC East",
    heightIn: 73,  // 6'1"
    age: 26,
    jersey: 15,
    draftRound: 0,
    yearsExp: 2,
    tier: "hard", position: "QB",
  },
  {
    id: "aidan-oconnell",
    name: "Aidan O'Connell",
    team: "Las Vegas Raiders",
    teamAbbr: "LV",
    conference: "AFC",
    division: "AFC West",
    heightIn: 75,  // 6'3"
    age: 27,
    jersey: 12,
    draftRound: 4,
    yearsExp: 2,
    tier: "hard", position: "QB",
  },
  {
    id: "mac-jones",
    name: "Mac Jones",
    team: "Jacksonville Jaguars",
    teamAbbr: "JAX",
    conference: "AFC",
    division: "AFC South",
    heightIn: 75,  // 6'3"
    age: 26,
    jersey: 10,
    draftRound: 1,
    yearsExp: 4,
    tier: "hard", position: "QB",
  },
];

export const NFL_RBS: QBInfo[] = [
  // ── EASY ──────────────────────────────────────────────────────────
  { id: "christian-mccaffrey", name: "Christian McCaffrey", team: "San Francisco 49ers", teamAbbr: "SF", conference: "NFC", division: "NFC West", heightIn: 71, age: 28, jersey: 23, draftRound: 1, yearsExp: 8, tier: "easy", position: "RB" },
  { id: "derrick-henry", name: "Derrick Henry", team: "Baltimore Ravens", teamAbbr: "BAL", conference: "AFC", division: "AFC North", heightIn: 75, age: 31, jersey: 22, draftRound: 5, yearsExp: 9, tier: "easy", position: "RB" },
  { id: "saquon-barkley", name: "Saquon Barkley", team: "Philadelphia Eagles", teamAbbr: "PHI", conference: "NFC", division: "NFC East", heightIn: 71, age: 28, jersey: 26, draftRound: 1, yearsExp: 7, tier: "easy", position: "RB" },
  { id: "breece-hall", name: "Breece Hall", team: "New York Jets", teamAbbr: "NYJ", conference: "AFC", division: "AFC East", heightIn: 73, age: 23, jersey: 20, draftRound: 1, yearsExp: 3, tier: "easy", position: "RB" },
  { id: "de-von-achane", name: "De'Von Achane", team: "Miami Dolphins", teamAbbr: "MIA", conference: "AFC", division: "AFC East", heightIn: 69, age: 23, jersey: 28, draftRound: 3, yearsExp: 2, tier: "easy", position: "RB" },
  { id: "josh-jacobs", name: "Josh Jacobs", team: "Green Bay Packers", teamAbbr: "GB", conference: "NFC", division: "NFC North", heightIn: 70, age: 26, jersey: 8, draftRound: 1, yearsExp: 6, tier: "easy", position: "RB" },
  { id: "jonathan-taylor", name: "Jonathan Taylor", team: "Indianapolis Colts", teamAbbr: "IND", conference: "AFC", division: "AFC South", heightIn: 71, age: 25, jersey: 28, draftRound: 2, yearsExp: 5, tier: "easy", position: "RB" },
  { id: "bijan-robinson", name: "Bijan Robinson", team: "Atlanta Falcons", teamAbbr: "ATL", conference: "NFC", division: "NFC South", heightIn: 71, age: 23, jersey: 7, draftRound: 1, yearsExp: 2, tier: "easy", position: "RB" },
  // ── MEDIUM ────────────────────────────────────────────────────────
  { id: "tony-pollard", name: "Tony Pollard", team: "Tennessee Titans", teamAbbr: "TEN", conference: "AFC", division: "AFC South", heightIn: 72, age: 27, jersey: 20, draftRound: 4, yearsExp: 6, tier: "medium", position: "RB" },
  { id: "aaron-jones", name: "Aaron Jones", team: "Minnesota Vikings", teamAbbr: "MIN", conference: "NFC", division: "NFC North", heightIn: 69, age: 30, jersey: 33, draftRound: 5, yearsExp: 8, tier: "medium", position: "RB" },
  { id: "rhamondre-stevenson", name: "Rhamondre Stevenson", team: "New England Patriots", teamAbbr: "NE", conference: "AFC", division: "AFC East", heightIn: 72, age: 25, jersey: 38, draftRound: 4, yearsExp: 4, tier: "medium", position: "RB" },
  { id: "david-montgomery", name: "David Montgomery", team: "Detroit Lions", teamAbbr: "DET", conference: "NFC", division: "NFC North", heightIn: 70, age: 27, jersey: 5, draftRound: 3, yearsExp: 6, tier: "medium", position: "RB" },
  { id: "isiah-pacheco", name: "Isiah Pacheco", team: "Kansas City Chiefs", teamAbbr: "KC", conference: "AFC", division: "AFC West", heightIn: 71, age: 25, jersey: 10, draftRound: 7, yearsExp: 3, tier: "medium", position: "RB" },
  { id: "joe-mixon", name: "Joe Mixon", team: "Houston Texans", teamAbbr: "HOU", conference: "AFC", division: "AFC South", heightIn: 73, age: 28, jersey: 28, draftRound: 2, yearsExp: 8, tier: "medium", position: "RB" },
  { id: "james-cook", name: "James Cook", team: "Buffalo Bills", teamAbbr: "BUF", conference: "AFC", division: "AFC East", heightIn: 70, age: 24, jersey: 4, draftRound: 2, yearsExp: 3, tier: "medium", position: "RB" },
  { id: "rachaad-white", name: "Rachaad White", team: "Tampa Bay Buccaneers", teamAbbr: "TB", conference: "NFC", division: "NFC South", heightIn: 73, age: 25, jersey: 29, draftRound: 3, yearsExp: 3, tier: "medium", position: "RB" },
  // ── HARD ──────────────────────────────────────────────────────────
  { id: "zack-moss", name: "Zack Moss", team: "Cincinnati Bengals", teamAbbr: "CIN", conference: "AFC", division: "AFC North", heightIn: 69, age: 27, jersey: 31, draftRound: 3, yearsExp: 5, tier: "hard", position: "RB" },
  { id: "dameon-pierce", name: "Dameon Pierce", team: "Houston Texans", teamAbbr: "HOU", conference: "AFC", division: "AFC South", heightIn: 70, age: 24, jersey: 31, draftRound: 4, yearsExp: 3, tier: "hard", position: "RB" },
  { id: "devin-singletary", name: "Devin Singletary", team: "New York Giants", teamAbbr: "NYG", conference: "NFC", division: "NFC East", heightIn: 68, age: 27, jersey: 26, draftRound: 3, yearsExp: 6, tier: "hard", position: "RB" },
  { id: "tyler-allgeier", name: "Tyler Allgeier", team: "Atlanta Falcons", teamAbbr: "ATL", conference: "NFC", division: "NFC South", heightIn: 71, age: 24, jersey: 25, draftRound: 5, yearsExp: 3, tier: "hard", position: "RB" },
  { id: "kareem-hunt", name: "Kareem Hunt", team: "Kansas City Chiefs", teamAbbr: "KC", conference: "AFC", division: "AFC West", heightIn: 71, age: 29, jersey: 29, draftRound: 3, yearsExp: 8, tier: "hard", position: "RB" },
];

export const NFL_WRS: QBInfo[] = [
  // ── EASY ──────────────────────────────────────────────────────────
  { id: "tyreek-hill", name: "Tyreek Hill", team: "Miami Dolphins", teamAbbr: "MIA", conference: "AFC", division: "AFC East", heightIn: 70, age: 31, jersey: 10, draftRound: 5, yearsExp: 9, tier: "easy", position: "WR" },
  { id: "justin-jefferson", name: "Justin Jefferson", team: "Minnesota Vikings", teamAbbr: "MIN", conference: "NFC", division: "NFC North", heightIn: 75, age: 25, jersey: 18, draftRound: 1, yearsExp: 5, tier: "easy", position: "WR" },
  { id: "ceedee-lamb", name: "CeeDee Lamb", team: "Dallas Cowboys", teamAbbr: "DAL", conference: "NFC", division: "NFC East", heightIn: 73, age: 25, jersey: 88, draftRound: 1, yearsExp: 5, tier: "easy", position: "WR" },
  { id: "davante-adams", name: "Davante Adams", team: "Las Vegas Raiders", teamAbbr: "LV", conference: "AFC", division: "AFC West", heightIn: 73, age: 32, jersey: 17, draftRound: 2, yearsExp: 11, tier: "easy", position: "WR" },
  { id: "jamarr-chase", name: "Ja'Marr Chase", team: "Cincinnati Bengals", teamAbbr: "CIN", conference: "AFC", division: "AFC North", heightIn: 72, age: 25, jersey: 1, draftRound: 1, yearsExp: 4, tier: "easy", position: "WR" },
  { id: "aj-brown", name: "A.J. Brown", team: "Philadelphia Eagles", teamAbbr: "PHI", conference: "NFC", division: "NFC East", heightIn: 73, age: 27, jersey: 11, draftRound: 2, yearsExp: 6, tier: "easy", position: "WR" },
  { id: "amon-ra-st-brown", name: "Amon-Ra St. Brown", team: "Detroit Lions", teamAbbr: "DET", conference: "NFC", division: "NFC North", heightIn: 71, age: 25, jersey: 14, draftRound: 4, yearsExp: 4, tier: "easy", position: "WR" },
  { id: "stefon-diggs", name: "Stefon Diggs", team: "Houston Texans", teamAbbr: "HOU", conference: "AFC", division: "AFC South", heightIn: 72, age: 31, jersey: 14, draftRound: 5, yearsExp: 10, tier: "easy", position: "WR" },
  // ── MEDIUM ────────────────────────────────────────────────────────
  { id: "dk-metcalf", name: "DK Metcalf", team: "Seattle Seahawks", teamAbbr: "SEA", conference: "NFC", division: "NFC West", heightIn: 76, age: 27, jersey: 14, draftRound: 2, yearsExp: 6, tier: "medium", position: "WR" },
  { id: "tee-higgins", name: "Tee Higgins", team: "Cincinnati Bengals", teamAbbr: "CIN", conference: "AFC", division: "AFC North", heightIn: 75, age: 25, jersey: 5, draftRound: 2, yearsExp: 5, tier: "medium", position: "WR" },
  { id: "mike-evans", name: "Mike Evans", team: "Tampa Bay Buccaneers", teamAbbr: "TB", conference: "NFC", division: "NFC South", heightIn: 77, age: 31, jersey: 13, draftRound: 1, yearsExp: 11, tier: "medium", position: "WR" },
  { id: "cooper-kupp", name: "Cooper Kupp", team: "Los Angeles Rams", teamAbbr: "LAR", conference: "NFC", division: "NFC West", heightIn: 74, age: 32, jersey: 10, draftRound: 3, yearsExp: 8, tier: "medium", position: "WR" },
  { id: "deebo-samuel", name: "Deebo Samuel", team: "San Francisco 49ers", teamAbbr: "SF", conference: "NFC", division: "NFC West", heightIn: 71, age: 29, jersey: 19, draftRound: 2, yearsExp: 6, tier: "medium", position: "WR" },
  { id: "chris-godwin", name: "Chris Godwin", team: "Tampa Bay Buccaneers", teamAbbr: "TB", conference: "NFC", division: "NFC South", heightIn: 73, age: 29, jersey: 14, draftRound: 3, yearsExp: 8, tier: "medium", position: "WR" },
  { id: "keenan-allen", name: "Keenan Allen", team: "Chicago Bears", teamAbbr: "CHI", conference: "NFC", division: "NFC North", heightIn: 73, age: 32, jersey: 13, draftRound: 3, yearsExp: 12, tier: "medium", position: "WR" },
  { id: "brandon-aiyuk", name: "Brandon Aiyuk", team: "San Francisco 49ers", teamAbbr: "SF", conference: "NFC", division: "NFC West", heightIn: 73, age: 27, jersey: 11, draftRound: 1, yearsExp: 5, tier: "medium", position: "WR" },
  // ── HARD ──────────────────────────────────────────────────────────
  { id: "jahan-dotson", name: "Jahan Dotson", team: "Washington Commanders", teamAbbr: "WAS", conference: "NFC", division: "NFC East", heightIn: 70, age: 24, jersey: 1, draftRound: 1, yearsExp: 3, tier: "hard", position: "WR" },
  { id: "wan-dale-robinson", name: "Wan'Dale Robinson", team: "New York Giants", teamAbbr: "NYG", conference: "NFC", division: "NFC East", heightIn: 67, age: 23, jersey: 1, draftRound: 2, yearsExp: 3, tier: "hard", position: "WR" },
  { id: "dontayvion-wicks", name: "Dontayvion Wicks", team: "Green Bay Packers", teamAbbr: "GB", conference: "NFC", division: "NFC North", heightIn: 73, age: 23, jersey: 18, draftRound: 6, yearsExp: 2, tier: "hard", position: "WR" },
  { id: "michael-gallup", name: "Michael Gallup", team: "Dallas Cowboys", teamAbbr: "DAL", conference: "NFC", division: "NFC East", heightIn: 73, age: 28, jersey: 13, draftRound: 3, yearsExp: 7, tier: "hard", position: "WR" },
  { id: "treylon-burks", name: "Tre'lon Burks", team: "Tennessee Titans", teamAbbr: "TEN", conference: "AFC", division: "AFC South", heightIn: 75, age: 23, jersey: 16, draftRound: 1, yearsExp: 3, tier: "hard", position: "WR" },
];

export const NFL_PLAYERS: QBInfo[] = [...NFL_QBS, ...NFL_RBS, ...NFL_WRS];

export function fmtHeight(heightIn: number): string {
  const ft = Math.floor(heightIn / 12);
  const inches = heightIn % 12;
  return `${ft}'${inches}"`;
}

export function getQBsByTier(tier: "easy" | "medium" | "hard"): QBInfo[] {
  return NFL_QBS.filter((qb) => qb.tier === tier);
}

export function getQBById(id: string): QBInfo | undefined {
  return NFL_QBS.find((qb) => qb.id === id);
}
