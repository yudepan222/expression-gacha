(() => {
  "use strict";
  const categories = window.GACHA_CATEGORIES;
  const selection = {};
  const locks = new Set();
  const rows = new Map();
  const prompt = document.getElementById("prompt");
  const status = document.getElementById("status");
  let statusTimer;
  function announce(message) {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.classList.add("visible");
    statusTimer = setTimeout(() => status.classList.remove("visible"), 3500);
  }
  // 引き直しでは同じ候補を除外。候補が1件ならその候補を維持します。
  function draw(category) {
    const pool = category.items.filter(item => item !== selection[category.id]);
    const candidates = pool.length ? pool : category.items;
    selection[category.id] = candidates[Math.floor(Math.random() * candidates.length)];
  }
  function refresh() {
    for (const category of categories) {
      const row = rows.get(category.id);
      const item = selection[category.id];
      row.value.textContent = item.label;
      const locked = locks.has(category.id);
      row.element.classList.toggle("locked", locked);
      row.lock.setAttribute("aria-pressed", String(locked));
      row.lock.textContent = locked ? "● 固定中" : "固定";
      row.reroll.disabled = locked || category.items.length < 2;
      row.swatches.replaceChildren();
      for (const color of item.colors || []) {
        const dot = document.createElement("span");
        dot.style.backgroundColor = color;
        row.swatches.append(dot);
      }
    }
    document.getElementById("lock-count").textContent = `${locks.size} / 7 固定中`;
    document.getElementById("draw-all").disabled = locks.size === categories.length;
    prompt.value = window.buildPrompt(selection);
  }
  if (categories.some(category => !category.items.length)) {
    document.getElementById("draw-all").disabled = true;
    document.getElementById("copy").disabled = true;
    prompt.value = "候補が空のカテゴリがあります。data.js の各カテゴリに1件以上の候補を設定して、ページを再読み込みしてください。";
    return;
  }
  for (const [index, category] of categories.entries()) {
    const element = document.createElement("article");
    element.className = "category";
    const number = document.createElement("span");
    number.className = "number";
    number.textContent = String(index + 1).padStart(2, "0");
    const content = document.createElement("div");
    content.className = "category-content";
    const name = document.createElement("h3");
    name.textContent = category.name;
    const hint = document.createElement("span");
    hint.textContent = category.hint;
    name.append(hint);
    const value = document.createElement("p");
    value.className = "value";
    const swatches = document.createElement("div");
    swatches.className = "swatches";
    swatches.setAttribute("aria-hidden", "true");
    content.append(name, value, swatches);
    const actions = document.createElement("div");
    actions.className = "row-actions";
    const lock = document.createElement("button");
    lock.type = "button";
    lock.className = "lock-button";
    lock.setAttribute("aria-label", `${category.name}の固定`);
    lock.addEventListener("click", () => {
      if (locks.has(category.id)) locks.delete(category.id); else locks.add(category.id);
      refresh();
      announce(`${category.name}の固定を${locks.has(category.id) ? "設定" : "解除"}しました`);
    });
    const reroll = document.createElement("button");
    reroll.type = "button";
    reroll.className = "reroll";
    reroll.textContent = "↻";
    reroll.title = `${category.name}を引き直す（固定中は解除してください）`;
    reroll.setAttribute("aria-label", `${category.name}を引き直す`);
    reroll.addEventListener("click", () => {
      if (locks.has(category.id)) return;
      draw(category); refresh();
      announce(`${category.name}：${selection[category.id].label}`);
    });
    actions.append(lock, reroll);
    element.append(number, content, actions);
    document.getElementById("categories").append(element);
    rows.set(category.id, { element, value, swatches, lock, reroll });
    draw(category);
  }
  document.getElementById("draw-all").addEventListener("click", () => {
    categories.forEach(category => { if (!locks.has(category.id)) draw(category); });
    refresh(); announce("新しい組み合わせができました");
  });
  document.getElementById("copy").addEventListener("click", async () => {
    // file:// で Clipboard API が使えないブラウザにも対応。
    const text = prompt.value;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      announce("プロンプトをコピーしました");
    } catch {
      const buffer = document.createElement("textarea");
      buffer.value = text;
      buffer.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.append(buffer);
      buffer.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch { /* 手動コピーへ */ }
      buffer.remove();
      if (copied) {
        document.getElementById("copy").focus();
        announce("プロンプトをコピーしました");
      } else {
        prompt.focus(); prompt.select();
        announce("自動コピーが使えません。Ctrl+Cでコピーしてください");
      }
    }
  });
  refresh();
})();
