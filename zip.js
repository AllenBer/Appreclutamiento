document.addEventListener("DOMContentLoaded", () => {
  const imagenes = JSON.parse(localStorage.getItem("scannedDocs") || "{}");
  const origen = localStorage.getItem("origen") || "documentacion-general.html";

  // ✅ Documento obligatorio dinámico
  let docObligatorio = origen.includes("empresa") ? "contrato_laboral" : "ine_frente";

  if (!imagenes[docObligatorio]) {
    alert(`Debes escanear el documento obligatorio: ${docObligatorio.replace("_", " ")}`);
    window.location.href = origen;
    return;
  }

  // ✅ OCR dinámico
  async function extraerNombreConOCR() {
    const docUrl = imagenes[docObligatorio];
    const result = await Tesseract.recognize(docUrl, 'spa', { logger: m => console.log(m) });
    const texto = result.data.text;
    const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);

    let nombre = "Trabajador";
    for (const linea of lineas) {
      if (/NOMBRE/i.test(linea)) {
        nombre = linea.split(':').pop().trim();
        break;
      }
    }
    if (nombre === "Trabajador") {
      nombre = lineas.find(l => l.split(' ').length >= 2 && l.length > 5) || "Trabajador";
    }
    return nombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").trim();
  }

  let zipBlob = null;
  let nombreZip = "";

  async function generarZIP() {
    if (zipBlob) return; // Si ya existe, no regenerar
    const zip = new JSZip();
    const nombreTrabajador = await extraerNombreConOCR();
    const fecha = new Date();
    nombreZip = `${nombreTrabajador}_${fecha.getMonth() + 1}-${fecha.getDate()}-${fecha.getFullYear()}.zip`;

    const carpeta = zip.folder(nombreTrabajador);
    for (const [docType, url] of Object.entries(imagenes)) {
      const response = await fetch(url);
      const blob = await response.blob();
      const ext = blob.type.split("/")[1];
      carpeta.file(`${docType}_${nombreTrabajador}.${ext}`, blob);
    }

    zipBlob = await zip.generateAsync({ type: "blob" });
    mostrarMensajeExito();
  }

  function mostrarMensajeExito() {
    document.getElementById("mensajeExito").style.display = "block";
    document.getElementById("btnInicio").style.display = "inline-block";
  }

  // ✅ Botón Generar ZIP: genera y descarga
  document.getElementById("btnGenerarZIP").addEventListener("click", async () => {
    await generarZIP();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = nombreZip;
    a.click();
  });

  // ✅ Botón WhatsApp: comparte si el ZIP ya existe o lo genera
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

  // ✅ Botón Email: abre mailto + descarga el ZIP para adjuntar manual
  document.getElementById("btnEmail").addEventListener("click", async () => {
    if (!zipBlob) await generarZIP();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = nombreZip;
    a.click();

    const subject = encodeURIComponent("Documentos escaneados");
    const body = encodeURIComponent(
      `Hola,\n\nTe adjunto el archivo ZIP descargado desde la página.\n\nPor favor revisa tu carpeta de descargas y adjúntalo manualmente si no aparece automáticamente.\n\nSaludos.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });

  // ✅ Botón subir a Drive (pendiente)
  document.getElementById("btnDrive").addEventListener("click", async () => {
    if (!zipBlob) await generarZIP();
    alert("Funcionalidad de subida a Google Drive pendiente de integración real.");
    mostrarMensajeExito();
  });

  // ✅ Botón regresar: vuelve al origen
  document.getElementById("btnRegresar").addEventListener("click", () => {
    window.location.href = origen;
  });

  // ✅ Botón inicio: limpia todo y vuelve a dashboard
  document.getElementById("btnInicio").addEventListener("click", () => {
    localStorage.removeItem("scannedDocs");
    localStorage.removeItem("origen");
    window.location.href = "dashboard.html";
  });
});
