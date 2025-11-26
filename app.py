"""
"""

from flask import Flask, render_template, request, jsonify
import re

app = Flask(__name__)

# ----------------------------------------------------------------------
# DATABASE PERALATAN (lengkap) 
# ----------------------------------------------------------------------
device_db = {
    # Penerangan & charging
    "Lampu LED 3W": 3,
    "Lampu LED 5W": 5,
    "Lampu LED 10W": 10,
    "Lampu LED 15W": 15,
    "Lampu LED 20W": 20,
    "Lampu Pijar 40W (lama)": 40,
    "Charger HP 10W": 10,
    "Powerbank Charger 15W": 15,

    # Dapur kecil
    "Rice Cooker 300W": 300,
    "Rice Cooker 400W": 400,
    "Blender 200W": 200,
    "Mixer 150W": 150,
    "Microwave 1000W": 1000,
    "Oven Listrik 800W": 800,
    "Kompor Listrik 600W": 600,
    "Kompor Induksi 1200W": 1200,
    "Toaster 800W": 800,
    "Air Fryer 1200W": 1200,

    # Pendingin & penyimpanan
    "Kulkas 1 Pintu 90W": 90,
    "Kulkas 2 Pintu 120W": 120,
    "Freezer 150W": 150,
    "Dispenser 150W": 150,

    # Hiburan & komunikasi
    "TV LED 32\" 45W": 45,
    "TV LED 43\" 75W": 75,
    "TV LED 50\" 95W": 95,
    "Set-Top Box 15W": 15,
    "Speaker Aktif 100W": 100,
    "Soundbar 60W": 60,
    "Game Console 120W": 120,
    "Router 12W": 12,
    "Laptop 65W": 65,
    "Laptop Gaming 180W": 180,
    "Monitor 24\" 25W": 25,
    "Monitor 27\" 40W": 40,

    # Peralatan rumah tangga berat
    "Mesin Cuci 400W": 400,
    "Mesin Cuci 900W (dengan pemanas)": 900,
    "Setrika 300W": 300,
    "Setrika 600W": 600,
    "Vacuum Cleaner 500W": 500,
    "Hair Dryer 600W": 600,
    "Water Heater 1500W": 1500,

    # Pendingin & pompa
    "AC 0.5 PK 450W": 450,
    "AC 1 PK 750W": 750,
    "AC 2 PK 1400W": 1400,
    "Kipas Angin 45W": 45,
    "Kipas Angin 60W": 60,
    "Pompa Air 125W": 125,
    "Pompa Air 250W": 250,

    # Komputer & kantor
    "PC Standar 250W": 250,
    "PC Gaming 450W": 450,
    "Printer Laser 200W": 200,
    "Monitor 21\" 20W": 20,

    # Lain-lain
    "Lampu Taman 20W": 20,
    "Heater Ruangan 1000W": 1000,
    "Outdoor Pump 300W": 300
}

# ----------------------------------------------------------------------
# DATABASE SARAN PER ALAT (keyword -> saran singkat)
# ----------------------------------------------------------------------
advice_db = {
    "Kulkas": "Hindari membuka pintu kulkas terlalu sering; pastikan ventilasi belakang tidak terhalang.",
    "Freezer": "Isi freezer sekitar 70% agar kompresor tidak sering menyala kosong.",
    "Rice Cooker": "Cabut rice cooker setelah nasi matang; jika sering dipakai, pilih rice cooker hemat daya.",
    "Blender": "Jalankan blender dalam jeda, jangan terus-menerus untuk menghindari overheat.",
    "Microwave": "Gunakan microwave untuk pemanasan singkat dan pada beban rendah bila memungkinkan.",
    "Oven": "Panaskan oven hanya jika semua bahan siap; pertimbangkan preheat singkat saja.",
    "Kompor Induksi": "Gunakan panci yang datar dan pas dengan area pemanas untuk efisiensi.",
    "Kompor Listrik": "Gunakan api/level sedang; matikan segera setelah selesai.",
    "AC": "Atur suhu 24–26°C dan bersihkan filter secara berkala untuk efisiensi.",
    "Setrika": "Setrika banyak pakaian sekaligus agar lebih hemat daripada beberapa kali pemanasan.",
    "Mesin Cuci": "Gunakan mode hemat atau quick wash untuk beban kecil.",
    "TV": "Kurangi brightness dan gunakan mode 'eco' bila ada.",
    "Laptop": "Gunakan power-saving mode bila tidak melakukan tugas berat.",
    "Charger": "Cabut charger saat baterai penuh untuk menghindari standby loss.",
    "Lampu": "Gunakan lampu LED untuk konsumsi lebih rendah.",
    "Kipas": "Gunakan kecepatan sedang; kipas lebih murah dari AC untuk pendinginan ringan.",
    "Pompa": "Periksa kebocoran pipa agar pompa tidak bekerja berlebihan.",
    "Hair Dryer": "Gunakan pengaturan panas rendah bila memungkinkan dan jangan terlalu lama.",
    "Water Heater": "Jalankan water heater hanya saat diperlukan dan matikan setelah selesai.",
    "Air Fryer": "Jalankan sesuai kapasitas agar tidak terlalu lama bekerja pada daya penuh.",
    "Vacuum": "Hindari penggunaan terus-menerus pada permukaan berat tanpa jeda."
}

# ----------------------------------------------------------------------
# SARAN BERDASARKAN STATUS (Aman / Mendekati Overload / Overload)
# - list berisi urutan saran tindakan (dari prioritas tinggi)
# ----------------------------------------------------------------------
status_advice = {
    "Aman": [
        "Kondisi aman — beban listrik berada di bawah ambang aman.",
        "Pertahankan perilaku hemat: cabut charger dan matikan lampu saat tidak perlu."
    ],
    "Mendekati Overload": [
        "Beban sudah mendekati batas — hindari menyalakan peralatan pemanas bersamaan (oven, stove, water heater).",
        "Matikan 1-2 peralatan non-esensial jika ragu untuk menjaga kestabilan."
    ],
    "Overload": [
        "Beban melebihi kapasitas MCB! Segera matikan beberapa perangkat besar untuk mencegah MCB turun.",
        "Prioritaskan peralatan penting (kulkas, lampu, komunikasi) dan matikan yang non-esensial."
    ]
}

# ----------------------------------------------------------------------
# Helper functions
# ----------------------------------------------------------------------
def find_watt_by_name(name):
    """
    Return watt value from device_db if exact key found.
    If not found, try to extract trailing number ending in 'W' (e.g., 'TV 80W').
    Return None if unknown.
    """
    if name in device_db:
        return device_db[name]
    m = re.search(r'(\d+(?:\.\d+)?)\s*[Ww]$', name)
    if m:
        try:
            return float(m.group(1))
        except:
            return None
    return None

def get_item_advice(name):
    """Return advice string by keyword matching from advice_db"""
    for k, adv in advice_db.items():
        if k.lower() in name.lower():
            return adv
    return "Gunakan perangkat ini seperlunya dan hindari menyalakan bersama perangkat berdaya besar."

# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------
@app.route("/")
def index():
    # news example for display (static)
    news_items = [
        {"title": "Tips Hemat Energi di Rumah", "source": "Siaran Lokal", "url": "#"},
        {"title": "Pentingnya Memilih Lampu LED", "source": "Green Tech", "url": "#"},
        {"title": "Perawatan AC untuk Efisiensi", "source": "Energy Daily", "url": "#"}
    ]
    return render_template("index.html", devices=device_db, news=news_items)

@app.route("/calculate", methods=["POST"])
def calculate():
    """
    Expect JSON payload:
    {
      "mcb": 1300,          // in VA (not Ampere)
      "selected": [{"name": "TV LED 32\" 45W", "qty": 2}, ...],
      "custom": [{"name": "Peralatan X", "watt": 120}, ...]
    }
    Return:
    {
      total: float,           // total watt
      limit: int,             // mcb VA
      percentage: float,      // total / limit * 100
      status: str,
      color: str,
      per_item: [ ... ],
      status_advice: [...]
    }
    """
    payload = request.json or {}
    try:
        mcb_va = float(payload.get("mcb", 0))
    except:
        mcb_va = 0.0

    selected = payload.get("selected", []) or []
    custom = payload.get("custom", []) or []

    total_watt = 0.0
    used_items = []   # names for per-item advice

    # add selected from DB with quantity support
    for item in selected:
        if isinstance(item, dict):
            # New format: {"name": "...", "qty": N}
            name = item.get("name", "")
            qty = item.get("qty", 1)
        else:
            # Legacy format: just string name (backward compatibility)
            name = item
            qty = 1
        
        try:
            qty = int(qty)
        except:
            qty = 1
        
        watt = find_watt_by_name(name)
        if watt is not None:
            total_watt += float(watt) * qty
            # Add to used_items with quantity indication if qty > 1
            if qty > 1:
                used_items.append(f"{name} x {qty}")
            else:
                used_items.append(name)
        else:
            # unknown -> add but watt 0 (or skip)
            if qty > 1:
                used_items.append(f"{name} x {qty}")
            else:
                used_items.append(name)

    # add custom entries
    for obj in custom:
        try:
            w = float(obj.get("watt", 0))
        except:
            w = 0.0
        total_watt += w
        used_items.append(obj.get("name", "Peralatan Manual"))

    # avoid division by zero
    limit_va = mcb_va if mcb_va > 0 else 0.0
    percentage = (total_watt / limit_va * 100) if limit_va > 0 else 0.0
    percentage = round(percentage, 2)

    # determine status thresholds:
    # - Aman: < 85%
    # - Mendekati Overload: 85% - <100%
    # - Overload: >= 100%
    if percentage >= 100:
        status = "Overload"
        color = "#ff5252"
    elif percentage >= 85:
        status = "Mendekati Overload"
        color = "#ffb300"
    else:
        status = "Aman"
        color = "#4caf50"

    # per-item advice
    per_item = []
    for name in used_items:
        adv = get_item_advice(name)
        per_item.append({"nama": name, "saran": adv})

    # status-level advice
    cond_adv = status_advice.get(status, [])

    # response
    resp = {
        "total": round(total_watt, 2),
        "limit": round(limit_va, 2),
        "percentage": percentage,
        "status": status,
        "color": color,
        "per_item": per_item,
        "status_advice": cond_adv
    }
    return jsonify(resp)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
