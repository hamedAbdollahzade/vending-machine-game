# جهان، نقشه، داده‌ها و دارایی‌ها

## مختصات و قرارداد فایل

مبدأ `ORIGIN = {lat:36.315, lon:59.539}`، هر واحد یک متر، +X شرق و -Z شمال. تبدیل صفحهٔ مماس محلی با latitude/longitude انجام می‌شود؛ terrain ارتفاع جغرافیایی واقعی ندارد. جهت heading ماشین با `(cos(h), -sin(h))` در صفحهٔ XZ است. bearing صفر شمال و ۹۰ شرق است.

محدودهٔ فعلی: X از -۱۲۲۲۰ تا ۳۱۵۹؛ Z از -۱۶۴۵۱ تا ۲۰۷۸. `scripts/build-map-data.mjs` REGION را از lat 36.298 تا 36.462 و lon 59.405 تا 59.572 می‌گیرد.

`src/data/mellat.json`: origin، attribution، bounds، roadTypes، areaKinds، names، roads، buildings، areas، oneway، labels. snapshot: ۶۱۹۶ road، ۳۹۸۶ ساختمان OSM، ۲۶۸ area، ۲۹۱۰ شاخص road یک‌طرفه و ۹۵ label. این شمارش‌ها تعداد رکورد فایل‌اند، نه شمارش همهٔ خیابان‌های واقعی.

- road: `[typeIndex, nameIndex, x0, z0, x1, z1, ...]`
- building در runtime: `[height, x0, z0, ...]`
- جدول names برای lookup نام road استفاده می‌شود.
- دادهٔ استان‌ها در `src/data/iran.json` است.

## گراف و برخورد

buildGraph گراف پیاده با همهٔ مسیرها، و سواره با road type ≤ 7 می‌سازد. نزدیک‌ترین node از بزرگ‌ترین مؤلفهٔ متصل انتخاب می‌شود؛ A* با هزینهٔ طول کار می‌کند. connector ابتدا/انتهای مسیر به node نزدیک، خط مستقیم است. گراف فعلی دوطرفه است؛ oneway در routing مصرف نمی‌شود، هرچند traffic از آن استفاده می‌کند.

خط طلایی روی زمین فقط تا حدود ۷۰۰ متر از polyline ساخته می‌شود. نقشهٔ کامل و minimap مسیر کامل را می‌گیرند. هدف معمولاً مأموریت فعال است؛ waypoint دستی مقدم است و پس از خرید/اعلام مأموریت بعدی می‌تواند پاک شود.

برخورد بر مبنای footprintهای OSM + Microsoft + factory است؛ spatial cell برابر ۲۴ متر. resolveCircle برای player، خودرو و نقاط spawn استفاده می‌شود. clearFraction مانع ردشدن خط دید دوربین از دیوار می‌شود. ساختمان‌های Microsoft داخل محوطهٔ کارخانه کنار گذاشته می‌شوند.

## دارایی‌ها و بهینه‌سازی

- `public/data/buildings.bin`: قالب RMB2؛ header شامل count، minX، minZ، quantization step؛ هر polygon تعداد رأس/ارتفاع نیم‌متری و مختصات delta دارد. در snapshot بررسی‌شده ۱۴۱٬۴۹۷ ساختمان و ۳٬۴۷۸٬۹۱۰ بایت دارد. ارتفاع‌ها تخمینی‌اند. decoder فعلی برای فایل کوتاه/خراب اعتبارسنجی کامل ندارد.
- city بخش‌های ۲۰۰۰ متری و ساختمان‌ها بلوک‌های ۵۰۰ متری دارد؛ ساخت/visibility وابسته به فاصله است. worker و props با instancing کاهش draw call دارند.
- `public/imagery/index.json`: ۳۴۰ tile زوم۱۵ و ۶۶۰ tile زوم۱۷ (مجموع ۱۰۰۰ JPG). imagery هم‌زمان حداکثر ۶ درخواست می‌فرستد؛ tileهای دور geometry/material/texture آزاد می‌کنند.
- زوم۱۷: شعاع ۴۵۰ متر در low و ۷۵۰ در high؛ زوم۱۵: ۱۸۰۰ و ۲۸۰۰. محدودهٔ حذف ۱٫۲ برابر range است.
- زمین ماهواره‌ای با `SATELLITE_GROUND = false` در `src/constants/world.js` خاموش است. در این حالت index دانلود نمی‌شود و زمین و جاده‌ها از OSM کشیده می‌شوند. اگر روشن شود و index موجود باشد، زمین/جادهٔ procedural شهر جایگزین می‌شود. نبود دانلود bin/index fallback دارد؛ index موجود با JPGهای غایب لزوماً به fallback بدون تصویر تبدیل نمی‌شود.
- portraitهای روبات: front، happy، wink، surprised، laugh، love، curious، serious، excited؛ نام فایل با face زیرنویس تطبیق دارد.
- آیکون‌های PWA در `public/icons` و manifest در `public/manifest.webmanifest` هستند.

## بازتولید داده

```sh
node scripts/build-map-data.mjs --osm city.json zone-factory.json corridor.json major.json --poi poi.json --provinces ne_10m_admin_1_states_provinces.geojson
node scripts/build-buildings.mjs <iran-quadkey.csv.gz>
node scripts/fetch-imagery.mjs
```

این‌ها عملیات جدا از npm build هستند. raw exportها ورودی بیرونی‌اند؛ خودکار دانلود/بازنویسی نکنید مگر تسک نیاز داشته باشد. پس از تغییر REGION یا مبدأ باید anchors، factory، graph، binary، tile index و تست دسترس‌پذیری با هم بررسی شوند. `npm run build` فقط فایل‌های موجود را بسته‌بندی می‌کند.

Attribution در کد/رابط وجود دارد: OpenStreetMap، Microsoft، Esri/Maxar/Earthstar و Natural Earth. متن مجوز و شرایط استفادهٔ بیرونی در این بازبینی حقوقی بررسی نشده است؛ attribution فعلی در تغییر دارایی‌ها حفظ شود و متن README دربارهٔ منبع تصاویر مرجع پروژه باقی بماند.
