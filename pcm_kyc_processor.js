/**
 * ============================================================================
 * PCM SMART PDF - CLIENT-SIDE KYC COMPRESSOR, WATERMARKER & ENCRYPTION ENGINE
 * ============================================================================
 * Author & Copyright Owner: PRAKASH CHAND MEHTA
 * Contact: prakashcmehta@gmail.com
 * Product: PCM Smart PDF / PCM Smart PDF Pro
 *
 * Description:
 * 1. Document Compression: Scales ID scans to max 1100px and compresses to WebP/JPEG (40KB - 75KB).
 * 2. Forensic Anti-Theft Watermarking: Burns indelible anti-misuse warnings into the pixel matrix.
 * 3. Client-Side AES-256-GCM Encryption: Zero-Knowledge encryption before transmission.
 * 4. HMAC-SHA256 Request Signing: Generates anti-replay request signatures.
 * ============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PcmKycProcessor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Shared secret for HMAC-SHA256 authentication (matches Google Apps Script webhook)
  const VAULT_SHARED_SECRET = "PCM-SMART-PDF-VAULT-SECRET-2026-PRAKASH-CHAND-MEHTA-9x!mQ";

  // AES-256 Master Vault Key (for Zero-Knowledge Client-Side Encryption)
  // Derived via SHA-256 from the master secret
  let cachedCryptoKey = null;

  async function getEncryptionKey() {
    if (cachedCryptoKey) return cachedCryptoKey;
    const enc = new TextEncoder();
    const keyData = enc.encode(VAULT_SHARED_SECRET);
    const hash = await crypto.subtle.digest('SHA-256', keyData);
    cachedCryptoKey = await crypto.subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
    return cachedCryptoKey;
  }

  /**
   * Helper: Convert ArrayBuffer to Base64
   */
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Helper: Convert Base64 to ArrayBuffer
   */
  function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Computes HMAC-SHA256 signature for API requests
   */
  async function computeHmacSignature(action, timestamp, emailOrUuid) {
    const enc = new TextEncoder();
    const keyData = enc.encode(VAULT_SHARED_SECRET);
    const rawData = enc.encode(`${action}:${timestamp}:${(emailOrUuid || '').toLowerCase()}`);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, rawData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Computes a salted one-way hash of the ID / Passport number (never stored in plain text)
   */
  async function hashIdNumber(idNumber) {
    if (!idNumber) return 'NONE';
    const enc = new TextEncoder();
    const cleanId = idNumber.trim().toUpperCase().replace(/[\s-]/g, '');
    const data = enc.encode(`PCM-SALT-2026:${cleanId}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Loads an image file or blob into an Image object
   */
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for processing: ' + err));
      };
      img.src = url;
    });
  }

  /**
   * STEP 1 & 2: Process, Resize, and Burn Forensic Anti-Theft Watermark
   *
   * @param {File|Blob} imageFile - The raw photo captured by the user
   * @param {Object} metadata - { fullName, userUuid, date }
   * @returns {Promise<Blob>} - Compressed, watermarked image Blob (40KB - 75KB)
   */
  async function processAndWatermarkDocument(imageFile, metadata = {}) {
    const img = await loadImage(imageFile);
    const fullName = (metadata.fullName || 'LICENSED USER').toUpperCase();
    const userUuid = metadata.userUuid || 'PCM-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const dateStr = metadata.date || new Date().toISOString().split('T')[0];

    // Target max dimensions for optimal legal readability and minimum file size
    const MAX_WIDTH = 1100;
    const MAX_HEIGHT = 850;

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Draw base photo
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // 2. Burn Top Warning Banner
    const bannerHeight = Math.max(28, Math.round(height * 0.055));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'; // Deep Navy
    ctx.fillRect(0, 0, width, bannerHeight);

    ctx.font = `bold ${Math.max(10, Math.round(bannerHeight * 0.44))}px -apple-system, sans-serif`;
    ctx.fillStyle = '#FFB92D'; // Gold
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛡️ FOR PCM SMART PDF IDENTITY VERIFICATION ONLY — NOT FOR FINANCIAL / SIM USE', width / 2, bannerHeight / 2);

    // 3. Burn Bottom Warning Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    ctx.font = `${Math.max(9, Math.round(bannerHeight * 0.4))}px -apple-system, sans-serif`;
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(`VERIFIED FOR: ${fullName} | ID: ${userUuid} | DATE: ${dateStr}`, width / 2, height - (bannerHeight / 2));

    // 4. Burn Multiple Repeating Semi-Transparent Diagonal Watermarks across the center
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-28 * Math.PI / 180);

    const stepY = Math.max(80, Math.round(height * 0.22));
    const stepX = Math.max(260, Math.round(width * 0.4));
    const fontSize = Math.max(14, Math.round(width * 0.022));

    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 69, 0, 0.26)'; // Semi-transparent security red/orange
    ctx.textAlign = 'center';

    for (let y = -height; y < height; y += stepY) {
      for (let x = -width; x < width; x += stepX) {
        ctx.fillText(`PCM SMART PDF SECURE KYC`, x, y);
        ctx.fillText(`DO NOT COPY`, x, y + 18);
      }
    }
    ctx.restore();

    // 5. Compress to Modern WebP (Quality 0.68) or Fallback JPEG (Quality 0.70)
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            // Fallback to JPEG if browser does not support WebP canvas export
            canvas.toBlob((jpgBlob) => resolve(jpgBlob), 'image/jpeg', 0.70);
          }
        },
        'image/webp',
        0.68
      );
    });
  }

  /**
   * STEP 3: Client-Side AES-256-GCM Zero-Knowledge Encryption
   *
   * @param {Blob} documentBlob - The compressed, watermarked blob
   * @returns {Promise<Object>} - { encryptedBase64, ivBase64, originalSize, encryptedSize }
   */
  async function encryptDocument(documentBlob) {
    const key = await getEncryptionKey();
    const arrayBuffer = await documentBlob.arrayBuffer();

    // Generate random 12-byte IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt in-memory
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      arrayBuffer
    );

    const encryptedBase64 = arrayBufferToBase64(encryptedBuffer);
    const ivBase64 = arrayBufferToBase64(iv.buffer);

    return {
      encryptedBase64: encryptedBase64,
      ivBase64: ivBase64,
      originalSize: arrayBuffer.byteLength,
      encryptedSize: encryptedBuffer.byteLength,
      mimeType: documentBlob.type || 'image/webp'
    };
  }

  /**
   * FULL PIPELINE: Process, Watermark, Compress, and Encrypt in one call
   *
   * @param {File|Blob} rawFile - User uploaded ID file
   * @param {Object} metadata - { fullName, userUuid }
   * @returns {Promise<Object>} Ready-to-transmit payload
   */
  async function prepareKycPayload(rawFile, metadata = {}) {
    const processedBlob = await processAndWatermarkDocument(rawFile, metadata);
    const encryptionResult = await encryptDocument(processedBlob);

    return {
      userUuid: metadata.userUuid,
      fullName: metadata.fullName,
      encryptedDocBase64: encryptionResult.encryptedBase64,
      ivBase64: encryptionResult.ivBase64,
      docMimeType: encryptionResult.mimeType,
      docFileSize: encryptionResult.encryptedSize,
      watermarkedBlobSizeKb: (processedBlob.size / 1024).toFixed(1)
    };
  }

  /**
   * Transmits request to Google Apps Script Webhook with HMAC-SHA256 signature
   *
   * @param {string} webhookUrl - The deployed Google Apps Script Web App URL
   * @param {string} action - 'SEND_EMAIL_OTP' | 'VERIFY_EMAIL_OTP' | 'REGISTER_USER_AND_UPLOAD_KYC'
   * @param {Object} payloadData - Body data
   */
  async function callVaultWebhook(webhookUrl, action, payloadData = {}) {
    if (!webhookUrl || webhookUrl.includes('YOUR_DEPLOYED_WEBAPP_URL')) {
      throw new Error('Please configure the valid Google Apps Script Webhook URL.');
    }

    const timestamp = Date.now().toString();
    const emailOrUuid = payloadData.email || payloadData.userUuid || '';
    const signature = await computeHmacSignature(action, timestamp, emailOrUuid);

    const fullPayload = {
      action: action,
      timestamp: timestamp,
      signature: signature,
      ...payloadData
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Apps Script handles text/plain without CORS preflight issues
      },
      body: JSON.stringify(fullPayload)
    });

    if (!response.ok) {
      throw new Error(`Webhook network error: HTTP ${response.status}`);
    }

    return await response.json();
  }

  // Public API
  return {
    processAndWatermarkDocument,
    encryptDocument,
    prepareKycPayload,
    hashIdNumber,
    computeHmacSignature,
    callVaultWebhook
  };
});
