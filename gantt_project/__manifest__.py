# -*- coding: utf-8 -*-
# © 2026 AngioC
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Gantt Progetti Custom",
    "summary": "Vista Gantt interattiva per i progetti",
    "version": "14.0.0.0.1",
    "development_status": "Alpha",
    "category": "Project",
    "website": "https://github.com/AngioC/angio_odoo",
    "author": "AngioC",
    "license": "AGPL-3",
    "application": False,
    "installable": True,
    "depends": [
        "project",
        "web",
    ],
    "data": [
        "menu/action.xml",
        "menu/items.xml",
        "views/project_project_views.xml",
        "views/project_task_views.xml",
        "views/assets.xml",
    ],
    "qweb": [
        "static/src/xml/gantt_template.xml",
    ],
}
