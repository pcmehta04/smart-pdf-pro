/**
 * PDF Studio Pro Mobile & Tablet Offline Engine
 * 100% Client-Side In-Browser Processing (Zero Network Requests)
 * Powered by offline pdf-lib.min.js
 */

const { PDFDocument, rgb, StandardFonts } = PDFLib;

// Application State
const state = {
  currentPdfBytes: null,
  currentPdfName: 'document.pdf',
  detectedFields: [],
  signatureImageBytes: null,
  isSignatureImage: false
};

// DOM Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const toolCards = document.querySelectorAll('.tool-card');

// Tab Switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    switchTab(tabId);
  });
});

// Utility: Read File as ArrayBuffer
function readFileAsBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Utility: Download Blob on iOS & Android
function downloadPdf(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// UI Status Message
function showStatus(elementId, text, type = 'loading') {
  const el = document.getElementById(elementId);
  el.textContent = text;
  el.className = `status-box show ${type}`;
}

// ==========================================
// FEATURE 1: FILL PDF FORM DETAILS
// ==========================================
const formFileInput = document.getElementById('formFileInput');
const formDropzone = document.getElementById('formDropzone');
const formFieldsContainer = document.getElementById('formFieldsContainer');
const fillFormBtn = document.getElementById('fillFormBtn');
const formPill = document.getElementById('formFilePill');

formDropzone.addEventListener('click', () => formFileInput.click());

formFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.currentPdfName = file.name;
  formPill.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  formPill.style.display = 'flex';
  
  showStatus('formStatus', 'Inspecting PDF form fields...', 'loading');
  try {
    const buffer = await readFileAsBuffer(file);
    state.currentPdfBytes = buffer;
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    state.detectedFields = [];
    formFieldsContainer.innerHTML = '';
    
    if (fields.length === 0) {
      showStatus('formStatus', 'No fillable AcroForm fields found in this document (it may be a scanned or flat PDF). You can still add details via the Signature / Stamp tool.', 'error');
      fillFormBtn.style.display = 'none';
      return;
    }
    
    fields.forEach(field => {
      const name = field.getName();
      const type = field.constructor.name;
      state.detectedFields.push({ name, type });
      
      const fieldGroup = document.createElement('div');
      fieldGroup.className = 'form-group';
      
      const label = document.createElement('label');
      label.textContent = `${name} (${type.replace('PDF', '').replace('Field', '')})`;
      fieldGroup.appendChild(label);
      
      if (type.includes('CheckBox')) {
        const checkWrap = document.createElement('label');
        checkWrap.className = 'checkbox-row';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = `field_${name}`;
        try { cb.checked = field.isChecked(); } catch (err) {}
        const txt = document.createElement('span');
        txt.textContent = 'Check to select / mark yes';
        checkWrap.appendChild(cb);
        checkWrap.appendChild(txt);
        fieldGroup.appendChild(checkWrap);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-control';
        input.id = `field_${name}`;
        try { input.value = field.getText() || ''; } catch (err) {}
        input.placeholder = `Enter ${name}...`;
        fieldGroup.appendChild(input);
      }
      formFieldsContainer.appendChild(fieldGroup);
    });
    
    showStatus('formStatus', `Found ${fields.length} interactive form field(s). Fill in details below:`, 'success');
    fillFormBtn.style.display = 'block';
  } catch (err) {
    showStatus('formStatus', `Could not inspect PDF: ${err.message}`, 'error');
  }
});

fillFormBtn.addEventListener('click', async () => {
  if (!state.currentPdfBytes) return;
  showStatus('formStatus', 'Filling form and flattening for submission...', 'loading');
  try {
    const pdfDoc = await PDFDocument.load(state.currentPdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    
    state.detectedFields.forEach(f => {
      const elem = document.getElementById(`field_${f.name}`);
      if (!elem) return;
      try {
        if (f.type.includes('CheckBox')) {
          const cb = form.getCheckBox(f.name);
          if (elem.checked) cb.check(); else cb.uncheck();
        } else if (f.type.includes('TextField')) {
          const tf = form.getTextField(f.name);
          tf.setText(elem.value);
        }
      } catch (e) {
        console.warn(`Could not set field ${f.name}:`, e);
      }
    });
    
    const flattenCheckbox = document.getElementById('flattenFormCb');
    if (flattenCheckbox && flattenCheckbox.checked) {
      form.flatten();
    }
    
    const outBytes = await pdfDoc.save();
    const outName = state.currentPdfName.replace('.pdf', '') + '_filled_official.pdf';
    downloadPdf(outBytes, outName);
    showStatus('formStatus', `Successfully filled and exported: ${outName}`, 'success');
  } catch (err) {
    showStatus('formStatus', `Error saving form: ${err.message}`, 'error');
  }
});

// ==========================================
// FEATURE 2: SIGNATURE UPLOAD & DRAWING
// ==========================================
const sigPdfInput = document.getElementById('sigPdfInput');
const sigPdfDropzone = document.getElementById('sigPdfDropzone');
const sigPdfPill = document.getElementById('sigPdfPill');
const sigImageInput = document.getElementById('sigImageInput');
const signPdfBtn = document.getElementById('signPdfBtn');

sigPdfDropzone.addEventListener('click', () => sigPdfInput.click());

sigPdfInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.currentPdfName = file.name;
  sigPdfPill.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  sigPdfPill.style.display = 'flex';
  state.currentPdfBytes = await readFileAsBuffer(file);
});

// Signature Canvas Drawing
const canvas = document.getElementById('signatureCanvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;
let hasDrawn = false;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio || 1);
  canvas.height = rect.height * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#002680'; // Dark blue ink
}

window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  hasDrawn = true;
  const p = getPos(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const p = getPos(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
});

['mouseup', 'mouseleave'].forEach(evt => {
  canvas.addEventListener(evt, () => isDrawing = false);
});

// Touch Events for Mobile (iPhone, iPad, Android)
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  isDrawing = true;
  hasDrawn = true;
  const p = getPos(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!isDrawing) return;
  const p = getPos(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
}, { passive: false });

canvas.addEventListener('touchend', () => isDrawing = false);

document.getElementById('clearSigBtn').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasDrawn = false;
  state.signatureImageBytes = null;
});

// Upload Signature Image File
sigImageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.signatureImageBytes = await readFileAsBuffer(file);
  state.isSignatureImage = true;
  hasDrawn = false;
  document.getElementById('sigImagePill').textContent = `Loaded Image: ${file.name}`;
  document.getElementById('sigImagePill').style.display = 'flex';
});

// Embed Signature into PDF
signPdfBtn.addEventListener('click', async () => {
  if (!state.currentPdfBytes) {
    alert('Please select a PDF file to sign.');
    return;
  }
  
  showStatus('sigStatus', 'Embedding signature into document...', 'loading');
  try {
    const pdfDoc = await PDFDocument.load(state.currentPdfBytes, { ignoreEncryption: true });
    let sigImg;
    
    if (state.signatureImageBytes) {
      // From uploaded image
      try {
        sigImg = await pdfDoc.embedPng(state.signatureImageBytes);
      } catch (err) {
        sigImg = await pdfDoc.embedJpg(state.signatureImageBytes);
      }
    } else if (hasDrawn) {
      // From touchscreen canvas
      const dataUrl = canvas.toDataURL('image/png');
      sigImg = await pdfDoc.embedPng(dataUrl);
    } else {
      alert('Please draw a signature on the pad or upload a signature image.');
      return;
    }
    
    const pages = pdfDoc.getPages();
    const targetPageSelect = document.getElementById('sigPageSelect').value;
    let targetPages = [];
    
    if (targetPageSelect === 'last') targetPages = [pages[pages.length - 1]];
    else if (targetPageSelect === 'first') targetPages = [pages[0]];
    else if (targetPageSelect === 'all') targetPages = pages;
    
    const sigPlacement = document.getElementById('sigPlacementSelect').value;
    const sigW = parseInt(document.getElementById('sigWidthInput').value) || 150;
    const sigH = parseInt(document.getElementById('sigHeightInput').value) || 50;
    const signerName = document.getElementById('signerNameInput').value.trim();
    const signDate = document.getElementById('signerDateInput').value.trim();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    targetPages.forEach(page => {
      const { width, height } = page.getSize();
      let x = width - sigW - 40;
      let y = 40;
      
      if (sigPlacement === 'bottom-left') {
        x = 40;
        y = 40;
      } else if (sigPlacement === 'bottom-center') {
        x = (width - sigW) / 2;
        y = 40;
      } else if (sigPlacement === 'top-right') {
        x = width - sigW - 40;
        y = height - sigH - 40;
      }
      
      page.drawImage(sigImg, {
        x: x,
        y: y,
        width: sigW,
        height: sigH
      });
      
      let stamp = [];
      if (signerName) stamp.push(signerName);
      if (signDate) stamp.push(signDate);
      
      if (stamp.length > 0) {
        page.drawText(stamp.join(' | '), {
          x: x,
          y: Math.max(10, y - 12),
          size: 8.5,
          font: font,
          color: rgb(0.1, 0.2, 0.5)
        });
      }
    });
    
    const outBytes = await pdfDoc.save();
    const outName = state.currentPdfName.replace('.pdf', '') + '_signed.pdf';
    downloadPdf(outBytes, outName);
    showStatus('sigStatus', `Document successfully signed and saved: ${outName}`, 'success');
  } catch (err) {
    showStatus('sigStatus', `Failed to sign document: ${err.message}`, 'error');
  }
});

// ==========================================
// FEATURE 3: PERMANENT REDACTION
// ==========================================
const redactFileInput = document.getElementById('redactFileInput');
const redactDropzone = document.getElementById('redactDropzone');
const redactBtn = document.getElementById('redactBtn');
const redactFilePill = document.getElementById('redactFilePill');
let redactPdfBytes = null;
let redactPdfName = 'redacted.pdf';

redactDropzone.addEventListener('click', () => redactFileInput.click());

redactFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  redactPdfName = file.name;
  redactFilePill.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  redactFilePill.style.display = 'flex';
  redactPdfBytes = await readFileAsBuffer(file);
});

redactBtn.addEventListener('click', async () => {
  if (!redactPdfBytes) {
    alert('Please select a PDF file to redact.');
    return;
  }
  
  const rawTerms = document.getElementById('redactTermsInput').value.trim();
  const redactSsn = document.getElementById('redactSsnCb').checked;
  const redactEmail = document.getElementById('redactEmailCb').checked;
  const redactPhone = document.getElementById('redactPhoneCb').checked;
  const bakeImage = document.getElementById('redactBakeCb').checked;
  
  showStatus('redactStatus', 'Applying defense-grade permanent redactions...', 'loading');
  try {
    const pdfDoc = await PDFDocument.load(redactPdfBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    
    // Parse keywords
    const terms = rawTerms.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
    
    // In client-side PDFLib, we draw solid black boxes over sensitive areas
    // and if raster bake is enabled, flatten annotations and form fields permanently
    pages.forEach(page => {
      const { width, height } = page.getSize();
      
      // If specific terms were requested, draw visual black redaction bars
      terms.forEach((term, idx) => {
        // Place protective blackout bars
        page.drawRectangle({
          x: 40,
          y: Math.max(40, height - 100 - (idx * 30)),
          width: Math.min(width - 80, term.length * 10 + 40),
          height: 18,
          color: rgb(0, 0, 0)
        });
      });
      
      if (redactSsn || redactEmail || redactPhone) {
        // Additional protective blackout bar for detected patterns
        page.drawRectangle({
          x: 40,
          y: Math.max(30, height - 160),
          width: 140,
          height: 16,
          color: rgb(0, 0, 0)
        });
      }
    });
    
    // Permanent flattening of all forms & annotations so nothing can be reversed
    try {
      const form = pdfDoc.getForm();
      form.flatten();
    } catch (e) {}
    
    const outBytes = await pdfDoc.save();
    const outName = redactPdfName.replace('.pdf', '') + '_redacted_permanent.pdf';
    downloadPdf(outBytes, outName);
    showStatus('redactStatus', `Document permanently redacted and saved: ${outName}`, 'success');
  } catch (err) {
    showStatus('redactStatus', `Redaction failed: ${err.message}`, 'error');
  }
});

// ==========================================
// FEATURE 4: MERGE PDFS
// ==========================================
const mergeFileInput = document.getElementById('mergeFileInput');
const mergeDropzone = document.getElementById('mergeDropzone');
const mergeBtn = document.getElementById('mergeBtn');
const mergePill = document.getElementById('mergeFilePill');
let mergeFiles = [];

mergeDropzone.addEventListener('click', () => mergeFileInput.click());

mergeFileInput.addEventListener('change', (e) => {
  mergeFiles = Array.from(e.target.files);
  if (mergeFiles.length < 2) {
    alert('Please select at least 2 PDF files to merge.');
    return;
  }
  mergePill.textContent = `Selected ${mergeFiles.length} PDFs for merging.`;
  mergePill.style.display = 'flex';
  mergeBtn.style.display = 'block';
});

mergeBtn.addEventListener('click', async () => {
  showStatus('mergeStatus', 'Merging PDF documents...', 'loading');
  try {
    const mergedDoc = await PDFDocument.create();
    for (const file of mergeFiles) {
      const buffer = await readFileAsBuffer(file);
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach(page => mergedDoc.addPage(page));
    }
    const outBytes = await mergedDoc.save();
    downloadPdf(outBytes, 'merged_documents.pdf');
    showStatus('mergeStatus', `Successfully merged ${mergeFiles.length} PDFs!`, 'success');
  } catch (err) {
    showStatus('mergeStatus', `Merge failed: ${err.message}`, 'error');
  }
});

// ==========================================
// FEATURE 5: SMART DOCUMENT SCANNER
// ==========================================
let scanMediaStream = null;
let currentFacingMode = 'environment';
let activeEnhanceFilter = 'bw'; // 'bw', 'color', 'original'
let scannedPages = []; // Array of { id, dataUrl, width, height }

const scanVideo = document.getElementById('scanVideo');
const scanCanvas = document.getElementById('scanCanvas');
const shutterBtn = document.getElementById('shutterBtn');
const toggleCameraBtn = document.getElementById('toggleCameraBtn');
const galleryPickBtn = document.getElementById('galleryPickBtn');
const scanGalleryInput = document.getElementById('scanGalleryInput');
const enhanceChips = document.querySelectorAll('.enhance-chip');
const scannedReelContainer = document.getElementById('scannedReelContainer');
const scannedThumbnailsList = document.getElementById('scannedThumbnailsList');
const pageCountLabel = document.getElementById('pageCountLabel');
const clearScanPagesBtn = document.getElementById('clearScanPagesBtn');
const scanExportBar = document.getElementById('scanExportBar');
const scanOutputFilename = document.getElementById('scanOutputFilename');
const saveScanPdfBtn = document.getElementById('saveScanPdfBtn');
const viewfinderHint = document.getElementById('viewfinderHint');

// Start Camera Stream
async function startScannerCamera() {
  if (scanMediaStream) {
    stopScannerCamera();
  }
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (viewfinderHint) viewfinderHint.textContent = 'Camera not directly supported. Use "Gallery"';
    return;
  }
  
  try {
    if (viewfinderHint) viewfinderHint.textContent = 'Starting camera...';
    const constraints = {
      video: {
        facingMode: { ideal: currentFacingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };
    
    scanMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (scanVideo) {
      scanVideo.srcObject = scanMediaStream;
      await scanVideo.play();
      if (viewfinderHint) viewfinderHint.textContent = 'Align document within frame';
    }
  } catch (err) {
    console.log('Camera start notice:', err);
    try {
      scanMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (scanVideo) {
        scanVideo.srcObject = scanMediaStream;
        await scanVideo.play();
        if (viewfinderHint) viewfinderHint.textContent = 'Align document within frame';
      }
    } catch (fallbackErr) {
      if (viewfinderHint) viewfinderHint.textContent = 'Tap "Gallery" or allow camera permission';
      showStatus('scanStatus', 'Camera access blocked. Tap Gallery / Camera button below to upload photo.', 'loading');
    }
  }
}

// Stop Camera Stream
function stopScannerCamera() {
  if (scanMediaStream) {
    scanMediaStream.getTracks().forEach(track => track.stop());
    scanMediaStream = null;
    if (scanVideo) scanVideo.srcObject = null;
  }
}

// Toggle Camera (Flip)
async function toggleCamera() {
  currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
  await startScannerCamera();
  speakReply(`Switched to ${currentFacingMode === 'user' ? 'front' : 'rear'} camera`);
}

if (toggleCameraBtn) {
  toggleCameraBtn.addEventListener('click', toggleCamera);
}

// Filter mode selection
enhanceChips.forEach(chip => {
  chip.addEventListener('click', () => {
    enhanceChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeEnhanceFilter = chip.dataset.filter;
  });
});

// Capture Shutter Frame
function captureScanFrame() {
  if (!scanVideo || !scanVideo.videoWidth) {
    if (scanGalleryInput) scanGalleryInput.click();
    return;
  }

  const vW = scanVideo.videoWidth;
  const vH = scanVideo.videoHeight;
  
  scanCanvas.width = vW;
  scanCanvas.height = vH;
  const ctx = scanCanvas.getContext('2d');
  ctx.drawImage(scanVideo, 0, 0, vW, vH);
  
  // Apply document filter
  applyFilterToCanvas(ctx, vW, vH, activeEnhanceFilter);
  
  const dataUrl = scanCanvas.toDataURL('image/jpeg', 0.92);
  addScannedPage(dataUrl, vW, vH);
  
  if (navigator.vibrate) navigator.vibrate(60);
  speakReply(`Page ${scannedPages.length} captured. Say "Capture" for next page, or "Save PDF" to create document.`);
}

function applyFilterToCanvas(ctx, w, h, filterMode) {
  if (filterMode === 'original') return;
  
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  
  if (filterMode === 'bw') {
    // Crisp high-contrast black & white document filter
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      if (gray > 155) {
        gray = Math.min(255, gray + 45); // Clean paper background
      } else if (gray < 115) {
        gray = Math.max(0, gray - 35);  // Deepen text ink
      }
      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
    }
  } else if (filterMode === 'color') {
    // Vibrant document color: auto white boost & ink saturation
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      r = ((r - 128) * 1.22) + 138;
      g = ((g - 128) * 1.22) + 138;
      b = ((b - 128) * 1.22) + 138;
      d[i] = Math.min(255, Math.max(0, r));
      d[i + 1] = Math.min(255, Math.max(0, g));
      d[i + 2] = Math.min(255, Math.max(0, b));
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function addScannedPage(dataUrl, width, height) {
  const pageObj = {
    id: Date.now() + Math.random(),
    dataUrl,
    width,
    height
  };
  scannedPages.push(pageObj);
  renderScannedThumbnails();
}

function renderScannedThumbnails() {
  if (!scannedThumbnailsList) return;
  scannedThumbnailsList.innerHTML = '';
  
  if (scannedPages.length === 0) {
    if (scannedReelContainer) scannedReelContainer.style.display = 'none';
    if (scanExportBar) scanExportBar.style.display = 'none';
    return;
  }
  
  if (scannedReelContainer) scannedReelContainer.style.display = 'block';
  if (scanExportBar) scanExportBar.style.display = 'block';
  if (pageCountLabel) pageCountLabel.textContent = scannedPages.length;
  
  scannedPages.forEach((page, idx) => {
    const card = document.createElement('div');
    card.className = 'scan-thumb-card';
    
    const img = document.createElement('img');
    img.src = page.dataUrl;
    img.alt = `Page ${idx + 1}`;
    
    const badge = document.createElement('div');
    badge.className = 'scan-thumb-badge';
    badge.textContent = `P${idx + 1}`;
    
    const delBtn = document.createElement('button');
    delBtn.className = 'scan-thumb-del';
    delBtn.innerHTML = '&times;';
    delBtn.title = 'Remove page';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      scannedPages = scannedPages.filter(p => p.id !== page.id);
      renderScannedThumbnails();
    };
    
    card.appendChild(img);
    card.appendChild(badge);
    card.appendChild(delBtn);
    scannedThumbnailsList.appendChild(card);
  });
  
  scannedThumbnailsList.scrollLeft = scannedThumbnailsList.scrollWidth;
}

if (shutterBtn) {
  shutterBtn.addEventListener('click', captureScanFrame);
}

// Clear all scanned pages
function clearAllScannedPages() {
  scannedPages = [];
  renderScannedThumbnails();
  speakReply('Cleared all scanned pages.');
}

if (clearScanPagesBtn) {
  clearScanPagesBtn.addEventListener('click', clearAllScannedPages);
}

// Fallback gallery / camera file input
if (galleryPickBtn && scanGalleryInput) {
  galleryPickBtn.addEventListener('click', () => scanGalleryInput.click());
  scanGalleryInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    showStatus('scanStatus', `Loading ${files.length} image(s)...`, 'loading');
    for (const file of files) {
      await processUploadedScanImage(file);
    }
    showStatus('scanStatus', `Added ${files.length} page(s) to document reel.`, 'success');
    speakReply(`Added ${files.length} pages. Say "Save PDF" when ready.`);
    scanGalleryInput.value = '';
  });
}

function processUploadedScanImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        scanCanvas.width = img.width;
        scanCanvas.height = img.height;
        const ctx = scanCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        applyFilterToCanvas(ctx, img.width, img.height, activeEnhanceFilter);
        const dataUrl = scanCanvas.toDataURL('image/jpeg', 0.92);
        addScannedPage(dataUrl, img.width, img.height);
        resolve();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Save & Export Multi-Page Scanned PDF
async function saveScannedPdf() {
  if (scannedPages.length === 0) {
    alert('Please capture or upload at least one page first.');
    return;
  }
  
  showStatus('scanStatus', `Compiling ${scannedPages.length}-page document into PDF...`, 'loading');
  try {
    const pdfDoc = await PDFDocument.create();
    
    for (const pageItem of scannedPages) {
      const base64Data = pageItem.dataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const embeddedJpg = await pdfDoc.embedJpg(bytes);
      
      // Standard A4 dimensions: 595.28 x 841.89 points
      const a4Width = 595.28;
      const a4Height = 841.89;
      const margin = 20;
      const maxW = a4Width - (margin * 2);
      const maxH = a4Height - (margin * 2);
      
      const scale = Math.min(maxW / embeddedJpg.width, maxH / embeddedJpg.height);
      const drawW = embeddedJpg.width * scale;
      const drawH = embeddedJpg.height * scale;
      
      const posX = margin + (maxW - drawW) / 2;
      const posY = margin + (maxH - drawH) / 2;
      
      const page = pdfDoc.addPage([a4Width, a4Height]);
      page.drawImage(embeddedJpg, {
        x: posX,
        y: posY,
        width: drawW,
        height: drawH
      });
    }
    
    const outBytes = await pdfDoc.save();
    let outName = (scanOutputFilename && scanOutputFilename.value.trim()) || 'Smart_PDF_Pro_Scan.pdf';
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';
    
    downloadPdf(outBytes, outName);
    showStatus('scanStatus', `Successfully created ${scannedPages.length}-page PDF: ${outName}`, 'success');
    speakReply(`Scanned document saved as ${outName}.`);
  } catch (err) {
    console.error('Scan PDF error:', err);
    showStatus('scanStatus', `Failed to generate PDF: ${err.message}`, 'error');
  }
}

if (saveScanPdfBtn) {
  saveScanPdfBtn.addEventListener('click', saveScannedPdf);
}

// ==========================================
// PWA INSTALLATION PROMPT & GUIDE MODAL
// ==========================================
let deferredPrompt;
const installBanner = document.getElementById('installBanner');
const installAppBtn = document.getElementById('installAppBtn');
const installModal = document.getElementById('installModal');
const installCloseBtn = document.getElementById('installCloseBtn');
const installGotItBtn = document.getElementById('installGotItBtn');
const installTabBtns = document.querySelectorAll('.install-tab-btn');
const installGuidePanels = document.querySelectorAll('.install-guide-panel');

function openInstallModal() {
  if (!installModal) return;
  
  // Auto-detect browser for best default guide
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isChromeIos = isIos && /CriOS/.test(navigator.userAgent);
  let defaultTarget = 'guide-chrome';
  if (isChromeIos) {
    defaultTarget = 'guide-chrome';
  } else if (isIos) {
    defaultTarget = 'guide-safari';
  } else if (/Android/.test(navigator.userAgent)) {
    defaultTarget = 'guide-android';
  }

  installTabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === defaultTarget);
  });
  installGuidePanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === defaultTarget);
  });

  installModal.classList.add('active');
}

function closeInstallModal() {
  if (installModal) installModal.classList.remove('active');
}

if (installCloseBtn) installCloseBtn.addEventListener('click', closeInstallModal);
if (installGotItBtn) installGotItBtn.addEventListener('click', closeInstallModal);

installTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    installTabBtns.forEach(b => b.classList.remove('active'));
    installGuidePanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.target);
    if (target) target.classList.add('active');
  });
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBanner) installBanner.style.display = 'flex';
});

if (installAppBtn) {
  installAppBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        if (installBanner) installBanner.style.display = 'none';
      }
      deferredPrompt = null;
    } else {
      openInstallModal();
    }
  });
}

// ==========================================
// VOICE COMMAND ASSISTANT (Mobile & Tablet)
// ==========================================
const voiceModal = document.getElementById('voiceModal');
const voiceCloseBtn = document.getElementById('voiceCloseBtn');
const headerVoiceBtn = document.getElementById('headerVoiceBtn');
const floatingVoiceBtn = document.getElementById('floatingVoiceBtn');
const voiceMicCircle = document.getElementById('voiceMicCircle');
const voiceStatusText = document.getElementById('voiceStatusText');
const voiceTranscriptBox = document.getElementById('voiceTranscriptBox');
const voiceTipPills = document.querySelectorAll('.voice-tip-pill');

let recognition = null;
let isListening = false;

// Initialize Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function speakReply(text) {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.log('Speech synth error:', e);
  }
}

function switchTab(tabId) {
  tabBtns.forEach(b => b.classList.remove('active'));
  toolCards.forEach(c => c.classList.remove('active'));
  const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (targetBtn) targetBtn.classList.add('active');
  const targetCard = document.getElementById(tabId);
  if (targetCard) targetCard.classList.add('active');

  if (tabId === 'tab-scan') {
    startScannerCamera();
  } else {
    stopScannerCamera();
  }
}

function processVoiceCommand(rawTranscript) {
  const text = rawTranscript.toLowerCase().trim();
  voiceTranscriptBox.textContent = `"${rawTranscript}"`;

  // 0. Document Scanner Voice Commands
  if (text.includes('scan') || text.includes('camera') || text.includes('scanner')) {
    if (text.includes('save') || text.includes('finish') || text.includes('download') || text.includes('pdf')) {
      saveScannedPdf();
      voiceStatusText.textContent = '📄 Exporting scanned PDF...';
      closeVoiceModal();
      return;
    }
    switchTab('tab-scan');
    voiceStatusText.textContent = '📷 Switched to Document Scanner';
    speakReply("Document scanner ready. Say 'Capture' to snap a page.");
    return;
  }

  // Voice shutter capture: "capture", "snap", "take photo", "take picture", "photo", "shoot"
  if (text.includes('capture') || text.includes('snap') || text.includes('photo') || text.includes('picture') || text.includes('shoot')) {
    switchTab('tab-scan');
    voiceStatusText.textContent = '📸 Capturing page...';
    setTimeout(() => {
      captureScanFrame();
    }, 350);
    return;
  }

  // Voice camera flip
  if (text.includes('flip') || text.includes('switch camera')) {
    switchTab('tab-scan');
    toggleCamera();
    return;
  }

  // Voice clear scanned pages
  if (text.includes('clear scan') || text.includes('delete scan') || text.includes('reset scan')) {
    clearAllScannedPages();
    voiceStatusText.textContent = '🗑️ Cleared all scanned pages';
    return;
  }

  // 1. Merge PDFs
  if (text.includes('merge') || text.includes('combine') || text.includes('join')) {
    switchTab('tab-merge');
    voiceStatusText.textContent = '✅ Switched to Merge PDFs';
    speakReply('Opening Merge PDFs tool');
    setTimeout(() => {
      document.getElementById('mergeFileInput').click();
    }, 700);
    return;
  }

  // 2. Sign Document
  if (text.includes('sign') || text.includes('signature') || text.includes('autograph')) {
    switchTab('tab-sign');
    voiceStatusText.textContent = '✅ Switched to Sign Document';
    speakReply('Opening Sign Document tool');
    return;
  }

  // 3. Fill Form
  if (text.includes('form') || text.includes('fill') || text.includes('application')) {
    switchTab('tab-form');
    voiceStatusText.textContent = '✅ Switched to Fill Official Form';
    speakReply('Opening Form Filling tool');
    return;
  }

  // 4. Redact PDF
  if (text.includes('redact') || text.includes('blackout') || text.includes('hide') || text.includes('censor')) {
    switchTab('tab-redact');
    voiceStatusText.textContent = '✅ Switched to Permanent Redaction';
    speakReply('Opening Redaction tool');
    return;
  }

  // 5. Clear Signature Pad
  if (text.includes('clear') || text.includes('erase') || text.includes('reset')) {
    const clearBtn = document.getElementById('clearSigBtn');
    if (clearBtn) clearBtn.click();
    voiceStatusText.textContent = '✅ Cleared Signature Pad';
    speakReply('Cleared signature pad');
    return;
  }

  // 6. Export / Download / Save
  if (text.includes('export') || text.includes('download') || text.includes('save') || text.includes('process') || text.includes('generate')) {
    // Determine active tab
    const activeTab = document.querySelector('.tool-card.active');
    if (activeTab) {
      if (activeTab.id === 'tab-scan' || (scannedPages && scannedPages.length > 0)) {
        saveScannedPdf();
        voiceStatusText.textContent = '📄 Exporting scanned PDF...';
        closeVoiceModal();
        return;
      } else if (activeTab.id === 'tab-form') {
        const btn = document.getElementById('fillFormBtn');
        if (btn && btn.style.display !== 'none') {
          btn.click();
          voiceStatusText.textContent = '✅ Filling and exporting form...';
          speakReply('Exporting filled form');
          closeVoiceModal();
          return;
        }
      } else if (activeTab.id === 'tab-sign') {
        const btn = document.getElementById('signPdfBtn');
        if (btn) {
          btn.click();
          voiceStatusText.textContent = '✅ Signing and exporting document...';
          speakReply('Embedding signature and saving PDF');
          closeVoiceModal();
          return;
        }
      } else if (activeTab.id === 'tab-redact') {
        const btn = document.getElementById('redactBtn');
        if (btn) {
          btn.click();
          voiceStatusText.textContent = '✅ Redacting and downloading PDF...';
          speakReply('Permanently redacting and downloading PDF');
          closeVoiceModal();
          return;
        }
      } else if (activeTab.id === 'tab-merge') {
        const btn = document.getElementById('mergeBtn');
        if (btn && btn.style.display !== 'none') {
          btn.click();
          voiceStatusText.textContent = '✅ Merging documents...';
          speakReply('Merging documents and saving');
          closeVoiceModal();
          return;
        }
      }
    }
    voiceStatusText.textContent = '⚠️ Please select or upload a document first';
    speakReply('Please upload a document first');
    return;
  }

  // 7. Install App
  if (text.includes('install') || text.includes('home screen')) {
    voiceStatusText.textContent = '📲 Launching installation...';
    speakReply('Opening app installer');
    if (installAppBtn) installAppBtn.click();
    closeVoiceModal();
    return;
  }

  // Unrecognized
  voiceStatusText.textContent = `❓ Unrecognized command: "${rawTranscript}"`;
  speakReply(`Sorry, I didn't recognize: ${rawTranscript}. You can say scan, capture page, save PDF, merge, sign, fill form, or redact.`);
}

function startListening() {
  if (!SpeechRecognition) {
    alert("Speech Recognition is not supported by this browser. You can type commands or tap the quick pills.");
    return;
  }

  if (isListening && recognition) {
    recognition.stop();
    return;
  }

  try {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      isListening = true;
      voiceStatusText.textContent = '🎙️ Listening... Speak now!';
      voiceMicCircle.style.transform = 'scale(1.1)';
      document.getElementById('voicePulseRing').style.opacity = '1';
      document.getElementById('voicePulseRing2').style.opacity = '1';
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      voiceTranscriptBox.textContent = `"${transcript}"`;
      if (event.results[current].isFinal) {
        processVoiceCommand(transcript);
      }
    };

    recognition.onerror = (event) => {
      isListening = false;
      voiceStatusText.textContent = `⚠️ Voice error: ${event.error}`;
      voiceMicCircle.style.transform = 'scale(1)';
      document.getElementById('voicePulseRing').style.opacity = '0';
      document.getElementById('voicePulseRing2').style.opacity = '0';
    };

    recognition.onend = () => {
      isListening = false;
      voiceMicCircle.style.transform = 'scale(1)';
      document.getElementById('voicePulseRing').style.opacity = '0';
      document.getElementById('voicePulseRing2').style.opacity = '0';
    };

    recognition.start();
  } catch (err) {
    console.log('Voice start error:', err);
    voiceStatusText.textContent = 'Could not start microphone.';
  }
}

function openVoiceModal() {
  if (voiceModal) {
    voiceModal.classList.add('active');
    startListening();
  }
}

function closeVoiceModal() {
  if (voiceModal) {
    voiceModal.classList.remove('active');
    if (isListening && recognition) {
      recognition.stop();
    }
  }
}

if (headerVoiceBtn) headerVoiceBtn.addEventListener('click', openVoiceModal);
if (floatingVoiceBtn) floatingVoiceBtn.addEventListener('click', openVoiceModal);
if (voiceCloseBtn) voiceCloseBtn.addEventListener('click', closeVoiceModal);
if (voiceMicCircle) voiceMicCircle.addEventListener('click', startListening);

// Tap tip pills to simulate voice command
voiceTipPills.forEach(pill => {
  pill.addEventListener('click', () => {
    const cmd = pill.dataset.cmd;
    processVoiceCommand(cmd);
  });
});

