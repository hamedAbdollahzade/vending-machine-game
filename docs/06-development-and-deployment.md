# اجرا، تست، انتشار و نگهداری

## محیط توسعه

```sh
npm ci
npm run dev
node --test tests/*.test.js
npm run build
npm run preview
```

در محیط این مخزن طبق `/home/hamed/.codex/RTK.md` فرمان‌های shell با `rtk` پیشوند اجرا می‌شوند؛ مثال `rtk npm run build`. خروجی dist تولیدی و در gitignore است. Node 22 با CI هماهنگ است. query `?debug` شیء window.game را برای بررسی state/player/car/cam/payment/route و ابزارهای موجود در انتهای main در دسترس می‌گذارد؛ این دسترسی فقط ابزار توسعه است.

## پوشش تست فعلی

| فایل | تعریف تست | پوشش |
|---|---:|---|
| payment.test.js | ۳ | برداشت یک بار، مرحلهٔ ready، انصراف/بسته/نامعتبر/پول، قیمت و ساعت |
| scoring.test.js | ۲ | کشف/ترکیب/پنج دسته، درجه و جایزهٔ مأموریت |
| realworld.test.js | ۴ | smoothFix، arrival/bounds، stabilizer، quaternion و FOV |
| world.test.js | ۷ | geo، collision، مسیر کارخانه/دستگاه، خودرو، one-way ترافیک، binary و tile |

در تاریخ مبنا همهٔ این فایل‌ها موفق اجرا شدند. runner خروجی را به چهار فایل تجمیع کرده؛ عدد چهار در خلاصهٔ خروجی تعداد فایل‌هاست. تست browser E2E، اجرای فیزیکی گوشی، CI واقعی، build Docker و سایت زنده در این بازبینی اجرا نشده‌اند.

## GitHub Pages

`.github/workflows/pages.yml`: push به main یا اجرای دستی؛ checkout، Node22/npm ci، تست، build، configure-pages، upload فقط dist و deploy-pages با مجوز pages/id-token. در Settings → Pages، Source باید GitHub Actions باشد. `base:'./'` برای مسیر مخزن است. لینک ثبت‌شدهٔ پروژه: https://hamedabdollahzade.github.io/vending-machine-game/ (دسترس‌پذیری فعلی بررسی نشده).

## Docker مستقل

Dockerfile: build با node:22-alpine و npm ci + تست + build؛ runtime caddy:2.8.4-alpine و dist در /srv. Compose ریشه از سورس build، پورت‌های ۸۰/۴۴۳ و volume گواهی دارد؛ SITE_ADDRESS پیش‌فرض robotmarkets.ir و www.robotmarkets.ir، NPM_REGISTRY قابل تنظیم. در این مدل Caddy مسئول TLS است.

```sh
docker compose up -d --build
```

Caddy assets hashed را immutable یک‌ساله؛ HTML/SW/manifest را no-cache؛ mapdata را یک هفته cache می‌کند. zstd/gzip و headerهای geolocation/camera/sensor و nosniff تنظیم‌اند. try_files ناشناخته را به index.html می‌فرستد؛ برای فایل دادهٔ گمشده باید این رفتار در QA در نظر گرفته شود.

## Gitea فعلی؛ تفاوت مهم با README قدیمی

گردش‌کار `.gitea/workflows/ci-cd.yml` فعلی از SSH deployment استفاده نمی‌کند. توضیح قدیمی DEPLOY_HOST/DEPLOY_SSH_KEY در README برای این workflow معتبر نیست.

1. test job روی Node22: npm ci، تست و build؛ timeout پانزده دقیقه.
2. publish برای main و غیر PR: Docker build، push تصویر با tag زمان/run/SHA به git.my-rm.com، سپس تلاش link package به مخزن. ناموفق بودن link مانع انتشار تصویر نمی‌شود. timeout سی دقیقه.
3. deploy با image خروجی publish و Docker daemon مشترک runner/server: compose pull و up از `deploy/docker-compose.yml`، نمایش ps و image prune. timeout پانزده دقیقه.
4. HEALTH_URL اختیاری برای پاسخ HTTP تست می‌شود؛ این تست صحت بازی یا CSS/WebGL را تضمین نمی‌کند.

نیازها: secretهای REGISTRY_USERNAME و REGISTRY_TOKEN با مجوز package read/write؛ variable اختیاری NPM_REGISTRY و HEALTH_URL؛ runner دارای Docker CLI/Compose و دسترسی socket daemon میزبان. مقدار secretها در مستندات نوشته نشود.

Compose مخصوص deploy تصویر آمادهٔ IMAGE را می‌گیرد، container_name برابر vending-machine-game و شبکهٔ خارجی frontend_proxy دارد. پورت میزبان publish نمی‌کند؛ SITE_ADDRESS=:80 و TLS با Nginx Proxy Manager بیرون container است. پس آن را با compose ریشه که Caddy TLS دارد یکی ندانید.

## کنترل تغییر

قبل از کار git status و remote را بررسی کنید؛ origin را GitHub فرض نکنید (README از origin در Gitea و remote github یاد می‌کند). build محلی به معنی انتشار نیست. برای هر تسک، تست مرتبط + build و بررسی diff لازم است؛ تغییر داده/زیرساخت نیازمند بررسی خاص خود است. این مستندات خودشان دستور push یا deploy نیستند.
