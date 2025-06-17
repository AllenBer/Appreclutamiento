// Incluye Tesseract.js en tu HTML:
//// <script src="https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js"></script>

const imagenes = JSON.parse(localStorage.getItem("scannedDocs") || "{}");
const origen = localStorage.getItem("origen") || "index.html";
const container = document.getElementById("preview-container");
const btnInicio = document.getElementById("btnInicio");
const mensajeExito = document.getElementById("mensajeExito");
const listaDocumentos = document.getElementById("listaDocumentos");

if (Object.keys(imagenes).length === 0) {
  alert("No hay documentos escaneados.");
  window.location.href = origen;
}

Object.entries(imagenes).forEach(([docType, url]) => {
  const item = document.createElement("div");
  item.className = "preview-item";
  item.innerHTML = `<strong>${docType}</strong><br><img src="${url}" alt="${docType}">`;
  container.appendChild(item);
});

// 🔑 OCR REAL con Tesseract.js
async function extraerNombreConOCR() {
  const ineUrl = imagenes["INE"] || imagenes["Identificación"] || null;
  if (!ineUrl) return "Trabajador";

  const result = await Tesseract.recognize(ineUrl, 'spa', {
    logger: m => console.log(m) // Muestra progreso en consola
  });

  const texto = result.data.text;
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);

  let nombre = "Trabajador";
  for (const linea of lineas) {
    if (/NOMBRE|Nombre/i.test(linea)) {
      const partes = linea.split(':');
      if (partes.length > 1) {
        nombre = partes[1].trim();
        break;
      }
    }
  }

  if (nombre === "Trabajador") {
    nombre = lineas.find(l => l.split(' ').length >= 2 && l.length > 5) || "Trabajador";
  }

  // Limpia caracteres no permitidos para nombre de archivo
  return nombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").trim();
}

let zipBlob = null;
let nombreZip = "";

async function generarZIP() {
  const zip = new JSZip();
  const nombreTrabajador = await extraerNombreConOCR();
  const fecha = new Date();
  nombreZip = `${nombreTrabajador}_${fecha.getMonth() + 1}-${fecha.getDate()}-${fecha.getFullYear()}.zip`;

  const carpeta = zip.folder(nombreTrabajador);
  listaDocumentos.innerHTML = "";

  for (const [docType, url] of Object.entries(imagenes)) {
    const response = await fetch(url);
    const blob = await response.blob();
    const extension = blob.type.split("/")[1];
    const filename = `${docType}_${nombreTrabajador}.${extension}`;
    carpeta.file(filename, blob);

    const li = document.createElement("li");
    li.textContent = filename;
    listaDocumentos.appendChild(li);
  }

  zipBlob = await zip.generateAsync({ type: "blob" });
  mostrarMensajeExito();
}

function mostrarMensajeExito() {
  mensajeExito.style.display = "block";
  btnInicio.style.display = "inline-block";
}

document.getElementById("btnGenerarZIP").addEventListener("click", async () => {
  await generarZIP();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(zipBlob);
  a.download = nombreZip;
  a.click();
  localStorage.removeItem("scannedDocs");
  localStorage.removeItem("origen");
});

document.getElementById("btnRegresar").addEventListener("click", () => {
  window.location.href = origen;
});

document.getElementById("btnWhatsApp").addEventListener("click", async () => {
  if (!zipBlob) await generarZIP();
  const file = new File([zipBlob], nombreZip, { type: "application/zip" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "Documentos ZIP",
      text: "Aquí tienes el archivo ZIP de documentos escaneados"
    });
    mostrarMensajeExito();
  } else {
    alert("Tu dispositivo no soporta compartir archivos por WhatsApp directamente.");
  }
});

document.getElementById("btnEmail").addEventListener("click", () => {
  const subject = encodeURIComponent("Documentos escaneados");
  const body = encodeURIComponent("Adjunto el archivo ZIP con los documentos escaneados.");
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  mostrarMensajeExito();
});

document.getElementById("btnDrive").addEventListener("click", async () => {
  if (!zipBlob) await generarZIP();
  alert("Funcionalidad de subida a Google Drive pendiente de integración real.");
  mostrarMensajeExito();
});

btnInicio.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});
