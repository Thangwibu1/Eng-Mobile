# AuraEnglish Mobile

Ứng dụng React Native Expo được chuyển thể từ giao diện `frontend` hiện tại.

## Chạy ứng dụng

```bash
npm install
copy .env.example .env
npm start
```

## Biến môi trường

Mobile chỉ cần một biến public, không đưa `JWT_SECRET`, `MONGODB_URI` hoặc mật khẩu vào đây:

```env
EXPO_PUBLIC_API_URL=https://api-eng.ngocthang.io.vn/api
```

File `.env` trong project đã được cấu hình sẵn bằng API production ở trên.

Nếu chạy backend local:

- Điện thoại thật cùng Wi-Fi: `http://10.10.2.119:4000/api` (IP có thể đổi khi kết nối lại mạng).
- Android Emulator: `http://10.0.2.2:4000/api`.
- iOS Simulator: `http://localhost:4000/api`.

Sau mỗi lần đổi `.env`, khởi động lại Metro với `npx expo start -c`.

```bash
npm run android
npm run ios
npm run web
```
