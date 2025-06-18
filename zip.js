document.addEventListener("DOMContentLoaded", () => {
  const imagenes = JSON.parse(localStorage.getItem("scannedDocs") || "{}");
  const origen = localStorage.getItem("origen") || "documentacion-general.html";

  // ✅ Identifica la clave real del documento obligatorio
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

  // ✅ Función OCR sobre el documento obligatorio
  async function extraerNombreConOCR() {
    const docUrl = imagenes[docObligatorio];
    const result = await Tesseract.recognize(docUrl, 'spa', {
      logger: m => console.log(m)
    });
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

  document.getElementById("btnEmail").addEventListener("click", async () => {
    if (!zipBlob) await generarZIP();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = nombreZip;
    a.click();

    const subject = encodeURIComponent("Documentos escaneados");
    const body = encodeURIComponent(
      `Hola,\n\nTe adjunto el archivo ZIP descargado desde la página.\n\nPor favor revisa el archivo en tu carpeta de descargas y adjúntalo manualmente si no aparece automáticamente.\n\nSaludos.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });

  document.getElementById("btnDrive").addEventListener("click", async () => {
    if (!zipBlob) await generarZIP();
    alert("Funcionalidad de subida a Google Drive pendiente de integración real.");
    mostrarMensajeExito();
  });

  document.getElementById("btnInicio").addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
});
