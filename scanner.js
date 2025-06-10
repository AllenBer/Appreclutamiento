const scanButtons = document.querySelectorAll('.scan-btn');
const scannerContainer = document.getElementById('scanner-container');
const video = document.getElementById('camera');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const preview = document.getElementById('preview');

let currentStream = null;
let currentDoc = '';

scanButtons.forEach(button => {
  button.addEventListener('click', async () => {
    currentDoc = button.dataset.doc;
    scannerContainer.style.display = 'block';

    try {
      currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = currentStream;
    } catch (err) {
      alert('No se pudo acceder a la cámara: ' + err.message);
    }
  });
});

captureBtn.addEventListener('click', () => {
  if (!video.srcObject) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  const imageData = canvas.toDataURL('image/png');
  const img = document.createElement('img');
  img.src = imageData;
  img.alt = currentDoc;
  img.style.maxWidth = '100%';
  preview.appendChild(img);

  // Detener cámara después de capturar
  currentStream.getTracks().forEach(track => track.stop());
  video.srcObject = null;
  scannerContainer.style.display = 'none';
});
