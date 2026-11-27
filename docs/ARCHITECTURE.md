# Architecture et suite technique

## Aujourd’hui : 100 % statique

- **Vite** + JavaScript sans framework : chaque jeu est un module chargé à la demande (le premier écran pèse ~45 ko gzip).
- **PWA** : `vite.config.js` génère `dist/sw.js` avec la liste de tous les fichiers. Après une première visite en ligne, l’accueil et les 20 jeux fonctionnent sans réseau.
- **Données locales** (`localStorage`) : records, nombre de parties, défi du jour, fantôme de Gravité Folle, état Premium/Pass (simulé).
- **Défi du jour** : le code est dérivé de la date (graine), donc identique pour tout le monde sans serveur.

## Ce qui demandera un serveur

| Besoin | Jeux / fonctions | Piste |
|--------|------------------|-------|
| Temps réel (salles, synchro) | Tap Royale, Pixel War, Glouton en ligne, duels en ligne, paris de Bluff Pixel | Serveur WebSocket (Node.js) |
| Relais des manettes | Mode Fête entre téléphones | WebSocket simple (le salon ne vit que pendant la partie) ; WebRTC possible plus tard |
| Classements et fantômes partagés | Défi du jour, Course de Mots, Gravité Folle | Petite API + base de données |
| Comptes légers et achats | Premium, Pass Soirée, salons privés | Paiement Stripe (cartes, TWINT, Apple/Google Pay) + webhook qui active l’offre |

### Où héberger le serveur

L’hébergement web Infomaniak sert parfaitement le site statique, mais il ne garde pas de connexions WebSocket ouvertes. Deux options :

1. **Infomaniak Jelastic Cloud ou un VPS Infomaniak** avec un petit serveur Node.js (WebSocket + API). Tout reste chez Infomaniak, en Suisse.
2. **Un service temps réel géré** (par ex. Cloudflare Durable Objects ou PartyKit) pour les salons, et l’API ailleurs.

Le code du Mode Fête isole déjà le transport (`transport()` dans `src/games/mode-fete.js`) : il suffit de remplacer le `BroadcastChannel` par un WebSocket.
