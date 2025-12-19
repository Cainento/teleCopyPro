# 🚀 TeleCopy Pro

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white)](https://stripe.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**TeleCopy Pro** is a high-performance, professional-grade Telegram channel copying solution. Built with a modern microservices-inspired architecture, it allows users to synchronize messages between channels in real-time or perform historical migrations with ease.

---

## ✨ Features

### 🛠️ Backend (FastAPI)
- **Object-Oriented Architecture**: Clean, maintainable service layer.
- **Telegram Integration**: Robust connection handling using Telethon with 2FA support.
- **Subscription Management**: Full Stripe integration for monthly and annual billing.
- **Smart Copying**: Supports both historical message blocks and real-time message monitoring.
- **Security**: JWT authentication, encrypted session storage, and webhook signature verification.
- **Reliability**: Structured logging and comprehensive exception handling.

### 🎨 Frontend (Modern Web)
- **Modern UI/UX**: Premium design with glassmorphism and smooth animations.
- **Plan Management**: Integrated billing toggle (Monthly/Annual) with Stripe Checkout.
- **Dynamic Dashboard**: Real-time status monitoring for Telegram sessions and copy jobs.
- **Responsive Design**: Fully functional across desktop and mobile devices.

---

## 🏗️ Project Structure

```text
telegram_copier/
├── backend/                # FastAPI Application
│   ├── app/
│   │   ├── api/            # REST Endpoints (Auth, Telegram, Stripe)
│   │   ├── core/           # Security and Utilities
│   │   ├── database/       # Models, Repositories, Migrations
│   │   ├── services/       # Business Logic (Stripe, Telegram, User)
│   │   └── main.py         # Entry Point
│   ├── alembic/            # Database Migrations
│   └── Dockerfile          # Container Configuration
├── frontend/               # Next.js/React Application
│   ├── src/
│   │   ├── api/            # API Clients (Stripe, Telegram)
│   │   ├── features/       # Modular Feature Components
│   │   ├── components/     # Global UI Components
│   │   ├── context/        # State Management
│   │   └── utils/          # Utility functions
│   └── vercel.json         # Deployment Config
└── ...
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Telegram API Credentials ([my.telegram.org](https://my.telegram.org))
- Stripe Account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Cainento/teleCopyPro.git
   cd telegram_copier
   ```

2. **Setup Backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your credentials
   pip install -r requirements.txt
   alembic upgrade head
   python -m app.main
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

> [!TIP]
> For a detailed walkthrough, see our [Full Setup Guide](SETUP.md).

---

## 💳 Subscription Plans

| Feature | Free | Premium | Enterprise |
| :--- | :---: | :---: | :---: |
| Historical Jobs | 1 | 20 | Unlimited |
| Messages / Day | 100 | 10,000 | Unlimited |
| Real-time Jobs | ❌ | 5 | Unlimited |
| Media Support | ✅ | ✅ | ✅ |
| Support | Community | Priority | 24/7 Dedicated |

---

## 🛠️ Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, Telethon, Pydantic, Alembic.
- **Frontend**: JavaScript/TypeScript, React/Next.js (Legacy modular structure in place).
- **Database**: PostgreSQL (Production) / SQLite (Dev).
- **Payment**: Stripe API.
- **DevOps**: Docker, Fly.io, Vercel.

---

## 📄 Documentation

- [Project Setup](SETUP.md)
- [Stripe Integration Guide](STRIPE_ENVIRONMENT_SWITCHING.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Database Schema](DATABASE_SETUP.md)

---

## 📜 License

Copyright © 2025 TeleCopy Pro. All rights reserved. Licensed under the MIT License.

---
*Created with ❤️ by Avila Cainan.*
