// scanner.js
let cvReady = false;

function onOpenCvReady() {
  if (typeof cv !== 'undefined') {
    cvReady = true;
    console.log("OpenCV.js está listo!");
    // Aquí irán las funciones para inicializar el escáner y procesar imágenes
  } else {
    console.error("OpenCV.js no se cargó correctamente.");
  }
}

// Aquí iría el resto de la lógica del escáner que ya tienes o que añadirás
// Por ejemplo, los event listeners para los botones de escaneo, captura, etc.