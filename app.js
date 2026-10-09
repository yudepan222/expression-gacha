(() => {
  "use strict";
  const categories = window.GACHA_CATEGORIES;
  const selection = {};
  const locks = new Set();
  const rows = new Map();
  const prompt = document.getElementById("prompt");
  const status = document.getElementById("status");
  const motifCategory = categories.find(category => category.id === "motif");
  const motifNames = new Set(motifCategory.items.map(item => item.label));
  const storageKey = "expression-gacha.motif-settings.v1";
  const drawModes = new Set(["all", "favorites", "nonFavorites"]);
  const modeSelect = document.getElementById("draw-mode");
  const motifNotice = document.getElementById("motif-notice");
  const jsonInput = document.getElementById("favorites-json");
  const settingsResult = document.getElementById("settings-result");
  const favoriteButtons = new Map();
  let favorites = new Set();
  let drawMode = "all";
  let statusTimer;
  function validateSettings(data) {
    if (!data || typeof data !== "object" || Array.isArray(data) || data.version !== 1 ||
        !Array.isArray(data.favorites) || data.favorites.some(name => typeof name !== "string") ||
        (data.drawMode !== undefined && !drawModes.has(data.drawMode))) {
      throw new Error("version: 1、favorites: モチーフ名の配列、drawMode: all / favorites / nonFavorites を指定してください。");
    }
    return {
      favorites: new Set(data.favorites.filter(name => motifNames.has(name))),
      drawMode: data.drawMode === undefined ? drawMode : data.drawMode,
    };
  }
  function exportSettings() {
    return JSON.stringify({
      version: 1,
      favorites: motifCategory.items.filter(item => favorites.has(item.label)).map(item => item.label),
      drawMode,
    }, null, 2);
  }
  function storageWarning(message) {
    const notice = document.getElementById("storage-notice");
    notice.textContent = message;
    notice.hidden = false;
  }
  function saveSettings() {
    try {
      localStorage.setItem(storageKey, exportSettings());
      document.getElementById("storage-notice").hidden = true;
    } catch {
      storageWarning("ブラウザに設定を保存できません。このページでは使えますが、再読み込みに備えてJSONを出力してください。");
    }
  }
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      const settings = validateSettings(JSON.parse(saved));
      favorites = settings.favorites;
      drawMode = settings.drawMode;
    }
  } catch {
    storageWarning("保存済みの設定を読み込めませんでした。保存データは上書きせず、初期設定で表示しています。必要ならJSONをインポートしてください。");
  }
  function motifCandidates() {
    return motifCategory.items.filter(item => drawMode === "all" ||
      (drawMode === "favorites" ? favorites.has(item.label) : !favorites.has(item.label)));
  }
  function emptyMotifMessage() {
    return drawMode === "favorites"
      ? "お気に入りのモチーフがありません。星で登録するか、抽選モードを変更してください。"
      : "非お気に入りのモチーフがありません。星で登録を解除するか、抽選モードを変更してください。";
  }
  function setFavoriteButton(button, label) {
    const active = favorites.has(label);
    button.textContent = `${active ? "★" : "☆"} ${label}`;
    button.classList.toggle("is-favorite", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", `${label}のお気に入り${active ? "を解除" : "に登録"}`);
  }
  function toggleFavorite(label) {
    if (favorites.has(label)) favorites.delete(label); else favorites.add(label);
    saveSettings();
    refresh();
  }
  function announce(message) {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.classList.add("visible");
    statusTimer = setTimeout(() => status.classList.remove("visible"), 3500);
  }
  // モチーフは現在の候補全件から均等に抽選。他カテゴリの引き直しは従来どおり。
  function draw(category) {
    let candidates;
    if (category.id === "motif") {
      candidates = motifCandidates();
    } else {
      const pool = category.items.filter(item => item !== selection[category.id]);
      candidates = pool.length ? pool : category.items;
    }
    if (!candidates.length) return false;
    selection[category.id] = candidates[Math.floor(Math.random() * candidates.length)];
    return true;
  }
  function refresh() {
    for (const category of categories) {
      const row = rows.get(category.id);
      const item = selection[category.id];
      row.value.textContent = item ? item.label : "抽選対象がありません";
      const locked = locks.has(category.id);
      row.element.classList.toggle("locked", locked);
      row.lock.setAttribute("aria-pressed", String(locked));
      row.lock.textContent = locked ? "● 固定中" : "固定";
      row.lock.disabled = !item;
      row.reroll.disabled = locked || (category.id === "motif" ? !motifCandidates().length : category.items.length < 2);
      if (row.favorite) {
        row.favorite.disabled = !item;
        if (item) setFavoriteButton(row.favorite, item.label);
        else {
          row.favorite.textContent = "☆";
          row.favorite.setAttribute("aria-pressed", "false");
          row.favorite.setAttribute("aria-label", "主役モチーフのお気に入り登録");
        }
      }
      row.swatches.replaceChildren();
      for (const color of item?.colors || []) {
        const dot = document.createElement("span");
        dot.style.backgroundColor = color;
        dot.title = color;
        row.swatches.append(dot);
      }
    }
    document.getElementById("lock-count").textContent = `${locks.size} / 7 固定中`;
    document.getElementById("draw-all").disabled = locks.size === categories.length;
    modeSelect.value = drawMode;
    motifNotice.hidden = motifCandidates().length > 0;
    motifNotice.textContent = motifNotice.hidden ? "" : `${emptyMotifMessage()}${selection.motif ? " 現在のモチーフは保持しています。" : ""}`;
    document.getElementById("favorites-count").textContent = `${favorites.size} / ${motifCategory.items.length}件登録`;
    for (const [label, button] of favoriteButtons) setFavoriteButton(button, label);
    document.getElementById("copy").disabled = !selection.motif;
    prompt.value = selection.motif ? window.buildPrompt(selection) : "主役モチーフの抽選対象がありません。お気に入り設定または抽選モードを変更して、再抽選してください。";
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
      const drawn = draw(category); refresh();
      announce(drawn ? `${category.name}：${selection[category.id].label}` : emptyMotifMessage());
    });
    actions.append(lock, reroll);
    let favorite;
    if (category.id === "motif") {
      favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = "favorite-button current-favorite";
      favorite.addEventListener("click", () => {
        if (selection.motif) toggleFavorite(selection.motif.label);
      });
      content.append(favorite);
    }
    element.append(number, content, actions);
    document.getElementById("categories").append(element);
    rows.set(category.id, { element, value, swatches, lock, reroll, favorite });
    draw(category);
  }
  const groups = new Map();
  for (const item of motifCategory.items) {
    const groupName = item.group || "その他";
    if (!groups.has(groupName)) {
      const group = document.createElement("fieldset");
      const legend = document.createElement("legend");
      legend.textContent = groupName;
      const grid = document.createElement("div");
      grid.className = "favorite-grid";
      group.append(legend, grid);
      document.getElementById("favorites-list").append(group);
      groups.set(groupName, grid);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "favorite-button";
    button.addEventListener("click", () => toggleFavorite(item.label));
    favoriteButtons.set(item.label, button);
    groups.get(groupName).append(button);
  }
  modeSelect.addEventListener("change", () => {
    drawMode = modeSelect.value;
    saveSettings();
    refresh();
  });
  document.getElementById("export-favorites").addEventListener("click", () => {
    jsonInput.value = exportSettings();
    settingsResult.textContent = "現在の設定をJSONに出力しました。コピーして別の端末へ移せます。";
  });
  document.getElementById("copy-favorites").addEventListener("click", async () => {
    jsonInput.value = exportSettings();
    await copyText(jsonInput, document.getElementById("copy-favorites"), "JSON");
  });
  document.getElementById("import-favorites").addEventListener("click", () => {
    let settings;
    try {
      settings = validateSettings(JSON.parse(jsonInput.value));
    } catch (error) {
      settingsResult.textContent = error instanceof SyntaxError
        ? "JSONの形式が不正です。現在の設定は変更していません。"
        : `設定を読み込めません。${error.message} 現在の設定は変更していません。`;
      return;
    }
    favorites = settings.favorites;
    drawMode = settings.drawMode;
    saveSettings();
    refresh();
    settingsResult.textContent = `${favorites.size}件のお気に入りをインポートしました。未知のモチーフ名は無視し、重複は1件にまとめています。`;
  });
  document.getElementById("draw-all").addEventListener("click", () => {
    categories.forEach(category => { if (!locks.has(category.id)) draw(category); });
    refresh(); announce(!locks.has("motif") && !motifCandidates().length
      ? `他の未固定カテゴリを抽選しました。${emptyMotifMessage()}` : "新しい組み合わせができました");
  });
  async function copyText(source, trigger, label) {
    // file:// で Clipboard API が使えないブラウザにも対応。
    const text = source.value;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      announce(`${label}をコピーしました`);
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
        trigger.focus();
        announce(`${label}をコピーしました`);
      } else {
        source.focus(); source.select();
        announce("自動コピーが使えません。選択したテキストを手動でコピーしてください");
      }
    }
  }
  document.getElementById("copy").addEventListener("click", () => copyText(prompt, document.getElementById("copy"), "プロンプト"));
  refresh();
})();
