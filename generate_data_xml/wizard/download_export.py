# -*- coding: utf-8 -*-
# © 2024 AngioC
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import fields, models, api


class DownloadExportation(models.TransientModel):
    _name = 'download.export'
    _description = 'Download Export'

    export_file = fields.Binary('Excel File')
    file_name = fields.Char('File Name', readonly=True)
