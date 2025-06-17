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

function extraerNombreDesdeINE() {
  const ineUrl = imagenes["INE"] || imagenes["Identificación"] || null;
  if (!ineUrl) return "Trabajador";
  const match = ineUrl.match(/\/([^/]+)\.(jpg|jpeg|png)/i);
  if (match) return match[1].split("_")[0] || "Trabajador";
  return "Trabajador";
}

let zipBlob = null;
let nombreZip = "";

async function generarZIP() {
  const zip = new JSZip();
  const nombreTrabajador = extraerNombreDesdeINE();
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
