.. image:: https://img.shields.io/badge/licence-AGPL--3-blue.svg
   :alt: License

============================
📊 Odoo Custom Project Gantt
============================

An Odoo (v14) module that integrates the powerful **DHTMLX Gantt** library within the Odoo ecosystem, providing an interactive, modern, and fully responsive project scheduling interface.

The module is designed to work both as a **Global Dashboard** (all projects) and as a **Detail View** (single project accessed via Smart Button), keeping Odoo's native navigation (Breadcrumbs) intact.

✨ Key Features
================

* **Interactive Scheduling (Drag & Drop):** Edit start/end dates and progress (percentage) of tasks by dragging the bars directly on the chart.
* **Integrated Quick Edit (Lightbox):** Double-click a task to open a lightning-fast panel (without reloading the page) to edit Name, Assignee, Dates (with HTML5 controls), Progress (via interactive slider), Color (with native visual picker), and Stage (dynamically filtered based on the project it belongs to).
* **Secure Dependency Management:** Create and remove relationships (Finish-to-Start) by linking the connection "dots" on the sides of the bars. The system proactively blocks the creation of invalid links (e.g., between tasks of different projects), both on the Gantt and in Odoo's native views.
* **Data Integrity and Security (RBAC):**

  * **Date Validation:** Strict control to prevent end dates before start dates, managed via dual validation (frontend for fluidity, Python constraints in backend for security).
  * **Permissions Management:** Automatic integration with Odoo's native groups. Standard users operate in view-only mode (Automated Read-Only), while "Project Managers" enable drag & drop and editing.

* **Infinite Timeline:** Dynamically extended workspace (months before and after tasks) with automatic scrolling (``autoscroll``) when dragging bars towards the edges of the screen.
* **Dual View Mode:**

  * *Global View:* Accessible from the menu, shows all projects with filtering capabilities.
  * *Single Project View:* Accessible from the "Gantt View" Smart Button inside a project form. Hides the project filter and shows only the relevant task tree.

* **Visual Alerts and Design (UX):**

  * Tasks that have passed their deadline and are not 100% complete are highlighted with emergency red striped graphics and a ⚠️ icon.
  * Stage statuses rendered as compact, elegant, and neutral badges.
  * Ability to hide or show the left side table (Tree View) via a toggle button (☰) to maximize space.

* **Quick Filters:**

  * Live search by **Task Name**.
  * Dynamic filter by **Assignee** (populated with Odoo internal users).

* **Export and Advanced Tools:**

  * **Smart PDF Export:** Automatically crops and centers the document, isolating the exact period of the tasks to ensure lightweight files and perfect layout in landscape format.
  * Multiple **Zoom** levels (Day, Week, Month) supported by quick zoom in/out buttons (+ and -).
  * **Refresh** button to reload background data (AJAX) without refreshing the web page.
  * **Today** button to quickly center the timeline.

📦 Dependencies
===============

This module requires the installation of the following core Odoo modules:

* ``project`` (Projects - for task and project management)
* ``web`` (Core UI - implicit in every visual module)

🚀 Installation and Usage
=========================

1. Place the module folder (e.g., ``custom_gantt_project``) inside the ``addons`` directory of your Odoo instance.
2. Restart the Odoo service and update the Apps List.
3. Install the module.

How to access the view:
-----------------------

* **Projects Main Menu:** Click on the created menu item to access the general overview.
* **Single Project:** Open the Projects app, enter a specific project form, and click the **"Gantt View"** Smart Button in the top right corner.

Credits
=======

Contributors
------------

* AngioC

Maintainer
----------

* AngioC