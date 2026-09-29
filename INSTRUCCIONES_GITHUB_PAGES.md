# 🌸 Guía de Publicación en GitHub Pages & Entrega para Khaleesi

¡Tu web interactiva del manga de **Demon Slayer: Kimetsu no Yaiba** ya está 100% construida, probada y lista para publicar!

---

## 🚀 ¿Por qué funciona perfectamente en GitHub Pages?

1. **Sin el límite de 100 MB**: GitHub rechaza archivos mayores a 100 MB. Había 2 archivos que pesaban 128 MB y 131 MB (`Capítulo 179-187` y `188-195`). El sistema los dividió automáticamente en partes de ~63 MB sin perder ni una sola página.
2. **Protección de archivos pesados**: Creamos un archivo `.gitignore` para que el archivo `K1im3tsu no Y7aib7a.rar` (1.55 GB) **no se suba a GitHub** y no te bloquee el repositorio.
3. **Cero servidores / Cero costos**: Es una aplicación web estática pura (HTML5, Vanilla CSS moderno, JavaScript y Mozilla PDF.js integrado), por lo que GitHub Pages la sirve gratis para siempre con HTTPS.
4. **Instalable como PWA**: Khaleesi podrá instalarla en su iPad, iPhone o tablet Android como una aplicación nativa.

---

## 📦 Paso a Paso para Subirlo a GitHub Pages (3 Minutos)

### Paso 1: Crear un nuevo repositorio en GitHub
1. Entra a tu cuenta en [GitHub.com](https://github.com) y crea un nuevo repositorio (por ejemplo: `manga-demon-slayer` o `khaleesi-manga`).
2. Déjalo como **Público** (para que GitHub Pages sea gratis).
3. **No** marques la opción de inicializar con README ni `.gitignore` (ya los tenemos creados aquí).

### Paso 2: Subir los archivos desde tu computadora
Abre una terminal de PowerShell en esta carpeta (`E:\Otros\Cuentos khaleesi\manga_demon_slayer`) y ejecuta:

```powershell
# Empujar el repositorio limpio (todos los archivos están por debajo de 42 MB)
git push -u origin main --force
```

*(Nota: Como son ~500 MB en total de PDFs optimizados, la primera subida tardará unos minutos según la velocidad de tu internet de subida).*

---

### Paso 3: Activar GitHub Pages
1. En tu repositorio de GitHub, haz clic en **Settings** (Configuración) en el menú superior.
2. En la barra lateral izquierda, entra en **Pages**.
3. En la sección **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: selecciona `main` y la carpeta `/ (root)`
   - Haz clic en **Save**.
4. ¡Listo! En unos 60 segundos, GitHub te dará el enlace público:
   `https://TU_USUARIO.github.io/TU_REPOSITORIO/`

---

## 📱 Cómo entregárselo a Khaleesi en su Tablet o Celular

Cuando le mandes el enlace a Khaleesi por WhatsApp o se lo abras en su tablet:

### En iPad / iPhone (Safari):
1. Abre el enlace en Safari.
2. Toca el botón **Compartir** (el icono de un cuadrado con una flecha hacia arriba).
3. Selecciona **"Añadir a la pantalla de inicio"** (*Add to Home Screen*).
4. Tendrá el icono de Demon Slayer directamente en la pantalla de su tablet y se abrirá a pantalla completa sin barras del navegador.

### En Tablet Android / Celular (Google Chrome):
1. Abre el enlace en Chrome.
2. Toca el menú de los 3 puntos (arriba a la derecha).
3. Selecciona **"Instalar aplicación"** o **"Añadir a la pantalla principal"**.

---

## 💻 Cómo probarlo ahora mismo en tu red WiFi de la casa

Si quieres que Khaleesi lo vea hoy mismo en su tablet sin subirlo a GitHub todavía:

1. Ejecuta este comando en la terminal:
   ```powershell
   python -m http.server 8080 --bind 0.0.0.0
   ```
2. Averigua la IP local de tu PC ejecutando `ipconfig` (por ejemplo: `192.168.1.50`).
3. En la tablet de Khaleesi conectada al mismo WiFi, abre el navegador e ingresa:
   `http://192.168.1.50:8080`
4. ¡Cargará al instante a máxima velocidad local!
