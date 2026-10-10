/* Dental Fresh v3 — interacciones del sitio */
(function () {
  var d = document, root = d.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Menú móvil ---------- */
  var toggle = d.querySelector(".menu-toggle");
  var menu = d.getElementById("menu");
  if (toggle && menu) {
    var setMenu = function (open) {
      menu.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    };
    toggle.addEventListener("click", function () { setMenu(!menu.classList.contains("open")); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 860) setMenu(false); });
  }

  /* ---------- Scroll: header, barra de progreso, volver arriba ---------- */
  var header = d.querySelector("header");
  var bar = d.querySelector(".progress");
  var topBtn = d.querySelector(".to-top");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || root.scrollTop;
    var max = root.scrollHeight - root.clientHeight;
    if (header) header.classList.toggle("scrolled", y > 10);
    if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    if (topBtn) topBtn.classList.toggle("show", y > 600);
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  if (topBtn) topBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  /* ---------- Aparición al hacer scroll ---------- */
  var reveals = d.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Contadores animados ---------- */
  var counters = d.querySelectorAll("[data-count]");
  function runCounter(el) {
    var end = parseFloat(el.getAttribute("data-count"));
    var pre = el.getAttribute("data-prefix") || "";
    var suf = el.getAttribute("data-suffix") || "";
    var dur = 1300, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(end * eased) + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length && "IntersectionObserver" in window && !reduce) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCounter(en.target); co.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------- Filtro de servicios ---------- */
  var chips = d.querySelectorAll("[data-filter]");
  var cards = d.querySelectorAll("[data-cat]");
  var countEl = d.getElementById("filter-count");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
      var n = 0;
      cards.forEach(function (card) {
        var show = f === "todos" || card.getAttribute("data-cat").split(" ").indexOf(f) !== -1;
        card.hidden = !show;
        card.classList.remove("pop");
        if (show) { n++; void card.offsetWidth; if (!reduce) card.classList.add("pop"); }
      });
      if (countEl) countEl.textContent = "Mostrando " + n + (n === 1 ? " servicio" : " servicios");
    });
  });

  /* ---------- Lightbox de galería ---------- */
  var dlg = d.getElementById("lightbox");
  var items = Array.prototype.slice.call(d.querySelectorAll("[data-lightbox]"));
  if (dlg && items.length && typeof dlg.showModal === "function") {
    var img = dlg.querySelector("img"), cap = dlg.querySelector("p"), idx = 0;
    var show = function (i) {
      idx = (i + items.length) % items.length;
      img.src = items[idx].getAttribute("data-src");
      img.alt = items[idx].getAttribute("data-caption");
      cap.textContent = items[idx].getAttribute("data-caption");
    };
    items.forEach(function (it, i) {
      it.addEventListener("click", function () { show(i); dlg.showModal(); });
    });
    dlg.querySelector(".x").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector(".prev").addEventListener("click", function () { show(idx - 1); });
    dlg.querySelector(".next").addEventListener("click", function () { show(idx + 1); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
  }

  /* ---------- Estado "Abierto ahora / Cerrado" (hora de El Salvador) ---------- */
  // Horario: lun–vie 8:00–18:00, sáb 8:00–12:00. Cámbialo aquí si cambia el horario real.
  var SCH = { 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [8, 12] };
  var DN = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  function hora(h) { return (h % 12 || 12) + ":00" + (h >= 12 ? "pm" : "am"); }
  function updateStatus() {
    var els = d.querySelectorAll("[data-open-status]");
    if (!els.length) return;
    var day, mins;
    try {
      var o = {};
      new Intl.DateTimeFormat("en-US", { timeZone: "America/El_Salvador", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" })
        .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
      day = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday];
      mins = parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10);
    } catch (err) { return; }
    var today = SCH[day], state, text;
    if (today && mins >= today[0] * 60 && mins < today[1] * 60) {
      state = "open"; text = "Abierto ahora · cierra a las " + hora(today[1]);
    } else {
      state = "closed";
      if (today && mins < today[0] * 60) {
        text = "Cerrado ahora · abre hoy a las " + hora(today[0]);
      } else {
        for (var i = 1; i <= 7; i++) {
          var nd = (day + i) % 7;
          if (SCH[nd]) { text = "Cerrado ahora · abre " + (i === 1 ? "mañana" : DN[nd]) + " a las " + hora(SCH[nd][0]); break; }
        }
      }
    }
    els.forEach(function (el) {
      el.setAttribute("data-state", state);
      var t = el.querySelector(".t");
      if (t) t.textContent = text;
    });
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- Copiar datos de contacto ---------- */
  var toast = d.querySelector(".toast"), toastTimer;
  function notify(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }
  d.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var val = btn.getAttribute("data-copy");
      var done = function () { notify("Copiado: " + val); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(done, function () { notify("No se pudo copiar"); });
      } else {
        var ta = d.createElement("textarea");
        ta.value = val; d.body.appendChild(ta); ta.select();
        try { d.execCommand("copy"); done(); } catch (e) { notify("No se pudo copiar"); }
        d.body.removeChild(ta);
      }
    });
  });

  /* ---------- Año del pie ---------- */
  d.querySelectorAll(".anio").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();