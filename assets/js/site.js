/* site.js — Neptune.ly behaviors (deferred). No external dependencies. */
(function () {
  "use strict";
  var html = document.documentElement;

  /* ---------- language toggle ---------- */
  function applyLang(lang) {
    html.setAttribute("lang", lang);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    try { localStorage.setItem("npt-lang", lang); } catch (e) {}
    var t = lang === "ar" ? html.getAttribute("data-title-ar") : html.getAttribute("data-title-en");
    if (t) document.title = t;
    // swap attribute translations (placeholder / aria-label)
    document.querySelectorAll("[data-ph-en]").forEach(function (el) {
      el.setAttribute("placeholder", el.getAttribute(lang === "ar" ? "data-ph-ar" : "data-ph-en") || "");
    });
    document.querySelectorAll("[data-aria-en]").forEach(function (el) {
      el.setAttribute("aria-label", el.getAttribute(lang === "ar" ? "data-aria-ar" : "data-aria-en") || "");
    });
    document.querySelectorAll(".lang-btn").forEach(function (b) {
      b.textContent = lang === "ar" ? "EN" : "عربي";
    });
  }
  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyLang(html.getAttribute("lang") === "ar" ? "en" : "ar");
    });
  });
  applyLang(html.getAttribute("lang") === "ar" ? "ar" : "en");

  /* ---------- theme toggle ---------- */
  document.querySelectorAll(".mode-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = html.getAttribute("data-mode") === "dark" ? "light" : "dark";
      html.setAttribute("data-mode", next);
      try { localStorage.setItem("npt-mode", next); } catch (e) {}
    });
  });

  /* ---------- sticky header ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- mobile nav ---------- */
  var burger = document.querySelector(".nav__burger");
  var links = document.querySelector(".nav__links");
  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) links.classList.remove("open");
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".nav")) links.classList.remove("open");
    });
  }

  /* ---------- scroll reveal (reduced-motion safe) ---------- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = document.querySelectorAll(".reveal, .reveal-stagger");
  if (!reduced && "IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- animated counters ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1400, t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      p = 1 - Math.pow(1 - p, 3);
      el.childNodes[0].nodeValue = String(Math.round(target * p));
      if (p < 1) requestAnimationFrame(step);
    }
    if (reduced) { el.childNodes[0].nodeValue = String(target); return; }
    requestAnimationFrame(step);
    void suffix;
  }
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- contact / quote form ---------- */
  var form = document.getElementById("contact-form");
  if (form) {
    var started = Date.now();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status");
      var btn = form.querySelector("button[type=submit]");
      var lang = html.getAttribute("lang");
      var msgs = {
        ok: { en: "Thank you — your request is on its way. We reply within one business day.", ar: "شكراً لك — تم إرسال طلبك بنجاح. نرد خلال يوم عمل واحد." },
        err: { en: "Something went wrong. Please email us directly at info@neptune.ly.", ar: "حدث خطأ ما. راسلنا مباشرة على info@neptune.ly." },
        wait: { en: "Please take a moment to complete the form.", ar: "يرجى التمهل قليلاً قبل إرسال النموذج." }
      };
      // time-trap: humans need >3s
      if (Date.now() - started < 3000) {
        status.className = "form-status err";
        status.textContent = msgs.wait[lang] || msgs.wait.en;
        return;
      }
      var data = new FormData(form);
      data.append("elapsed", String(Date.now() - started));
      btn.disabled = true;
      btn.style.opacity = ".6";
      fetch(form.getAttribute("action"), { method: "POST", body: data, headers: { "Accept": "application/json" } })
        .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
        .then(function (j) {
          var good = j && j.ok;
          status.className = "form-status " + (good ? "ok" : "err");
          status.textContent = (good ? msgs.ok : msgs.err)[lang] || (good ? msgs.ok.en : msgs.err.en);
          if (good) form.reset();
        })
        .catch(function () {
          status.className = "form-status err";
          status.textContent = msgs.err[lang] || msgs.err.en;
        })
        .finally(function () {
          btn.disabled = false;
          btn.style.opacity = "";
          status.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
        });
    });
  }

  /* ---------- current year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
