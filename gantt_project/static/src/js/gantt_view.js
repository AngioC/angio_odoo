odoo.define('custom_gantt_project.GanttView', function (require) {
    "use strict";

    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var ajax = require('web.ajax');

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
            'click .gantt-zoom-in-btn': '_onZoomIn',
            'click .gantt-zoom-out-btn': '_onZoomOut',
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

            this.dhtmlx_users = [];
        },

        start: function () {
            var self = this;

            return this._super.apply(this, arguments).then(function () {
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
            if (this.gantt_initialized) {
                var $icon = this.$('.gantt-refresh-btn i');
                $icon.addClass('fa-spin');

                this._loadAndRenderGantt().then(function() {
                    $icon.removeClass('fa-spin');
                });
            }
        },

        _onChangeZoom: function (ev) {
            var mode = $(ev.currentTarget).data('mode');
            gantt.ext.zoom.setLevel(mode);
            this._syncZoomButtons();
        },

        _onZoomIn: function () {
            if (this.gantt_initialized) {
                gantt.ext.zoom.zoomIn();
                this._syncZoomButtons();
            }
        },

        _onZoomOut: function () {
            if (this.gantt_initialized) {
                gantt.ext.zoom.zoomOut();
                this._syncZoomButtons();
            }
        },

        _syncZoomButtons: function () {
            var currentLevel = gantt.ext.zoom.getCurrentLevel();
            this.$('.gantt-zoom-btn').removeClass('active btn-primary').addClass('btn-secondary');
            this.$('.gantt-zoom-btn[data-mode="' + currentLevel + '"]').removeClass('btn-secondary').addClass('active btn-primary');
        },

        _loadUsers: function () {
            var self = this;
            return rpc.query({
                model: 'res.users',
                method: 'search_read',
                domain: [['share', '=', false]],
                fields: ['id', 'name']
            }).then(function (users) {
                var $select = self.$el.find('#user_filter');
                self.dhtmlx_users = [{key: false, label: "Nessuno"}];

                users.forEach(function (u) {
                    $select.append($('<option>', { value: u.id, text: u.name }));
                    self.dhtmlx_users.push({key: u.id, label: u.name});
                });
            });
        },

        _initDHTMLXGantt: function () {
            var self = this;

            // 1. IMPOSTIAMO LA LINGUA PER PRIMA COSA (per evitare che sovrascriva le label dopo)
            gantt.i18n.setLocale("it");

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

            // --- RIMOZIONE BOTTONE ELIMINA ---
            gantt.config.buttons_left = ["gantt_save_btn", "gantt_cancel_btn"];
            gantt.config.buttons_right = [];

            // --- REGISTRAZIONE CONTROLLI CUSTOM (COLORI E DATE) ---
            gantt.form_blocks["custom_color"] = {
                render: function (sns) {
                    var html = "<div class='gantt-custom-colors' style='padding: 5px 10px; display: flex; flex-wrap: wrap; gap: 8px;'>";
                    sns.options.forEach(function(opt) {
                        html += "<div class='color-swatch' data-val='" + opt.key + "' title='" + opt.label + "' style='width: 28px; height: 28px; border-radius: 50%; background-color: " + opt.color + "; cursor: pointer; border: 2px solid transparent; transition: 0.1s; box-shadow: 0 1px 3px rgba(0,0,0,0.3);'></div>";
                    });
                    html += "</div>";
                    return html;
                },
                set_value: function (node, value, task) {
                    var swatches = node.querySelectorAll(".color-swatch");
                    swatches.forEach(function(s) {
                        s.style.border = "2px solid transparent";
                        s.style.transform = "scale(1)";
                        if (s.getAttribute("data-val") == (value || 0)) {
                            s.style.border = "2px solid #212529";
                            s.style.transform = "scale(1.1)";
                        }
                        s.onclick = function() {
                            swatches.forEach(function(el) {
                                el.style.border = "2px solid transparent";
                                el.style.transform = "scale(1)";
                            });
                            this.style.border = "2px solid #212529";
                            this.style.transform = "scale(1.1)";
                            node.setAttribute("data-selected", this.getAttribute("data-val"));
                        };
                    });
                    node.setAttribute("data-selected", value || 0);
                },
                get_value: function (node, task) {
                    return node.getAttribute("data-selected");
                },
                focus: function (node) {}
            };

            gantt.form_blocks["custom_dates"] = {
                render: function (sns) {
                    return "<div class='gantt-custom-dates' style='padding: 5px 10px; display: flex; align-items: center; gap: 15px;'>" +
                           "<label style='font-weight: bold; font-size: 13px;'>Data Inizio: <input type='date' class='g-start-date' style='border: 1px solid #ced4da; padding: 4px 8px; border-radius: 4px; margin-left: 5px;'></label>" +
                           "<label style='font-weight: bold; font-size: 13px;'>Data Fine: <input type='date' class='g-end-date' style='border: 1px solid #ced4da; padding: 4px 8px; border-radius: 4px; margin-left: 5px;'></label>" +
                           "</div>";
                },
                set_value: function (node, value, task) {
                    var inpStart = node.querySelector(".g-start-date");
                    var inpEnd = node.querySelector(".g-end-date");
                    var format = gantt.date.date_to_str("%Y-%m-%d");

                    inpStart.value = format(task.start_date);

                    var displayEnd = new Date(task.end_date);
                    if (gantt.config.inclusive_end_dates) {
                        displayEnd = gantt.date.add(displayEnd, -1, "day");
                    }
                    inpEnd.value = format(displayEnd);

                    inpEnd.min = inpStart.value;

                    inpStart.onchange = function() {
                        inpEnd.min = this.value;
                        if(inpEnd.value < this.value) inpEnd.value = this.value;
                    };
                    inpEnd.onchange = function() {
                        if(this.value < inpStart.value) inpStart.value = this.value;
                    };
                },
                get_value: function (node, task) {
                    var parse = gantt.date.str_to_date("%Y-%m-%d");
                    var start = parse(node.querySelector(".g-start-date").value);
                    var end = parse(node.querySelector(".g-end-date").value);

                    if (gantt.config.inclusive_end_dates) {
                        end = gantt.date.add(end, 1, "day");
                    }

                    return {
                        start_date: start,
                        end_date: end,
                        duration: gantt.calculateDuration(start, end)
                    };
                },
                focus: function (node) { node.querySelector(".g-start-date").focus(); }
            };

            // --- CONFIGURAZIONE SEZIONI LIGHTBOX E TESTI TRADOTTI ---
            gantt.locale.labels.section_description = "Nome Task";
            gantt.locale.labels.section_user = "Assegnatario";
            gantt.locale.labels.section_color = "Colore";
            gantt.locale.labels.section_time = "Periodo";

            gantt.serverList("users", self.dhtmlx_users);

            var odooColorsData = [
                {key: 0, label: "Grigio (Standard)", color: "#a8a8a8"},
                {key: 1, label: "Rosso", color: "#f06050"},
                {key: 2, label: "Arancione", color: "#f4a460"},
                {key: 3, label: "Giallo", color: "#f7cd1f"},
                {key: 4, label: "Azzurro", color: "#6cc1ed"},
                {key: 5, label: "Bordeaux", color: "#814968"},
                {key: 6, label: "Rosa", color: "#eb7e7f"},
                {key: 7, label: "Ottanio", color: "#2c8397"},
                {key: 8, label: "Blu Scuro", color: "#475577"},
                {key: 9, label: "Magenta", color: "#d6145f"},
                {key: 10, label: "Verde", color: "#30c381"},
                {key: 11, label: "Viola", color: "#9365b8"}
            ];
            gantt.serverList("colors", odooColorsData);

            gantt.config.lightbox.sections = [
                {name: "description", height: 38, map_to: "text", type: "textarea", focus: true},
                {name: "user", height: 30, map_to: "user_id", type: "select", options: gantt.serverList("users")},
                {name: "color", height: 45, map_to: "odoo_color_id", type: "custom_color", options: gantt.serverList("colors")},
                {name: "time", height: 40, map_to: "auto", type: "custom_dates"}
            ];

            // ------------------------------------------

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

            gantt.ext.zoom.init({
                levels: [
                    { name: "day", scale_height: 50, scales: [{unit: "day", step: 1, format: "%d %M"}] },
                    { name: "week", scale_height: 50, scales: [{unit: "week", step: 1, format: "Sett. %W"}, {unit: "day", step: 1, format: "%d %M"}] },
                    { name: "month", scale_height: 50, scales: [{unit: "month", step: 1, format: "%F %Y"}, {unit: "week", step: 1, format: "Sett. %W"}] }
                ]
            });
            gantt.ext.zoom.setLevel("day");

            gantt.attachEvent("onBeforeTaskUpdate", function(id, task) {
                if (task.type === 'project') return true;
                if (task.start_date >= task.end_date) {
                    self.displayNotification({
                        title: "Errore Date",
                        message: "La data di inizio deve essere precedente alla data di fine.",
                        type: "danger"
                    });
                    return false;
                }
                return true;
            });

            gantt.attachEvent("onLightboxSave", function(id, task, is_new){
                var selectedColorObj = odooColorsData.find(function(c) { return c.key == task.odoo_color_id; });
                task.color = selectedColorObj ? selectedColorObj.color : odooColorsData[0].color;

                var userObj = gantt.serverList("users").find(function(u) { return u.key == task.user_id; });
                task.assignee = userObj ? userObj.label : 'Nessuno';

                return true;
            });

            gantt.attachEvent("onAfterTaskUpdate", function(id, task){
                if (task.type === 'project') return;
                var start_utc = moment(task.start_date).utc().format('YYYY-MM-DD HH:mm:ss');
                var end_utc = moment(task.end_date).utc().format('YYYY-MM-DD 23:59:59');

                rpc.query({
                    model: 'project.task', method: 'write',
                    args: [[parseInt(id)], {
                        'name': task.text,
                        'user_id': task.user_id ? parseInt(task.user_id) : false,
                        'color': task.odoo_color_id ? parseInt(task.odoo_color_id) : 0,
                        'date_start': start_utc,
                        'date_deadline': end_utc,
                        'progress': task.progress * 100
                    }]
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
                if (task.type === 'project') {
                    return false;
                }
                return true;
            });

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
                        odoo_color_id: t.color || 0,
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