// === KONFIGURASI ===
const BLYNK_TOKEN = "_Uc_SlWvcnKwlaBGhY5e0nv-_K6J4YGY";
const VIRTUAL_PIN = "V0";
const TEMP_HIGH = 190.0;
const TEMP_LOW = 160.0;

// === VARIABEL MEMORI ===
let sessionData = []; // Menyimpan data untuk laporan Excel
let minTemp = 999;
let maxTemp = 0;
let totalTemp = 0;
let dataCount = 0;

// === SETUP CHART ===
const ctx = document.getElementById('tempChart').getContext('2d');
const tempChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Suhu (°C)',
            data: [],
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { display: false },
            y: { grid: { color: '#334155' } }
        },
        plugins: { legend: { display: false } }
    }
});

// === FUNGSI UTAMA ===
async function fetchData() {
    try {
        const response = await fetch(`https://blynk.cloud/external/api/get?token=${BLYNK_TOKEN}&${VIRTUAL_PIN}`);
        if (!response.ok) throw new Error("Gagal Konek");
        
        const text = await response.text();
        const temp = parseFloat(text);

        if (!isNaN(temp)) {
            updateDashboard(temp);
        }
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('statusBadge').innerText = "DISCONNECTED";
        document.getElementById('statusBadge').className = "badge badge-loading";
    }
}

function updateDashboard(temp) {
    const display = document.getElementById('tempValue');
    const badge = document.getElementById('statusBadge');
    const now = new Date();
    const timeStr = now.toLocaleTimeString();

    // 1. Update Display Utama
    display.innerText = temp.toFixed(1);

    // 2. Logika Warna & Notifikasi
    badge.className = "badge";
    if (temp >= TEMP_HIGH) {
        display.style.color = "#ef4444";
        badge.classList.add("badge-danger");
        badge.innerText = "CRITICAL: OVERHEAT";
        showAlert("BAHAYA!", "Suhu Melampaui Batas Aman!", "error");
    } else if (temp <= TEMP_LOW && temp > 40) {
        display.style.color = "#facc15";
        badge.classList.add("badge-warning");
        badge.innerText = "WARNING: LOW TEMP";
    } else if (temp <= 40) {
        display.style.color = "#94a3b8";
        badge.classList.add("badge-loading");
        badge.innerText = "IDLE / COOLING";
    } else {
        display.style.color = "#f1f5f9";
        badge.classList.add("badge-normal");
        badge.innerText = "SYSTEM NORMAL";
    }

    // 3. Update Chart
    if (tempChart.data.labels.length > 30) {
        tempChart.data.labels.shift();
        tempChart.data.datasets[0].data.shift();
    }
    tempChart.data.labels.push(timeStr);
    tempChart.data.datasets[0].data.push(temp);
    tempChart.update();

    // 4. Record Data untuk Statistik & Excel
    if (temp > 40) {
        sessionData.push({ Waktu: timeStr, Suhu: temp, Status: badge.innerText });
        
        // Update Stats
        if (temp < minTemp) minTemp = temp;
        if (temp > maxTemp) maxTemp = temp;
        totalTemp += temp;
        dataCount++;
        
        document.getElementById('minTemp').innerText = minTemp.toFixed(1) + "°";
        document.getElementById('maxTemp').innerText = maxTemp.toFixed(1) + "°";
        document.getElementById('avgTemp').innerText = (totalTemp / dataCount).toFixed(1) + "°";
    }
}

// === FITUR TAMBAHAN ===

// 1. Fungsi Download Excel (Menggunakan SheetJS)
function downloadReport() {
    if (sessionData.length === 0) {
        Swal.fire('Data Kosong', 'Belum ada data terekam sesi ini.', 'info');
        return;
    }

    const ws = XLSX.utils.json_to_sheet(sessionData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan QC");
    
    // Nama file dengan tanggal
    const filename = "Laporan_Fryer_" + new Date().toISOString().slice(0,10) + ".xlsx";
    XLSX.writeFile(wb, filename);
    
    Swal.fire('Berhasil!', 'Laporan QC telah diunduh.', 'success');
}

// 2. Smart Alert (Agar tidak spam notifikasi bunyi terus)
let lastAlertTime = 0;
function showAlert(title, text, icon) {
    const now = Date.now();
    // Hanya munculkan alert maksimal setiap 30 detik agar tidak mengganggu
    if (now - lastAlertTime > 30000) { 
        Swal.fire({
            title: title,
            text: text,
            icon: icon,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000
        });
        lastAlertTime = now;
    }
}

// 3. Update Jam Digital
setInterval(() => {
    document.getElementById('clock').innerText = new Date().toLocaleTimeString();
}, 1000);

// Loop Utama
setInterval(fetchData, 2000);
fetchData();
