# -*- coding: utf-8 -*-
# © 2026 AngioC
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

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

    @api.constrains('date_start', 'date_deadline')
    def _check_dates_consistency(self):
        for task in self:
            if task.date_start and task.date_deadline:
                # Odoo gestisce date_deadline come Date nativo, mentre date_start
                # potrebbe essere un Datetime. Normalizziamo per confrontarli in sicurezza.
                start_date = task.date_start.date() if hasattr(task.date_start, 'date') else task.date_start
                deadline_date = task.date_deadline.date() if hasattr(task.date_deadline, 'date') else task.date_deadline

                if start_date > deadline_date:
                    raise ValidationError(_(
                        "Errore di pianificazione nel task '%s': "
                        "La data di inizio non può essere successiva alla data di fine."
                    ) % task.name)