// --- IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    getCountFromServer, // Import getCountFromServer
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FIREBASE CONFIG (Copy from app.js) ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// --- INITIALIZE ---
let db, auth;
try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase init failed", error);
    document.body.innerHTML = "Error connecting to database.";
}

// --- ADD THIS HELPER FUNCTION ---
function formatDateDDMMYYYY(dateString) {
    if (!dateString) return 'N/A'; // Handle empty input
    try {
        const parts = dateString.split('-'); // Input is YYYY-MM-DD
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day}/${month}/${year}`;
        }
        return dateString; // Return original if format is unexpected
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString; // Return original on error
    }
}
// --- END OF HELPER FUNCTION ---

// --- ADMIN SECURITY GATEKEEPER ---
onAuthStateChanged(auth, async(user) => {
    if (user) {
        // User is logged in, check their role
        const userRole = await fetchUserRole(user.uid);
        if (userRole === "admin") {
            // Access Granted: Hook up logout button and load data
            const logoutBtn = document.getElementById("logout-btn");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", () => signOut(auth));
            }
            loadAllAdminData();
            setupTabs(); // Run the new tab setup function
            setupDrilldown(); // --- ADD THIS LINE ---

            // --- ADD THIS NEW BLOCK ---
            // Initialize the new Payment Report tab
            const reportFromDateInput = document.getElementById("report-from-date");
            const reportToDateInput = document.getElementById("report-to-date");
            const generateReportBtn = document.getElementById("generate-report-btn");

            if (generateReportBtn) {
                // Set default dates to today
                const today = new Date().toISOString().split('T')[0];
                if (reportFromDateInput) reportFromDateInput.value = today;
                if (reportToDateInput) reportToDateInput.value = today;

                // Attach the click event listener
                generateReportBtn.addEventListener("click", fetchPaymentReport);
            }
            // --- END OF NEW BLOCK ---
        } else {
            // Access Denied: Not an admin
            window.location.href = 'index.html'; // Kick to main portal
        }
    } else {
        // Access Denied: Not logged in
        window.location.href = 'login.html'; // Kick to login
    }
});

async function fetchUserRole(uid) {
    try {
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().role) {
            return userDocSnap.data().role;
        }
        return "staff"; // Default to 'staff' if no role
    } catch (error) {
        return "staff"; // Default to 'staff' on error
    }
}

// --- NEW: TAB SWITCHING LOGIC ---
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get the target tab from data attribute
            const targetTab = button.getAttribute('data-tab');

            // Deactivate all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // Activate the clicked button
            button.classList.add('active');

            // Hide all content
            tabContents.forEach(content => content.classList.remove('active'));
            // Show the target content
            document.getElementById(targetTab + '-tab').classList.add('active');
        });
    });
}

// --- UPDATED: DRILL-DOWN CLICK LOGIC ---
function setupDrilldown() {
    // Find all the clickable cards that should switch tabs
    const drilldownTabCards = [
        document.getElementById("drilldown-operations"),
        document.getElementById("drilldown-students"),
        document.getElementById("drilldown-today") // <-- ADD THIS LINE
    ];

    drilldownTabCards.forEach(card => {
        if (card) { // Check if the card element exists
            card.addEventListener('click', () => {
                const targetTabId = card.getAttribute('data-target-tab');
                if (targetTabId) {
                    // Find the button that corresponds to this tab ID
                    const targetButton = document.querySelector(`.tab-btn[data-tab="${targetTabId}"]`);
                    if (targetButton) {
                        targetButton.click(); // Simulate a click on the tab button
                    }
                }
            });
        }
    });
}

// --- MAIN DATA LOADER ---
async function loadAllAdminData() {
    // Run all data-loading functions at the same time
    await Promise.all([
        loadAtAGlanceStats(),
        loadFinancialTab(),
        loadOperationsTab(),
        loadStudentInsightsTab(),
        loadAdmissionsTodayTab()
    ]);

    // All data is loaded, show the content
    document.getElementById("stats-loader").classList.add("hidden");
    document.getElementById("admin-content").classList.remove("hidden");
}

// --- 1. "AT-A-GLANCE" STATS ---
// --- 1. "AT-A-GLANCE" STATS ---
async function loadAtAGlanceStats() {
    const todayAdmissionsEl = document.getElementById("stat-today-admissions");
    const todayRevenueEl = document.getElementById("stat-today-revenue");
    const monthRevenueEl = document.getElementById("stat-month-revenue");
    const pendingCountEl = document.getElementById("stat-pending-count");
    const followupCountEl = document.getElementById("stat-followup-count");
    // --- ADD THESE TWO NEW LINES ---
    const monthStudentsEl = document.getElementById("stat-month-students");
    const monthOutEl = document.getElementById("stat-month-out");

    const now = new Date();
    const todayStart = Timestamp.fromDate(new Date(now.setHours(0, 0, 0, 0)));
    const todayEnd = Timestamp.fromDate(new Date(now.setHours(23, 59, 59, 999)));
    const todayString = new Date(todayStart.toMillis()).toISOString().split('T')[0];

    const thisMonthStart = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const thisMonthEnd = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));
    // --- ADD THESE TWO NEW LINES ---
    const monthStartString = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEndString = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];


    // --- Admissions Today ---
    try {
        const studentsQuery = query(collection(db, "students"), where("admission-date", "==", todayString));
        const outQuery = query(collection(db, "out-candidates"), where("admission-date", "==", todayString));

        const [studentCount, outCount] = await Promise.all([
            getCountFromServer(studentsQuery),
            getCountFromServer(outQuery)
        ]);

        todayAdmissionsEl.textContent = (studentCount.data().count + outCount.data().count).toString();
    } catch (error) {
        console.error("Error fetching today's admissions:", error);
        todayAdmissionsEl.textContent = "Error";
    }

    // --- Revenue Today & This Month ---
    try {
        const paymentsRef = collection(db, "payments");
        const qToday = query(paymentsRef, where("date", ">=", todayStart), where("date", "<=", todayEnd));
        const qThisMonth = query(paymentsRef, where("date", ">=", thisMonthStart), where("date", "<=", thisMonthEnd));

        const [todaySnapshot, thisMonthSnapshot] = await Promise.all([
            getDocs(qToday),
            getDocs(qThisMonth)
        ]);

        let todayTotal = 0;
        todaySnapshot.forEach(doc => todayTotal += Number(doc.data().amount));
        todayRevenueEl.textContent = `₹${todayTotal.toLocaleString("en-IN")}`;

        let thisMonthTotal = 0;
        thisMonthSnapshot.forEach(doc => thisMonthTotal += Number(doc.data().amount));
        monthRevenueEl.textContent = `₹${thisMonthTotal.toLocaleString("en-IN")}`;
    } catch (error) {
        console.error("Error fetching revenue stats:", error);
        todayRevenueEl.textContent = "Error";
        monthRevenueEl.textContent = "Error";
    }

    // --- Pending Payments Count ---
    try {
        const studentsQuery = query(collection(db, "students"), where("remaining-balance", ">", 0));
        const outQuery = query(collection(db, "out-candidates"), where("remaining-balance", ">", 0));

        const [studentCount, outCount] = await Promise.all([
            getCountFromServer(studentsQuery),
            getCountFromServer(outQuery)
        ]);

        pendingCountEl.textContent = (studentCount.data().count + outCount.data().count).toString();
    } catch (error) {
        console.error("Error fetching pending payment count:", error);
        pendingCountEl.textContent = "Error";
    }

    // --- NEW: Admissions This Month (Students) ---
    try {
        const studentsQuery = query(collection(db, "students"),
            where("admission-date", ">=", monthStartString),
            where("admission-date", "<=", monthEndString));
        const studentCount = await getCountFromServer(studentsQuery);
        monthStudentsEl.textContent = studentCount.data().count.toString();
    } catch (error) {
        console.error("Error fetching monthly students:", error);
        monthStudentsEl.textContent = "Error";
    }

    // --- NEW: Admissions This Month (Out-Candidates) ---
    try {
        const outQuery = query(collection(db, "out-candidates"),
            where("admission-date", ">=", monthStartString),
            where("admission-date", "<=", monthEndString));
        const outCount = await getCountFromServer(outQuery);
        monthOutEl.textContent = outCount.data().count.toString();
    } catch (error) {
        console.error("Error fetching monthly out-candidates:", error);
        monthOutEl.textContent = "Error";
    }

    // --- NEW: Student Follow-ups Count ---
    try {
        const studentsRef = collection(db, "students");
        const studentSnapshot = await getDocs(studentsRef);
        let followUpCount = 0;

        studentSnapshot.forEach(doc => {
            const licenses = doc.data().learnerLicenses || [];
            if (licenses.length > 0) {
                const lastLicense = licenses[licenses.length - 1];
                let lastResult = lastLicense.retestResult || lastLicense.testResult;
                if (lastResult === 'Fail') {
                    followUpCount++;
                }
            }
        });
        followupCountEl.textContent = followUpCount.toString();
    } catch (error) {
        console.error("Error fetching followup count:", error);
        followupCountEl.textContent = "Error";
    }
}

// --- 2. FINANCIAL TAB (Graph) ---
async function loadFinancialTab() {
    const now = new Date();
    const thisMonthStart = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const thisMonthEnd = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));
    const lastMonthStart = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59));

    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    const paymentsRef = collection(db, "payments");

    try {
        // Get This Month's Revenue
        const qThisMonth = query(paymentsRef, where("date", ">=", thisMonthStart), where("date", "<=", thisMonthEnd));
        const thisMonthSnapshot = await getDocs(qThisMonth);
        thisMonthSnapshot.forEach(doc => thisMonthTotal += Number(doc.data().amount));

        // Get Last Month's Revenue
        const qLastMonth = query(paymentsRef, where("date", ">=", lastMonthStart), where("date", "<=", lastMonthEnd));
        const lastMonthSnapshot = await getDocs(qLastMonth);
        lastMonthSnapshot.forEach(doc => lastMonthTotal += Number(doc.data().amount));

        // Draw the chart
        drawRevenueChart(thisMonthTotal, lastMonthTotal);
    } catch (error) {
        console.error("Error fetching financial chart data:", error);
    }
}

function drawRevenueChart(thisMonthTotal, lastMonthTotal) {
    const ctx = document.getElementById('revenue-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Last Month', 'This Month'],
            datasets: [{
                label: 'Total Revenue',
                data: [lastMonthTotal, thisMonthTotal],
                backgroundColor: ['rgba(156, 163, 175, 0.6)', 'rgba(79, 70, 229, 0.6)'],
                borderColor: ['rgba(156, 163, 175, 1)', 'rgba(79, 70, 229, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // This is key to fit our new container
            scales: { y: { beginAtZero: true, ticks: { callback: value => '₹' + value.toLocaleString('en-IN') } } },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: context => '₹' + context.parsed.y.toLocaleString('en-IN') } }
            }
        }
    });
}

// --- 3. OPERATIONS TAB (Pending Payments Table) ---
async function loadOperationsTab() {
    const tableBody = document.getElementById("pending-payments-table");
    tableBody.innerHTML = ""; // Clear
    let resultsFound = false;

    try {
        const studentsQuery = query(collection(db, "students"), where("remaining-balance", ">", 0));
        const outCandidatesQuery = query(collection(db, "out-candidates"), where("remaining-balance", ">", 0));

        const [studentSnapshot, outCandidateSnapshot] = await Promise.all([
            getDocs(studentsQuery),
            getDocs(outCandidatesQuery)
        ]);

        studentSnapshot.forEach(doc => {
            resultsFound = true;
            const data = doc.data();
            const row = `<tr>
                <td>${data['student-name'] || 'N/A'}</td>
                <td>${doc.id.replace(/-/g, '/')}</td>
                <td>${data['mobile-number'] || 'N/A'}</td>
                <td class="font-medium text-red-600">₹${Number(data['remaining-balance']).toLocaleString('en-IN')}</td>
            </tr>`;
            tableBody.innerHTML += row;
        });

        outCandidateSnapshot.forEach(doc => {
            resultsFound = true;
            const data = doc.data();
            const row = `<tr>
                <td>${data['candidate-name'] || 'N/A'}</td>
                <td>${doc.id.replace(/-/g, '/')}</td>
                <td>${data['mobile-number'] || 'N/A'}</td>
                <td class="font-medium text-red-600">₹${Number(data['remaining-balance']).toLocaleString('en-IN')}</td>
            </tr>`;
            tableBody.innerHTML += row;
        });

        if (!resultsFound) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-6">No pending payments found.</td></tr>`;
        }
    } catch (error) {
        console.error("Error fetching pending payments:", error);
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 py-6">Error loading data.</td></tr>`;
    }
}

// --- 4. STUDENT INSIGHTS TAB (Failed LL Table) ---
async function loadStudentInsightsTab() {
    const tableBody = document.getElementById("failed-ll-table");
    tableBody.innerHTML = ""; // Clear
    let resultsFound = false;

    try {
        const studentsRef = collection(db, "students");
        const studentSnapshot = await getDocs(studentsRef);

        studentSnapshot.forEach(doc => {
            const data = doc.data();
            const licenses = data.learnerLicenses || [];
            if (licenses.length > 0) {
                const lastLicense = licenses[licenses.length - 1];
                let lastResult = lastLicense.retestResult || lastLicense.testResult;

                if (lastResult === 'Fail') {
                    resultsFound = true;
                    const row = `<tr>
                        <td>${data['student-name'] || 'N/A'}</td>
                        <td>${doc.id.replace(/-/g, '/')}</td>
                        <td>${data['mobile-number'] || 'N/A'}</td>
                        <td class="font-medium text-red-600">Fail</td>
                    </tr>`;
                    tableBody.innerHTML += row;
                }
            }
        });

        if (!resultsFound) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-6">No students found requiring follow-up.</td></tr>`;
        }
    } catch (error) {
        console.error("Error fetching LL data:", error);
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 py-6">Error loading data.</td></tr>`;
    }
}

// --- NEW: FUNCTION TO LOAD "ADMISSIONS TODAY" TAB ---
async function loadAdmissionsTodayTab() {
    const studentsTable = document.getElementById("today-students-table");
    const outTable = document.getElementById("today-out-table");
    studentsTable.innerHTML = `<tr><td colspan="2" class="text-center text-gray-500 py-4">Loading...</td></tr>`;
    outTable.innerHTML = `<tr><td colspan="2" class="text-center text-gray-500 py-4">Loading...</td></tr>`;

    const now = new Date();
    // Ensure we get today's date correctly, regardless of timezone offset
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`; // Format as YYYY-MM-DD

    // 1. Fetch Students admitted today
    try {
        const studentsQuery = query(collection(db, "students"), where("admission-date", "==", todayString));
        const studentSnapshot = await getDocs(studentsQuery);
        studentsTable.innerHTML = ""; // Clear loader
        let studentsFound = 0;
        studentSnapshot.forEach(doc => {
            studentsFound++;
            const data = doc.data();
            studentsTable.innerHTML += `
                <tr>
                    <td>${data['student-name'] || 'N/A'}</td>
                    <td>${doc.id.replace(/-/g, '/')}</td>
                </tr>`;
        });
        if (studentsFound === 0) {
            studentsTable.innerHTML = `<tr><td colspan="2" class="text-center text-gray-500 py-4">No new students today.</td></tr>`;
        }
    } catch (e) {
        console.error("Error loading today's students:", e);
        studentsTable.innerHTML = `<tr><td colspan="2" class="text-center text-red-500 py-4">Error loading data.</td></tr>`;
    }

    // 2. Fetch Out-Candidates admitted today
    try {
        const outQuery = query(collection(db, "out-candidates"), where("admission-date", "==", todayString));
        const outSnapshot = await getDocs(outQuery);
        outTable.innerHTML = ""; // Clear loader
        let outFound = 0;
        outSnapshot.forEach(doc => {
            outFound++;
            const data = doc.data();
            outTable.innerHTML += `
                <tr>
                    <td>${data['candidate-name'] || 'N/A'}</td>
                    <td>${doc.id.replace(/-/g, '/')}</td>
                </tr>`;
        });
        if (outFound === 0) {
            outTable.innerHTML = `<tr><td colspan="2" class="text-center text-gray-500 py-4">No new out-candidates today.</td></tr>`;
        }
    } catch (e) {
        console.error("Error loading today's out-candidates:", e);
        outTable.innerHTML = `<tr><td colspan="2" class="text-center text-red-500 py-4">Error loading data.</td></tr>`;
    }
}

// --- ADD THIS FUNCTION (COPIED FROM APP.JS) TO THE END OF ADMIN.JS ---
async function fetchPaymentReport() {
    // Find the elements *inside* this function, since it's only called on click
    const reportFromDateInput = document.getElementById("report-from-date");
    const reportToDateInput = document.getElementById("report-to-date");
    const reportSummaryDiv = document.getElementById("report-summary");
    const reportTotalAmountSpan = document.getElementById("report-total-amount");
    const reportDateRangeSpan = document.getElementById("report-date-range");
    const paymentReportTbody = document.getElementById("payment-report-tbody");

    const fromDateStr = reportFromDateInput.value;
    const toDateStr = reportToDateInput.value;

    if (!fromDateStr || !toDateStr) {
        alert("Please select both From and To dates.");
        return;
    }

    const fromDate = Timestamp.fromDate(new Date(fromDateStr + 'T00:00:00'));
    const toDateEnd = new Date(toDateStr + 'T23:59:59.999');
    const toDate = Timestamp.fromDate(toDateEnd);

    paymentReportTbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">Loading...</td></tr>';
    reportSummaryDiv.classList.add('hidden');

    const paymentsRef = collection(db, "payments");
    const q = query(paymentsRef,
        where("date", ">=", fromDate),
        where("date", "<=", toDate),
        orderBy("date")
    );

    try {
        const querySnapshot = await getDocs(q);
        let totalAmount = 0;
        paymentReportTbody.innerHTML = '';

        if (querySnapshot.empty) {
            paymentReportTbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No payments found for the selected date range.</td></tr>';
        } else {
            querySnapshot.forEach((docSnap) => {
                const payment = docSnap.data();
                totalAmount += Number(payment.amount);

                const localDate = payment.date.toDate();
                const day = String(localDate.getDate()).padStart(2, '0');
                const month = String(localDate.getMonth() + 1).padStart(2, '0');
                const year = localDate.getFullYear();
                const formattedDate = `${day}/${month}/${year}`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="border px-4 py-2">${formattedDate}</td> 
                    <td class="border px-4 py-2">${payment.recordId || 'N/A'}</td>
                    <td class="border px-4 py-2">${payment.name || 'N/A'}</td>
                    <td class="border px-4 py-2 text-right">${Number(payment.amount).toLocaleString('en-IN')}</td>
                    <td class="border px-4 py-2">${payment.paymentMode || 'N/A'}</td>
                    <td class="border px-4 py-2">${payment.receivedBy || 'N/A'}</td>
                `;
                paymentReportTbody.appendChild(tr);
            });
        }

        reportTotalAmountSpan.textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
        reportDateRangeSpan.textContent = `${formatDateDDMMYYYY(fromDateStr)} to ${formatDateDDMMYYYY(toDateStr)}`;
        reportSummaryDiv.classList.remove('hidden');

    } catch (error) {
        console.error("Error fetching payment report:", error);
        paymentReportTbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-500">Error fetching report.</td></tr>';
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            alert("Report failed: A required database index is missing. Check the developer console (F12) for a link to create it.");
        }
    }
}
// --- END OF NEW FUNCTION ---