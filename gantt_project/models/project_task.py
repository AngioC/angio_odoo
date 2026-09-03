# -*- coding: utf-8 -*-
# © 2026 AngioC
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class ProjectTask(models.Model):
    _inherit = 'project.task'

    date_start = fields.Date(string='Start date')
    progress = fields.Integer(string='Progress (%)', default=0)

    dependency_ids = fields.Many2many(
        'project.task',
        relation='task_dependencies_rel',
        column1='task_id',
        column2='depends_on_id',
        string='Related task'
    )

    @api.constrains('date_start', 'date_deadline')
    def _check_dates_consistency(self):
        for task in self:
            if task.date_start and task.date_deadline:
                start_date = task.date_start.date() if hasattr(task.date_start, 'date') else task.date_start
                deadline_date = task.date_deadline.date() if hasattr(task.date_deadline, 'date') else task.date_deadline

                if start_date > deadline_date:
                    raise ValidationError(_(
                        "Planning error in task '%s':"
                        "The start date cannot be later than the end date."
                    ) % task.name)