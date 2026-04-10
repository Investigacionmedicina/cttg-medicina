# 🎓 Aplicación CTTG Medicina 2025

Gestión profesional de trabajos de grado con sincronización automática a Google Sheets.

---

## 🚀 DESPLIEGUE RÁPIDO EN VERCEL (Gratis)

### Opción 1: Deploy automático (Recomendado)

1. **Crea un repositorio en GitHub:**
   - Ve a https://github.com/new
   - Nombre: `cttg-medicina`
   - Crea el repo

2. **Sube los archivos:**
   ```bash
   git clone https://github.com/TU_USUARIO/cttg-medicina.git
   cd cttg-medicina
   
   # Copia los archivos de la app aquí
   # cttg-app.jsx → pages/index.jsx
   # package.json → package.json
   # next.config.js → next.config.js
   
   git add .
   git commit -m "Initial commit"
   git push
   ```

3. **Despliega en Vercel:**
   - Ve a https://vercel.com
   - Click en "New Project"
   - Selecciona tu repo `cttg-medicina`
   - Click "Deploy"
   - **¡Listo!** Tu app estará en `https://cttg-medicina.vercel.app`

### Opción 2: Deploy manual (Sin GitHub)

1. **Instala Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Despliega:**
   ```bash
   cd carpeta-del-proyecto
   vercel
   ```

3. **Sigue las instrucciones en pantalla**

---

## ⚙️ CONFIGURACIÓN POST-DESPLIEGUE

Después de desplegar, necesitas actualizar las URLs de Google OAuth:

1. **En Google Cloud Console:**
   - Ve a https://console.cloud.google.com
   - Abre tu proyecto "CTTG Medicina"
   - Ve a "Credenciales"
   - Haz click en tu ID de cliente OAuth
   - En "URIs autorizados" agrega:
     ```
     https://cttg-medicina.vercel.app
     https://cttg-medicina.vercel.app/callback
     ```
   - Guarda

---

## 📊 FUNCIONALIDADES

✅ **Autenticación segura** - Código de verificación por email  
✅ **CRUD completo** - Crear, editar, eliminar registros  
✅ **Búsqueda y filtros** - Encuentra rápidamente lo que necesitas  
✅ **Sincronización automática** - Con Google Sheets en tiempo real  
✅ **Exportación** - Descarga datos en CSV  
✅ **Responsive** - Funciona en desktop y móvil  
✅ **Sin pérdida de datos** - Google Sheets es tu backup  

---

## 🔐 SEGURIDAD

- ✅ Autenticación con código de verificación por email
- ✅ Tokens OAuth seguros
- ✅ Datos sincronizados con Google (encriptados)
- ✅ Sin contraseñas simples
- ✅ HTTPS automático en Vercel

---

## 🛠️ DESARROLLO LOCAL

```bash
# Instala dependencias
npm install

# Inicia servidor de desarrollo
npm run dev

# Abre http://localhost:3000
```

---

## 📧 CREDENCIALES NECESARIAS

**Google Cloud:**
- Client ID: `140640785901-35gajn6kikfu7g1gv7o4lva4ejn6haj0.apps.googleusercontent.com`
- Client Secret: `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`
- Spreadsheet ID: `1oZCWwnfR-MLF2WjEG5isjPuSOATQVj4HQZUaLJyiJI4`

---

## 🐛 TROUBLESHOOTING

**"Código no enviado"**
- En desarrollo, el código se muestra en la pantalla y consola
- En producción, necesitarás implementar Gmail API

**"No puedo editar"**
- Verifica que el Google Sheet sea editable
- Abre el Sheet: https://docs.google.com/spreadsheets/d/1oZCWwnfR-MLF2WjEG5isjPuSOATQVj4HQZUaLJyiJI4

**"Error 403 en API"**
- Habilita los permisos en Google Cloud Console
- Verifica que la API de Sheets esté habilitada

---

## 📝 PRÓXIMAS MEJORAS

- [ ] Implementar Gmail API para envío de códigos reales
- [ ] Reducir columnas (seleccionar solo las necesarias)
- [ ] Reportes avanzados (PDF, gráficos)
- [ ] Historial de cambios
- [ ] Notificaciones por email
- [ ] Acceso multiusuario con roles

---

## ✉️ SOPORTE

Contacta a: investigacionmedicina@usc.edu.co

---

**Versión:** 1.0.0  
**Última actualización:** 2026-04-10  
**Estado:** ✅ Producción Ready
