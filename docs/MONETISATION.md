# Monétisation sans publicité

Décision : **pas de pub**. Les 20 jeux sont gratuits en ligne pour tous (le Mode Fête multi-écrans demande le Pass Soirée ou Premium). Le jeu hors ligne est réservé à Premium. Prix validés le 27.11.2026.

## Manigames Premium (abonnement)

Prix indicatifs : CHF 3.90 / mois ou CHF 29.90 / an.

- Tous les jeux téléchargés pour jouer hors ligne
- Salons privés pour défier ses amis
- Statistiques détaillées et historique
- Défis exclusifs et archives du Défi du jour
- Mode Fête inclus

## Pass Soirée (achat unique)

Prix indicatif : CHF 4.90, valable 24 h.

- Débloque le Mode Fête multi-écrans (un écran hôte, jusqu’à 8 téléphones manettes)
- Seul l’hôte paie : les invités n’ont rien à installer ni à payer
- Pas d’abonnement

## Dans le prototype

- Page `#/premium` avec les deux offres. Les boutons activent l’offre **localement, sans paiement** (bouton « Réinitialiser la démo » pour revenir en arrière).
- Le Mode Fête est verrouillé sans Pass ou Premium ; les statistiques avancées et les archives du Défi du jour affichent un cadenas Premium.

## Pour la vraie version

- Paiement via Stripe Checkout (abonnement + paiement unique), avec TWINT pour la Suisse.
- Un webhook côté serveur active l’offre sur un compte léger (e-mail + lien magique, sans mot de passe).
- Le Pass Soirée est rattaché au salon de l’hôte : les manettes des invités n’ont jamais besoin de compte.
