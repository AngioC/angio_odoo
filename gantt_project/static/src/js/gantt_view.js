odoo.define('custom_gantt_project.GanttView', function (require) {
    "use strict";

    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var ajax = require('web.ajax'); // <--- 1. Importiamo ajax per caricare lo script esterno

    var GanttView = AbstractAction.extend({
        template: 'CustomGantt.MainView',
        hasControlPanel: true,

        events: {
            'change #project_filter': '_onProjectFilterChange',
            'change #user_filter': '_onUserFilterChange',
            'input #gantt_search_task': '_onSearchTaskInput',
            'click .gantt-zoom-btn': '_onChangeZoom',
            'click .gantt-today-btn': '_onTodayClick',
            'click .gantt-toggle-sidebar-btn': '_onToggleSidebar',
            'click .gantt-export-pdf-btn': '_onExportPDF',
            'click .gantt-refresh-btn': '_onRefreshClick',
        },

        init: function (parent, action) {
            this._super.apply(this, arguments);

            var ctx = (action && action.context) || (action && action.params && action.params.context) || this.actionContext || {};
            var contextProjectId = ctx.active_id || ctx.default_project_id || ctx.res_id || false;

            this.current_project_id = contextProjectId ? parseInt(contextProjectId) : false;
            this.is_single_project_mode = !!this.current_project_id;

            this.current_user_id = false;
            this.search_task_query = "";
            this.gantt_initialized = false;
        },

        start: function () {
            var self = this;

            return this._super.apply(this, arguments).then(function () {

                // 2. CARICAMENTO PIGRO DELL'API DI EXPORT DHTMLX (non influisce su Odoo)
                ajax.loadJS("https://export.dhtmlx.com/gantt/api.js").then(function() {
                    console.log("DHTMLX Export API caricata con successo.");
                });

                $.when(self._loadProjects(), self._loadUsers()).then(function() {
                    if (self.is_single_project_mode) {
                        self.$el.find('#project_filter_container').hide();
                    }

                    self._initDHTMLXGantt();
                    self._loadAndRenderGantt();

                    $(window).on('resize.dhtmlx_gantt', function () {
                        if (self.gantt_initialized) {
                            gantt.setSizes();
                        }
                    });
                });
            });
        },

        destroy: function () {
            $(window).off('resize.dhtmlx_gantt');
            this._super.apply(this, arguments);
        },

        // --- NUOVE FUNZIONI DI EXPORT ---
        _onExportPDF: function () {
            if (this.gantt_initialized && typeof gantt.exportToPDF !== "undefined") {
                gantt.exportToPDF({
                    name: "Pianificazione_Progetti.pdf",
                    header: "<h1>Pianificazione Progetti Odoo</h1>",
                    locale: "it"
                });
            }
        },

        _onRefreshClick: function () {
            // Ricarica semplicemente i task e ridisegna il grafico applicando i filtri attuali
            if (this.gantt_initialized) {
                // Cambiamo temporaneamente l'icona per dare un feedback visivo del caricamento
                var $icon = this.$('.gantt-refresh-btn i');
                $icon.addClass('fa-spin');

                this._loadAndRenderGantt().then(function() {
                    // Fermiamo l'animazione di caricamento appena i dati sono pronti
                    $icon.removeClass('fa-spin');
                });
            }
        },
        // --------------------------------

        _loadUsers: function () {
            var self = this;
            return rpc.query({
                model: 'res.users',
                method: 'search_read',
                domain: [['share', '=', false]],
                fields: ['id', 'name']
            }).then(function (users) {
                var $select = self.$el.find('#user_filter');
                users.forEach(function (u) {
                    $select.append($('<option>', { value: u.id, text: u.name }));
                });
            });
        },

        _initDHTMLXGantt: function () {
            var self = this;

            gantt.plugins({
                tooltip: true,
                drag_timeline: true
            });

            gantt.config.drag_timeline = {
                ignore: ".gantt_task_line, .gantt_task_link"
            };

            gantt.config.inclusive_end_dates = true;
            gantt.config.duration_unit = "day";
            gantt.config.show_grid = true;

            gantt.templates.task_class = function(start, end, task) {
                if (task.type === 'project') return "";
                var now = new Date();
                var isOverdue = task.end_date < now && task.progress < 1;
                return isOverdue ? "gantt_task_overdue" : "";
            };

            gantt.attachEvent("onBeforeTaskDisplay", function (id, task) {
                if (task.type === 'project') return true;

                if (self.current_user_id && task.user_id !== self.current_user_id) {
                    return false;
                }

                if (self.search_task_query) {
                    var query = self.search_task_query.toLowerCase();
                    if (!task.text || task.text.toLowerCase().indexOf(query) === -1) {
                        return false;
                    }
                }

                return true;
            });

            gantt.templates.timeline_cell_class = function (task, date) {
                if (date.getDay() === 0 || date.getDay() === 6) {
                    return "weekend";
                }
                return "";
            };

            gantt.templates.tooltip_text = function(start, end, task) {
                var start_str = moment(start).format('DD/MM/YYYY');
                var end_display = moment(end).clone().add(-1, 'days');
                var end_str = moment(task.end_date_raw || end_display).format('DD/MM/YYYY');

                if (task.type === 'project') {
                    return "<div style='padding: 5px; font-family: sans-serif;'>" +
                           "<h5 style='margin: 0 0 5px 0; color: #017e84; font-weight: bold;'>📁 " + task.text + "</h5>" +
                           "<div style='font-size: 13px;'><b>Inizio:</b> " + start_str + "<br/><b>Fine:</b> " + end_str + "</div>" +
                           "</div>";
                }

                var progress = Math.round(task.progress * 100);
                var isOverdue = task.end_date < new Date() && task.progress < 1;
                var overdueWarning = isOverdue ? "<br/><b style='color: #dc3545;'>⚠️ IN RITARDO!</b>" : "";

                return "<div style='padding: 5px; font-family: sans-serif;'>" +
                       "<h5 style='margin: 0 0 5px 0; color: #017e84; font-weight: bold;'>" + task.text + "</h5>" +
                       "<div style='font-size: 13px;'>" +
                       "<b>Inizio:</b> " + start_str + "<br/>" +
                       "<b>Fine:</b> " + end_str + "<br/>" +
                       "<b>Assegnato a:</b> " + task.assignee + "<br/>" +
                       "<b>Stato:</b> " + (task.stage || 'N/D') + "<br/>" +
                       "<b>Avanzamento:</b> " + progress + "%" +
                       overdueWarning +
                       "</div></div>";
            };

            gantt.config.columns = [
                {name: "text", label: "Progetto / Task", tree: true, width: 220, template: function(obj) {
                    if (obj.type === 'project') return obj.text;
                    var isOverdue = obj.end_date < new Date() && obj.progress < 1;
                    return isOverdue ? "⚠️ " + obj.text : obj.text;
                }},
                {name: "assignee", label: "Assegnato a", align: "center", width: 110},
                {name: "stage", label: "Stato", align: "center", width: 100, template: function(obj) {
                    if (obj.type === 'project' || !obj.stage) return "";

                    var badgeClass = 'badge-stage-default';
                    var stageLower = obj.stage.toLowerCase();
                    if (stageLower.indexOf('nuov') !== -1 || stageLower.indexOf('bozza') !== -1) {
                        badgeClass = 'badge-stage-new';
                    } else if (stageLower.indexOf('cors') !== -1 || stageLower.indexOf('svilupp') !== -1) {
                        badgeClass = 'badge-stage-progress';
                    } else if (stageLower.indexOf('fatto') !== -1 || stageLower.indexOf('complet') !== -1) {
                        badgeClass = 'badge-stage-done';
                    }

                    return "<span class='badge " + badgeClass + "'>" + obj.stage + "</span>";
                }},
                {name: "duration", label: "Durata", align: "center", width: 70, template: function(obj) {
                    if (obj.type === 'project') return "";
                    return obj.duration + " gg";
                }},
                {name: "start_date", label: "Inizio", align: "center", width: 85, template: function(obj) {
                    return moment(obj.start_date).format('DD/MM/YY');
                }}
            ];

            gantt.config.grid_width = 585;
            gantt.config.date_format = "%Y-%m-%d %H:%i:%s";
            gantt.config.readonly_property = "readonly";
            gantt.config.open_tree_initially = true;
            gantt.i18n.setLocale("it");

            gantt.ext.zoom.init({
                levels: [
                    { name: "day", scale_height: 50, scales: [{unit: "day", step: 1, format: "%d %M"}] },
                    { name: "week", scale_height: 50, scales: [{unit: "week", step: 1, format: "Sett. %W"}, {unit: "day", step: 1, format: "%d %M"}] },
                    { name: "month", scale_height: 50, scales: [{unit: "month", step: 1, format: "%F %Y"}, {unit: "week", step: 1, format: "Sett. %W"}] }
                ]
            });
            gantt.ext.zoom.setLevel("day");

            gantt.attachEvent("onAfterTaskUpdate", function(id, task){
                if (task.type === 'project') return;
                var start_utc = moment(task.start_date).utc().format('YYYY-MM-DD HH:mm:ss');
                var end_utc = moment(task.end_date).utc().format('YYYY-MM-DD 23:59:59');
                rpc.query({
                    model: 'project.task', method: 'write',
                    args: [[parseInt(id)], { 'date_start': start_utc, 'date_deadline': end_utc, 'progress': task.progress * 100 }]
                });
            });

            gantt.attachEvent("onAfterLinkAdd", function(id, link){
                var sourceId = parseInt(link.source);
                var targetId = parseInt(link.target);
                if (sourceId && targetId) {
                    rpc.query({
                        model: 'project.task', method: 'write',
                        args: [[targetId], { 'dependency_ids': [[4, sourceId]] }]
                    });
                }
            });

            gantt.attachEvent("onAfterLinkDelete", function(id, link){
                var sourceId = parseInt(link.source);
                var targetId = parseInt(link.target);
                if (sourceId && targetId) {
                    rpc.query({
                        model: 'project.task', method: 'write',
                        args: [[targetId], { 'dependency_ids': [[3, sourceId]] }]
                    });
                }
            });

            gantt.attachEvent("onTaskDblClick", function(id, e){
                var task = gantt.getTask(id);
                if (task.type !== 'project') {
                    this.do_action({
                        type: 'ir.actions.act_window',
                        res_model: 'project.task',
                        res_id: parseInt(id),
                        views: [[false, 'form']],
                        target: 'new'
                    });
                }
                return false;
            }.bind(this));

            gantt.init(this.$el.find('#dhtmlx_gantt_container')[0]);
            this.gantt_initialized = true;
        },

        _loadProjects: function () {
            var self = this;
            return rpc.query({
                model: 'project.project', method: 'search_read', fields: ['id', 'name']
            }).then(function (projects) {
                var $select = self.$el.find('#project_filter');
                $select.find('option:not([value="all"])').remove();
                projects.forEach(function (p) {
                    $select.append($('<option>', { value: p.id, text: p.name }));
                });
                if (self.current_project_id) {
                    $select.val(self.current_project_id);
                }
            });
        },

        _onProjectFilterChange: function (ev) {
            var projectId = $(ev.currentTarget).val();
            this.current_project_id = projectId !== 'all' ? parseInt(projectId) : false;
            this._loadAndRenderGantt();
        },

        _onUserFilterChange: function (ev) {
            var userId = $(ev.currentTarget).val();
            this.current_user_id = userId !== 'all' ? parseInt(userId) : false;
            if (this.gantt_initialized) gantt.refreshData();
        },

        _onSearchTaskInput: function (ev) {
            this.search_task_query = $(ev.currentTarget).val();
            if (this.gantt_initialized) gantt.refreshData();
        },

        _onChangeZoom: function (ev) {
            var $btn = $(ev.currentTarget);
            var mode = $btn.data('mode');
            this.$('.gantt-zoom-btn').removeClass('active btn-primary').addClass('btn-secondary');
            $btn.removeClass('btn-secondary').addClass('active btn-primary');
            gantt.ext.zoom.setLevel(mode);
        },

        _onTodayClick: function () {
            if (this.gantt_initialized) gantt.showDate(new Date());
        },

        _onToggleSidebar: function (ev) {
            if (this.gantt_initialized) {
                gantt.config.show_grid = !gantt.config.show_grid;
                gantt.render();
            }
        },

        _loadAndRenderGantt: function () {
            var self = this;
            var domain = [['date_start', '!=', false], ['date_deadline', '!=', false]];

            if (this.current_project_id) {
                domain.push(['project_id', '=', this.current_project_id]);
            }

            return rpc.query({
                model: 'project.task',
                method: 'search_read',
                args: [
                    domain,
                    ['name', 'date_start', 'date_deadline', 'progress', 'project_id', 'user_id', 'color', 'stage_id', 'dependency_ids'],
                    0, false, 'project_id, stage_id, sequence'
                ]
            }).then(function (tasks) {
                var dhtmlxTasks = [];
                var dhtmlxLinks = [];
                var projectsAdded = [];

                var odooColors = {
                    0: "#a8a8a8", 1: "#f06050", 2: "#f4a460", 3: "#f7cd1f",
                    4: "#6cc1ed", 5: "#814968", 6: "#eb7e7f", 7: "#2c8397",
                    8: "#475577", 9: "#d6145f", 10: "#30c381", 11: "#9365b8"
                };

                tasks.forEach(function(t) {
                    if (self.current_project_id && t.project_id && t.project_id[0] !== self.current_project_id) return;

                    var startLocal = moment.utc(t.date_start).local().format("YYYY-MM-DD 00:00:00");
                    var endLocal = moment.utc(t.date_deadline).local().format("YYYY-MM-DD 23:59:59");

                    var projId = t.project_id ? "proj_" + t.project_id[0] : "proj_0";
                    var projName = t.project_id ? t.project_id[1] : "Senza Progetto";

                    if (projectsAdded.indexOf(projId) === -1) {
                        dhtmlxTasks.push({ id: projId, text: projName, type: 'project', readonly: true, open: true, color: "#343a40", textColor: "#ffffff" });
                        projectsAdded.push(projId);
                    }

                    var taskColor = odooColors[t.color || 0] || odooColors[0];
                    dhtmlxTasks.push({
                        id: t.id, text: t.name, start_date: startLocal, end_date: endLocal, end_date_raw: moment.utc(t.date_deadline).local().toDate(),
                        progress: (t.progress || 0) / 100, parent: projId, user_id: t.user_id ? t.user_id[0] : false,
                        assignee: t.user_id ? t.user_id[1] : 'Nessuno', stage: t.stage_id ? t.stage_id[1] : '', color: taskColor
                    });

                    if (t.dependency_ids && t.dependency_ids.length > 0) {
                        t.dependency_ids.forEach(function(depId) {
                            dhtmlxLinks.push({ id: "link_" + depId + "_" + t.id, source: depId, target: t.id, type: "0" });
                        });
                    }
                });

                gantt.clearAll();
                gantt.parse({ data: dhtmlxTasks, links: dhtmlxLinks });
            });
        }
    });

    core.action_registry.add('custom_project_gantt', GanttView);
    return GanttView;
});