(() => {
  const DATA_URL = "data.json";
  const THEME_KEY = "move_house_color_scheme";
  const THEME_ORDER = ["system", "light", "dark"];
  const THEME_LABELS = { system: "系統", light: "淺色", dark: "深色" };

  const statusEl = document.getElementById("movers-status");
  const listEl = document.getElementById("movers-list");
  const emptyEl = document.getElementById("movers-empty");
  const factorsEl = document.getElementById("factors-list");
  const gapsEl = document.getElementById("gaps-panels");
  const disclaimerEl = document.getElementById("disclaimer");
  const updatedEl = document.getElementById("updated-at");
  const footerUpdatedEl = document.getElementById("footer-updated");
  const routeLabelEl = document.getElementById("route-label");
  const routeNoteEl = document.getElementById("route-note");
  const schemaEl = document.getElementById("schema-version");
  const currencyEl = document.getElementById("meta-currency");
  const timezoneEl = document.getElementById("meta-timezone");
  const tpl = document.getElementById("mover-card-tpl");
  const themeToggle = document.getElementById("theme-toggle");
  const themeLabel = document.getElementById("theme-toggle-label");
  const filterBar = document.querySelector(".filter-bar");

  let activeFilter = "all";
  let moverNodes = [];

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function formatPhoneDisplay(phone) {
    const d = digitsOnly(phone);
    if (d.length === 8) return `${d.slice(0, 4)} ${d.slice(4)}`;
    if (d.length === 11 && d.startsWith("852")) {
      return `+852 ${d.slice(3, 7)} ${d.slice(7)}`;
    }
    return phone || "";
  }

  function telHref(phone) {
    const d = digitsOnly(phone);
    if (!d) return "";
    return d.length === 8 ? `tel:+852${d}` : `tel:+${d}`;
  }

  function waHref(whatsapp) {
    const d = digitsOnly(whatsapp);
    if (!d) return "";
    const full = d.length === 8 ? `852${d}` : d;
    const text = encodeURIComponent(
      "你好，想查詢由 Moorsom Road 搬往北角 City Garden 的住宅搬屋報價。"
    );
    return `https://wa.me/${full}?text=${text}`;
  }

  function formatHkd(n) {
    if (n == null || Number.isNaN(Number(n))) return null;
    return `HK$${Number(n).toLocaleString("en-HK")}`;
  }

  function formatAmount(fee) {
    const min = formatHkd(fee.amountMin);
    const max = formatHkd(fee.amountMax);
    if (min && max && fee.amountMin !== fee.amountMax) return `${min}–${max}`;
    if (min && max) return min;
    if (min && !max) return `${min} 起`;
    if (!min && max) return `至 ${max}`;
    return fee.unit || "見來源";
  }

  function formatChecked(dateStr) {
    if (!dateStr) return "";
    try {
      const dt = new Date(`${dateStr}T12:00:00+08:00`);
      return new Intl.DateTimeFormat("zh-HK", {
        timeZone: "Asia/Hong_Kong",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(dt);
    } catch {
      return dateStr;
    }
  }

  function isQuoteOnly(status) {
    return !status || status === "需報價" || /quote/i.test(status);
  }

  function getTheme() {
    const v = document.documentElement.dataset.colorScheme;
    return THEME_ORDER.includes(v) ? v : "system";
  }

  function applyTheme(scheme) {
    const next = THEME_ORDER.includes(scheme) ? scheme : "system";
    document.documentElement.dataset.colorScheme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore private mode */
    }
    if (themeLabel) themeLabel.textContent = THEME_LABELS[next];
    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        `目前主題：${THEME_LABELS[next]}。按一下切換`
      );
      themeToggle.title = `主題：${THEME_LABELS[next]}`;
    }
  }

  function cycleTheme() {
    const i = THEME_ORDER.indexOf(getTheme());
    applyTheme(THEME_ORDER[(i + 1) % THEME_ORDER.length]);
  }

  function appendFeeItem(ul, fee) {
    const li = document.createElement("li");
    li.className = "fee-item";

    const main = document.createElement("div");
    main.className = "fee-main";

    const label = document.createElement("span");
    label.className = "fee-label";
    label.textContent = fee.label || "收費項目";

    const amount = document.createElement("span");
    amount.className = "fee-amount";
    const money = formatAmount(fee);
    const unit =
      fee.unit && money !== fee.unit ? ` · ${fee.unit}` : "";
    amount.textContent = `${money}${unit}`;

    main.append(label, amount);
    li.appendChild(main);

    if (fee.sourceUrl) {
      const a = document.createElement("a");
      a.className = "fee-source";
      a.href = fee.sourceUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "來源";
      li.appendChild(a);
    }

    ul.appendChild(li);
  }

  function renderFeeList(ul, fees) {
    ul.replaceChildren();
    (fees || []).forEach((fee) => appendFeeItem(ul, fee));
  }

  function renderSources(ul, urls) {
    ul.replaceChildren();
    (urls || []).forEach((url) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = url;
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  function renderMover(mover) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const quoteOnly = isQuoteOnly(mover.feeStatus);

    node.dataset.feeKind = quoteOnly ? "quote" : "published";
    node.classList.add(quoteOnly ? "is-quote" : "is-published");

    node.querySelector(".mover-name-zh").textContent = mover.name || "未命名";
    const en = node.querySelector(".mover-name-en");
    if (mover.nameEn && mover.nameEn !== mover.name) {
      en.textContent = mover.nameEn;
    } else {
      en.hidden = true;
    }

    const checked = node.querySelector(".mover-checked");
    checked.textContent = mover.lastChecked
      ? `核實日期：${formatChecked(mover.lastChecked)}`
      : "";

    const statusElLocal = node.querySelector(".mover-fee-status");
    statusElLocal.textContent = quoteOnly ? "需報價" : "有公開價目";
    statusElLocal.classList.add(quoteOnly ? "needs-quote" : "published");

    const notes = node.querySelector(".mover-notes");
    if (mover.notes) {
      notes.textContent = mover.notes;
    } else {
      notes.hidden = true;
    }

    const coverageBox = node.querySelector(".mover-coverage");
    const coverageUl = node.querySelector(".coverage-list");
    if (mover.coverage) {
      coverageUl.replaceChildren();
      const rows = [
        ["半山／山頂一帶", mover.coverage.midLevelsPeak],
        ["北角", mover.coverage.northPoint],
        ["港島本地", mover.coverage.islandLocal ? "是" : "否／未列明"],
      ];
      rows.forEach(([k, v]) => {
        if (!v && v !== false) return;
        const li = document.createElement("li");
        const strong = document.createElement("strong");
        strong.textContent = `${k}：`;
        li.append(strong, document.createTextNode(String(v)));
        coverageUl.appendChild(li);
      });
      if (Array.isArray(mover.coverage.sources) && mover.coverage.sources.length) {
        const li = document.createElement("li");
        li.className = "coverage-sources";
        li.appendChild(document.createTextNode("範圍來源："));
        mover.coverage.sources.forEach((url, i) => {
          if (i) li.appendChild(document.createTextNode(" · "));
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = `連結${i + 1}`;
          li.appendChild(a);
        });
        coverageUl.appendChild(li);
      }
      coverageBox.hidden = false;
    }

    const feesBox = node.querySelector(".mover-fees");
    const feesUl = node.querySelector(".fees-list");
    const feeNote = node.querySelector(".fee-note");
    if (!quoteOnly && Array.isArray(mover.fees) && mover.fees.length) {
      renderFeeList(feesUl, mover.fees);
      feesBox.hidden = false;
    } else if (quoteOnly) {
      feesUl.replaceChildren();
      const li = document.createElement("li");
      li.className = "fee-item quote-only";
      li.textContent = "需報價（無公開可核實價目表）";
      feesUl.appendChild(li);
      feesBox.hidden = false;
    }
    if (mover.feeNote) {
      feeNote.hidden = false;
      feeNote.textContent = mover.feeNote;
      feesBox.hidden = false;
    }

    const surveyBox = node.querySelector(".mover-survey");
    const surveyUl = node.querySelector(".survey-list");
    if (Array.isArray(mover.surveyFees) && mover.surveyFees.length) {
      renderFeeList(surveyUl, mover.surveyFees);
      surveyBox.hidden = false;
    }

    const callBtn = node.querySelector(".btn-call");
    if (mover.phone) {
      callBtn.href = telHref(mover.phone);
      callBtn.textContent = `致電 ${formatPhoneDisplay(mover.phone)}`;
    } else {
      callBtn.hidden = true;
    }

    const waBtn = node.querySelector(".btn-wa");
    if (mover.whatsapp) {
      waBtn.href = waHref(mover.whatsapp);
      waBtn.hidden = false;
    }

    const webBtn = node.querySelector(".btn-web");
    if (mover.website) {
      webBtn.href = mover.website;
    } else {
      webBtn.hidden = true;
    }

    renderSources(node.querySelector(".sources-list"), mover.sources);
    return node;
  }

  function applyFilter(filter) {
    activeFilter = filter || "all";
    let visible = 0;
    moverNodes.forEach((node) => {
      const kind = node.dataset.feeKind;
      const show =
        activeFilter === "all" ||
        (activeFilter === "published" && kind === "published") ||
        (activeFilter === "quote" && kind === "quote");
      node.hidden = !show;
      if (show) visible += 1;
    });
    if (emptyEl) emptyEl.hidden = visible > 0 || !moverNodes.length;
    if (filterBar) {
      filterBar.querySelectorAll(".filter-pill").forEach((btn) => {
        const on = btn.dataset.filter === activeFilter;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
  }

  function renderFactors(factors) {
    factorsEl.replaceChildren();
    (factors || []).forEach((item) => {
      const article = document.createElement("article");
      article.className = "tip-card";
      const h3 = document.createElement("h3");
      h3.textContent = item.factor || "";
      const p = document.createElement("p");
      p.textContent = item.detail || "";
      article.append(h3, p);
      if (Array.isArray(item.sources) && item.sources.length) {
        const ul = document.createElement("ul");
        ul.className = "factor-sources";
        item.sources.forEach((url) => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = url;
          li.appendChild(a);
          ul.appendChild(li);
        });
        article.appendChild(ul);
      }
      factorsEl.appendChild(article);
    });
  }

  function renderGaps(gaps) {
    gapsEl.replaceChildren();
    if (!gaps) return;
    const panels = [
      { key: "publicRates", title: "已有公開價目" },
      { key: "quoteOnly", title: "需報價" },
      { key: "missingOrWeak", title: "缺口／限制" },
    ];
    panels.forEach(({ key, title }) => {
      const items = gaps[key];
      if (!Array.isArray(items) || !items.length) return;
      const panel = document.createElement("div");
      panel.className = "gap-panel";
      const h3 = document.createElement("h3");
      h3.textContent = title;
      const ul = document.createElement("ul");
      items.forEach((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        ul.appendChild(li);
      });
      panel.append(h3, ul);
      gapsEl.appendChild(panel);
    });
  }

  function applyMeta(meta, schemaVersion) {
    if (!meta) return;
    if (meta.routeLabel && routeLabelEl) {
      routeLabelEl.textContent = meta.routeLabel;
    }
    if (meta.routeNote && routeNoteEl) {
      routeNoteEl.textContent = meta.routeNote;
    }
    if (meta.disclaimer) disclaimerEl.textContent = meta.disclaimer;
    if (meta.currency) currencyEl.textContent = meta.currency;
    if (meta.timezone) timezoneEl.textContent = meta.timezone;
    if (schemaEl && schemaVersion != null) {
      schemaEl.textContent = String(schemaVersion);
    }
    if (meta.lastChecked) {
      const label = `資料核實：${formatChecked(meta.lastChecked)}（${meta.timezone || "Asia/Hong_Kong"}）`;
      updatedEl.hidden = false;
      updatedEl.textContent = label;
      footerUpdatedEl.textContent = label;
    }
    document.title = "港島搬屋格｜Moorsom Road → City Garden";
  }

  function bindChrome() {
    applyTheme(getTheme());
    if (themeToggle) {
      themeToggle.addEventListener("click", cycleTheme);
    }
    if (filterBar) {
      filterBar.addEventListener("click", (e) => {
        const btn = e.target.closest(".filter-pill");
        if (!btn) return;
        applyFilter(btn.dataset.filter);
      });
    }
  }

  async function boot() {
    bindChrome();
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      applyMeta(data.meta, data.schemaVersion);
      renderFactors(data.hkMoveContextFactors);
      renderGaps(data.gaps);

      const movers = Array.isArray(data.movers) ? data.movers : [];
      listEl.replaceChildren();
      moverNodes = movers.map((m) => renderMover(m));
      moverNodes.forEach((n) => listEl.appendChild(n));
      listEl.hidden = false;
      statusEl.hidden = true;
      statusEl.textContent = "";
      applyFilter(activeFilter);
    } catch (err) {
      console.error(err);
      statusEl.classList.add("error");
      statusEl.hidden = false;
      statusEl.textContent =
        "無法載入 data.json。請用本地伺服器開啟（例如 python3 -m http.server），或檢查檔案是否存在。";
      listEl.hidden = true;
      if (emptyEl) emptyEl.hidden = true;
    }
  }

  boot();
})();
