odoo.define('custom_gantt_project.GanttView', function (require) {
    "use strict";

    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var session = require('web.session');

    // Import Odoo translation core function
    var _t = core._t;

    var GanttView = AbstractAction.extend({
        template: 'CustomGantt.MainView',
        hasControlPanel: true,

        // ==========================================
        // 1. DOM EVENTS
        // ==========================================
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

        // ==========================================
        // 2. INITIALIZATION & SETUP
        // ==========================================
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
            this.dhtmlx_stages = [];
            this.all_stages_data = [];

            this.save_timers = {};
        },

        start: function () {
            var self = this;

            return this._super.apply(this, arguments).then(function () {
                session.user_has_group('project.group_project_manager').then(function (isManager) {
                    self.is_gantt_manager = isManager;

                    $.when(self._loadProjects(), self._loadUsers(), self._loadStages()).then(function() {
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
            });
        },

        destroy: function () {
            $(window).off('resize.dhtmlx_gantt');
            this._super.apply(this, arguments);
        },

        // ==========================================
        // 3. UI TOOLBAR ACTIONS
        // ==========================================
        _onExportPDF: function () {
            if (this.gantt_initialized && typeof gantt.exportToPDF !== "undefined") {
                var tasks = gantt.getTaskByTime();

                if (!tasks || tasks.length === 0) {
                    gantt.exportToPDF({
                        name: "Project_Planning.pdf",
                        header: "<h1>" + _t("Odoo Project Planning") + "</h1>",
                        locale: "en"
                    });
                    return;
                }

                var minDate = tasks[0].start_date;
                var maxDate = tasks[0].end_date;

                tasks.forEach(function(t) {
                    if (t.start_date < minDate) minDate = t.start_date;
                    if (t.end_date > maxDate) maxDate = t.end_date;
                });

                var exportStart = gantt.date.add(minDate, -7, "day");
                var exportEnd = gantt.date.add(maxDate, 7, "day");
                var formatStr = gantt.date.date_to_str(gantt.config.date_format);

                gantt.exportToPDF({
                    name: "Project_Planning.pdf",
                    header: "<h1>" + _t("Odoo Project Planning") + "</h1>",
                    locale: "en",
                    start: formatStr(exportStart),
                    end: formatStr(exportEnd),
                    server: "https://export.dhtmlx.com/gantt",
                    format: "A4",
                    orientation: "landscape"
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

        // ==========================================
        // 4. DATA FETCHING (ODOO RPC)
        // ==========================================
        _loadUsers: function () {
            var self = this;
            return rpc.query({
                model: 'res.users',
                method: 'search_read',
                domain: [['share', '=', false]],
                fields: ['id', 'name']
            }).then(function (users) {
                var $select = self.$el.find('#user_filter');
                self.dhtmlx_users = [{key: false, label: _t("Unassigned")}];

                users.forEach(function (u) {
                    $select.append($('<option>', { value: u.id, text: u.name }));
                    self.dhtmlx_users.push({key: u.id, label: u.name});
                });
            });
        },

        _loadStages: function () {
            var self = this;
            return rpc.query({
                model: 'project.task.type',
                method: 'search_read',
                fields: ['id', 'name', 'project_ids']
            }).then(function (stages) {
                self.all_stages_data = stages;
                self.dhtmlx_stages = [];
                stages.forEach(function (s) {
                    self.dhtmlx_stages.push({key: s.id, label: s.name});
                });
            });
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

        // ==========================================
        // 5. DHTMLX GANTT CONFIGURATION & EVENTS
        // ==========================================
        _initDHTMLXGantt: function () {
            var self = this;

            var userLang = session.user_context.lang || "en_US";
            var dhtmlxLang = userLang.split('_')[0];
            gantt.i18n.setLocale(dhtmlxLang);

            gantt.config.readonly = !self.is_gantt_manager;

            gantt.plugins({
                tooltip: true,
                drag_timeline: true,
                export_api: true
            });

            gantt.config.drag_timeline = {
                ignore: ".gantt_task_line, .gantt_task_link"
            };

            gantt.config.inclusive_end_dates = true;
            gantt.config.duration_unit = "day";
            gantt.config.show_grid = true;
            gantt.config.autoscroll = true;
            gantt.config.autoscroll_speed = 50;

            gantt.config.buttons_left = ["gantt_save_btn", "gantt_cancel_btn"];
            gantt.config.buttons_right = [];

            // --- CUSTOM LIGHTBOX CONTROLS ---
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
                           "<label style='font-weight: bold; font-size: 13px;'>" + _t("Start Date:") + " <input type='date' class='g-start-date' style='border: 1px solid #ced4da; padding: 4px 8px; border-radius: 4px; margin-left: 5px;'></label>" +
                           "<label style='font-weight: bold; font-size: 13px;'>" + _t("End Date:") + " <input type='date' class='g-end-date' style='border: 1px solid #ced4da; padding: 4px 8px; border-radius: 4px; margin-left: 5px;'></label>" +
                           "</div>";
                },
                set_value: function (node, value, task) {
                    var inpStart = node.querySelector(".g-start-date");
                    var inpEnd = node.querySelector(".g-end-date");

                    // Riempiamo i campi solo se il task ha date ed è attivo
                    if (task.start_date && !task.unscheduled) {
                        inpStart.value = moment(task.start_date).format("YYYY-MM-DD");
                    } else {
                        inpStart.value = "";
                    }

                    if (task.end_date && !task.unscheduled) {
                        inpEnd.value = moment(task.end_date).subtract(1, "days").format("YYYY-MM-DD");
                        inpEnd.min = inpStart.value;
                    } else {
                        inpEnd.value = "";
                        inpEnd.min = "";
                    }

                    inpStart.onchange = function() {
                        inpEnd.min = this.value;
                        if(inpEnd.value && inpEnd.value < this.value) inpEnd.value = this.value;
                    };
                    inpEnd.onchange = function() {
                        if(this.value && inpStart.value && this.value < inpStart.value) inpStart.value = this.value;
                    };
                },
                get_value: function (node, task) {
                    // Questa funzione restituisce solo l'oggetto puro letto dagli input,
                    // passandolo alla variabile mappa (task_dates).
                    // Ci assicureremo noi di processarlo su onLightboxSave!
                    return {
                        start_raw: node.querySelector(".g-start-date").value,
                        end_raw: node.querySelector(".g-end-date").value
                    };
                },
                focus: function (node) { node.querySelector(".g-start-date").focus(); }
            };

            gantt.form_blocks["custom_progress"] = {
                render: function (sns) {
                    return "<div class='gantt-custom-progress' style='padding: 5px 10px; display: flex; align-items: center; gap: 15px;'>" +
                           "<input type='range' class='g-progress-slider' min='0' max='100' step='5' style='flex-grow: 1; cursor: pointer;'>" +
                           "<span class='g-progress-value' style='font-weight: bold; width: 45px; text-align: right; color: #017e84;'>0%</span>" +
                           "</div>";
                },
                set_value: function (node, value, task) {
                    var slider = node.querySelector(".g-progress-slider");
                    var label = node.querySelector(".g-progress-value");
                    var val = Math.round((task.progress || 0) * 100);
                    slider.value = val;
                    label.innerText = val + "%";
                    slider.oninput = function() {
                        label.innerText = this.value + "%";
                    };
                },
                get_value: function (node, task) {
                    return parseInt(node.querySelector(".g-progress-slider").value) / 100;
                },
                focus: function (node) { }
            };

            // --- LIGHTBOX LOCALE & STRUCTURE ---
            gantt.locale.labels.section_description = _t("Task Name");
            gantt.locale.labels.section_stage = _t("Stage");
            gantt.locale.labels.section_user = _t("Assignee");
            gantt.locale.labels.section_color = _t("Odoo Color");
            gantt.locale.labels.section_progress = _t("Progress");
            gantt.locale.labels.section_time = _t("Time Period");

            gantt.serverList("users", self.dhtmlx_users);
            gantt.serverList("stages", self.dhtmlx_stages);

            var odooColorsData = [
                {key: 0, label: _t("Gray (Standard)"), color: "#a8a8a8"},
                {key: 1, label: _t("Red"), color: "#f06050"},
                {key: 2, label: _t("Orange"), color: "#f4a460"},
                {key: 3, label: _t("Yellow"), color: "#f7cd1f"},
                {key: 4, label: _t("Light Blue"), color: "#6cc1ed"},
                {key: 5, label: _t("Burgundy"), color: "#814968"},
                {key: 6, label: _t("Pink"), color: "#eb7e7f"},
                {key: 7, label: _t("Teal"), color: "#2c8397"},
                {key: 8, label: _t("Dark Blue"), color: "#475577"},
                {key: 9, label: _t("Magenta"), color: "#d6145f"},
                {key: 10, label: _t("Green"), color: "#30c381"},
                {key: 11, label: _t("Purple"), color: "#9365b8"}
            ];
            gantt.serverList("colors", odooColorsData);

            gantt.config.lightbox.sections = [
                {name: "description", height: 38, map_to: "text", type: "textarea", focus: true},
                {name: "stage", height: 30, map_to: "stage_id", type: "select", options: gantt.serverList("stages")},
                {name: "user", height: 30, map_to: "user_id", type: "select", options: gantt.serverList("users")},
                {name: "color", height: 45, map_to: "odoo_color_id", type: "custom_color", options: gantt.serverList("colors")},
                {name: "progress", height: 35, map_to: "progress", type: "custom_progress"},

                // IL NOME DELLA VARIABILE ORA COINCIDE ALLA PERFEZIONE CON ONLIGHTBOXSAVE
                {name: "time", height: 40, map_to: "task_dates", type: "custom_dates"}
            ];

            gantt.attachEvent("onBeforeLightbox", function(id) {
                var task = gantt.getTask(id);
                var projectId = false;

                if (task.parent && String(task.parent).indexOf("proj_") === 0) {
                    projectId = parseInt(task.parent.replace("proj_", ""));
                }

                var filteredStages = [];
                if (projectId && self.all_stages_data) {
                    self.all_stages_data.forEach(function (s) {
                        if (s.project_ids && s.project_ids.indexOf(projectId) !== -1) {
                            filteredStages.push({key: s.id, label: s.name});
                        }
                    });
                }

                var stagesToLoad = filteredStages.length > 0 ? filteredStages : self.dhtmlx_stages;

                var hasCurrentStage = stagesToLoad.find(function(s) { return s.key == task.stage_id; });
                if (task.stage_id && !hasCurrentStage) {
                    var currentStageData = self.all_stages_data.find(function(s) { return s.id == task.stage_id; });
                    if (currentStageData) {
                        stagesToLoad.push({key: currentStageData.id, label: currentStageData.name});
                    }
                }

                gantt.updateCollection("stages", stagesToLoad);
                return true;
            });

            // --- VISUAL FORMATTING ---
            gantt.templates.task_class = function(start, end, task) {
                if (task.type === 'project') return "";
                var now = new Date();
                var isOverdue = !task.unscheduled && task.end_date < now && task.progress < 1;
                return isOverdue ? "gantt_task_overdue" : "";
            };

            gantt.templates.timeline_cell_class = function (task, date) {
                var classes = [];
                if (date.getDay() === 0 || date.getDay() === 6) {
                    classes.push("weekend");
                }
                var today = new Date();
                if (date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear()) {
                    classes.push("gantt-today-line");
                }
                return classes.join(" ");
            };

            gantt.templates.tooltip_text = function(start, end, task) {
                if (task.unscheduled) {
                    return "<div style='padding: 5px; font-family: sans-serif;'>" +
                           "<h5 style='margin: 0 0 5px 0; color: #017e84; font-weight: bold;'>" + task.text + "</h5>" +
                           "<div style='font-size: 13px;'><i>" + _t("Unscheduled") + "</i></div></div>";
                }

                var start_str = moment(start).format('DD/MM/YYYY');
                var end_display = moment(end).clone().add(-1, 'days');
                var end_str = moment(end_display).format('DD/MM/YYYY');

                if (task.type === 'project') {
                    return "<div style='padding: 5px; font-family: sans-serif;'>" +
                           "<h5 style='margin: 0 0 5px 0; color: #017e84; font-weight: bold;'>📁 " + task.text + "</h5>" +
                           "<div style='font-size: 13px;'><b>" + _t("Start:") + "</b> " + start_str + "<br/><b>" + _t("End:") + "</b> " + end_str + "</div>" +
                           "</div>";
                }

                var progress = Math.round(task.progress * 100);
                var isOverdue = task.end_date < new Date() && task.progress < 1;
                var overdueWarning = isOverdue ? "<br/><b style='color: #dc3545;'>⚠️ " + _t("OVERDUE!") + "</b>" : "";

                return "<div style='padding: 5px; font-family: sans-serif;'>" +
                       "<h5 style='margin: 0 0 5px 0; color: #017e84; font-weight: bold;'>" + task.text + "</h5>" +
                       "<div style='font-size: 13px;'>" +
                       "<b>" + _t("Start:") + "</b> " + start_str + "<br/>" +
                       "<b>" + _t("End:") + "</b> " + end_str + "<br/>" +
                       "<b>" + _t("Assignee") + ":</b> " + task.assignee + "<br/>" +
                       "<b>" + _t("Stage") + ":</b> " + (task.stage || _t("N/A")) + "<br/>" +
                       "<b>" + _t("Progress:") + "</b> " + progress + "%" +
                       overdueWarning +
                       "</div></div>";
            };

            gantt.config.columns = [
                {name: "text", label: _t("Project / Task"), tree: true, width: 220, template: function(obj) {
                    if (obj.type === 'project') return obj.text;
                    var isOverdue = !obj.unscheduled && obj.end_date < new Date() && obj.progress < 1;
                    return isOverdue ? "⚠️ " + obj.text : obj.text;
                }},
                {name: "assignee", label: _t("Assignee"), align: "center", width: 110},
                {name: "stage", label: _t("Stage"), align: "center", width: 100, template: function(obj) {
                    if (obj.type === 'project' || !obj.stage) return "";
                    return "<span class='badge badge-secondary' style='font-size: 10px; font-weight: 500; padding: 2px 6px; border-radius: 10px; background-color: #6c757d; color: #fff; line-height: 1;'>" + obj.stage + "</span>";
                }},
                {name: "duration", label: _t("Duration"), align: "center", width: 70, template: function(obj) {
                    if (obj.type === 'project' || obj.unscheduled) return "";
                    return obj.duration + " " + _t("d");
                }},
                {name: "start_date", label: _t("Start"), align: "center", width: 85, template: function(obj) {
                    if (obj.type === 'project' || obj.unscheduled) return "-";
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
                    { name: "week", scale_height: 50, scales: [{unit: "week", step: 1, format: _t("Week %W")}, {unit: "day", step: 1, format: "%d %M"}] },
                    { name: "month", scale_height: 50, scales: [{unit: "month", step: 1, format: "%F %Y"}, {unit: "week", step: 1, format: _t("Week %W")}] }
                ]
            });
            gantt.ext.zoom.setLevel("day");

            // --- USER INTERACTION EVENTS ---
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

            gantt.attachEvent("onBeforeTaskUpdate", function(id, task) {
                if (task.type === 'project' || task.unscheduled) return true;
                if (task.start_date >= task.end_date) {
                    self.displayNotification({
                        title: _t("Date Error"),
                        message: _t("The start date must be before the end date."),
                        type: "danger"
                    });
                    return false;
                }
                return true;
            });

            gantt.attachEvent("onLightboxSave", function(id, task, is_new){

                // LE LETTURE FINALMENTE COINCIDONO CON IL MAP_TO "task_dates"
                if (task.task_dates) {
                    var startVal = task.task_dates.start_raw;
                    var endVal = task.task_dates.end_raw;

                    if (!startVal || !endVal) {
                        // Resettiamo a unscheduled e diamo date fittizie a DHTMLX
                        task.unscheduled = true;
                        var fallback = moment().startOf('day');
                        task.start_date = fallback.toDate();
                        task.end_date = fallback.add(1, "days").toDate();
                        task.duration = 1;
                    } else {
                        // Applichiamo le date corrette al task
                        task.unscheduled = false;
                        var start = moment(startVal, "YYYY-MM-DD").toDate();
                        var end = moment(endVal, "YYYY-MM-DD").add(1, "days").toDate(); // Offset per inclusione interna DHTMLX

                        task.start_date = start;
                        task.end_date = end;
                        task.duration = gantt.calculateDuration(start, end);
                    }
                }

                var selectedColorObj = odooColorsData.find(function(c) { return c.key == task.odoo_color_id; });
                task.color = selectedColorObj ? selectedColorObj.color : odooColorsData[0].color;

                var userObj = gantt.serverList("users").find(function(u) { return u.key == task.user_id; });
                task.assignee = userObj ? userObj.label : _t("Unassigned");

                var stageObj = gantt.serverList("stages").find(function(s) { return s.key == task.stage_id; });
                task.stage = stageObj ? stageObj.label : _t("N/A");

                return true;
            });

            gantt.attachEvent("onAfterTaskUpdate", function(id, task){
                if (task.type === 'project') return;

                // Passiamo le date testuali perfette a Odoo (YYYY-MM-DD)
                var start_out = (!task.unscheduled && task.start_date) ? moment(task.start_date).format('YYYY-MM-DD') : false;
                var end_out = (!task.unscheduled && task.end_date) ? moment(task.end_date).subtract(1, 'days').format('YYYY-MM-DD') : false;

                if (self.save_timers[id]) {
                    clearTimeout(self.save_timers[id]);
                }

                self.save_timers[id] = setTimeout(function() {
                    rpc.query({
                        model: 'project.task', method: 'write',
                        args: [[parseInt(id)], {
                            'name': task.text,
                            'user_id': task.user_id ? parseInt(task.user_id) : false,
                            'stage_id': task.stage_id ? parseInt(task.stage_id) : false,
                            'color': task.odoo_color_id ? parseInt(task.odoo_color_id) : 0,
                            'date_start': start_out,
                            'date_deadline': end_out,
                            'progress': task.progress * 100
                        }]
                    }).then(function() {
                        delete self.save_timers[id];
                    });
                }, 400);
            });

            gantt.attachEvent("onBeforeLinkAdd", function(id, link) {
                var sourceTask = gantt.getTask(link.source);
                var targetTask = gantt.getTask(link.target);

                if (sourceTask.parent !== targetTask.parent) {
                    self.displayNotification({
                        title: _t("Invalid Link"),
                        message: _t("You cannot link tasks belonging to different projects."),
                        type: "danger"
                    });
                    return false;
                }

                if (sourceTask.type === 'project' || targetTask.type === 'project') {
                    return false;
                }

                return true;
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

        // ==========================================
        // 6. MAIN GANTT DATA RENDER
        // ==========================================
        _loadAndRenderGantt: function () {
            var self = this;

            var domain = [];

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

                var minDate = moment();
                var maxDate = moment();

                var odooColors = {
                    0: "#a8a8a8", 1: "#f06050", 2: "#f4a460", 3: "#f7cd1f",
                    4: "#6cc1ed", 5: "#814968", 6: "#eb7e7f", 7: "#2c8397",
                    8: "#475577", 9: "#d6145f", 10: "#30c381", 11: "#9365b8"
                };

                tasks.forEach(function(t) {
                    if (self.current_project_id && t.project_id && t.project_id[0] !== self.current_project_id) return;

                    var projId = t.project_id ? "proj_" + t.project_id[0] : "proj_0";
                    var projName = t.project_id ? t.project_id[1] : _t("No Project");

                    if (projectsAdded.indexOf(projId) === -1) {
                        dhtmlxTasks.push({ id: projId, text: projName, type: 'project', readonly: true, open: true, color: "#343a40", textColor: "#ffffff" });
                        projectsAdded.push(projId);
                    }

                    var taskColor = odooColors[t.color || 0] || odooColors[0];

                    var taskObj = {
                        id: t.id, text: t.name, progress: (t.progress || 0) / 100,
                        parent: projId, user_id: t.user_id ? t.user_id[0] : false,
                        stage_id: t.stage_id ? t.stage_id[0] : false,
                        odoo_color_id: t.color || 0,
                        assignee: t.user_id ? t.user_id[1] : _t("Unassigned"), stage: t.stage_id ? t.stage_id[1] : '', color: taskColor
                    };

                    if (t.date_start && t.date_deadline) {
                        var startStr = t.date_start.split(' ')[0];
                        var endStr = t.date_deadline.split(' ')[0];

                        var startLocal = moment(startStr, "YYYY-MM-DD");
                        var endLocal = moment(endStr, "YYYY-MM-DD").add(1, 'days');

                        if (startLocal.isBefore(minDate)) minDate = startLocal.clone();
                        if (endLocal.isAfter(maxDate)) maxDate = endLocal.clone();

                        taskObj.start_date = startLocal.toDate();
                        taskObj.end_date = endLocal.toDate();
                        taskObj.unscheduled = false;
                    } else {
                        taskObj.unscheduled = true;
                        var fallbackDate = moment().startOf('day');
                        taskObj.start_date = fallbackDate.toDate();
                        taskObj.end_date = fallbackDate.clone().add(1, 'days').toDate();
                    }

                    dhtmlxTasks.push(taskObj);

                    if (t.dependency_ids && t.dependency_ids.length > 0) {
                        t.dependency_ids.forEach(function(depId) {
                            dhtmlxLinks.push({ id: "link_" + depId + "_" + t.id, source: depId, target: t.id, type: "0" });
                        });
                    }
                });

                gantt.config.start_date = minDate.clone().subtract(3, 'months').toDate();
                gantt.config.end_date = maxDate.clone().add(12, 'months').toDate();

                gantt.clearAll();
                gantt.parse({ data: dhtmlxTasks, links: dhtmlxLinks });
            });
        }
    });

    core.action_registry.add('custom_project_gantt', GanttView);
    return GanttView;
});