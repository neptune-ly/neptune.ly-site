/* boot.js — runs synchronously in <head> to apply saved language + theme
   before first paint (CSP-safe: no inline scripts anywhere on this site). */
(function () {
  var d = document.documentElement;
  var lang = "en", mode = "";
  try {
    lang = localStorage.getItem("npt-lang") || (navigator.language || "").toLowerCase().indexOf("ar") === 0 && "ar" || "en";
    mode = localStorage.getItem("npt-mode") || "";
  } catch (e) {}
  // URL overrides (deep links): ?lang=ar|en & ?mode=dark|light — persisted.
  var q = new URLSearchParams(location.search);
  var ql = q.get("lang"), qm = q.get("mode");
  if (ql === "ar" || ql === "en") {
    lang = ql;
    try { localStorage.setItem("npt-lang", ql); } catch (e) {}
  }
  if (qm === "dark" || qm === "light") {
    mode = qm;
    try { localStorage.setItem("npt-mode", qm); } catch (e) {}
  }
  if (lang !== "ar") lang = "en";
  d.setAttribute("lang", lang);
  d.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  if (!mode) {
    mode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  d.setAttribute("data-mode", mode);
  var t = lang === "ar" ? d.getAttribute("data-title-ar") : d.getAttribute("data-title-en");
  if (t) document.title = t;
})();
