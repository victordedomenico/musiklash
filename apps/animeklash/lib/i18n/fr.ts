export interface Dictionary {
  nav: {
    home: string;
    explore: string;
    guide: string;
    myLibrary: string;
    battleFeat: string;
    create: string;
    createBracket: string;
    createTierlist: string;
    createBlindtest: string;
    createStreamClash: string;
    createSmashPass: string;
    createBracketDesc: string;
    createTierlistDesc: string;
    createBlindtestDesc: string;
    createStreamClashDesc: string;
    createSmashPassDesc: string;
    createBattleFeatDesc: string;
    chooseMode: string;
    back: string;
    modeSolo: string;
    modeSoloDesc: string;
    modeSoloAi: string;
    modeSoloAiDesc: string;
    modeMulti: string;
    modeMultiDesc: string;
    settings: string;
    assistance: string;
    login: string;
    signup: string;
    logout: string;
    createPageSubtitle: string;
    openMainMenu: string;
    closeMainMenu: string;
    mainNavigation: string;
    luckyWheel: string;
  };
  sidebar: {
    tagline: string;
    previewVolume: string;
  };
  homeHero: {
    newBadge: string;
    title1: string;
    title2: string;
    highlight: string;
    title3: string;
    subtitle: string;
    ctaCreate: string;
    ctaExplore: string;
    featureBrackets: string;
    featureBlindtests: string;
    coversTopCountry: string;
    coversTopFallback: string;
  };
  home: {
    badge: string;
    hero1: string;
    hero2: string;
    heroSubtitle: string;
    playNow: string;
    createBracket: string;
    feature1Title: string;
    feature1Text: string;
    feature2Title: string;
    feature2Text: string;
    feature3Title: string;
    feature3Text: string;
    newBadge: string;
    battleFeatDesc: string;
    soloVsAi: string;
    multiChallenge: string;
    howTitle: string;
    step1Title: string;
    step1Text: string;
    step2Title: string;
    step2Text: string;
    step3Title: string;
    step3Text: string;
    guideLink: string;
  };
  explore: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptyFor: string;
    emptyDefault: string;
    emptyHint: string;
    createBracket: string;
    createTierlist: string;
    createBlindtest: string;
    createBattleFeatChallenge: string;
    battleFeatTitle: string;
    battleFeatDesc: string;
    playSolo: string;
    createRoom: string;
    tabAll: string;
    tabBrackets: string;
    tabTierlists: string;
    tabBlindtests: string;
    tabBattlefeat: string;
    tabStreamClash: string;
    tabSmashPass: string;
    createStreamClash: string;
    createSmashPass: string;
    sectionBrackets: string;
    sectionTierlists: string;
    sectionBlindtests: string;
    sectionBlindtestCreations: string;
    sectionBlindtestRooms: string;
    sectionBattleFeatSolo: string;
    sectionBattleFeatChallenges: string;
    sectionBattleFeatRooms: string;
    sectionStreamClash: string;
    sectionStreamClashCreations: string;
    sectionStreamClashRooms: string;
    sectionSmashPass: string;
    sectionSmashPassCreations: string;
    sectionSmashPassRooms: string;
    seeAll: string;
  };
  room: {
    spectatorTitle: string;
    spectatorSubtitle: string;
    spectatorWaitForRematch: string;
    spectatorWaitingRematch: string;
    spectatorReady: string;
    spectatorReadyAck: string;
    rematchCta: string;
    chatTitle: string;
    chatPlaceholder: string;
    chatEmpty: string;
    chatOpen: string;
  };
  tierlistPage: {
    helper: string;
  };
  tierlistPlayer: {
    savedTitle: string;
    savedSubtitle: string;
    copy: string;
    continueEditing: string;
  };
  tierlistBoard: {
    listen: string;
    rowFallbackLabel: string;
    rowSettings: string;
    rowMoveUp: string;
    rowMoveDown: string;
    modalTitle: string;
    modalEditLabel: string;
    modalLabelInputAria: string;
    deleteRow: string;
    clearRowImages: string;
    addRowAbove: string;
    addRowBelow: string;
    poolTitle: string;
    allPlaced: string;
    pngError: string;
    resultTitle: string;
    rankedCount: string;
    addTier: string;
    tracksRanked: string;
    downloadGenerating: string;
    downloadPng: string;
    reset: string;
    saving: string;
    saveShare: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    email: string;
    password: string;
    loginBtn: string;
    noAccount: string;
    signupLink: string;
    signupTitle: string;
    signupSubtitle: string;
    passwordHint: string;
    signupBtn: string;
    hasAccount: string;
    loginLink: string;
  };
  footer: {
    catalog: string;
    features: string;
    support: string;
    legal: string;
    createBracket: string;
    createTierlist: string;
    play: string;
    myBrackets: string;
    myTierlists: string;
    faq: string;
    guide: string;
    resources: string;
    about: string;
    contact: string;
    copyright: string;
    privacy: string;
    terms: string;
    legalNotice: string;
    privacyRights: string;
    cookieSettings: string;
    allRightsReserved: string;
  };
}

export const fr: Dictionary = {
  nav: {
    home: "Accueil",
    explore: "Explorer",
    guide: "Guide",
    myLibrary: "Ma bibliothèque",
    battleFeat: "BattleClash",
    create: "Créer",
    createBracket: "Bracket",
    createTierlist: "Tierlist",
    createBlindtest: "Blindtest",
    createStreamClash: "Stream Clash",
    createSmashPass: "Smash or Pass",
    createBracketDesc: "Tournoi éliminatoire animé par animé",
    createTierlistDesc: "Classe tes animés et personnages",
    createBlindtestDesc: "Devine les openings à l'aveugle",
    createStreamClashDesc: "Devine l'animé le plus populaire",
    createSmashPassDesc: "Smash ou Pass sur animés et personnages",
    createBattleFeatDesc: "Enchaîne les co-apparitions",
    chooseMode: "Choix du mode",
    back: "Retour",
    modeSolo: "Solo",
    modeSoloDesc: "Joue seul à ton rythme",
    modeSoloAi: "Solo vs IA",
    modeSoloAiDesc: "Affronte l'intelligence artificielle",
    modeMulti: "Multijoueur",
    modeMultiDesc: "2 joueurs ou plus en temps réel",
    settings: "Paramètres",
    assistance: "Assistance",
    login: "Connexion",
    signup: "S'inscrire",
    logout: "Déconnexion",
    createPageSubtitle: "Choisis un format pour commencer.",
    openMainMenu: "Ouvrir le menu",
    closeMainMenu: "Fermer le menu",
    mainNavigation: "Navigation principale",
    luckyWheel: "J'ai de la chance",
  },
  sidebar: {
    tagline: "L'arène des animés",
    previewVolume: "Volume des openings",
  },
  homeHero: {
    newBadge: "Nouveau : BattleClash multijoueur",
    title1: "Transforme",
    title2: "tes",
    highlight: "animés",
    title3: "en jeu.",
    subtitle:
      "AnimeKlash est l'arène ultime pour les fans d'anime. Crée des tournois, défie tes amis et explore des milliers de créations uniques.",
    ctaCreate: "Commencer à créer",
    ctaExplore: "Explorer",
    featureBrackets: "Brackets",
    featureBlindtests: "BlindTests",
    coversTopCountry: "Top animés du moment · {country}",
    coversTopFallback: "Top animés du moment",
  },
  home: {
    badge: "Gratuit · Aucune pub · Juste l'anime",
    hero1: "Fais s'affronter",
    hero2: "tes animés.",
    heroSubtitle:
      "Crée des tournois entre tes animés et personnages préférés, vote et découvre les vrais gagnants.",
    playNow: "Découvrir les brackets",
    createBracket: "Lancer un tournoi",
    feature1Title: "Brackets & Tournois",
    feature1Text:
      "Élimine entrée par entrée jusqu'au grand vainqueur. Écoute l'opening si dispo, vote, avance.",
    feature2Title: "Tierlists & Blindtests",
    feature2Text:
      "Classe titres d'animé, persos et openings du S au F, ou devine les OP/ED à l'aveugle.",
    feature3Title: "Partage & BattleClash",
    feature3Text:
      "Publie tes classements, défie la communauté, et enchaîne les co-apparitions dans BattleClash.",
    newBadge: "Nouveau",
    battleFeatDesc:
      "Le jeu des personnages qui se sont croisés. Prouve que tu connais les univers anime — seul contre l'IA ou en duel multijoueur.",
    soloVsAi: "Solo vs IA",
    multiChallenge: "Défi multijoueur",
    howTitle: "En trois étapes",
    step1Title: "Définis ton angle",
    step1Text: "Un univers, une époque, un genre… donne un fil directeur à ton bracket.",
    step2Title: "Compose la liste",
    step2Text: "Cherche des animés ou personnages — de 4 à 32 entrées.",
    step3Title: "Écoute et tranche",
    step3Text: "Vote pour chaque duel. Partage le lien ou publie-le pour la communauté.",
    guideLink: "Lire le guide",
  },
  explore: {
    title: "Explorer",
    subtitle: "Découvre uniquement les contenus publics de la communauté.",
    searchPlaceholder: "Rechercher par titre ou thème…",
    emptyTitle: "Aucun contenu public",
    emptyFor: "pour « {term} »",
    emptyDefault: "pour le moment",
    emptyHint: "Sois le premier à en publier un !",
    createBracket: "Créer un bracket",
    createTierlist: "Créer une tierlist",
    createBlindtest: "Créer un blindtest",
    createBattleFeatChallenge: "Créer un défi BattleClash",
    battleFeatTitle: "BattleClash",
    battleFeatDesc:
      "Le jeu des co-apparitions ! Enchaîne les personnages qui sont apparus ensemble.",
    playSolo: "Jouer en solo",
    createRoom: "Créer une room",
    tabAll: "Tous",
    tabBrackets: "Brackets",
    tabTierlists: "Tierlists",
    tabBlindtests: "Blindtests",
    tabBattlefeat: "BattleClash",
    tabStreamClash: "Stream Clash",
    tabSmashPass: "Smash or Pass",
    createStreamClash: "Créer un Stream Clash",
    createSmashPass: "Créer un Smash or Pass",
    sectionBrackets: "Brackets",
    sectionTierlists: "Tierlists",
    sectionBlindtests: "Blindtests publics",
    sectionBlindtestCreations: "Blindtests — Créations publiques",
    sectionBlindtestRooms: "Blindtests — Rooms publiques",
    sectionBattleFeatSolo: "BattleClash publics — Modes solo",
    sectionBattleFeatChallenges: "BattleClash — Défis publics",
    sectionBattleFeatRooms: "BattleClash — Rooms rejoignables",
    sectionStreamClash: "Stream Clash publics",
    sectionStreamClashCreations: "Stream Clash — Créations publiques",
    sectionStreamClashRooms: "Stream Clash — Rooms rejoignables",
    sectionSmashPass: "Smash or Pass publics",
    sectionSmashPassCreations: "Smash or Pass — Créations publiques",
    sectionSmashPassRooms: "Smash or Pass — Rooms rejoignables",
    seeAll: "Voir tout",
  },
  room: {
    spectatorTitle: "Mode spectateur",
    spectatorSubtitle:
      "Tu observes la partie en cours. Tu pourras rejoindre lors de la prochaine revanche.",
    spectatorWaitForRematch: "Attendre la revanche",
    spectatorWaitingRematch: "En attente de la revanche…",
    spectatorReady: "Prêt·e pour la prochaine manche",
    spectatorReadyAck: "Tu rejoindras automatiquement à la fin de la partie",
    rematchCta: "Rejouer",
    chatTitle: "Chat de la room",
    chatPlaceholder: "Ton message…",
    chatEmpty: "Dis bonjour ! Les messages ne sont pas conservés en dehors de la session.",
    chatOpen: "Chat",
  },
  tierlistPage: {
    helper: "Glisse les animés dans les tiers · clique sur une image pour écouter l'opening",
  },
  tierlistPlayer: {
    savedTitle: "Tierlist sauvegardée 🎉",
    savedSubtitle: "Partage le lien ci-dessous avec tes amis.",
    copy: "Copier",
    continueEditing: "Continuer à modifier",
  },
  tierlistBoard: {
    listen: "Écouter",
    rowFallbackLabel: "Tier",
    rowSettings: "Modifier la ligne",
    rowMoveUp: "Monter la ligne",
    rowMoveDown: "Descendre la ligne",
    modalTitle: "Choisir une couleur de fond du label :",
    modalEditLabel: "Modifier le texte du label :",
    modalLabelInputAria: "Texte du label",
    deleteRow: "Supprimer la ligne",
    clearRowImages: "Vider les images de la ligne",
    addRowAbove: "Ajouter une ligne au-dessus",
    addRowBelow: "Ajouter une ligne en dessous",
    poolTitle: "À placer ({placed} / {total})",
    allPlaced: "Tous les animés ont été placés 🎉",
    pngError:
      "Impossible de générer le PNG pour le moment. Vérifie que les pochettes sont bien chargées et réessaie.",
    resultTitle: "Résultat tierlist",
    rankedCount: "{placed} / {total} classés",
    addTier: "Ajouter un tier",
    tracksRanked: "{placed} / {total} animés classés",
    downloadGenerating: "Génération…",
    downloadPng: "Enregistrer en PNG",
    reset: "Recommencer",
    saving: "Sauvegarde…",
    saveShare: "Sauvegarder et partager",
  },
  auth: {
    loginTitle: "Connexion",
    loginSubtitle: "Accède à tes brackets.",
    email: "Email",
    password: "Mot de passe",
    loginBtn: "Se connecter",
    noAccount: "Pas de compte ?",
    signupLink: "Inscription",
    signupTitle: "Inscription",
    signupSubtitle: "Crée ton compte pour sauvegarder tes brackets.",
    passwordHint: "Au moins 6 caractères.",
    signupBtn: "Créer mon compte",
    hasAccount: "Déjà un compte ?",
    loginLink: "Connexion",
  },
  footer: {
    catalog: "Catalogue anime via",
    features: "Fonctionnalités",
    support: "Aide & Support",
    legal: "Informations légales",
    createBracket: "Créer un bracket",
    createTierlist: "Créer une tierlist",
    play: "Jouer",
    myBrackets: "Mes brackets",
    myTierlists: "Mes tierlists",
    faq: "FAQ",
    guide: "Guide",
    resources: "Ressources",
    about: "À propos",
    contact: "Contact",
    copyright: "Droits d'auteur",
    privacy: "Confidentialité",
    terms: "Conditions",
    legalNotice: "Mentions légales",
    privacyRights: "Exercer mes droits RGPD",
    cookieSettings: "Gestion des cookies",
    allRightsReserved: "Tous droits réservés",
  },
};
