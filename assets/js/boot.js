/* boot.js — runs synchronously in <head> to apply saved language + theme
   before first paint (CSP-safe: no inline scripts anywhere on this site). */
(function () {
  var d = document.documentElement;
  var LANGS = ["en", "ar", "fr", "es", "it", "de", "nl", "pt", "uk", "sw", "ha"];
  var lang = "en", mode = "";
  try {
    var nav = (navigator.language || "").toLowerCase().slice(0, 2);
    lang = localStorage.getItem("npt-lang") || (LANGS.indexOf(nav) !== -1 ? nav : "en");
    mode = localStorage.getItem("npt-mode") || "";
  } catch (e) {}
  // URL overrides (deep links): ?lang=<code> & ?mode=dark|light — persisted.
  var q = new URLSearchParams(location.search);
  var ql = q.get("lang"), qm = q.get("mode");
  if (ql && LANGS.indexOf(ql) !== -1) {
    lang = ql;
    try { localStorage.setItem("npt-lang", ql); } catch (e) {}
  }
  if (qm === "dark" || qm === "light") {
    mode = qm;
    try { localStorage.setItem("npt-mode", qm); } catch (e) {}
  }
  if (LANGS.indexOf(lang) === -1) lang = "en";
  d.setAttribute("lang", lang);
  d.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  var t = lang === "ar" ? d.getAttribute("data-title-ar") : d.getAttribute("data-title-en");
  if (t) document.title = t;
})();
