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
    flashBlindtest: string;
    flashBlindtestDesc: string;
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
    guestMode: string;
    guestName: string;
    guestNameHint: string;
    saveGuestName: string;
  };
  introVideo: {
    title: string;
    skip: string;
    unmute: string;
    mute: string;
    close: string;
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
    genreAll: string;
    emptyForGenre: string;
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
  multiplayerRoom: {
    bracketSubtitle: string;
    bracketRule: string;
    tierlistSubtitle: string;
    tierlistRule: string;
    roomTitle: string;
    player: string;
    players: string;
    defaultPlayer: string;
    host: string;
    hostSuffix: string;
    youSuffix: string;
    copyLink: string;
    copiedLink: string;
    cannotCopyLink: string;
    removePlayer: string;
    waitingPlayers: string;
    joiningRoom: string;
    joiningRoomHint: string;
    hostAwayTitle: string;
    hostAwayHint: string;
    joinRoom: string;
    waitingHost: string;
    responses: string;
    voteRecorded: string;
    votePassed: string;
    cancelVote: string;
    skipVote: string;
    finishRound: string;
    votesTitle: string;
    votesEditable: string;
    passed: string;
    waiting: string;
    spectator: string;
    vote: string;
    votes: string;
    tie: string;
    coinFlip: string;
    heads: string;
    tails: string;
    coinDecides: string;
    majority: string;
    skippedOne: string;
    skippedMany: string;
    winningTrack: string;
    nextDuel: string;
    bracketStart: string;
    bracketWaitingCopy: string;
    currentRound: string;
    collectiveVote: string;
    timeElapsed: string;
    bracketFinished: string;
    preparingDuel: string;
    tierlistStart: string;
    tierlistWaitingCopy: string;
    track: string;
    rank: string;
    tierlistFinished: string;
    nextTrack: string;
    previewUnavailable: string;
    pause: string;
    listenPreview: string;
    pausePreview: string;
    previewPosition: string;
    changeRankHint: string;
    errors: Record<string, string>;
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
    tagline: string;
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
  myLibrary: {
    title: string;
    subtitle: string;
    newBracket: string;
    newTierlist: string;
    newBlindtest: string;
    newBattleFeat: string;
    newStreamClash: string;
    newSmashPass: string;
    welcomeMsg: string;
    guestMsg: string;
    filterAll: string;
    filterPrivate: string;
    filterPublic: string;
    myCreations: string;
    myResults: string;
    myMultiResults: string;
    mySoloResults: string;
    myRooms: string;
    noBracketCreated: string;
    noGameFinished: string;
    noTierlistCreated: string;
    noTierlistSaved: string;
    noBlindtestCreated: string;
    noMultiResult: string;
    noSoloResult: string;
    noDeckCreated: string;
    noStreamClashCreated: string;
    emptyAll: string;
    emptyBrackets: string;
    emptyTierlists: string;
    emptyBlindtests: string;
    emptySmashPass: string;
    emptyStreamClash: string;
    emptyBattleFeat: string;
    createBracketCta: string;
    createTierlistCta: string;
    createBlindtestCta: string;
    createBattleFeatCta: string;
    createStreamClashCta: string;
    createSmashPassCta: string;
    battleFeatMyCreationsDesc: string;
    battleFeatMySoloResultsLabel: string;
    battleFeatMySoloResultsDesc: string;
    battleFeatMyMultiResultsDesc: string;
  };
  luckyWheel: {
    title: string;
    subtitle: string;
    spinAriaLabel: string;
    spinning: string;
    respin: string;
    randomChose: string;
    playMode: string;
    respin2: string;
    closeAriaLabel: string;
    bracketDesc: string;
    tierlistDesc: string;
    blindtestDesc: string;
    battleFeatDesc: string;
    smashPassDesc: string;
    streamClashDesc: string;
  };
}

export const fr: Dictionary = {
  nav: {
    home: "Accueil",
    explore: "Explorer",
    guide: "Guide",
    myLibrary: "Ma bibliothèque",
    battleFeat: "BattleFeat",
    create: "Créer",
    createBracket: "Bracket",
    createTierlist: "Tierlist",
    createBlindtest: "Blindtest",
    createStreamClash: "Stream Clash",
    createSmashPass: "Smash or Pass",
    createBracketDesc: "Tournoi éliminatoire morceau par morceau",
    createTierlistDesc: "Classe tes sons du meilleur au pire",
    createBlindtestDesc: "Devine les titres à l'aveugle",
    flashBlindtest: "Blindtest éclair",
    flashBlindtestDesc: "5 sons, 5 difficultés. Trouve-les en 0,1 s pour le max de points",
    createStreamClashDesc: "Devine le morceau le plus streamé",
    createSmashPassDesc: "Smash ou Pass sur morceaux, albums ou artistes",
    createBattleFeatDesc: "Enchaîne les featurings",
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
    tagline: "L'arène du son",
    previewVolume: "Volume des extraits",
    guestMode: "Mode invité",
    guestName: "Ton pseudo",
    guestNameHint: "Facultatif : sans pseudo, tu joues en Guest.",
    saveGuestName: "Enregistrer mon pseudo",
  },
  introVideo: {
    title: "Découvrir MusiKlash",
    skip: "Passer",
    unmute: "Activer le son",
    mute: "Couper le son",
    close: "Fermer la présentation",
  },
  homeHero: {
    newBadge: "Nouveau : BattleFeat multijoueur",
    title1: "Transforme",
    title2: "ta",
    highlight: "musique",
    title3: "en jeu.",
    subtitle:
      "MusiKlash est l'arène ultime pour les mélomanes. Crée des tournois, défie tes amis et explore des milliers de créations uniques.",
    ctaCreate: "Commencer à créer",
    ctaExplore: "Explorer",
    featureBrackets: "Brackets",
    featureBlindtests: "BlindTests",
    coversTopCountry: "Top morceaux du moment · {country}",
    coversTopFallback: "Top morceaux du moment",
  },
  home: {
    badge: "Gratuit · Aucune pub · Juste la musique",
    hero1: "Fais s'affronter",
    hero2: "tes sons.",
    heroSubtitle:
      "Crée des tournois entre tes artistes et albums préférés, vote en écoutant chaque extrait, et découvre quels sons s'imposent vraiment.",
    playNow: "Découvrir les brackets",
    createBracket: "Lancer un tournoi",
    feature1Title: "Brackets & Tournois",
    feature1Text:
      "Élimine morceau par morceau jusqu'au grand vainqueur. Écoute 30 s par titre, vote, avance.",
    feature2Title: "Tierlists & Blindtests",
    feature2Text:
      "Classe tes albums du S au F, ou devine des sons à l'aveugle — idéal pour défier tes amis.",
    feature3Title: "Partage & BattleFeat",
    feature3Text:
      "Publie tes classements, défie la communauté, et enchaîne les featurings dans BattleFeat.",
    newBadge: "Nouveau",
    battleFeatDesc:
      "Le jeu du featuring enchaîné. Prouve que tu connais les collabs du rap FR — seul contre l'IA ou en duel multijoueur.",
    soloVsAi: "Solo vs IA",
    multiChallenge: "Défi multijoueur",
    howTitle: "En trois étapes",
    step1Title: "Définis ton angle",
    step1Text: "Un artiste, un genre, une décennie… donne un fil directeur à ton bracket.",
    step2Title: "Compose la liste",
    step2Text: "Cherche des titres dans le catalogue Deezer — de 4 à 32 morceaux.",
    step3Title: "Écoute et tranche",
    step3Text: "Vote en écoutant chaque extrait. Partage le lien ou publie-le pour la communauté.",
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
    createBattleFeatChallenge: "Créer un BattleFeat solo",
    battleFeatTitle: "BattleFeat",
    battleFeatDesc:
      "Le jeu de la chaîne de featurings ! Enchaîne les artistes qui ont collaboré ensemble.",
    playSolo: "Jouer en solo",
    createRoom: "Créer une room",
    tabAll: "Tous",
    tabBrackets: "Brackets",
    tabTierlists: "Tierlists",
    tabBlindtests: "Blindtests",
    tabBattlefeat: "BattleFeat",
    tabStreamClash: "Stream Clash",
    tabSmashPass: "Smash or Pass",
    createStreamClash: "Créer un Stream Clash",
    createSmashPass: "Créer un Smash or Pass",
    sectionBrackets: "Brackets",
    sectionTierlists: "Tierlists",
    sectionBlindtests: "Blindtests publics",
    sectionBlindtestCreations: "Blindtests — Créations publiques",
    sectionBlindtestRooms: "Blindtests — Rooms publiques",
    sectionBattleFeatSolo: "BattleFeat publics — Modes solo",
    sectionBattleFeatChallenges: "BattleFeat — Solos publics",
    sectionBattleFeatRooms: "BattleFeat — Rooms rejoignables",
    sectionStreamClash: "Stream Clash publics",
    sectionStreamClashCreations: "Stream Clash — Créations publiques",
    sectionStreamClashRooms: "Stream Clash — Rooms rejoignables",
    sectionSmashPass: "Smash or Pass publics",
    sectionSmashPassCreations: "Smash or Pass — Créations publiques",
    sectionSmashPassRooms: "Smash or Pass — Rooms rejoignables",
    seeAll: "Voir tout",
    genreAll: "Tous les genres",
    emptyForGenre: "en {genre}",
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
  multiplayerRoom: {
    bracketSubtitle: "Bracket collaboratif",
    bracketRule: "Les duels sont décidés à la majorité ; une égalité est tranchée au hasard.",
    tierlistSubtitle: "Tierlist collaborative",
    tierlistRule:
      "Chaque morceau est placé dans le rang choisi par la majorité, avec pile ou face en cas d’égalité.",
    roomTitle: "Room collaborative",
    player: "joueur",
    players: "joueurs",
    defaultPlayer: "Joueur",
    host: "hôte",
    hostSuffix: "hôte",
    youSuffix: "toi",
    copyLink: "Copier le lien",
    copiedLink: "Lien copié",
    cannotCopyLink: "Impossible de copier le lien automatiquement.",
    removePlayer: "Retirer {name} de la room",
    waitingPlayers: "En attente des joueurs",
    joiningRoom: "Connexion à la room…",
    joiningRoomHint: "Tu pourras voter dès que tu seras ajouté·e.",
    hostAwayTitle: "Partie en pause",
    hostAwayHint: "L’hôte a quitté la room. La partie reprendra à son retour.",
    joinRoom: "Rejoindre la room",
    waitingHost: "En attente du lancement par l’hôte…",
    responses: "Réponses",
    voteRecorded: "Ton vote est enregistré",
    votePassed: "Tu as passé",
    cancelVote: "Annuler mon vote",
    skipVote: "Passer mon vote",
    finishRound: "Finir le tour",
    votesTitle: "Votes de la room",
    votesEditable: "Modifiables jusqu’à la clôture",
    passed: "A passé",
    waiting: "En attente",
    spectator: "Spectateur",
    vote: "vote",
    votes: "votes",
    tie: "Égalité",
    coinFlip: "Pile ou face",
    heads: "PILE",
    tails: "FACE",
    coinDecides: "La pièce décide…",
    majority: "Majorité",
    skippedOne: "joueur a passé",
    skippedMany: "joueurs ont passé",
    winningTrack: "Morceau vainqueur",
    nextDuel: "Duel suivant",
    bracketStart: "Lancer le bracket",
    bracketWaitingCopy: "Partage le lien, puis lance la room à partir de 2 joueurs.",
    currentRound: "Tour en cours",
    collectiveVote: "Vote collectif",
    timeElapsed: "Temps écoulé",
    bracketFinished: "Tournoi terminé : voici le vote collectif final.",
    preparingDuel: "Préparation du duel suivant…",
    tierlistStart: "Lancer la tierlist",
    tierlistWaitingCopy: "Partage le lien, puis lance la tierlist à partir de 2 joueurs.",
    track: "Morceau",
    rank: "Rang",
    tierlistFinished: "Tierlist terminée : tous les placements ont été votés collectivement.",
    nextTrack: "Morceau suivant",
    previewUnavailable: "Extrait indisponible",
    pause: "Pause",
    listenPreview: "Écouter l’extrait",
    pausePreview: "Mettre l’extrait en pause",
    previewPosition: "Position dans l’extrait",
    changeRankHint: "Annule ton vote pour sélectionner un autre rang.",
    errors: {},
  },
  tierlistPage: {
    helper: "Glisse les morceaux dans les tiers · clique sur une pochette pour écouter l'extrait",
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
    allPlaced: "Tous les morceaux ont été placés 🎉",
    pngError:
      "Impossible de générer le PNG pour le moment. Vérifie que les pochettes sont bien chargées et réessaie.",
    resultTitle: "Résultat tierlist",
    rankedCount: "{placed} / {total} classés",
    addTier: "Ajouter un tier",
    tracksRanked: "{placed} / {total} morceaux classés",
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
    tagline: "Fais s'affronter tes sons, partage tes classements, défie tes amis.",
    catalog: "Catalogue musical via",
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
  myLibrary: {
    title: "Ma Bibliothèque",
    subtitle: "Retrouve toutes tes créations et tes résultats, en public ou en privé.",
    newBracket: "Nouveau bracket",
    newTierlist: "Nouvelle tierlist",
    newBlindtest: "Nouveau blindtest",
    newBattleFeat: "Nouveau BattleFeat solo",
    newStreamClash: "Nouveau Stream Clash",
    newSmashPass: "Nouveau Smash or Pass",
    welcomeMsg:
      "Compte créé 🎉 tu peux maintenant créer ton premier bracket ou ta première tierlist.",
    guestMsg:
      "Tu es en mode invité. Tes parties et créations restent liées à ce pseudo sur cet appareil.",
    filterAll: "Tous",
    filterPrivate: "Publié — Privé",
    filterPublic: "Publié — Public",
    myCreations: "Mes créations",
    myResults: "Mes résultats",
    myMultiResults: "Mes résultats multijoueur",
    mySoloResults: "Mes résultats solo",
    myRooms: "Mes rooms multijoueur",
    noBracketCreated: "Aucun bracket créé.",
    noGameFinished: "Aucune partie terminée.",
    noTierlistCreated: "Aucune tierlist créée.",
    noTierlistSaved: "Aucune tierlist sauvegardée.",
    noBlindtestCreated: "Aucun blindtest créé.",
    noMultiResult: "Aucun résultat multijoueur.",
    noSoloResult: "Aucun résultat solo.",
    noDeckCreated: "Aucun deck créé.",
    noStreamClashCreated: "Aucun Stream Clash créé.",
    emptyAll: "Aucun élément dans ta bibliothèque pour le moment",
    emptyBrackets: "Aucun bracket pour le moment",
    emptyTierlists: "Aucune tierlist pour le moment",
    emptyBlindtests: "Aucun blindtest pour le moment",
    emptySmashPass: "Aucun Smash or Pass pour le moment",
    emptyStreamClash: "Aucun Stream Clash pour le moment",
    emptyBattleFeat: "Aucune partie BattleFeat pour le moment",
    createBracketCta: "Créer un bracket",
    createTierlistCta: "Créer une tierlist",
    createBlindtestCta: "Créer un blindtest",
    createBattleFeatCta: "Créer un BattleFeat solo",
    createStreamClashCta: "Créer un Stream Clash",
    createSmashPassCta: "Créer un Smash or Pass",
    battleFeatMyCreationsDesc: "Tes BattleFeats solo rejouables.",
    battleFeatMySoloResultsLabel: "Mes résultats solo / solo vs IA",
    battleFeatMySoloResultsDesc: "Tes dernières parties BattleFeat solo.",
    battleFeatMyMultiResultsDesc: "Tes rooms BattleFeat en mode multijoueur.",
  },
  luckyWheel: {
    title: "J'ai de la chance",
    subtitle: "La roue choisit ton prochain mode de jeu, au hasard parmi les six.",
    spinAriaLabel: "Tourner la roue",
    spinning: "La roue tourne…",
    respin: "Relancer la roue",
    randomChose: "Le hasard a parlé !",
    playMode: "Jouer à {label}",
    respin2: "Retourner la roue",
    closeAriaLabel: "Fermer",
    bracketDesc: "Fais s'affronter tes sons en duels jusqu'au grand vainqueur.",
    tierlistDesc: "Classe tes morceaux du tier S au tier D, à ta façon.",
    blindtestDesc: "Devine le titre le plus vite possible, seul ou entre amis.",
    battleFeatDesc: "Relie deux artistes par leurs collaborations.",
    smashPassDesc: "Un son, une décision. Tranche en un swipe.",
    streamClashDesc: "Devine quel morceau a le plus de streams.",
  },
};
