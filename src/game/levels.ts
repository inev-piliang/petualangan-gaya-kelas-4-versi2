export type SceneId =
  | "rock"
  | "bridge"
  | "gate"
  | "spring"
  | "tree"
  | "ball"
  | "clay"
  | "door"
  | "cave";

export interface Theme {
  sky: [string, string];
  hillFar: string;
  hillNear: string;
  ground: string;
  groundDark: string;
  night?: boolean;
}

export interface Lesson {
  title: string;
  icon: string;
  body: string;
  examples: string[];
  tip: string;
}

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  level: number; // 1..8, 9 = final
}

export interface LevelDef {
  id: number;
  name: string;
  scene: SceneId;
  emoji: string;
  scenario: string;
  question: string;
  options: string[];
  correct: number;
  successText: string;
  lesson: Lesson;
  badge: BadgeDef;
  theme: Theme;
}

export const MENU_THEME: Theme = {
  sky: ["#8fd9ff", "#e6ffe9"],
  hillFar: "#3ba063",
  hillNear: "#22814a",
  ground: "#46a862",
  groundDark: "#35854c",
};

export const CAVE_THEME: Theme = {
  sky: ["#140a2b", "#3a2160"],
  hillFar: "#241546",
  hillNear: "#1a0f33",
  ground: "#3b2a5e",
  groundDark: "#2c1f49",
  night: true,
};

const b = (
  id: string,
  name: string,
  icon: string,
  desc: string,
  level: number
): BadgeDef => ({ id, name, icon, desc, level });

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "Hutan Awal",
    scene: "rock",
    emoji: "🪨",
    scenario: "Kamu menyusuri hutan. Tiba-tiba, sebuah batu besar menghalangi jalan!",
    question: "Batu besar menghalangi jalan. Agar batu dapat dipindahkan, gaya apa yang paling sesuai?",
    options: ["Gaya magnet", "Gaya otot", "Gaya gravitasi", "Gaya gesek"],
    correct: 1,
    successText: "Benar! Kamu mendorong batu dengan gaya otot. Jalan terbuka!",
    lesson: {
      title: "GAYA OTOT",
      icon: "💪",
      body: "Gaya otot adalah gaya yang berasal dari tenaga otot manusia atau hewan. Gaya otot bekerja saat kita mendorong atau menarik benda dengan anggota tubuh.",
      examples: [
        "mendorong meja",
        "menarik kursi",
        "mengangkat benda",
        "menendang bola",
      ],
      tip: "Jika menggunakan tenaga otot untuk mendorong atau menarik benda, kita menggunakan gaya otot.",
    },
    badge: b("rock", "Penakluk Batu", "🪨", "Menguasai gaya otot.", 1),
    theme: {
      sky: ["#8fd9ff", "#e6ffe9"],
      hillFar: "#3ba063",
      hillNear: "#22814a",
      ground: "#46a862",
      groundDark: "#35854c",
    },
  },
  {
    id: 2,
    name: "Jembatan Licin",
    scene: "bridge",
    emoji: "🌉",
    scenario: "Jembatan di depanmu sangat licin! Hati-hati, jangan sampai tergelincir.",
    question: "Agar tidak mudah tergelincir ketika berjalan, kita membutuhkan gaya apa?",
    options: ["Gaya gesek", "Gaya magnet", "Gaya gravitasi", "Gaya pegas"],
    correct: 0,
    successText: "Benar! Gaya gesek pada alas sepatumu membuatmu tidak tergelincir.",
    lesson: {
      title: "GAYA GESEK",
      icon: "👟",
      body: "Gaya gesek muncul saat dua permukaan bersentuhan. Gaya gesek bisa menghambat gerakan, tetapi juga membantu kita agar tidak mudah tergelincir.",
      examples: [
        "alas sepatu bergerigi",
        "rem pada sepeda",
        "karet penahan di bawah meja",
        "karet ban mobil",
      ],
      tip: "Gaya gesek yang pas membuat kakimu 'menempel' di lantai yang licin.",
    },
    badge: b("bridge", "Ahli Gesekan", "👟", "Memahami gaya gesek.", 2),
    theme: {
      sky: ["#a5d8ff", "#eaf7ff"],
      hillFar: "#4a7fae",
      hillNear: "#35618c",
      ground: "#5f9e86",
      groundDark: "#4b806c",
    },
  },
  {
    id: 3,
    name: "Gerbang Besi",
    scene: "gate",
    emoji: "🧲",
    scenario: "Gerbang besi besar tertutup! Di sampingnya terdapat sebuah magnet kuat.",
    question: "Gaya apa yang dapat dimanfaatkan untuk menarik benda berbahan besi?",
    options: ["Gaya otot", "Gaya pegas", "Gaya magnet", "Gaya gravitasi"],
    correct: 2,
    successText: "Magnet menarik gerbang besi — GERBANG TERBUKA!",
    lesson: {
      title: "GAYA MAGNET",
      icon: "🧲",
      body: "Gaya magnet adalah gaya tarik atau tolak yang dihasilkan oleh magnet. Aneh ya, magnet bisa menarik benda besi bahkan tanpa menyentuhnya!",
      examples: [
        "kaleng menempel di kulkas",
        "jarum kompas menunjuk utara",
        "peniti dan gesper magnet",
        "kereta maglev",
      ],
      tip: "Magnet menarik benda berbahan besi dan baja.",
    },
    badge: b("gate", "Magnet Master", "🧲", "Memahami gaya magnet.", 3),
    theme: {
      sky: ["#9d8fe0", "#f0e6ff"],
      hillFar: "#5b4a9e",
      hillNear: "#433578",
      ground: "#6d5b9e",
      groundDark: "#584a85",
    },
  },
  {
    id: 4,
    name: "Lompat Jurang",
    scene: "spring",
    emoji: "🪢",
    scenario: "Ada jurang di depanmu! Beruntung, terdapat pelontar pegas yang siap dipakai.",
    question:
      "Benda seperti karet dan pegas dapat berubah bentuk ketika diberi gaya, lalu kembali ke bentuk semula. Gaya yang dimanfaatkan disebut…",
    options: ["Gaya magnet", "Gaya pegas", "Gaya gesek", "Gaya gravitasi"],
    correct: 1,
    successText: "Pegas melontarmu meluncur mulus melewati jurang!",
    lesson: {
      title: "GAYA PEGAS",
      icon: "🪢",
      body: "Gaya pegas muncul saat pegas atau karet diregangkan atau ditekan. Benda itu berubah bentuk, lalu kembali ke bentuk semula dan menghasilkan gaya.",
      examples: [
        "busur panah yang ditarik",
        "trampolin",
        "karet yang dilepas",
        "busi kursi",
      ],
      tip: "Makin kuat pegas diregangkan, makin besar gaya pegas yang dihasilkan.",
    },
    badge: b("spring", "Jagoan Pegas", "🪢", "Memahami gaya pegas.", 4),
    theme: {
      sky: ["#ffb35c", "#ffe9c4"],
      hillFar: "#c96f2f",
      hillNear: "#a3541f",
      ground: "#8a5a2e",
      groundDark: "#71481f",
    },
  },
  {
    id: 5,
    name: "Kebun Buah",
    scene: "tree",
    emoji: "🍎",
    scenario: "Kamu masuk ke kebun buah. Sebuah buah jatuh dari pohon… petunjuk ada di sana!",
    question: "Buah dapat jatuh dari pohon menuju tanah karena adanya…",
    options: ["Gaya otot", "Gaya magnet", "Gaya gesek", "Gaya gravitasi"],
    correct: 3,
    successText: "Buah jatuh berkat gaya gravitasi — kamu menemukan petunjuk!",
    lesson: {
      title: "GAYA GRAVITASI",
      icon: "🌎",
      body: "Gaya gravitasi adalah gaya tarik bumi. Bumi menarik semua benda ke arah bawah, menuju pusat bumi. Itulah sebabnya buah selalu jatuh ke tanah.",
      examples: [
        "buah jatuh dari pohon",
        "hujan turun ke bumi",
        "kamu mendarat saat melompat",
        "bola yang dilempar naik kembali turun",
      ],
      tip: "Gravitasilah yang membuat semua yang terlempar ke atas kembali turun.",
    },
    badge: b("tree", "Sahabat Gravitasi", "🌎", "Memahami gaya gravitasi.", 5),
    theme: {
      sky: ["#9fe0ff", "#fff3c4"],
      hillFar: "#3f9e6e",
      hillNear: "#2f7a52",
      ground: "#4caf6d",
      groundDark: "#3b8c56",
    },
  },
  {
    id: 6,
    name: "Bola Menghalangi",
    scene: "ball",
    emoji: "⚽",
    scenario: "Sebuah bola besar menghalangi jalan! Sepatumu siap menendangnya.",
    question: "Ketika bola ditendang sehingga bergerak, gaya menyebabkan…",
    options: [
      "Benda tidak mengalami perubahan",
      "Benda dapat bergerak",
      "Benda menjadi magnet",
      "Benda menjadi lebih berat",
    ],
    correct: 1,
    successText: "BRAK! Bola melambung ke samping — jalan terbuka!",
    lesson: {
      title: "GAYA MENGUBAH GERAK",
      icon: "⚽",
      body: "Gaya dapat membuat benda diam menjadi bergerak, mengubah arah gerak, dan mengubah cepat geraknya. Saat ditendang, kaki memberikannya gaya!",
      examples: [
        "menendang bola",
        "mendorong gerobak",
        "memukul bola tenis",
        "pedal sepeda menggerakkan roda",
      ],
      tip: "Gaya dapat mengubah arah dan kecepatan gerak benda.",
    },
    badge: b("ball", "Jebol Bola", "⚽", "Memahami gaya pada gerak benda.", 6),
    theme: {
      sky: ["#67e8f9", "#ecfeff"],
      hillFar: "#0f766e",
      hillNear: "#115e59",
      ground: "#2fbf9b",
      groundDark: "#239b7d",
    },
  },
  {
    id: 7,
    name: "Dinding Tanah",
    scene: "clay",
    emoji: "🧱",
    scenario: "Ada dinding plastisin raksasa! Tekan dan bentuk menjadi kunci untuk membuka jalan.",
    question:
      "Ketika plastisin ditekan dengan tangan, bentuk plastisin berubah. Hal ini menunjukkan bahwa gaya dapat…",
    options: [
      "Mengubah bentuk benda",
      "Mengubah benda menjadi magnet",
      "Menghilangkan gravitasi",
      "Menghilangkan gaya gesek",
    ],
    correct: 0,
    successText: "Kunci terbentuk — jalan terbuka!",
    lesson: {
      title: "GAYA MENGUBAH BENTUK",
      icon: "🧱",
      body: "Gaya juga dapat mengubah bentuk benda, terutama benda yang lunak seperti plastisin, tanah liat, atau karet.",
      examples: [
        "menekan plastisin",
        "menarik pita karet",
        "memahat tanah liat",
        "mencetak adonan",
      ],
      tip: "Gaya dapat mengubah gerak benda DAN bentuk benda.",
    },
    badge: b("clay", "Seniman Bentuk", "🧱", "Memahami gaya pada bentuk benda.", 7),
    theme: {
      sky: ["#ffd9a8", "#fff1dd"],
      hillFar: "#c0653a",
      hillNear: "#9c4f2b",
      ground: "#a85f38",
      groundDark: "#8a4c2c",
    },
  },
  {
    id: 8,
    name: "Pintu Terakhir",
    scene: "door",
    emoji: "🗝️",
    scenario: "Pintu besar menuju harta karun! Namun pintu itu butuh dorongan yang kuat.",
    question: "Saat kita mendorong pintu hingga terbuka, kita memberikan…",
    options: ["Gaya otot", "Gaya magnet", "Gaya gravitasi", "Gaya pegas"],
    correct: 0,
    successText: "DORONG! Pintu terbuka — harta karun sudah dekat!",
    lesson: {
      title: "GAYA OTOT",
      icon: "💪",
      body: "Gaya otot adalah gaya yang berasal dari tenaga otot manusia atau hewan. Mendorong pintu dengan tanganmu adalah contoh gaya otot bekerja!",
      examples: [
        "mendorong pintu",
        "menarik tali",
        "mengangkat tas",
        "memanjat tebing",
      ],
      tip: "Tenaga ototmu adalah alat paling andal di petualangan ini!",
    },
    badge: b("door", "Pembuka Pintu", "🗝️", "Selesai membuka pintu terakhir.", 8),
    theme: {
      sky: ["#5b4a9e", "#ffb35c"],
      hillFar: "#43356e",
      hillNear: "#2f2550",
      ground: "#6d5b9e",
      groundDark: "#584a85",
      night: true,
    },
  },
];

export const TREASURE_BADGE: BadgeDef = b(
  "treasure",
  "Pemburu Harta Karun",
  "🏆",
  "Menyelesaikan seluruh petualangan gaya!",
  9
);

export const ALL_BADGES: BadgeDef[] = [
  ...LEVELS.map((l) => l.badge),
  TREASURE_BADGE,
];

export interface Topic {
  icon: string;
  title: string;
  body: string;
  examples: string[];
}

export const TOPICS: Topic[] = [
  {
    icon: "💪",
    title: "Gaya Otot",
    body: "Gaya yang berasal dari tenaga otot manusia atau hewan. Beraksi saat kita mendorong atau menarik benda.",
    examples: ["mendorong meja", "menarik kursi", "mengangkat benda", "menendang bola"],
  },
  {
    icon: "👟",
    title: "Gaya Gesek",
    body: "Gaya yang muncul saat dua permukaan bersentuhan. Bisa menghambat, tetapi juga membuat kita tidak tergelincir.",
    examples: ["alas sepatu", "rem sepeda", "karet di bawah meja"],
  },
  {
    icon: "🧲",
    title: "Gaya Magnet",
    body: "Gaya tarik atau tolak dari magnet. Dapat menarik benda besi bahkan tanpa menyentuhnya.",
    examples: ["kaleng di kulkas", "jarum kompas", "gesper magnet"],
  },
  {
    icon: "🪢",
    title: "Gaya Pegas",
    body: "Gaya yang muncul saat pegas atau karet diregangkan/ditekan, lalu kembali ke bentuk semula.",
    examples: ["busur panah", "trampolin", "karet gelang"],
  },
  {
    icon: "🌎",
    title: "Gaya Gravitasi",
    body: "Gaya tarik bumi yang menarik semua benda ke bawah, menuju pusat bumi.",
    examples: ["buah jatuh", "hujan turun", "kamu mendarat saat melompat"],
  },
  {
    icon: "⚡",
    title: "Pengaruh Gaya",
    body: "Gaya dapat mengubah gerak benda (diam → bergerak, arah, kecepatan) dan dapat mengubah bentuk benda.",
    examples: ["menendang bola", "mendorong gerobak", "menekan plastisin"],
  },
];

export const GOALS: string[] = [
  "Mengenali berbagai gaya yang ditemui dalam kehidupan sehari-hari.",
  "Mengidentifikasi pengaruh gaya terhadap benda.",
  "Menentukan gaya yang sesuai untuk menghadapi suatu situasi.",
  "Menghubungkan konsep gaya dengan pengalaman sehari-hari.",
  "Belajar dari kesalahan melalui materi remedial singkat.",
];
