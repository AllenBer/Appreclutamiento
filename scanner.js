const scanButtons = document.querySelectorAll('.scan-btn');
const scanner = document.getElementById('scanner-container');
const video = document.getElementById('camera');
const captureBtn = document.getElementById('captureBtn');
const previewDiv = document.getElementById('preview');
const capturedImage = document.getElementById('capturedImage');
const retakeBtn = document.getElementById('retakeBtn');
const acceptBtn = document.getElementById('acceptBtn');
const canvas = document.createElement('canvas');

let currentStream = null;
let currentDoc = '';

scanButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    currentDoc = btn.dataset.doc;
    scanner.style.display = 'flex';
    previewDiv.style.display = 'none';

    try {
      currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = currentStream;
    } catch (err) {
      alert('Error accediendo a la cámara: ' + err.message);
      scanner.style.display = 'none';
    }
  });
});

captureBtn.addEventListener('click', () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  const dataURL = canvas.toDataURL('image/png');
  capturedImage.src = dataURL;

  // Detener cámara
  currentStream.getTracks().forEach(t => t.stop());
  video.srcObject = null;

  // Mostrar preview
  previewDiv.style.display = 'block';
});

retakeBtn.addEventListener('click', () => {
  previewDiv.style.display = 'none';
  scanButtons.forEach(btn => {
    if (btn.dataset.doc === currentDoc) btn.click();
  });
});

acceptBtn.addEventListener('click', () => {
  const imgEl = document.createElement('img');
  imgEl.src = capturedImage.src;
  imgEl.alt = currentDoc;
  document.getElementById('previewFinal').appendChild(imgEl);
  scanner.style.display = 'none';
});
