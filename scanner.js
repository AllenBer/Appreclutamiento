document.addEventListener("DOMContentLoaded", () => {
  const scanButtons = document.querySelectorAll(".scan-btn");
  const scannerContainer = document.getElementById("scanner-container");
  const camera = document.getElementById("camera");
  const captureBtn = document.getElementById("captureBtn");
  const preview = document.getElementById("preview");
  const capturedImage = document.getElementById("capturedImage");
  const retakeBtn = document.getElementById("retakeBtn");
  const acceptBtn = document.getElementById("acceptBtn");
  const cancelScanBtn = document.getElementById("cancelScanBtn");
  const previewFinal = document.getElementById("previewFinal");

  let currentStream = null;
  let currentDocType = "";

  scanButtons.forEach(button => {
    button.addEventListener("click", () => {
      currentDocType = button.getAttribute("data-doc");
      openScanner();
    });
  });

  function openScanner() {
    scannerContainer.style.display = "block";
    preview.style.display = "none";
    document.getElementById("loading-message").style.display = "block";

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        currentStream = stream;
        camera.srcObject = stream;
        document.getElementById("loading-message").style.display = "none";
      })
      .catch(error => {
        alert("No se pudo acceder a la cámara");
      });
  }

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      camera.srcObject = null;
    }
  }

  captureBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(camera, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg");

    capturedImage.src = dataUrl;
    preview.style.display = "block";
    camera.style.display = "none";
    captureBtn.style.display = "none";
  });

  retakeBtn.addEventListener("click", () => {
    preview.style.display = "none";
    camera.style.display = "block";
    captureBtn.style.display = "inline-block";
  });

  acceptBtn.addEventListener("click", () => {
    const img = document.createElement("img");
    img.src = capturedImage.src;
    img.alt = `Documento: ${currentDocType}`;
    img.classList.add("final-preview-img");
    previewFinal.appendChild(img);

    closeScanner();
  });

  cancelScanBtn.addEventListener("click", () => {
    closeScanner();
  });

  function closeScanner() {
    stopCamera();
    scannerContainer.style.display = "none";
    preview.style.display = "none";
    captureBtn.style.display = "inline-block";
    camera.style.display = "block";
  }
});
