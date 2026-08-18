/* tide.js — v2 interactions. Replaces aurora.js. No canvases, no particles:
   just the brandprint switcher, the locale cycler and the fabric's on-screen
   gate. CSP-safe, dependency-free, reduced-motion aware. */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- brandprint switcher ---------- */
  var stage = document.querySelector(".stage[data-brand]");
  if (stage) {
    var chips = stage.querySelectorAll("[data-brand-pick]");
    var banks = { neptune: "Neptune", triton: "Triton", nereid: "Nereid", proteus: "Proteus" };
    var bank = stage.querySelector(".dv-bank");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var brand = chip.getAttribute("data-brand-pick");
        if (stage.getAttribute("data-brand") === brand) return;
        stage.setAttribute("data-brand", brand);
        chips.forEach(function (c) { c.classList.toggle("is-on", c === chip); });
        if (bank) {
          bank.textContent = "";
          bank.appendChild(document.createTextNode(banks[brand] || brand));
          var dot = document.createElement("span");
          dot.className = "dv-dot";
          dot.textContent = "·";
          bank.appendChild(dot);
        }
      });
    });
  }

  /* ---------- locale cycler (static grid under reduced motion) ---------- */
  var locStage = document.querySelector("[data-loc-stage]");
  if (locStage && !reduced) {
    var cards = locStage.querySelectorAll(".loc-card");
    var dots = document.querySelectorAll("[data-loc-dot]");
    var idx = 0, timer = null;
    var show = function (i) {
      idx = i % cards.length;
      cards.forEach(function (c, j) { c.classList.toggle("is-on", j === idx); });
      dots.forEach(function (d, j) { d.classList.toggle("on", j === idx); });
    };
    var start = function () {
      if (timer) return;
      timer = setInterval(function () { show(idx + 1); }, 3200);
    };
    var stop = function () { clearInterval(timer); timer = null; };
    var loc = locStage.closest(".loc") || locStage;
    loc.addEventListener("mouseenter", stop);
    loc.addEventListener("mouseleave", start);
    loc.addEventListener("focusin", stop);
    loc.addEventListener("focusout", start);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.isIntersecting ? start() : stop(); });
      }, { threshold: 0.25 }).observe(locStage);
    } else {
      start();
    }
  }

  /* ---------- fabric: traffic flows only while on screen ---------- */
  var topo = document.querySelector(".topo");
  if (topo && !reduced && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { topo.classList.toggle("tp-live", en.isIntersecting); });
    }, { threshold: 0.2 }).observe(topo);
  }
})();
