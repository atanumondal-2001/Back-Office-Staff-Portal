import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    arrayUnion,
    increment,
    runTransaction,
    orderBy, // Import orderBy for prefix search
    limit, // Optional: Import limit if needed for many results
    Timestamp // <-- ADD THIS LINE
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// --- Global variables ---
let db, storage, auth;
let currentUserRole = "staff"; // Default to 'staff' for safety
let showForm;
let currentStudentData = {};
let currentOutCandidateData = {};
let currentForm5Data = {}; // Added for Form 5

// --- Firebase Initialization ---
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    console.log("Firebase Initialized Successfully");
} catch (error) {
    console.error("Firebase initialization failed:", error);
    // Display a user-friendly error on the page itself
    document.body.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong class="font-bold">Fatal Error!</strong>
          <span class="block sm:inline">Could not connect to the database. Please check the Firebase configuration in the code.</span>
          <p class="text-sm mt-2">Error details: ${error.message}</p>
      </div>`;
}

// --- NEW FUNCTION TO FETCH USER ROLE ---
async function fetchUserRole(uid) {
    if (!uid) { // If no user ID, default to 'staff'
        currentUserRole = "staff";
        return;
    }
    try {
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            currentUserRole = userDocSnap.data().role; // Get role ("admin" or "staff")
        } else {
            currentUserRole = "staff"; // No role doc? Default to 'staff'
        }
    } catch (error) {
        console.error("Error fetching user role:", error);
        currentUserRole = "staff"; // Default to 'staff' on any error
    }
}

// --- NEW FUNCTION TO SHOW/HIDE ADMIN BUTTON ---
function setupAdminUI() {
    const adminBtn = document.getElementById("admin-dashboard-btn");
    if (adminBtn && currentUserRole === "admin") {
        adminBtn.classList.remove("hidden"); // Show the button
    }
}

// --- UI Element Getters (Will be called inside DOMContentLoaded) ---
let admissionForm, acNoInput, searchCriteriaSelect, searchValueInput, lookupBtn, lookupStatus,
    resultsModal, resultsList, closeModalBtn, remarksHistory, newRemarkInput, addRemarkBtn,
    toast, totalContractInput, totalPaidDisplay, remainingBalanceDisplay, paymentStatusBadge,
    paymentHistoryLog, newPaymentAmountInput, newPaymentDateInput, newPaymentReceivedByInput,
    paymentModeInput, addPaymentBtn, printReceiptBtn, llHistoryLog, addLLBtn, photoPreview,
    photoUploadInput, districtSelect, subDistrictSelect, aadharInput, printPdfBtn,
    exportStudentsCard, exportOutCandidatesCard, exportForm5Card, recordTypeSelect,
    outCandidateForm, outAcNoInput, outRemarksHistory, outNewRemarkInput, outAddRemarkBtn,
    outTotalContractInput, outTotalPaidDisplay, outRemainingBalanceDisplay, outPaymentStatusBadge,
    outPaymentHistoryLog, outNewPaymentAmountInput, outNewPaymentDateInput,
    outNewPaymentReceivedByInput, outPaymentModeInput, outAddPaymentBtn, outPrintReceiptBtn,
    outLlHistoryLog, outAddLLBtn, outPhotoPreview, outPhotoUploadInput, outDistrictSelect,
    outSubDistrictSelect, outAadharInput, outPrintPdfBtn, form5Form, form5SerialNoInput,
    saveForm5Btn, printForm5Btn, form5NameInput, form5GuardianInput, form5AddressInput,
    form5EnrollDateInput, form5VehicleClassInput, form5TrainingFromInput, form5TrainingToInput,
    form5SchoolLicenseInput, form5ValidTillInput,
    reportFromDateInput, reportToDateInput, generateReportBtn, reportSummaryDiv,
    reportTotalAmountSpan, reportDateRangeSpan, paymentReportTbody;

function initializeUIElements() {
    admissionForm = document.getElementById("admission-form");
    acNoInput = document.getElementById("ac-no");
    searchCriteriaSelect = document.getElementById("search-criteria");
    searchValueInput = document.getElementById("search-value");
    lookupBtn = document.getElementById("lookup-btn");
    lookupStatus = document.getElementById("lookup-status");
    resultsModal = document.getElementById("results-modal");
    resultsList = document.getElementById("results-list");
    closeModalBtn = document.getElementById("close-modal-btn");
    remarksHistory = document.getElementById("remarks-history");
    newRemarkInput = document.getElementById("new-remark");
    addRemarkBtn = document.getElementById("add-remark-btn");
    toast = document.getElementById("toast");
    totalContractInput = document.getElementById("total-contract");
    totalPaidDisplay = document.getElementById("total-paid-display");
    remainingBalanceDisplay = document.getElementById("remaining-balance-display");
    paymentStatusBadge = document.getElementById("payment-status-badge");
    paymentHistoryLog = document.getElementById("payment-history-log");
    newPaymentAmountInput = document.getElementById("new-payment-amount");
    newPaymentDateInput = document.getElementById("new-payment-date");
    newPaymentReceivedByInput = document.getElementById("new-payment-received-by");
    paymentModeInput = document.getElementById("payment-mode");
    addPaymentBtn = document.getElementById("add-payment-btn");
    printReceiptBtn = document.getElementById("print-receipt-btn");
    llHistoryLog = document.getElementById("ll-history-log");
    addLLBtn = document.getElementById("add-ll-btn");
    photoPreview = document.getElementById("photo-preview");
    photoUploadInput = document.getElementById("photo-upload");
    districtSelect = document.getElementById("district");
    subDistrictSelect = document.getElementById("sub-district");
    aadharInput = document.getElementById("aadhar-no");
    printPdfBtn = document.getElementById("print-pdf-btn");
    exportStudentsCard = document.getElementById("export-students-card");
    exportOutCandidatesCard = document.getElementById("export-out-candidates-card");
    exportForm5Card = document.getElementById("export-form5-card");
    recordTypeSelect = document.getElementById("record-type");
    outCandidateForm = document.getElementById("out-candidate-form");
    outAcNoInput = document.getElementById("out-ac-no");
    outRemarksHistory = document.getElementById("out-remarks-history");
    outNewRemarkInput = document.getElementById("out-new-remark");
    outAddRemarkBtn = document.getElementById("out-add-remark-btn");
    outTotalContractInput = document.getElementById("out-total-contract");
    outTotalPaidDisplay = document.getElementById("out-total-paid-display");
    outRemainingBalanceDisplay = document.getElementById("out-remaining-balance-display");
    outPaymentStatusBadge = document.getElementById("out-payment-status-badge");
    outPaymentHistoryLog = document.getElementById("out-payment-history-log");
    outNewPaymentAmountInput = document.getElementById("out-new-payment-amount");
    outNewPaymentDateInput = document.getElementById("out-new-payment-date");
    outNewPaymentReceivedByInput = document.getElementById("out-new-payment-received-by");
    outPaymentModeInput = document.getElementById("out-payment-mode");
    outAddPaymentBtn = document.getElementById("out-add-payment-btn");
    outPrintReceiptBtn = document.getElementById("out-print-receipt-btn");
    outLlHistoryLog = document.getElementById("out-ll-history-log");
    outAddLLBtn = document.getElementById("out-add-ll-btn");
    outPhotoPreview = document.getElementById("out-photo-preview");
    outPhotoUploadInput = document.getElementById("out-photo-upload");
    outDistrictSelect = document.getElementById("out-district");
    outSubDistrictSelect = document.getElementById("out-sub-district");
    outAadharInput = document.getElementById("out-aadhar-no");
    outPrintPdfBtn = document.getElementById("out-print-pdf-btn");
    form5Form = document.getElementById("form5-form");
    form5SerialNoInput = document.getElementById("form5-serial-no");
    saveForm5Btn = document.getElementById("save-form5-btn");
    printForm5Btn = document.getElementById("print-form5-btn");
    form5NameInput = document.getElementById("form5-name");
    form5GuardianInput = document.getElementById("form5-guardian");
    form5AddressInput = document.getElementById("form5-address");
    form5EnrollDateInput = document.getElementById("form5-enroll-date");
    form5VehicleClassInput = document.getElementById("form5-vehicle-class");
    form5TrainingFromInput = document.getElementById("form5-training-from");
    form5TrainingToInput = document.getElementById("form5-training-to");
    form5SchoolLicenseInput = document.getElementById("form5-school-license");
    form5ValidTillInput = document.getElementById("form5-valid-till");
}

const admissionFieldIds = [
    "student-name",
    "guardian-name",
    "village",
    "post-office",
    "police-station",
    "district",
    "sub-district",
    "pin-code",
    "mobile-number",
    "admission-date",
    "ll-app-no",
    "dl-app-no",
    "class-type",
    "dob",
    "voter-id",
    "aadhar-no",
    "blood-group",
    "course-duration",
    "total-contract",
    "checked-by",
    "new-dl-number",
    "new-dl-issue-date",
    "new-dl-valid-date",
    "prev-dl-number",
    "prev-dl-issue-date",
    "prev-dl-valid-date",
];

const outCandidateFieldIds = [
    "out-candidate-name",
    "out-guardian-name",
    "out-village",
    "out-post-office",
    "out-police-station",
    "out-district",
    "out-sub-district",
    "out-pin-code",
    "out-mobile-number",
    "out-admission-date",
    "out-ll-app-no",
    "out-dl-app-no",
    "out-class-type",
    "out-dob",
    "out-voter-id",
    "out-aadhar-no",
    "out-blood-group",
    "out-total-contract",
    "out-checked-by",
    "out-new-dl-number",
    "out-new-dl-issue-date",
    "out-new-dl-valid-date",
    "out-prev-dl-number",
    "out-prev-dl-issue-date",
    "out-prev-dl-valid-date",
];

const form5FieldIds = [
    "form5-name",
    "form5-guardian",
    "form5-address",
    "form5-enroll-date",
    "form5-vehicle-class",
    "form5-training-from",
    "form5-training-to",
    "form5-school-license",
    "form5-valid-till",
];


const westBengalSubDistricts = {
    Alipurduar: [
        "Alipurduar - I",
        "Alipurduar - II",
        "Falakata",
        "Kalchini",
        "Kumargram",
        "Madarihat-Birpara",
    ],
    Bankura: [
        "Bankura - I",
        "Bankura - II",
        "Barjora",
        "Chhatna",
        "Gangajalghati",
        "Hirbandh",
        "Indpur",
        "Indus",
        "Joypur",
        "Khatra",
        "Kotalpur",
        "Mejia",
        "Onda",
        "Patrasayer",
        "Raipur",
        "Ranibandh",
        "Saltora",
        "Simlapal",
        "Sonamukhi",
        "Taldangra",
    ],
    Birbhum: [
        "Bolpur Sriniketan",
        "Dubrajpur",
        "Ilambazar",
        "Khoyrasol",
        "Labpur",
        "Mayureswar - I",
        "Mayureswar - II",
        "Mohammad Bazar",
        "Murarai - I",
        "Murarai - II",
        "Nalhati - I",
        "Nalhati - II",
        "Nanoor",
        "Rajnagar",
        "Rampurhat - I",
        "Rampurhat - II",
        "Sainthia",
        "Suri - I",
        "Suri - II",
    ],
    "Cooch Behar": [
        "Cooch Behar - I",
        "Cooch Behar - II",
        "Dinhata - I",
        "Dinhata - II",
        "Haldibari",
        "Mathabhanga - I",
        "Mathabhanga - II",
        "Mekliganj",
        "Sitai",
        "Sitalkuchi",
        "Tufanganj - I",
        "Tufanganj - II",
    ],
    "Dakshin Dinajpur": [
        "Balurghat",
        "Bansihari",
        "Gangarampur",
        "Harirampur",
        "Hili",
        "Kumarganj",
        "Kushmandi",
        "Tapan",
    ],
    Darjeeling: [
        "Darjeeling Pulbazar",
        "Jorebunglow Sukiapokhri",
        "Kurseong",
        "Mirik",
        "Rangli Rangliot",
        "Matigara",
        "Naxalbari",
        "Phansidewa",
        "Kharibari",
    ],
    Hooghly: [
        "Arambag",
        "Balagarh",
        "Chanditala - I",
        "Chanditala - II",
        "Chinsurah Mogra",
        "Dhaniakhali",
        "Goghat - I",
        "Goghat - II",
        "Haripal",
        "Jangipara",
        "Khanakul - I",
        "Khanakul - II",
        "Pandua",
        "Polba Dadpur",
        "Pursurah",
        "Serampore Uttarpara",
        "Singur",
        "Tarakeswar",
    ],
    Howrah: [
        "Amta - I",
        "Amta - II",
        "Bagnan - I",
        "Bagnan - II",
        "Bally Jagachha",
        "Domjur",
        "Jagatballavpur",
        "Panchla",
        "Sankrail",
        "Shyampur - I",
        "Shyampur - II",
        "Udaynarayanpur",
        "Uluberia - I",
        "Uluberia - II",
    ],
    Jalpaiguri: [
        "Dhupguri",
        "Jalpaiguri",
        "Mal",
        "Matiali",
        "Maynaguri",
        "Nagrakata",
        "Rajganj",
    ],
    Jhargram: [
        "Binpur - I",
        "Binpur - II",
        "Gopiballavpur - I",
        "Gopiballavpur - II",
        "Jamboni",
        "Jhargram",
        "Nayagram",
        "Sankrail",
    ],
    Kalimpong: ["Gorubathan", "Kalimpong - I", "Lava", "Pedong"],
    Kolkata: ["Kolkata"],
    Malda: [
        "Bamangola",
        "Chanchal - I",
        "Chanchal - II",
        "English Bazar",
        "Gajol",
        "Habibpur",
        "Harishchandrapur - I",
        "Harishchandrapur - II",
        "Kaliachak - I",
        "Kaliachak - II",
        "Kaliachak - III",
        "Manikchak",
        "Old Malda",
        "Ratua - I",
        "Ratua - II",
    ],
    Murshidabad: [
        "Beldanga - I",
        "Beldanga - II",
        "Berhampore",
        "Bhagawangola - I",
        "Bhagawangola - II",
        "Bharatpur - I",
        "Bharatpur - II",
        "Burwan",
        "Domkal",
        "Farakka",
        "Hariharpara",
        "Jalangi",
        "Kandi",
        "Khargram",
        "Lalgola",
        "Murshidabad Jiaganj",
        "Nabagram",
        "Nawda",
        "Raghunathganj - I",
        "Raghunathganj - II",
        "Raninagar - I",
        "Raninagar - II",
        "Sagardighi",
        "Samserganj",
        "Suti - I",
        "Suti - II",
    ],
    Nadia: [
        "Chakdaha",
        "Chapra",
        "Hanskhali",
        "Haringhata",
        "Kaliganj",
        "Karimpur - I",
        "Karimpur - II",
        "Krishnaganj",
        "Krishnanagar - I",
        "Krishnanagar - II",
        "Nabadwip",
        "Nakashipara",
        "Ranaghat - I",
        "Ranaghat - II",
        "Santipur",
        "Tehatta - I",
        "Tehatta - II",
    ],
    "North 24 Parganas": [
        "Amdanga",
        "Baduria",
        "Bagda",
        "Barasat - I",
        "Barasat - II",
        "Barrackpore - I",
        "Barrackpore - II",
        "Basirhat - I",
        "Basirhat - II",
        "Bongaon",
        "Deganga",
        "Gaighata",
        "Habra - I",
        "Habra - II",
        "Haroa",
        "Hasnabad",
        "Hingalganj",
        "Minakhan",
        "Rajarhat",
        "Sandeshkhali - I",
        "Sandeshkhali - II",
        "Swarupnagar",
    ],
    "Paschim Bardhaman": [
        "Asansol",
        "Barabani",
        "Durgapur Faridpur",
        "Jamuria",
        "Kanksa",
        "Ondal",
        "Pandabeswar",
        "Raniganj",
        "Salampur",
    ],
    "Paschim Medinipur": [
        "Chandrakona - I",
        "Chandrakona - II",
        "Dantan - I",
        "Dantan - II",
        "Daspur - I",
        "Daspur - II",
        "Debra",
        "Garbeta - I",
        "Garbeta - II",
        "Garbeta - III",
        "Ghatal",
        "Gopiballavpur - I",
        "Gopiballavpur - II",
        "Jhargram",
        "Jamboni",
        "Keshiary",
        "Keshpur",
        "Kharagpur - I",
        "Kharagpur - II",
        "Midnapore Sadar",
        "Mohanpur",
        "Narayangarh",
        "Nayagram",
        "Pingla",
        "Sabang",
        "Salboni",
        "Sankrail",
    ],
    "Purba Bardhaman": [
        "Ausgram - I",
        "Ausgram - II",
        "Bhatar",
        "Burdwan - I",
        "Burdwan - II",
        "Galsi - I",
        "Galsi - II",
        "Jamalpur",
        "Kalna - I",
        "Kalna - II",
        "Katwa - I",
        "Katwa - II",
        "Ketugram - I",
        "Ketugram - II",
        "Khandaghosh",
        "Manteswar",
        "Memari - I",
        "Memari - II",
        "Mongolkote",
        "Purbasthali - I",
        "Purbasthali - II",
        "Raina - I",
        "Raina - II",
    ],
    "Purba Medinipur": [
        "Bhagabanpur - I",
        "Bhagabanpur - II",
        "Chandipur",
        "Contai - I",
        "Contai - III",
        "Egra - I",
        "Egra - II",
        "Haldia",
        "Khejuri - I",
        "Khejuri - II",
        "Kolaghat",
        "Mahishadal",
        "Moyna",
        "Nandakumar",
        "Nandigram - I",
        "Nandigram - II",
        "Panskura",
        "Patashpur - I",
        "Patashpur - II",
        "Ramnagar - I",
        "Ramnagar - II",
        "Sahid Matangini",
        "Sutahata",
        "Tamluk",
    ],
    Purulia: [
        "Arsha",
        "Bagmundi",
        "Balarampur",
        "Barabazar",
        "Bundwan",
        "Hura",
        "Jaipur",
        "Jhalda - I",
        "Jhalda - II",
        "Kashipur",
        "Manbazar - I",
        "Manbazar - II",
        "Neturia",
        "Para",
        "Puncha",
        "Purulia - I",
        "Purulia - II",
        "Raghunathpur - I",
        "Raghunathpur - II",
        "Santuri",
    ],
    "South 24 Parganas": [
        "Baruipur",
        "Basanti",
        "Bhangar - I",
        "Bhangar - II",
        "Bishnupur - I",
        "Bishnupur - II",
        "Budge Budge - I",
        "Budge Budge - II",
        "Canning - I",
        "Canning - II",
        "Diamond Harbour - I",
        "Diamond Harbour - II",
        "Falta",
        "Gosaba",
        "Jaynagar - I",
        "Jaynagar - II",
        "Kakdwip",
        "Kulpi",
        "Kultali",
        "Mandirbazar",
        "Mathurapur - I",
        "Mathurapur - II",
        "Mograhat - I",
        "Mograhat - II",
        "Namkhana",
        "Patharpratima",
        "Sagar",
        "Sonarpur",
        "Thakurpukur Mahestala",
    ],
    "Uttar Dinajpur": [
        "Chopra",
        "Goalpokhar - I",
        "Goalpokhar - II",
        "Hemtabad",
        "Islampur",
        "Itahar",
        "Kaliaganj",
        "Karandighi",
        "Raiganj",
    ],


};

// --- Helper Functions ---
const showModal = () => resultsModal.classList.remove("hidden");
const hideModal = () => resultsModal.classList.add("hidden");

function sanitizeDocId(id) {
    // Allow '/' ONLY in specific known formats like AC numbers or Form 5 serials
    // Regex tests for formats like 12/2025, 012/O/2025, MAMTS/01/2025
    const knownPatterns = /^\d{2,}\/\d{4}$|^\d{3,}\/O\/\d{4}$|^MAMTS\/\d{2,}\/\d{4}$/;
    if (id && id.includes('/') && knownPatterns.test(id)) {
        // It looks like a valid ID with slashes. Replace slashes for Firestore ID.
        return id.replace(/\//g, "-");
    }
    // Otherwise, treat as a potential manual entry or other format, replace slashes
    return id ? id.replace(/\//g, "-") : "";
}


function showToast(message, isError = false) {
    toast.textContent = message;
    toast.classList.remove("bg-green-500", "bg-red-500");
    toast.classList.add(isError ? "bg-red-500" : "bg-green-500");
    toast.classList.remove("opacity-0", "translate-y-10");
    toast.classList.add("opacity-100", "translate-y-0");
    setTimeout(() => {
        toast.classList.remove("opacity-100", "translate-y-0");
        toast.classList.add("opacity-0", "translate-y-10");
    }, 3000);
}

// New Date Formatting Helper
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

function displayPaymentHistory(payments = []) {
    paymentHistoryLog.innerHTML = "";
    if (!payments || payments.length === 0) {
        paymentHistoryLog.innerHTML =
            '<p class="text-gray-500 text-sm">No payments recorded yet.</p>';
        return;
    }
    payments.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort descending
    payments.forEach((p) => {
        const pEl = document.createElement("div");
        pEl.className = "p-2 border-b last:border-b-0";
        pEl.innerHTML = `
              <div class="flex justify-between items-center">
                  <span class="font-semibold text-gray-800">₹${Number(
                    p.amount
                  ).toLocaleString("en-IN")}</span>
                  <span class="text-sm text-gray-500">${formatDateDDMMYYYY(p.date)} (${ // Format date here
      p.paymentMode || "N/A"
    })</span>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                  Received By: ${p.receivedBy || "N/A"}
              </div>
          `;
        paymentHistoryLog.appendChild(pEl);
    });
}

function displayRemarks(remarks = []) {
    remarksHistory.innerHTML = "";
    if (!remarks || remarks.length === 0) {
        remarksHistory.innerHTML =
            '<p class="text-gray-500 text-sm">No remarks yet.</p>';
        return;
    }
    remarks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    remarks.forEach((remark) => {
        const remarkEl = document.createElement("div");
        remarkEl.className = "p-2 border-b border-gray-200";
        const date = new Date(remark.timestamp).toLocaleString('en-GB'); // Use locale string for display
        remarkEl.innerHTML = `
              <p class="text-sm text-gray-800">${remark.text}</p>
              <p class="text-xs text-gray-500 mt-1">Added on: ${date}</p>
          `;
        remarksHistory.appendChild(remarkEl);
    });
}

function displayLLHistory(licenses = []) {
    llHistoryLog.innerHTML = "";
    if (!licenses || licenses.length === 0) {
        llHistoryLog.innerHTML =
            '<p class="text-gray-500 text-sm">No learner license records yet.</p>';
        return;
    }
    licenses.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
    licenses.forEach((lic) => {
                const licEl = document.createElement("div");
                licEl.className = "p-3 border rounded-md bg-white shadow-sm";
                licEl.innerHTML = `
              <p class="font-semibold text-gray-800">LL No: ${
                lic.number
              }</p>
              <div class="text-sm text-gray-600 mt-1 grid grid-cols-2 gap-x-4">
                  <span>Issued: ${formatDateDDMMYYYY(lic.issueDate)}</span>
                  <span>Valid: ${formatDateDDMMYYYY(lic.validUpto)}</span>
                  <span>Test Result: ${lic.testResult}</span>
                  ${
                    lic.retestDate
                      ? `<span>Retest: ${formatDateDDMMYYYY(lic.retestDate)}</span>`
                      : ""
                  }
                  ${
                    lic.retestResult
                      ? `<span>Retest Result: ${lic.retestResult}</span>`
                      : ""
                  }
              </div>
          `;
    llHistoryLog.appendChild(licEl);
  });
}

function updatePaymentDisplay(totalContract = 0, payments = []) {
  const totalPaid = (payments || []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const remaining = totalContract - totalPaid;

  totalPaidDisplay.textContent = `₹${totalPaid.toLocaleString("en-IN")}`;
  remainingBalanceDisplay.textContent = `₹${remaining.toLocaleString(
    "en-IN"
  )}`;

  paymentStatusBadge.classList.remove(
    "bg-green-100",
    "text-green-800",
    "bg-yellow-100",
    "text-yellow-800",
    "bg-red-100",
    "text-red-800"
  );
  if (totalPaid <= 0 && totalContract > 0) {
    paymentStatusBadge.textContent = "Unpaid";
    paymentStatusBadge.classList.add("bg-red-100", "text-red-800");
  } else if (remaining <= 0 && totalContract > 0) {
    paymentStatusBadge.textContent = "Fully Paid";
    paymentStatusBadge.classList.add("bg-green-100", "text-green-800");
  } else if (totalPaid > 0) {
    paymentStatusBadge.textContent = "Partially Paid";
    paymentStatusBadge.classList.add("bg-yellow-100", "text-yellow-800");
  } else {
    paymentStatusBadge.textContent = "N/A";
  }
}

function populateSubDistricts(selectedDistrict) {
  subDistrictSelect.innerHTML =
    '<option value="">Select Sub-District</option>';
    outSubDistrictSelect.innerHTML =
    '<option value="">Select Sub-District</option>';
  if (selectedDistrict && westBengalSubDistricts[selectedDistrict]) {
    westBengalSubDistricts[selectedDistrict].forEach((subDistrict) => {
      const option = document.createElement("option");
      option.value = subDistrict;
      option.textContent = subDistrict;
      subDistrictSelect.appendChild(option.cloneNode(true));
      outSubDistrictSelect.appendChild(option);
    });
  } else {
    subDistrictSelect.innerHTML =
      '<option value="">Select District First</option>';
    outSubDistrictSelect.innerHTML =
      '<option value="">Select District First</option>';
  }
}

function populateForm(data, docId) { // Use docId which is sanitized
  admissionForm.reset();
  acNoInput.value = docId.replace(/-/g, "/"); // Display with slashes
  currentStudentData = { ...data, acNo: docId }; // Store sanitized ID

  admissionFieldIds.forEach((id) => {
    const element = document.getElementById(id);
    if (element && data[id] !== undefined) {
      element.value = data[id];
    }
  });

  if (data.district) {
    districtSelect.value = data.district;
    populateSubDistricts(data.district);
    if (data["sub-district"]) {
      subDistrictSelect.value = data["sub-district"];
    }
  } else {
    populateSubDistricts("");
  }

  if (data["documents-received"]) {
    for (const docIdKey in data["documents-received"]) { // Rename loop variable
      const checkbox = document.getElementById(docIdKey);
      if (checkbox) {
        checkbox.checked = data["documents-received"][docIdKey];
      }
    }
  }

  photoPreview.src =
    data.photoURL ||
    "https://placehold.co/100x100/e2e8f0/718096?text=Photo";
  displayRemarks(data.remarks);
  displayLLHistory(data.learnerLicenses);
  displayPaymentHistory(data.payments);
  updatePaymentDisplay(Number(data["total-contract"]), data.payments);

  printPdfBtn.disabled = false;
  printPdfBtn.classList.remove("opacity-50", "cursor-not-allowed");
  printReceiptBtn.disabled = !(
    currentStudentData.payments && currentStudentData.payments.length > 0
  );
  acNoInput.readOnly = true; // Make field read-only when editing
  acNoInput.disabled = true;

  showForm("form-admission");
}

function populateOutCandidateForm(data, docId) { // Use docId which is sanitized
    outCandidateForm.reset();
    outAcNoInput.value = docId.replace(/-/g, "/"); // Display with slashes
    currentOutCandidateData = { ...data, acNo: docId }; // Store sanitized ID

    const fieldMap = {
        'candidate-name': 'out-candidate-name',
        'guardian-name': 'out-guardian-name',
        'village': 'out-village',
        'post-office': 'out-post-office',
        'police-station': 'out-police-station',
        'district': 'out-district',
        'sub-district': 'out-sub-district',
        'pin-code': 'out-pin-code',
        'mobile-number': 'out-mobile-number',
        'admission-date': 'out-admission-date',
        'll-app-no': 'out-ll-app-no',
        'dl-app-no': 'out-dl-app-no',
        'class-type': 'out-class-type',
        'dob': 'out-dob',
        'voter-id': 'out-voter-id',
        'aadhar-no': 'out-aadhar-no',
        'blood-group': 'out-blood-group',
        'total-contract': 'out-total-contract',
        'checked-by': 'out-checked-by',
        'new-dl-number': 'out-new-dl-number',
        'new-dl-issue-date': 'out-new-dl-issue-date',
        'new-dl-valid-date': 'out-new-dl-valid-date',
        'prev-dl-number': 'out-prev-dl-number',
        'prev-dl-issue-date': 'out-prev-dl-issue-date',
        'prev-dl-valid-date': 'out-prev-dl-valid-date'
    };

    for (const dataKey in fieldMap) {
        const elementId = fieldMap[dataKey];
        const element = document.getElementById(elementId);
        if (element && data[dataKey] !== undefined) {
            element.value = data[dataKey];
        }
    }

    if (data.district) {
        populateSubDistricts(data.district);
        if (data["sub-district"]) {
            outSubDistrictSelect.value = data["sub-district"];
        }
    } else {
        populateSubDistricts("");
    }

    if (data["documents-received"]) {
        for (const docKey in data["documents-received"]) {
            const checkbox = document.getElementById(`out-${docKey}`);
            if (checkbox) {
                checkbox.checked = data["documents-received"][docKey];
            }
        }
    }

    outPhotoPreview.src = data.photoURL || "https://placehold.co/100x100/e2e8f0/718096?text=Photo";

    displayOutRemarks(data.remarks);
    displayOutLLHistory(data.learnerLicenses);
    displayOutPaymentHistory(data.payments);
    updateOutPaymentDisplay(Number(data["total-contract"] || 0), data.payments);

    outPrintPdfBtn.disabled = false;
    outPrintPdfBtn.classList.remove("opacity-50", "cursor-not-allowed");
    outPrintReceiptBtn.disabled = !(
        currentOutCandidateData.payments &&
        currentOutCandidateData.payments.length > 0
    );
    outAcNoInput.readOnly = true; // Make field read-only when editing
    outAcNoInput.disabled = true;

    showForm("form-out-candidate");
}

function populateForm5Form(data, docId) { // docId is the sanitized serial number
    form5Form.reset();
    form5SerialNoInput.value = data.serialNo || docId.replace(/-/g, '/'); // Display original format
    currentForm5Data = { ...data, docId: docId }; // Store sanitized ID as docId

    form5FieldIds.forEach(id => {
        const element = document.getElementById(id);
        // Map form ID (form5-name) to data key ('name')
        const dataKey = id.replace(/^form5-/, '');
        if (element && data[dataKey] !== undefined) {
            element.value = data[dataKey];
        }
    });

    // Ensure School License No is pre-filled if it wasn't saved (or use saved value)
    if (!form5SchoolLicenseInput.value) {
        form5SchoolLicenseInput.value = "WB57 20230006054";
    }

    printForm5Btn.disabled = false;
    printForm5Btn.classList.remove("opacity-50", "cursor-not-allowed");
    form5SerialNoInput.readOnly = true; // Make read-only when editing
    form5SerialNoInput.disabled = true;

    showForm('form-misc');
}


// --- Core Search and Data Handling Logic ---
async function findRecord() {
    const criteria = searchCriteriaSelect.value;
    const rawValue = searchValueInput.value.trim(); // Keep original value for ID search display
    const recordType = recordTypeSelect.value;

    if (!rawValue) {
        showToast("Please enter a search value.", true);
        return;
    }
    lookupStatus.textContent = "Searching...";
    lookupBtn.disabled = true;
    lookupStatus.classList.remove("text-red-500", "text-green-600", "text-yellow-600");

    try {
        let querySnapshot;
        let q; // Declare query variable outside specific blocks
        const recordsRef = collection(db, recordType);
        const recordLabel = recordType === 'students' ? 'Student'
                           : recordType === 'out-candidates' ? 'Out Candidate'
                           : 'Form 5'; // Label for messages

        // --- Handle ID Search (AC No / Serial No) ---
        if (criteria === "id") {
            const sanitizedValue = sanitizeDocId(rawValue); // Sanitize input for DB ID lookup
            if (!sanitizedValue) {
                 lookupStatus.textContent = "Invalid ID format.";
                 lookupStatus.classList.add("text-red-500");
                 lookupBtn.disabled = false;
                 return;
            }
            const docRef = doc(db, recordType, sanitizedValue);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                lookupStatus.textContent = `${recordLabel} ${rawValue} found.`;
                lookupStatus.classList.add("text-green-600");
                // Call the correct population function based on record type
                if (recordType === 'students') {
                    populateForm(docSnap.data(), docSnap.id);
                } else if (recordType === 'out-candidates') {
                    populateOutCandidateForm(docSnap.data(), docSnap.id);
                } else if (recordType === 'form5_records') {
                    populateForm5Form(docSnap.data(), docSnap.id);
                }
            } else {
                lookupStatus.textContent = `No ${recordLabel} found with ID ${rawValue}.`;
                lookupStatus.classList.add("text-red-500");
            }
            // No need to set lookupBtn.disabled = false; here, finally block handles it.
            return; // Exit function after direct ID lookup
        }

        // --- Handle Name Search (Case-insensitive Prefix) ---
        else if (criteria === 'name') {
            const lowercaseValue = rawValue.toLowerCase();
            // Ensure the correct lowercase field name is used for each record type
            const searchField = recordType === 'students' ? 'student-name-lowercase'
                             : recordType === 'out-candidates' ? 'candidate-name-lowercase'
                             : 'name-lowercase'; // Field in form5_records is 'name-lowercase'

            console.log(`Searching ${recordType} by name prefix: ${lowercaseValue} in field ${searchField}`); // Debug log

            q = query(recordsRef,
                      where(searchField, ">=", lowercaseValue),
                      where(searchField, "<=", lowercaseValue + '\uf8ff'),
                      orderBy(searchField) // Order by the field we are querying
                      // limit(20) // Optional: limit results if many matches expected
                     );
             try {
                 querySnapshot = await getDocs(q);
                 console.log(`Name query returned ${querySnapshot.size} results.`); // Debug log
             } catch (error) {
                 console.error("Error executing name query:", error);
                 // **THIS IS THE CRITICAL PART**
                 // Check if the error message indicates a missing index
                 if (error.code === 'failed-precondition' && error.message.includes('index')) {
                     lookupStatus.textContent = `Search failed. Firestore index required. Check console (F12) for details.`;
                     // Log the full error, which contains the index creation link
                     console.error(error);
                     // Alert the user more directly
                     alert("SEARCH FAILED:\nA required database index is missing.\n\n1. Press F12 to open the developer console.\n2. Find the error message containing a long link.\n3. Click that link to create the missing Firestore index.\n4. Wait a few minutes and try searching again.");
                 } else {
                     lookupStatus.textContent = "Error searching by name.";
                 }
                 lookupStatus.classList.add("text-red-500");
                 lookupBtn.disabled = false;
                 return;
             }
        }

        // --- Handle Guardian Name Search (Exact Match, Case-Sensitive for now) ---
         else if (criteria === 'guardianName') {
             const searchField = recordType === 'students' ? 'guardian-name'
                             : recordType === 'out-candidates' ? 'guardian-name'
                             : 'guardian'; // Field in form5_records is 'guardian'
             q = query(recordsRef, where(searchField, "==", rawValue));
             querySnapshot = await getDocs(q);
        }

        else if (criteria === 'mobile') {
            if (recordType === 'form5_records') {
                  lookupStatus.textContent = "Search by Mobile is not applicable for Form 5.";
                  lookupStatus.classList.add("text-yellow-600");
                  // No need to set lookupBtn.disabled = false; here, finally block handles it.
                  return; // Stop search for Form 5
            }
            // This searches for an exact match on the mobile number
            q = query(recordsRef, where('mobile-number', "==", rawValue));
            querySnapshot = await getDocs(q);
        }   

        // --- Handle DOB Search (Exact Match, Not applicable for Form 5) ---
        else if (criteria === 'dob') {
            if (recordType === 'form5_records') {
                 lookupStatus.textContent = "Search by DOB is not applicable for Form 5.";
                 lookupStatus.classList.add("text-yellow-600");
                 // No need to set lookupBtn.disabled = false; here, finally block handles it.
                 return; // Stop DOB search for Form 5
            }
            q = query(recordsRef, where('dob', "==", rawValue));
            querySnapshot = await getDocs(q);
        }

        // --- Process Query Results ---
        if (!querySnapshot || querySnapshot.empty) {
            lookupStatus.textContent = `No ${recordLabel} found matching criteria.`;
            lookupStatus.classList.add("text-red-500");
        } else if (querySnapshot.size === 1) {
            const docSnap = querySnapshot.docs[0];
            const displayId = (recordType === 'form5_records') ? docSnap.data().serialNo : docSnap.id.replace(/-/g, '/');
            lookupStatus.textContent = `${recordLabel} ${displayId} found.`;
            lookupStatus.classList.add("text-green-600");
            // Call the correct population function
            if (recordType === 'students') {
                populateForm(docSnap.data(), docSnap.id);
            } else if (recordType === 'out-candidates') {
                populateOutCandidateForm(docSnap.data(), docSnap.id);
            } else if (recordType === 'form5_records') {
                 populateForm5Form(docSnap.data(), docSnap.id);
            }
        } else { // Multiple results found
            resultsList.innerHTML = "";
            document.querySelector('#results-modal h3').textContent = `Multiple ${recordLabel}s Found`;
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const li = document.createElement("li");
                li.className = "p-2 border rounded-md hover:bg-gray-100 cursor-pointer";
                const displayName = data['student-name'] || data['candidate-name'] || data['name']; // Get name based on type
                const displayId = (recordType === 'form5_records') ? data.serialNo : docSnap.id.replace(/-/g, '/'); // Display original format ID
                li.textContent = `${displayName} (${recordType === 'form5_records' ? 'Serial' : 'A/C'}: ${displayId})`;
                li.addEventListener("click", () => {
                    // Call correct population function on click
                    if (recordType === 'students') {
                        populateForm(data, docSnap.id);
                    } else if (recordType === 'out-candidates') {
                        populateOutCandidateForm(data, docSnap.id);
                    } else if (recordType === 'form5_records') {
                         populateForm5Form(data, docSnap.id);
                    }
                    hideModal();
                });
                resultsList.appendChild(li);
            });
            showModal();
            lookupStatus.textContent = `${querySnapshot.size} ${recordLabel} records found.`;
            lookupStatus.classList.add("text-green-600");
        }
    } catch (error) {
        console.error("Error during findRecord operation:", error);
        lookupStatus.textContent = "Error fetching data.";
        lookupStatus.classList.add("text-red-500");
    } finally {
        lookupBtn.disabled = false; // Ensure button is re-enabled in all cases
    }
}


async function handleSaveStudent(event) {
  event.preventDefault();
  let acNoRaw = acNoInput.value.trim(); // Get current value (might be empty or existing)
  const isNewStudent = !currentStudentData.acNo || acNoInput.value === ''; // Check if it's conceptually new
  let acNo = currentStudentData.acNo; // Keep existing sanitized ID if editing

  // --- Aadhar Check ---
  const aadharNoRaw = aadharInput.value.replace(/\s/g, "");
  if (aadharNoRaw) {
    const q = query(
      collection(db, "students"),
      where("aadhar-no-raw", "==", aadharNoRaw)
    );
    const querySnapshot = await getDocs(q);
    // Check if an existing document with this Aadhar belongs to a *different* student
    if (!querySnapshot.empty && querySnapshot.docs[0].id !== acNo) {
      showToast(
        `Error: Aadhar Number ${aadharInput.value} already exists for another student (${querySnapshot.docs[0].id.replace(/-/g, '/')}).`,
        true
      );
      return;
    }
  }

  // --- Generate AC No ONLY if it's truly a new record being saved ---
  if (isNewStudent) {
    showToast("Generating account number...");
    const generatedAcNoRaw = await generateNextAccountNumber('students');
    if (!generatedAcNoRaw) {
      showToast("Failed to generate account number. Cannot save.", true);
      return;
    }
    acNoRaw = generatedAcNoRaw; // The newly generated, formatted number
    acNo = sanitizeDocId(acNoRaw); // The ID for Firestore
  }

  // --- Collect Data ---
  const studentData = {};
  admissionFieldIds.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      studentData[id] = element.value;
    }
  });
  // Add/Update lowercase name for searching
  if (studentData["student-name"]) {
      studentData["student-name-lowercase"] = studentData["student-name"].toLowerCase();
  } else {
      studentData["student-name-lowercase"] = "";
  }
  studentData["aadhar-no-raw"] = aadharNoRaw;

  const documentsReceived = {};
  document
    .querySelectorAll('#documents-grid input[type="checkbox"]')
    .forEach((checkbox) => {
      documentsReceived[checkbox.id] = checkbox.checked;
    });
  studentData["documents-received"] = documentsReceived;
  studentData["total-contract"] = Number(studentData["total-contract"]);

  studentData.payments = currentStudentData.payments || [];
  studentData.remarks = currentStudentData.remarks || [];
  studentData.learnerLicenses = currentStudentData.learnerLicenses || [];

  // --- Photo Upload ---
  const photoFile = photoUploadInput.files[0];
  let photoURL = currentStudentData.photoURL || "";

  if (photoFile) {
    const storageRef = ref(
      storage,
      `student_photos/${acNo}/${photoFile.name}` // Use sanitized ID for path
    );
    try {
      showToast("Uploading photo...");
      const snapshot = await uploadBytes(storageRef, photoFile);
      photoURL = await getDownloadURL(snapshot.ref);
      showToast("Photo uploaded successfully.");
    } catch (error) {
      console.error("Photo upload failed:", error);
      showToast(
        "Photo upload failed. Data will be saved without the new photo.",
        true
      );
    }
  }
  studentData.photoURL = photoURL;

  // --- NEW: Save Remaining Balance for Admin Panel ---
  const totalPaid = (studentData.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  studentData['remaining-balance'] = studentData['total-contract'] - totalPaid;
  // --- END NEW ---

  // --- Save to Firestore ---
  try {
    await setDoc(doc(db, "students", acNo), studentData, { merge: true }); // Use sanitized ID
    showToast("Student data saved successfully!");

    acNoInput.value = acNoRaw; // Update the input field with the formatted number
    currentStudentData = { ...studentData, acNo: acNo }; // Update internal state
    printPdfBtn.disabled = false;
    printPdfBtn.classList.remove("opacity-50", "cursor-not-allowed");
    printReceiptBtn.disabled = !(
      currentStudentData.payments &&
      currentStudentData.payments.length > 0
    );
    acNoInput.readOnly = true; // Ensure it's read-only after save
    acNoInput.disabled = true;
  } catch (error) {
    console.error("Error writing document: ", error);
    showToast("Failed to save data.", true);
  }
}

 async function handleSaveOutCandidate(event) {
  event.preventDefault();
  let acNoRaw = outAcNoInput.value.trim();
  const isNewCandidate = !currentOutCandidateData.acNo || outAcNoInput.value === '';
  let acNo = currentOutCandidateData.acNo;

  // --- Aadhar Check ---
  const aadharNoRaw = outAadharInput.value.replace(/\s/g, "");
   if (aadharNoRaw) {
     const q = query(
       collection(db, "out-candidates"),
       where("aadhar-no-raw", "==", aadharNoRaw)
     );
     const querySnapshot = await getDocs(q);
     if (!querySnapshot.empty && querySnapshot.docs[0].id !== acNo) {
       showToast(
         `Error: Aadhar Number ${outAadharInput.value} already exists for another out candidate (${querySnapshot.docs[0].id.replace(/-/g, '/')}).`,
         true
       );
       return;
     }
   }

  // --- Generate AC No ONLY if it's truly a new record ---
  if (isNewCandidate) {
      showToast("Generating account number...");
      const generatedAcNoRaw = await generateNextAccountNumber('out-candidates');
      if (!generatedAcNoRaw) {
          showToast("Failed to generate account number. Cannot save.", true);
          return;
      }
      acNoRaw = generatedAcNoRaw;
      acNo = sanitizeDocId(acNoRaw); // Sanitize for Firestore ID
  }

  // --- Collect Data ---
  const candidateData = {};
  outCandidateFieldIds.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      candidateData[id.replace(/^out-/, '')] = element.value;
    }
  });
  // Add/Update lowercase name for searching
  if (candidateData["candidate-name"]) {
      candidateData["candidate-name-lowercase"] = candidateData["candidate-name"].toLowerCase();
  } else {
      candidateData["candidate-name-lowercase"] = "";
  }
  candidateData["aadhar-no-raw"] = aadharNoRaw;

  const documentsReceived = {};
  document
    .querySelectorAll('#out-documents-grid input[type="checkbox"]')
    .forEach((checkbox) => {
      documentsReceived[checkbox.id.replace(/^out-/, '')] = checkbox.checked;
    });
  candidateData["documents-received"] = documentsReceived;
  candidateData["total-contract"] = Number(candidateData["total-contract"]);

  candidateData.payments = currentOutCandidateData.payments || [];
  candidateData.remarks = currentOutCandidateData.remarks || [];
  candidateData.learnerLicenses = currentOutCandidateData.learnerLicenses || [];

  // --- Photo Upload ---
  const photoFile = outPhotoUploadInput.files[0];
  let photoURL = currentOutCandidateData.photoURL || "";

  if (photoFile) {
    const storageRef = ref(
      storage,
      `out_candidate_photos/${acNo}/${photoFile.name}` // Use sanitized ID
    );
    try {
      showToast("Uploading photo...");
      const snapshot = await uploadBytes(storageRef, photoFile);
      photoURL = await getDownloadURL(snapshot.ref);
      showToast("Photo uploaded successfully.");
    } catch (error) {
      console.error("Photo upload failed:", error);
      showToast(
        "Photo upload failed. Data will be saved without the new photo.",
        true
      );
    }
  }
  candidateData.photoURL = photoURL;

  // --- NEW: Save Remaining Balance for Admin Panel ---
  const totalPaid = (candidateData.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  candidateData['remaining-balance'] = candidateData['total-contract'] - totalPaid;
  // --- END NEW ---

  // --- Save to Firestore ---
  try {
    await setDoc(doc(db, "out-candidates", acNo), candidateData, { merge: true }); // Use sanitized ID
    showToast("Out candidate data saved successfully!");

    outAcNoInput.value = acNoRaw; // Update input field with formatted number
    currentOutCandidateData = { ...candidateData, acNo: acNo }; // Update internal state
    outPrintPdfBtn.disabled = false;
    outPrintPdfBtn.classList.remove("opacity-50", "cursor-not-allowed");
    outPrintReceiptBtn.disabled = !(
      currentOutCandidateData.payments &&
      currentOutCandidateData.payments.length > 0
    );
     outAcNoInput.readOnly = true; // Ensure it's read-only
     outAcNoInput.disabled = true;
  } catch (error) {
    console.error("Error writing document: ", error);
    showToast("Failed to save out candidate data.", true);
  }
}

async function handleAddPayment() {
  const newAmount = Number(newPaymentAmountInput.value);
  const newDate = newPaymentDateInput.value; // YYYY-MM-DD
  const receivedBy = newPaymentReceivedByInput.value.trim();
  const paymentMode = paymentModeInput.value;

  if (!newAmount || newAmount <= 0 || !newDate || !receivedBy) {
    showToast("Amount, Date, and Received By are required.", true);
    return;
  }
   if (!currentStudentData.acNo) {
      showToast("Cannot add payment. Student record not loaded or saved yet.", true);
      return;
   }

  const newPayment = {
    amount: newAmount,
    date: newDate, // Keep as YYYY-MM-DD string for consistency in student record
    receivedBy: receivedBy,
    paymentMode: paymentMode,
  };

  // Add to local student data first
  if (!currentStudentData.payments) currentStudentData.payments = [];
  currentStudentData.payments.push(newPayment);

  // Update UI immediately
  updatePaymentDisplay(Number(totalContractInput.value), currentStudentData.payments);
  displayPaymentHistory(currentStudentData.payments);

  // Prepare data for the dedicated 'payments' collection
  const paymentRecord = {
      ...newPayment,
      date: Timestamp.fromDate(new Date(newDate + 'T00:00:00')), // Store as Firestore Timestamp for querying
      recordId: currentStudentData.acNo.replace(/-/g, '/'), // Original formatted ID
      recordType: 'students',
      name: currentStudentData['student-name'] || '',
      nameLowercase: (currentStudentData['student-name'] || '').toLowerCase() // For potential future search
  };

  // Save to the 'payments' collection (background task, don't necessarily wait)
  try {
      await addDoc(collection(db, "payments"), paymentRecord);
      console.log("Payment record added to payments collection.");
  } catch(error) {
      console.error("Error adding payment to payments collection:", error);
      // Optionally notify user, but don't block the main flow
      showToast("Could not save payment to central report log.", true);
  }

  // Clear inputs and give feedback
  newPaymentAmountInput.value = "";
  newPaymentDateInput.value = "";
  newPaymentReceivedByInput.value = "";
  showToast("Payment staged. Save student record to fully update.", false); // Changed message slightly
  printReceiptBtn.disabled = false;
}

async function handleAddOutPayment() {
  const newAmount = Number(outNewPaymentAmountInput.value);
  const newDate = outNewPaymentDateInput.value; // YYYY-MM-DD
  const receivedBy = outNewPaymentReceivedByInput.value.trim();
  const paymentMode = outPaymentModeInput.value;

  if (!newAmount || newAmount <= 0 || !newDate || !receivedBy) {
    showToast("Amount, Date, and Received By are required.", true);
    return;
  }
   if (!currentOutCandidateData.acNo) {
      showToast("Cannot add payment. Candidate record not loaded or saved yet.", true);
      return;
   }

  const newPayment = {
    amount: newAmount,
    date: newDate,
    receivedBy: receivedBy,
    paymentMode: paymentMode,
  };

  // Add to local candidate data
  if (!currentOutCandidateData.payments) currentOutCandidateData.payments = [];
  currentOutCandidateData.payments.push(newPayment);

  // Update UI
  updateOutPaymentDisplay(Number(outTotalContractInput.value), currentOutCandidateData.payments);
  displayOutPaymentHistory(currentOutCandidateData.payments);

   // Prepare data for the dedicated 'payments' collection
  const paymentRecord = {
      ...newPayment,
      date: Timestamp.fromDate(new Date(newDate + 'T00:00:00')), // Store as Firestore Timestamp
      recordId: currentOutCandidateData.acNo.replace(/-/g, '/'), // Original formatted ID
      recordType: 'out-candidates',
      name: currentOutCandidateData['candidate-name'] || '',
      nameLowercase: (currentOutCandidateData['candidate-name'] || '').toLowerCase()
  };

  // Save to the 'payments' collection
  try {
      await addDoc(collection(db, "payments"), paymentRecord);
      console.log("Payment record added to payments collection.");
  } catch(error) {
      console.error("Error adding payment to payments collection:", error);
      showToast("Could not save payment to central report log.", true);
  }

  // Clear inputs and feedback
  outNewPaymentAmountInput.value = "";
  outNewPaymentDateInput.value = "";
  outNewPaymentReceivedByInput.value = "";
  showToast("Payment staged. Save candidate record to fully update.", false);
  outPrintReceiptBtn.disabled = false;
}

function handleAddRemark() {
  const remarkText = newRemarkInput.value.trim();
  if (!remarkText) return;

  const newRemark = {
    text: remarkText,
    timestamp: new Date().toISOString(),
  };

  if (!currentStudentData.remarks) {
    currentStudentData.remarks = [];
  }
  currentStudentData.remarks.push(newRemark);

  displayRemarks(currentStudentData.remarks);
  newRemarkInput.value = "";
  showToast("Remark staged. Save student to finalize.");
}

 function handleAddOutRemark() {
  const remarkText = outNewRemarkInput.value.trim();
  if (!remarkText) return;

  const newRemark = {
    text: remarkText,
    timestamp: new Date().toISOString(),
  };

  if (!currentOutCandidateData.remarks) {
    currentOutCandidateData.remarks = [];
  }
  currentOutCandidateData.remarks.push(newRemark);

  displayOutRemarks(currentOutCandidateData.remarks);
  outNewRemarkInput.value = "";
  showToast("Remark staged. Save candidate to finalize.");
}

function handleAddLearnerLicense() {
  const newLLNumber = document
    .getElementById("new-ll-number")
    .value.trim();
  const issueDate = document.getElementById("new-ll-issue-date").value;
  const validDate = document.getElementById("new-ll-valid-date").value;

  if (!newLLNumber) {
    showToast("Learner License Number is required.", true);
    return;
  }
  if (
    issueDate &&
    validDate &&
    new Date(validDate) < new Date(issueDate)
  ) {
    showToast(
      "Error: 'Valid Upto' date cannot be before the 'Issue Date'.",
      true
    );
    return;
  }

  const renewalFee = Number(
    document.getElementById("ll-renewal-fee").value
  );
  const receivedBy = document
    .getElementById("ll-renewal-received-by")
    .value.trim();

  if (renewalFee > 0 && !receivedBy) {
    showToast("Please enter who received the renewal fee.", true);
    return;
  }

  const newRecord = {
    number: newLLNumber,
    issueDate: issueDate,
    validUpto: validDate,
    testResult: document.getElementById("new-ll-test-result").value,
    retestDate: document.getElementById("new-ll-retest-date").value,
    retestResult: document.getElementById("new-ll-retest-result").value,
  };

  if (!currentStudentData.learnerLicenses) {
    currentStudentData.learnerLicenses = [];
  }
  currentStudentData.learnerLicenses.push(newRecord);
  displayLLHistory(currentStudentData.learnerLicenses);

  if (renewalFee > 0) {
    const newTotal = Number(totalContractInput.value) + renewalFee;
    totalContractInput.value = newTotal;
    updatePaymentDisplay(newTotal, currentStudentData.payments || []);
    const remarkText = `Added Renewal Fee of ₹${renewalFee} for new LL ${newLLNumber}. Received by: ${receivedBy}.`;
    if (!currentStudentData.remarks) {
      currentStudentData.remarks = [];
    }
    currentStudentData.remarks.push({
      text: remarkText,
      timestamp: new Date().toISOString(),
    });
    displayRemarks(currentStudentData.remarks);
  }

  [
    "new-ll-number",
    "new-ll-issue-date",
    "new-ll-valid-date",
    "ll-renewal-fee",
    "new-ll-retest-date",
    "ll-renewal-received-by",
  ].forEach((id) => (document.getElementById(id).value = ""));
  ["new-ll-test-result", "new-ll-retest-result"].forEach(
    (id) => (document.getElementById(id).selectedIndex = 0)
  );

  showToast("Learner License record staged. Save student to finalize.");
}

function handleAddOutLearnerLicense() {
  const newLLNumber = document.getElementById("out-new-ll-number").value.trim();
  const issueDate = document.getElementById("out-new-ll-issue-date").value;
  const validDate = document.getElementById("out-new-ll-valid-date").value;

  if (!newLLNumber) {
    showToast("Learner License Number is required.", true);
    return;
  }
  if (issueDate && validDate && new Date(validDate) < new Date(issueDate)) {
    showToast("Error: 'Valid Upto' date cannot be before the 'Issue Date'.", true);
    return;
  }

  const renewalFee = Number(document.getElementById("out-ll-renewal-fee").value);
  const receivedBy = document.getElementById("out-ll-renewal-received-by").value.trim();

  if (renewalFee > 0 && !receivedBy) {
    showToast("Please enter who received the renewal fee.", true);
    return;
  }

  const newRecord = {
    number: newLLNumber,
    issueDate: issueDate,
    validUpto: validDate,
    testResult: document.getElementById("out-new-ll-test-result").value,
    retestDate: document.getElementById("out-new-ll-retest-date").value,
    retestResult: document.getElementById("out-new-ll-retest-result").value,
  };

  if (!currentOutCandidateData.learnerLicenses) {
    currentOutCandidateData.learnerLicenses = [];
  }
  currentOutCandidateData.learnerLicenses.push(newRecord);
  displayOutLLHistory(currentOutCandidateData.learnerLicenses);

  if (renewalFee > 0) {
    const newTotal = Number(outTotalContractInput.value) + renewalFee;
    outTotalContractInput.value = newTotal;
    updateOutPaymentDisplay(newTotal, currentOutCandidateData.payments || []);
    const remarkText = `Added Renewal Fee of ₹${renewalFee} for new LL ${newLLNumber}. Received by: ${receivedBy}.`;
    if (!currentOutCandidateData.remarks) {
      currentOutCandidateData.remarks = [];
    }
    currentOutCandidateData.remarks.push({
      text: remarkText,
      timestamp: new Date().toISOString(),
    });
    displayOutRemarks(currentOutCandidateData.remarks);
  }

  [
    "out-new-ll-number",
    "out-new-ll-issue-date",
    "out-new-ll-valid-date",
    "out-ll-renewal-fee",
    "out-new-ll-retest-date",
    "out-ll-renewal-received-by",
  ].forEach((id) => (document.getElementById(id).value = ""));
  ["out-new-ll-test-result", "out-new-ll-retest-result"].forEach(
    (id) => (document.getElementById(id).selectedIndex = 0)
  );

  showToast("Learner License record staged. Save candidate to finalize.");
}

async function handleExportStudents() {
    showToast("Fetching all student data...");
    try {
        const querySnapshot = await getDocs(collection(db, "students"));
        if (querySnapshot.empty) {
            showToast("No student data to export.", true);
            return;
        }

        const dataRows = [];
        const headers = [
            "AC_No", "Name", "Guardian", "Village", "PostOffice", "PoliceStation",
            "District", "SubDistrict", "PinCode", "Mobile", "AdmissionDate", "LL_App_No", "DL_App_No", "Class",
            "DOB", "VoterID", "AadharNo", "BloodGroup", "CourseDuration", "TotalContract",
            "CheckedBy", "PhotoURL", "New_DL_No", "New_DL_Issue", "New_DL_Valid",
            "Prev_DL_No", "Prev_DL_Issue", "Prev_DL_Valid", "DocumentsReceived",
            "Payments", "LearnerLicenses", "Remarks"
        ];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const row = [
                docSnap.id.replace(/-/g, "/"),
                data["student-name"], data["guardian-name"], data.village,
                data["post-office"], data["police-station"], data.district,
                data["sub-district"], data["pin-code"], data["mobile-number"],
                data["admission-date"], data["ll-app-no"], data["dl-app-no"], data["class-type"], data.dob,
                data["voter-id"], data["aadhar-no"], data["blood-group"],
                data["course-duration"], data["total-contract"], data["checked-by"],
                data.photoURL, data["new-dl-number"], data["new-dl-issue-date"],
                data["new-dl-valid-date"], data["prev-dl-number"],
                data["prev-dl-issue-date"], data["prev-dl-valid-date"],
                JSON.stringify(data["documents-received"]), JSON.stringify(data.payments),
                JSON.stringify(data.learnerLicenses), JSON.stringify(data.remarks)
            ];
            dataRows.push(row);
        });

        const csvContent = convertToCSV(headers, dataRows);
        const today = new Date().toISOString().split("T")[0];
        downloadCSV(csvContent, `Mondal_Automobile_All_Students_${today}.csv`);
        showToast("Student database exported successfully!");
    } catch (error) {
        console.error("Error exporting student data:", error);
        showToast("Failed to export student database.", true);
    }
}

async function handleExportOutCandidates() {
    showToast("Fetching all out candidate data...");
    try {
        const querySnapshot = await getDocs(collection(db, "out-candidates"));
        if (querySnapshot.empty) {
            showToast("No out candidate data to export.", true);
            return;
        }

        const dataRows = [];
        const headers = [
            "AC_No", "Name", "Guardian", "Village", "PostOffice", "PoliceStation",
            "District", "SubDistrict", "PinCode", "Mobile", "AdmissionDate", "LL_App_No",
            "DL_App_No", "LicenseCategory", "DOB", "VoterID", "AadharNo", "BloodGroup",
            "TotalContract", "CheckedBy", "PhotoURL", "New_DL_No",
            "New_DL_Issue", "New_DL_Valid", "Prev_DL_No", "Prev_DL_Issue", "Prev_DL_Valid",
            "DocumentsReceived", "Payments", "LearnerLicenses", "Remarks"
        ];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const row = [
                docSnap.id.replace(/-/g, "/"),
                data["candidate-name"], data["guardian-name"], data.village,
                data["post-office"], data["police-station"], data.district,
                data["sub-district"], data["pin-code"], data["mobile-number"],
                data["admission-date"], data["ll-app-no"], data["dl-app-no"],
                data["class-type"], data.dob, data["voter-id"], data["aadhar-no"],
                data["blood-group"], data["total-contract"],
                data["checked-by"], data.photoURL, data["new-dl-number"],
                data["new-dl-issue-date"], data["new-dl-valid-date"],
                data["prev-dl-number"], data["prev-dl-issue-date"],
                data["prev-dl-valid-date"], JSON.stringify(data["documents-received"]),
                JSON.stringify(data.payments), JSON.stringify(data.learnerLicenses),
                JSON.stringify(data.remarks)
            ];
            dataRows.push(row);
        });

        const csvContent = convertToCSV(headers, dataRows);
        const today = new Date().toISOString().split("T")[0];
        downloadCSV(csvContent, `Mondal_Automobile_Out_Candidates_${today}.csv`);
        showToast("Out candidate database exported successfully!");
    } catch (error) {
        console.error("Error exporting out candidate data:", error);
        showToast("Failed to export out candidate database.", true);
    }
}

async function handleExportForm5Data() {
    showToast("Fetching Form 5 data...");
    try {
        const querySnapshot = await getDocs(collection(db, "form5_records"));
        if (querySnapshot.empty) {
            showToast("No Form 5 data to export.", true);
            return;
        }

        const dataRows = [];
        // Define headers based on the fields saved in handleSaveForm5
        const headers = [
            "SerialNo", "ApplicantName", "Guardian", "ResidentOf",
            "EnrolledOn", "VehicleClass", "TrainingFrom", "TrainingTo",
            "LicenseNo", "ValidTill", "SavedTimestamp"
        ];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const row = [
                data.serialNo,
                data.name, // Matches the key used in handleSaveForm5
                data.guardian,
                data.address,
                data['enroll-date'],
                data['vehicle-class'],
                data['training-from'],
                data['training-to'],
                data['school-license'], // Ensure this matches Firestore key
                data['valid-till'],
                data.savedTimestamp
            ];
            dataRows.push(row);
        });

        const csvContent = convertToCSV(headers, dataRows);
        const today = new Date().toISOString().split("T")[0];
        downloadCSV(csvContent, `Mondal_Automobile_Form5_Records_${today}.csv`);
        showToast("Form 5 database exported successfully!");

    } catch (error) {
        console.error("Error exporting Form 5 data:", error);
        showToast("Failed to export Form 5 database.", true);
    }
}


// Helper functions for Out Candidate form UI updates
function displayOutRemarks(remarks = []) {
  outRemarksHistory.innerHTML = "";
  if (!remarks || remarks.length === 0) {
      outRemarksHistory.innerHTML = '<p class="text-gray-500 text-sm">No remarks yet.</p>';
      return;
  }
  remarks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  remarks.forEach((remark) => {
      const remarkEl = document.createElement("div");
      remarkEl.className = "p-2 border-b border-gray-200";
      const date = new Date(remark.timestamp).toLocaleString('en-GB'); // Use locale string for display
      remarkEl.innerHTML = `
          <p class="text-sm text-gray-800">${remark.text}</p>
          <p class="text-xs text-gray-500 mt-1">Added on: ${date}</p>
      `;
      outRemarksHistory.appendChild(remarkEl);
  });
}

function displayOutLLHistory(licenses = []) {
    outLlHistoryLog.innerHTML = "";
    if (!licenses || licenses.length === 0) {
        outLlHistoryLog.innerHTML = '<p class="text-gray-500 text-sm">No learner license records yet.</p>';
        return;
    }
    licenses.sort((a, b) => new Date(b.issueDate) - new Date(a.date));
    licenses.forEach((lic) => {
        const licEl = document.createElement("div");
        licEl.className = "p-3 border rounded-md bg-white shadow-sm";
        licEl.innerHTML = `
            <p class="font-semibold text-gray-800">LL No: ${lic.number}</p>
            <div class="text-sm text-gray-600 mt-1 grid grid-cols-2 gap-x-4">
                <span>Issued: ${formatDateDDMMYYYY(lic.issueDate)}</span>
                <span>Valid: ${formatDateDDMMYYYY(lic.validUpto)}</span>
                <span>Test Result: ${lic.testResult}</span>
                ${lic.retestDate ? `<span>Retest: ${formatDateDDMMYYYY(lic.retestDate)}</span>` : ""}
                ${lic.retestResult ? `<span>Retest Result: ${lic.retestResult}</span>` : ""}
            </div>
        `;
        outLlHistoryLog.appendChild(licEl);
    });
}

function displayOutPaymentHistory(payments = []) {
    outPaymentHistoryLog.innerHTML = "";
    if (!payments || payments.length === 0) {
        outPaymentHistoryLog.innerHTML = '<p class="text-gray-500 text-sm">No payments recorded yet.</p>';
        return;
    }
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    payments.forEach((p) => {
        const pEl = document.createElement("div");
        pEl.className = "p-2 border-b last:border-b-0";
        pEl.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-semibold text-gray-800">₹${Number(p.amount).toLocaleString("en-IN")}</span>
                <span class="text-sm text-gray-500">${formatDateDDMMYYYY(p.date)} (${p.paymentMode || "N/A"})</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">
                Received By: ${p.receivedBy || "N/A"}
            </div>
        `;
        outPaymentHistoryLog.appendChild(pEl);
    });
}

function updateOutPaymentDisplay(totalContract = 0, payments = []) {
    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = totalContract - totalPaid;

    outTotalPaidDisplay.textContent = `₹${totalPaid.toLocaleString("en-IN")}`;
    outRemainingBalanceDisplay.textContent = `₹${remaining.toLocaleString("en-IN")}`;

    outPaymentStatusBadge.classList.remove("bg-green-100", "text-green-800", "bg-yellow-100", "text-yellow-800", "bg-red-100", "text-red-800");
    if (totalPaid <= 0 && totalContract > 0) {
        outPaymentStatusBadge.textContent = "Unpaid";
        outPaymentStatusBadge.classList.add("bg-red-100", "text-red-800");
    } else if (remaining <= 0 && totalContract > 0) {
        outPaymentStatusBadge.textContent = "Fully Paid";
        outPaymentStatusBadge.classList.add("bg-green-100", "text-green-800");
    } else if (totalPaid > 0) {
        outPaymentStatusBadge.textContent = "Partially Paid";
        outPaymentStatusBadge.classList.add("bg-yellow-100", "text-yellow-800");
    } else {
        outPaymentStatusBadge.textContent = "N/A";
    }
}


async function handlePrintPDF() {
  if (!currentStudentData.acNo) {
    showToast("Please save the student record before printing.", true);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  let imgData = null;
  if (photoPreview.src && !photoPreview.src.includes("placehold.co")) {
    try {
      const response = await fetch(photoPreview.src);
      const blob = await response.blob();
      imgData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Could not load image for PDF:", e);
    }
  }

  const getFieldValue = (id) =>
    document.getElementById(id).value || "N/A";
  const studentName = getFieldValue("student-name");
  const acNoDisp = acNoInput.value; // Use the displayed value

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(
    "Mondal Automobile Motor Training School",
    doc.internal.pageSize.getWidth() / 2,
    15,
    { align: "center" }
  );
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Student Record Summary`,
    doc.internal.pageSize.getWidth() / 2,
    22,
    { align: "center" }
  );

  if (imgData) {
    doc.addImage(imgData, "JPEG", 165, 28, 30, 30);
  }

  doc.autoTable({
    startY: 28,
    body: [
      [
        {
          content: "Student Information",
          colSpan: 2,
          styles: {
            fontStyle: "bold",
            fillColor: [22, 160, 133],
            textColor: [255, 255, 255],
          },
        },
      ],
      ["A/C No.", acNoDisp], // Use displayed value
      ["Name", studentName],
      ["Guardian", getFieldValue("guardian-name")],
      [
        "Address",
        `${getFieldValue("village")}, P.O: ${getFieldValue(
          "post-office"
        )}, P.S: ${getFieldValue("police-station")}`,
      ],
      [
        "Location",
        `${getFieldValue("sub-district")}, ${getFieldValue(
          "district"
        )} - ${getFieldValue("pin-code")}`,
      ],
      ["Contact", getFieldValue("mobile-number")],
      ["DOB", formatDateDDMMYYYY(getFieldValue("dob"))], // Format date
      ["Aadhar", getFieldValue("aadhar-no")],
      ["Class", getFieldValue("class-type")],
    ],
    theme: "grid",
    columnStyles: { 0: { fontStyle: "bold" } },
    margin: { right: 50 },
  });

  let lastY = doc.lastAutoTable.finalY + 10;

  doc.autoTable({
    startY: lastY,
    body: [
      [
        {
          content: "Financial Summary",
          colSpan: 2,
          styles: {
            fontStyle: "bold",
            fillColor: [22, 160, 133],
            textColor: [255, 255, 255],
          },
        },
      ],
      [
        "Total Contract",
        `₹ ${Number(getFieldValue("total-contract")).toLocaleString(
          "en-IN"
        )}`,
      ],
      ["Total Paid", totalPaidDisplay.textContent],
      ["Remaining Balance", remainingBalanceDisplay.textContent],
      ["Status", paymentStatusBadge.textContent],
    ],
    theme: "grid",
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  lastY = doc.lastAutoTable.finalY;

  if (
    currentStudentData.payments &&
    currentStudentData.payments.length > 0
  ) {
    doc.text("Payment History", 14, lastY + 10);
    doc.autoTable({
      startY: lastY + 12,
      head: [["Date", "Amount (₹)", "Received By"]],
      body: currentStudentData.payments.map((p) => [
        formatDateDDMMYYYY(p.date), // Format date
        Number(p.amount).toLocaleString("en-IN"),
        p.receivedBy,
      ]),
      theme: "striped",
    });
    lastY = doc.lastAutoTable.finalY;
  }

  if (
    currentStudentData.learnerLicenses &&
    currentStudentData.learnerLicenses.length > 0
  ) {
    doc.text("Learner License History", 14, lastY + 10);
    doc.autoTable({
      startY: lastY + 12,
      head: [["LL Number", "Issued", "Valid Upto", "Result"]],
      body: currentStudentData.learnerLicenses.map((ll) => [
        ll.number,
        formatDateDDMMYYYY(ll.issueDate), // Format date
        formatDateDDMMYYYY(ll.validUpto), // Format date
        ll.testResult,
      ]),
      theme: "striped",
    });
  }

  doc.save(`Student_Record_${sanitizeDocId(acNoDisp)}.pdf`); // Use displayed value for filename
}

function handlePrintReceipt() {
  if (
    !currentStudentData.payments ||
    currentStudentData.payments.length === 0
  ) {
    showToast("No payments have been made to generate a receipt.", true);
    return;
  }

  const lastPayment =
    currentStudentData.payments[currentStudentData.payments.length - 1];
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const getFieldValue = (id) =>
    document.getElementById(id).value || "N/A";
  const acNoDisp = acNoInput.value; // Use displayed value
  const today = new Date().toISOString().split("T")[0];
  const receiptNo = `${today.replace(/-/g, "")}-${sanitizeDocId(acNoDisp)}`; // Use displayed value

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(
    "Mondal Automobile Motor Training School",
    doc.internal.pageSize.getWidth() / 2,
    20,
    { align: "center" }
  );
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Beside NH12, Uttarpara More, Radharghat, Berhampore, Murshidabad, WB, 742187",
    doc.internal.pageSize.getWidth() / 2,
    26,
    { align: "center" }
  );
  doc.setLineWidth(0.5);
  doc.line(15, 30, 195, 30);
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", doc.internal.pageSize.getWidth() / 2, 40, {
    align: "center",
  });

  doc.autoTable({
    startY: 45,
    body: [
      [
        {
          content: `Receipt No: ${receiptNo}`,
          styles: { fontStyle: "bold" },
        },
        {
          content: `Date: ${formatDateDDMMYYYY(lastPayment.date)}`, // Format date
          styles: { halign: "right" },
        },
      ],
      ["A/C No.", acNoDisp], // Use displayed value
      ["Student Name", getFieldValue("student-name")],
      ["Father's/Guardian's Name", getFieldValue("guardian-name")],
    ],
    theme: "plain",
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 5,
    head: [["Particulars", "Amount (INR)"]],
    body: [
      [
        `Course Fee for ${getFieldValue("class-type")}`,
        Number(getFieldValue("total-contract")).toLocaleString("en-IN"),
      ],
      [
        {
          content: `Payment Received (${lastPayment.paymentMode})`,
          styles: { fontStyle: "bold" },
        },
        {
          content: `₹ ${Number(lastPayment.amount).toLocaleString(
            "en-IN"
          )}`,
          styles: { fontStyle: "bold" },
        },
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [45, 52, 54] },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY,
    body: [
      ["Total Paid", totalPaidDisplay.textContent],
      [
        { content: "Balance Due", styles: { fontStyle: "bold" } },
        {
          content: remainingBalanceDisplay.textContent,
          styles: { fontStyle: "bold" },
        },
      ],
    ],
    theme: "grid",
  });

  doc.setFontSize(10);
  doc.text(
    `Received By: ${lastPayment.receivedBy}`,
    15,
    doc.lastAutoTable.finalY + 15
  );
  
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(
    "This is a computer-generated receipt.",
    doc.internal.pageSize.getWidth() / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  doc.save(`Payment_Receipt_${receiptNo}.pdf`);
}

async function handleOutPrintPDF() {
  if (!currentOutCandidateData.acNo) {
    showToast("Please save the candidate record before printing.", true);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  let imgData = null;
  if (outPhotoPreview.src && !outPhotoPreview.src.includes("placehold.co")) {
    try {
      const response = await fetch(outPhotoPreview.src);
      const blob = await response.blob();
      imgData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Could not load image for PDF:", e);
    }
  }

  const getOutFieldValue = (id) => document.getElementById(id).value || "N/A";
  const candidateName = getOutFieldValue("out-candidate-name");
  const acNoDisp = outAcNoInput.value; // Use displayed value

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Mondal Automobile Motor Training School", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Out Candidate Record Summary`, doc.internal.pageSize.getWidth() / 2, 22, { align: "center" });

  if (imgData) {
    doc.addImage(imgData, "JPEG", 165, 28, 30, 30);
  }

  doc.autoTable({
    startY: 28,
    body: [
      [{ content: "Candidate Information", colSpan: 2, styles: { fontStyle: "bold", fillColor: [22, 160, 133], textColor: [255, 255, 255] } }],
      ["A/C No.", acNoDisp], // Use displayed value
      ["Name", candidateName],
      ["Guardian", getOutFieldValue("out-guardian-name")],
      ["Address", `${getOutFieldValue("out-village")}, P.O: ${getOutFieldValue("out-post-office")}, P.S: ${getOutFieldValue("out-police-station")}`],
      ["Location", `${getOutFieldValue("out-sub-district")}, ${getOutFieldValue("out-district")} - ${getOutFieldValue("out-pin-code")}`],
      ["Contact", getOutFieldValue("out-mobile-number")],
      ["DOB", formatDateDDMMYYYY(getOutFieldValue("out-dob"))], // Format date
      ["Aadhar", getOutFieldValue("out-aadhar-no")],
      ["License Category", getOutFieldValue("out-class-type")],
    ],
    theme: "grid",
    columnStyles: { 0: { fontStyle: "bold" } },
    margin: { right: 50 },
  });

  let lastY = doc.lastAutoTable.finalY + 10;

  doc.autoTable({
    startY: lastY,
    body: [
      [{ content: "Financial Summary", colSpan: 2, styles: { fontStyle: "bold", fillColor: [22, 160, 133], textColor: [255, 255, 255] } }],
      ["Total Contract", `₹ ${Number(getOutFieldValue("out-total-contract")).toLocaleString("en-IN")}`],
      ["Total Paid", outTotalPaidDisplay.textContent],
      ["Remaining Balance", outRemainingBalanceDisplay.textContent],
      ["Status", outPaymentStatusBadge.textContent],
    ],
    theme: "grid",
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  lastY = doc.lastAutoTable.finalY;

  if (currentOutCandidateData.payments && currentOutCandidateData.payments.length > 0) {
    doc.text("Payment History", 14, lastY + 10);
    doc.autoTable({
      startY: lastY + 12,
      head: [["Date", "Amount (₹)", "Received By"]],
      body: currentOutCandidateData.payments.map((p) => [formatDateDDMMYYYY(p.date), Number(p.amount).toLocaleString("en-IN"), p.receivedBy]), // Format date
      theme: "striped",
    });
    lastY = doc.lastAutoTable.finalY;
  }

  if (currentOutCandidateData.learnerLicenses && currentOutCandidateData.learnerLicenses.length > 0) {
    doc.text("Learner License History", 14, lastY + 10);
    doc.autoTable({
      startY: lastY + 12,
      head: [["LL Number", "Issued", "Valid Upto", "Result"]],
      body: currentOutCandidateData.learnerLicenses.map((ll) => [ll.number, formatDateDDMMYYYY(ll.issueDate), formatDateDDMMYYYY(ll.validUpto), ll.testResult]), // Format dates
      theme: "striped",
    });
  }

  doc.save(`Out_Candidate_Record_${sanitizeDocId(acNoDisp)}.pdf`); // Use displayed value
}

function handleOutPrintReceipt() {
  if (!currentOutCandidateData.payments || currentOutCandidateData.payments.length === 0) {
    showToast("No payments have been made to generate a receipt.", true);
    return;
  }

  const lastPayment = currentOutCandidateData.payments[currentOutCandidateData.payments.length - 1];
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  
  const getOutFieldValue = (id) => document.getElementById(id).value || "N/A";
  const acNoDisp = outAcNoInput.value; // Use displayed value
  const today = new Date().toISOString().split("T")[0];
  const receiptNo = `${today.replace(/-/g, "")}-${sanitizeDocId(acNoDisp)}`; // Use displayed value

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Mondal Automobile Motor Training School", doc.internal.pageSize.getWidth() / 2, 20, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Beside NH12, Uttarpara More, Radharghat, Berhampore, Murshidabad, WB, 742187", doc.internal.pageSize.getWidth() / 2, 26, { align: "center" });
  doc.setLineWidth(0.5);
  doc.line(15, 30, 195, 30);
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", doc.internal.pageSize.getWidth() / 2, 40, { align: "center" });

  doc.autoTable({
    startY: 45,
    body: [
      [{ content: `Receipt No: ${receiptNo}`, styles: { fontStyle: "bold" } }, { content: `Date: ${formatDateDDMMYYYY(lastPayment.date)}`, styles: { halign: "right" } }], // Format date
      ["A/C No.", acNoDisp], // Use displayed value
      ["Candidate Name", getOutFieldValue("out-candidate-name")],
      ["Father's/Guardian's Name", getOutFieldValue("out-guardian-name")],
    ],
    theme: "plain",
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 5,
    head: [["Particulars", "Amount (INR)"]],
    body: [
      [`Fee for ${getOutFieldValue("out-class-type")}`, Number(getOutFieldValue("out-total-contract")).toLocaleString("en-IN")],
      [{ content: `Payment Received (${lastPayment.paymentMode})`, styles: { fontStyle: "bold" } }, { content: `₹ ${Number(lastPayment.amount).toLocaleString("en-IN")}`, styles: { fontStyle: "bold" } }],
    ],
    theme: "striped",
    headStyles: { fillColor: [45, 52, 54] },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY,
    body: [
      ["Total Paid", outTotalPaidDisplay.textContent],
      [{ content: "Balance Due", styles: { fontStyle: "bold" } }, { content: outRemainingBalanceDisplay.textContent, styles: { fontStyle: "bold" } }],
    ],
    theme: "grid",
  });

  doc.setFontSize(10);
  doc.text(`Received By: ${lastPayment.receivedBy}`, 15, doc.lastAutoTable.finalY + 15);
  
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text("This is a computer-generated receipt.", doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });

  doc.save(`Payment_Receipt_Out_Candidate_${receiptNo}.pdf`);
}

// --- ADD THIS NEW FUNCTION ---
async function loadTodaysRevenue() {
    const revenueEl = document.getElementById("staff-today-revenue");
    if (!revenueEl) return; // Exit if the element isn't on the page

    // Get Timestamps for start and end of today
    const now = new Date();
    const todayStart = Timestamp.fromDate(new Date(now.setHours(0, 0, 0, 0)));
    const todayEnd = Timestamp.fromDate(new Date(now.setHours(23, 59, 59, 999)));

    try {
        const paymentsRef = collection(db, "payments");
        const qToday = query(paymentsRef,
            where("date", ">=", todayStart),
            where("date", "<=", todayEnd)
        );

        const todaySnapshot = await getDocs(qToday);
        let todayTotal = 0;
        todaySnapshot.forEach(doc => {
            todayTotal += Number(doc.data().amount);
        });

        revenueEl.textContent = `₹${todayTotal.toLocaleString("en-IN")}`;

    } catch (error) {
        console.error("Error fetching today's revenue:", error);
        revenueEl.textContent = "Error";
        // Check for missing index, which is a common issue
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
             console.error("CRITICAL: A Firestore index is required for the 'Today's Revenue' query. Please create a composite index for 'payments' on the 'date' field (ascending).");
             revenueEl.textContent = "Index Error";
         }
    }
}
// --- END OF NEW FUNCTION ---

async function generateNextAccountNumber(recordType) {
    const counterRef = doc(db, "counters", "sequence_tracker");
    const currentYear = new Date().getFullYear();

    try {
        const newAcNo = await runTransaction(db, async (transaction) => {
            let counterDoc;
            try {
                counterDoc = await transaction.get(counterRef);
                 console.log("Read counter doc:", counterDoc.exists() ? counterDoc.data() : 'Does not exist');
            } catch (error) {
                console.error("Error getting counter document in transaction:", error);
                throw new Error("Failed to read counter data.");
            }

            let student_sequence = 1;
            let out_candidate_sequence = 1;
            let lastResetYear = currentYear;

            if (counterDoc.exists()) {
                const data = counterDoc.data();
                lastResetYear = data.lastResetYear || currentYear;
                if(lastResetYear < currentYear){
                    console.log(`Year changed from ${lastResetYear} to ${currentYear}. Resetting sequences.`);
                    student_sequence = 1;
                    out_candidate_sequence = 1;
                } else {
                    student_sequence = data.student_sequence || 1;
                    out_candidate_sequence = data.out_candidate_sequence || 1;
                    console.log(`Current year ${currentYear}. Read sequences: student=${student_sequence}, out=${out_candidate_sequence}`);
                }
            } else {
                 console.log("Counter document does not exist. Starting sequences at 1.");
            }

            let formattedAcNo;
            const updateData = { lastResetYear: currentYear };

            if (recordType === 'students') {
                formattedAcNo = `${String(student_sequence).padStart(2, '0')}/${currentYear}`;
                updateData.student_sequence = student_sequence + 1;
                 console.log(`Generating student AC No: ${formattedAcNo}. Next sequence: ${updateData.student_sequence}`);
            } else { // out-candidates
                formattedAcNo = `${String(out_candidate_sequence).padStart(3, '0')}/O/${currentYear}`;
                updateData.out_candidate_sequence = out_candidate_sequence + 1;
                 console.log(`Generating out-candidate AC No: ${formattedAcNo}. Next sequence: ${updateData.out_candidate_sequence}`);
            }

            try {
                 transaction.set(counterRef, updateData, { merge: true });
                 console.log("Successfully set updateData in transaction:", updateData);
            } catch (error) {
                 console.error("Error setting counter document in transaction:", error);
                 throw new Error("Failed to update counter data.");
            }
            return formattedAcNo;
        });
        console.log(`Generated AC No: ${newAcNo}`);
        return newAcNo;
    } catch (error) {
        console.error("Transaction failed for generating account number:", error);
        showToast(`Could not generate account number: ${error.message}`, true);
        return null;
    }
}

async function generateNextForm5SerialNo() {
    const counterRef = doc(db, "counters", "sequence_tracker");
    const currentYear = new Date().getFullYear();

    try {
        const newSerialNo = await runTransaction(db, async (transaction) => {
             let counterDoc;
             try {
                counterDoc = await transaction.get(counterRef);
                 console.log("Read counter doc for Form 5:", counterDoc.exists() ? counterDoc.data() : 'Does not exist');
             } catch (error) {
                console.error("Error getting counter document for Form 5 Serial:", error);
                throw new Error("Failed to read counter data.");
             }

            let form5_sequence = 1;
            let lastResetYear = currentYear;

            if (counterDoc.exists()) {
                 const data = counterDoc.data();
                 lastResetYear = data.lastResetYear || currentYear;
                 if(lastResetYear < currentYear){
                     console.log(`Year changed from ${lastResetYear} to ${currentYear}. Resetting Form 5 sequence.`);
                     form5_sequence = 1;
                 } else {
                     form5_sequence = data.form5_sequence || 1;
                     console.log(`Current year ${currentYear}. Read Form 5 sequence: ${form5_sequence}`);
                 }
            } else {
                 console.log("Counter document does not exist. Starting Form 5 sequence at 1.");
            }

            // Apply the new format MAMTS/Sequence/Year
            const formattedSerialNo = `MAMTS/${String(form5_sequence).padStart(2, '0')}/${currentYear}`;
            const updateData = {
                 form5_sequence: form5_sequence + 1,
                 lastResetYear: currentYear // Ensure reset year is updated too
            };

            try {
                transaction.set(counterRef, updateData, { merge: true });
                 console.log(`Generating Form 5 Serial: ${formattedSerialNo}. Next sequence: ${updateData.form5_sequence}`);
                 console.log("Successfully set Form 5 updateData in transaction:", updateData);
            } catch(error){
                console.error("Error setting counter document for Form 5 Serial:", error);
                throw new Error("Failed to update counter data.");
            }
            return formattedSerialNo;
        });
        console.log(`Generated Form 5 Serial: ${newSerialNo}`);
        return newSerialNo;
    } catch (error) {
        console.error("Transaction failed for generating Form 5 serial number:", error);
        showToast(`Could not generate Form 5 serial number: ${error.message}`, true);
        return null;
    }
}

async function handleSaveForm5(event) {
    event.preventDefault();
    let serialNo = form5SerialNoInput.value.trim();
    const isNewForm5 = !currentForm5Data.serialNo || serialNo === '';

    // --- Generate Serial No ONLY if it's a new record ---
    if (isNewForm5) {
        showToast("Generating Form 5 serial number...");
        const generatedSerialNo = await generateNextForm5SerialNo();
        if (!generatedSerialNo) { // Explicitly check for null or failure
            showToast("Failed to generate serial number. Cannot save Form 5.", true);
            console.error("generateNextForm5SerialNo returned null or undefined.");
            return; // Stop execution
        }
        serialNo = generatedSerialNo;
    }

    // --- Validate Serial Number ---
     if (!serialNo || serialNo.length === 0) {
        showToast("Serial number is missing or invalid. Cannot save.", true);
        console.error("Serial number is invalid before attempting save.");
        return;
    }


    // --- Collect Data ---
    const formData = {};
    form5FieldIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
             // Use the specific keys expected by the PDF generator
             const dataKey = id.replace(/^form5-/, '');
             formData[dataKey] = element.value;
             // Add lowercase name for searching
             if(dataKey === 'name' && element.value) {
                 formData['name-lowercase'] = element.value.toLowerCase();
             } else if (dataKey === 'name') {
                 formData['name-lowercase'] = '';
             }
        }
    });
    formData.serialNo = serialNo; // Add the generated or existing serial number
    formData.savedTimestamp = new Date().toISOString();

    // Sanitize the serial number specifically for use as a Firestore document ID
    const docId = sanitizeDocId(serialNo);
     if (!docId) {
        showToast("Invalid Serial Number for saving.", true);
        console.error(`Invalid docId generated from serialNo: ${serialNo}`);
        return;
    }


    // --- Save to Firestore ---
    try {
        console.log(`Attempting to save Form 5 with ID: ${docId}`, formData);
        await setDoc(doc(db, "form5_records", docId), formData, { merge: true });
        showToast("Form 5 record saved successfully!");

        form5SerialNoInput.value = serialNo; // Display the original formatted serial number
        currentForm5Data = { ...formData, docId: docId }; // Update local state including sanitized docId
        printForm5Btn.disabled = false; // Enable print button
        printForm5Btn.classList.remove("opacity-50", "cursor-not-allowed");
        form5SerialNoInput.readOnly = true; // Make read-only after save
        form5SerialNoInput.disabled = true;


    } catch (error) {
        console.error("Error writing Form 5 document:", error);
        showToast(`Failed to save Form 5 record. Error: ${error.message}`, true);
    }
}

function handlePrintForm5PDF() {
    if (!currentForm5Data.serialNo) {
        showToast("No Form 5 data loaded or saved. Please save the record first.", true);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const data = currentForm5Data;
    const today = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY format

    // --- PDF Content based on the uploaded PDF ---
    const marginLeft = 15;
    const marginRight = 195; // A4 width 210mm - 15mm margin
    const topMargin = 20;
    let currentY = topMargin;

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("FORM NO-5", doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 7;

    // Rule Reference
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("[See rule 14(e) 17(1) (b), 27(d) and 32A (2)]", doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 7;

    // Certificate Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("DRIVING CERTIFICATE BY", doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 6;

    // School Name and Address
    doc.setFontSize(14); // Slightly larger for school name
    doc.text("MONDAL AUTOMOBILE MOTOR TRAINING SCHOOL", doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text("NH 34, Uttarpara More, Radharghat, Berhampore, Murshidabad", doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 10;

    // Serial No.
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Serial No. ${data.serialNo}`, marginLeft, currentY); // Use original formatted serial number
    currentY += 10;

    // Main Body Text
    doc.setFont('helvetica', 'normal');
    doc.text(`This is to certify that Sri/Smt/Kumari:`, marginLeft, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(data.name || 'N/A', marginLeft + 70, currentY); // Use 'name' key
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`Son/Wife/Daughter of:`, marginLeft, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(data.guardian || 'N/A', marginLeft + 70, currentY); // Use 'guardian' key
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`Resident Of:`, marginLeft, currentY);
    // Address might need word wrapping
    const addressLines = doc.splitTextToSize(data.address || 'N/A', marginRight - marginLeft - 30); // Use 'address' key
    doc.setFont('helvetica', 'bold');
    doc.text(addressLines, marginLeft + 30, currentY);
    currentY += (addressLines.length * 5) + 5; // Adjust spacing based on address lines

    doc.setFont('helvetica', 'normal');
    doc.text(`his/her name is registered as serial no.`, marginLeft, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(data.serialNo, marginLeft + 75, currentY); // Display serial number again
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`Was enrolled in the school on`, marginLeft, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDateDDMMYYYY(data['enroll-date']) || 'N/A', marginLeft + 65, currentY); // Format date
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`In our Register and he / she has under gone the course of training in driving of`, marginLeft, currentY);
    currentY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text(data['vehicle-class'] || 'N/A', marginLeft, currentY); // Use 'vehicle-class' key
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`According to the syllabus prescribed for a period from`, marginLeft, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDateDDMMYYYY(data['training-from']) || 'N/A', marginLeft + 100, currentY); // Format date
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`to`, marginLeft, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDateDDMMYYYY(data['training-to']) || 'N/A', marginLeft + 10, currentY); // Format date
    doc.setFont('helvetica', 'normal');
    doc.text(`satisfactionaly.`, marginLeft + 50, currentY); // Spelling as per PDF
    currentY += 10;

    doc.text(`I am satisfied with his or her physical fitness and sense of responsibility.`, marginLeft, currentY);
    currentY += 10;

    doc.text(`License no.`, marginLeft, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(data['school-license'] || 'N/A', marginLeft + 25, currentY); // Use 'school-license' key
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`Valid Till:`, marginLeft, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDateDDMMYYYY(data['valid-till']) || 'N/A', marginLeft + 20, currentY); // Format date
    currentY += 25; // Space before signature

    // Signature Area
    doc.setFont('helvetica', 'normal');
    doc.text('Authority signature with Seal', marginRight - 50, currentY, { align: 'left' });
    doc.line(marginRight - 60, currentY - 2, marginRight, currentY - 2); // Signature line


    // Save PDF
    doc.save(`Form5_${sanitizeDocId(data.serialNo)}.pdf`);
}



// --- CSV Utilities ---
function convertToCSV(headers, dataRows) {
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    let str = String(value);
    if (value instanceof Timestamp) {
        // Convert Firestore Timestamp to YYYY-MM-DD string
        str = value.toDate().toISOString().split('T')[0];
    }
    if (str.search(/("|,|\n)/g) >= 0) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headerRow = headers.map(escapeCSV).join(",");
  const contentRows = dataRows.map((row) => row.map(escapeCSV).join(","));
  return [headerRow, ...contentRows].join("\n");
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([`\uFEFF${csvContent}`], { // Add BOM for Excel UTF-8 compatibility
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- Page Navigation and Setup Script ---
// --- UPGRADED GATEKEEPER (RUNS IMMEDIATELY) ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // No user logged in, kick them out to the login page.
        window.location.href = 'login.html';
    } else {
        // User IS logged in.
        // 1. Fetch their role and wait for it to finish.
        await fetchUserRole(user.uid); 
        // 2. Now, set up the UI (show/hide admin button)
        setupAdminUI();
    }
});
// --- END UPGRADED GATEKEEPER ---
// --- END GATEKEEPER ---

// --- ORIGINAL APP START (Waits for HTML to load) ---
document.addEventListener("DOMContentLoaded", () => {
  // --- NEW INACTIVITY LOGOUT CODE ---
    let inactivityTimer;
    // 1 hour in milliseconds (60 minutes * 60 seconds * 1000 milliseconds)
    // For testing, you can set this to 5000 (5 seconds)
    const inactivityTime = 3600 * 1000; 

    function logoutUser() {
        console.log("Logging out due to inactivity.");
        alert("You have been logged out due to inactivity.");
        signOut(auth); // This logs the user out
        // The "gatekeeper" will automatically redirect to login.html
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(logoutUser, inactivityTime);
    }

    // Listen for any user activity on the page
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);

    // Start the timer for the first time
    resetInactivityTimer();
    // --- END OF NEW INACTIVITY LOGOUT CODE ---
    // --- END GATEKEEPER ---
    // --- This is the critical fix. All code that touches the page now runs *after* the page is loaded. ---
  
  // 1. Initialize all UI element variables
  // This function finds all the buttons, inputs, etc., on your page
  initializeUIElements();
  setupAdminUI(); // This makes sure the button appears

  // 2. Define Navigation Functions
  const dashboard = document.getElementById("dashboard");
  const formsWrapper = document.getElementById("forms-wrapper");
  const cards = document.querySelectorAll(".card"); // Find cards HERE
  const backButtons = document.querySelectorAll(".back-btn"); // Find backButtons HERE
  const formContainers = document.querySelectorAll(".form-container");
  const paymentReportSection = document.getElementById("payment-report-section");
  const studentLookupSection = document.getElementById("student-lookup");

  const showDashboard = () => {
    if (dashboard) dashboard.classList.remove("hidden");
    if (studentLookupSection) studentLookupSection.classList.remove("hidden");
    if (formsWrapper) formsWrapper.classList.add("hidden");
    if (formContainers) formContainers.forEach((form) => form.classList.add("hidden"));
    if (paymentReportSection) paymentReportSection.classList.add('hidden'); // Hide report section
  };

  showForm = (formId) => {
    if (dashboard) dashboard.classList.add("hidden");
    if (studentLookupSection) studentLookupSection.classList.add("hidden");
    if (formsWrapper) formsWrapper.classList.remove("hidden");
    if (paymentReportSection) paymentReportSection.classList.add('hidden'); // Hide report section
    if (formContainers) formContainers.forEach((form) => {
      if (form.id === formId) {
        form.classList.remove("hidden");
      } else {
        form.classList.add("hidden");
      }
    });
  };

  // NEW FUNCTION FOR THE PAYMENT REPORT PAGE
   const showReportSection = () => {
        if (dashboard) dashboard.classList.add("hidden");
        if (studentLookupSection) studentLookupSection.classList.add("hidden");
        if (formsWrapper) formsWrapper.classList.remove("hidden");
        if (formContainers) formContainers.forEach((form) => form.classList.add("hidden"));
        if (paymentReportSection) paymentReportSection.classList.remove('hidden'); // Show report section

        // Set default dates to today
        const today = new Date().toISOString().split('T')[0];
        if (reportFromDateInput) reportFromDateInput.value = today;
        if (reportToDateInput) reportToDateInput.value = today;
         // Clear previous results
        if (paymentReportTbody) paymentReportTbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">Select dates and generate report to view payments.</td></tr>';
        if (reportSummaryDiv) reportSummaryDiv.classList.add('hidden');
   };

  // 3. Attach All Event Listeners (THIS IS THE FIX)
  if (lookupBtn) lookupBtn.addEventListener("click", findRecord);
  if (admissionForm) admissionForm.addEventListener("submit", handleSaveStudent);
  if (addRemarkBtn) addRemarkBtn.addEventListener("click", handleAddRemark);
  if (addPaymentBtn) addPaymentBtn.addEventListener("click", handleAddPayment);
  if (addLLBtn) addLLBtn.addEventListener("click", handleAddLearnerLicense);
  if (photoUploadInput) photoUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && photoPreview) photoPreview.src = URL.createObjectURL(file);
  });
  if (totalContractInput) totalContractInput.addEventListener("input", () => {
    updatePaymentDisplay(Number(totalContractInput.value), currentStudentData.payments || []);
  });
  if (districtSelect) districtSelect.addEventListener("change", (event) => { populateSubDistricts(event.target.value); });
  if (aadharInput) aadharInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\s/g, "");
    if (value.length > 12) value = value.slice(0, 12);
    let formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ");
    e.target.value = formatted;
  });
  if (printPdfBtn) printPdfBtn.addEventListener("click", handlePrintPDF);
  if (printReceiptBtn) printReceiptBtn.addEventListener("click", handlePrintReceipt);
  if (exportStudentsCard) exportStudentsCard.addEventListener("click", handleExportStudents);
  if (exportOutCandidatesCard) exportOutCandidatesCard.addEventListener("click", handleExportOutCandidates);
  if (exportForm5Card) exportForm5Card.addEventListener("click", handleExportForm5Data);
  if (closeModalBtn) closeModalBtn.addEventListener("click", hideModal);

  // Out Candidate Form Listeners
  if (outCandidateForm) outCandidateForm.addEventListener("submit", handleSaveOutCandidate);
  if (outAddRemarkBtn) outAddRemarkBtn.addEventListener("click", handleAddOutRemark);
  if (outAddPaymentBtn) outAddPaymentBtn.addEventListener("click", handleAddOutPayment);
  if (outAddLLBtn) outAddLLBtn.addEventListener("click", handleAddOutLearnerLicense);
  if (outPhotoUploadInput) outPhotoUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && outPhotoPreview) outPhotoPreview.src = URL.createObjectURL(file);
  });
  if (outTotalContractInput) outTotalContractInput.addEventListener("input", () => {
    updateOutPaymentDisplay(Number(outTotalContractInput.value), currentOutCandidateData.payments || []);
  });
  if (outDistrictSelect) outDistrictSelect.addEventListener("change", (event) => { populateSubDistricts(event.target.value); });
  if (outAadharInput) outAadharInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\s/g, "");
    if (value.length > 12) value = value.slice(0, 12);
    let formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ");
    e.target.value = formatted;
  });
  if (outPrintPdfBtn) outPrintPdfBtn.addEventListener("click", handleOutPrintPDF);
  if (outPrintReceiptBtn) outPrintReceiptBtn.addEventListener("click", handleOutPrintReceipt);

  // Form 5 Listeners
  if (form5Form) form5Form.addEventListener("submit", handleSaveForm5);
  if (printForm5Btn) printForm5Btn.addEventListener("click", handlePrintForm5PDF);

  // Payment Report Listener (NEW)
  if (generateReportBtn) generateReportBtn.addEventListener("click", fetchPaymentReport);

  // Navigation Listeners (UPDATED)
  if (cards) cards.forEach((card) => {
    if (card.hasAttribute('data-target')) {
        card.addEventListener("click", (e) => {
            const targetFormId = card.getAttribute("data-target");
            if (!targetFormId) return;

            // This 'if' block is NEW and handles the report card
            if (targetFormId === "payment-report-section") {
                 showReportSection();
            } else if (targetFormId === "form-admission") {
                if(admissionForm) admissionForm.reset();
                currentStudentData = {};
                if(acNoInput) {
                    acNoInput.value = '';
                    acNoInput.readOnly = true;
                    acNoInput.disabled = true;
                }
                displayRemarks([]);
                displayLLHistory([]);
                displayPaymentHistory([]);
                populateSubDistricts("");
                updatePaymentDisplay(0, []);
                if(photoPreview) photoPreview.src = "https://placehold.co/100x100/e2e8f0/718096?text=Photo";
                if(lookupStatus) lookupStatus.textContent = "";
                if(searchValueInput) searchValueInput.value = "";
                if(printPdfBtn) {
                    printPdfBtn.disabled = true;
                    printPdfBtn.classList.add("opacity-50", "cursor-not-allowed");
                }
                if(printReceiptBtn) {
                    printReceiptBtn.disabled = true;
                    printReceiptBtn.classList.add("opacity-50", "cursor-not-allowed");
                }
                showForm(targetFormId);
            } else if (targetFormId === "form-out-candidate") {
                 if(outCandidateForm) outCandidateForm.reset();
                 currentOutCandidateData = {};
                 if(outAcNoInput) {
                     outAcNoInput.value = '';
                     outAcNoInput.readOnly = true;
                     outAcNoInput.disabled = true;
                 }
                 displayOutRemarks([]);
                 displayOutLLHistory([]);
                 displayOutPaymentHistory([]);
                 populateSubDistricts("");
                 updateOutPaymentDisplay(0, []);
                 if(outPhotoPreview) outPhotoPreview.src = "https://placehold.co/100x100/e2e8f0/718096?text=Photo";
                 if(outPrintPdfBtn) {
                    outPrintPdfBtn.disabled = true;
                    outPrintPdfBtn.classList.add("opacity-50", "cursor-not-allowed");
                 }
                 if(outPrintReceiptBtn) {
                    outPrintReceiptBtn.disabled = true;
                    outPrintReceiptBtn.classList.add("opacity-50", "cursor-not-allowed");
                 }
                 showForm(targetFormId);
            } else if (targetFormId === "form-misc") {
                  if(form5Form) form5Form.reset();
                  currentForm5Data = {};
                  if(form5SerialNoInput) form5SerialNoInput.value = '';
                  if(printForm5Btn) {
                      printForm5Btn.disabled = true;
                      printForm5Btn.classList.add("opacity-50", "cursor-not-allowed");
                  }
                  if(form5SchoolLicenseInput) form5SchoolLicenseInput.value = "WB57 20230006054";
                  showForm(targetFormId);
            } else {
               showForm(targetFormId);
            }
        });
    }
  });

  if (backButtons) backButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      showDashboard();
      
    });
  });

  // 4. Show initial state
  showDashboard();
  loadTodaysRevenue();
});