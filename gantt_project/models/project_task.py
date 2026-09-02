# -*- coding: utf-8 -*-
# © 2026 AngioC
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import models, fields

class ProjectTask(models.Model):
    _inherit = 'project.task'

    date_start = fields.Datetime(string='Data di Inizio')
    progress = fields.Integer(string='Progresso (%)', default=0)

    dependency_ids = fields.Many2many(
        'project.task',
        relation='task_dependencies_rel',
        column1='task_id',
        column2='depends_on_id',
        string='Dipende da (Task precedenti)'
    )