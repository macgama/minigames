# Minigames · 60 mini-jeux de 30 secondes (par Manigames)

Plateforme web de mini-jeux rapides (30 s à 3 min), à jouer seul, à deux ou en soirée.
Responsive (mobile, tablette, ordinateur), installable comme une appli (PWA). Les 60 jeux sont gratuits en ligne, sans publicité. Le **jeu hors ligne est réservé à Premium** : le service worker n'est installé que pour les abonnés.

Cible : **minigames.manigames.online** (hébergement Infomaniak, fichiers statiques).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173 (accessible aussi depuis le téléphone sur le même Wi-Fi)
npm run build      # génère dist/ (site statique, chemins relatifs, + service worker pour le hors ligne Premium)
npm run preview    # teste le build
```

Node 20+ recommandé.

## Mettre en ligne chez Infomaniak

1. `npm run build`
2. Envoyer **le contenu** du dossier `dist/` à la racine du site `minigames.manigames.online` (FTP/SFTP ou gestionnaire de fichiers Infomaniak).
   Le fichier `.htaccess` inclus force le HTTPS et règle le cache (le service worker n’est jamais mis en cache trop longtemps).
3. Optionnel : le workflow GitHub **Deploy (Infomaniak)** (lancement manuel dans l’onglet *Actions*) fait le build et l’envoi par SFTP. Il faut d’abord ajouter les secrets `INFOMANIAK_HOST`, `INFOMANIAK_USER`, `INFOMANIAK_PASSWORD` et `INFOMANIAK_PATH` dans *Settings → Secrets and variables → Actions*.

Le routage se fait par `#/…` : aucune règle de réécriture serveur n’est nécessaire.

## Structure

```
src/
  main.js            routeur (#/, #/jeu/:id, #/premium, #/stats, #/manette)
  shell.js           coquille commune d’un jeu : en-tête, règles, compte à rebours, résultats, partage, records
  pages.js           accueil, offres (Premium / Pass Soirée), statistiques
  styles/            design system (jetons, composants) + mise en page
  core/              utilitaires partagés : DOM, canvas, sons synthétisés, confettis, stockage, aléatoire avec graine, partage, joueurs locaux, offres
  core/progress.js   progression : XP et niveaux, médailles, succès, quêtes du jour, série, avatars
  games/index.js     catalogue des jeux 1 à 20 (titre, couleurs, règles, modes)
  games/extras.js    profondeur des jeux 1 à 20 : modes, seuils de médailles, format des scores, succès propres
  games/catalog2.js  jeux 21 à 40, avec leur profondeur (modes, médailles, succès)
  games/catalog3.js  jeux 41 à 60, idem
  games/kit.js       aides partagées (passer le téléphone, grilles de choix, tableau des scores)
  games/pont-sim.js  simulation physique de Pont Fragile (testable dans Node)
  games/*.js         un fichier par jeu, chargé à la demande
public/
  data/              dictionnaire français (Course de Mots, Chaîne de Mots), tirages, cartes (Carte Mentale)
  icons/, manifest   PWA
scripts/build-words.mjs   régénère le dictionnaire (source : an-array-of-french-words, MIT)
scripts/build-maps.mjs    régénère public/data/cartes.json (Natural Earth via world-atlas, domaine public) : npm run maps
```

### Ajouter un jeu

1. Ajouter une entrée dans `src/games/index.js` (id, titre, emoji, couleurs, règles, `load`).
2. Créer `src/games/mon-jeu.js` qui exporte `{ start(ctx) }` : `ctx.stage` (zone de jeu), `ctx.mode`, `ctx.rng` (aléatoire avec graine), `ctx.hud()`, `ctx.end({ score, display, title, feats… })`. Les minuteries passées par `ctx.timeout/interval/on` sont nettoyées toutes seules.

## Rejouabilité (commune à tous les jeux)

- **Progression** : XP à chaque partie, niveaux, titres et avatars à débloquer.
- **Médailles** bronze, argent, or, platine par jeu (et par mode quand il a son propre classement).
- **Succès** globaux et propres à chaque jeu, **3 quêtes du jour**, **série** de jours joués.
- **Défier un ami** : lien avec la même graine et le score à battre.
- Modes « du jour » (même partie pour tout le monde) : Tap Royale, Défi du Jour (+ Expert), Course de Mots, Gravité Folle, Chasse à l’Intrus, et une vingtaine des nouveaux jeux.
- Filtre **✨ Nouveaux** et recherche sur l’accueil ; succès « Joue aux 60 jeux ».

## Contenu de chaque jeu

| # | Jeu | Modes | Profondeur ajoutée | À faire ensuite |
|---|-----|-------|--------------------|-----------------|
| 1 | Ligne Rouge | Bots, 2 joueurs | Championnat en 3 manches, turbo, obstacles, bots qui progressent | Mode en ligne |
| 2 | Bluff Pixel | Solo | 10 images, 3 vies, 3 styles de dévoilement, combos, pièges de même catégorie | Images illustrées |
| 3 | 10 Secondes Pile | Classique, Aveugle, Série, Tour de table | Historique, cibles variables | — |
| 4 | Le Dernier Debout | 1 à 4 joueurs | Premier à 3 manches, bonus 💪 ⚡ 🧊 | Manettes téléphone |
| 5 | Menteur Express | 3 à 8 joueurs | ~50 paires de questions, jusqu’à 5 manches, points | Plus de questions |
| 6 | Tap Royale | Libre, Royale du jour | 9 types d’épreuves qui se corsent | **Serveur temps réel** |
| 7 | Glouton Géométrique | Arène, Titans | Bonus 🧲 ⚡ 🛡️ ✖️2, sprint, combos, fil des repas | Multijoueur en ligne |
| 8 | Copie Conforme | Classique, Survie, Miroir | 16 formes en 3 niveaux, étoiles | — |
| 9 | Bombe Patate | Classique, Enfants, Avec lettre | Événements surprises, stats de fin | Multi-téléphones |
| 10 | Tour Bancale | Solo, 2 à 4 joueurs | Formes, blocs spéciaux, parfaits et ciment, vent | Réglage fin |
| 11 | Défi du Jour | Jour, Expert, Entraînement | Stats et distribution, archives Premium, couleurs exclues | Classement du jour |
| 12 | Écho Rythmique | Classique, 6 pads, À l’envers, Duel | Paliers qui accélèrent, 2e chance | Sons plus riches |
| 13 | Course de Mots | Rapide, Tirage du jour, Marathon | Combos, +5 s, indices, compteur par longueur | Classement en direct |
| 14 | Gravité Folle | 10 niveaux, Labyrinthe du jour | Gemmes, trous, 3 ⭐ par niveau, fantôme | Fantômes mondiaux |
| 15 | Pixel War Mini | Normal, Difficile | Bombes ✨, frénésie finale | **Serveur temps réel** |
| 16 | Qui A Dessiné Ça ? | Rapide, Tournoi, Imposteur | 50 mots, outils de dessin, révélation finale | Dessin simultané |
| 17 | Pierre-Feuille-Ciseaux+ | Prof Hibou, L’échelle, 2 joueurs | 5 ordis qui apprennent tes habitudes | Duel en ligne |
| 18 | Équilibriste | Traversée, Tempête | Distance, rafales annoncées, oiseaux, décors | Sensibilité par appareil |
| 19 | Chasse à l’Intrus | Chrono, Grille du jour, Zen | 5 types d’intrus, combos | Emojis en images |
| 20 | Mode Fête | Soirée en 3 épreuves | Course, Réflexe, Compte les moutons | **Relais WebSocket/WebRTC** |
| 21 | Chrono Inversé | Classique, Brouillage, Du jour | 8 manches, durées croissantes, réglage au dixième | — |
| 22 | Mémoire Éclair | Solo, Contre l’ordi, 2 joueurs | 5 grilles chrono, combos, ordi à mémoire imparfaite | — |
| 23 | Dé Menteur | 2 ou 4 avec ordis, Local | Enchères, jokers ⚀, ordis qui calculent | Version en ligne |
| 24 | Serpent Fusion | Classique, Tore, Du jour | Fusions de couleurs, murs qui poussent, joker | — |
| 25 | Cible Mouvante | Classique, Sniper, Du jour | Cibles or et bombes, combos, munitions | — |
| 26 | Prix Juste | Solo, Soirée, Du jour | ~50 objets aux prix suisses, bonus « pile » | Prix à mettre à jour chaque année |
| 27 | Carte Mentale | Monde, Europe, Suisse, Du jour | Vraies cartes, distance en km, bonus vitesse | Plus de villes |
| 28 | Tri Express | Classique, Chrono, Du jour | 7 règles qui changent toutes les 10 cartes | — |
| 29 | Nombre Mystère | Solo, Chaud/froid, Ordi, 2 joueurs | 5 nombres jusqu’à 1000, duel au meilleur des 5 | — |
| 30 | Pont Fragile | 8 ponts | Physique (efforts dans les poutres), budget, 3 ⭐ | Plus de niveaux |
| 31 | Emoji Rébus | Mélange, Films, Expressions | Jokers 50/50, combos, chrono par rébus | Plus de rébus |
| 32 | Saut Infini | Ascension, Du jour, Turbo | Plateformes mobiles et fragiles, ressorts, pièces | — |
| 33 | Majorité | Majorité, Minorité | 36 questions, vote secret, graphiques animés | Un téléphone par joueur |
| 34 | Couleur Piège | Classique, Chaos, Du jour | Règle encre/mot qui change, couleurs en plus | — |
| 35 | Mini Golf | 9 trous, Du jour, 2 à 4 joueurs | Sable, eau, moulins, plots | Éditeur de trous |
| 36 | Code Secret | Ordi, 2 joueurs, Expert | Course au code contre un ordi logique | — |
| 37 | Air Hockey | 2 joueurs, 3 ordis | Multitouch, premier à 7 | — |
| 38 | Calcul Mental Rush | Rush, Tables, Survie, Du jour | 5 paliers, combos | — |
| 39 | Chaîne de Mots | Solo, Ordi, Soirée | Dictionnaire de 47 000 mots, chrono | — |
| 40 | Loup-Garou Express | Classique, Complet | Rôles, nuit et vote en passant le téléphone | **Un téléphone par joueur** |
| 41 | Ombre Chinoise | Classique, Difficile, Du jour | Silhouettes qui se précisent, 48 objets | — |
| 42 | Ascenseur Fou | Classique, Heure de pointe, Du jour | Patience des passagers, 4 places | — |
| 43 | Note Juste | Oreille, Voix (micro), Du jour | Justesse au centième, repli sans micro | — |
| 44 | Duel de Cowboys | 2 joueurs, Shérif, Piège | Faux signaux, temps de réaction | — |
| 45 | Cuisine Chrono | Midi, Coup de feu, Du jour | Recettes à empiler, pourboires | Plus de recettes |
| 46 | Puzzle Glissant | 3×3, 4×4, 5×5, Du jour | Images générées, glissement de lignes | — |
| 47 | Radar Fantôme | Manoir, Du jour, 2 joueurs | Distances, batterie, fantômes qui bougent | — |
| 48 | Parapente | Vol libre, Du jour, Coup de vent | Thermiques, orages, relief alpin | — |
| 49 | Vrai ou Fake | Solo, 2 joueurs, Du jour | 48 anecdotes vérifiées avec explications | Plus d’anecdotes |
| 50 | Orchestre | Soliste, Duo, Presto | 4 instruments synthétisés, partition qui se densifie | Un téléphone par musicien |
| 51 | Fusée Carburant | 6 missions, Du jour | Gravités réelles, vent, plateforme mobile | — |
| 52 | Domino Chaîne | 10 tableaux | Réaction en chaîne, portails, 3 ⭐ | Plus de tableaux |
| 53 | Cache-Cache Pixel | Soirée, Ordi, Du jour | 6 décors, chaud/froid | — |
| 54 | Enchères Folles | 3 ordis, Soirée | Lots mystère, expert parfois trompeur | — |
| 55 | Tir à la Corde | Équipes, Ordi | Multitouch, meilleur des 3 | — |
| 56 | Labyrinthe Noir | Exploration, Du jour, Bougie | Lampe qui faiblit, piles, labyrinthes croissants | — |
| 57 | Sudoku Flash | Série, 6×6, Du jour | Grilles à solution unique générées | — |
| 58 | Pêche Express | Lac, Nuit, Du jour | Tension de ligne, poissons rares, légende | — |
| 59 | Atelier Couleurs | Peinture, Nuancier, Du jour | Mélange de gouttes, ressemblance en % | — |
| 60 | Quiz Duel Live | 2 joueurs, Ordi | 48 questions, jokers 50/50, ×2, Gel | Plus de questions |

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (ce qu’il faut côté serveur) et [docs/MONETISATION.md](docs/MONETISATION.md) (offres sans pub).
