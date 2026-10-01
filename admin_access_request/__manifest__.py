# -*- coding: utf-8 -*-
# © 2026 AngioC
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Admin access request",
    "summary": "Request access to admin account",
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
        "mail",
    ],
    "data": [
        "security/ir.model.access.csv",
        "views/admin_access_request_views.xml",
    ],
}
