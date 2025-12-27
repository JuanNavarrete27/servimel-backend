# SERVIMEL — Backend (Node.js + Express + MySQL)

## Requisitos
- Node.js 18+
- MySQL 8+

## Setup rápido
1) Crear DB y tablas:
- Crear una base `servimel`
- Ejecutar `src/schema/schema.sql`

2) Variables de entorno
- Copiar `.env.example` a `.env` y completar valores

3) Instalar y correr
```bash
npm i
npm run dev
```

## Convención de respuestas
- OK: `{ ok: true, data: ... }`
- Error: `{ ok: false, error: { code, message, details? } }`

## Salud
- GET `/health`
