/* ============================================================================
   aurora.js — Neptune.ly "Deep Field" motion layer.
   Deferred, dependency-free, CSP-safe (script-src 'self'), reduced-motion safe.
   Everything here is progressive enhancement: if this file never loads, the
   page is still complete, legible and navigable.
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mqFine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var reduced = mqReduce.matches;

  /* Coarse device-capability probe. Phones and low-core machines get the CSS
     aurora but not the canvas fabric — the aurora alone still moves. */
  var lowPower =
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.connection && navigator.connection.saveData === true);

  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts || false); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* =========================================================================
     1 · Constellation fabric
     A single RAF loop paints every on-screen <canvas class="npt-web">. Nodes
     drift, near neighbours link up, and sonar pulses ripple outward — the
     visual argument for "integration fabric", drawn rather than stated.
     ====================================================================== */
  function Fabric(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.nodes = [];
    this.pulses = [];
    this.w = 0; this.h = 0; this.dpr = 1;
    this.visible = false;
    this.pointer = { x: -9999, y: -9999, on: false };
    this.nextPulse = 0;
    this.resize();
  }

  Fabric.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.5 : 2);
    this.w = r.width; this.h = r.height; this.dpr = dpr;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seed();
  };

  Fabric.prototype.seed = function () {
    var area = this.w * this.h;
    var target = Math.round(Math.min(Math.max(area / 15000, 16), 76));
    var n = this.nodes;
    while (n.length > target) n.pop();
    while (n.length < target) {
      // 1-in-7 nodes is a bright "hub" — the banks and rails in the fabric.
      var hub = Math.random() < 0.14;
      n.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: hub ? 2.1 + Math.random() * 1.5 : 0.9 + Math.random() * 0.9,
        hub: hub,
        // phase offset so the twinkle never syncs across nodes
        p: Math.random() * Math.PI * 2
      });
    }
  };

  Fabric.prototype.step = function (t, dt) {
    var i, a, n = this.nodes, len = n.length;

    // advance nodes, wrapping at the edges
    for (i = 0; i < len; i++) {
      a = n[i];
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.x < -20) a.x = this.w + 20; else if (a.x > this.w + 20) a.x = -20;
      if (a.y < -20) a.y = this.h + 20; else if (a.y > this.h + 20) a.y = -20;
    }

    // emit a sonar pulse from a random hub every few seconds
    if (t > this.nextPulse) {
      this.nextPulse = t + 2600 + Math.random() * 3200;
      var hubs = [];
      for (i = 0; i < len; i++) if (n[i].hub) hubs.push(n[i]);
      var src = hubs.length ? hubs[(Math.random() * hubs.length) | 0] : n[(Math.random() * len) | 0];
      if (src) this.pulses.push({ x: src.x, y: src.y, r: 0, max: 190 + Math.random() * 120 });
    }
    for (i = this.pulses.length - 1; i >= 0; i--) {
      this.pulses[i].r += 0.052 * dt;
      if (this.pulses[i].r > this.pulses[i].max) this.pulses.splice(i, 1);
    }
  };

  Fabric.prototype.draw = function (t) {
    var ctx = this.ctx, n = this.nodes, len = n.length, i, j, a, b, dx, dy, d2, d;
    var LINK = 132, LINK2 = LINK * LINK;
    var PTR = 168, PTR2 = PTR * PTR;

    ctx.clearRect(0, 0, this.w, this.h);

    // --- links -----------------------------------------------------------
    ctx.lineWidth = 1;
    for (i = 0; i < len; i++) {
      a = n[i];
      for (j = i + 1; j < len; j++) {
        b = n[j];
        dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
        if (d2 > LINK2) continue;
        d = Math.sqrt(d2);
        ctx.strokeStyle = "rgba(255,255,255," + (0.17 * (1 - d / LINK)).toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    // --- pointer tether ---------------------------------------------------
    if (this.pointer.on) {
      for (i = 0; i < len; i++) {
        a = n[i];
        dx = a.x - this.pointer.x; dy = a.y - this.pointer.y; d2 = dx * dx + dy * dy;
        if (d2 > PTR2) continue;
        d = Math.sqrt(d2);
        ctx.strokeStyle = "rgba(235,78,77," + (0.42 * (1 - d / PTR)).toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(this.pointer.x, this.pointer.y); ctx.stroke();
      }
    }

    // --- sonar pulses -----------------------------------------------------
    for (i = 0; i < this.pulses.length; i++) {
      var pu = this.pulses[i];
      var fade = 1 - pu.r / pu.max;
      ctx.strokeStyle = "rgba(59,193,238," + (0.3 * fade * fade).toFixed(3) + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.lineWidth = 1;

    // --- nodes ------------------------------------------------------------
    for (i = 0; i < len; i++) {
      a = n[i];
      var tw = 0.72 + 0.28 * Math.sin(t / 900 + a.p);
      if (a.hub) {
        var g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r * 6);
        g.addColorStop(0, "rgba(255,255,255," + (0.9 * tw).toFixed(3) + ")");
        g.addColorStop(0.35, "rgba(59,193,238," + (0.34 * tw).toFixed(3) + ")");
        g.addColorStop(1, "rgba(59,193,238,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "rgba(255,255,255," + ((a.hub ? 0.95 : 0.5) * tw).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    }
  };

  var fabrics = [];

  function bootFabric() {
    var canvases = all(".npt-web");
    if (!canvases.length) return;

    // Reduced motion / low power: paint one still frame and stop. The field
    // still reads as designed art, it just never moves.
    if (reduced || lowPower) {
      canvases.forEach(function (c) {
        var f = new Fabric(c);
        if (!f.w) return;
        f.draw(0);
        c.classList.add("lit");
      });
      return;
    }

    canvases.forEach(function (c) {
      var f = new Fabric(c);
      if (!f.w) return;
      fabrics.push(f);
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { f.visible = e.isIntersecting; });
        }, { rootMargin: "120px" }).observe(c);
      } else { f.visible = true; }
      if ("ResizeObserver" in window) {
        new ResizeObserver(function () { f.resize(); }).observe(c);
      }
      requestAnimationFrame(function () { c.classList.add("lit"); });
    });

    if (!fabrics.length) return;

    var last = 0;
    function frame(t) {
      // dt is normalised to a 60fps tick and clamped, so a stalled tab does
      // not teleport every node across the canvas on resume.
      var dt = last ? Math.min((t - last) / 16.67, 3) : 1;
      last = t;
      if (!document.hidden) {
        for (var i = 0; i < fabrics.length; i++) {
          var f = fabrics[i];
          if (!f.visible || !f.w) continue;
          f.step(t, dt);
          f.draw(t);
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // Pointer tethering, in canvas-local coordinates.
    if (mqFine.matches) {
      on(window, "pointermove", function (e) {
        for (var i = 0; i < fabrics.length; i++) {
          var f = fabrics[i];
          if (!f.visible) { f.pointer.on = false; continue; }
          var r = f.canvas.getBoundingClientRect();
          var x = e.clientX - r.left, y = e.clientY - r.top;
          f.pointer.on = x > -80 && y > -80 && x < r.width + 80 && y < r.height + 80;
          f.pointer.x = x; f.pointer.y = y;
        }
      }, { passive: true });
    }

    var rt;
    on(window, "resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { fabrics.forEach(function (f) { f.resize(); }); }, 180);
    }, { passive: true });
  }


  /* =========================================================================
     2 · Scroll progress rail
     ====================================================================== */
  function bootProgress() {
    var bar = document.querySelector(".npt-progress i");
    if (!bar) return;
    var ticking = false;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      ticking = false;
    }
    on(window, "scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    on(window, "resize", update, { passive: true });
    update();
  }


  /* =========================================================================
     3 · Kinetic headline
     Wraps each word of a .kinetic element in .w > i so the words can rise
     out of their own clipping box, staggered. Text content is untouched, so
     screen readers and copy-paste see exactly what they saw before.
     ====================================================================== */
  function splitWords(el) {
    if (el.dataset.split === "1") return;
    el.dataset.split = "1";
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var texts = [], node;
    while ((node = walker.nextNode())) if (node.nodeValue.trim()) texts.push(node);

    // The stagger counter restarts for each [data-l] block. Without this the
    // Arabic copy — which sits in the DOM after the English and is hidden by
    // CSS — would inherit delays continuing on from the English word count,
    // so switching language would show a headline that takes seconds to land.
    var idx = 0, lastBlock = null;
    texts.forEach(function (tn) {
      var block = tn.parentNode && tn.parentNode.closest ? tn.parentNode.closest("[data-l]") : null;
      if (block !== lastBlock) { idx = 0; lastBlock = block; }
      var frag = document.createDocumentFragment();
      // keep the original whitespace so justified/RTL spacing stays intact
      tn.nodeValue.split(/(\s+)/).forEach(function (chunk) {
        if (!chunk) return;
        if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
        var w = document.createElement("span");
        w.className = "w";
        var i = document.createElement("i");
        i.textContent = chunk;
        i.style.setProperty("--d", (idx++ * 55) + "ms");
        w.appendChild(i);
        frag.appendChild(w);
      });
      tn.parentNode.replaceChild(frag, tn);
    });
  }

  function bootKinetic() {
    var els = all(".kinetic");
    if (!els.length) return;
    if (reduced) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    els.forEach(function (el) {
      splitWords(el);
      // next frame, so the initial transform is committed before we release it
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { el.classList.add("in"); });
      });
    });
  }


  /* =========================================================================
     4 · Card spotlight
     Writes --mx/--my in percent; the gradient in CSS does the rest.
     ====================================================================== */
  function bootSpotlight() {
    if (!mqFine.matches || reduced) return;
    var cards = all(".card, .tile-dark, .client-row");
    if (!cards.length) return;
    cards.forEach(function (c) {
      on(c, "pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
        c.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
      }, { passive: true });
    });
  }


  /* =========================================================================
     5 · Magnetic buttons
     ====================================================================== */
  function bootMagnetic() {
    if (!mqFine.matches || reduced) return;
    all(".btn").forEach(function (b) {
      on(b, "pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.setProperty("--tx", (dx * 11).toFixed(2) + "px");
        b.style.setProperty("--ty", (dy * 8).toFixed(2) + "px");
      }, { passive: true });
      on(b, "pointerleave", function () {
        b.style.setProperty("--tx", "0px");
        b.style.setProperty("--ty", "0px");
      });
    });
  }


  /* =========================================================================
     6 · Pointer aura
     ====================================================================== */
  function bootAura() {
    if (!mqFine.matches || reduced) return;
    var aura = document.querySelector(".npt-aura");
    if (!aura) return;
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false;
    function loop() {
      // critically-damped-ish follow: fast enough to feel attached, slow
      // enough to read as light rather than as a cursor
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      aura.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) requestAnimationFrame(loop);
      else running = false;
    }
    on(window, "pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      aura.classList.add("lit");
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    on(document, "pointerleave", function () { aura.classList.remove("lit"); });
  }


  /* =========================================================================
     7 · Seam scribe + generic in-view flag
     ====================================================================== */
  function bootSeams() {
    var seams = all(".seam");
    if (!seams.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
      seams.forEach(function (s) { s.classList.add("in"); }); return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    seams.forEach(function (s) { io.observe(s); });
  }


  /* =========================================================================
     8 · Marquee — clone the track once so the -50% loop is seamless
     ====================================================================== */
  function bootMarquee() {
    all(".marquee__track").forEach(function (track) {
      if (track.dataset.cloned === "1") return;
      track.dataset.cloned = "1";
      var items = Array.prototype.slice.call(track.children);
      items.forEach(function (it) {
        var c = it.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        track.appendChild(c);
      });
    });
  }


  /* =========================================================================
     9 · FAQ accordion
     Native <details> would be simpler, but it cannot animate its own height
     cross-browser, so we drive max-block-size from the measured content.
     ====================================================================== */
  function bootFaq() {
    var items = all(".faq__item");
    if (!items.length) return;

    items.forEach(function (item) {
      var btn = item.querySelector(".faq__q");
      var panel = item.querySelector(".faq__a");
      if (!btn || !panel) return;

      function setOpen(open) {
        item.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        panel.style.maxBlockSize = open ? panel.scrollHeight + "px" : "0px";
      }

      on(btn, "click", function () {
        var willOpen = !item.classList.contains("open");
        // accordion: one answer at a time keeps the page from jumping around
        items.forEach(function (other) {
          if (other === item) return;
          var ob = other.querySelector(".faq__q"), op = other.querySelector(".faq__a");
          other.classList.remove("open");
          if (ob) ob.setAttribute("aria-expanded", "false");
          if (op) op.style.maxBlockSize = "0px";
        });
        setOpen(willOpen);
      });

      setOpen(item.classList.contains("open"));
    });

    // language switch changes the answer height — remeasure what is open
    function remeasure() {
      items.forEach(function (item) {
        if (!item.classList.contains("open")) return;
        var panel = item.querySelector(".faq__a");
        if (panel) panel.style.maxBlockSize = panel.scrollHeight + "px";
      });
    }
    all(".lang-btn").forEach(function (b) { on(b, "click", function () { setTimeout(remeasure, 60); }); });
    on(window, "resize", function () { setTimeout(remeasure, 60); }, { passive: true });
  }


  /* =========================================================================
     10 · Hero parallax — a few pixels of depth, nothing that fights scrolling
     ====================================================================== */
  function bootParallax() {
    if (reduced || lowPower) return;
    var layers = all("[data-parallax]");
    if (!layers.length) return;
    var ticking = false;
    function update() {
      var y = window.scrollY;
      layers.forEach(function (el) {
        var k = parseFloat(el.getAttribute("data-parallax")) || 0.1;
        el.style.transform = "translate3d(0," + (y * k).toFixed(1) + "px,0)";
      });
      ticking = false;
    }
    on(window, "scroll", function () {
      if (!ticking && window.scrollY < window.innerHeight * 1.5) {
        ticking = true; requestAnimationFrame(update);
      }
    }, { passive: true });
  }


  /* =========================================================================
     11 · Quote form prefill
     The concierge and the product pages both deep-link into the quote form
     with ?need=…&org=…  — honouring that is what turns a click into a lead.
     ====================================================================== */
  // The concierge speaks in needs; the form speaks in topics, and its <select>
  // accepts only these eight values. Anything unmapped falls through to
  // "other" rather than silently leaving the topic blank.
  var TOPIC_FOR_NEED = {
    mobile: "mobile",
    wallet: "payments",
    middleware: "middleware",
    ekyc: "onboarding",
    aml: "aml",
    pos: "pos",
    custom: "other"
  };

  function bootPrefill() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var q = new URLSearchParams(location.search);
    var map = { need: "topic", org: "organization", msg: "message", name: "name", email: "email" };

    Object.keys(map).forEach(function (key) {
      var v = q.get(key);
      if (!v) return;
      var field = form.elements[map[key]];
      if (!field) return;

      if (key === "need") v = TOPIC_FOR_NEED[v] || "other";

      if (field.tagName === "SELECT") {
        var hit = Array.prototype.slice.call(field.options).filter(function (o) {
          return o.value === v;
        })[0];
        if (!hit) return;
      }
      field.value = v;
      var wrap = field.closest ? field.closest(".field") : null;
      if (wrap) wrap.classList.add("prefilled");
    });
  }


  /* =========================================================================
     boot
     ====================================================================== */
  function boot() {
    bootProgress();
    bootFabric();
    bootKinetic();
    bootSpotlight();
    bootMagnetic();
    bootAura();
    bootSeams();
    bootMarquee();
    bootFaq();
    bootParallax();
    bootPrefill();
  }

  if (document.readyState === "loading") on(document, "DOMContentLoaded", boot);
  else boot();

  // Respect a mid-session change to the OS motion preference.
  var onMq = function () {
    reduced = mqReduce.matches;
    if (reduced) all(".kinetic").forEach(function (el) { el.classList.add("in"); });
  };
  if (mqReduce.addEventListener) mqReduce.addEventListener("change", onMq);
  else if (mqReduce.addListener) mqReduce.addListener(onMq);
})();
