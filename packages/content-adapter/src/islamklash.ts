import type { ContentItem, ContentCollection, ContentEntity, ContentSource } from "./types";

// ─── Static data ─────────────────────────────────────────────────────────────

type SurahMeta = {
  id: string;
  arabicName: string;
  frName: string;
  enName: string;
  transliteration: string;
  verses: number;
  origin: "Mecquoise" | "Médinoise";
  juz: number;
};

const SURAHS: SurahMeta[] = [
  { id: "1", arabicName: "الفاتحة", transliteration: "Al-Fatiha", frName: "L'Ouverture", enName: "The Opening", verses: 7, origin: "Mecquoise", juz: 1 },
  { id: "2", arabicName: "البقرة", transliteration: "Al-Baqara", frName: "La Vache", enName: "The Cow", verses: 286, origin: "Médinoise", juz: 1 },
  { id: "3", arabicName: "آل عمران", transliteration: "Al-'Imran", frName: "La Famille d'Imran", enName: "Family of Imran", verses: 200, origin: "Médinoise", juz: 3 },
  { id: "4", arabicName: "النساء", transliteration: "An-Nisa", frName: "Les Femmes", enName: "The Women", verses: 176, origin: "Médinoise", juz: 4 },
  { id: "5", arabicName: "المائدة", transliteration: "Al-Ma'ida", frName: "La Table Servie", enName: "The Table Spread", verses: 120, origin: "Médinoise", juz: 6 },
  { id: "6", arabicName: "الأنعام", transliteration: "Al-An'am", frName: "Les Bestiaux", enName: "The Cattle", verses: 165, origin: "Mecquoise", juz: 7 },
  { id: "7", arabicName: "الأعراف", transliteration: "Al-A'raf", frName: "Les Limbes", enName: "The Heights", verses: 206, origin: "Mecquoise", juz: 8 },
  { id: "8", arabicName: "الأنفال", transliteration: "Al-Anfal", frName: "Le Butin", enName: "The Spoils of War", verses: 75, origin: "Médinoise", juz: 9 },
  { id: "9", arabicName: "التوبة", transliteration: "At-Tawba", frName: "Le Repentir", enName: "The Repentance", verses: 129, origin: "Médinoise", juz: 10 },
  { id: "10", arabicName: "يونس", transliteration: "Yunus", frName: "Jonas", enName: "Jonah", verses: 109, origin: "Mecquoise", juz: 11 },
  { id: "11", arabicName: "هود", transliteration: "Hud", frName: "Hud", enName: "Hud", verses: 123, origin: "Mecquoise", juz: 11 },
  { id: "12", arabicName: "يوسف", transliteration: "Yusuf", frName: "Joseph", enName: "Joseph", verses: 111, origin: "Mecquoise", juz: 12 },
  { id: "13", arabicName: "الرعد", transliteration: "Ar-Ra'd", frName: "Le Tonnerre", enName: "The Thunder", verses: 43, origin: "Médinoise", juz: 13 },
  { id: "14", arabicName: "إبراهيم", transliteration: "Ibrahim", frName: "Abraham", enName: "Abraham", verses: 52, origin: "Mecquoise", juz: 13 },
  { id: "15", arabicName: "الحجر", transliteration: "Al-Hijr", frName: "Al-Hijr", enName: "The Rocky Tract", verses: 99, origin: "Mecquoise", juz: 14 },
  { id: "16", arabicName: "النحل", transliteration: "An-Nahl", frName: "Les Abeilles", enName: "The Bee", verses: 128, origin: "Mecquoise", juz: 14 },
  { id: "17", arabicName: "الإسراء", transliteration: "Al-Isra", frName: "Le Voyage Nocturne", enName: "The Night Journey", verses: 111, origin: "Mecquoise", juz: 15 },
  { id: "18", arabicName: "الكهف", transliteration: "Al-Kahf", frName: "La Caverne", enName: "The Cave", verses: 110, origin: "Mecquoise", juz: 15 },
  { id: "19", arabicName: "مريم", transliteration: "Maryam", frName: "Marie", enName: "Mary", verses: 98, origin: "Mecquoise", juz: 16 },
  { id: "20", arabicName: "طه", transliteration: "Ta-Ha", frName: "Ta-Ha", enName: "Ta-Ha", verses: 135, origin: "Mecquoise", juz: 16 },
  { id: "21", arabicName: "الأنبياء", transliteration: "Al-Anbiya", frName: "Les Prophètes", enName: "The Prophets", verses: 112, origin: "Mecquoise", juz: 17 },
  { id: "22", arabicName: "الحج", transliteration: "Al-Hajj", frName: "Le Pèlerinage", enName: "The Pilgrimage", verses: 78, origin: "Médinoise", juz: 17 },
  { id: "23", arabicName: "المؤمنون", transliteration: "Al-Mu'minun", frName: "Les Croyants", enName: "The Believers", verses: 118, origin: "Mecquoise", juz: 18 },
  { id: "24", arabicName: "النور", transliteration: "An-Nur", frName: "La Lumière", enName: "The Light", verses: 64, origin: "Médinoise", juz: 18 },
  { id: "25", arabicName: "الفرقان", transliteration: "Al-Furqan", frName: "Le Discernement", enName: "The Criterion", verses: 77, origin: "Mecquoise", juz: 18 },
  { id: "26", arabicName: "الشعراء", transliteration: "Ash-Shu'ara", frName: "Les Poètes", enName: "The Poets", verses: 227, origin: "Mecquoise", juz: 19 },
  { id: "27", arabicName: "النمل", transliteration: "An-Naml", frName: "Les Fourmis", enName: "The Ant", verses: 93, origin: "Mecquoise", juz: 19 },
  { id: "28", arabicName: "القصص", transliteration: "Al-Qasas", frName: "Le Récit", enName: "The Story", verses: 88, origin: "Mecquoise", juz: 20 },
  { id: "29", arabicName: "العنكبوت", transliteration: "Al-'Ankabut", frName: "L'Araignée", enName: "The Spider", verses: 69, origin: "Mecquoise", juz: 20 },
  { id: "30", arabicName: "الروم", transliteration: "Ar-Rum", frName: "Les Romains", enName: "The Romans", verses: 60, origin: "Mecquoise", juz: 21 },
  { id: "31", arabicName: "لقمان", transliteration: "Luqman", frName: "Luqman", enName: "Luqman", verses: 34, origin: "Mecquoise", juz: 21 },
  { id: "32", arabicName: "السجدة", transliteration: "As-Sajda", frName: "La Prosternation", enName: "The Prostration", verses: 30, origin: "Mecquoise", juz: 21 },
  { id: "33", arabicName: "الأحزاب", transliteration: "Al-Ahzab", frName: "Les Coalisés", enName: "The Combined Forces", verses: 73, origin: "Médinoise", juz: 21 },
  { id: "34", arabicName: "سبأ", transliteration: "Saba", frName: "Saba", enName: "Sheba", verses: 54, origin: "Mecquoise", juz: 22 },
  { id: "35", arabicName: "فاطر", transliteration: "Fatir", frName: "Le Créateur", enName: "Originator", verses: 45, origin: "Mecquoise", juz: 22 },
  { id: "36", arabicName: "يس", transliteration: "Ya-Sin", frName: "Ya-Sin", enName: "Ya Sin", verses: 83, origin: "Mecquoise", juz: 22 },
  { id: "37", arabicName: "الصافات", transliteration: "As-Saffat", frName: "Les Rangs", enName: "Those Who Set the Ranks", verses: 182, origin: "Mecquoise", juz: 23 },
  { id: "38", arabicName: "ص", transliteration: "Sad", frName: "Sad", enName: "Sad", verses: 88, origin: "Mecquoise", juz: 23 },
  { id: "39", arabicName: "الزمر", transliteration: "Az-Zumar", frName: "Les Groupes", enName: "The Troops", verses: 75, origin: "Mecquoise", juz: 23 },
  { id: "40", arabicName: "غافر", transliteration: "Ghafir", frName: "Le Pardonneur", enName: "The Forgiver", verses: 85, origin: "Mecquoise", juz: 24 },
  { id: "41", arabicName: "فصلت", transliteration: "Fussilat", frName: "Exposées en Détail", enName: "Explained in Detail", verses: 54, origin: "Mecquoise", juz: 24 },
  { id: "42", arabicName: "الشورى", transliteration: "Ash-Shura", frName: "La Consultation", enName: "The Consultation", verses: 53, origin: "Mecquoise", juz: 25 },
  { id: "43", arabicName: "الزخرف", transliteration: "Az-Zukhruf", frName: "Les Ornements", enName: "The Gold Adornments", verses: 89, origin: "Mecquoise", juz: 25 },
  { id: "44", arabicName: "الدخان", transliteration: "Ad-Dukhan", frName: "La Fumée", enName: "The Smoke", verses: 59, origin: "Mecquoise", juz: 25 },
  { id: "45", arabicName: "الجاثية", transliteration: "Al-Jathiya", frName: "L'Agenouillée", enName: "The Crouching", verses: 37, origin: "Mecquoise", juz: 25 },
  { id: "46", arabicName: "الأحقاف", transliteration: "Al-Ahqaf", frName: "Les Dunes", enName: "The Wind-Curved Sandhills", verses: 35, origin: "Mecquoise", juz: 26 },
  { id: "47", arabicName: "محمد", transliteration: "Muhammad", frName: "Muhammad", enName: "Muhammad", verses: 38, origin: "Médinoise", juz: 26 },
  { id: "48", arabicName: "الفتح", transliteration: "Al-Fath", frName: "La Victoire", enName: "The Victory", verses: 29, origin: "Médinoise", juz: 26 },
  { id: "49", arabicName: "الحجرات", transliteration: "Al-Hujurat", frName: "Les Appartements", enName: "The Rooms", verses: 18, origin: "Médinoise", juz: 26 },
  { id: "50", arabicName: "ق", transliteration: "Qaf", frName: "Qaf", enName: "Qaf", verses: 45, origin: "Mecquoise", juz: 26 },
  { id: "51", arabicName: "الذاريات", transliteration: "Adh-Dhariyat", frName: "Les Vents Dispersants", enName: "The Winnowing Winds", verses: 60, origin: "Mecquoise", juz: 26 },
  { id: "52", arabicName: "الطور", transliteration: "At-Tur", frName: "La Montagne", enName: "The Mount", verses: 49, origin: "Mecquoise", juz: 27 },
  { id: "53", arabicName: "النجم", transliteration: "An-Najm", frName: "L'Étoile", enName: "The Star", verses: 62, origin: "Mecquoise", juz: 27 },
  { id: "54", arabicName: "القمر", transliteration: "Al-Qamar", frName: "La Lune", enName: "The Moon", verses: 55, origin: "Mecquoise", juz: 27 },
  { id: "55", arabicName: "الرحمن", transliteration: "Ar-Rahman", frName: "Le Tout-Miséricordieux", enName: "The Beneficent", verses: 78, origin: "Médinoise", juz: 27 },
  { id: "56", arabicName: "الواقعة", transliteration: "Al-Waqi'a", frName: "L'Événement", enName: "The Inevitable", verses: 96, origin: "Mecquoise", juz: 27 },
  { id: "57", arabicName: "الحديد", transliteration: "Al-Hadid", frName: "Le Fer", enName: "The Iron", verses: 29, origin: "Médinoise", juz: 27 },
  { id: "58", arabicName: "المجادلة", transliteration: "Al-Mujadila", frName: "La Discussion", enName: "The Pleading Woman", verses: 22, origin: "Médinoise", juz: 28 },
  { id: "59", arabicName: "الحشر", transliteration: "Al-Hashr", frName: "L'Exode", enName: "The Exile", verses: 24, origin: "Médinoise", juz: 28 },
  { id: "60", arabicName: "الممتحنة", transliteration: "Al-Mumtahana", frName: "L'Éprouvée", enName: "She That is to be Examined", verses: 13, origin: "Médinoise", juz: 28 },
  { id: "61", arabicName: "الصف", transliteration: "As-Saff", frName: "Le Rang", enName: "The Ranks", verses: 14, origin: "Médinoise", juz: 28 },
  { id: "62", arabicName: "الجمعة", transliteration: "Al-Jumu'a", frName: "Le Vendredi", enName: "The Congregation", verses: 11, origin: "Médinoise", juz: 28 },
  { id: "63", arabicName: "المنافقون", transliteration: "Al-Munafiqun", frName: "Les Hypocrites", enName: "The Hypocrites", verses: 11, origin: "Médinoise", juz: 28 },
  { id: "64", arabicName: "التغابن", transliteration: "At-Taghabun", frName: "La Spoliation", enName: "The Mutual Disillusion", verses: 18, origin: "Médinoise", juz: 28 },
  { id: "65", arabicName: "الطلاق", transliteration: "At-Talaq", frName: "Le Divorce", enName: "The Divorce", verses: 12, origin: "Médinoise", juz: 28 },
  { id: "66", arabicName: "التحريم", transliteration: "At-Tahrim", frName: "L'Interdiction", enName: "The Prohibition", verses: 12, origin: "Médinoise", juz: 28 },
  { id: "67", arabicName: "الملك", transliteration: "Al-Mulk", frName: "La Royauté", enName: "The Sovereignty", verses: 30, origin: "Mecquoise", juz: 29 },
  { id: "68", arabicName: "القلم", transliteration: "Al-Qalam", frName: "Le Calame", enName: "The Pen", verses: 52, origin: "Mecquoise", juz: 29 },
  { id: "69", arabicName: "الحاقة", transliteration: "Al-Haqqa", frName: "La Réalité", enName: "The Reality", verses: 52, origin: "Mecquoise", juz: 29 },
  { id: "70", arabicName: "المعارج", transliteration: "Al-Ma'arij", frName: "Les Degrés", enName: "The Ascending Stairways", verses: 44, origin: "Mecquoise", juz: 29 },
  { id: "71", arabicName: "نوح", transliteration: "Nuh", frName: "Noé", enName: "Noah", verses: 28, origin: "Mecquoise", juz: 29 },
  { id: "72", arabicName: "الجن", transliteration: "Al-Jinn", frName: "Les Djinns", enName: "The Jinn", verses: 28, origin: "Mecquoise", juz: 29 },
  { id: "73", arabicName: "المزمل", transliteration: "Al-Muzzammil", frName: "L'Enveloppé", enName: "The Enshrouded One", verses: 20, origin: "Mecquoise", juz: 29 },
  { id: "74", arabicName: "المدثر", transliteration: "Al-Muddaththir", frName: "Le Revêtu", enName: "The Cloaked One", verses: 56, origin: "Mecquoise", juz: 29 },
  { id: "75", arabicName: "القيامة", transliteration: "Al-Qiyama", frName: "La Résurrection", enName: "The Resurrection", verses: 40, origin: "Mecquoise", juz: 29 },
  { id: "76", arabicName: "الإنسان", transliteration: "Al-Insan", frName: "L'Homme", enName: "The Man", verses: 31, origin: "Médinoise", juz: 29 },
  { id: "77", arabicName: "المرسلات", transliteration: "Al-Mursalat", frName: "Les Envoyés", enName: "The Emissaries", verses: 50, origin: "Mecquoise", juz: 29 },
  { id: "78", arabicName: "النبأ", transliteration: "An-Naba", frName: "La Nouvelle", enName: "The Tidings", verses: 40, origin: "Mecquoise", juz: 30 },
  { id: "79", arabicName: "النازعات", transliteration: "An-Nazi'at", frName: "Les Arracheurs", enName: "Those who drag forth", verses: 46, origin: "Mecquoise", juz: 30 },
  { id: "80", arabicName: "عبس", transliteration: "'Abasa", frName: "Il Fronça les Sourcils", enName: "He Frowned", verses: 42, origin: "Mecquoise", juz: 30 },
  { id: "81", arabicName: "التكوير", transliteration: "At-Takwir", frName: "L'Obscurcissement", enName: "The Overthrowing", verses: 29, origin: "Mecquoise", juz: 30 },
  { id: "82", arabicName: "الانفطار", transliteration: "Al-Infitar", frName: "Le Déchirement", enName: "The Cleaving", verses: 19, origin: "Mecquoise", juz: 30 },
  { id: "83", arabicName: "المطففين", transliteration: "Al-Mutaffifin", frName: "Les Fraudeurs", enName: "The Defrauding", verses: 36, origin: "Mecquoise", juz: 30 },
  { id: "84", arabicName: "الانشقاق", transliteration: "Al-Inshiqaq", frName: "La Déchirure", enName: "The Sundering", verses: 25, origin: "Mecquoise", juz: 30 },
  { id: "85", arabicName: "البروج", transliteration: "Al-Buruj", frName: "Les Constellations", enName: "The Mansions of the Stars", verses: 22, origin: "Mecquoise", juz: 30 },
  { id: "86", arabicName: "الطارق", transliteration: "At-Tariq", frName: "L'Astre Nocturne", enName: "The Morning Star", verses: 17, origin: "Mecquoise", juz: 30 },
  { id: "87", arabicName: "الأعلى", transliteration: "Al-A'la", frName: "Le Très-Haut", enName: "The Most High", verses: 19, origin: "Mecquoise", juz: 30 },
  { id: "88", arabicName: "الغاشية", transliteration: "Al-Ghashiya", frName: "L'Enveloppante", enName: "The Overwhelming", verses: 26, origin: "Mecquoise", juz: 30 },
  { id: "89", arabicName: "الفجر", transliteration: "Al-Fajr", frName: "L'Aube", enName: "The Dawn", verses: 30, origin: "Mecquoise", juz: 30 },
  { id: "90", arabicName: "البلد", transliteration: "Al-Balad", frName: "La Cité", enName: "The City", verses: 20, origin: "Mecquoise", juz: 30 },
  { id: "91", arabicName: "الشمس", transliteration: "Ash-Shams", frName: "Le Soleil", enName: "The Sun", verses: 15, origin: "Mecquoise", juz: 30 },
  { id: "92", arabicName: "الليل", transliteration: "Al-Layl", frName: "La Nuit", enName: "The Night", verses: 21, origin: "Mecquoise", juz: 30 },
  { id: "93", arabicName: "الضحى", transliteration: "Ad-Duha", frName: "La Matinée", enName: "The Morning Hours", verses: 11, origin: "Mecquoise", juz: 30 },
  { id: "94", arabicName: "الشرح", transliteration: "Ash-Sharh", frName: "L'Expansion", enName: "The Relief", verses: 8, origin: "Mecquoise", juz: 30 },
  { id: "95", arabicName: "التين", transliteration: "At-Tin", frName: "Le Figuier", enName: "The Fig", verses: 8, origin: "Mecquoise", juz: 30 },
  { id: "96", arabicName: "العلق", transliteration: "Al-'Alaq", frName: "L'Adhérence", enName: "The Clot", verses: 19, origin: "Mecquoise", juz: 30 },
  { id: "97", arabicName: "القدر", transliteration: "Al-Qadr", frName: "La Destinée", enName: "The Power", verses: 5, origin: "Mecquoise", juz: 30 },
  { id: "98", arabicName: "البينة", transliteration: "Al-Bayyina", frName: "La Preuve", enName: "The Clear Proof", verses: 8, origin: "Médinoise", juz: 30 },
  { id: "99", arabicName: "الزلزلة", transliteration: "Az-Zalzala", frName: "Le Séisme", enName: "The Earthquake", verses: 8, origin: "Médinoise", juz: 30 },
  { id: "100", arabicName: "العاديات", transliteration: "Al-'Adiyat", frName: "Les Coursières", enName: "The Courser", verses: 11, origin: "Mecquoise", juz: 30 },
  { id: "101", arabicName: "القارعة", transliteration: "Al-Qari'a", frName: "La Calamité", enName: "The Calamity", verses: 11, origin: "Mecquoise", juz: 30 },
  { id: "102", arabicName: "التكاثر", transliteration: "At-Takathur", frName: "L'Accumulation", enName: "The Rivalry in World Increase", verses: 8, origin: "Mecquoise", juz: 30 },
  { id: "103", arabicName: "العصر", transliteration: "Al-'Asr", frName: "L'Époque", enName: "The Declining Day", verses: 3, origin: "Mecquoise", juz: 30 },
  { id: "104", arabicName: "الهمزة", transliteration: "Al-Humaza", frName: "Le Médisant", enName: "The Traducer", verses: 9, origin: "Mecquoise", juz: 30 },
  { id: "105", arabicName: "الفيل", transliteration: "Al-Fil", frName: "L'Éléphant", enName: "The Elephant", verses: 5, origin: "Mecquoise", juz: 30 },
  { id: "106", arabicName: "قريش", transliteration: "Quraysh", frName: "Quraysh", enName: "Quraysh", verses: 4, origin: "Mecquoise", juz: 30 },
  { id: "107", arabicName: "الماعون", transliteration: "Al-Ma'un", frName: "Les Ustensiles", enName: "The Small Kindnesses", verses: 7, origin: "Mecquoise", juz: 30 },
  { id: "108", arabicName: "الكوثر", transliteration: "Al-Kawthar", frName: "L'Abondance", enName: "The Abundance", verses: 3, origin: "Mecquoise", juz: 30 },
  { id: "109", arabicName: "الكافرون", transliteration: "Al-Kafirun", frName: "Les Incroyants", enName: "The Disbelievers", verses: 6, origin: "Mecquoise", juz: 30 },
  { id: "110", arabicName: "النصر", transliteration: "An-Nasr", frName: "Le Secours", enName: "The Divine Support", verses: 3, origin: "Médinoise", juz: 30 },
  { id: "111", arabicName: "المسد", transliteration: "Al-Masad", frName: "Les Fibres", enName: "The Palm Fibre", verses: 5, origin: "Mecquoise", juz: 30 },
  { id: "112", arabicName: "الإخلاص", transliteration: "Al-Ikhlas", frName: "La Sincérité", enName: "The Sincerity", verses: 4, origin: "Mecquoise", juz: 30 },
  { id: "113", arabicName: "الفلق", transliteration: "Al-Falaq", frName: "L'Aube Naissante", enName: "The Daybreak", verses: 5, origin: "Mecquoise", juz: 30 },
  { id: "114", arabicName: "الناس", transliteration: "An-Nas", frName: "Les Hommes", enName: "Mankind", verses: 6, origin: "Mecquoise", juz: 30 },
];

type ProphetMeta = {
  id: string;
  arabicName: string;
  frName: string;
  enName: string;
  wikidataId: string;
  description: string;
};

const PROPHETS: ProphetMeta[] = [
  { id: "prophet-adam", arabicName: "آدم", frName: "Adam", enName: "Adam", wikidataId: "Q70899", description: "Premier prophète de l'Islam" },
  { id: "prophet-idris", arabicName: "إدريس", frName: "Idris (Hénoch)", enName: "Idris (Enoch)", wikidataId: "Q35801", description: "Prophète de l'Islam, identifié à Hénoch" },
  { id: "prophet-nuh", arabicName: "نوح", frName: "Noé", enName: "Noah", wikidataId: "Q87344", description: "Prophète de l'Islam, constructeur de l'arche" },
  { id: "prophet-hud", arabicName: "هود", frName: "Hud", enName: "Hud", wikidataId: "Q313697", description: "Prophète envoyé au peuple de 'Ad" },
  { id: "prophet-salih", arabicName: "صالح", frName: "Salih", enName: "Salih", wikidataId: "Q313700", description: "Prophète envoyé au peuple de Thamoud" },
  { id: "prophet-ibrahim", arabicName: "إبراهيم", frName: "Abraham", enName: "Abraham", wikidataId: "Q9291", description: "Père des prophètes, Khalil Allah" },
  { id: "prophet-lut", arabicName: "لوط", frName: "Loth", enName: "Lot", wikidataId: "Q150697", description: "Neveu d'Ibrahim, prophète envoyé à Sodome" },
  { id: "prophet-ismail", arabicName: "إسماعيل", frName: "Ismaël", enName: "Ishmael", wikidataId: "Q160190", description: "Fils aîné d'Ibrahim, ancêtre des Arabes" },
  { id: "prophet-ishaq", arabicName: "إسحاق", frName: "Isaac", enName: "Isaac", wikidataId: "Q93756", description: "Fils d'Ibrahim, père de Ya'qub" },
  { id: "prophet-yaqub", arabicName: "يعقوب", frName: "Jacob", enName: "Jacob", wikidataId: "Q100289", description: "Fils d'Ishaq, père des douze tribus" },
  { id: "prophet-yusuf", arabicName: "يوسف", frName: "Joseph", enName: "Joseph", wikidataId: "Q103817", description: "Fils de Ya'qub, doté du don d'interpréter les rêves" },
  { id: "prophet-shuayb", arabicName: "شعيب", frName: "Shu'ayb", enName: "Shu'ayb", wikidataId: "Q313694", description: "Prophète envoyé au peuple de Madian" },
  { id: "prophet-ayyub", arabicName: "أيوب", frName: "Job", enName: "Job", wikidataId: "Q122691", description: "Prophète connu pour sa patience" },
  { id: "prophet-dhulkifl", arabicName: "ذو الكفل", frName: "Dhul-Kifl", enName: "Dhul-Kifl", wikidataId: "Q15726952", description: "Prophète mentionné dans le Coran" },
  { id: "prophet-musa", arabicName: "موسى", frName: "Moïse", enName: "Moses", wikidataId: "Q9077", description: "Prophète qui parla directement à Allah (Kalimullah)" },
  { id: "prophet-harun", arabicName: "هارون", frName: "Aaron", enName: "Aaron", wikidataId: "Q123292", description: "Frère de Musa, prophète" },
  { id: "prophet-dawud", arabicName: "داود", frName: "David", enName: "David", wikidataId: "Q41370", description: "Roi-prophète, psalmiste" },
  { id: "prophet-sulayman", arabicName: "سليمان", frName: "Salomon", enName: "Solomon", wikidataId: "Q41370", description: "Roi-prophète, maître du vent et des djinns" },
  { id: "prophet-ilyas", arabicName: "إلياس", frName: "Élie", enName: "Elijah", wikidataId: "Q133673", description: "Prophète combattant l'idolâtrie" },
  { id: "prophet-alyasa", arabicName: "اليسع", frName: "Élisée", enName: "Elisha", wikidataId: "Q128126", description: "Successeur d'Ilyas" },
  { id: "prophet-yunus", arabicName: "يونس", frName: "Jonas", enName: "Jonah", wikidataId: "Q102414", description: "Prophète avalé par une baleine, Sahib Al-Hut" },
  { id: "prophet-zakariya", arabicName: "زكريا", frName: "Zacharie", enName: "Zechariah", wikidataId: "Q199895", description: "Père de Yahya, gardien de Maryam" },
  { id: "prophet-yahya", arabicName: "يحيى", frName: "Jean le Baptiste", enName: "John the Baptist", wikidataId: "Q40662", description: "Fils de Zakariya, précurseur d'Isa" },
  { id: "prophet-isa", arabicName: "عيسى", frName: "Jésus", enName: "Jesus", wikidataId: "Q302", description: "Messie, né de Maryam, prophète et Ruh Allah" },
  { id: "prophet-muhammad", arabicName: "محمد ﷺ", frName: "Muhammad ﷺ", enName: "Muhammad ﷺ", wikidataId: "Q9458", description: "Dernier prophète de l'Islam, Sceau des Prophètes" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function surahToItem(s: SurahMeta): ContentItem {
  return {
    id: `sourate-${s.id}`,
    title: `${s.transliteration} (${s.arabicName})`,
    subtitle: `Sourate ${s.id} · ${s.frName} · ${s.verses} versets · ${s.origin}`,
    coverUrl: undefined,
    source: "islamklash",
    metadata: { type: "sourate", number: parseInt(s.id), verses: s.verses, origin: s.origin, juz: s.juz },
  };
}

function prophetToEntity(p: ProphetMeta): ContentEntity {
  return {
    id: p.id,
    name: `${p.frName} (${p.arabicName})`,
    pictureUrl: undefined,
    source: "islamklash",
    metadata: { type: "prophet", wikidataId: p.wikidataId, arabicName: p.arabicName, enName: p.enName },
  };
}

function prophetToItem(p: ProphetMeta): ContentItem {
  return {
    id: `prophet-item-${p.id}`,
    title: `${p.frName} (${p.arabicName})`,
    subtitle: p.description,
    coverUrl: undefined,
    source: "islamklash",
    metadata: { type: "prophet", wikidataId: p.wikidataId },
  };
}

// ─── Wikidata helpers ─────────────────────────────────────────────────────────

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

type WbSearchHit = { id?: string; label?: string; description?: string };

async function searchWikidata(query: string, limit = 20): Promise<ContentItem[]> {
  const url = new URL(WIKIDATA_API);
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", query);
  url.searchParams.set("language", "fr");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("limit", String(Math.min(limit, 20)));

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 86400 } as any,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { search?: WbSearchHit[] };
    return (json.search ?? []).map((hit) => ({
      id: hit.id ?? hit.label ?? query,
      title: hit.label ?? query,
      subtitle: hit.description,
      source: "islamklash",
      metadata: { wikidataId: hit.id, type: "wikidata" },
    }));
  } catch {
    return [];
  }
}

async function searchWikidataEntity(query: string, limit = 20): Promise<ContentEntity[]> {
  const items = await searchWikidata(query, limit);
  return items.map((item) => ({
    id: item.id,
    name: item.title,
    pictureUrl: undefined,
    source: "islamklash",
    metadata: item.metadata,
  }));
}

// ─── JUZ groups (thematic collections) ───────────────────────────────────────

const JUZ_COLLECTIONS: ContentCollection[] = Array.from({ length: 30 }, (_, i) => ({
  id: `juz-${i + 1}`,
  title: `Juz' ${i + 1}`,
  coverUrl: undefined,
  source: "islamklash",
  metadata: { juz: i + 1 },
}));

const THEMATIC_COLLECTIONS: ContentCollection[] = [
  { id: "mecquoises", title: "Sourates Mecquoises", coverUrl: undefined, source: "islamklash", metadata: { theme: "mecquoise" } },
  { id: "medinoises", title: "Sourates Médinoises", coverUrl: undefined, source: "islamklash", metadata: { theme: "medinoise" } },
  { id: "courtes", title: "Sourates Courtes (≤ 10 versets)", coverUrl: undefined, source: "islamklash", metadata: { theme: "courtes" } },
  { id: "longues", title: "Grandes Sourates (≥ 100 versets)", coverUrl: undefined, source: "islamklash", metadata: { theme: "longues" } },
];

// ─── Content source ───────────────────────────────────────────────────────────

export const islamklashContentSource: ContentSource = {
  source: "islamklash",

  async searchItems(query, options) {
    const limit = options?.limit ?? 20;
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS.slice(0, limit).map(surahToItem);

    const results = SURAHS.filter(
      (s) =>
        s.transliteration.toLowerCase().includes(q) ||
        s.frName.toLowerCase().includes(q) ||
        s.enName.toLowerCase().includes(q) ||
        s.arabicName.includes(query) ||
        s.id === q ||
        String(parseInt(s.id)) === q,
    );

    if (results.length > 0) return results.slice(0, limit).map(surahToItem);
    return (await searchWikidata(query + " islam", limit)).slice(0, limit);
  },

  async searchItemsByKind(kind, query, options) {
    const limit = options?.limit ?? 20;
    const q = query.trim().toLowerCase();

    if (kind === "sourate") {
      if (!q) return SURAHS.slice(0, limit).map(surahToItem);
      return SURAHS.filter(
        (s) =>
          s.transliteration.toLowerCase().includes(q) ||
          s.frName.toLowerCase().includes(q) ||
          s.arabicName.includes(query) ||
          s.id === q,
      ).slice(0, limit).map(surahToItem);
    }

    if (kind === "prophete") {
      if (!q) return PROPHETS.slice(0, limit).map(prophetToItem);
      return PROPHETS.filter(
        (p) =>
          p.frName.toLowerCase().includes(q) ||
          p.enName.toLowerCase().includes(q) ||
          p.arabicName.includes(query) ||
          p.description.toLowerCase().includes(q),
      ).slice(0, limit).map(prophetToItem);
    }

    if (kind === "savant") {
      return searchWikidata(`${query} savant islamique`, limit);
    }

    if (kind === "mosquee") {
      return searchWikidata(`${query} mosquée`, limit);
    }

    return this.searchItems(query, options);
  },

  async searchCollections(query, options) {
    const limit = options?.limit ?? 20;
    const q = query.trim().toLowerCase();
    const all = [...JUZ_COLLECTIONS, ...THEMATIC_COLLECTIONS];
    if (!q) return all.slice(0, limit);
    return all.filter((c) => c.title.toLowerCase().includes(q)).slice(0, limit);
  },

  async searchEntities(query, options) {
    const limit = options?.limit ?? 20;
    const q = query.trim().toLowerCase();

    const prophetMatches = PROPHETS.filter(
      (p) =>
        !q ||
        p.frName.toLowerCase().includes(q) ||
        p.enName.toLowerCase().includes(q) ||
        p.arabicName.includes(query),
    ).slice(0, Math.ceil(limit / 2)).map(prophetToEntity);

    if (prophetMatches.length >= limit) return prophetMatches;

    const wikidataResults = await searchWikidataEntity(
      query ? `${query} islamique` : "prophète islam",
      limit - prophetMatches.length,
    );

    return [...prophetMatches, ...wikidataResults].slice(0, limit);
  },

  async getCollectionItems(collectionId, _options) {
    if (collectionId.startsWith("juz-")) {
      const juzNum = parseInt(collectionId.replace("juz-", ""));
      return SURAHS.filter((s) => s.juz === juzNum).map(surahToItem);
    }
    if (collectionId === "mecquoises") {
      return SURAHS.filter((s) => s.origin === "Mecquoise").map(surahToItem);
    }
    if (collectionId === "medinoises") {
      return SURAHS.filter((s) => s.origin === "Médinoise").map(surahToItem);
    }
    if (collectionId === "courtes") {
      return SURAHS.filter((s) => s.verses <= 10).map(surahToItem);
    }
    if (collectionId === "longues") {
      return SURAHS.filter((s) => s.verses >= 100).map(surahToItem);
    }
    return [];
  },

  async getEntityTopItems(entityId, options) {
    const limit = options?.limit ?? 20;
    const prophet = PROPHETS.find((p) => p.id === entityId);
    if (prophet) {
      // Return surahs named after this prophet (e.g. Yusuf, Yunus, Ibrahim, Nuh, Maryam…)
      const named = SURAHS.filter(
        (s) =>
          s.enName.toLowerCase().includes(prophet.enName.toLowerCase()) ||
          s.frName.toLowerCase().includes(prophet.frName.toLowerCase()) ||
          s.arabicName === prophet.arabicName,
      );
      if (named.length > 0) return named.slice(0, limit).map(surahToItem);
    }
    return SURAHS.slice(0, limit).map(surahToItem);
  },

  async getEntityById(entityId) {
    const prophet = PROPHETS.find((p) => p.id === entityId);
    if (prophet) return prophetToEntity(prophet);
    return null;
  },

  async getEntityCollections(entityId, options) {
    const limit = options?.limit ?? 10;
    void entityId;
    return JUZ_COLLECTIONS.slice(0, limit);
  },
};

// Named export alias used by vertical.config.ts
export const islamklash = islamklashContentSource;
