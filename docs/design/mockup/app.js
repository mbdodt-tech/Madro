/* Madro designoplæg — interaktioner.
   Emulerer Framer Motion-adfærden fra byggeplan §3.5 med CSS-transitions
   og JS-taloptælling. Respekterer prefers-reduced-motion. */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var daFormat = new Intl.NumberFormat("da-DK");

  /* ============ Tilstand ============ */

  var state = {
    kcal: 1280,
    kcalTarget: 2100,
    protein: 61, proteinTarget: 120,
    carb: 138, carbTarget: 250,
    fat: 44, fatTarget: 70,
    qualityShare: 76, // % ikke-ultraforarbejdet
    hideCalories: false,
    logged: false,
    portionSteps: 2 // 1 håndfuld = 2 halve trin à 15 g
  };

  // Foreløbigt sæt — se docs/open-questions.md
  var micros = [
    { key: "D", name: "D-vitamin", pct: 34 },
    { key: "Fe", name: "Jern", pct: 52 },
    { key: "Mg", name: "Magnesium", pct: 61 },
    { key: "Ca", name: "Calcium", pct: 88 },
    { key: "K", name: "Kalium", pct: 47 },
    { key: "B12", name: "B12-vitamin", pct: 95 },
    { key: "Fo", name: "Folat", pct: 70 },
    { key: "Zn", name: "Zink", pct: 76 }
  ];

  var product = { kcalPer15g: 79.5, proteinPer15g: 0.93, carbPer15g: 7.65, fatPer15g: 4.95 };

  var $ = function (id) { return document.getElementById(id); };

  /* ============ Tema ============ */

  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  var themeMode = "light";

  function applyTheme() {
    var dark = themeMode === "dark" || (themeMode === "system" && systemDark.matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.querySelectorAll(".theme-switch button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.mode === themeMode);
    });
  }

  document.querySelectorAll(".theme-switch button").forEach(function (b) {
    b.addEventListener("click", function () {
      themeMode = b.dataset.mode;
      applyTheme();
    });
  });

  $("app-theme-btn").addEventListener("click", function () {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    themeMode = dark ? "light" : "dark";
    applyTheme();
  });

  systemDark.addEventListener("change", applyTheme);

  /* ============ Talformat og optælling ============ */

  function countUp(el, from, to, format) {
    if (reducedMotion.matches || from === to) {
      el.textContent = format(to);
      return;
    }
    var start = performance.now();
    var dur = 600;
    function tick(now) {
      var t = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ============ Kvalitetsbue ============ */

  var ARC_LEN = 264;

  function verdictColorFor(share) {
    var s = getComputedStyle(document.documentElement);
    if (share >= 85) return s.getPropertyValue("--v-excellent");
    if (share >= 65) return s.getPropertyValue("--v-good");
    if (share >= 45) return s.getPropertyValue("--v-mid");
    if (share >= 25) return s.getPropertyValue("--v-poor");
    return s.getPropertyValue("--v-bad");
  }

  function qualityCaptionFor(share) {
    if (share >= 85) return "En meget ren dag";
    if (share >= 65) return "En ren dag indtil videre";
    if (share >= 45) return "Blandet dag — helt okay";
    return "Dagen er tung på forarbejdet";
  }

  function renderQuality(prevShare) {
    var arc = $("arc-fill");
    arc.style.strokeDashoffset = ARC_LEN * (1 - state.qualityShare / 100);
    arc.style.stroke = verdictColorFor(state.qualityShare);
    countUp($("quality-num"), prevShare == null ? 0 : prevShare, state.qualityShare, function (n) { return n; });
    $("quality-caption").textContent = qualityCaptionFor(state.qualityShare);
  }

  /* ============ Makroringe ============ */

  var RING_LEN = 188.5;

  function renderRings(prev) {
    [["protein", "proteinTarget"], ["carb", "carbTarget"], ["fat", "fatTarget"]].forEach(function (pair) {
      var key = pair[0];
      var frac = Math.min(state[key] / state[pair[1]], 1);
      $("ring-" + key).style.strokeDashoffset = RING_LEN * (1 - frac);
      countUp($("val-" + key), prev ? prev[key] : 0, state[key], function (n) { return n; });
    });
    countUp($("kcal-now"), prev ? prev.kcal : 0, state.kcal, function (n) { return daFormat.format(n); });
  }

  /* ============ Mikrostribe ============ */

  function covClass(pct) {
    if (pct >= 80) return "cov-high";
    if (pct >= 50) return "cov-mid";
    return "cov-low";
  }

  function renderMicros() {
    var bars = $("micro-bars");
    bars.innerHTML = "";
    micros.forEach(function (m) {
      var bar = document.createElement("span");
      bar.className = "micro-bar";
      bar.innerHTML =
        '<span class="micro-bar-track"><span class="micro-bar-fill ' + covClass(m.pct) +
        '" style="height:' + Math.min(m.pct, 100) + '%"></span></span>' +
        '<span class="micro-bar-label">' + m.key + "</span>";
      bars.appendChild(bar);
    });

    var list = $("micro-list");
    list.innerHTML = "";
    micros.slice().sort(function (a, b) { return a.pct - b.pct; }).forEach(function (m) {
      var row = document.createElement("div");
      row.className = "micro-row";
      row.innerHTML =
        '<span class="micro-row-name">' + m.name + "</span>" +
        '<span class="micro-row-bar"><span class="micro-row-fill ' + covClass(m.pct) +
        '" style="width:' + Math.min(m.pct, 100) + '%"></span></span>' +
        '<span class="micro-row-pct mono">' + m.pct + " %</span>";
      list.appendChild(row);
    });
  }

  $("micro-strip").addEventListener("click", function () {
    var open = this.getAttribute("aria-expanded") === "true";
    this.setAttribute("aria-expanded", String(!open));
    $("micro-list").hidden = open;
  });

  /* ============ hide_calories ============ */

  $("hide-cal-btn").addEventListener("click", function () {
    state.hideCalories = !state.hideCalories;
    document.getElementById("app").classList.toggle("cal-hidden", state.hideCalories);
    this.setAttribute("aria-pressed", String(state.hideCalories));
    this.setAttribute("aria-label", state.hideCalories ? "Vis kalorietal" : "Skjul kalorietal");
    $("kcal-hidden-label").hidden = !state.hideCalories;
  });

  /* ============ Toast ============ */

  var toastTimer = null;

  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add("show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { el.hidden = true; }, 300);
    }, 2200);
  }

  /* ============ Kamera og scan-flow ============ */

  var camera = $("camera");
  var sheet = $("sheet");
  var backdrop = $("sheet-backdrop");
  var cameraTimer = null;

  $("scan-fab").addEventListener("click", function () {
    if (state.logged) {
      toast("Oplægget viser ét scan — genindlæs siden");
      return;
    }
    camera.hidden = false;
    $("camera-hint").textContent = "Ret kameraet mod stregkoden";
    camera.classList.remove("found");
    cameraTimer = setTimeout(function () {
      camera.classList.add("found");
      $("camera-hint").textContent = "Stregkode fundet";
      setTimeout(openSheet, 450);
    }, 1600);
  });

  $("camera-close").addEventListener("click", function () {
    clearTimeout(cameraTimer);
    camera.hidden = true;
  });

  function showView(id) {
    ["view-result", "view-portion", "view-detail"].forEach(function (v) {
      var el = $(v);
      el.hidden = v !== id;
      el.classList.remove("fade-in");
    });
    var active = $(id);
    if (!reducedMotion.matches) {
      void active.offsetWidth;
      active.classList.add("fade-in");
    }
    sheet.classList.toggle("expanded", id === "view-detail");
    sheet.scrollTop = 0;
  }

  function openSheet() {
    camera.hidden = true;
    backdrop.hidden = false;
    sheet.hidden = false;
    showView("view-result");
    requestAnimationFrame(function () {
      backdrop.classList.add("open");
      sheet.classList.add("open");
    });
  }

  function closeSheet() {
    backdrop.classList.remove("open");
    sheet.classList.remove("open");
    sheet.classList.remove("expanded");
    setTimeout(function () {
      backdrop.hidden = true;
      sheet.hidden = true;
    }, reducedMotion.matches ? 0 : 380);
  }

  backdrop.addEventListener("click", closeSheet);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!sheet.hidden) closeSheet();
    else if (!camera.hidden) { clearTimeout(cameraTimer); camera.hidden = true; }
  });

  /* Delt element: produkthoved → detaljeside */
  $("product-head").addEventListener("click", function () { showView("view-detail"); });
  $("detail-back").addEventListener("click", function () { showView("view-result"); });

  /* Verdikt → portion */
  $("btn-ate").addEventListener("click", function () { showView("view-portion"); });
  $("portion-back").addEventListener("click", function () { showView("view-result"); });

  $("btn-alt").addEventListener("click", function () {
    toast("Alternativer kommer i Fase 2");
  });

  /* ============ Portionsvælger ============ */

  function portionLabel(steps) {
    var grams = steps * 15;
    var handfuls = steps / 2;
    var label = handfuls === 0.5 ? "½ håndfuld"
      : handfuls === 1 ? "1 håndfuld"
      : (handfuls % 1 === 0 ? handfuls : handfuls.toString().replace(".", ",")).toString().replace(".5", "½") + " håndfulde";
    return { label: label, grams: grams, kcal: Math.round(steps * product.kcalPer15g) };
  }

  function renderPortion() {
    var p = portionLabel(state.portionSteps);
    $("portion-amount").textContent = p.label;
    $("portion-grams").innerHTML = p.grams + ' g<span class="cal"> · ' + daFormat.format(p.kcal) + " kcal</span>";
  }

  $("step-minus").addEventListener("click", function () {
    if (state.portionSteps > 1) { state.portionSteps -= 1; renderPortion(); }
  });
  $("step-plus").addEventListener("click", function () {
    if (state.portionSteps < 12) { state.portionSteps += 1; renderPortion(); }
  });

  /* ============ Log måltid ============ */

  $("btn-log").addEventListener("click", function () {
    var p = portionLabel(state.portionSteps);
    var prev = { kcal: state.kcal, protein: state.protein, carb: state.carb, fat: state.fat };
    var prevShare = state.qualityShare;

    state.kcal += p.kcal;
    state.protein += Math.round(state.portionSteps * product.proteinPer15g);
    state.carb += Math.round(state.portionSteps * product.carbPer15g);
    state.fat += Math.round(state.portionSteps * product.fatPer15g);
    // Ultraforarbejdet andel stiger med logningen (illustrativt)
    state.qualityShare = Math.max(0, Math.round(prevShare - (p.kcal / state.kcal) * 100 * 0.9));
    state.logged = true;

    // Snack-række ind i loggen
    var group = $("snacks-group");
    group.hidden = false;
    $("snacks-total").textContent = daFormat.format(p.kcal) + " kcal";
    var li = document.createElement("li");
    li.className = "meal-item enter";
    li.innerHTML =
      '<span class="verdict-dot v-poor" aria-hidden="true"></span>' +
      '<div class="meal-item-text">' +
      '<span class="meal-item-name">Snackchips sour cream &amp; onion</span>' +
      '<span class="meal-item-portion">' + p.label + " · " + p.grams + " g</span></div>" +
      '<span class="meal-item-kcal cal mono">' + daFormat.format(p.kcal) + "</span>";
    $("snacks-items").appendChild(li);

    closeSheet();
    toast("Logget under snacks");

    // Ringene tæller op, buen justerer sig — det magiske øjeblik
    setTimeout(function () {
      renderRings(prev);
      renderQuality(prevShare);
    }, reducedMotion.matches ? 0 : 300);

    // hide_calories skal også gælde den nye række
    document.getElementById("app").classList.toggle("cal-hidden", state.hideCalories);
  });

  /* ============ Øvrige flader ============ */

  document.querySelectorAll("[data-soon]").forEach(function (tab) {
    tab.addEventListener("click", function () { toast("Ikke med i dette oplæg"); });
  });

  $("add-btn").addEventListener("click", function () {
    toast("Manuel logning kommer i Fase 1");
  });

  /* ============ Dato + første render ============ */

  $("today-date").textContent = new Date().toLocaleDateString("da-DK", {
    weekday: "long", day: "numeric", month: "long"
  });

  applyTheme();
  renderMicros();
  renderPortion();
  renderQuality(null);
  renderRings(null);
})();
