import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC_WhpJxW6V6C6stDeyv6wGsj4-2rR2edQ",
  authDomain: "appreclutameinto.firebaseapp.com",
  projectId: "appreclutameinto",
  storageBucket: "appreclutameinto.appspot.com",
  messagingSenderId: "447789838113",
  appId: "1:447789838113:web:41d7c2ba5cd6bb304e5860"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

document.addEventListener("DOMContentLoaded", () => {
  const btnGenerarZIP = document.getElementById("btnGenerarZIP");
  const btnWhatsApp = document.getElementById("btnWhatsApp");
  const btnEmail = document.getElementById("btnEmail");
  const descargarZip = document.getElementById("descargarZip");
  const mensajeExito = document.getElementById("mensajeExito");
  const btnInicio = document.getElementById("btnInicio");
  const btnRegresar = document.getElementById("btnRegresar");
  const listaDocumentos = document.getElementById("listaDocumentos");
  const container = document.getElementById("preview-container");
  const inputNombreManual = document.getElementById("nombreManual");

  const origen = localStorage.getItem("origen") || "documentacion-general.html";
  const imagenes = JSON.parse(
    localStorage.getItem(origen.includes("empresa") ? "scannedDocsEmpresa" : "scannedDocsGeneral") || "{}"
  );

  const posiblesDocs = ["ine_frente", "curp", "contrato_laboral", "carta_responsiva"];
  let zipBlob = null;
  let nombreZip = "";
  let nombreTrabajador = "Trabajador";

  // Mostrar imágenes
  Object.entries(imagenes).forEach(([docType, url]) => {
    const item = document.createElement("div");
    item.className = "preview-item";
    item.innerHTML = `<strong>${docType}</strong><br><img src="${url}" alt="${docType}" style="max-width: 200px; max-height: 200px;">`;
    container.appendChild(item);
  });

  // Detectar nombre automáticamente con OCR
  async function extraerNombreConOCR() {
    for (const doc of posiblesDocs) {
      if (imagenes[doc]) {
        const result = await Tesseract.recognize(imagenes[doc], 'spa', {
          logger: m => console.log(m)
        });

        const texto = result.data.text;
        const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);

        for (const linea of lineas) {
          if (/NOMBRE|Nombre/i.test(linea)) {
            const partes = linea.split(':');
            if (partes.length > 1) {
              return partes[1].trim().replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, "");
            }
          }
        }

        const posible = lineas.find(l => l.split(" ").length >= 2 && l.length > 5);
        if (posible) {
          return posible.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, "");
        }
      }
    }
    return "";
  }

  async function intentarExtraerNombre() {
    const nombreDetectado = await extraerNombreConOCR();
    if (nombreDetectado) {
      inputNombreManual.value = nombreDetectado;
    }
  }

  intentarExtraerNombre();

  // Generar ZIP
  btnGenerarZIP.onclick = async () => {
    const nombre = inputNombreManual.value.trim();
    if (!nombre) {
      alert("⚠️ Por favor escribe o verifica el nombre del trabajador.");
      return;
    }

    if (Object.keys(imagenes).length === 0) {
      alert("No hay documentos para generar ZIP.");
      return;
    }

    const zip = new JSZip();
    const fecha = new Date();
    const fechaStr = `${fecha.getMonth() + 1}-${fecha.getDate()}-${fecha.getFullYear()}`;
    nombreTrabajador = nombre.replace(/\s+/g, "");
    nombreZip = `${nombreTrabajador}_${fechaStr}.zip`;

    const carpeta = zip.folder(nombreTrabajador);
    listaDocumentos.innerHTML = "";

    for (const [docType, url] of Object.entries(imagenes)) {
      const response = await fetch(url);
      const blob = await response.blob();
      const ext = blob.type.split("/")[1] || "png";
      const nombreArchivo = `${docType}_${nombreTrabajador}.${ext}`;
      carpeta.file(nombreArchivo, blob);

      const li = document.createElement("li");
      li.textContent = nombreArchivo;
      listaDocumentos.appendChild(li);
    }

    try {
      zipBlob = await zip.generateAsync({ type: "blob" });

      const zipURL = URL.createObjectURL(zipBlob);
      descargarZip.href = zipURL;
      descargarZip.download = nombreZip;
      descargarZip.style.display = "inline-block";

      mensajeExito.style.display = "block";
      btnWhatsApp.disabled = false;
      btnEmail.disabled = false;

      alert("✅ ZIP generado correctamente.");
    } catch (err) {
      console.error(err);
      alert("❌ Error al generar el ZIP.");
    }
  };

  // Compartir por WhatsApp
  btnWhatsApp.onclick = async () => {
    if (!zipBlob) return alert("Primero genera el ZIP.");

    try {
      const file = new File([zipBlob], nombreZip, { type: "application/zip" });
      const storageRef = ref(storage, `zips/${nombreZip}`);
      await uploadBytes(storageRef, file);

      const downloadURL = await getDownloadURL(storageRef);

      const mensaje = encodeURIComponent(
        `Hola, aquí tienes el ZIP con documentos del trabajador ${nombreTrabajador}:\n${downloadURL}`
      );

      window.open(`https://wa.me/?text=${mensaje}`, "_blank");
    } catch (error) {
      console.error("❌ Error al subir el archivo a Firebase:", error);
      alert("❌ No se pudo subir ni generar el enlace de descarga.");
    }
  };

  // Enviar por correo
  btnEmail.onclick = async () => {
    if (!zipBlob) return alert("Primero genera el ZIP.");

    try {
      const file = new File([zipBlob], nombreZip, { type: "application/zip" });
      const storageRef = ref(storage, `zips/${nombreZip}`);
      await uploadBytes(storageRef, file);

      const downloadURL = await getDownloadURL(storageRef);

      const subject = encodeURIComponent("Documentos del trabajador");
      const body = encodeURIComponent(
        `Hola,\n\nAdjunto el enlace para descargar el archivo ZIP con los documentos del trabajador ${nombreTrabajador}:\n${downloadURL}\n\nSaludos.`
      );

      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } catch (error) {
      console.error("❌ Error al subir el archivo a Firebase:", error);
      alert("❌ No se pudo subir ni generar el enlace de descarga.");
    }
  };

  // Navegación
  btnRegresar.onclick = () => window.location.href = origen;

  btnInicio.onclick = () => {
    localStorage.removeItem("scannedDocsGeneral");
    localStorage.removeItem("scannedDocsEmpresa");
    localStorage.removeItem("origen");
    window.location.href = "dashboard.html";
  };

  // Estado inicial
  btnWhatsApp.disabled = true;
  btnEmail.disabled = true;
  descargarZip.style.display = "none";
  mensajeExito.style.display = "none";
});
