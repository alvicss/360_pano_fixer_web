const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"];

const defaultSettings = Object.freeze({
  non2to1Action: "crop",
  ratioTolerance: 0.01,
  cropAnchorX: 50,
  cropAnchorY: 50,
  filenameSuffix: "_360",
  jpegQuality: 95,
  backgroundColor: "#FFFFFF",
  projectionType: "equirectangular",
  usePanoramaViewer: true,
  sourcePhotosCount: 1,
});

const state = {
  queue: [],
  results: [],
  selectedResultId: null,
  isProcessing: false,
};

const els = {
  fileInput: document.querySelector("#file-input"),
  processButton: document.querySelector("#process-button"),
  resetButton: document.querySelector("#reset-button"),
  clearButton: document.querySelector("#clear-button"),
  downloadAllButton: document.querySelector("#download-all-button"),
  dropzone: document.querySelector("#dropzone"),
  queueSummary: document.querySelector("#queue-summary"),
  fileList: document.querySelector("#file-list"),
  resultsList: document.querySelector("#results-list"),
  statusBanner: document.querySelector("#status-banner"),
  previewEmpty: document.querySelector("#preview-empty"),
  previewCard: document.querySelector("#preview-card"),
  previewImage: document.querySelector("#preview-image"),
  previewCaption: document.querySelector("#preview-caption"),
  non2to1Action: document.querySelector("#non-2to1-action"),
  ratioTolerance: document.querySelector("#ratio-tolerance"),
  cropAnchorX: document.querySelector("#crop-anchor-x"),
  cropAnchorY: document.querySelector("#crop-anchor-y"),
  filenameSuffix: document.querySelector("#filename-suffix"),
  jpegQuality: document.querySelector("#jpeg-quality"),
  backgroundColor: document.querySelector("#background-color"),
  projectionType: document.querySelector("#projection-type"),
  usePanoramaViewer: document.querySelector("#use-panorama-viewer"),
  sourcePhotosCount: document.querySelector("#source-photos-count"),
};

bindEvents();
renderQueue();
renderResults();
resetSettingsForm();

function bindEvents() {
  els.fileInput.addEventListener("change", (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  });

  els.processButton.addEventListener("click", () => {
    if (!state.isProcessing) {
      processQueue().catch((error) => {
        console.error(error);
        setStatus(`處理中斷：${error.message}`, "error");
        state.isProcessing = false;
        updateProcessingState();
      });
    }
  });

  els.resetButton.addEventListener("click", () => {
    resetSettingsForm();
    setStatus("已還原預設值", "idle");
  });

  els.clearButton.addEventListener("click", () => {
    clearPreview();
    cleanupResults();
    state.queue = [];
    state.results = [];
    state.selectedResultId = null;
    renderQueue();
    renderResults();
    setStatus("已清空清單", "idle");
  });

  els.downloadAllButton.addEventListener("click", () => {
    downloadAllSuccess();
  });

  ["dragenter", "dragover"].forEach((type) => {
    els.dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      els.dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((type) => {
    els.dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      els.dropzone.classList.remove("dragover");
    });
  });

  els.dropzone.addEventListener("drop", (event) => {
    addFiles(event.dataTransfer?.files ?? []);
  });

  els.dropzone.addEventListener("click", () => {
    els.fileInput.click();
  });

  els.dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      els.fileInput.click();
    }
  });
}

function resetSettingsForm() {
  els.non2to1Action.value = defaultSettings.non2to1Action;
  els.ratioTolerance.value = String(defaultSettings.ratioTolerance);
  els.cropAnchorX.value = String(defaultSettings.cropAnchorX);
  els.cropAnchorY.value = String(defaultSettings.cropAnchorY);
  els.filenameSuffix.value = defaultSettings.filenameSuffix;
  els.jpegQuality.value = String(defaultSettings.jpegQuality);
  els.backgroundColor.value = defaultSettings.backgroundColor;
  els.projectionType.value = defaultSettings.projectionType;
  els.usePanoramaViewer.checked = defaultSettings.usePanoramaViewer;
  els.sourcePhotosCount.value = String(defaultSettings.sourcePhotosCount);
}

function addFiles(fileList) {
  const incomingFiles = Array.from(fileList ?? []);
  if (!incomingFiles.length) {
    return;
  }

  const existingKeys = new Set(state.queue.map((item) => item.key));
  let addedCount = 0;
  let skippedCount = 0;

  for (const file of incomingFiles) {
    const extension = getExtension(file.name);
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      skippedCount += 1;
      continue;
    }

    const key = [file.name, file.size, file.lastModified].join("::");
    if (existingKeys.has(key)) {
      skippedCount += 1;
      continue;
    }

    state.queue.push({
      id: createId(),
      key,
      file,
      status: "pending",
    });
    existingKeys.add(key);
    addedCount += 1;
  }

  renderQueue();
  if (addedCount > 0) {
    setStatus(`已加入 ${addedCount} 張圖片`, "idle");
  } else if (skippedCount > 0) {
    setStatus("沒有新增檔案，可能是格式不支援或已在清單內", "error");
  }
}

function renderQueue() {
  if (!state.queue.length) {
    els.queueSummary.textContent = "尚未加入任何圖片";
    els.fileList.innerHTML = "";
    return;
  }

  const totalBytes = state.queue.reduce((sum, item) => sum + item.file.size, 0);
  els.queueSummary.textContent = `共 ${state.queue.length} 張圖片，總大小 ${formatBytes(totalBytes)}`;
  els.fileList.innerHTML = state.queue.map(renderQueueItem).join("");
}

function renderQueueItem(item) {
  return `
    <article class="file-card">
      <div class="file-card-header">
        <p class="file-name">${escapeHtml(item.file.name)}</p>
        <span class="pill ${statusClass(item.status)}">${statusLabel(item.status)}</span>
      </div>
      <div class="meta-line">${formatBytes(item.file.size)} | ${item.file.type || "未知類型"}</div>
    </article>
  `;
}

function renderResults() {
  if (!state.results.length) {
    els.resultsList.innerHTML = "";
    return;
  }

  els.resultsList.innerHTML = state.results.map((result) => renderResultItem(result)).join("");
  for (const card of els.resultsList.querySelectorAll("[data-result-id]")) {
    card.addEventListener("click", () => {
      const result = state.results.find((item) => item.id === card.dataset.resultId);
      if (!result) {
        return;
      }
      state.selectedResultId = result.id;
      renderResults();
      showPreview(result);
    });
  }

  for (const button of els.resultsList.querySelectorAll("[data-download-id]")) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const result = state.results.find((item) => item.id === button.dataset.downloadId);
      if (result && result.status === "success") {
        triggerDownload(result.downloadUrl, result.outputName);
      }
    });
  }
}

function renderResultItem(result) {
  const isSelected = result.id === state.selectedResultId;
  const actions = result.status === "success"
    ? `<div class="result-actions"><button class="result-action" type="button" data-download-id="${result.id}">下載 JPG</button></div>`
    : "";
  const detailText = result.status === "success"
    ? `${result.width} x ${result.height} | ${result.wasCropped ? "有裁切" : "未裁切"} | ${result.convertedToJpeg ? "已轉 JPG" : "原本就是 JPG"}`
    : result.errorMessage;

  return `
    <article class="result-card ${isSelected ? "is-selected" : ""}" data-result-id="${result.id}">
      <div class="result-card-header">
        <p class="result-name">${escapeHtml(result.outputName || result.inputName)}</p>
        <span class="pill ${statusClass(result.status)}">${statusLabel(result.status)}</span>
      </div>
      <div class="meta-line">${escapeHtml(detailText)}</div>
      ${actions}
    </article>
  `;
}

async function processQueue() {
  if (!state.queue.length) {
    setStatus("請先加入至少一張圖片", "error");
    return;
  }

  const settings = collectSettings();
  clearPreview();
  cleanupResults();
  state.results = [];
  state.selectedResultId = null;
  for (const item of state.queue) {
    item.status = "pending";
  }
  renderQueue();
  renderResults();
  state.isProcessing = true;
  updateProcessingState();
  setStatus(`開始處理 ${state.queue.length} 張圖片`, "processing");

  for (const item of state.queue) {
    item.status = "processing";
    renderQueue();
    await nextFrame();

    try {
      const result = await processFile(item.file, settings);
      item.status = "success";
      state.results.push(result);
      setStatus(`已完成 ${result.outputName}`, "processing");
    } catch (error) {
      item.status = "error";
      state.results.push({
        id: createId(),
        inputName: item.file.name,
        outputName: "",
        width: 0,
        height: 0,
        wasCropped: false,
        convertedToJpeg: false,
        status: "error",
        errorMessage: error.message,
        downloadUrl: "",
        previewUrl: "",
      });
      setStatus(`失敗：${item.file.name}`, "processing");
    }

    renderQueue();
    renderResults();
    await pause(20);
  }

  state.isProcessing = false;
  updateProcessingState();
  const successCount = state.results.filter((item) => item.status === "success").length;
  const errorCount = state.results.length - successCount;
  setStatus(`全部完成：成功 ${successCount}，失敗 ${errorCount}`, errorCount ? "error" : "success");

  const firstSuccess = state.results.find((item) => item.status === "success");
  if (firstSuccess) {
    state.selectedResultId = firstSuccess.id;
    renderResults();
    showPreview(firstSuccess);
  }
}

function collectSettings() {
  const ratioTolerance = parseNumber(els.ratioTolerance.value, "比例容差", { min: 0 });
  const cropAnchorX = parseNumber(els.cropAnchorX.value, "裁切保留位置 X (%)", { min: 0, max: 100 });
  const cropAnchorY = parseNumber(els.cropAnchorY.value, "裁切保留位置 Y (%)", { min: 0, max: 100 });
  const jpegQuality = parseInteger(els.jpegQuality.value, "JPEG 品質", { min: 1, max: 100 });
  const sourcePhotosCount = parseInteger(els.sourcePhotosCount.value, "SourcePhotosCount", { min: 1 });
  const backgroundColor = normalizeHexColor(els.backgroundColor.value);

  return {
    non2to1Action: els.non2to1Action.value,
    ratioTolerance,
    cropAnchorX,
    cropAnchorY,
    filenameSuffix: els.filenameSuffix.value || defaultSettings.filenameSuffix,
    jpegQuality,
    backgroundColor,
    projectionType: els.projectionType.value.trim() || defaultSettings.projectionType,
    usePanoramaViewer: els.usePanoramaViewer.checked,
    sourcePhotosCount,
  };
}

async function processFile(file, settings) {
  const sourceImage = await loadImageFromFile(file);
  const originalWidth = sourceImage.naturalWidth;
  const originalHeight = sourceImage.naturalHeight;
  if (!originalWidth || !originalHeight) {
    throw new Error("無法讀取圖片尺寸");
  }

  const ratio = originalWidth / originalHeight;
  const near2to1 = Math.abs(ratio - 2) <= settings.ratioTolerance;

  let cropBox = { sx: 0, sy: 0, sw: originalWidth, sh: originalHeight };
  let outputWidth = originalWidth;
  let outputHeight = originalHeight;
  let wasCropped = false;

  if (!near2to1) {
    if (settings.non2to1Action === "skip") {
      throw new Error("圖片比例不是 2:1，已依設定跳過");
    }

    if (settings.non2to1Action === "crop") {
      cropBox = calculateCropBox(originalWidth, originalHeight, settings.cropAnchorX, settings.cropAnchorY);
      outputWidth = cropBox.sw;
      outputHeight = cropBox.sh;
      wasCropped = true;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = settings.backgroundColor;
  ctx.fillRect(0, 0, outputWidth, outputHeight);
  ctx.drawImage(
    sourceImage,
    cropBox.sx,
    cropBox.sy,
    cropBox.sw,
    cropBox.sh,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const jpegBlob = await canvasToJpegBlob(canvas, settings.jpegQuality);
  const jpegBuffer = await blobToArrayBuffer(jpegBlob);
  const xmpString = buildGpanoXmp(settings, outputWidth, outputHeight);
  const finalBytes = insertXmpIntoJpeg(jpegBuffer, xmpString);
  const finalBlob = new Blob([finalBytes], { type: "image/jpeg" });
  const downloadUrl = URL.createObjectURL(finalBlob);
  const previewUrl = URL.createObjectURL(finalBlob);

  return {
    id: createId(),
    inputName: file.name,
    outputName: buildOutputName(file.name, settings.filenameSuffix),
    width: outputWidth,
    height: outputHeight,
    wasCropped,
    convertedToJpeg: getExtension(file.name) !== ".jpg" && getExtension(file.name) !== ".jpeg",
    status: "success",
    errorMessage: "",
    downloadUrl,
    previewUrl,
  };
}

function calculateCropBox(width, height, anchorX, anchorY) {
  const ratio = width / height;
  if (Math.abs(ratio - 2) < 1e-9) {
    return { sx: 0, sy: 0, sw: width, sh: height };
  }

  if (ratio > 2) {
    const newWidth = height * 2;
    const available = Math.max(width - newWidth, 0);
    const sx = Math.round(available * clamp(anchorX, 0, 100) / 100);
    return { sx, sy: 0, sw: newWidth, sh: height };
  }

  const newHeight = Math.floor(width / 2);
  const available = Math.max(height - newHeight, 0);
  const sy = Math.round(available * clamp(anchorY, 0, 100) / 100);
  return { sx: 0, sy, sw: width, sh: newHeight };
}

function buildGpanoXmp(settings, width, height) {
  const tags = [
    ["ProjectionType", escapeXml(settings.projectionType)],
    ["UsePanoramaViewer", settings.usePanoramaViewer ? "True" : "False"],
    ["CroppedAreaImageWidthPixels", String(width)],
    ["CroppedAreaImageHeightPixels", String(height)],
    ["FullPanoWidthPixels", String(width)],
    ["FullPanoHeightPixels", String(height)],
    ["CroppedAreaLeftPixels", "0"],
    ["CroppedAreaTopPixels", "0"],
    ["LargestValidInteriorRectLeft", "0"],
    ["LargestValidInteriorRectTop", "0"],
    ["LargestValidInteriorRectWidth", String(width)],
    ["LargestValidInteriorRectHeight", String(height)],
    ["SourcePhotosCount", String(settings.sourcePhotosCount)],
  ];

  const tagLines = tags.map(([name, value]) => `   <GPano:${name}>${value}</GPano:${name}>`).join("\n");
  return [
    "<?xpacket begin=\"\ufeff\" id=\"W5M0MpCehiHzreSzNTczkc9d\"?>",
    "<x:xmpmeta xmlns:x=\"adobe:ns:meta/\" x:xmptk=\"Adobe XMP Core 5.6-c011\">",
    " <rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">",
    "  <rdf:Description rdf:about=\"\"",
    "    xmlns:GPano=\"http://ns.google.com/photos/1.0/panorama/\">",
    tagLines,
    "  </rdf:Description>",
    " </rdf:RDF>",
    "</x:xmpmeta>",
    "<?xpacket end=\"w\"?>",
  ].join("\n");
}

function insertXmpIntoJpeg(jpegBuffer, xmpString) {
  const jpegBytes = new Uint8Array(jpegBuffer);
  if (jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    throw new Error("不是合法的 JPEG 檔案");
  }

  const headerBytes = new TextEncoder().encode("http://ns.adobe.com/xap/1.0/\0");
  const xmpPayload = new TextEncoder().encode(xmpString);
  const app1Payload = concatUint8Arrays(headerBytes, xmpPayload);
  const segmentLength = app1Payload.length + 2;
  if (segmentLength > 65535) {
    throw new Error("XMP 資料太大，超過單一 JPEG segment 上限");
  }

  const app1Segment = new Uint8Array(4 + app1Payload.length);
  app1Segment[0] = 0xff;
  app1Segment[1] = 0xe1;
  app1Segment[2] = (segmentLength >> 8) & 0xff;
  app1Segment[3] = segmentLength & 0xff;
  app1Segment.set(app1Payload, 4);

  const output = new Uint8Array(2 + app1Segment.length + (jpegBytes.length - 2));
  output.set(jpegBytes.slice(0, 2), 0);
  output.set(app1Segment, 2);
  output.set(jpegBytes.slice(2), 2 + app1Segment.length);
  return output;
}

function showPreview(result) {
  if (result.status !== "success") {
    clearPreview();
    return;
  }

  els.previewEmpty.classList.add("hidden");
  els.previewCard.classList.remove("hidden");
  els.previewImage.src = result.previewUrl;
  els.previewCaption.textContent = `${result.outputName} | ${result.width} x ${result.height}`;
}

function clearPreview() {
  els.previewCard.classList.add("hidden");
  els.previewEmpty.classList.remove("hidden");
  els.previewImage.removeAttribute("src");
  els.previewCaption.textContent = "";
}

function cleanupResults() {
  for (const result of state.results) {
    if (result.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    if (result.previewUrl && result.previewUrl !== result.downloadUrl) {
      URL.revokeObjectURL(result.previewUrl);
    }
  }
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setStatus(message, tone) {
  els.statusBanner.textContent = message;
  els.statusBanner.className = "status-banner";
  if (tone === "success") {
    els.statusBanner.classList.add("pill-success");
  } else if (tone === "error") {
    els.statusBanner.classList.add("pill-error");
  } else if (tone === "processing") {
    els.statusBanner.classList.add("pill-processing");
  }
}

function updateProcessingState() {
  els.processButton.disabled = state.isProcessing;
  els.processButton.textContent = state.isProcessing ? "處理中..." : "開始處理";
}

function downloadAllSuccess() {
  const successItems = state.results.filter((item) => item.status === "success");
  if (!successItems.length) {
    setStatus("目前沒有可下載的成功檔案", "error");
    return;
  }

  successItems.forEach((item, index) => {
    window.setTimeout(() => {
      triggerDownload(item.downloadUrl, item.outputName);
    }, index * 180);
  });
  setStatus(`已觸發 ${successItems.length} 個下載`, "success");
}

function triggerDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

function buildOutputName(name, suffix) {
  const lastDot = name.lastIndexOf(".");
  const stem = lastDot > 0 ? name.slice(0, lastDot) : name;
  return `${stem}${suffix}.jpg`;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("無法載入圖片"));
    };
    image.src = objectUrl;
  });
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("無法輸出 JPEG"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      clamp(quality, 1, 100) / 100,
    );
  });
}

function blobToArrayBuffer(blob) {
  return blob.arrayBuffer();
}

function parseNumber(rawValue, label, { min = -Infinity, max = Infinity } = {}) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    throw new Error(`${label} 必須是數字`);
  }
  if (value < min || value > max) {
    throw new Error(`${label} 必須介於 ${formatBound(min)} 到 ${formatBound(max)}`);
  }
  return value;
}

function parseInteger(rawValue, label, { min = -Infinity, max = Infinity } = {}) {
  const value = Number(rawValue);
  if (!Number.isInteger(value)) {
    throw new Error(`${label} 必須是整數`);
  }
  if (value < min || value > max) {
    throw new Error(`${label} 必須介於 ${formatBound(min)} 到 ${formatBound(max)}`);
  }
  return value;
}

function normalizeHexColor(value) {
  const raw = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) {
    return raw.toUpperCase();
  }
  throw new Error("透明背景補色格式無效，請輸入像 #FFFFFF 這樣的色碼");
}

function formatBound(value) {
  if (value === Infinity) {
    return "無上限";
  }
  if (value === -Infinity) {
    return "無下限";
  }
  return String(value);
}

function getExtension(name) {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : "";
}

function statusLabel(status) {
  if (status === "processing") {
    return "處理中";
  }
  if (status === "success") {
    return "完成";
  }
  if (status === "error") {
    return "失敗";
  }
  return "待處理";
}

function statusClass(status) {
  if (status === "processing") {
    return "pill-processing";
  }
  if (status === "success") {
    return "pill-success";
  }
  if (status === "error") {
    return "pill-error";
  }
  return "pill-pending";
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function concatUint8Arrays(first, second) {
  const combined = new Uint8Array(first.length + second.length);
  combined.set(first, 0);
  combined.set(second, first.length);
  return combined;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function pause(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
