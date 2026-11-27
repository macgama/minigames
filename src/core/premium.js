/**
 * État des offres (prototype : aucun paiement réel, tout est simulé en local).
 * - Abo Premium : salons privés, stats, défis exclusifs et archives, jeux hors ligne, Mode Fête inclus.
 * - Pass Soirée : achat unique, débloque le Mode Fête multi-écrans pendant 24 h pour l'hôte (invités gratuits).
 */
import { store } from './store.js';
export const OFFERS = {
  premium: { name: 'Manigames Premium', monthly: 'CHF 3.90', yearly: 'CHF 29.90',
    perks: ['Tous les jeux téléchargés pour jouer hors ligne', 'Salons privés pour défier tes amis', 'Statistiques détaillées et historique', 'Défis exclusifs et archives du Défi du jour', 'Mode Fête inclus, sans limite'] },
  pass: { name: 'Pass Soirée', price: 'CHF 4.90', duration: '24 h',
    perks: ['Mode Fête multi-écrans débloqué 24 h', 'Jusqu’à 8 manettes (les téléphones des invités)', 'Invités : rien à payer, rien à installer', 'Paiement unique, sans abonnement'] },
};
export const isPremium = () => !!store.get('premium')?.active;
export const passUntil = () => store.get('pass')?.until || 0;
export const hasPass = () => passUntil() > Date.now();
export const canParty = () => isPremium() || hasPass();
export function activatePremium(plan = 'annuel') { store.set('premium', { active: true, plan, since: Date.now() }); }
export function cancelPremium() { store.del('premium'); }
export function activatePass() { store.set('pass', { until: Date.now() + 24 * 3600e3 }); }
export function cancelPass() { store.del('pass'); }
