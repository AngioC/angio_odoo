// -*- coding: utf-8 -*-
// © 2025 AngioC
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

odoo.define('password_toggle.password_toggle', function (require) {
    "use strict";

    var AbstractField = require('web.AbstractField');
    var fieldRegistry = require('web.field_registry');

    var PasswordToggleField = AbstractField.extend({
        supportedFieldTypes: ['char'],
        template: 'PasswordToggleField',

        init: function () {
            this._super.apply(this, arguments);
            this.showPassword = false;
        },

        _renderEdit: function () {
            this.$el.empty();

            var self = this;
            var currentValue = self.value || '';

            var $wrapper = $('<div>', { class: 'input-group' });

            this.$input = $('<input>', {
                type: self.showPassword ? 'text' : 'password',
                class: 'o_input form-control',
                val: currentValue,
            });

            var $append = $('<div>', { class: 'input-group-append' });
            this.$btn = $('<span>', { class: 'input-group-text', style: 'cursor:pointer;' });
            this.$icon = $('<i>', { class: self.showPassword ? 'fa fa-eye-slash' : 'fa fa-eye' });

            this.$btn.append(this.$icon);
            $append.append(this.$btn);
            $wrapper.append(this.$input).append($append);
            this.$el.append($wrapper);

            this.$btn.on('mousedown', function (ev) {
                ev.preventDefault();
            });

            this.$btn.on('click', function () {
                self.showPassword = !self.showPassword;
                self.$input.attr('type', self.showPassword ? 'text' : 'password');
                self.$icon.attr('class', self.showPassword ? 'fa fa-eye-slash' : 'fa fa-eye');
            });

            this.$input.on('input', function () {
                currentValue = self.$input.val();
            });

            this.$input.on('blur', function () {
                self._setValue(currentValue);
            });
        },

        _renderReadonly: function () {
            this.$el.text('••••••••');
        },
    });

    fieldRegistry.add('password_toggle', PasswordToggleField);

    return PasswordToggleField;
});
