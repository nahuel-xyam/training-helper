import type { CapacitorConfig } from "@capacitor/cli";

/**
 * APK de Android. La interfaz se carga desde GitHub Pages (server.url), así los cambios
 * visuales llegan sin reinstalar; solo hace falta un APK nuevo cuando cambia el código nativo
 * (android/app/src/main/java/...).
 */
// Para probar en el emulador contra un servidor local: CAP_SERVER_URL=http://10.0.2.2:8765/training-helper/
const serverUrl = process.env.CAP_SERVER_URL ?? "https://nahuel-xyam.github.io/training-helper/";

const config: CapacitorConfig = {
  appId: "dev.xyam.traininghelper",
  appName: "Training Helper",
  // Copia local de respaldo (no se usa mientras haya server.url)
  webDir: "out",
  server: {
    url: serverUrl,
    androidScheme: "https",
    cleartext: serverUrl.startsWith("http:"),
  },
  android: {
    // Para depurar desde chrome://inspect con el celular conectado
    webContentsDebuggingEnabled: true,
  },
};

export default config;
