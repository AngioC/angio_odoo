# Admin Access Request (Odoo 14)

This module introduces a secure and traceable system to manage temporary administrative access requests in Odoo. Instead of sharing main administrator credentials or creating new users on the fly, the module allows temporarily unlocking **dedicated service accounts** and then freezing them and invalidating their passwords once the intervention is complete.

## 🚀 Key Features

* **Complete Traceability:** Standard users can submit access requests with justifications. All history and decisions remain logged.

* **Automatic Notifications:** Automatic creation of activities (To-Do) for administrators upon receiving a new request.

* **Zero-Trust Security:** The system uses previously "Archived" service accounts. Approval temporarily unlocks the account.

* **Hard Reset on Revocation:** When an administrator revokes access, the account is archived again and its password is overwritten with a random encrypted string of 20 characters (letters, numbers, and symbols). This makes unauthorized future access with old credentials impossible, even in case of accidental account unlocking.

* **Privacy:** Standard users do not see which system account is assigned for the job; the field is visible only to administrators.

## 🛠 Requirements and Dependencies

* **Odoo Version:** 14.0

* **Dependencies:** `base`, `mail`

## ⚙️ Installation

1. Copy the `admin_access_request` folder into the addons directory of your Odoo server.

2. Restart the Odoo service.

3. Enable **Developer Mode**.

4. Go to **Apps > Update Apps List**.

5. Search for `Admin Access Request` and click **Install**.

## 🔒 Initial Configuration (Important!)

For the module to work correctly, the system administrator must first create the **Service Accounts**:

1. Go to **Settings > Users & Companies > Users**.

2. Create a new internal user (e.g., `Admin Support 1`, login: `support1@yourdomain.com`).

3. Assign this user the maximum rights (Administrator).

4. Set an initial complex password (Action > Change Password). **Note:** this password must be manually changed by the admin for each new use of the account.

5. From the "Action" menu, select **Archive**. The user will now be deactivated and ready to be used by the module.

## 📖 User Guide

### For the Standard User:

1. Access the main Odoo dashboard and click on the **Admin Requests** app.

2. Click on **Create**.

3. Enter the **Reason** you need access and click on **Submit Request**.

4. Wait for the administrator to contact you privately to provide the credentials for the unlocked temporary account.

### For the Administrator:

1. When you receive a request, go to the **Admin Requests** app and open the record in the "Submitted/Waiting" status.

2. In the **Dedicated Account** field, select the archived service account you want to assign (e.g., `Admin Support 1`).

3. Go to a new tab in **Settings > Users** (removing the "Active" filter), find the account, set a new password known to you, and communicate it privately to the requester.

4. Return to the request and click on **Approve and Generate Account**. (The account will be automatically unlocked/reactivated).

5. When the requester's intervention is completed, open the record and click on **Revoke Access**. The account will be immediately locked and its password destroyed (overwritten with an unreadable hash).

Credits
=======

Contributors
------------

* AngioC

Maintainer
----------

* AngioC