# GPS، دوربین، حسگر و PWA

## حالت دنیای واقعی

کاربر از briefing یا نوار پایین real mode را می‌زند؛ modal معرفی/ایمنی و سپس اجازهٔ قطب‌نما و مکان‌یابی درخواست می‌شود. HTTPS یا localhost لازم است. joystick و صفحه‌کلید جای player را تغییر نمی‌دهند؛ updateReal موقعیت را از گوشی می‌گیرد. ماشین مجازی در این حالت قابل استفاده نیست. خانواده پنهان و دوربین در ارتفاع ۱٫۶ متر قرار می‌گیرد.

مکان‌یابی ابتدا getCurrentPosition تقریبی (۱۵ ثانیه timeout، maximumAge ۶۰ ثانیه) و سپس watchPosition دقیق (۳۰ ثانیه timeout و maximumAge ۳ ثانیه) دارد. timeout اولیهٔ watch فقط وضعیت جست‌وجو است؛ کد۱ permission، کد۲ unavailable و کد۳ timeout.

smoothFix وزن را با واریانس accuracy دو fix می‌سازد؛ پس از فاصلهٔ زمانی بیش از ۳۰ ثانیه fix تازه جایگزین می‌شود. accuracy کف ۳ متر دارد. stabilizer پرش خارج از دسترس را رد می‌کند، پس از سه رد پیاپی نمونهٔ بعدی امکان پذیرش دارد؛ تا drift بیش از max(3, accuracy/2) یا speed گزارش‌شده بیش از .7 نباشد مکان نمایشی ثابت می‌ماند.

updateReal نقطه را از برخورد ساختمان بیرون می‌آورد؛ اختلاف بالای ۱۵۰ متر teleport، در فاصله‌های کمتر حرکت نرم تا حداکثر ۸ m/s دارد. فقط fix داخل bounds اعمال می‌شود؛ خارج bounds پیام نزدیک‌ترین دستگاه نمایش داده می‌شود.

شعاع تعامل `min(50, max(20, accuracy × 2.5))` متر است. نزدیک‌ترین دستگاه فعال در این شعاع انتخاب می‌شود؛ سه test point فقط در real فعال‌اند. شرط سرعت بیش از ۶ m/s در interact جلوی بازکردن فروشگاه را می‌گیرد. این شرط در swipePayment تکرار نشده؛ محدودیت تست/بک‌لاگ محسوب می‌شود.

## AR

getUserMedia با rear/environment، video مطلوب ۱۲۸۰×۷۲۰ و بدون audio؛ تصویر video پشت WebGL alpha قرار می‌گیرد. city، imagery، factory، traffic، car، sky و parkGate در AR پنهان‌اند؛ دستگاه و روبات و مسیر روی تصویر می‌مانند. این AR بر پایهٔ GPS/قطب‌نماست، نه WebXR، تشخیص سطح یا occlusion واقعی. انتظار دقت سانتی‌متری درست نیست.

زاویهٔ گوشی به quaternion با deviceorientationabsolute یا fallback deviceorientation تبدیل می‌شود؛ iOS compassHeading می‌تواند offset شمال را اصلاح کند. FOV از فرض زاویهٔ ضلع بلند ۶۵ درجه و نسبت video/screen محاسبه می‌شود. stable mode چرخش را آرام‌تر می‌کند. بدون حسگر drag و جهت حرکت/compass fallback هستند.

خاموش‌کردن AR trackهای دوربین را stop می‌کند ولی حسگر برای نمای اول‌شخص ادامه دارد؛ خاموش‌کردن real باید tracking، AR و sensors را متوقف کند. reset معمول بازی فعلاً معادل خاموش‌کردن real نیست.

## PWA و ذخیره

setupPwa در build service worker نسبی `./sw.js` ثبت می‌کند؛ dev server ثبت نمی‌کند. نصب با beforeinstallprompt و راهنمای Add to Home Screen برای iOS فراهم است. manifest و icon محلی هستند.

Vite plugin فهرست assetهای build و public را precache می‌کند؛ JPGهای imagery مستثنا هستند و فقط پس از مشاهده cache می‌شوند. بنابراین «آفلاین» برای همهٔ نقاط ماهواره‌ای پس از اولین اجرا تضمین نشده است. Navigation network-first با fallback صفحهٔ cache؛ assetهای دیگر cache-first؛ imagery cache جدا دارد. نسخهٔ تازه با skip-waiting و controllerchange reload می‌شود.

localStorage فعلی فقط کیفیت گرافیک را نگه می‌دارد. پول، خرید، XP، مأموریت و موقعیت player ذخیرهٔ ماندگار ندارند. نصب PWA با ذخیرهٔ پیشرفت یکی نیست. حالت low پیش‌فرض ورودی coarse است: سایه خاموش و pixelRatio ۱؛ high تا ۱٫۷۵. query `?quality=low` و کلید گرافیک انتخاب را تغییر می‌دهند.

## آزمون دستی ضروری

مجوز ردشده/داده‌شده، قطع GPS، fix خارج جهان، نمونهٔ قدیمی و jump، نزدیک‌ترین test point، سرعت بالا حین پرداخت، دو بار روشن/خاموش، screen rotation، توقف camera track، بازگشت از background، Android/iOS، آفلاین مسیر بازدیدشده/جدید و update از نسخهٔ نصب‌شده. این‌ها در تست Node به‌طور انتهابه‌انتها پوشش ندارند.
