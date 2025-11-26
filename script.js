/* Utility: escape HTML to, menampilkan text */
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const mcbSelect = document.getElementById("mcb_select");
  const mcbManual = document.getElementById("mcb_manual");
  const searchInput = document.getElementById("search");
  const recommendationsWrap = document.getElementById("recommendations");
  const deviceGrid = document.getElementById("deviceGrid");
  const selectedChips = document.getElementById("selected-chips");
  const manualNameInput = document.getElementById("manualNameInput");
  const manualWattInput = document.getElementById("manualWattInput");
  const manualArea = document.getElementById("manual-area");
  const addManualBtn = document.getElementById("addManualBtn");
  const clearManualBtn = document.getElementById("clearManualBtn");
  const calculateBtn = document.getElementById("calculateBtn");
  const resetBtn = document.getElementById("resetBtn");
  const manualTotalDisplay = document.getElementById("manualTotalDisplay");
  const manualTotal = document.getElementById("manualTotal");

  const resultCard = document.getElementById("resultCard");
  const statusCircle = document.getElementById("statusCircle");
  const statusText = document.getElementById("statusText");
  const percentText = document.getElementById("percentText");
  const progressBar = document.getElementById("progressBar");
  const totalW = document.getElementById("totalW");
  const limitVA = document.getElementById("limitVA");
  const perItemAdviceEl = document.getElementById("perItemAdvice");
  const statusAdviceEl = document.getElementById("statusAdvice");
  const closeResultBtn = document.getElementById("closeResultBtn");
  const adviceSection = document.getElementById("adviceSection");

  // Selected items: array of objects {type: 'db'|'manual', name: '', watt: number?}
  let selectedList = [];

  // Build list of device names from deviceGrid (server rendered)
  const deviceCheckboxes = Array.from(document.querySelectorAll('#deviceGrid .device-card input[type="checkbox"]'));
  const deviceNames = deviceCheckboxes.map(cb => cb.value);

  // Helper: add chip from name, type db
  function addChip(obj) {
    selectedList.push(obj);
    renderChips();
  }

  function renderChips() {
    selectedChips.innerHTML = "";
    selectedList.forEach((it, idx) => {
      const chip = document.createElement("div");
      chip.className = "chip";

      const content = document.createElement("div");
      content.className = "chip-content";

      const nameSpan = document.createElement("span");
      nameSpan.className = "chip-name";
      if (it.type === "db") {
        const cb = deviceCheckboxes.find(c => c.value === it.name);
        const watt = cb ? cb.closest(".device-card").querySelector(".device-watt").innerText.replace(" W", "") : "?";
        nameSpan.innerText = `${it.name} (${watt}W)`;
      } else {
        nameSpan.innerText = `${it.name} (${it.watt}W)`;
      }
      content.appendChild(nameSpan);

      const qtyDiv = document.createElement("div");
      qtyDiv.className = "chip-qty";

      const btnMinus = document.createElement("button");
      btnMinus.innerText = "−";
      btnMinus.onclick = () => {
        if (it.quantity > 1) {
          it.quantity--;
          renderChips();
        }
      };

      const qtySpan = document.createElement("span");
      qtySpan.innerText = it.quantity || 1;

      const btnPlus = document.createElement("button");
      btnPlus.innerText = "+";
      btnPlus.onclick = () => {
        it.quantity = (it.quantity || 1) + 1;
        renderChips();
      };

      qtyDiv.appendChild(btnMinus);
      qtyDiv.appendChild(qtySpan);
      qtyDiv.appendChild(btnPlus);
      content.appendChild(qtyDiv);

      const removeBtn = document.createElement("button");
      removeBtn.innerText = "×";
      removeBtn.style.border = "none";
      removeBtn.style.background = "transparent";
      removeBtn.style.cursor = "pointer";
      removeBtn.style.color = "#ff5252";
      removeBtn.style.fontWeight = "bold";
      removeBtn.onclick = () => {
        selectedList.splice(idx, 1);
        if (it.type === "db") {
          const cb = deviceCheckboxes.find(c => c.value === it.name);
          if (cb) cb.checked = false;
        }
        renderChips();
      };

      chip.appendChild(content);
      chip.appendChild(removeBtn);
      selectedChips.appendChild(chip);
    });
  }

  // Update manual total display
  function updateManualTotal() {
    const rows = manualArea.querySelectorAll(".manual-row");
    let total = 0;
    rows.forEach(row => {
      const wattEl = row.querySelector(".manual-watt");
      if (wattEl) {
        const watt = Number(wattEl.value) || 0;
        total += watt;
      }
    });

    if (rows.length === 0) {
      manualTotalDisplay.style.display = "none";
    } else {
      manualTotalDisplay.style.display = "block";
      manualTotal.innerText = total;
    }
  }

  // When check/uncheck device card, update selectedList
  deviceCheckboxes.forEach(cb => {
    cb.addEventListener("change", (e) => {
      const name = e.target.value;
      if (e.target.checked) {
        addChip({ type: "db", name });
      } else {
        // remove first occurrence from selectedList
        const idx = selectedList.findIndex(it => it.type === "db" && it.name === name);
        if (idx >= 0) selectedList.splice(idx, 1);
        renderChips();
      }
    });
  });

  // SEARCH: simple filter + recommendations buttons
  let searchTimer = null;
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    recommendationsWrap.innerHTML = "";
    if (!term) return;

    // debounce
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      // find matching device names (contains)
      const matches = deviceNames.filter(n => n.toLowerCase().includes(term));
      // show up to 8 matches
      matches.slice(0, 8).forEach(name => {
        const btn = document.createElement("button");
        btn.className = "rec-btn";
        btn.innerText = name;
        btn.onclick = () => {
          // check the corresponding checkbox if exists
          const cb = deviceCheckboxes.find(c => c.value === name);
          if (cb) {
            cb.checked = true;
            addChip({ type: "db", name });
          } else {
            // fallback: add as manual with parsed watt if present in string
            const m = name.match(/(\d+(?:\.\d+)?)\s*W/i);
            if (m) {
              addChip({ type: "manual", name: name, watt: Number(m[1]) });
            } else {
              addChip({ type: "manual", name: name, watt: 0 });
            }
          }
          searchInput.value = "";
          recommendationsWrap.innerHTML = "";
        };
        recommendationsWrap.appendChild(btn);
      });

      // if no exact matches, offer suggestions: split search term tokens to suggest related items   
      if (matches.length === 0) {
        const tokens = term.split(/\s+/).slice(0,2);
        // propose device names that contain any token
        const fallback = deviceNames.filter(n => tokens.some(t => n.toLowerCase().includes(t))).slice(0,6);
        fallback.forEach(name => {
          const btn = document.createElement("button");
          btn.className = "rec-btn";
          btn.innerText = name;
          btn.onclick = () => {
            const cb = deviceCheckboxes.find(c => c.value === name);
            if (cb) {
              cb.checked = true;
              addChip({ type: "db", name });
            } else {
              addChip({ type: "manual", name, watt: 0 });
            }
            searchInput.value = "";
            recommendationsWrap.innerHTML = "";
          };
          recommendationsWrap.appendChild(btn);
        });
      }

    }, 120);
  });

  // Manual add
  addManualBtn.addEventListener("click", () => {
    const name = manualNameInput.value.trim();
    const watt = Number(manualWattInput.value);

    if (!name) {
      alert("Masukkan nama peralatan");
      manualNameInput.focus();
      return;
    }

    if (isNaN(watt) || watt <= 0) {
      alert("Masukkan daya dalam Watt (angka positif)");
      manualWattInput.focus();
      return;
    }

    const row = document.createElement("div");
    row.className = "manual-row";
    row.innerHTML = `
      <input class="manual-name" type="text" value="${escapeHtml(name)}" readonly style="background:rgba(255,255,255,0.05);" />
      <input class="manual-watt" type="number" value="${watt}" readonly style="background:rgba(255,255,255,0.05);" />
      <button class="manual-remove-btn">✕ Hapus</button>
    `;
    manualArea.appendChild(row);

    row.querySelector(".manual-remove-btn").addEventListener("click", () => {
      row.remove();
      updateManualTotal();
    });

    // Clear inputs for next entry
    manualNameInput.value = "";
    manualWattInput.value = "";
    manualNameInput.focus();
    updateManualTotal();
  });

  // Allow Enter key to add
  manualWattInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addManualBtn.click();
    }
  });

  clearManualBtn.addEventListener("click", () => {
    manualArea.innerHTML = "";
    manualNameInput.value = "";
    manualWattInput.value = "";
    updateManualTotal();
  });

  // Reset everything
  resetBtn.addEventListener("click", () => {
    selectedList = [];
    deviceCheckboxes.forEach(cb => cb.checked = false);
    renderChips();
    manualArea.innerHTML = "";
    manualNameInput.value = "";
    manualWattInput.value = "";
    updateManualTotal();
    resultCard.style.display = "none";
    if (adviceSection) adviceSection.style.display = "none";
  });

  // Close result panel
  closeResultBtn.addEventListener("click", () => {
    resultCard.style.display = "none";
    if (adviceSection) adviceSection.style.display = "none";
  });

  // Calculate -> build payload and send to /calculate
  calculateBtn.addEventListener("click", async () => {
    // mcb value: from select or manual override
    let mcbVA = Number(mcbSelect.value);
    const manualVal = Number(mcbManual.value);
    if (!isNaN(manualVal) && manualVal > 0) mcbVA = manualVal;

    // Collect selected DB items with quantity
    const selectedDB = selectedList.filter(it => it.type === "db").map(it => {
      const quantity = it.quantity || 1;
      return { name: it.name, qty: quantity };
    });

    // Collect manual items currently in manualArea AND those added as manual chips
    const manualFromUI = [];
    manualArea.querySelectorAll(".manual-row").forEach((row) => {
      const nameEl = row.querySelector(".manual-name");
      const wattEl = row.querySelector(".manual-watt");
      const name = nameEl ? nameEl.value.trim() : "";
      const watt = wattEl ? Number(wattEl.value) : 0;
      if (name) manualFromUI.push({ name, watt: isNaN(watt) ? 0 : watt });
    });
    // Also include manual chips in selectedList (if any)
    const manualChips = selectedList.filter(it => it.type === "manual").map(it => {
      const quantity = it.quantity || 1;
      return { name: it.name, watt: (it.watt || 0) * quantity };
    });

    const custom = manualFromUI.concat(manualChips);

    // Validate at least one
    if (selectedDB.length === 0 && custom.length === 0) {
      alert("Tambahkan peralatan (cek atau manual) sebelum menghitung.");
      return;
    }

    // Build payload
    const payload = { mcb: mcbVA, selected: selectedDB, custom: custom };

    try {
      const res = await fetch("/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      // Display results
      resultCard.style.display = "block";
      if (adviceSection) adviceSection.style.display = "block";
      
      statusText.innerText = data.status;
      statusText.className = "status-text " + (data.status === "Aman" ? "safe" : data.status === "Mendekati Overload" ? "warning" : "danger");
      percentText.innerText = `${data.percentage}%`;
      progressBar.style.width = Math.min(100, data.percentage) + "%";
      progressBar.style.background = data.color || "linear-gradient(90deg,#00d4ff,#7c3aed)";
      statusCircle.style.color = data.color || "#00d4ff";
      totalW.innerText = `${data.total} W`;
      limitVA.innerText = `${data.limit} VA`;

      // per-item advice
      perItemAdviceEl.innerHTML = "";
      (data.per_item || []).forEach(it => {
        const li = document.createElement("li");
        const nama = escapeHtml(it.nama || "");
        const saran = escapeHtml(it.saran || "");
        li.innerHTML = `<strong>${nama}:</strong> ${saran}`;
        li.className = "advice-item";
        perItemAdviceEl.appendChild(li);
      });

      // status-level advice
      statusAdviceEl.innerHTML = "";
      (data.status_advice || []).forEach(s => {
        const li = document.createElement("li");
        li.innerText = s;
        li.className = "advice-item";
        statusAdviceEl.appendChild(li);
      });

      // Scroll into view for mobile
      resultCard.scrollIntoView({ behavior: "smooth" });

    } catch (err) {
      console.error(err);
      alert("Gagal terhubung ke server. Pastikan Flask berjalan.");
    }
  });

}); // DOMContentLoaded end
