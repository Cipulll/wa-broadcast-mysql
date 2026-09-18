const API_URL = "http://localhost:3000/api";
let authMode = "login"; // Mode default: 'login' atau 'register'
let loadedContacts = [];
let loadedHistory = [];
let activeBroadcastId = null;
let waInterval = null;

// Helper Auth Token
function saveToken(token) {
  localStorage.setItem("token", token);
}
function getToken() {
  return localStorage.getItem("token");
}
function removeToken() {
  localStorage.removeItem("token");
}

async function fetchAPI(endpoint, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Terjadi kesalahan sistem");
  return data;
}

// 1. SWITCH TAB LOGIN / REGISTER
function switchAuthTab(mode) {
  authMode = mode;
  const loginBtn = document.getElementById("tabLoginBtn");
  const regBtn = document.getElementById("tabRegBtn");
  const submitBtn = document.getElementById("authSubmitBtn");

  if (mode === "login") {
    loginBtn.className =
      "w-1/2 py-2 font-bold text-center border-b-2 border-emerald-600 text-emerald-600 text-sm";
    regBtn.className =
      "w-1/2 py-2 font-bold text-center border-b-2 border-transparent text-gray-400 hover:text-gray-600 text-sm";
    submitBtn.textContent = "Login ke Dashboard";
    submitBtn.className =
      "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm shadow";
  } else {
    regBtn.className =
      "w-1/2 py-2 font-bold text-center border-b-2 border-blue-600 text-blue-600 text-sm";
    loginBtn.className =
      "w-1/2 py-2 font-bold text-center border-b-2 border-transparent text-gray-400 hover:text-gray-600 text-sm";
    submitBtn.textContent = "Register Akun Baru";
    submitBtn.className =
      "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm shadow";
  }
}

// 2. SUBMIT AUTH (LOGIN / REGISTER)
async function handleAuthSubmit(e) {
  e.preventDefault();
  const username = document.getElementById("authUsername").value.trim();
  const password = document.getElementById("authPassword").value.trim();

  if (!username || !password)
    return alert("Username dan Password wajib diisi!");

  if (authMode === "register") {
    try {
      await fetchAPI("/auth/register", "POST", { username, password });
      alert("✅ Register berhasil! Silakan klik Login.");
      switchAuthTab("login");
      document.getElementById("authPassword").value = "";
    } catch (err) {
      alert("❌ Register Gagal: " + err.message);
    }
  } else {
    try {
      const data = await fetchAPI("/auth/login", "POST", {
        username,
        password,
      });
      saveToken(data.token);
      alert("✅ Login Berhasil!");
      await initDashboard();
    } catch (err) {
      alert("❌ Login Gagal: " + err.message);
    }
  }
}

function handleLogout() {
  removeToken();
  if (waInterval) clearInterval(waInterval);
  document.getElementById("authSection").classList.remove("hidden");
  document.getElementById("dashboardSection").classList.add("hidden");
}

// 3. INITIALIZE DASHBOARD
async function initDashboard() {
  const token = getToken();
  if (!token) {
    document.getElementById("authSection").classList.remove("hidden");
    document.getElementById("dashboardSection").classList.add("hidden");
    return;
  }

  try {
    const profile = await fetchAPI("/profile");
    document.getElementById("userDisplay").textContent =
      `User: ${profile.userData.username}`;
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("dashboardSection").classList.remove("hidden");

    await checkWAStatus();
    await loadContacts();
    await loadBroadcastHistory();

    if (waInterval) clearInterval(waInterval);
    waInterval = setInterval(async () => {
      const status = await checkWAStatus();
      if (status === "CONNECTED") clearInterval(waInterval);
    }, 4000);
  } catch (err) {
    handleLogout();
  }
}

// 4. WA STATUS & QR CODE (FIXED FORMAT & RENDER)
async function checkWAStatus() {
  const badge = document.getElementById("waStatusBadge");
  const qrContainer = document.getElementById("qrCodeContainer");
  const qrImage = document.getElementById("qrImage");

  try {
    const data = await fetchAPI("/wa/status");

    if (badge) badge.textContent = data.status || "DISCONNECTED";

    if (data.status === "CONNECTED") {
      if (badge) {
        badge.className =
          "px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800";
      }
      if (qrContainer) qrContainer.classList.add("hidden");
    } else {
      if (badge) {
        badge.className =
          "px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800";
      }

      if (data.qr && qrImage && qrContainer) {
        const qrSrc = data.qr.startsWith("data:image")
          ? data.qr
          : `data:image/png;base64,${data.qr}`;
        qrImage.src = qrSrc;
        qrContainer.classList.remove("hidden");
      } else if (qrContainer) {
        qrContainer.classList.add("hidden");
      }
    }
    return data.status;
  } catch (err) {
    if (badge) badge.textContent = "ERROR";
    if (qrContainer) qrContainer.classList.add("hidden");
    return "ERROR";
  }
}

// 5. MANAGEMENT KONTAK
async function loadContacts() {
  const tbody = document.getElementById("contactTableBody");
  try {
    const res = await fetchAPI("/contacts");
    loadedContacts = res.data;

    if (loadedContacts.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="p-3 text-center text-gray-400">Belum ada kontak</td></tr>';
      return;
    }

    tbody.innerHTML = loadedContacts
      .map(
        (c) => `
            <tr class="border-b text-xs">
                <td class="p-2 font-medium">${c.name}</td>
                <td class="p-2 text-gray-600">${c.phone.replace("@c.us", "")}</td>
                <td class="p-2 text-center">
                    <button type="button" onclick="handleDeleteContact(${c.id})" class="text-red-500 hover:text-red-700 font-bold">✕</button>
                </td>
            </tr>
        `,
      )
      .join("");
  } catch (err) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="p-3 text-center text-red-500">Gagal memuat kontak</td></tr>';
  }
}

async function handleAddContact() {
  const nameInput = document.getElementById("contactName");
  const phoneInput = document.getElementById("contactPhone");

  const name = nameInput.value.trim();
  let phone = phoneInput.value.trim();

  if (!name || !phone) return alert("Nama dan Nomor HP wajib diisi!");

  if (phone.startsWith("0")) {
    phone = "62" + phone.slice(1);
  }

  try {
    await fetchAPI("/contacts", "POST", { name, phone });
    nameInput.value = "";
    phoneInput.value = "";
    alert("✅ Kontak berhasil disimpan!");
    await loadContacts();
  } catch (err) {
    alert("❌ Gagal menyimpan kontak: " + err.message);
  }
}

async function handleDeleteContact(id) {
  if (!confirm("Hapus kontak ini?")) return;
  try {
    await fetchAPI(`/contacts/${id}`, "DELETE");
    await loadContacts();
  } catch (err) {
    alert(err.message);
  }
}

async function handleImportCSV() {
  const fileInput = document.getElementById("csvFileInput");
  if (!fileInput.files[0]) return;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    const token = getToken();
    const res = await fetch(`${API_URL}/contacts/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    alert(data.message);
    fileInput.value = "";
    await loadContacts();
  } catch (err) {
    alert(err.message);
  }
}

// 6. BROADCAST ENGINE (OPSI A: JSON PAYLOAD)
function insertVariable(varName) {
  const textarea = document.getElementById("broadcastMessage");
  textarea.value += varName;
}

async function handleSendBroadcast() {
  const title = document.getElementById("broadcastTitle").value;
  const message = document.getElementById("broadcastMessage").value;

  if (!title || !message) return alert("Judul dan Pesan wajib diisi!");
  if (loadedContacts.length === 0)
    return alert("Tidak ada kontak target! Tambahkan kontak terlebih dahulu.");

  try {
    const data = await fetchAPI("/broadcast/send", "POST", {
      title,
      message,
      targets: loadedContacts.map((c) => ({ name: c.name, phone: c.phone })),
      delay_seconds: 5,
    });

    alert("🚀 " + data.message);
    document.getElementById("broadcastTitle").value = "";
    document.getElementById("broadcastMessage").value = "";
    await loadBroadcastHistory();
  } catch (err) {
    alert("Gagal Broadcast: " + err.message);
  }
}

// 7. HISTORY LOGS & RETRY
async function loadBroadcastHistory() {
  const grid = document.getElementById("historyGrid");
  try {
    const res = await fetchAPI("/broadcast/history");
    loadedHistory = res.data;
    renderHistoryGrid(loadedHistory);
  } catch (err) {
    grid.innerHTML =
      '<p class="col-span-3 text-center text-red-500 py-6">Gagal memuat riwayat</p>';
  }
}

function renderHistoryGrid(historyData) {
  const grid = document.getElementById("historyGrid");
  if (historyData.length === 0) {
    grid.innerHTML =
      '<p class="col-span-3 text-center text-gray-400 py-6">Belum ada riwayat broadcast</p>';
    return;
  }

  grid.innerHTML = historyData
    .map(
      (h) => `
        <div class="bg-white p-4 rounded-xl shadow border">
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-base text-gray-800">${h.title}</h4>
                <span class="px-2 py-0.5 text-xs font-semibold rounded ${h.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}">${h.status}</span>
            </div>
            <p class="text-xs text-gray-500 mb-3">${new Date(h.created_at).toLocaleString("id-ID")}</p>
            <div class="flex justify-between items-center border-t pt-3">
                <span class="text-xs font-semibold text-gray-600">${h.total_contacts} Contacts</span>
                <button type="button" onclick="openDetailModal(${h.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-semibold">Show Detail</button>
            </div>
        </div>
    `,
    )
    .join("");
}

function filterHistory() {
  const query = document.getElementById("searchHistory").value.toLowerCase();
  const filtered = loadedHistory.filter((h) =>
    h.title.toLowerCase().includes(query),
  );
  renderHistoryGrid(filtered);
}

async function openDetailModal(id) {
  activeBroadcastId = id;
  const modal = document.getElementById("detailModal");
  const tbody = document.getElementById("modalLogsBody");
  modal.classList.remove("hidden");

  try {
    const data = await fetchAPI(`/broadcast/detail/${id}`);
    document.getElementById("modalTitle").textContent =
      `Detail: ${data.broadcast.title}`;

    const successCount = data.logs.filter((l) => l.status === "SUCCESS").length;
    document.getElementById("modalStats").textContent =
      `${successCount} Success / ${data.logs.length} Total`;

    tbody.innerHTML = data.logs
      .map(
        (l) => `
            <tr class="border-b">
                <td class="p-2 font-medium">${l.customer_name || "-"}</td>
                <td class="p-2">${l.phone}</td>
                <td class="p-2 text-gray-500">${l.sent_at ? new Date(l.sent_at).toLocaleString("id-ID") : "-"}</td>
                <td class="p-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${l.status === "SUCCESS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}">${l.status}</span></td>
                <td class="p-2 text-red-500 text-[10px]">${l.keterangan || "-"}</td>
            </tr>
        `,
      )
      .join("");
  } catch (err) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="p-4 text-center text-red-500">Gagal memuat detail log</td></tr>';
  }
}

function closeModal() {
  document.getElementById("detailModal").classList.add("hidden");
}

async function handleRetryFailed() {
  if (!activeBroadcastId) return;
  try {
    const res = await fetchAPI(
      `/broadcast/retry-failed/${activeBroadcastId}`,
      "POST",
    );
    alert(res.message);
    closeModal();
  } catch (err) {
    alert(err.message);
  }
}

// Inisialisasi aman setelah DOM dimuat penuh
document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
});
