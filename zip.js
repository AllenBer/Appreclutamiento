document.addEventListener("DOMContentLoaded", () => {
  // ✅ Recuperar datos guardados
  const imagenes = JSON.parse(localStorage.getItem("scannedDocs") || "{}");
  const origen = localStorage.getItem("origen") || "documentacion-general.html";

  // ✅ Elementos del DOM
  const container = document.getElementById("preview-container");
  const btnInicio = document.getElementById("btnInicio");
  const btnGenerarZIP = document.getElementById("btnGenerarZIP");
  const btnRegresar = document.getElementById("btnRegresar");
  const btnWhatsApp = document.getElementById("btnWhatsApp");
  const btnEmail = document.getElementById("btnEmail");
  const mensajeExito = document.getElementById("mensajeExito");
  const listaDocumentos = document.getElementById("listaDocumentos");

  // ✅ Documento obligatorio dinámico
  let docObligatorio = "";
  if (origen.includes("empresa")) {
    docObligatorio = "contrato_laboral";
  } else {
    docObligatorio = "ine_frente";
  }

  // ✅ Validar que exista
  if (!imagenes[docObligatorio]) {
    alert(`Debes escanear el documento obligatorio: ${docObligatorio.replace("_", " ")}`);
    window.location.href = origen;
    return;
  }

  // ✅ Mostrar vista previa de documentos
  Object.entries(imagenes).forEach(([docType, url]) => {
    const item = document.createElement("div");
    item.className = "preview-item";
    item.innerHTML = `<strong>${docType}</strong><br><img src="${url}" alt="${docType}">`;
    container.appendChild(item);
  });

  // ✅ OCR con Tesseract.js para nombre del trabajador
  async function extraerNombreConOCR() {
    const docUrl = imagenes[docObligatorio];
    const result = await Tesseract.recognize(docUrl, 'spa', { logger: m => console.log(m) });

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

    return nombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").trim();
  }

  let zipBlob = null;
  let nombreZip = "";

  // ✅ Generar ZIP con nombre OCR
  async function generarZIP() {
    if (zipBlob) return; // Ya existe, no regenerar
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

  // ✅ Mostrar mensaje de éxito y botón Inicio
  function mostrarMensajeExito() {
    mensajeExito.style.display = "block";
    btnInicio.style.display = "inline-block";
  }

  // ✅ BOTÓN: Generar ZIP y descargarlo
  btnGenerarZIP.addEventListener("click", async () => {
    await generarZIP();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = nombreZip;
    a.click();
  });

  // ✅ BOTÓN: Regresar a la página de escaneo correcta
  btnRegresar.addEventListener("click", () => {
    if (origen.includes("empresa")) {
      window.location.href = "documentacion-empresa.html";
    } else {
      window.location.href = "documentacion-general.html";
    }
  });

  // ✅ BOTÓN: Volver al inicio y limpiar todo
  btnInicio.addEventListener("click", () => {
    localStorage.removeItem("scannedDocs");
    localStorage.removeItem("origen");
    window.location.href = "dashboard.html";
  });

  // ✅ BOTÓN: Compartir por WhatsApp
  btnWhatsApp.addEventListener("click", async () => {
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

  // ✅ BOTÓN: Enviar por Email (abre mailto y descarga ZIP)
  btnEmail.addEventListener("click", async () => {
    if (!zipBlob) await generarZIP();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = nombreZip;
    a.click();

    const subject = encodeURIComponent("Documentos escaneados");
    const body = encodeURIComponent(
      `Hola,\n\nAdjunto el archivo ZIP con los documentos escaneados.\n\nSi no se adjunta automáticamente, revisa tu carpeta de descargas.\n\nSaludos.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });
});
