// Trade values data from CSV files
const tradeValuesData = {
    qb: [
        { rank: 1, player: "Lamar Jackson", value1QB: 46, value2QB: 81 },
        { rank: 2, player: "Josh Allen", value1QB: 45, value2QB: 80 },
        { rank: 3, player: "Jalen Hurts", value1QB: 38, value2QB: 72 },
        { rank: 4, player: "Jayden Daniels", value1QB: 30, value2QB: 65 },
        { rank: 5, player: "Justin Herbert", value1QB: 24, value2QB: 56 },
        { rank: 6, player: "Baker Mayfield", value1QB: 15, value2QB: 49 },
        { rank: 7, player: "Patrick Mahomes II", value1QB: 15, value2QB: 49 },
        { rank: 8, player: "Caleb Williams", value1QB: 15, value2QB: 49 },
        { rank: 9, player: "Drake Maye", value1QB: 14, value2QB: 48 },
        { rank: 10, player: "Brock Purdy", value1QB: 13, value2QB: 47 },
        { rank: 11, player: "Justin Fields", value1QB: 12, value2QB: 46 },
        { rank: 12, player: "Daniel Jones", value1QB: 11, value2QB: 45 },
        { rank: 13, player: "Kyler Murray", value1QB: 10, value2QB: 44 },
        { rank: 14, player: "Jordan Love", value1QB: 9, value2QB: 43 },
        { rank: 15, player: "Jared Goff", value1QB: 9, value2QB: 43 },
        { rank: 16, player: "Bo Nix", value1QB: 9, value2QB: 43 },
        { rank: 17, player: "Dak Prescott", value1QB: 8, value2QB: 41 },
        { rank: 18, player: "Jaxson Dart", value1QB: 7, value2QB: 39 },
        { rank: 19, player: "Geno Smith", value1QB: 5, value2QB: 36 },
        { rank: 20, player: "Trevor Lawrence", value1QB: 5, value2QB: 36 },
        { rank: 21, player: "Matthew Stafford", value1QB: 5, value2QB: 36 },
        { rank: 22, player: "C.J. Stroud", value1QB: 4, value2QB: 34 },
        { rank: 23, player: "Michael Penix Jr.", value1QB: 3, value2QB: 32 },
        { rank: 24, player: "Bryce Young", value1QB: 2, value2QB: 30 },
        { rank: 25, player: "Sam Darnold", value1QB: 2, value2QB: 30 },
        { rank: 26, player: "J.J. McCarthy", value1QB: 1, value2QB: 28 },
        { rank: 27, player: "Tua Tagovailoa", value1QB: 1, value2QB: 27 },
        { rank: 28, player: "Jake Browning", value1QB: 1, value2QB: 26 },
        { rank: 29, player: "Cam Ward", value1QB: 1, value2QB: 25 },
        { rank: 30, player: "Aaron Rodgers", value1QB: 1, value2QB: 24 },
        { rank: 31, player: "Spencer Rattler", value1QB: 0, value2QB: 18 },
        { rank: 32, player: "Joe Flacco", value1QB: 0, value2QB: 17 },
        { rank: 33, player: "Carson Wentz", value1QB: 0, value2QB: 15 },
        { rank: 34, player: "Marcus Mariota", value1QB: 0, value2QB: 7 },
        { rank: 35, player: "Tyrod Taylor", value1QB: 0, value2QB: 7 },
        { rank: 36, player: "Dillon Gabriel", value1QB: 0, value2QB: 7 },
        { rank: 37, player: "Russell Wilson", value1QB: 0, value2QB: 5 },
        { rank: 38, player: "Mac Jones", value1QB: 0, value2QB: 4 },
        { rank: 39, player: "Tyler Shough", value1QB: 0, value2QB: 3 },
        { rank: 40, player: "Kirk Cousins", value1QB: 0, value2QB: 1 }
    ],
    rb: [
        { rank: 1, player: "Bijan Robinson", valueHALF: 74, valuePPR: 76 },
        { rank: 2, player: "Christian McCaffrey", valueHALF: 73, valuePPR: 75 },
        { rank: 3, player: "Jonathan Taylor", valueHALF: 71, valuePPR: 73 },
        { rank: 4, player: "Jahmyr Gibbs", valueHALF: 69, valuePPR: 71 },
        { rank: 5, player: "Saquon Barkley", valueHALF: 68, valuePPR: 69 },
        { rank: 6, player: "James Cook III", valueHALF: 59, valuePPR: 61 },
        { rank: 7, player: "Derrick Henry", valueHALF: 59, valuePPR: 60 },
        { rank: 8, player: "Josh Jacobs", valueHALF: 56, valuePPR: 58 },
        { rank: 9, player: "De'Von Achane", valueHALF: 55, valuePPR: 57 },
        { rank: 10, player: "Bucky Irving", valueHALF: 54, valuePPR: 56 },
        { rank: 11, player: "Omarion Hampton", valueHALF: 48, valuePPR: 50 },
        { rank: 12, player: "Kyren Williams", valueHALF: 45, valuePPR: 47 },
        { rank: 13, player: "Kenneth Walker III", valueHALF: 44, valuePPR: 46 },
        { rank: 14, player: "Travis Etienne Jr.", valueHALF: 41, valuePPR: 43 },
        { rank: 15, player: "Ashton Jeanty", valueHALF: 40, valuePPR: 42 },
        { rank: 16, player: "Breece Hall", valueHALF: 39, valuePPR: 41 },
        { rank: 17, player: "Chuba Hubbard", valueHALF: 36, valuePPR: 38 },
        { rank: 18, player: "Jordan Mason", valueHALF: 34, valuePPR: 35 },
        { rank: 19, player: "Alvin Kamara", valueHALF: 33, valuePPR: 35 },
        { rank: 20, player: "Javonte Williams", valueHALF: 32, valuePPR: 34 },
        { rank: 21, player: "Trey Benson", valueHALF: 31, valuePPR: 33 },
        { rank: 22, player: "J.K. Dobbins", valueHALF: 30, valuePPR: 32 },
        { rank: 23, player: "Cam Skattebo", valueHALF: 30, valuePPR: 32 },
        { rank: 24, player: "Chase Brown", valueHALF: 30, valuePPR: 32 },
        { rank: 25, player: "David Montgomery", valueHALF: 28, valuePPR: 30 },
        { rank: 26, player: "Jaylen Warren", valueHALF: 27, valuePPR: 29 },
        { rank: 27, player: "Quinshon Judkins", valueHALF: 27, valuePPR: 28 },
        { rank: 28, player: "Tony Pollard", valueHALF: 26, valuePPR: 28 },
        { rank: 29, player: "D'Andre Swift", valueHALF: 26, valuePPR: 28 },
        { rank: 30, player: "TreVeyon Henderson", valueHALF: 24, valuePPR: 26 },
        { rank: 31, player: "Jacory Croskey-Merritt", valueHALF: 23, valuePPR: 24 },
        { rank: 32, player: "RJ Harvey", valueHALF: 22, valuePPR: 24 },
        { rank: 33, player: "Nick Chubb", valueHALF: 22, valuePPR: 23 },
        { rank: 34, player: "Rhamondre Stevenson", valueHALF: 21, valuePPR: 23 },
        { rank: 35, player: "Zach Charbonnet", valueHALF: 22, valuePPR: 23 },
        { rank: 36, player: "Bhayshul Tuten", valueHALF: 22, valuePPR: 23 },
        { rank: 37, player: "Aaron Jones Sr.", valueHALF: 20, valuePPR: 22 },
        { rank: 38, player: "Blake Corum", valueHALF: 17, valuePPR: 19 },
        { rank: 39, player: "Tyler Allgeier", valueHALF: 16, valuePPR: 17 },
        { rank: 40, player: "Brian Robinson Jr.", valueHALF: 16, valuePPR: 17 },
        { rank: 41, player: "Isiah Pacheco", valueHALF: 16, valuePPR: 17 },
        { rank: 42, player: "Braelon Allen", valueHALF: 14, valuePPR: 16 },
        { rank: 43, player: "Rachaad White", valueHALF: 14, valuePPR: 16 },
        { rank: 44, player: "Tyjae Spears", valueHALF: 14, valuePPR: 15 },
        { rank: 45, player: "Ray Davis", valueHALF: 14, valuePPR: 15 },
        { rank: 46, player: "Ollie Gordon II", valueHALF: 14, valuePPR: 15 },
        { rank: 47, player: "Woody Marks", valueHALF: 14, valuePPR: 15 },
        { rank: 48, player: "Dylan Sampson", valueHALF: 13, valuePPR: 14 },
        { rank: 49, player: "Kareem Hunt", valueHALF: 13, valuePPR: 14 },
        { rank: 50, player: "Chris Rodriguez Jr.", valueHALF: 12, valuePPR: 14 },
        { rank: 51, player: "Kyle Monangai", valueHALF: 12, valuePPR: 13 },
        { rank: 52, player: "Rico Dowdle", valueHALF: 12, valuePPR: 13 },
        { rank: 53, player: "DJ Giddens", valueHALF: 12, valuePPR: 13 },
        { rank: 54, player: "Tank Bigsby", valueHALF: 12, valuePPR: 13 },
        { rank: 55, player: "Tyrone Tracy Jr.", valueHALF: 12, valuePPR: 13 },
        { rank: 56, player: "Kendre Miller", valueHALF: 12, valuePPR: 13 },
        { rank: 57, player: "Kaleb Johnson", valueHALF: 11, valuePPR: 12 },
        { rank: 58, player: "Kenneth Gainwell", valueHALF: 10, valuePPR: 11 },
        { rank: 59, player: "Emari Demercado", valueHALF: 9, valuePPR: 10 },
        { rank: 60, player: "Jeremy McNichols", valueHALF: 9, valuePPR: 10 },
        { rank: 61, player: "Jerome Ford", valueHALF: 9, valuePPR: 10 },
        { rank: 62, player: "Jaydon Blue", valueHALF: 8, valuePPR: 9 },
        { rank: 63, player: "Miles Sanders", valueHALF: 8, valuePPR: 9 },
        { rank: 64, player: "Will Shipley", valueHALF: 8, valuePPR: 9 },
        { rank: 65, player: "Ty Johnson", valueHALF: 8, valuePPR: 9 },
        { rank: 66, player: "Brashard Smith", valueHALF: 8, valuePPR: 9 },
        { rank: 67, player: "Zamir White", valueHALF: 7, valuePPR: 8 },
        { rank: 68, player: "Tahj Brooks", valueHALF: 7, valuePPR: 8 },
        { rank: 69, player: "Sean Tucker", valueHALF: 7, valuePPR: 8 },
        { rank: 70, player: "Chris Brooks", valueHALF: 7, valuePPR: 8 },
        { rank: 71, player: "Jarquez Hunter", valueHALF: 6, valuePPR: 7 },
        { rank: 72, player: "Dameon Pierce", valueHALF: 5, valuePPR: 6 },
        { rank: 73, player: "Justice Hill", valueHALF: 5, valuePPR: 6 },
        { rank: 74, player: "MarShawn Lloyd", valueHALF: 5, valuePPR: 6 },
        { rank: 75, player: "Devin Singletary", valueHALF: 5, valuePPR: 6 },
        { rank: 76, player: "Zavier Scott", valueHALF: 5, valuePPR: 6 },
        { rank: 77, player: "Keaton Mitchell", valueHALF: 4, valuePPR: 5 },
        { rank: 78, player: "Isaac Guerendo", valueHALF: 4, valuePPR: 5 },
        { rank: 79, player: "A.J. Dillon", valueHALF: 4, valuePPR: 5 },
        { rank: 80, player: "Roschon Johnson", valueHALF: 3, valuePPR: 4 },
        { rank: 81, player: "LeQuint Allen Jr.", valueHALF: 3, valuePPR: 4 },
        { rank: 82, player: "Isaiah Davis", valueHALF: 2, valuePPR: 3 },
        { rank: 83, player: "Emanuel Wilson", valueHALF: 2, valuePPR: 3 },
        { rank: 84, player: "Jaylen Wright", valueHALF: 1, valuePPR: 2 },
        { rank: 85, player: "Antonio Gibson", valueHALF: 1, valuePPR: 2 },
        { rank: 86, player: "Kimani Vidal", valueHALF: 1, valuePPR: 2 },
        { rank: 87, player: "Trevor Etienne", valueHALF: 1, valuePPR: 1 },
        { rank: 88, player: "Tyler Badie", valueHALF: 1, valuePPR: 1 },
        { rank: 89, player: "Cam Akers", valueHALF: 1, valuePPR: 1 },
        { rank: 90, player: "Hassan Haskins", valueHALF: 1, valuePPR: 1 }
    ],
    wr: [
        { rank: 1, player: "Puka Nacua", valueHALF: 71, valuePPR: 74 },
        { rank: 2, player: "Malik Nabers", valueHALF: 66, valuePPR: 69 },
        { rank: 3, player: "Amon-Ra St. Brown", valueHALF: 62, valuePPR: 65 },
        { rank: 4, player: "Jaxon Smith-Njigba", valueHALF: 58, valuePPR: 61 },
        { rank: 5, player: "Justin Jefferson", valueHALF: 57, valuePPR: 60 },
        { rank: 6, player: "Ja'Marr Chase", valueHALF: 55, valuePPR: 57 },
        { rank: 7, player: "Nico Collins", valueHALF: 55, valuePPR: 57 },
        { rank: 8, player: "CeeDee Lamb", valueHALF: 55, valuePPR: 57 },
        { rank: 9, player: "Rome Odunze", valueHALF: 48, valuePPR: 50 },
        { rank: 10, player: "Garrett Wilson", valueHALF: 47, valuePPR: 49 },
        { rank: 11, player: "Drake London", valueHALF: 43, valuePPR: 46 },
        { rank: 12, player: "A.J. Brown", valueHALF: 44, valuePPR: 46 },
        { rank: 13, player: "Davante Adams", valueHALF: 43, valuePPR: 45 },
        { rank: 14, player: "Tetairoa McMillan", valueHALF: 42, valuePPR: 45 },
        { rank: 15, player: "Emeka Egbuka", valueHALF: 40, valuePPR: 42 },
        { rank: 16, player: "Zay Flowers", valueHALF: 38, valuePPR: 41 },
        { rank: 17, player: "Rashee Rice", valueHALF: 37, valuePPR: 39 },
        { rank: 18, player: "Brian Thomas Jr.", valueHALF: 35, valuePPR: 37 },
        { rank: 19, player: "Ladd McConkey", valueHALF: 33, valuePPR: 36 },
        { rank: 20, player: "Tyreek Hill", valueHALF: 30, valuePPR: 32 },
        { rank: 21, player: "Courtland Sutton", valueHALF: 29, valuePPR: 31 },
        { rank: 22, player: "George Pickens", valueHALF: 28, valuePPR: 30 },
        { rank: 23, player: "Ricky Pearsall", valueHALF: 28, valuePPR: 30 },
        { rank: 24, player: "DK Metcalf", valueHALF: 28, valuePPR: 30 },
        { rank: 25, player: "Mike Evans", valueHALF: 28, valuePPR: 30 },
        { rank: 26, player: "Marvin Harrison Jr.", valueHALF: 27, valuePPR: 29 },
        { rank: 27, player: "Keenan Allen", valueHALF: 26, valuePPR: 28 },
        { rank: 28, player: "Jakobi Meyers", valueHALF: 26, valuePPR: 28 },
        { rank: 29, player: "Deebo Samuel Sr.", valueHALF: 26, valuePPR: 28 },
        { rank: 30, player: "DeVonta Smith", valueHALF: 26, valuePPR: 28 },
        { rank: 31, player: "Terry McLaurin", valueHALF: 26, valuePPR: 27 },
        { rank: 32, player: "Quentin Johnston", valueHALF: 24, valuePPR: 26 },
        { rank: 33, player: "Jameson Williams", valueHALF: 24, valuePPR: 26 },
        { rank: 34, player: "Tee Higgins", valueHALF: 24, valuePPR: 26 },
        { rank: 35, player: "DJ Moore", valueHALF: 24, valuePPR: 26 },
        { rank: 36, player: "Michael Pittman Jr.", valueHALF: 24, valuePPR: 26 },
        { rank: 37, player: "Chris Olave", valueHALF: 24, valuePPR: 26 },
        { rank: 38, player: "Jauan Jennings", valueHALF: 23, valuePPR: 25 },
        { rank: 39, player: "Jaylen Waddle", valueHALF: 23, valuePPR: 25 },
        { rank: 40, player: "Jordan Addison", valueHALF: 22, valuePPR: 24 },
        { rank: 41, player: "Xavier Worthy", valueHALF: 21, valuePPR: 23 },
        { rank: 42, player: "Keon Coleman", valueHALF: 21, valuePPR: 23 },
        { rank: 43, player: "Matthew Golden", valueHALF: 21, valuePPR: 23 },
        { rank: 44, player: "Calvin Ridley", valueHALF: 21, valuePPR: 23 },
        { rank: 45, player: "Jerry Jeudy", valueHALF: 20, valuePPR: 22 },
        { rank: 46, player: "Cedric Tillman", valueHALF: 20, valuePPR: 22 },
        { rank: 47, player: "Elic Ayomanor", valueHALF: 19, valuePPR: 21 },
        { rank: 48, player: "Khalil Shakir", valueHALF: 18, valuePPR: 20 },
        { rank: 49, player: "Wan'Dale Robinson", valueHALF: 17, valuePPR: 19 },
        { rank: 50, player: "Chris Godwin Jr.", valueHALF: 17, valuePPR: 19 },
        { rank: 51, player: "Stefon Diggs", valueHALF: 17, valuePPR: 19 },
        { rank: 52, player: "Travis Hunter", valueHALF: 17, valuePPR: 19 },
        { rank: 53, player: "Darnell Mooney", valueHALF: 16, valuePPR: 18 },
        { rank: 54, player: "Rashid Shaheed", valueHALF: 16, valuePPR: 17 },
        { rank: 55, player: "Luther Burden III", valueHALF: 16, valuePPR: 17 },
        { rank: 56, player: "Tre Tucker", valueHALF: 16, valuePPR: 17 },
        { rank: 57, player: "Troy Franklin", valueHALF: 16, valuePPR: 17 },
        { rank: 58, player: "Romeo Doubs", valueHALF: 14, valuePPR: 16 },
        { rank: 59, player: "Josh Downs", valueHALF: 13, valuePPR: 15 },
        { rank: 60, player: "Cooper Kupp", valueHALF: 12, valuePPR: 14 },
        { rank: 61, player: "Christian Kirk", valueHALF: 12, valuePPR: 14 },
        { rank: 62, player: "Kayshon Boutte", valueHALF: 12, valuePPR: 14 },
        { rank: 63, player: "Brandon Aiyuk", valueHALF: 12, valuePPR: 14 },
        { rank: 64, player: "Tory Horton", valueHALF: 12, valuePPR: 14 },
        { rank: 65, player: "Jalen Coker", valueHALF: 12, valuePPR: 13 },
        { rank: 66, player: "Jayden Reed", valueHALF: 12, valuePPR: 13 },
        { rank: 67, player: "Marquise Brown", valueHALF: 10, valuePPR: 11 },
        { rank: 68, player: "Calvin Austin III", valueHALF: 10, valuePPR: 11 },
        { rank: 69, player: "Joshua Palmer", valueHALF: 9, valuePPR: 10 },
        { rank: 70, player: "DeAndre Hopkins", valueHALF: 9, valuePPR: 10 },
        { rank: 71, player: "Rashod Bateman", valueHALF: 9, valuePPR: 10 },
        { rank: 72, player: "KaVontae Turpin", valueHALF: 9, valuePPR: 10 },
        { rank: 73, player: "Tyquan Thornton", valueHALF: 9, valuePPR: 10 },
        { rank: 74, player: "Marvin Mims Jr.", valueHALF: 8, valuePPR: 9 },
        { rank: 75, player: "Dontayvion Wicks", valueHALF: 8, valuePPR: 9 },
        { rank: 76, player: "Isaac TeSlaa", valueHALF: 8, valuePPR: 9 },
        { rank: 77, player: "Jayden Higgins", valueHALF: 7, valuePPR: 8 },
        { rank: 78, player: "Dont'e Thornton Jr.", valueHALF: 7, valuePPR: 8 },
        { rank: 79, player: "Malik Washington", valueHALF: 7, valuePPR: 8 },
        { rank: 80, player: "Sterling Shepard", valueHALF: 7, valuePPR: 8 },
        { rank: 81, player: "Jalen Tolbert", valueHALF: 7, valuePPR: 8 },
        { rank: 82, player: "Dyami Brown", valueHALF: 5, valuePPR: 6 },
        { rank: 83, player: "Alec Pierce", valueHALF: 5, valuePPR: 6 },
        { rank: 84, player: "DeMario Douglas", valueHALF: 5, valuePPR: 6 },
        { rank: 85, player: "Tre Harris", valueHALF: 5, valuePPR: 6 },
        { rank: 86, player: "Parker Washington", valueHALF: 5, valuePPR: 6 },
        { rank: 87, player: "Luke McCaffrey", valueHALF: 4, valuePPR: 5 },
        { rank: 88, player: "Michael Wilson", valueHALF: 4, valuePPR: 5 },
        { rank: 89, player: "Olamide Zaccheaus", valueHALF: 4, valuePPR: 5 },
        { rank: 90, player: "Isaiah Bond", valueHALF: 4, valuePPR: 5 }
    ],
    te: [
        { rank: 1, player: "Trey McBride", valueHALF: 49, valuePPR: 52 },
        { rank: 2, player: "Brock Bowers", valueHALF: 45, valuePPR: 48 },
        { rank: 3, player: "Tucker Kraft", valueHALF: 33, valuePPR: 36 },
        { rank: 4, player: "Tyler Warren", valueHALF: 32, valuePPR: 35 },
        { rank: 5, player: "George Kittle", valueHALF: 32, valuePPR: 34 },
        { rank: 6, player: "Sam LaPorta", valueHALF: 24, valuePPR: 27 },
        { rank: 7, player: "Jake Ferguson", valueHALF: 23, valuePPR: 26 },
        { rank: 8, player: "Juwan Johnson", valueHALF: 21, valuePPR: 24 },
        { rank: 9, player: "Dalton Kincaid", valueHALF: 20, valuePPR: 22 },
        { rank: 10, player: "Travis Kelce", valueHALF: 18, valuePPR: 20 },
        { rank: 11, player: "T.J. Hockenson", valueHALF: 18, valuePPR: 20 },
        { rank: 12, player: "Mark Andrews", valueHALF: 18, valuePPR: 20 },
        { rank: 13, player: "Zach Ertz", valueHALF: 17, valuePPR: 19 },
        { rank: 14, player: "Hunter Henry", valueHALF: 16, valuePPR: 18 },
        { rank: 15, player: "Harold Fannin Jr.", valueHALF: 15, valuePPR: 17 },
        { rank: 16, player: "Kyle Pitts Sr.", valueHALF: 14, valuePPR: 16 },
        { rank: 17, player: "David Njoku", valueHALF: 13, valuePPR: 15 },
        { rank: 18, player: "Dallas Goedert", valueHALF: 12, valuePPR: 14 },
        { rank: 19, player: "Brenton Strange", valueHALF: 11, valuePPR: 13 },
        { rank: 20, player: "Chig Okonkwo", valueHALF: 10, valuePPR: 12 },
        { rank: 21, player: "Isaiah Likely", valueHALF: 9, valuePPR: 11 },
        { rank: 22, player: "Jonnu Smith", valueHALF: 8, valuePPR: 9 },
        { rank: 23, player: "Colston Loveland", valueHALF: 7, valuePPR: 8 },
        { rank: 24, player: "Mason Taylor", valueHALF: 7, valuePPR: 8 },
        { rank: 25, player: "Dalton Schultz", valueHALF: 6, valuePPR: 7 },
        { rank: 26, player: "Cade Otton", valueHALF: 6, valuePPR: 7 },
        { rank: 27, player: "Pat Freiermuth", valueHALF: 4, valuePPR: 5 },
        { rank: 28, player: "Evan Engram", valueHALF: 4, valuePPR: 5 },
        { rank: 29, player: "Ja'Tavion Sanders", valueHALF: 3, valuePPR: 4 },
        { rank: 30, player: "Theo Johnson", valueHALF: 3, valuePPR: 4 },
        { rank: 31, player: "Mike Gesicki", valueHALF: 3, valuePPR: 4 },
        { rank: 32, player: "Oronde Gadsden II", valueHALF: 2, valuePPR: 3 },
        { rank: 33, player: "Cole Kmet", valueHALF: 1, valuePPR: 2 },
        { rank: 34, player: "Darren Waller", valueHALF: 1, valuePPR: 1 },
        { rank: 35, player: "Noah Fant", valueHALF: 1, valuePPR: 1 },
        { rank: 36, player: "Jake Tonges", valueHALF: 1, valuePPR: 1 },
        { rank: 37, player: "Elijah Arroyo", valueHALF: 1, valuePPR: 1 },
        { rank: 38, player: "AJ Barner", valueHALF: 1, valuePPR: 1 },
        { rank: 39, player: "Tyler Higbee", valueHALF: 1, valuePPR: 1 },
        { rank: 40, player: "Tommy Tremble", valueHALF: 1, valuePPR: 0 }
    ]
};

// Position titles mapping
const positionTitles = {
    qb: 'Quarterback Trade Values',
    rb: 'Running Back Trade Values',
    wr: 'Wide Receiver Trade Values',
    te: 'Tight End Trade Values'
};

// Current position being displayed
let currentPosition = 'qb';

// Function to populate the table with trade values
function populateTable(position) {
    const tbody = document.getElementById('rankings-body');
    const title = document.getElementById('position-title');
    const thead = document.querySelector('.rankings-table thead tr');
    const data = tradeValuesData[position];

    // Clear existing content
    tbody.innerHTML = '';

    // Update title
    title.textContent = positionTitles[position];

    // Update table headers based on position
    if (position === 'qb') {
        thead.innerHTML = `
            <th>Rank</th>
            <th>Player</th>
            <th>1QB</th>
            <th>2QB</th>
        `;
    } else if (position === 'rb' || position === 'wr' || position === 'te') {
        thead.innerHTML = `
            <th>Rank</th>
            <th>Player</th>
            <th>Half PPR</th>
            <th>PPR</th>
        `;
    }

    // Populate table rows
    data.forEach(player => {
        const row = document.createElement('tr');
        if (position === 'qb') {
            row.innerHTML = `
                <td>${player.rank}</td>
                <td>${player.player}</td>
                <td>${player.value1QB}</td>
                <td>${player.value2QB}</td>
            `;
        } else {
            row.innerHTML = `
                <td>${player.rank}</td>
                <td>${player.player}</td>
                <td>${player.valueHALF}</td>
                <td>${player.valuePPR}</td>
            `;
        }
        tbody.appendChild(row);
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Hide loading and show table
    document.getElementById('loading').style.display = 'none';
    document.getElementById('rankings-table').style.display = 'block';

    // Load initial position (QB)
    populateTable('qb');

    // Set up navigation buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Load new position data
            const position = this.getAttribute('data-position');
            currentPosition = position;
            populateTable(position);
        });
    });
});