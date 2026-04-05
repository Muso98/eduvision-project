# EduVision — Hetzner CX23 Deployment Guide

## Talablar
- Hetzner Cloud CX23 server (4 vCPU, 4GB RAM, 40GB SSD NVMe)
- Ubuntu 22.04 LTS operatsion tizimi (Hetzner bilan tanlang)
- GitHub repozitoriyasi

---

## Qadamlar

### 1. Server yaratish (Hetzner Cloud Console)

1. [console.hetzner.cloud](https://console.hetzner.cloud) ga kiring
2. **New Project** → `EduVision` deb nomlang
3. **Add Server** tugmachasini bosing:
   - **Location:** Falkenstein yoki Helsinki
   - **Image:** `Ubuntu 22.04`
   - **Type:** `CX23` (2 vCPU, 4GB RAM)
   - **SSH Key:** O'zingizning SSH kalitingizni qo'shing
4. Server IP manzilini eslab qoling (masalan, `65.21.X.X`)

---

### 2. Serverga ulanish

```bash
ssh root@YOUR_SERVER_IP
```

---

### 3. Swap File yaratish (MUHIM — RAM yetishmasligi oldini olish)

4GB RAMni AI modullari yeb qo'ymasligi uchun 4GB Swap qo'shamiz:

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Har restart'da ham ishlashi uchun:
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Tasdiqlash (Swap ko'rinishi kerak):
free -h
```

---

### 4. Docker va Docker Compose o'rnatish

```bash
# Tizimni yangilash
apt-get update && apt-get upgrade -y

# Docker o'rnatish
curl -fsSL https://get.docker.com | sh

# Docker Compose V2 (Docker bilan birga keladi, tekshiring)
docker compose version

# Agar kelmasa:
apt-get install -y docker-compose-plugin
```

---

### 5. Kodni serverga yuklash

**Variant A — Git orqali (tavsiya):**
```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/eduvision.git
cd eduvision
```

**Variant B — Github bizda bo'lmasa, fayllarni ko'chirish:**
```bash
# Mahalliy kompyuterdan (PowerShell yoki cmd):
scp -r "D:\Projects for clients\EduVision Classroom Analytics Platform" root@YOUR_SERVER_IP:/opt/eduvision
```

---

### 6. .env.production faylini sozlash

```bash
cd /opt/eduvision
cp .env.example .env.production
nano .env.production
```

Quyidagi qiymatlarni to'ldiring:
```env
SECRET_KEY=bu-yerga-kamida-50-belgili-tasodifiy-kod-yozing
DEBUG=False
ALLOWED_HOSTS=65.21.X.X   # Hetzner serveringiz IP manzili

DB_USER=eduvision_user
DB_PASSWORD=kuchli-parol-yozing
DB_NAME=eduvision

NEXT_PUBLIC_API_URL=http://65.21.X.X
NEXT_PUBLIC_WS_URL=ws://65.21.X.X
```

> **Muhim:** `Ctrl+X`, keyin `Y`, keyin `Enter` — saqlash uchun.

---

### 7. Rasmlarni yig'ish va ishga tushirish

```bash
cd /opt/eduvision

# Barcha Docker rasmlarini qurish (10-20 daqiqa ketishi mumkin)
docker compose up --build -d

# Jarayonni kuzatish:
docker compose logs -f
```

---

### 8. Tekshirish

```bash
# Barcha xizmatlar ishlayaptimi?
docker compose ps

# Backend sog'lommi?
curl http://localhost/api/users/me/

# Loglar:
docker compose logs backend
docker compose logs nginx
```

Brauzerda: `http://YOUR_SERVER_IP` — sayt ochilishi kerak!

---

### 9. Test ma'lumotlarni yuklash (ihtiyoriy)

```bash
# Django shell orqali test foydalanuvchi yaratish:
docker compose exec backend python manage.py createsuperuser
```

---

## Foydali buyruqlar

```bash
# Xizmatlarni to'xtatish:
docker compose down

# Qayta ishga tushirish:
docker compose restart

# Yangi kod deploymennt (git orqali):
git pull
docker compose up --build -d

# RAM va disk ishlatilishini ko'rish:
docker stats
df -h
free -h
```

---

## Muammolar va yechimlar

| Muammo | Yechim |
|--------|--------|
| Container start bo'lmaydi | `docker compose logs XIZMAT_NOMI` |
| RAM yetishmaydi | `free -h` — Swap faolmi? |
| Disk to'lib qoldi | `docker system prune -a` |
| Port 80 band | `ss -tlnp | grep 80` |
