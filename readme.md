An internal, role-based web application for managing student admissions, payments, and administrative tasks for the Mondal Automobile Motor Training School.

This project digitizes the entire back-office workflow, moving from paper ledgers to a secure, persistent, and accessible digital platform. It is built with a serverless architecture using Firebase and is designed to be fast, responsive, and easy to use for all staff.



## 🚀 Key Features

### 👨‍💼 Core Record Management
* **Student Admission:** A comprehensive digital form for new student registration, including photo upload, document checklists, and contact details.
* **Out-Candidate Form:** A separate, dedicated form for managing out-candidate records.
* **Form 5 Generation:** Dynamically generate and print the official Form 5 Driving Certificate, complete with auto-incrementing serial numbers.
* **Powerful Search:** Find any record (Student, Out-Candidate, or Form 5) by A/C No., Serial No., Name, Mobile Number, Guardian Name, or DOB.

### 💳 Financial Management
* **Payment Ledger:** Per-student ledgers track total contract value, payments received, and remaining balance.
* **Receipt Generation:** Instantly print PDF payment receipts for the last transaction.
* **"Today's Revenue" (Staff):** A simple, at-a-glance card on the main dashboard for staff to reconcile their daily collection.

### 🛡️ Admin-Only Dashboard
A secure, separate dashboard accessible only to users with the "admin" role, providing deep business insights.
* **At-a-Glance Stats:** Key Performance Indicators (KPIs) like *Revenue Today*, *Pending Payments*, *Admissions Today*, and *Monthly Student Counts*.
* **Financial Chart:** A responsive bar chart (using Chart.js) comparing this month's revenue to last month's.
* **Detailed Payment Report:** A filterable, date-range report of all payments received across the entire business.
* **Operational Reports:**
    * **Pending Payments:** A master list of all students and out-candidates with a remaining balance.
    * **Student Follow-ups:** A list of students who failed their last Learner License (LL) test, enabling proactive follow-up.

### 🛠️ Utilities & Tools
* **PDF Printing:** Generate clean, printable PDF summaries for any student or out-candidate record.
* **CSV Data Export:** Securely export the entire Student, Out-Candidate, or Form 5 database as a CSV file for offline backups or analysis.
* **License Tracking:** A sub-ledger for tracking a student's Learner License (LL) test attempts, re-tests, and results.
* **Inactivity Logout:** Users are automatically logged out after a period of inactivity for enhanced security.

---

## 💻 Tech Stack

* **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript (ES6 Modules)
* **Backend (Serverless):** Google Firebase
    * **Authentication:** Firebase Auth (Email/Password)
    * **Database:** Firestore (NoSQL)
    * **File Storage:** Firebase Storage (for student photos)
* **Libraries:**
    * `jsPDF` & `jsPDF-autotable` for all PDF generation.
    * `Chart.js` for the admin dashboard's financial chart.

![This is a screenshot of the login page](https://i.ibb.co/ds31JPmc/Login-Page.png)
![This is a screenshot of the admin dashboard page](https://i.ibb.co/rKVHyBCV/Admin-Dashboard.png)
![This is a screenshot of the main dashboard page](https://i.ibb.co/MydjpVbF/Main-Dashboad.png)


---
