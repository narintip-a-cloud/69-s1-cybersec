# Cyber Security

Strapi backend (v4.16) สำหรับงานเภอร์ มี content type `student`, `subject`, `teacher`, `mapping`
รันด้วย Docker Compose ทั้งหมด (Postgres, Strapi, pgAdmin, MailHog)

## เริ่มใช้งาน

```bash
cp env.simple .env      # แก้ค่าให้ครบ (รหัสผ่าน, port ต่าง ๆ)
docker compose up -d    # db จะรอจน healthy ก่อน strapi เริ่มทำงาน
docker compose logs -f app
```

| Service | URL | หมายเหตุ |
| --- | --- | --- |
| Strapi admin panel | http://localhost:9091/admin | เปิดครั้งแรกต้องไป `/admin/register-admin` เพื่อสร้าง super admin |
| Strapi API | http://localhost:9091/api | ต้องใช้ API token หรือ JWT ของ user |
| MailHog (อีเมล) | http://localhost:8025 | รับอีเมล reset password ทุกฉบับ ไม่ต้องต่อ SMTP ของจริง |
| pgAdmin | http://localhost:8081 | user/password คือค่าใน `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` |
| Postgres | `localhost:54327` | port จริงอ่านจาก `POSTGRES_PORT` |

## ไฟล์ config ที่ mount เข้า container

| ไฟล์ | ทำไมต้องมี |
| --- | --- |
| `config/plugins.js` | ตั้ง email plugin ให้ส่งผ่าน MailHog (`silent: true` ไม่ขึ้น error ตอนส่งไม่สำเร็จ) |
| `config/server.js` | ตั้ง `url` จาก `APP_URL` ไม่งั้นลิงก์ในอีเมล reset password จะชี้ `http://0.0.0.0:1337` หรือไม่มี URL เลย |

## ทดสอบ API

ใช้ไฟล์ `api.http.simple` (เป็น template ที่ commit ไว้) หรือ `api.http` (มีค่าจริงของแต่ละคน ไม่ถูก track ใน git)
เปิดด้วย REST Client ของ VS Code แล้วกด Send Request ทีละอันจากบนลงล่าง

ลำดับที่ต้องทำตาม

1. `POST /admin/login` เก็บ token ของ admin
2. `POST /admin/api-tokens` เก็บ `accessKey` (โชว์ครั้งเดียว)
3. เอา `accessKey` ไปใส่ใน `Authorization` ของทุก request กลุ่ม `/api/<content-type>`

ข้อควรระวังที่เจอจากการทดสอบจริง

- JWT ของ admin ใช้กับ `/api/*` ไม่ได้ ต้องเป็น API token (ไม่งั้นได้ 401)
- `POST /admin/reset-password` ใช้ชื่อฟิลด์ `resetPasswordToken` ส่วน user ใช้ `code` + `passwordConfirmation`
- code สำหรับ reset ของ admin ยาว 40 ตัวอักษร ของ user ยาว 128 ตัวอักษร
- `POST /admin/login` มี rate limit ยิงซ้ำ ๆ ติด ๆ แล้วได้ 429 ต้องรอสัก 3-5 นาที
- content type ทุกตัวเปิด `draftAndPublish` และสร้างผ่าน API แล้วถือว่า published แล้ว
- `student.mobile` ถูก hash ด้วย md5 ใน lifecycle `beforeCreate` (validate ก่อน hash เท่านั้น
  ค่าที่บันทึกจึงเป็น hash ยาว 32 ตัว ไม่ใช่เบอร์โทร และค้นด้วยเบอร์จริงไม่ได้)
- `PUT /api/users/me` ได้ 403 เพราะ role `Authenticated` ไม่มี permission
  `plugin::users-permissions.user.update` (action นี้ไม่มีในรายการ permission ของระบบ)
- Public/Authenticated role ยังไม่มี permission ของ content type เดียวกันนั้นจะได้ 403 ต้องเปิดที่
  Settings > Users & Permissions > Roles ก่อน
- ลิงก์ reset password ของ user มาจาก Settings > Users & Permissions > Advanced settings >
  `Reset password page` ซึ่งต้องชี้ไปหน้า reset password ของ frontend ตัวจริง
- route ของ plugin ในระบบนี้ไม่มี prefix `/admin` เช่น `PUT /users-permissions/advanced`
  `GET /content-manager/...` ส่วน route ของ core ใช้ `/admin/...` เช่น `/admin/api-tokens`
  ถ้ายิงผิดทางจะได้ HTML ของหน้า admin panel แทน JSON (ดูสับสนเพราะได้ 200)
- `PUT /users-permissions/advanced` เขียนทับ settings ทั้งชุด ต้องส่งทุก field กลับไปด้วย
  ถ้าส่งแค่ field เดียวค่า `allow_register` จะกลายเป็น `false` แล้ว register ไม่ได้

## ปัญหาที่เจอระหว่างตั้งค่า (แก้ให้แล้วในไฟล์นี้)

- Strapi เคย crash ตอน start เพราะรอ Postgres ไม่พร้อม แก้โดยใส่ `healthcheck` ของ `db`
  และ `depends_on: condition: service_healthy` พร้อม `restart: unless-stopped`
- ลิงก์ในอีเมล reset password ของ admin ชี้ `http://0.0.0.0:1337` และของ user ไม่มี URL เลย
  เพราะ `config/server.js` ไม่ได้ตั้ง `url` แก้แล้วโดย mount `config/server.js` เข้าไปพร้อมค่า `APP_URL`
- ประกาศ `volumes: data-postgres:` แต่ไม่ได้ใช้ (ใช้ bind mount แทน) จึงตัดออก
- ค่า `MAILHOG_PORT` / `MAILHOG_UI_PORT` ใน `.env` เดิมไม่ถูกใช้ ตอนนี้ compose อ่านจากตัวแปรนี้แล้ว
- รหัสผ่านของ admin ใน `.env` เดิมไม่ตรงกับที่บันทึกไว้ในฐานข้อมูล (`Invalid credentials`) แก้ได้ด้วย
  ขั้นตอน forgot-password -> อ่าน code จาก MailHog -> `POST /admin/reset-password`

## My Information

- Phatsanun Piamyanon
- 0568604050XXX
- อยากได้ความรู้เกี่ยวกับไซเบอร์ในการทำงานจริงว่าเป็นยังไง
