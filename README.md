# Contact Form Backend

Небольшой production-ready backend на Fastify + TypeScript для приёма сообщений
с контактной формы лендинга и отправки их на email по SMTP.

Без базы данных, без авторизации — сообщения не сохраняются, только пересылаются на почту.

## Стек

- Node.js + TypeScript
- Fastify
- Nodemailer (SMTP)
- Zod (валидация)
- dotenv

## Структура проекта

```text
src/
  server.ts               # точка входа, настройка Fastify, CORS, rate limit, error handler
  config.ts                # загрузка и валидация переменных окружения
  routes/
    contact.ts              # POST /api/contact
  schemas/
    contact.schema.ts       # Zod-схема валидации запроса
  services/
    mail.service.ts         # отправка письма через Nodemailer
```

## 1. Установка зависимостей

```bash
npm install
```

## 2. Настройка `.env`

Скопируйте пример и заполните значения:

```bash
cp .env.example .env
```

Переменные:

| Переменная       | Описание                                                                 |
|------------------|---------------------------------------------------------------------------|
| `PORT`           | Порт, на котором будет слушать сервер (по умолчанию `3000`)              |
| `SMTP_HOST`      | Адрес SMTP-сервера                                                        |
| `SMTP_PORT`      | Порт SMTP (обычно `587` для STARTTLS или `465` для SSL/TLS)              |
| `SMTP_USER`      | Логин для SMTP-аутентификации                                             |
| `SMTP_PASSWORD`  | Пароль/токен приложения для SMTP-аутентификации                           |
| `SMTP_FROM`      | Адрес отправителя, например `"Landing Page <no-reply@yourdomain.com>"`   |
| `CONTACT_EMAIL`  | Email, на который будут приходить сообщения с формы (получатель)         |
| `FRONTEND_URL`   | Точный origin вашего фронтенда, например `https://example.com` (для CORS)|

**Важно:** `CONTACT_EMAIL` задаётся только на сервере и никогда не берётся из тела запроса —
пользователь не может подменить получателя письма.

## 3. Как получить SMTP credentials

Варианты (любой на выбор):

- **Gmail**: включите двухфакторную аутентификацию в аккаунте Google и создайте
  [App Password](https://myaccount.google.com/apppasswords). Используйте его как `SMTP_PASSWORD`,
  `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`.
- **Транзакционные почтовые сервисы** (рекомендуется для production): [Resend](https://resend.com),
  [Postmark](https://postmarkapp.com), [SendGrid](https://sendgrid.com), [Mailgun](https://www.mailgun.com),
  [Amazon SES](https://aws.amazon.com/ses/). Каждый из них выдаёт SMTP host/port/user/password в своей панели
  управления после верификации домена отправителя.
- **Свой почтовый сервер / хостинг-провайдер**: SMTP-данные обычно есть в панели управления почтой
  (cPanel, Plesk и т.д.).

## 4. Запуск development-сервера

```bash
npm run dev
```

Использует `tsx watch` — сервер перезапускается автоматически при изменении файлов.

## 5. Production build

```bash
npm run build
npm start
```

`npm run build` компилирует TypeScript в `dist/`, `npm start` запускает скомпилированный `dist/server.js`.

### Docker

```bash
docker build -t contact-backend .
docker run --env-file .env -p 3000:3000 contact-backend
```

## 6. API

### `POST /api/contact`

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello! I would like to contact you."
}
```

Правила валидации (Zod):

- `name` — строка, обязательное, 1–100 символов, обрезаются пробелы по краям
- `email` — строка, обязательное, валидный email
- `message` — строка, обязательное, 1–5000 символов, обрезаются пробелы по краям
- любые лишние/неизвестные поля в теле запроса приводят к ошибке валидации (400)

Успешный ответ — `200 OK`:

```json
{ "success": true }
```

Ошибка валидации — `400 Bad Request`:

```json
{ "success": false, "message": "Invalid request data" }
```

Внутренняя ошибка (например, недоступен SMTP) — `500 Internal Server Error`:

```json
{ "success": false, "message": "Failed to send message" }
```

Слишком много запросов — `429 Too Many Requests`:

```json
{ "success": false, "message": "Too many requests. Please try again later." }
```

### `GET /health`

Простой health-check, возвращает `{ "status": "ok" }`. Не защищён rate limit'ом отдельно
(использует общий лимит), полезен для мониторинга/Docker healthcheck.

## 7. Пример `curl`

```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-landing-page.com" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello! I would like to contact you."
  }'
```

## 8. Пример запроса с frontend (fetch)

```js
async function sendContactForm(data) {
  const response = await fetch("https://your-api-domain.com/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Something went wrong");
  }

  return result;
}

sendContactForm({
  name: "John Doe",
  email: "john@example.com",
  message: "Hello! I would like to contact you.",
});
```

## CORS

CORS настроен через `@fastify/cors` так, что запросы принимаются **только** с origin,
указанного в `FRONTEND_URL`. Разрешён только метод `POST` (плюс служебный `OPTIONS` для preflight).
Запросы с любого другого origin будут отклонены браузером.

## Rate limiting

- Глобальный лимит на весь сервер: 100 запросов за 15 минут с одного IP (`@fastify/rate-limit`).
- Дополнительный, более строгий лимит именно на `/api/contact`: **5 запросов за 15 минут с одного IP**,
  чтобы форму нельзя было использовать для спам-рассылки или перебора.

При превышении лимита возвращается `429 Too Many Requests`.

## Прочая безопасность

- `@fastify/helmet` — стандартные security-заголовки (CSP, `X-Frame-Options`, `X-Content-Type-Options` и т.д.).
- `bodyLimit: 100 KB` в Fastify — защита от чрезмерно больших тел запроса.
- Zod-схема со `.strict()` — отклоняет любые неожиданные поля в теле запроса (например, попытку
  передать свой `to`/получателя).
- Получатель письма (`CONTACT_EMAIL`) всегда берётся из переменных окружения на сервере, а не из запроса.
- `Reply-To` в письме выставляется только из **валидированного** email из формы.
- Централизованный обработчик ошибок Fastify не отдаёт клиенту stack trace или детали SMTP-ошибок.
- SMTP-пароль нигде не логируется (Fastify-логгер логирует только объект ошибки при сбое отправки,
  без содержимого SMTP-конфига).
