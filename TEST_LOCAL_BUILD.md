# 🧪 Hướng Dẫn Test Local Build Frontend

## ✅ Checklist trước khi build

- [ ] Đã tạo Docker network: `docker network create tagweb_shared_network` (nếu chưa có)
- [ ] Backend containers đang chạy: `tagweb_backend`, `tagweb_mysql`, `tagweb_rabbitmq`
- [ ] Đã kiểm tra Backend API hoạt động: `docker exec tagweb_backend curl http://localhost:8080/api/v1/public/health`

---

## 🔨 Bước 1: Build Frontend Image

```bash
cd Frontend/HistoryTAG_FE

# Build với các environment variables mới
docker-compose build --no-cache frontend

# Hoặc build trực tiếp với docker
docker build \
  --build-arg VITE_API_URL="" \
  --build-arg VITE_NOTIFICATION_STOMP_URL="" \
  --build-arg VITE_LOGOUT_URL="/api/v1/auth/logout" \
  -t tagweb_frontend:test .
```

---

## 🚀 Bước 2: Chạy Frontend Container

```bash
# Chạy frontend container
docker-compose up -d frontend

# Kiểm tra container đang chạy
docker ps | grep tagweb_frontend

# Xem logs
docker logs tagweb_frontend -f
```

---

## 🧪 Bước 3: Test Kết Nối

### 3.1. Test Frontend có thể kết nối đến Backend

```bash
# Test từ Frontend container đến Backend
docker exec tagweb_frontend wget -O- http://tagweb_backend:8080/api/v1/public/health

# Kết quả mong đợi: JSON response từ backend
```

### 3.2. Test Nginx Proxy

```bash
# Test Nginx proxy /api đến Backend
docker exec tagweb_frontend wget -O- http://localhost:80/api/v1/public/health

# Kết quả mong đợi: JSON response từ backend (qua Nginx proxy)
```

### 3.3. Test từ Browser (nếu Frontend expose port 80)

```bash
# Nếu frontend expose port 80 ra host (trong docker-compose.yml)
# Truy cập: http://localhost/api/v1/public/health

# Hoặc test frontend UI
# Truy cập: http://localhost
```

---

## ✅ Bước 4: Kiểm Tra Environment Variables

### 4.1. Kiểm tra build có đúng environment variables không

```bash
# Vào trong container và kiểm tra
docker exec -it tagweb_frontend sh

# Xem file build (nếu có thể)
# Hoặc test từ browser console (F12):
# console.log(import.meta.env.VITE_API_URL)  // Phải là ""
# console.log(import.meta.env.VITE_LOGOUT_URL)  // Phải là "/api/v1/auth/logout"
```

### 4.2. Test API calls từ Frontend

Mở browser console (F12) và test:

```javascript
// Test API call
fetch('/api/v1/public/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Phải trả về JSON từ backend
```

---

## 🔒 Bước 5: Kiểm Tra Security Headers

```bash
# Test security headers
curl -I http://localhost

# Phải thấy các headers:
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: ...
```

---

## ✅ Checklist Sau Khi Test

- [ ] Frontend container chạy thành công
- [ ] Frontend có thể kết nối đến Backend (trong Docker network)
- [ ] Nginx proxy `/api` hoạt động đúng
- [ ] Environment variables đúng (empty string cho API URL)
- [ ] Security headers có trong response
- [ ] API calls từ browser hoạt động (nếu test được)

---

## 🐛 Troubleshooting

### Lỗi: Container không start

```bash
# Xem logs chi tiết
docker logs tagweb_frontend

# Kiểm tra nginx config
docker exec tagweb_frontend nginx -t
```

### Lỗi: Không kết nối được đến Backend

```bash
# Kiểm tra network
docker network inspect tagweb_shared_network

# Kiểm tra cả 2 containers trong cùng network
docker ps --filter "network=tagweb_shared_network"
```

### Lỗi: API calls bị CORS

- Kiểm tra Backend CORS config đã có `localhost` chưa
- Kiểm tra Backend đang chạy: `docker ps | grep tagweb_backend`

---

## 🚀 Sau Khi Test Thành Công

Nếu tất cả test đều OK, có thể deploy lên server:

1. Push code lên Git (nếu cần)
2. Trên server: Pull code và build lại
3. Deploy theo hướng dẫn trong `CLOUDFLARE_TUNNEL_DEPLOY_GUIDE.md`

