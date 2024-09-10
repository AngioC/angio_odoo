# -*- coding: utf-8 -*-
# © 2024 AngioC (<cotardoangelo@gmail.com>)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "generate_data_xml",
    "summary": "Generate XLM data",
    "version": "14.0.0.0.1",
    "development_status": "Alpha",
    "category": "Utility",
    "website": "",
    "author": "AngioC",
    "license": "AGPL-3",
    "application": False,
    "installable": True,
    "depends": [
        "base",
    ],
    "data": [
        "security/ir.model.access.csv",
        "menu/action.xml",
        "menu/items.xml",
        "wizard/download_export_views.xml",
        "views/res_import_file_views.xml",

    ],
}
