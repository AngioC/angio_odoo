# -*- coding: utf-8 -*-
# © 2025 AngioC
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Password Toggle",
    "summary": "Show/hide button near password field",
    "version": "14.0.0.0.1",
    "development_status": "Alpha",
    "category": "Extra Tools",
    "website": "https://github.com/AngioC/angio_odoo",
    "author": "AngioC",
    "license": "AGPL-3",
    "application": False,
    "installable": True,
    "depends": [
        "base",
    ],
    "data": [
        "views/assets.xml",
    ],
    "qweb": [
        "static/src/xml/password_toggle.xml",
    ],
}
