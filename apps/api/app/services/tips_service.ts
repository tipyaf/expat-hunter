import type { DashboardStats } from '#services/dashboard_service'

export interface ContextualTip {
  message: string
  cta?: { label: string; href: string }
}

export default class TipsService {
  /**
   * Generate a contextual tip for the dashboard page.
   * Based on user stats, returns the most relevant tip.
   */
  getDashboardTip(stats: DashboardStats): ContextualTip {
    // No contacts yet → onboarding tip
    if (stats.contacts === 0) {
      return {
        message: 'Commencez par compléter votre profil pour que l\'IA puisse trouver les contacts les plus pertinents.',
        cta: { label: 'Compléter mon profil', href: '/profil' },
      }
    }

    // Has contacts but no emails sent → push to generate/send emails
    if (stats.emailsSent === 0 && stats.contacts > 0) {
      return {
        message: `Vous avez ${stats.contacts} contact(s) identifié(s). Générez et envoyez vos premiers emails pour démarrer votre prospection.`,
        cta: { label: 'Voir mes emails', href: '/emails' },
      }
    }

    // Got an interview → congrats + advice
    if (stats.interviews > 0) {
      return {
        message: `🎉 Félicitations ! Vous avez ${stats.interviews} entretien(s) en cours. Préparez-vous bien : renseignez-vous sur la culture locale et les attentes spécifiques du marché cible.`,
        cta: { label: 'Voir le suivi', href: '/suivi' },
      }
    }

    // Good response rate (above 15%) → positive reinforcement
    if (stats.emailsSent >= 5 && stats.responseRate >= 15) {
      return {
        message: `Votre taux de réponse est de ${stats.responseRate}% — c'est au-dessus de la moyenne habituelle (10-15%). Continuez sur cette lancée !`,
        cta: { label: 'Voir les réponses', href: '/contacts?status=replied' },
      }
    }

    // Low response rate → actionable advice
    if (stats.emailsSent >= 10 && stats.responseRate < 10) {
      return {
        message: `Votre taux de réponse est de ${stats.responseRate}%. Essayez de personnaliser davantage vos emails ou d'ajuster votre approche dans les presets de génération.`,
        cta: { label: 'Modifier mes presets', href: '/parametres/presets' },
      }
    }

    // Has replies but no interviews → encourage follow-ups
    if (stats.replies > 0 && stats.interviews === 0) {
      return {
        message: `Vous avez ${stats.replies} réponse(s) reçue(s). Suivez ces contacts dans le kanban et relancez si nécessaire.`,
        cta: { label: 'Voir le suivi', href: '/suivi' },
      }
    }

    // Default: encourage more searches
    return {
      message: `Vous avez envoyé ${stats.emailsSent} email(s). Lancez de nouvelles recherches pour élargir votre réseau et multiplier vos chances.`,
      cta: { label: 'Lancer une recherche', href: '/recherche' },
    }
  }

  /**
   * Generate a contextual tip for the thread (email exchanges) page.
   * Culturally relevant advice for the target country.
   */
  getThreadTip(_contactId?: string, country?: string): ContextualTip {
    if (country === 'NZ') {
      return {
        message:
          "En Nouvelle-Zélande, une relance après 5-7 jours ouvrés est bien perçue. Évitez de relancer trop tôt.",
      }
    }
    if (country === 'AU') {
      return {
        message:
          "En Australie, un ton décontracté et direct est apprécié. Une relance après 5 jours ouvrés est tout à fait appropriée.",
      }
    }
    if (country === 'UK') {
      return {
        message:
          "Au Royaume-Uni, la ponctualité et le professionnalisme sont primordiaux. Une relance après 7 jours ouvrés est recommandée.",
      }
    }
    if (country === 'CA') {
      return {
        message:
          "Au Canada, une relance polie après 5-7 jours ouvrés est bien vue. Mentionnez votre intérêt pour la culture locale.",
      }
    }
    return {
      message:
        "Répondez rapidement aux réponses reçues (idéalement sous 24h). Personnalisez votre message en fonction des informations partagées.",
    }
  }

  /**
   * Generate a contextual tip for the kanban (suivi) page.
   */
  getKanbanTip(status: string | null): ContextualTip {
    switch (status) {
      case 'interview':
        return {
          message: 'Préparez-vous aux questions sur le "cultural fit" propres au marché local. Renseignez-vous sur l\'entreprise : levées de fonds récentes, culture managériale, visa sponsorship.',
          cta: { label: 'Voir mes contacts', href: '/contacts' },
        }
      case 'replied':
        return {
          message: 'Vous avez reçu une réponse ! Répondez rapidement (idéalement sous 24h) et personnalisez votre message en fonction de ce qu\'ils ont dit.',
        }
      case 'rejected':
        return {
          message: 'Un refus n\'est pas une fin. D\'autres contacts dans la même entreprise peuvent être réceptifs, ou d\'autres entreprises du même secteur. Continuez !',
          cta: { label: 'Trouver d\'autres contacts', href: '/recherche' },
        }
      default:
        return {
          message: 'Gardez votre pipeline à jour. Un contact contacté sans réponse après 7 jours mérite une relance personnalisée.',
        }
    }
  }
}
