# معماری و فناوری

## پشتهٔ فعلی

JavaScript ES Modules، Three.js/WebGL، Vite، HTML و CSS فارسی RTL و Canvas 2D برای نقشه، تابلو، تکسچر و portrait. فونت Vazirmatn با Fontsource داخل bundle می‌آید. نسخهٔ lock فعلی: Three.js `0.180.0`، Vite `6.4.4`، Fontsource `5.2.5`؛ در package.json نسخه‌ها بازهٔ caret دارند. Node 22 در CI/Docker استفاده می‌شود؛ target خروجی ES2022 برای top-level await است. TypeScript، React، موتور فیزیک بیرونی و framework رابط در بازی وجود ندارند.

## نقشهٔ ماژول‌ها

| فایل | مسئولیت |
|---|---|
| main.js | bootstrap، DOM، player/mode/camera، حلقه، اتصال پرداخت و جایزه، GPS/AR، UI و debug |
| game-state.js | catalog، پول و ساعت، خرید، blockers و امکان ادامه با بودجه |
| payment.js | ماشین حالت تراکنش و جلوگیری از برداشت دوباره |
| scoring.js | XP، درجه، مأموریت و جایزهٔ مأموریت |
| locations.js | مشخصات کارخانه، دستگاه‌ها، test points و مناطق قفل |
| characters.js | createFamily معمولی (پدر/کودک) و robot-only، مفصل و انیمیشن |
| factory.js | ساختمان/دکور/کارخانه، کارکنان، موقعیت spawn، talks، مدیر و کامیون |
| staff.js | مدل کارکنان مفصلی و crew به شکل InstancedMesh |
| car-models.js | سدان خانواده، کامیون و helperهای مشترک بدنه |
| luxuryCars.js | ماشین‌های لوکس مشکی به سبک بوگاتی، لامبورگینی، مزدا و نیسان |
| vehicle.js | state و فیزیک آرکید ماشین (`CAR`) |
| vehicleCollision.js | برخورد جعبهٔ جهت‌دار وسیله‌ها و هل‌دادن پیاده از وسیلهٔ پارک‌شده |
| garage.js | فهرست وسیله‌های سوارشدنی، سوار/پیاده، برخورد رانندگی و reset |
| traffic.js | ماشین‌های NPC، spawn و حرکت روی شبکهٔ اصلی و one-way داده |
| city.js | مدل شهر، زمین fallback، ساختمان، فضای سبز و chunk visibility |
| collision.js | spatial grid چندضلعی‌ها، resolveCircle و clearFraction دوربین |
| routing.js | گراف پیاده/سواره، A*، نزدیک‌ترین node/segment و طول مسیر |
| geo.js | تبدیل lat/lon و مختصات محلی، bearing و فاصلهٔ فارسی |
| map-render.js | minimap، fullmap و نقشهٔ استان‌های ایران با Canvas |
| vending.js | مدل دستگاه، slot، card، flap، beacon و محصول تحویلی |
| imagery.js | کاشی ماهواره‌ای، تبدیل Web Mercator، بارگذاری/آزادسازی texture |
| buildings-data.js | decode فایل باینری RMB2 |
| realworld.js | smoothFix، stabilizer، geolocation/compass و شعاع رسیدن |
| ar.js | rear camera، حسگر جهت، quaternion و تطبیق FOV |
| pwa.js | نصب، ثبت SW، اعلان نسخه و reload |
| textures.js | ساخت CanvasTexture مشترک |
| style.css / index.html | ساختار DOM، HUD، modalها و ظاهر desktop/mobile |

## جریان داده

`locations/catalog + map JSON + public binary/index → ساخت world/graph/collision → reset → requestAnimationFrame`.

حلقهٔ اصلی dt را عادی به ۰٫۲۵ ثانیه محدود و با گام‌های حداکثر ۱/۳۰ شبیه‌سازی می‌کند؛ debug حداکثر ۱ ثانیه دارد. در حالت فعال: ساعت، حرکت، payment، delivery، traffic؛ سپس route، hints، talks و guide. پس از آن انیمیشن‌ها، دوربین، HUD و render اجرا می‌شوند. توقف شبیه‌سازی الزاماً همهٔ انیمیشن‌های بصری را متوقف نمی‌کند.

`main.js` وضعیت مرکزی را در متغیرهای ماژولی نگه می‌دارد؛ event bus یا store جدا نداریم. `state` اقتصادی از `player/car/cam/real` جداست. `payment` در اتصال UI فیلدهای اضافی station/timer/delivering می‌گیرد که در createPayment تعریف نشده‌اند. Object.assign به createPayment فیلدهای اضافی را حذف نمی‌کند؛ هنگام refactor به این وابستگی توجه شود.

## قرارداد توسعه

- محاسبهٔ قیمت فقط از priceAt و catalog؛ UI نسخهٔ دوم قیمت نسازد.
- برداشت فقط در swipe موفق؛ XP/مأموریت پس از تحویل؛ busy تا پایان تحویل.
- دستگاه با id پایدار معرفی شود؛ مأموریت‌ها و خریدهای ذخیره‌شوندهٔ آینده به id وابسته‌اند.
- مبنای geo تغییر نکند مگر همهٔ JSON/binary/anchorها و تست‌ها با هم مهاجرت کنند.
- تغییر mode باید مسیر، دوربین، ورودی و HUD را در نظر بگیرد؛ تغییر real/AR باید lifecycle stream/sensor را هم رعایت کند.
- geometry، material و texture پویا هنگام حذف آزاد شوند؛ مدل تازه نباید هر frame asset بسازد.
- main.js حدود ۱۴۴۳ و factory.js حدود ۶۹۸ خط‌اند؛ جداسازی تدریجی ممکن است، ولی بازنویسی سراسری برای یک تسک کوچک ضرورت ندارد.

backend اختصاصی بازی وجود ندارد. Gitea Registry و Caddy زیرساخت build/میزبانی‌اند، نه API بازی. GPS و تصویر دوربین در این کد به سرور بازی ارسال نمی‌شوند؛ سرویس مکان‌یابی مرورگر و دانلود assetها همچنان محیط بیرونی خود را دارند.
