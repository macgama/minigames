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
  games/index.js     catalogue des 20 jeux (titre, couleurs, règles, modes)
  games/*.js         un fichier par jeu, chargé à la demande
public/
  data/              dictionnaire français (mots de 3 à 7 lettres) et tirages pour Course de Mots
  icons/, manifest   PWA
scripts/build-words.mjs   régénère le dictionnaire (source : an-array-of-french-words, MIT)
```

### Ajouter un jeu

1. Ajouter une entrée dans `src/games/index.js` (id, titre, emoji, couleurs, règles, `load`).
2. Créer `src/games/mon-jeu.js` qui exporte `default { start(ctx) }`.
   `ctx` fournit : `stage` (zone de jeu), `hud({...})`, `countdown()`, `timeout/interval/on` (nettoyés automatiquement), `end({ score, display, title, label, share, win })`.

## État des 20 prototypes

Tous les jeux sont jouables de bout en bout. Ce qui reste à faire pour une version « production » :

| # | Jeu | Mode du prototype | À faire ensuite |
|---|-----|-------------------|-----------------|
| 1 | Ligne Rouge | Contre 3 bots, ou 2 joueurs même écran | Mode en ligne, manches multiples |
| 2 | Bluff Pixel | Solo avec mises ×1/×2/×3 | Paris contre d’autres joueurs (serveur) ; images illustrées au lieu des emojis |
| 3 | 10 Secondes Pile | Solo | Mode « tour de table » en soirée |
| 4 | Le Dernier Debout | 1 à 4 joueurs même écran + bots | Manettes téléphone via le Mode Fête |
| 5 | Menteur Express | 3–8 joueurs, un téléphone qui tourne | Banque de questions plus large |
| 6 | Tap Royale | 99 adversaires simulés | **Serveur temps réel** pour 100 vrais joueurs |
| 7 | Glouton Géométrique | Solo contre bots | Multijoueur en ligne |
| 8 | Copie Conforme | Solo, 5 manches | Ajuster le calcul de précision avec des tests utilisateurs |
| 9 | Bombe Patate | 2–8 joueurs, un téléphone | Variante multi-téléphones |
| 10 | Tour Bancale | Solo ou 2–4 joueurs (physique Matter.js) | Réglage fin de la difficulté et des formes |
| 11 | Défi du Jour | Code couleur du jour, grille partageable | Archives (Premium), classement du jour |
| 12 | Écho Rythmique | Solo ou duel | Sons plus riches |
| 13 | Course de Mots | Solo, rivaux simulés, lien « même tirage » | Classement en direct (serveur) |
| 14 | Gravité Folle | 1 labyrinthe, fantôme local | Plusieurs niveaux, fantômes mondiaux |
| 15 | Pixel War Mini | Ton équipe + 3 équipes bots | **Serveur temps réel** pour de vraies équipes |
| 16 | Qui A Dessiné Ça ? | 2–8 joueurs, un téléphone | Dessin simultané sur plusieurs téléphones |
| 17 | Pierre-Feuille-Ciseaux+ | Contre l’ordi ou à 2 | Duel en ligne |
| 18 | Équilibriste | Inclinaison (gyroscope) ou boutons | Réglage de la sensibilité par appareil |
| 19 | Chasse à l’Intrus | Solo | Jeux d’emojis rendus en images (rendu identique sur tous les OS) |
| 20 | Mode Fête | Manettes dans d’autres onglets + joueurs locaux | **Relais WebSocket/WebRTC** pour de vrais téléphones, plus de mini-jeux de fête |

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (ce qu’il faut côté serveur) et [docs/MONETISATION.md](docs/MONETISATION.md) (offres sans pub).
