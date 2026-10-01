# -*- coding: utf-8 -*-
# © 2026 AngioC
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import models, fields, api, _
from odoo.exceptions import UserError
import string
import secrets


class AdminAccessRequest(models.Model):
    _name = 'admin.access.request'
    _description = 'Admin access requests'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Title', required=True, copy=False, default='Nuova')
    requester_id = fields.Many2one('res.users', string='Applicant', default=lambda self: self.env.user, readonly=True)
    reason = fields.Text(string='Reason', required=True, tracking=True)
    state = fields.Selection([
        ('draft', 'Draft'),
        ('submitted', 'Pending approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revoked', 'Revoked'),
    ], string='State', default='draft', tracking=True)

    granted_user_id = fields.Many2one('res.users', string='Dedicaded user', tracking=True)

    def action_submit(self):
        for rec in self:
            rec.state = 'submitted'
            rec.activity_schedule('mail.mail_activity_data_todo', user_id=2,
                                  summary="New admin request to be reviewed")

    def action_approve(self):
        for rec in self:
            if not rec.granted_user_id:
                raise UserError(
                    _("You must select a specific account from the field before you can approve the request."))

            rec.granted_user_id.active = True

            rec.state = 'approved'

            # Registra l'azione nel chatter
            msg = f"Request approved. The user <b>{rec.granted_user_id.name}</b> has been granted access. Credentials will be provided through separate private channels."
            rec.message_post(body=msg, message_type='notification')

    def action_reject(self):
        self.write({'state': 'rejected'})

    def action_revoke(self):
        for rec in self:
            if rec.granted_user_id:
                alphabet = string.ascii_letters + string.digits + string.punctuation
                scrambled_password = ''.join(secrets.choice(alphabet) for i in range(20))

                rec.granted_user_id.write({
                    'password': scrambled_password,
                    'active': False
                })

            rec.state = 'revoked'

            msg = f"""Access has been revoked.
            The account <b>{rec.granted_user_id.name}</b> has been deactivated, and
            its password has been reset to a random value for security reasons."""
            rec.message_post(body=msg, message_type='notification')