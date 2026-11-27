/**
 * Profondeur de chaque jeu : modes, seuils de médailles, format des scores, succès propres.
 * medals : [bronze, argent, or, platine] (tableau) ou { default: [...], <board>: [...] } quand un mode a son propre classement.
 * fmt : affiche un score (et les écarts « encore X pour l'or »).
 */
const cs = (v) => `${(v / 100).toFixed(2).replace('.', ',')} s`;
const sec1 = (v) => `${(v / 10).toFixed(1).replace('.', ',')} s`;
export const EXTRAS = {
  'dix-secondes': {
    rules: ['Appuie pour lancer le chrono, il disparaît après 3 secondes.', 'Appuie de nouveau quand tu penses être à 10,00 s.', 'Vise l’or (±0,05 s), puis le platine (±0,01 s).'],
    modes: [
      { id: 'classic', label: 'Classique', desc: 'Chrono visible 3 secondes, puis à toi de compter.' },
      { id: 'aveugle', label: 'Aveugle', desc: 'Aucun chiffre, jamais. Juste ton horloge interne.' },
      { id: 'serie', label: 'Série de 5', desc: '5 cibles au hasard entre 3 et 15 s. L’écart total compte.' },
      { id: 'table', label: 'Tour de table', desc: 'Chacun son essai sur le même téléphone. Le plus proche gagne.' },
    ],
    lowerIsBetter: true, fmt: cs,
    medals: { default: [30, 12, 5, 1], aveugle: [60, 25, 10, 3], serie: [250, 120, 60, 25] },
    feats: { pile: { icon: '🎯', name: 'Pile poil', desc: 'Arrête le chrono à 10,00 s exactement' }, sniper: { icon: '🔭', name: 'Sniper', desc: '0,03 s d’écart ou moins en Classique' }, aveugle: { icon: '🙈', name: 'Les yeux fermés', desc: '0,05 s d’écart ou moins en Aveugle' }, serie: { icon: '🎼', name: 'Métronome', desc: 'Les 5 cibles d’une série à moins de 0,10 s' } },
  },
  'ligne-rouge': {
    rules: ['Ta moto avance seule et laisse un mur derrière elle. Glisse ou utilise les flèches pour tourner.', 'Double-tape (ou Espace) pour un turbo : 3 charges par manche.', '3 manches : 1er = 3 pts, 2e = 2 pts, 3e = 1 pt. Les bots progressent et l’arène se piège.'],
    modes: [{ id: 'bots', label: 'Contre 3 bots', desc: 'Championnat en 3 manches, avec médailles.' }, { id: 'duo', label: '2 joueurs (même écran)', desc: 'J1 : ZQSD + Maj, J2 : flèches + Entrée, ou les boutons tactiles.' }],
    medals: [350, 600, 850, 1000], fmt: (v) => `${v} pts`,
    feats: { chelem: { icon: '👑', name: 'Grand chelem', desc: 'Gagne les 3 manches d’un championnat' }, survie: { icon: '🛡️', name: 'Increvable', desc: 'Survis 45 s dans une seule manche' }, champion: { icon: '🏍️', name: 'Roi de l’arène', desc: 'Termine 1er d’un championnat' } },
  },
  'bluff-pixel': {
    rules: ['Une image se dévoile : pixels, puzzle ou zoom.', 'Choisis ta mise (×1, ×2, ×3) puis devine. Vite = plus de points, série de 3 = combo ×1,5, série de 5 = ×2.', '10 images, 3 vies. Les pièges se ressemblent de plus en plus.'],
    medals: [1200, 2800, 5000, 7500], fmt: (v) => `${v} pts`,
    feats: { parfait: { icon: '🧠', name: 'Sans faute', desc: '10 images sur 10' }, flash: { icon: '⚡', name: 'Coup d’œil', desc: 'Trouve en moins de 1,5 s avec une mise ×3' }, serie: { icon: '🔥', name: 'En feu', desc: 'Série de 5 bonnes réponses' } },
  },
  'dernier-debout': {
    rules: ['Ton sumo tourne sur lui-même : appuie sur ton bouton pour foncer.', 'Ramasse les bonus : 💪 Costaud, ⚡ Turbo, 🧊 Glissant (pour toi… attention).', 'L’arène rétrécit. Premier à 3 manches gagnées.'],
    modes: [{ id: '1', label: '1 joueur + bots', desc: 'Tournoi contre 3 bots de plus en plus vifs.' }, { id: '2', label: '2 joueurs' }, { id: '3', label: '3 joueurs' }, { id: '4', label: '4 joueurs' }],
    medals: [500, 900, 1400, 1900], fmt: (v) => `${v} pts`,
    feats: { yokozuna: { icon: '🏆', name: 'Yokozuna', desc: 'Remporte un tournoi contre les bots' }, invaincu: { icon: '🛡️', name: 'Intouchable', desc: 'Gagne un tournoi 3 manches à 0' }, bulldozer: { icon: '🚜', name: 'Bulldozer', desc: 'Éjecte 6 adversaires dans un tournoi' } },
  },
  'menteur-express': {
    rules: ['Passez le téléphone : chacun lit sa question en secret. Un joueur a reçu une question différente.', 'Répondez à voix haute, débattez, puis votez pour démasquer le menteur.', 'Menteur démasqué : +1 pour les autres. Menteur pas trouvé : +3 pour lui. Jusqu’à 5 manches, le menteur change à chaque fois.'],
  },
  'tap-royale': {
    rules: ['100 joueurs, une mini-épreuve par manche : réflexe, précision, calcul, mémoire, intrus…', 'Les 40 % les plus lents (ou ceux qui se trompent) sont éliminés.', 'Les épreuves accélèrent et se corsent. Sois le dernier debout.'],
    modes: [{ id: 'classic', label: 'Partie libre', desc: 'Épreuves au hasard à chaque partie.' }, { id: 'jour', label: 'Royale du jour', desc: 'Les mêmes épreuves pour tout le monde aujourd’hui. Compare avec tes potes.' }],
    medals: { default: [76, 91, 98, 100], jour: [76, 91, 98, 100] }, fmt: (v) => `top ${101 - v}`, fmtGap: (v) => `${v} place${v > 1 ? 's' : ''}`,
    feats: { couronne: { icon: '👑', name: 'Couronné', desc: 'Termine 1er sur 100' }, parfait: { icon: '💎', name: 'Sans bavure', desc: 'Gagne sans rater une seule épreuve' }, eclair: { icon: '⚡', name: 'Éclair', desc: 'Moins de 260 ms à l’épreuve du vert' }, justesse: { icon: '😅', name: 'Sur le fil', desc: 'Qualifié à la dernière place, et finir top 10' } },
  },
  glouton: {
    rules: ['Ta forme suit ton doigt ou ta souris. Absorbe tout ce qui est plus petit, fuis ce qui est cerclé de rouge.', 'Double-tape (ou Espace) pour un sprint : ça coûte un peu de masse. Ramasse 🧲 ⚡ 🛡️ ✖️2.', 'Avale plusieurs formes à la suite pour un combo. Finis 1er du classement pour +100.'],
    modes: [{ id: 'classic', label: 'Arène', desc: '2 minutes, 11 formes affamées.' }, { id: 'titans', label: 'Titans', desc: 'Les autres partent énormes et chassent mieux. Survis.' }],
    medals: { default: [250, 450, 700, 1000], titans: [250, 500, 800, 1200] }, fmt: (v) => `${v} pts`,
    feats: { roi: { icon: '👑', name: 'Roi de l’arène', desc: 'Finis 1er du classement' }, cannibale: { icon: '🍽️', name: 'Cannibale', desc: 'Avale 5 formes dans une partie' }, titan: { icon: '🗿', name: 'Titanesque', desc: 'Atteins 500 kg' }, survivant: { icon: '🛡️', name: 'Survivant', desc: 'Survis aux 2 minutes en mode Titans' } },
  },
  'copie-conforme': {
    rules: ['Une forme s’affiche un court instant, puis disparaît.', 'Redessine-la de mémoire, d’un seul trait, au même endroit.', 'Jusqu’à 3 ★ par forme. Les formes se compliquent et s’affichent de moins en moins longtemps.'],
    modes: [{ id: 'classic', label: 'Classique', desc: '6 formes, de la plus simple à la plus tordue.' }, { id: 'survie', label: 'Survie', desc: '3 vies. Le score à atteindre monte à chaque forme.' }, { id: 'miroir', label: 'Miroir', desc: 'Redessine la forme inversée gauche-droite. Ton cerveau va fumer.' }],
    medals: { default: [55, 70, 82, 90], miroir: [45, 60, 72, 82], survie: [400, 1000, 2000, 3500] }, fmt: (v, b) => (b === 'survie' ? `${v} pts` : `${v} %`),
    feats: { photocopieuse: { icon: '🖨️', name: 'Photocopieuse', desc: '90 % de moyenne en Classique' }, parfait: { icon: '✨', name: 'Trait parfait', desc: 'Une forme à 95 % ou plus' }, miroir: { icon: '🪞', name: 'De l’autre côté', desc: '75 % de moyenne en Miroir' }, survivant: { icon: '🐘', name: 'Mémoire d’éléphant', desc: '10 formes validées en Survie' }, etoiles: { icon: '⭐', name: 'Constellation', desc: '15 étoiles sur 18 en une partie' } },
  },
  'bombe-patate': {
    rules: ['Un thème s’affiche. Dis un mot qui colle, puis touche la bombe pour la passer au suivant.', 'La mèche est secrète. Surprises en cours de manche : 🔄 changement de sens, 🎲 nouveau thème, 🍯 bombe collante.', '2 vies chacun. Le dernier avec la tête sur les épaules gagne.'],
    modes: [{ id: 'classic', label: 'Classique', desc: '55 thèmes pour ados et adultes.' }, { id: 'enfants', label: 'Enfants', desc: 'Thèmes faciles et mèche plus longue.' }, { id: 'lettre', label: 'Avec lettre', desc: '« Un animal en B » : plus dur, plus drôle.' }],
  },
  'tour-bancale': {
    rules: ['Le bloc se balance : touche pour le lâcher sur la tour.', 'Pose-le pile au centre (le point devient vert) pour un PARFAIT. 3 parfaits d’affilée cimentent la base.', 'Attention aux blocs 🧊 glissants, 🪨 lourds, aux formes bizarres et au vent dès 8 blocs. ⭐ = +30.'],
    modes: [{ id: '1', label: 'Solo', desc: 'Empile le plus haut possible. Points, combos, médailles.' }, { id: '2', label: '2 joueurs', desc: 'Chacun son tour. Celui qui fait tomber la tour perd.' }, { id: '3', label: '3 joueurs' }, { id: '4', label: '4 joueurs' }],
    medals: [120, 300, 550, 900], fmt: (v) => `${v} pts`,
    feats: { gratteciel: { icon: '🏙️', name: 'Gratte-ciel', desc: '20 blocs dans une tour' }, orfevre: { icon: '🎯', name: 'Orfèvre', desc: '5 parfaits d’affilée' }, nuages: { icon: '☁️', name: 'Dans les nuages', desc: 'Une tour de 5 m' } },
  },
  'daily-defi': {
    rules: ['Trouve le code secret en un minimum d’essais.', '🟩 bonne couleur bien placée, 🟨 bonne couleur mal placée. Les couleurs absentes sont barrées ✕.', 'Un nouveau code chaque jour à minuit, le même pour tout le monde. Garde ta série 🔥 !'],
    modes: [{ id: 'jour', label: 'Défi du jour', desc: '4 couleurs, 6 essais. Le même code pour tous.' }, { id: 'expert', label: 'Expert du jour', desc: '5 couleurs, 7 essais. Pour les cerveaux chauds.' }, { id: 'libre', label: 'Entraînement', desc: 'Codes au hasard, à volonté, avec 2 indices.' }],
    medals: { default: [1, 3, 4, 5], expert: [1, 3, 5, 6], libre: [1, 3, 4, 5] },
    fmt: (v, b) => (v <= 0 ? 'raté' : `en ${(b === 'expert' ? 8 : 7) - v}`), fmtGap: (v) => `${v} essai${v > 1 ? 's' : ''} de moins`,
    feats: { devin: { icon: '🔮', name: 'Devin', desc: 'Trouve un code en 2 essais, sans indice' }, expert: { icon: '🧠', name: 'Expert', desc: 'Réussis un défi Expert' }, semaine: { icon: '📅', name: 'Une semaine pile', desc: 'Série de 7 défis du jour réussis' } },
  },
  'echo-rythmique': {
    rules: ['Écoute et regarde la séquence, puis rejoue-la.', 'Une note de plus à chaque tour. Le tempo accélère tous les 5 paliers.', 'Une 2e chance par partie en solo. En duel, chacun ajoute une note pour piéger l’autre.'],
    modes: [{ id: 'solo', label: 'Classique', desc: '4 pads, la séquence s’allonge.' }, { id: 'six', label: '6 pads', desc: 'Plus de couleurs, plus de notes.' }, { id: 'inverse', label: 'À l’envers', desc: 'Rejoue la séquence en partant de la fin.' }, { id: 'duel', label: 'Duel (même écran)', desc: 'Chacun rejoue puis ajoute une note.' }],
    medals: { default: [6, 10, 15, 22], six: [5, 8, 12, 18], inverse: [4, 7, 10, 15] }, fmt: (v) => `${v} notes`,
    feats: { vingt: { icon: '🎼', name: 'Symphonie', desc: '20 notes en Classique' }, miroir: { icon: '↩️', name: 'Rembobineur', desc: '10 notes À l’envers' }, six: { icon: '🎹', name: 'Six doigts', desc: '12 notes en 6 pads' }, sansfaute: { icon: '💎', name: 'Sans filet', desc: '12 notes sans utiliser la 2e chance' } },
  },
  'course-mots': {
    rules: ['Forme un maximum de mots avec les lettres (3 lettres minimum).', 'Mots enchaînés en moins de 5 s : combo ×1,5 puis ×2. Un mot de 6 lettres ou plus rapporte +5 s.', 'Le compteur par longueur te dit ce qu’il reste à trouver. 2 indices par tirage (−10 pts).'],
    modes: [{ id: 'classic', label: 'Partie rapide', desc: 'Un tirage, 60 secondes.' }, { id: 'jour', label: 'Tirage du jour', desc: 'Les mêmes lettres pour tout le monde aujourd’hui.' }, { id: 'marathon', label: 'Marathon', desc: '3 tirages de 45 s, score cumulé.' }],
    medals: { default: [150, 300, 500, 800], jour: [150, 300, 500, 800], marathon: [400, 800, 1300, 2000] }, fmt: (v) => `${v} pts`,
    feats: { complet: { icon: '🧩', name: 'Mot complet', desc: 'Trouve le mot qui utilise toutes les lettres' }, vingt: { icon: '📚', name: 'Dictionnaire vivant', desc: '20 mots dans une partie' }, combo: { icon: '🔥', name: 'Machine à mots', desc: 'Combo de 5 mots enchaînés' } },
  },
  'gravite-folle': {
    rules: ['Tourne le labyrinthe (flèches, glisser, boutons ou inclinaison) : la gravité fait rouler la bille.', 'Atteins l’étoile. 3 ⭐ par niveau : la sortie, les 3 gemmes 💎, et le temps de référence.', 'Dès le niveau 4, des trous te renvoient au départ. Ton meilleur parcours devient un fantôme 👻.'],
    modes: [{ id: 'niveaux', label: '10 niveaux', desc: 'Du petit 5×5 au grand 10×10. Débloque-les un à un.' }, { id: 'jour', label: 'Labyrinthe du jour', desc: 'Le même pour tout le monde aujourd’hui. Le plus rapide gagne.' }],
    medals: [5, 12, 20, 28], fmt: (v) => `${v} ⭐`,
    feats: { trois: { icon: '🌟', name: 'Trois étoiles', desc: '3 ⭐ sur un niveau' }, tout: { icon: '🏆', name: 'Maître du vertige', desc: 'Les 30 ⭐' }, dernier: { icon: '🌀', name: 'Au bout du tunnel', desc: 'Termine le niveau 10' }, propre: { icon: '🧼', name: 'Sans une égratignure', desc: 'Les 3 gemmes sans tomber dans un trou' } },
  },
  'pixel-war': {
    rules: ['Touche ou glisse pour colorier. Ta jauge se recharge vite.', 'Seule la plus grande zone d’un seul tenant compte : coupe celles des autres en deux !', 'Ramasse les ✨ pour gagner une 💣 (3×3 d’un coup). 15 dernières secondes : frénésie, recharge ×2.'],
    modes: [{ id: 'normal', label: 'Normal', desc: '3 équipes de bots, 90 secondes.' }, { id: 'difficile', label: 'Difficile', desc: 'Bots plus rapides qui visent ta zone.' }],
    medals: { default: [900, 1400, 1900, 2400], difficile: [600, 1000, 1500, 2000] }, fmt: (v) => `${v} pts`,
    feats: { victoire: { icon: '🏆', name: 'Drapeau planté', desc: 'Ton équipe gagne' }, empire: { icon: '🗺️', name: 'Empire', desc: 'Une zone de 140 cases' }, artificier: { icon: '💣', name: 'Artificier', desc: '3 bombes dans une partie' }, general: { icon: '🎖️', name: 'Général', desc: 'Gagne en Difficile' } },
  },
  'qui-a-dessine': {
    rules: ['Chacun son tour dessine le mot secret en 15 secondes (couleurs, épaisseur, gomme, ↶).', 'Les dessins sont révélés ensemble, sans les noms. Votez pour le 🏆 chef-d’œuvre et la 💩 catastrophe.', 'À la fin, on découvre qui a dessiné quoi.'],
    modes: [{ id: 'classic', label: 'Partie rapide', desc: 'Un mot, un vote.' }, { id: 'tournoi', label: 'Tournoi', desc: '3 manches. 🏆 +2, 💩 +1. Le meilleur total gagne.' }, { id: 'imposteur', label: 'Imposteur', desc: 'Un joueur reçoit un mot proche. Trouvez-le grâce aux dessins !' }],
  },
  'pfc-plus': {
    rules: ['Chaque manche, un pouvoir change les règles (pierre interdite, monde à l’envers, coup double…).', 'Les ordis apprennent tes habitudes : sois imprévisible !', 'Premier à 4 points.'],
    modes: [{ id: 'bot', label: 'Contre Prof Hibou', desc: 'Un ordi qui étudie tes habitudes.' }, { id: 'echelle', label: 'L’échelle', desc: '5 adversaires de plus en plus malins, jusqu’au Robo-Boss.' }, { id: 'duo', label: '2 joueurs (même écran)', desc: 'Chacun choisit en secret.' }],
    medals: { default: [11, 12, 13, 14], echelle: [1, 3, 4, 5] }, fmt: (v, b) => (b === 'echelle' ? `${v}/5` : `+${v - 10}`), fmtGap: (v, b) => (b === 'echelle' ? `${v} adversaire${v > 1 ? 's' : ''}` : `${v} point${v > 1 ? 's' : ''} d’écart`),
    feats: { hibou: { icon: '🦉', name: 'Plus malin que le hibou', desc: 'Bats Prof Hibou' }, boss: { icon: '👑', name: 'Tombeur de boss', desc: 'Gravis toute l’échelle' }, propre: { icon: '🧹', name: 'Fanny', desc: 'Gagne un match 4 à 0' } },
  },
  equilibriste: {
    rules: ['Le funambule avance seul sur le fil. Garde-le droit : incline le téléphone, ← → ou les boutons.', 'Les rafales sont annoncées juste avant d’arriver. Des oiseaux 🐦 se posent sur ton balancier.', 'Le décor change tous les 100 m. Va le plus loin possible.'],
    modes: [{ id: 'classic', label: 'Traversée', desc: 'Le vent monte doucement.' }, { id: 'tempete', label: 'Tempête', desc: 'Vent violent dès le départ.' }],
    medals: { default: [25, 60, 110, 180], tempete: [15, 40, 75, 120] }, fmt: (v) => `${v} m`,
    feats: { cent: { icon: '🎪', name: 'Cent mètres', desc: '100 m sur le fil' }, legende: { icon: '🌌', name: 'Funambule de légende', desc: '250 m sur le fil' }, tempete: { icon: '🌪️', name: 'Œil du cyclone', desc: '100 m en mode Tempête' }, oiseaux: { icon: '🐦', name: 'Perchoir', desc: 'Supporte 5 oiseaux dans une partie' } },
  },
  'chasse-intrus': {
    rules: ['Trouve l’emoji différent. La grille grandit à chaque niveau.', 'Dès le niveau 6, de nouveaux pièges : à l’envers, plus petit, couleur décalée, retourné.', 'Rapide = +1 s et combo. Erreur = −3 s.'],
    modes: [{ id: 'classic', label: 'Chrono 45 s', desc: 'Le plus d’intrus possible.' }, { id: 'jour', label: 'Grille du jour', desc: 'Les mêmes grilles pour tout le monde aujourd’hui.' }, { id: 'zen', label: 'Zen', desc: 'Pas de chrono, 3 vies. Jusqu’où iras-tu ?' }],
    medals: { default: [12, 20, 28, 36], jour: [12, 20, 28, 36], zen: [15, 30, 45, 60] }, fmt: (v) => `${v} intrus`,
    feats: { faucon: { icon: '🦅', name: 'Œil de faucon', desc: '30 intrus en 45 s' }, combo: { icon: '⚡', name: 'Réflexe éclair', desc: 'Combo de 10' }, zen: { icon: '🧘', name: 'Patience zen', desc: '40 intrus en mode Zen' }, precis: { icon: '🎯', name: 'Chirurgien', desc: '15 intrus sans aucune erreur' } },
  },
  'mode-fete': {
    rules: ['Un écran affiche la partie (télé, ordi, tablette). Les joueurs scannent le QR code : leur téléphone devient une manette.', 'La soirée enchaîne 3 épreuves : 🚀 course de fusées, ⚡ réflexe, 🐑 compte les moutons.', '1er +3, 2e +2, 3e +1. Le meilleur total est sacré roi de la soirée.'],
  },
};
export const fmts = { cs, sec1 };
