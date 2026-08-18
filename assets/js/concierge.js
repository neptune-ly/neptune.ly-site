/* ============================================================================
   concierge.js — Neptune lead assistant.

   A guided, scripted qualifier. It is NOT a language model and makes no network
   calls: the site's CSP is `connect-src 'self'`, and a chat widget that phones a
   third party would break it. What it does instead is ask the four questions a
   Neptune sales engineer would ask, recommend the right product from the answers,
   and hand off to the quote form with those answers already filled in.

   Bilingual by construction: every string is emitted as paired
   <span data-l="en"> / <span data-l="ar"> nodes, so the site's existing language
   switch drives the assistant too — no separate i18n runtime, and a mid-chat
   language flip re-renders the whole transcript for free.
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Pages under /products/ need to climb a level for their links. */
  var base = /\/products\//.test(location.pathname) ? "../" : "";

  /* -------------------------------------------------------------------------
     Script. Each step: a question, and the chips that answer it.
     `v` is the machine value carried into the quote form; en/ar are what the
     visitor reads.
     ---------------------------------------------------------------------- */
  var STEPS = [
    {
      key: "who",
      q: {
        en: "Welcome to Neptune. I'll point you to the right thing in about four questions — or you can skip straight to a human.",
        ar: "أهلاً بكم في نبتون. سأرشدكم إلى ما تحتاجونه خلال أربعة أسئلة تقريباً — أو يمكنكم التحدث مباشرة مع أحد المهندسين."
      },
      q2: { en: "First — which best describes you?", ar: "أولاً — أي وصف ينطبق عليكم؟" },
      opts: [
        { v: "bank", en: "A bank", ar: "مصرف" },
        { v: "mno", en: "A mobile operator", ar: "مشغّل اتصالات" },
        { v: "fintech", en: "A fintech, PSP or wallet", ar: "شركة تقنية مالية أو محفظة" },
        { v: "gov", en: "Government or enterprise", ar: "جهة حكومية أو مؤسسة" },
        { v: "other", en: "Something else", ar: "جهة أخرى" }
      ]
    },
    {
      key: "need",
      q: { en: "What are you looking to build or replace?", ar: "ما الذي تريدون بناءه أو استبداله؟" },
      opts: [
        { v: "mobile", en: "White-label mobile banking", ar: "تطبيق مصرفي بعلامتكم" },
        { v: "wallet", en: "A digital wallet", ar: "محفظة رقمية" },
        { v: "middleware", en: "Core & middleware integration", ar: "تكامل النظام الأساسي والطبقة الوسيطة" },
        { v: "ekyc", en: "Onboarding & e-KYC", ar: "فتح الحسابات والتحقق الرقمي" },
        { v: "aml", en: "AML & sanctions screening", ar: "مكافحة غسل الأموال والعقوبات" },
        { v: "pos", en: "POS & payment acceptance", ar: "نقاط البيع وقبول المدفوعات" },
        { v: "custom", en: "A custom platform at scale", ar: "منصة مخصّصة واسعة النطاق" }
      ]
    },
    {
      key: "market",
      q: { en: "Which market are you serving?", ar: "أي سوق تخدمون؟" },
      opts: [
        { v: "libya", en: "Libya", ar: "ليبيا" },
        { v: "north-africa", en: "North Africa", ar: "شمال أفريقيا" },
        { v: "west-africa", en: "West & Central Africa", ar: "غرب ووسط أفريقيا" },
        { v: "east-africa", en: "East & Southern Africa", ar: "شرق وجنوب أفريقيا" },
        { v: "europe", en: "Europe", ar: "أوروبا" },
        { v: "other-market", en: "Elsewhere", ar: "منطقة أخرى" }
      ]
    },
    {
      key: "when",
      q: { en: "And where are you in the process?", ar: "وفي أي مرحلة أنتم الآن؟" },
      opts: [
        { v: "live", en: "Procurement is open now", ar: "الشراء مفتوح الآن" },
        { v: "quarter", en: "Budgeted for this quarter", ar: "مُدرج في ميزانية هذا الربع" },
        { v: "year", en: "Planned for this year", ar: "مخطط له هذا العام" },
        { v: "explore", en: "Still exploring", ar: "ما زلنا نستكشف" }
      ]
    }
  ];

  /* need → the product that actually answers it. */
  var RECO = {
    mobile: { name: "Neptune Mobile", href: "products/neptune-mobile.html",
      en: "our white-label mobile banking platform — themed to your identity through the Odyssey design system and already running in production.",
      ar: "منصتنا المصرفية عبر الهاتف بعلامتكم — تُخصَّص بهويتكم عبر نظام Odyssey وتعمل فعلياً في الإنتاج." },
    wallet: { name: "Neptune Vega", href: "products/vega.html",
      en: "our wallet platform — onboarding, top-up, transfers, merchant payments and settlement, built to banking discipline and connectable to a bank or an operator.",
      ar: "منصة المحفظة لدينا — التسجيل والتعبئة والتحويلات ومدفوعات التجّار والتسوية، بانضباط مصرفي وقابلة للربط بمصرف أو مشغّل." },
    middleware: { name: "Nexus.mw", href: "products/nexus.html",
      en: "our middleware — the integration fabric between your core, the payment rails, card vendors and every digital channel, with a full operations console.",
      ar: "طبقتنا الوسيطة — نسيج التكامل بين نظامكم الأساسي ومسارات الدفع ومزوّدي البطاقات وكل قناة رقمية، مع منصة تشغيل كاملة." },
    ekyc: { name: "Polaris", href: "products/polaris.html",
      en: "our digital onboarding and e-KYC platform — document capture, MRZ, face match, identity checks and automated account creation in your core.",
      ar: "منصة فتح الحسابات والتحقق الرقمي — التقاط المستندات وقراءة MRZ ومطابقة الوجه والتحقق من الهوية وإنشاء الحساب آلياً في نظامكم." },
    aml: { name: "N-Sentinel", href: "products/sentinel.html",
      en: "our AML and sanctions screening platform — Arabic-aware name matching, freeze-order enforcement and a compliance review workspace.",
      ar: "منصة مكافحة غسل الأموال وفحص العقوبات — مطابقة أسماء تراعي العربية، وإنفاذ أوامر التجميد، ومساحة عمل للامتثال." },
    pos: { name: "Neptune Galaxy", href: "products/galaxy.html",
      en: "our commerce and POS stack — the platform, its portals and the Tawa Android terminal, including fleet operations.",
      ar: "منظومة التجارة ونقاط البيع — المنصة وبواباتها وجهاز Tawa بنظام أندرويد، مع إدارة الأسطول." },
    custom: { name: null, href: "solutions.html",
      en: "a custom engagement. Large-scale custom fintech and banking builds are core work for us, not a side offering — we scope them properly before quoting.",
      ar: "مشروع مخصّص. البناء المخصّص واسع النطاق في التقنية المالية والصيرفة عمل أساسي لدينا وليس خدمة جانبية — ونحدّد نطاقه بدقة قبل التسعير." }
  };

  /* A market answer earns a specific, true remark rather than a generic one. */
  var MARKET_NOTE = {
    libya: { en: "We're headquartered in Tripoli, so Libya is home ground — Libyan core banking, payment rails and regulation included.",
             ar: "مقرنا في طرابلس، فليبيا أرضنا — بما في ذلك الأنظمة المصرفية الليبية ومسارات الدفع والتنظيم." },
    "north-africa": { en: "Our Tunis office covers North Africa, and the platform ships in Arabic, French and English out of the box.",
                      ar: "مكتبنا في تونس يغطي شمال أفريقيا، والمنصة تُسلَّم بالعربية والفرنسية والإنجليزية جاهزة." },
    "west-africa": { en: "Africa is our primary market, and francophone West Africa is well covered — the platform ships with full French localisation.",
                     ar: "أفريقيا سوقنا الأساسي، وغرب أفريقيا الفرنكوفوني مغطّى جيداً — المنصة تُسلَّم بترجمة فرنسية كاملة." },
    "east-africa": { en: "Africa is our primary market. We deploy on-premise or in local cloud, which is usually what regional regulators want to hear.",
                     ar: "أفريقيا سوقنا الأساسي. ننشر داخل المؤسسة أو في سحابة محلية، وهو ما تطلبه الجهات الرقابية الإقليمية عادةً." },
    europe: { en: "We localise into German, Dutch, Italian, Spanish and Ukrainian alongside English and French.",
              ar: "نوطّن المنصة إلى الألمانية والهولندية والإيطالية والإسبانية والأوكرانية إلى جانب الإنجليزية والفرنسية." },
    "other-market": { en: "We localise widely — Arabic, English, French, Spanish, Italian, German, Dutch and Ukrainian are already supported.",
                      ar: "نوطّن على نطاق واسع — العربية والإنجليزية والفرنسية والإسبانية والإيطالية والألمانية والهولندية والأوكرانية مدعومة بالفعل." }
  };

  var WHO_NOTE = {
    mno: { en: "Operators are a first-class case for us, not an afterthought — wallet, agent network and POS all sit on the same rails.",
           ar: "مشغّلو الاتصالات حالة أساسية لدينا وليست إضافة — المحفظة وشبكة الوكلاء ونقاط البيع على المسارات نفسها." },
    bank: { en: "Every product below is licensable white-label or deployable on-premise — your data stays inside your perimeter.",
            ar: "كل منتج قابل للترخيص بعلامتكم أو للنشر داخل مؤسستكم — وبياناتكم تبقى داخل نطاقكم." },
    gov: { en: "Sovereign deployment is the default posture: on-premise or local cloud, with the source and the operations in your hands.",
           ar: "النشر السيادي هو الوضع الافتراضي: داخل المؤسسة أو سحابة محلية، مع بقاء التشغيل بين أيديكم." }
  };

  /* -------------------------------------------------------------------------
     DOM helpers — every visible string is emitted bilingually.
     ---------------------------------------------------------------------- */
  function bi(en, ar, tag) {
    var f = document.createDocumentFragment();
    var a = document.createElement(tag || "span"); a.setAttribute("data-l", "en"); a.textContent = en;
    var b = document.createElement(tag || "span"); b.setAttribute("data-l", "ar"); b.textContent = ar;
    f.appendChild(a); f.appendChild(b);
    return f;
  }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function lang() { return html.getAttribute("lang") === "ar" ? "ar" : "en"; }

  /* -------------------------------------------------------------------------
     Build the widget
     ---------------------------------------------------------------------- */
  var launcher, panel, body, foot, closeBtn;
  var answers = {};
  var step = 0;
  var busy = false;

  var ICON_SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c.8 4.4 2.1 5.7 6.5 6.5-4.4 1.2-5.7 2.5-6.5 7-.8-4.5-2.1-5.8-6.5-7C9.9 8.7 11.2 7.4 12 3Z"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function build() {
    /* launcher */
    launcher = el("button", "cx-launch");
    launcher.type = "button";
    launcher.setAttribute("data-aria-en", "Open the Neptune assistant");
    launcher.setAttribute("data-aria-ar", "افتح مساعد نبتون");
    launcher.setAttribute("aria-label", "Open the Neptune assistant");
    var av = el("span", "av"); av.innerHTML = ICON_SPARK;
    var lb = el("span", "label");
    lb.appendChild(bi("Find your fit", "ما الذي يناسبكم؟"));
    var ping = el("span", "ping");
    launcher.appendChild(av); launcher.appendChild(lb); launcher.appendChild(ping);

    /* panel */
    panel = el("div", "cx");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Neptune assistant");
    panel.setAttribute("data-aria-en", "Neptune assistant");
    panel.setAttribute("data-aria-ar", "مساعد نبتون");

    var top = el("div", "cx__top");
    var tav = el("div", "av"); tav.innerHTML = ICON_SPARK;
    var who = el("div", "who");
    var wb = el("b"); wb.appendChild(bi("Neptune assistant", "مساعد نبتون"));
    var ws = el("span"); ws.appendChild(bi("Guided — a human replies within one business day", "إرشادي — ويرد عليكم مهندس خلال يوم عمل"));
    who.appendChild(wb); who.appendChild(ws);
    closeBtn = el("button", "cx__x");
    closeBtn.type = "button";
    closeBtn.innerHTML = ICON_X;
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.setAttribute("data-aria-en", "Close");
    closeBtn.setAttribute("data-aria-ar", "إغلاق");
    top.appendChild(tav); top.appendChild(who); top.appendChild(closeBtn);

    body = el("div", "cx__body");
    body.setAttribute("role", "log");
    body.setAttribute("aria-live", "polite");

    foot = el("div", "cx__foot");

    panel.appendChild(top); panel.appendChild(body); panel.appendChild(foot);

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    launcher.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("open")) close();
    });
  }

  /* -------------------------------------------------------------------------
     Transcript
     ---------------------------------------------------------------------- */
  function say(frag, mine) {
    var row = el("div", "cx-msg " + (mine ? "cx-msg--me" : "cx-msg--bot"));
    var bub = el("div", "bubble");
    bub.appendChild(frag);
    row.appendChild(bub);
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    return row;
  }

  function typing() {
    var row = el("div", "cx-msg cx-msg--bot");
    var bub = el("div", "bubble");
    var t = el("span", "cx-typing");
    t.innerHTML = "<i></i><i></i><i></i>";
    bub.appendChild(t); row.appendChild(bub);
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    return row;
  }

  /* Deliver a bot line after a short, believable pause. */
  function botSay(frag, delay, done) {
    if (reduced) { say(frag); if (done) done(); return; }
    busy = true;
    var t = typing();
    setTimeout(function () {
      t.remove();
      say(frag);
      busy = false;
      if (done) done();
    }, delay || 620);
  }

  function clearChips() { foot.textContent = ""; }

  function chips(opts, onPick) {
    clearChips();
    var wrap = el("div", "cx-chips");
    opts.forEach(function (o) {
      var b = el("button", "cx-chip");
      b.type = "button";
      b.appendChild(bi(o.en, o.ar));
      b.addEventListener("click", function () {
        if (busy) return;
        say(bi(o.en, o.ar), true);
        clearChips();
        onPick(o);
      });
      wrap.appendChild(b);
    });
    foot.appendChild(wrap);
  }

  /* -------------------------------------------------------------------------
     Flow
     ---------------------------------------------------------------------- */
  function askStep(i) {
    step = i;
    var s = STEPS[i];
    if (!s) return finish();

    var after = function () {
      chips(s.opts, function (o) {
        answers[s.key] = o;
        setTimeout(function () { askStep(i + 1); }, 240);
      });
    };

    if (s.q2) {
      botSay(bi(s.q.en, s.q.ar), 500, function () {
        botSay(bi(s.q2.en, s.q2.ar), 700, after);
      });
    } else {
      botSay(bi(s.q.en, s.q.ar), 620, after);
    }
  }

  function quoteHref() {
    var need = answers.need ? answers.need.v : "";
    var q = new URLSearchParams();
    if (need) q.set("need", need);
    var parts = [];
    if (answers.who) parts.push(answers.who.en);
    if (answers.market) parts.push(answers.market.en);
    if (answers.when) parts.push(answers.when.en);
    if (answers.need) parts.push("Interested in: " + answers.need.en);
    if (parts.length) q.set("msg", parts.join(" · "));
    return base + "contact.html?" + q.toString() + "#quote";
  }

  function finish() {
    var need = answers.need ? answers.need.v : "custom";
    var r = RECO[need] || RECO.custom;

    /* 1 · the recommendation */
    var f1 = document.createDocumentFragment();
    var en1 = el("span"); en1.setAttribute("data-l", "en");
    en1.appendChild(document.createTextNode("Based on that, the closest fit is "));
    var sEn = el("b"); sEn.textContent = r.name || "a custom build";
    en1.appendChild(sEn);
    en1.appendChild(document.createTextNode(" — " + r.en + " "));
    var aEn = el("a"); aEn.href = base + r.href; aEn.textContent = "See the details";
    en1.appendChild(aEn);
    en1.appendChild(document.createTextNode("."));

    var ar1 = el("span"); ar1.setAttribute("data-l", "ar");
    ar1.appendChild(document.createTextNode("بناءً على ذلك، الأقرب لكم هو "));
    var sAr = el("b"); sAr.textContent = r.name || "مشروع مخصّص";
    ar1.appendChild(sAr);
    ar1.appendChild(document.createTextNode(" — " + r.ar + " "));
    var aAr = el("a"); aAr.href = base + r.href; aAr.textContent = "اطّلعوا على التفاصيل";
    ar1.appendChild(aAr);
    ar1.appendChild(document.createTextNode("."));

    f1.appendChild(en1); f1.appendChild(ar1);

    botSay(f1, 900, function () {
      /* 2 · a market- or audience-specific remark, when we have one */
      var note = (answers.market && MARKET_NOTE[answers.market.v]) ||
                 (answers.who && WHO_NOTE[answers.who.v]);
      var next = function () { offerHandoff(); };
      if (note) botSay(bi(note.en, note.ar), 800, next);
      else next();
    });
  }

  function offerHandoff() {
    botSay(bi(
      "Send this to the team and the quote form opens with your answers already filled in. An engineer replies within one business day — not a sales queue.",
      "أرسلوا هذا إلى الفريق وسيُفتح نموذج طلب العرض وبه إجاباتكم مُعبّأة. يرد عليكم مهندس خلال يوم عمل واحد — لا طابور مبيعات."
    ), 800, function () {
      clearChips();

      var go = el("a", "cx-chip cx-chip--go");
      go.href = quoteHref();
      go.appendChild(bi("Send this and request a quote", "أرسل واطلب عرض سعر"));
      foot.appendChild(go);

      var row = el("div", "cx-chips");

      var mail = el("a", "cx-chip cx-chip--ghost");
      mail.href = "mailto:info@neptune.ly";
      mail.appendChild(bi("Email us", "راسلونا"));
      row.appendChild(mail);

      var again = el("button", "cx-chip cx-chip--ghost");
      again.type = "button";
      again.appendChild(bi("Start over", "ابدأ من جديد"));
      again.addEventListener("click", restart);
      row.appendChild(again);

      foot.appendChild(row);

      var legal = el("p", "cx__legal");
      legal.appendChild(bi(
        "Nothing is sent until you submit the form. This assistant runs entirely in your browser.",
        "لا يُرسل شيء حتى ترسلوا النموذج. يعمل هذا المساعد داخل متصفحكم بالكامل."
      ));
      foot.appendChild(legal);
    });
  }

  function restart() {
    answers = {}; step = 0;
    body.textContent = ""; clearChips();
    askStep(0);
  }

  /* -------------------------------------------------------------------------
     Open / close
     ---------------------------------------------------------------------- */
  var started = false;

  function open() {
    panel.classList.add("open");
    document.body.classList.add("cx-open");
    requestAnimationFrame(function () { panel.classList.add("shown"); });
    closeBtn.focus();
    if (!started) { started = true; askStep(0); }
  }

  function close() {
    panel.classList.remove("shown");
    document.body.classList.remove("cx-open");
    var done = function () { panel.classList.remove("open"); };
    if (reduced) done(); else setTimeout(done, 260);
    launcher.focus();
  }

  /* -------------------------------------------------------------------------
     boot
     ---------------------------------------------------------------------- */
  function init() {
    if (document.querySelector(".cx-launch")) return;
    build();
    /* Re-apply aria labels through the site's own language machinery. */
    var lb = document.querySelector(".lang-btn");
    if (lb) lb.addEventListener("click", function () { /* CSS handles the swap */ });
    void lang;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
