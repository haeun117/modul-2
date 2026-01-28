(function () {
  'use strict';

  const FRUITS = [
    { id: "blueberry", emoji: "🫐", name: "블루베리", note: "𝅘𝅥𝅯", desc: "16분", length: 1 },
    { id: "apple", emoji: "🍎", name: "사과", note: "♪", desc: "8분", length: 2 },
    { id: "orange", emoji: "🍊", name: "귤", note: "♩", desc: "4분", length: 4 },
    { id: "melon", emoji: "🍈", name: "멜론", note: "𝅗𝅥", desc: "2분", length: 8 },
    { id: "peach", emoji: "🍑", name: "복숭아", note: "점", desc: "점2분", length: 12 },
    { id: "pineapple", emoji: "🍍", name: "파인애플", note: "𝅝", desc: "온음표", length: 16 }
  ];

  const ASSET_BASE = "./";
  const assetPath = (path) => `${ASSET_BASE}${path}`;

  const state = {
    currentOrder: { stage: 1, items: [] },
    currentStage: 0,
    plate: [],
    stageDuration: 60,
    timeLeft: 60,
    timerInterval: null,
    isPaused: true,
    isStarted: false,
    isRestMode: false
  };

  const dom = {};

  const customers = [
    "assets/characters/boy.png",
    "assets/characters/girl.png",
    "assets/characters/grandfa.png",
    "assets/characters/grandma.png",
    "assets/characters/man.png",
    "assets/characters/woman.png"
  ].map(assetPath);

  function cacheDom() {
    dom.fruitBins = document.getElementById("fruit-bins");
    dom.orderItems = document.getElementById("order-items");
    dom.customerImage = document.getElementById("customer-image");
    dom.toppingGrid = document.getElementById("topping-grid");
    dom.clockFill = document.getElementById("clock-fill");
    dom.clockHandle = document.querySelector(".clock-handle");
    dom.clockToggle = document.getElementById("clock-toggle");
    dom.resultOverlay = document.getElementById("result-overlay");
    dom.resultText = document.getElementById("result-text");
    dom.resultButton = document.getElementById("result-button");
    dom.retryButton = document.getElementById("retry-button");
    dom.homeOverlayButton = document.getElementById("home-overlay-button");
    dom.homeScreen = document.getElementById("home-screen");
    dom.gameScreen = document.getElementById("game-screen");
    dom.homeButton = document.getElementById("home-button");
    dom.stageLabel = document.getElementById("stage-label");
    dom.modeLabel = document.getElementById("mode-label");
    dom.stageButtons = document.querySelectorAll("[data-stage-button]");
    dom.homeCustomers = document.querySelectorAll(".home-customer");
    dom.stage4Note = document.getElementById("stage4-note");
    dom.stage4NoteSecondary = document.getElementById("stage4-note-secondary");
    dom.countingPanel = document.getElementById("counting-panel");
  }

  function renderOrder() {
    dom.orderItems.innerHTML = "";
    state.currentOrder.items.forEach((item) => {
      const fruit = FRUITS.find((candidate) => candidate.id === item.id);
      const wrapper = document.createElement("div");
      wrapper.className = "order-item";
      const chip = createFruitChip(item.id);
      if (chip) {
        wrapper.appendChild(chip);
      } else {
        const fallback = document.createElement("span");
        fallback.textContent = fruit ? fruit.emoji : "";
        wrapper.appendChild(fallback);
      }
      const qty = document.createElement("span");
      qty.className = "order-qty";
      qty.textContent = `x${item.qty}`;
      wrapper.appendChild(qty);
      dom.orderItems.appendChild(wrapper);
    });
    updateStageNotice();
  }

  function updateStageNotice() {
    if (!dom.stage4Note || !dom.stage4NoteSecondary) return;
    const target = state.currentOrder.items && state.currentOrder.items[0];
    const term = state.isRestMode ? "쉼표" : "음표";
    if (state.currentStage === 1 || state.currentStage === 2) {
      dom.stage4Note.textContent =
        "손님이 주문한 과일을 접시에 드래그 해서 서빙해봅시다.";
      dom.stage4Note.classList.add("is-visible");
      dom.stage4NoteSecondary.innerHTML =
        state.currentStage === 2
          ? "주문한 과일과 같은 길이의 과일을<br>하단의 보라색 블록으로 확인해봅시다."
          : `과일에 해당되는 ${term}를 익혀봅시다.`;
      dom.stage4NoteSecondary.classList.add("is-visible");
      return;
    }
    if ((state.currentStage === 3 || state.currentStage === 4) && target) {
      const fruit = FRUITS.find((item) => item.id === target.id);
      const name = fruit ? fruit.name : "과일";
      const particle = getSubjectParticle(name);
      dom.stage4Note.innerHTML = `${name}${particle} 다 떨어졌어요.<br>${name} 대신 다른 과일로 주문한 것과 똑같은 ${term} 길이를 만들어봅시다.`;
      dom.stage4Note.classList.add("is-visible");
      dom.stage4NoteSecondary.innerHTML =
        "주문한 과일과 같은 길이의 과일을<br>하단의 보라색 블록으로 확인해봅시다.";
      dom.stage4NoteSecondary.classList.add("is-visible");
      return;
    }
    dom.stage4Note.classList.remove("is-visible");
    dom.stage4NoteSecondary.classList.remove("is-visible");
  }

  function getSubjectParticle(word) {
    if (!word) return "이";
    const lastChar = word[word.length - 1];
    const code = lastChar.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return "이";
    return (code - 0xac00) % 28 === 0 ? "가" : "이";
  }

  function renderHomeBubbles() {
    dom.homeCustomers.forEach((card) => {
      const list = card.dataset.order ? card.dataset.order.split(",") : [];
      const bubble = card.querySelector(".home-bubble-items");
      if (!bubble) return;
      bubble.innerHTML = "";
      list.forEach((id) => {
        const chip = createFruitChip(id);
        if (!chip) return;
        chip.classList.add("home-fruit-chip");
        bubble.appendChild(chip);
      });
    });
  }

  function updateStageLabel() {
    if (!dom.stageLabel) return;
    dom.stageLabel.textContent = `${state.currentStage}단계`;
  }

  function updateModeLabel() {
    if (!dom.modeLabel) return;
    dom.modeLabel.textContent = state.isRestMode ? "쉼표 학습" : "음표 학습";
  }

  function showHome() {
    if (dom.homeScreen) {
      dom.homeScreen.classList.add("is-visible");
      dom.homeScreen.setAttribute("aria-hidden", "false");
    }
    if (dom.gameScreen) {
      dom.gameScreen.classList.add("is-hidden");
      dom.gameScreen.setAttribute("aria-hidden", "true");
    }
    stopStageTimer();
    hideResult();
  }

  function showGame() {
    if (dom.homeScreen) {
      dom.homeScreen.classList.remove("is-visible");
      dom.homeScreen.setAttribute("aria-hidden", "true");
    }
    if (dom.gameScreen) {
      dom.gameScreen.classList.remove("is-hidden");
      dom.gameScreen.setAttribute("aria-hidden", "false");
    }
  }

  function initAssetImages() {
    const images = document.querySelectorAll("[data-asset-src]");
    images.forEach((img) => {
      const src = img.getAttribute("data-asset-src");
      if (src) {
        img.src = assetPath(src);
      }
    });
  }

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function pickCustomer() {
    if (!dom.customerImage) return;
    dom.customerImage.src = randomItem(customers);
  }

  function buildItemsFromCounts(counts) {
    return Object.entries(counts).map(([id, qty]) => ({ id, qty }));
  }

  function generateStage1() {
    const fruit = randomItem(FRUITS);
    return { stage: 1, items: [{ id: fruit.id, qty: 1 }] };
  }

  function generateStage2() {
    const fruit = randomItem(FRUITS);
    const qty = 2 + Math.floor(Math.random() * 3);
    return { stage: 2, items: [{ id: fruit.id, qty }] };
  }

  function generateStage3() {
    const eligible = FRUITS.filter((fruit) => fruit.id !== "blueberry");
    let target = randomItem(eligible);
    let attempts = 0;
    while (attempts < 12 && !canMakeLength(target.length, target.id)) {
      target = randomItem(eligible);
      attempts += 1;
    }
    return { stage: 3, items: [{ id: target.id, qty: 1 }] };
  }

  function canMakeLength(totalLength, excludeId) {
    const options = FRUITS.filter((fruit) => fruit.id !== excludeId);
    const dp = Array(totalLength + 1).fill(false);
    dp[0] = true;
    for (let i = 1; i <= totalLength; i += 1) {
      dp[i] = options.some((fruit) => i - fruit.length >= 0 && dp[i - fruit.length]);
    }
    return dp[totalLength];
  }

  function generateStage4() {
    const eligible = FRUITS.filter((fruit) => fruit.id !== "blueberry");
    let target = randomItem(eligible);
    let qty = Math.floor(Math.random() * 2) + 2;
    let attempts = 0;
    while (attempts < 12 && !canMakeLength(target.length * qty, target.id)) {
      target = randomItem(eligible);
      qty = Math.floor(Math.random() * 2) + 2;
      attempts += 1;
    }
    return { stage: 4, items: [{ id: target.id, qty }] };
  }

  function nextOrder() {
    if (state.currentStage === 1) state.currentOrder = generateStage1();
    if (state.currentStage === 2) state.currentOrder = generateStage2();
    if (state.currentStage === 3) state.currentOrder = generateStage3();
    if (state.currentStage === 4) state.currentOrder = generateStage4();
    pickCustomer();
    renderOrder();
  }

  function startStage(stage) {
    state.currentStage = stage;
    nextOrder();
    startStageTimer();
    updateStageLabel();
  }

  function advanceStage() {
    state.plate.splice(0, state.plate.length);
    renderPlateItems();
    renderNoteStickers();
    updateServeButton();
    state.currentStage = state.currentStage % 4 + 1;
    nextOrder();
    startStageTimer();
    updateStageLabel();
  }

  function updateTimerUI() {
    const ratio = Math.max(state.timeLeft, 0) / state.stageDuration;
    if (dom.clockFill) {
      const degrees = Math.max(0, ratio) * 360;
      dom.clockFill.style.background = `conic-gradient(#4aa6d6 ${degrees}deg, transparent 0deg)`;
    }
    if (dom.clockHandle) {
      const angle = Math.max(0, ratio) * 360;
      dom.clockHandle.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
    }
  }

  function updateClockToggle() {
    if (!dom.clockToggle) return;
    const stateLabel = state.isPaused ? "paused" : "playing";
    dom.clockToggle.dataset.state = stateLabel;
    dom.clockToggle.setAttribute("aria-label", state.isPaused ? "재생" : "일시정지");
  }

  function startStageTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timeLeft = state.stageDuration;
    updateTimerUI();
    state.isPaused = true;
    updateClockToggle();
    state.timerInterval = setInterval(() => {
      if (state.isPaused) return;
      state.timeLeft -= 1;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        updateTimerUI();
        showStageComplete();
        return;
      }
      updateTimerUI();
    }, 1000);
  }

  function stopStageTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    state.isPaused = true;
    updateClockToggle();
  }

  function renderToppings() {
    dom.toppingGrid.innerHTML = "";
    const plateWrap = document.createElement("div");
    plateWrap.className = "plate-drop";
    plateWrap.id = "plate-drop";
    const noteStrip = document.createElement("div");
    noteStrip.className = "note-stickers";
    noteStrip.id = "note-stickers";
    const plateItems = document.createElement("div");
    plateItems.className = "plate-items";
    plateItems.id = "plate-items";
    const plateBase = document.createElement("div");
    plateBase.className = "plate-illustration";
    const serveButton = document.createElement("button");
    serveButton.className = "serve-button";
    serveButton.type = "button";
    serveButton.id = "serve-button";
    serveButton.textContent = "서빙하기";
    const clearButton = document.createElement("button");
    clearButton.className = "clear-button";
    clearButton.type = "button";
    clearButton.id = "clear-button";
    clearButton.textContent = "접시 비우기";
    plateWrap.appendChild(plateItems);
    plateWrap.appendChild(plateBase);
    plateWrap.appendChild(serveButton);
    plateWrap.appendChild(clearButton);
    if (dom.toppingGrid.parentElement) {
      dom.toppingGrid.parentElement.appendChild(noteStrip);
    }
    dom.toppingGrid.appendChild(plateWrap);

    plateWrap.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    plateWrap.addEventListener("drop", (event) => {
      event.preventDefault();
      if (!state.isStarted || state.isPaused) {
        showStartPrompt();
        return;
      }
      const fruitId = event.dataTransfer.getData("text/plain");
      if (fruitId) {
        state.plate.push(fruitId);
        renderPlateItems();
        renderNoteStickers();
        updateServeButton();
      }
    });
  }

  function createFruitChip(fruitId) {
    const fruit = FRUITS.find((item) => item.id === fruitId);
    if (!fruit) return null;
    const chip = document.createElement("span");
    const leafClass =
      fruitId === "blueberry" || fruitId === "melon" ? "" : "leaf";
    const pearClass = fruitId === "melon" ? "melon" : "";
    const peachClass = fruitId === "peach" ? "peach" : "";
    const pineappleClass = fruitId === "pineapple" ? "pineapple" : "";
    const appleClass = fruitId === "apple" ? "apple" : "";
    chip.className = `plate-fruit ${leafClass} ${pearClass} ${peachClass} ${pineappleClass} ${appleClass} ${fruitId}`.trim();
    if (fruitId === "peach") {
      const line = document.createElement("span");
      line.className = "peach-line";
      chip.appendChild(line);
    }
    const style = {
      orange: { light: "#ffb259", dark: "#f47c2a", leaf: "#73c06b" },
      apple: { light: "#ff6f6f", dark: "#c83232", leaf: "#6abf69" },
      blueberry: { light: "#8ea0ff", dark: "#3d4fd1", leaf: "#6abf69" },
      melon: { light: "#b9d56e", dark: "#9cbc4f", leaf: "#5bbf6b" },
      peach: { light: "#ffb5a6", dark: "#e6766a", leaf: "#7ac06b" },
      pineapple: { light: "#ffd365", dark: "#f2a93f", leaf: "#5bbf6b" }
    };
    const palette = style[fruitId];
    if (palette) {
      chip.style.setProperty("--fruit-light", palette.light);
      chip.style.setProperty("--fruit-dark", palette.dark);
      chip.style.setProperty("--leaf", palette.leaf);
    }
    return chip;
  }

  function renderPlateItems() {
    const plateItems = document.getElementById("plate-items");
    if (!plateItems) return;
    plateItems.innerHTML = "";
    state.plate.forEach((id, index) => {
      const chip = createFruitChip(id);
      if (!chip) return;
      const wrapper = document.createElement("div");
      wrapper.className = "plate-chip";
      const remove = document.createElement("button");
      remove.className = "plate-remove";
      remove.type = "button";
      remove.textContent = "x";
      remove.addEventListener("click", () => {
        state.plate.splice(index, 1);
        renderPlateItems();
        renderNoteStickers();
        updateServeButton();
      });
      wrapper.appendChild(chip);
      wrapper.appendChild(remove);
      plateItems.appendChild(wrapper);
    });
    updateCountingHighlight();
  }

  function updateCountingHighlight() {
    const rows = document.querySelectorAll(".counting-row[data-fruit]");
    if (!rows.length) return;
    const active = new Set(state.plate);
    const related = new Set();
    if (state.plate.length > 0) {
      const totalLength = state.plate.reduce((sum, id) => {
        const fruit = FRUITS.find((item) => item.id === id);
        return sum + (fruit ? fruit.length : 0);
      }, 0);
      FRUITS.forEach((fruit) => {
        if (fruit.length === totalLength && !active.has(fruit.id)) {
          related.add(fruit.id);
        }
      });
    }
    rows.forEach((row) => {
      const fruitId = row.dataset.fruit;
      if (fruitId && active.has(fruitId)) {
        row.classList.add("is-active");
        row.classList.remove("is-related");
      } else if (fruitId && related.has(fruitId)) {
        row.classList.remove("is-active");
        row.classList.add("is-related");
      } else {
        row.classList.remove("is-active");
        row.classList.remove("is-related");
      }
    });
  }

  function buildNoteIcon(type) {
    const noteIcon = document.createElement("span");
    noteIcon.className = `note ${type}`;
    const head = document.createElement("span");
    head.className = "head";
    noteIcon.appendChild(head);
    if (type !== "whole") {
      const stem = document.createElement("span");
      stem.className = "stem";
      noteIcon.appendChild(stem);
    }
    if (type === "eighth" || type === "sixteenth") {
      const flag1 = document.createElement("span");
      flag1.className = "flag flag1";
      noteIcon.appendChild(flag1);
    }
    if (type === "sixteenth") {
      const flag2 = document.createElement("span");
      flag2.className = "flag flag2";
      noteIcon.appendChild(flag2);
    }
    if (type === "half" || type === "whole" || type === "dotted-half") {
      noteIcon.classList.add("hollow");
    }
    if (type === "whole") {
      noteIcon.classList.add("whole");
    }
    if (type === "dotted-half") {
      const dot = document.createElement("span");
      dot.className = "dot";
      noteIcon.appendChild(dot);
    }
    return noteIcon;
  }

  function buildRestIcon(type) {
    const restMap = {
      sixteenth: "𝄿",
      eighth: "𝄾",
      quarter: "𝄽",
      half: "𝄼",
      "dotted-half": "𝄼",
      whole: "𝄻"
    };
    const icon = document.createElement("span");
    icon.className = "rest-icon";
    icon.textContent = restMap[type] || "";
    if (type === "dotted-half") {
      icon.classList.add("dotted");
      const dot = document.createElement("span");
      dot.className = "rest-dot";
      icon.appendChild(dot);
    }
    return icon;
  }

  function renderNoteStickers() {
    const noteStrip = document.getElementById("note-stickers");
    if (!noteStrip) return;
    noteStrip.innerHTML = "";
    const noteLabels = {
      orange: { type: "quarter", label: "4분음표" },
      apple: { type: "eighth", label: "8분음표" },
      blueberry: { type: "sixteenth", label: "16분음표" },
      melon: { type: "half", label: "2분음표" },
      peach: { type: "dotted-half", label: "점2분음표" },
      pineapple: { type: "whole", label: "온음표" }
    };
    const restLabels = {
      orange: { type: "quarter", label: "4분쉼표" },
      apple: { type: "eighth", label: "8분쉼표" },
      blueberry: { type: "sixteenth", label: "16분쉼표" },
      melon: { type: "half", label: "2분쉼표" },
      peach: { type: "dotted-half", label: "점2분쉼표" },
      pineapple: { type: "whole", label: "온쉼표" }
    };
    const rhythmMarks = {
      orange: "V",
      apple: null,
      blueberry: null,
      melon: "VV",
      peach: "VVV",
      pineapple: "VVVV"
    };
    state.plate.forEach((id) => {
      const note = (state.isRestMode ? restLabels : noteLabels)[id];
      if (!note) return;
      const chip = document.createElement("div");
      chip.className = "note-chip";
      chip.appendChild(state.isRestMode ? buildRestIcon(note.type) : buildNoteIcon(note.type));
      const label = document.createElement("span");
      label.textContent = note.label;
      chip.appendChild(label);
      if (id === "apple" || id === "blueberry") {
        const markWrap = document.createElement("span");
        markWrap.className = "rhythm-mark";
        if (id === "apple") {
          const left = document.createElement("span");
          left.className = "count-mark v-left";
          const right = document.createElement("span");
          right.className = "count-mark v-right";
          markWrap.appendChild(left);
          markWrap.appendChild(right);
        } else {
          const leftSplit = document.createElement("span");
          leftSplit.className = "count-mark v-left-split";
          const right = document.createElement("span");
          right.className = "count-mark v-right";
          markWrap.appendChild(leftSplit);
          markWrap.appendChild(right);
        }
        chip.appendChild(markWrap);
      } else {
        const rhythm = document.createElement("span");
        rhythm.className = "rhythm";
        rhythm.textContent = rhythmMarks[id] || "";
        chip.appendChild(rhythm);
      }
      noteStrip.appendChild(chip);
    });
  }

  function renderFruitBins() {
    dom.fruitBins.innerHTML = "";
    const fruitStyles = {
      orange: { light: "#ffb259", dark: "#f47c2a", leaf: "#73c06b" },
      apple: { light: "#ff6f6f", dark: "#c83232", leaf: "#6abf69" },
      blueberry: { light: "#8ea0ff", dark: "#3d4fd1", leaf: "#6abf69" },
      melon: { light: "#b9d56e", dark: "#9cbc4f", leaf: "#5bbf6b" },
      peach: { light: "#ffb5a6", dark: "#e6766a", leaf: "#7ac06b" },
      pineapple: { light: "#ffd365", dark: "#f2a93f", leaf: "#5bbf6b" }
    };
    const noteLabels = {
      orange: { type: "quarter", label: "4분음표" },
      apple: { type: "eighth", label: "8분음표" },
      blueberry: { type: "sixteenth", label: "16분음표" },
      melon: { type: "half", label: "2분음표" },
      peach: { type: "dotted-half", label: "점2분음표" },
      pineapple: { type: "whole", label: "온음표" }
    };
    const restLabels = {
      orange: { type: "quarter", label: "4분쉼표" },
      apple: { type: "eighth", label: "8분쉼표" },
      blueberry: { type: "sixteenth", label: "16분쉼표" },
      melon: { type: "half", label: "2분쉼표" },
      peach: { type: "dotted-half", label: "점2분쉼표" },
      pineapple: { type: "whole", label: "온쉼표" }
    };
    FRUITS.forEach((fruit) => {
      const style = fruitStyles[fruit.id] || {
        light: "#ffd4b8",
        dark: "#f2a07b",
        leaf: "#6abf69"
      };
      const note =
        (state.isRestMode ? restLabels : noteLabels)[fruit.id] || {
          type: "quarter",
          label: ""
        };
      const button = document.createElement("button");
      button.className = `fruit-slot ${fruit.id}`.trim();
      button.type = "button";
      button.draggable = true;
      button.style.setProperty("--fruit-light", style.light);
      button.style.setProperty("--fruit-dark", style.dark);
      button.style.setProperty("--leaf", style.leaf);
      button.addEventListener("dragstart", (event) => {
        if (!state.isStarted || state.isPaused) {
          event.preventDefault();
          showStartPrompt();
          return;
        }
        event.dataTransfer.setData("text/plain", fruit.id);
        const dragChip = createFruitChip(fruit.id);
        if (dragChip) {
          dragChip.style.position = "absolute";
          dragChip.style.top = "-9999px";
          dragChip.style.left = "-9999px";
          document.body.appendChild(dragChip);
          event.dataTransfer.setDragImage(dragChip, 12, 12);
          requestAnimationFrame(() => dragChip.remove());
        }
      });
      const cluster = document.createElement("div");
      cluster.className = "fruit-cluster";
      const totalPieces =
        fruit.id === "blueberry" ? 20 : fruit.id === "melon" ? 5 : 7;
      for (let i = 1; i <= totalPieces; i += 1) {
        const piece = document.createElement("span");
        const leafClass =
          fruit.id === "blueberry" || fruit.id === "melon"
            ? ""
            : i % 2 === 0
              ? "leaf"
              : "";
        piece.className = `fruit-piece p${i} ${leafClass}`.trim();
        if (fruit.id === "peach") {
          const line = document.createElement("span");
          line.className = "peach-line";
          piece.appendChild(line);
        }
        cluster.appendChild(piece);
      }
      const basket = document.createElement("div");
      basket.className = "basket";
      const fruitLabel = document.createElement("div");
      fruitLabel.className = "fruit-label";
      fruitLabel.textContent = fruit.name;
      const plankTop = document.createElement("div");
      plankTop.className = "crate-plank top";
      const plankMid = document.createElement("div");
      plankMid.className = "crate-plank mid";
      const plankBottom = document.createElement("div");
      plankBottom.className = "crate-plank bottom";
      const sticker = document.createElement("div");
      sticker.className = "crate-sticker";
      const noteIcon = state.isRestMode ? buildRestIcon(note.type) : buildNoteIcon(note.type);
      const noteLabel = document.createElement("div");
      noteLabel.textContent = note.label;
      sticker.appendChild(noteIcon);
      sticker.appendChild(noteLabel);
      basket.appendChild(plankTop);
      basket.appendChild(plankMid);
      basket.appendChild(plankBottom);
      basket.appendChild(sticker);
      button.appendChild(fruitLabel);
      button.appendChild(cluster);
      button.appendChild(basket);
      dom.fruitBins.appendChild(button);
    });
  }

  function updateServeButton() {
    const serveButton = document.getElementById("serve-button");
    const clearButton = document.getElementById("clear-button");
    if (serveButton) {
      serveButton.disabled = state.plate.length === 0;
    }
    if (clearButton) {
      clearButton.disabled = state.plate.length === 0;
    }
  }

  function plateCounts() {
    return state.plate.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});
  }

  function validateOrder() {
    const counts = plateCounts();
    if (state.plate.length === 0) return false;

    if (state.currentStage === 1) {
      const target = state.currentOrder.items[0];
      return (
        state.plate.length === 1 &&
        target &&
        state.plate[0] === target.id &&
        target.qty === 1
      );
    }

    if (state.currentStage === 2) {
      const target = state.currentOrder.items[0];
      if (!target) return false;
      const keys = Object.keys(counts);
      return keys.length === 1 && counts[target.id] === target.qty;
    }

    if (state.currentStage === 3 || state.currentStage === 4) {
      const target = state.currentOrder.items[0];
      if (!target) return false;
      const targetFruit = FRUITS.find((fruit) => fruit.id === target.id);
      if (!targetFruit) return false;
      const total = state.plate.reduce((sum, id) => {
        const fruit = FRUITS.find((item) => item.id === id);
        return sum + (fruit ? fruit.length : 0);
      }, 0);
      const hasTarget = state.plate.includes(target.id);
      const requiredLength = targetFruit.length * target.qty;
      return total === requiredLength && !hasTarget;
    }
    return false;
  }

  function showResult(success) {
    if (!dom.resultOverlay || !dom.resultText || !dom.resultButton) return;
    if (success) {
      dom.resultText.textContent = "서빙 성공!";
    } else if (state.currentStage === 3 || state.currentStage === 4) {
      const target = state.currentOrder.items && state.currentOrder.items[0];
      const usedTarget = target ? state.plate.includes(target.id) : false;
      dom.resultText.textContent = usedTarget
        ? "해당 과일과 같은 길이의 다른 과일을 조합해봅시다."
        : "다시 해볼까요?";
    } else {
      dom.resultText.textContent = "다시 해볼까요?";
    }
    dom.resultButton.textContent = success ? "다음 주문" : "다시 하기";
    dom.resultOverlay.classList.add("active");
    dom.resultOverlay.setAttribute("aria-hidden", "false");
    dom.resultOverlay.style.display = "flex";
    dom.resultOverlay.querySelector(".result-card")?.classList.remove("stage");
    if (dom.retryButton) dom.retryButton.style.display = "none";
    if (dom.homeOverlayButton) dom.homeOverlayButton.style.display = "none";
  }

  function showStageComplete() {
    if (!dom.resultOverlay || !dom.resultText || !dom.resultButton) return;
    dom.resultText.textContent = `${state.currentStage}단계 완료!`;
    dom.resultButton.textContent = "다음 단계";
    dom.resultOverlay.classList.add("active");
    dom.resultOverlay.setAttribute("aria-hidden", "false");
    dom.resultOverlay.style.display = "flex";
    dom.resultOverlay.querySelector(".result-card")?.classList.add("stage");
    if (dom.retryButton) dom.retryButton.style.display = "block";
    if (dom.homeOverlayButton) dom.homeOverlayButton.style.display = "block";
    stopStageTimer();
  }

  function showStartPrompt() {
    if (!dom.resultOverlay || !dom.resultText || !dom.resultButton) return;
    dom.resultText.textContent = "재생 버튼을 누른 후 시작해봅시다.";
    dom.resultButton.textContent = "확인";
    dom.resultOverlay.classList.add("active");
    dom.resultOverlay.setAttribute("aria-hidden", "false");
    dom.resultOverlay.style.display = "flex";
    dom.resultOverlay.querySelector(".result-card")?.classList.remove("stage");
    if (dom.retryButton) dom.retryButton.style.display = "none";
    if (dom.homeOverlayButton) dom.homeOverlayButton.style.display = "none";
  }

  function hideResult() {
    if (!dom.resultOverlay) return;
    dom.resultOverlay.classList.remove("active");
    dom.resultOverlay.setAttribute("aria-hidden", "true");
    dom.resultOverlay.style.display = "none";
  }

  function bindCoreEvents() {
    if (dom.clockToggle) {
      dom.clockToggle.addEventListener("click", () => {
        if (!state.isStarted) {
          state.isStarted = true;
        }
        state.isPaused = !state.isPaused;
        updateClockToggle();
      });
    }

    if (dom.homeButton) {
      dom.homeButton.addEventListener("click", () => {
        showHome();
      });
    }

    dom.stageButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const stage = Number(button.dataset.stageButton || 1);
        const mode = button.dataset.mode === "rest" ? "rest" : "note";
        state.isRestMode = mode === "rest";
        if (dom.countingPanel) {
          dom.countingPanel.classList.toggle("rest", mode === "rest");
        }
        state.plate.splice(0, state.plate.length);
        renderPlateItems();
        renderNoteStickers();
        renderFruitBins();
        updateServeButton();
        startStage(stage);
        updateModeLabel();
        showGame();
      });
    });

  }

  function bindOverlayEvents() {
    document.addEventListener("click", (event) => {
      if (event.target && event.target.id === "serve-button") {
        const success = validateOrder();
        showResult(success);
      }
      if (event.target && event.target.id === "clear-button") {
        state.plate.splice(0, state.plate.length);
        renderPlateItems();
        renderNoteStickers();
        updateServeButton();
      }
    });

    if (dom.resultButton) {
      dom.resultButton.addEventListener("click", () => {
        const wasSuccess = dom.resultText && dom.resultText.textContent.includes("성공");
        const wasStage = dom.resultText && dom.resultText.textContent.includes("Stage");
        hideResult();
        if (wasStage) {
          advanceStage();
          return;
        }
        if (wasSuccess) {
          state.plate.splice(0, state.plate.length);
          renderPlateItems();
          renderNoteStickers();
          updateServeButton();
          nextOrder();
        }
      });
    }

    if (dom.retryButton) {
      dom.retryButton.addEventListener("click", () => {
        hideResult();
        state.plate.splice(0, state.plate.length);
        renderPlateItems();
        renderNoteStickers();
        updateServeButton();
        nextOrder();
        startStageTimer();
      });
    }

    if (dom.homeOverlayButton) {
      dom.homeOverlayButton.addEventListener("click", () => {
        if (dom.resultOverlay) {
          dom.resultOverlay.classList.remove("active");
          dom.resultOverlay.setAttribute("aria-hidden", "true");
          dom.resultOverlay.style.display = "none";
          dom.resultOverlay.querySelector(".result-card")?.classList.remove("stage");
        }
        showHome();
      });
    }
  }

  function init() {
    cacheDom();
    renderToppings();
    renderFruitBins();
    renderNoteStickers();
    updateTimerUI();
    updateClockToggle();
    initAssetImages();
    bindCoreEvents();
    renderHomeBubbles();
    updateServeButton();
    state.isStarted = false;
    startStage(1);
    updateModeLabel();
    showHome();
    bindOverlayEvents();
  }

  init();
})();
