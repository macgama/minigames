# Minigames · 20 mini-jeux de 30 secondes (par Manigames)

Plateforme web de mini-jeux rapides (30 s à 3 min), à jouer seul, à deux ou en soirée.
Responsive (mobile, tablette, ordinateur), installable comme une appli (PWA). Les 20 jeux sont gratuits en ligne, sans publicité. Le **jeu hors ligne est réservé à Premium** : le service worker n'est installé que pour les abonnés.

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
  games/index.js     catalogue des 20 jeux (titre, couleurs, règles, modes)
  games/extras.js    profondeur de chaque jeu : modes, seuils de médailles, format des scores, succès propres
  games/*.js         un fichier par jeu, chargé à la demande
public/
  data/              dictionnaire français (mots de 3 à 7 lettres) et tirages pour Course de Mots
  icons/, manifest   PWA
scripts/build-words.mjs   régénère le dictionnaire (source : an-array-of-french-words, MIT)
```

### Ajouter un jeu

1. Ajouter une entrée dans `src/games/index.js` (id, titre, emoji, couleurs, règles, `load`).
2. Créer `src/games/mon-jeu.js` qui## Rejouabilité (commune à tous les jeux)

- **Progression** : XP à chaque partie, niveaux, titres et avatars à débloquer.
- **Médailles** bronze, argent, or, platine par jeu (et par mode quand il a son propre classement).
- **Succès** globaux et propres à chaque jeu, **3 quêtes du jour**, **série** de jours joués.
- **Défier un ami** : lien avec la même graine et le score à battre.
- Modes « du jour » (même partie pour tout le monde) : Tap Royale, Défi du Jour (+ Expert), Course de Mots, Gravité Folle, Chasse à l’Intrus.

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

eaux+ | Contre l’ordi ou à 2 | Duel en ligne |
| 18 | Équilibriste | Inclinaison (gyroscope) ou boutons | Réglage de la sensibilité par appareil |
| 19 | Chasse à l’Intrus | Solo | Jeux d’emojis rendus en images (rendu identique sur tous les OS) |
| 20 | Mode Fête | Manettes dans d’autres onglets + joueurs locaux | **Relais WebSocket/WebRTC** pour de vrais téléphones, plus de mini-jeux de fête |

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (ce qu’il faut côté serveur) et [docs/MONETISATION.md](docs/MONETISATION.md) (offres sans pub).
