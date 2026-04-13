# Web Importación — Buscador ML + AliExpress

Herramienta interna para buscar productos en MercadoLibre y AliExpress,
configurar precios con comisión y exportarlos al panel admin de la ferretería.

## Estructura

```
web-importacion/
├── index.html      → Importador de productos (interfaz principal)
├── api/
│   └── ml.js       → Proxy serverless para MercadoLibre (evita CORS)
├── vercel.json     → Configuración de Vercel
└── package.json    → Metadata del proyecto
```

## Setup inicial

### 1. Crear repositorio en GitHub
```
Nombre sugerido: web-importacion
Usuario: DirectionalDrillersAIHub
```

### 2. Inicializar Git en esta carpeta
Abrir PowerShell en esta carpeta y ejecutar:
```powershell
git init
git add .
git commit -m "setup inicial"
git remote add origin https://github.com/DirectionalDrillersAIHub/web-importacion.git
git push -u origin main
```

### 3. Conectar con Vercel
1. Ir a vercel.com → New Project
2. Importar el repositorio web-importacion
3. Deploy automático

### 4. URL resultante
```
https://web-importacion.vercel.app
https://web-importacion.vercel.app/api/ml?action=search&q=taladro
```

## Credenciales MercadoLibre
- App ID: 3657697217255500
- Client Secret: uKKiMkiy4EotNDuITH5RKCysOfUrT0MK
- (Configuradas en api/ml.js)

## Uso
1. Abrir la URL del proyecto en el navegador
2. Buscar productos en el tab MercadoLibre o AliExpress
3. Seleccionar producto → configurar comisión y envío
4. Agregar a la lista
5. Exportar al panel admin (comparte localStorage si está en el mismo dominio)
   o copiar el código JS y pegarlo manualmente

## Próximos pasos
- [ ] Conectar AliExpress API real
- [ ] Sincronización automática con panel admin via base de datos
- [ ] Historial de productos importados
