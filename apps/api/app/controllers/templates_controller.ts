import type { HttpContext } from '@adonisjs/core/http'
import EmailTemplate from '#models/email_template'

export default class TemplatesController {
  /**
   * GET /api/templates — List user's email templates.
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const templates = await EmailTemplate.query()
      .where('userId', user.id)
      .orderBy('isDefault', 'desc')
      .orderBy('createdAt', 'desc')

    return response.ok({ data: templates.map((t) => this.serialize(t)) })
  }

  /**
   * POST /api/templates — Create a new template.
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { name, subjectPattern, bodyPattern, isDefault } = request.only([
      'name', 'subjectPattern', 'bodyPattern', 'isDefault',
    ])

    if (!name || !subjectPattern || !bodyPattern) {
      return response.unprocessableEntity({
        error: { code: 'MISSING_FIELDS', message: 'name, subjectPattern and bodyPattern are required' },
      })
    }

    // Only one default per user
    if (isDefault) {
      await EmailTemplate.query()
        .where('userId', user.id)
        .where('isDefault', true)
        .update({ isDefault: false })
    }

    const template = await EmailTemplate.create({
      userId: user.id,
      name,
      subjectPattern,
      bodyPattern,
      isDefault: isDefault ?? false,
    })

    return response.created({ data: this.serialize(template) })
  }

  /**
   * PUT /api/templates/:id — Update a template.
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const template = await EmailTemplate.query()
      .where('id', params.id)
      .where('userId', user.id)
      .first()

    if (!template) {
      return response.notFound({ error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' } })
    }

    const { name, subjectPattern, bodyPattern, isDefault } = request.only([
      'name', 'subjectPattern', 'bodyPattern', 'isDefault',
    ])

    if (isDefault && !template.isDefault) {
      await EmailTemplate.query()
        .where('userId', user.id)
        .where('isDefault', true)
        .update({ isDefault: false })
    }

    if (name !== undefined) template.name = name
    if (subjectPattern !== undefined) template.subjectPattern = subjectPattern
    if (bodyPattern !== undefined) template.bodyPattern = bodyPattern
    if (isDefault !== undefined) template.isDefault = isDefault

    await template.save()
    return response.ok({ data: this.serialize(template) })
  }

  /**
   * DELETE /api/templates/:id — Delete a template.
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const template = await EmailTemplate.query()
      .where('id', params.id)
      .where('userId', user.id)
      .first()

    if (!template) {
      return response.notFound({ error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' } })
    }

    await template.delete()
    return response.ok({ data: { deleted: true } })
  }

  private serialize(template: EmailTemplate) {
    return {
      id: template.id,
      name: template.name,
      subjectPattern: template.subjectPattern,
      bodyPattern: template.bodyPattern,
      isDefault: template.isDefault,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }
  }
}
