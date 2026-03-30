import { test } from '@japa/runner'
import TipsService from '#services/tips_service'

test.group('TipsService — getDashboardTip', () => {
  const service = new TipsService()

  test('zero contacts returns onboarding tip', ({ assert }) => {
    const tip = service.getDashboardTip({
      contacts: 0, emailsSent: 0, responseRate: 0, replies: 0, interviews: 0,
    } as any)
    assert.include(tip.message, 'profil')
    assert.equal(tip.cta?.href, '/profil')
  })

  test('contacts but no emails sent returns email tip', ({ assert }) => {
    const tip = service.getDashboardTip({
      contacts: 10, emailsSent: 0, responseRate: 0, replies: 0, interviews: 0,
    } as any)
    assert.include(tip.message, '10 contact(s)')
    assert.equal(tip.cta?.href, '/emails')
  })

  test('interviews > 0 returns congratulation tip', ({ assert }) => {
    const tip = service.getDashboardTip({
      contacts: 20, emailsSent: 15, responseRate: 20, replies: 5, interviews: 2,
    } as any)
    assert.include(tip.message, '2 entretien(s)')
    assert.equal(tip.cta?.href, '/suivi')
  })

  test('good response rate (>= 15%) returns positive reinforcement', ({ assert }) => {
    const tip = service.getDashboardTip({
      contacts: 30, emailsSent: 10, responseRate: 20, replies: 2, interviews: 0,
    } as any)
    assert.include(tip.message, '20%')
    assert.include(tip.message, 'au-dessus')
  })

  test('low response rate (< 10%) with 10+ emails returns advice', ({ assert }) => {
    const tip = service.getDashboardTip({
      contacts: 50, emailsSent: 20, responseRate: 5, replies: 1, interviews: 0,
    } as any)
    assert.include(tip.message, '5%')
    assert.include(tip.message, 'personnaliser')
    assert.equal(tip.cta?.href, '/parametres/presets')
  })

  test('replies but no interviews returns follow-up tip', ({ assert }) => {
    const tip = service.getDashboardTip({
      contacts: 15, emailsSent: 8, responseRate: 12, replies: 3, interviews: 0,
    } as any)
    assert.include(tip.message, '3 r\u00e9ponse(s)')
    assert.equal(tip.cta?.href, '/suivi')
  })

  test('default case returns search encouragement', ({ assert }) => {
    // emailsSent > 0, responseRate between 10-14, no replies, no interviews
    const tip = service.getDashboardTip({
      contacts: 5, emailsSent: 3, responseRate: 12, replies: 0, interviews: 0,
    } as any)
    assert.include(tip.message, '3 email(s)')
    assert.equal(tip.cta?.href, '/recherche')
  })
})

test.group('TipsService — getThreadTip', () => {
  const service = new TipsService()

  test('NZ country returns NZ-specific tip', ({ assert }) => {
    const tip = service.getThreadTip(undefined, 'NZ')
    assert.include(tip.message, 'Nouvelle-Z\u00e9lande')
  })

  test('AU country returns AU-specific tip', ({ assert }) => {
    const tip = service.getThreadTip(undefined, 'AU')
    assert.include(tip.message, 'Australie')
  })

  test('UK country returns UK-specific tip', ({ assert }) => {
    const tip = service.getThreadTip(undefined, 'UK')
    assert.include(tip.message, 'Royaume-Uni')
  })

  test('CA country returns CA-specific tip', ({ assert }) => {
    const tip = service.getThreadTip(undefined, 'CA')
    assert.include(tip.message, 'Canada')
  })

  test('unknown country returns generic tip', ({ assert }) => {
    const tip = service.getThreadTip(undefined, 'FR')
    assert.include(tip.message, 'R\u00e9pondez rapidement')
  })

  test('no country returns generic tip', ({ assert }) => {
    const tip = service.getThreadTip()
    assert.include(tip.message, '24h')
  })
})

test.group('TipsService — getProfileTip', () => {
  const service = new TipsService()

  test('experienced NZ-targeting profile returns top 20% tip', ({ assert }) => {
    const tip = service.getProfileTip({
      skills: ['TypeScript', 'Node.js', 'React'],
      experienceYears: 10,
      targetCountries: ['NZ'],
    })
    assert.include(tip.message, 'top 20%')
    assert.equal(tip.cta?.href, '/recherche')
  })

  test('few skills returns add-skills tip', ({ assert }) => {
    const tip = service.getProfileTip({
      skills: ['JS'],
      experienceYears: 3,
      targetCountries: ['AU'],
    })
    assert.include(tip.message, 'comp\u00e9tences')
    assert.equal(tip.cta?.href, '/profil')
  })

  test('default profile returns complete-profile tip', ({ assert }) => {
    const tip = service.getProfileTip({
      skills: ['TS', 'React', 'Node'],
      experienceYears: 4,
      targetCountries: ['AU'],
    })
    assert.include(tip.message, 'profil complet')
    assert.equal(tip.cta?.href, '/profil')
  })
})

test.group('TipsService — getKanbanTip', () => {
  const service = new TipsService()

  test('interview status returns cultural fit tip', ({ assert }) => {
    const tip = service.getKanbanTip('interview')
    assert.include(tip.message, 'cultural fit')
  })

  test('replied status returns quick response tip', ({ assert }) => {
    const tip = service.getKanbanTip('replied')
    assert.include(tip.message, '24h')
    assert.isUndefined(tip.cta)
  })

  test('rejected status returns encouragement tip', ({ assert }) => {
    const tip = service.getKanbanTip('rejected')
    assert.include(tip.message, 'refus')
    assert.equal(tip.cta?.href, '/recherche')
  })

  test('null status returns default pipeline tip', ({ assert }) => {
    const tip = service.getKanbanTip(null)
    assert.include(tip.message, '7 jours')
    assert.isUndefined(tip.cta)
  })

  test('unknown status returns default pipeline tip', ({ assert }) => {
    const tip = service.getKanbanTip('some_random_status')
    assert.include(tip.message, 'pipeline')
  })
})
