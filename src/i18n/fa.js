// Every piece of Persian text the game shows: menus, HUD, prompts, dialogue, missions and the
// scenery text painted onto 3D props. Company and product content lives in config/company.js,
// and place names come from the map data. To add a language, copy this file with the same keys.
// Entries that need values are functions; everything else is a plain string.

import { COMPANY } from '../config/company.js';

export const strings = {
  common: {
    close: 'بستن',
    cancel: 'انصراف',
    gotIt: 'متوجه شدم',
    mashhad: 'مشهد',
    iran: 'ایران',
    walking: 'پیاده',
    open: 'باز',
    closed: 'بسته',
    allDay: 'شبانه‌روزی',
    /** @type {(from: string, to: string) => string} */
    hours: (from, to) => `${from} تا ${to}`,
  },
  units: {
    /** @type {(n: string) => string} */
    metres: (n) => `${n} متر`,
    /** @type {(n: string) => string} */
    kilometres: (n) => `${n} کیلومتر`,
    /** @type {(n: string) => string} */
    hetoman: (n) => `${n} هتومان`,
    /** @type {(n: string) => string} */
    rial: (n) => `${n} ریال`,
    hetomanName: 'هتومان',
    speed: 'km/h',
  },
  app: {
    preparing: 'در حال آماده‌سازی بازی…',
    buildingCity: 'در حال ساختن شهر مشهد…',
    /** @type {(error: string) => string} */
    failed: (error) => `بازی اجرا نشد: ${error}`,
    retry: 'تلاش دوباره',
    noWebgl: 'مرورگر شما گرافیک سه‌بعدی (WebGL) را اجرا نمی‌کند. شتاب‌دهی گرافیکی را فعال کنید.',
    dataFailed: 'بارگذاری داده ناموفق بود',
    updateReady: 'نسخهٔ جدید بازی آماده است ',
    update: 'به‌روزرسانی',
    osmCredit: 'نقشه: © مشارکت‌کنندگان OpenStreetMap',
    /** @type {(imagery: string) => string} */
    osmImageryCredit: (imagery) =>
      `نقشه: © مشارکت‌کنندگان OpenStreetMap · تصویر ماهواره‌ای: ${imagery}`,
  },
  landing: {
    robotAlt: `روبات راهنمای ${COMPANY.shortName}`,
    logoAlt: `لوگوی ${COMPANY.shortName}`,
    heading: 'دنیای دستگاه‌های وندینگ هوشمند را بگردید',
    intro: 'کارخانه، محصولات و دستگاه‌های نصب‌شده در شهر را در یک بازی سه‌بعدی ببینید.',
    modesLabel: 'شروع بازی',
    modes: {
      real: { label: 'بازی در دنیای واقعی', hint: 'با GPS گوشی' },
      offline: { label: 'بازی آفلاین', hint: 'شروع از بوستان ملت' },
      about: { label: 'دربارهٔ ما', hint: 'گشت در کارخانه' },
      products: { label: 'محصولات', hint: 'دستگاه‌ها از نزدیک' },
    },
    sectionsLabel: 'اطلاعات شرکت',
    sections: {
      contact: 'تماس با ما',
      address: 'آدرس و نقشه',
      faq: 'پرسش‌های متداول',
      careers: 'فرصت‌های شغلی',
      gallery: 'گالری',
      social: 'شبکه‌های اجتماعی',
    },
    history: 'معرفی شرکت',
    values: 'ارزش‌های ما',
    phone: 'تلفن',
    email: 'ایمیل',
    website: 'وب‌سایت',
    openMap: 'باز کردن در نقشه',
    /** @type {(address: string, city: string) => string} */
    fullAddress: (address, city) => `${address}، ${city}`,
    galleryEmpty: 'تصاویر به‌زودی اضافه می‌شوند.',
    close: 'بستن',
    install: 'نصب روی گوشی',
    keys: 'W A S D حرکت · ماوس دوربین · F ماشین · E خرید · M نقشه',
  },
  gpsFallback: {
    title: 'موقعیت‌یابی در دسترس نیست',
    offline: 'بازی آفلاین',
    close: 'بستن',
  },
  toolbar: {
    showroom: 'مدل‌های کارخانه · Q',
    realWorld: '📍 دنیای واقعی',
    camera: '📷 دوربین',
    stableOn: '🎯 پایدار: روشن',
    stableOff: '🎯 پایدار: خاموش',
    soundOn: 'صدا: روشن',
    soundOff: 'صدا: خاموش',
    soundUnavailable: 'صدا در دسترس نیست',
    graphics: 'گرافیک',
    graphicsLow: 'گرافیک: سبک',
    graphicsHigh: 'گرافیک: کامل',
    restart: 'شروع دوباره',
  },
  status: {
    budget: 'بودجه',
    budgetStart: '۵۰۰',
    clock: 'ساعت',
    clockStart: '۰۸:۳۰',
    speed: 'سرعت',
    speedStart: '۰',
    rank: 'درجه',
    xp: 'امتیاز',
    rankStart: 'تازه‌وارد',
    xpStart: '۰ XP',
    missions: 'مأموریت‌ها',
    run: 'دویدن',
  },
  menu: {
    open: 'منو',
    label: 'منوی بازی',
    map: 'نقشه',
    missions: 'مأموریت‌ها',
    status: 'وضعیت',
    products: 'محصولات',
    realWorld: 'دنیای واقعی',
    camera: 'دوربین',
    stable: 'پایدار',
    sound: 'صدا',
    graphics: 'گرافیک',
    minimap: 'نقشهٔ کوچک',
    fullscreen: 'تمام‌صفحه',
    help: 'راهنما',
    restart: 'شروع دوباره',
    home: 'منوی اصلی',
    close: 'بستن',
  },
  objective: {
    label: 'هدف بعدی',
    open: 'نمایش مأموریت‌ها',
  },
  help: {
    keyboardTitle: 'صفحه‌کلید',
    keyboard: [
      ['W A S D', 'حرکت'],
      ['Shift', 'دویدن'],
      ['ماوس', 'چرخاندن دوربین'],
      ['F', 'سوار و پیاده شدن'],
      ['E', 'خرید'],
      ['Q', 'معرفی محصولات'],
      ['M', 'نقشه'],
      ['Space', 'ترمز دستی'],
    ],
    touchTitle: 'لمسی',
    touch: [
      ['دایرهٔ پایین', 'حرکت و رانندگی'],
      ['کشیدن صفحه', 'چرخاندن دوربین'],
      ['دکمهٔ وسط پایین', 'کار بعدی: خرید، سوار شدن، معرفی'],
    ],
  },
  hud: {
    openMap: 'باز کردن نقشهٔ شهر (M)',
    interact: 'تعامل با بازی',
    // Single-letter north marker on the minimap.
    minimapNorth: 'ش',
    metroPrefix: 'ایستگاه مترو ',
  },
  prompts: {
    /** @type {(model: string) => string} */
    showroom: (model) => `Q · معرفی ${model} و پرسیدن قیمت`,
    /** @type {(machine: string) => string} */
    buy: (machine) => `E · خرید از ${COMPANY.shortName} · ${machine}`,
    /** @type {(hours: string) => string} */
    closed: (hours) => `دستگاه بسته است · ${hours}`,
    /** @type {(vehicle: string) => string} */
    getIn: (vehicle) => `F · سوار ${vehicle} شو`,
    getOutNearMachine: 'F · پیاده شو؛ دستگاه نزدیک است',
  },
  vehicles: {
    bmw: 'بی‌ام‌و',
    bugatti: 'بوگاتی',
    lamborghini: 'لامبورگینی',
    mazda: 'مزدا',
    nissan: 'نیسان',
    traffic: 'ماشین',
  },
  map: {
    close: 'بستن',
    help: 'کشیدن: جابه‌جایی · دو انگشت یا چرخ ماوس: زوم · لمس یا کلیک روی دستگاه: انتخاب',
    machines: `دستگاه‌های ${COMPANY.shortName}`,
    route: 'مسیریابی تا اینجا',
    routeActive: 'مسیر فعال است ✓',
    openNow: 'الان باز است',
    closedNow: 'الان بسته است',
    /** @type {(hours: string, open: boolean, note: string) => string} */
    details: (hours, open, note) =>
      `🕒 ${hours} · ${open ? 'الان باز است' : 'الان بسته است'} · ${note}`,
  },
  lists: {
    drink: 'نوشیدنی',
    snack: 'خوراکی',
    noFunds: ' · موجودی کافی نیست',
    /** @type {(category: string, open: boolean) => string} */
    machineState: (category, open) => `${category} · ${open ? 'باز' : 'بسته'}`,
  },
  install: {
    title: 'نصب روی آیفون',
    shareBefore: 'در Safari دکمهٔ ',
    shareAfter: ' (مربع با فلش رو به بالا) را بزنید.',
    addBefore: 'گزینهٔ ',
    addAfter: ' را انتخاب کنید.',
    note: `${COMPANY.shortName} مثل یک اپ روی صفحهٔ اصلی گوشی شما قرار می‌گیرد و آفلاین هم اجرا می‌شود.`,
  },
  realIntro: {
    title: 'بازی در دنیای واقعی',
    body: `با روشن کردن این حالت، موقعیت گوشی شما (GPS) روی نقشهٔ بازی نمایش داده می‌شود. وقتی واقعاً به محل یک دستگاه ${COMPANY.shortName} برسید، می‌توانید خرید کنید و ۲۰۰ امتیاز اضافه بگیرید.`,
    safety: [
      'هنگام راه رفتن به خیابان و ماشین‌ها نگاه کنید، نه به صفحه.',
      'بچه‌ها فقط همراه یک بزرگ‌تر بازی کنند.',
      'هنگام رانندگی از این حالت استفاده نکنید؛ در سرعت بالا خرید غیرفعال می‌شود.',
      'موقعیت شما فقط روی همین گوشی می‌ماند و جایی ارسال نمی‌شود.',
    ],
    accept: 'قبول دارم، شروع کن',
  },
  real: {
    on: 'حالت دنیای واقعی روشن شد؛ از چشم خودمون می‌بینیم و هر جا راه بریم، توی بازی هم همون‌جاییم.',
    /** @type {(problem: string) => string} */
    cameraFailed: (problem) => `${problem} فعلاً شهر سه‌بعدی رو از چشم خودمون می‌بینیم.`,
    cameraOn: 'دوربین روشن شد! گوشی رو صاف جلوی خودت بگیر؛ ستون نورانی طلایی جای دستگاهه.',
    noOrientation: 'حسگر جهت گوشی جواب نمی‌ده؛ برای چرخیدن، صفحه رو با انگشت بکش.',
    noVirtualCar: 'توی حالت دنیای واقعی پیاده راه می‌ریم؛ ماشین مجازی لازم نیست.',
    locating: 'در حال یافتن موقعیت…',
    /** @type {(distance: string) => string} */
    outOfArea: (distance) => `📍 خارج از محدودهٔ بازی · ${distance} تا نزدیک‌ترین دستگاه`,
    /** @type {(metres: string, fast: boolean) => string} */
    accuracy: (metres, fast) => `📍 GPS ±${metres} متر${fast ? ' · حرکت سریع' : ''}`,
    noGps: 'این دستگاه موقعیت‌یابی (GPS) ندارد.',
    needsHttps: 'موقعیت‌یابی فقط روی HTTPS کار می‌کند؛ بازی را از نشانی https:// باز کنید.',
    denied:
      'اجازهٔ دسترسی به موقعیت داده نشد. در تنظیمات مرورگر و گوشی، Location را برای این سایت مجاز کنید. (کد ۱)',
    unavailable:
      'موقعیت در دسترس نیست. Location (GPS) گوشی را روشن کنید؛ روی کامپیوتر معمولاً موقعیت‌یابی کار نمی‌کند. (کد ۲)',
    timeout: 'هنوز سیگنال GPS نرسیده… در فضای باز و کنار پنجره سریع‌تر پیدا می‌شود. (کد ۳)',
    cameraNeedsHttps: 'این مرورگر به دوربین دسترسی نمی‌دهد (HTTPS لازم است).',
    cameraDenied: 'اجازهٔ دوربین داده نشد؛ از تنظیمات مرورگر اجازه بدهید.',
    cameraBusy: 'دوربین باز نشد؛ برنامهٔ دیگری از آن استفاده نمی‌کند؟',
  },
  shop: {
    close: 'بستن',
    note: '۱۰ هتومان = ۱۰۰٬۰۰۰ ریال · مبالغ نمایشی‌اند و پرداخت واقعی انجام نمی‌شود.',
    /** @type {(icon: string, category: string, hours: string) => string} */
    category: (icon, category, hours) => `${icon} ${category} · ساعت کاری ${hours}`,
    /** @type {(machine: string) => string} */
    title: (machine) => `${COMPANY.shortName} · ${machine}`,
    /** @type {(note: string, balance: string) => string} */
    balance: (note, balance) => `${note} · موجودی شما: ${balance}`,
  },
  payment: {
    reader: `کارت‌خوان ${COMPANY.shortName}`,
    swipe: 'کشیدن کارت · C',
    approaching: 'در حال نزدیک شدن به کارت‌خوان…',
    success: 'پرداخت موفق ✓ محصول در حال تحویل است',
    swipeHint: 'کارت را بکشید: دکمهٔ «کشیدن کارت» یا کلید C',
    realPurchase: 'خرید در دنیای واقعی',
  },
  rewards: {
    missionDone: 'مأموریت انجام شد',
    /** @type {(xp: string, cash: string) => string} */
    missionReward: (xp, cash) => `+${xp} XP · +${cash} پاداش`,
    rankUp: 'ارتقای درجه',
    findMore: 'دستگاه‌های بیشتری پیدا کن',
  },
  end: {
    title: 'پایان عملیات',
    again: 'عملیات دوباره',
    keepExploring: 'ادامهٔ گشت در شهر',
    success: 'عملیات موفق',
    outOfBudget: 'پایان بودجه',
    successHeading: 'عملیات مشهد کامل شد!',
    budgetHeading: 'بودجهٔ امروز تمام شد',
    successText:
      'همهٔ مأموریت‌های محدودهٔ بوستان ملت انجام شد. مناطق دیگر مشهد به‌زودی باز می‌شوند.',
    budgetText: 'دیگر نمی‌توانید از دستگاه‌ها خرید کنید. امتیاز امروز:',
    score: 'امتیاز',
    rank: 'درجه',
    purchases: 'خریدها',
    places: 'مکان‌های کشف‌شده',
    missions: 'مأموریت‌ها',
    remaining: 'باقی‌مانده',
    /** @type {(done: string, total: string) => string} */
    outOf: (done, total) => `${done} از ${total}`,
  },
  showroom: {
    /** @type {(model: string) => string} */
    heading: (model) => `نمایشگاه کارخانه · ${model}`,
    close: 'بستن معرفی دستگاه',
    models: 'مدل دستگاه',
    /** @type {(price: string) => string} */
    price: (price) => `قیمت خود دستگاه: ${price}`,
    displayOnly: 'این بخش معرفی محصول است؛ خرید واقعی انجام نمی‌شود و بودجهٔ هتومان تغییر نمی‌کند.',
    askPrice: 'روبات، قیمتش چنده؟',
    askFeatures: 'روبات، امکاناتش چیه؟',
    robotAlt: 'روبات راهنمای نمایشگاه',
    greeting: 'روبات: سلام! دربارهٔ قیمت و امکانات این مدل از من بپرس.',
    allModels: 'روبات: سلام! قیمت و امکانات هر سه مدل را می‌توانم توضیح بدهم.',
    whatToKnow: 'روبات: دربارهٔ این مدل چی می‌خواهی بدانی؟',
    /** @type {(answer: string) => string} */
    robotSays: (answer) => `روبات: ${answer}`,
    noImage: 'نمای سه‌بعدی این مدل داخل کارخانه موجود است؛ فایل تصویر هنوز اضافه نشده.',
    views: { image: 'نمای اصلی', imageAlt: 'رنگ سفید', gif: 'نمای متحرک' },
    /** @type {(model: string, price: string) => string} */
    priceAnswer: (model, price) =>
      `قیمت ${model}، ${price} است. این قیمت خود دستگاه به ریال است و از بودجهٔ بازی کم نمی‌شود.`,
    /** @type {(model: string, description: string, features: string) => string} */
    featuresAnswer: (model, description, features) =>
      `${model}: ${description} امکانات: ${features}.`,
    featureSeparator: '، ',
  },
  speakers: { robot: 'روبات', father: 'پدر', child: 'بچه' },
  dialogue: {
    showroomIntro: `سه نمونهٔ ۳۵، ۴۸ و ۶۰ کانال توی حیاط کنار ماشین هستند. دکمهٔ مدل‌های کارخانه یا Q را بزن تا قیمت و امکاناتشان را بگویم.`,
    childAsksFactory: `بابا، اینجا همون کارخونه‌ایه که دستگاه‌های ${COMPANY.shortName} رو می‌سازه؟`,
    fatherAnswersFactory:
      'آره! سالن تولید اون‌وره؛ دستگاه وندینگ هم توی دفتر فنی مهندسیه. بریم ببینیم!',
    offlineStart: `اینجا بوستان ملته. ماشین کنارمونه؛ بریم کارخونهٔ ${COMPANY.shortName} و از دستگاهش خرید کنیم!`,
    offlineFollow: 'مسیر طلایی روی زمین رو دنبال کنیم!',
    realStart: `هدف اول: تا کارخونهٔ ${COMPANY.shortName} بریم و از دستگاهش خرید کنیم.`,
    childAsksArrival: 'اون ماشین مشکیه کیه داره میاد تو؟',
    fatherAnswersArrival: 'آقای محمدیه، مدیر شرکت. بعداً بریم اتاقش سلام کنیم.',
    robotHello: `سلام! من روبات راهنمای ${COMPANY.shortName}م؛ تو دستگاه دفتر فنی زندگی می‌کنم!`,
    /** @type {(company: string) => string} */
    robotWelcome: (company) =>
      `به ${company} خوش اومدین. بچه‌های همین دفتر نرم‌افزار دستگاه‌ها رو می‌نویسن.`,
    robotFirstBuy: 'اول از همین دستگاه یه چیزی بخرین؛ کلید E رو بزنین.',
    robotGoToPark:
      'ماشینتون جلوی همین ساختمونه. با F سوار شین و برین بوستان ملت؛ من توی همهٔ دستگاه‌ها منتظرتونم!',
    /** @type {(hours: string) => string} */
    robotClosed: (hours) => `سلام! متأسفم، این دستگاه الان بسته است. ساعت کاری: ${hours}.`,
    /** @type {(machine: string) => string} */
    robotWelcomeBack: (machine) => `سلام دوباره! به دستگاه ${machine} خوش اومدین.`,
    /** @type {(note: string) => string} */
    robotNote: (note) => `${note}. برای خرید E رو بزنین.`,
    robotAgain: 'باز هم خوش اومدین! برای خرید E رو بزنین.',
    robotBye: 'خداحافظ! مسیر طلایی رو دنبال کنین.',
    /** @type {(machine: string, hours: string) => string} */
    targetClosed: (machine, hours) =>
      `${machine} الان بسته است (${hours}). از نقشه مقصد دیگری انتخاب کن.`,
    longWay: 'راه طولانیه؛ بهتره با ماشین بریم.',
    carOn: 'کمربندها رو ببندیم! مسیر طلایی روی زمین راه رو نشون می‌ده.',
    stopFirst: 'اول نگه دار، بعد پیاده می‌شویم.',
    tooFastToBuy: 'داریم سریع حرکت می‌کنیم؛ اول بایستیم، بعد خرید کنیم.',
    /** @type {(hours: string) => string} */
    machineClosed: (hours) => `این دستگاه الان بسته است. ساعت کاری: ${hours}.`,
    childSwipes: 'بابا، کارت رو بده من بکشم!',
    /** @type {(icon: string, product: string) => string} */
    childGotIt: (icon, product) => `${icon} ${product} گرفتم! مرسی بابا.`,
    /** @type {(mission: string) => string} */
    nextMission: (mission) => `مأموریت بعدی: ${mission}`,
    /** @type {(step: string) => string} */
    nextStep: (step) => `خب! حالا: ${step}`,
    /** @type {(machine: string, distance: string) => string} */
    routeSet: (machine, distance) =>
      `مسیر تا ${machine} رو گذاشتم؛ ${distance}. دنبال خط طلایی بریم.`,
  },
  ranks: ['تازه‌وارد', 'کاوشگر', 'راه‌بلد', 'شکارچی دستگاه', 'استاد نقشه', 'افسانهٔ مشهد'],
  bonuses: {
    purchase: 'خرید موفق',
    newPlace: 'کشف مکان جدید',
    combo: 'ترکیب نوشیدنی و خوراکی',
    allCategories: 'همهٔ انواع مکان',
  },
  // Mission titles, keyed by mission id (game/missions/missions.js).
  missions: {
    firstBuy: 'اولین خرید در کارخانه',
    parkGate: 'دستگاه ورودی بوستان ملت',
    parkLake: 'بازدید از دستگاه کنار دریاچه',
    parkSports: 'سفارش دستگاه برای زمین ورزشی',
    parkTour: 'گشت دستگاه‌های بوستان',
    explorer: 'کاشف شهر',
  },
  // One short line per step type, shown on the objective chip.
  steps: {
    /** @type {(place: string) => string} */
    goto: (place) => `برو به ${place}`,
    /** @type {(place: string) => string} */
    locate: (place) => `${place} را روی نقشه پیدا کن`,
    /** @type {(place: string) => string} */
    inspect: () => 'کنار دستگاه بایست تا معرفی‌اش کنم',
    /** @type {(place: string) => string} */
    order: () => 'از کارت دستگاه سفارش بده',
    /** @type {(place: string) => string} */
    buy: (place) => `از ${place} خرید کن`,
    /** @type {(done: string, count: string) => string} */
    places: (done, count) => `از ${count} مکان شهر خرید کن (${done}/${count})`,
    allDone: 'همهٔ مأموریت‌ها انجام شد',
  },
  machineCard: {
    title: 'مشخصات دستگاه',
    installedAt: 'محل نصب',
    model: 'مدل',
    price: 'قیمت',
    order: 'ثبت درخواست سفارش',
    ordered: 'درخواست ثبت شد ✓',
    contact: 'تماس با فروش',
    close: 'بستن',
    orderThanks: 'درخواستت ثبت شد؛ کارشناس فروش با تو تماس می‌گیرد.',
    robotIntro: (model) => `این دستگاه ${model} است. مشخصاتش را روی صفحه ببین!`,
  },

  snacks: {
    juice: 'آب‌میوه',
    water: 'آب معدنی',
    milk: 'شیر کاکائو',
    tea: 'چای سرد',
    lemonade: 'لیموناد',
    biscuit: 'بیسکویت',
    chocolate: 'شکلات',
    nuts: 'آجیل',
    cake: 'کیک',
  },
  categories: {
    factory: 'کارخانه',
    park: 'پارک',
    university: 'دانشگاه',
    school: 'مدرسه',
    metro: 'ایستگاه مترو',
    mall: 'مرکز خرید',
    test: 'نقطهٔ آزمایشی GPS',
  },
  places: {
    officeMachine: 'دستگاه دفتر فنی مهندسی',
    /** @type {(address: string) => string} */
    officeAddress: (address) => `${address}، ساختمان اداری، دفتر فنی مهندسی`,
    officeNote: 'دستگاه دفتر برنامه‌نویس‌ها؛ نصف قیمت برای مهمان‌های کارخانه',
    /** @type {(n: string) => string} */
    testPoint: (n) => `نقطهٔ آزمایشی ${n}`,
    /** @type {(coords: string) => string} */
    testAddress: (coords) => `کنار کارخانهٔ ${COMPANY.shortName} · ${coords}`,
    testNote: 'برای آزمایش حالت دنیای واقعی: با گوشی تا اینجا راه بروید',
    comingSoon: 'خارج از محدودهٔ فعلی · به‌زودی',
    parkSign: 'بوستان ملت',
  },
  cities: {
    mashhad: 'مشهد',
    tehran: 'تهران',
    isfahan: 'اصفهان',
    shiraz: 'شیراز',
    tabriz: 'تبریز',
    ahvaz: 'اهواز',
    kerman: 'کرمان',
    rasht: 'رشت',
    yazd: 'یزد',
    zahedan: 'زاهدان',
    kermanshah: 'کرمانشاه',
    bandarAbbas: 'بندرعباس',
  },
  factory: {
    readyToInstall: 'آمادهٔ نصب',
    zones: [
      ['خم‌کاری', 'ورق‌کاری بدنهٔ دستگاه'],
      ['برش لیزر', 'برش ورق و قطعات'],
      ['رنگ‌کاری', 'کابین رنگ پودری'],
      ['یخچال‌سازی', 'کمپرسور و عایق‌کاری'],
      ['مونتاژ', 'خط مونتاژ نهایی'],
      ['بسته‌بندی', 'ارسال به شهر'],
    ],
    signs: {
      engineering: ['دفتر فنی مهندسی', 'Engineering'],
      accounting: ['واحد حسابداری', 'Accounting'],
      management: ['مدیریت', 'آقای محمدی'],
      nameplate: ['محمدی', 'مدیر شرکت'],
    },
    manager: { name: 'آقای محمدی', role: 'مدیر شرکت' },
    staff: {
      hamed: {
        name: 'حامد',
        lines: [
          'سلام! من حامدم. رابط کاربری صفحهٔ لمسی دستگاه‌ها رو با React می‌سازم.',
          'هر چی روی صفحهٔ دستگاه می‌بینین، از همین مانیتور اومده!',
        ],
      },
      ryan: {
        name: 'رایان',
        lines: ['سلام! من رایانم. سرور پرداخت و گزارش فروش دستگاه‌ها رو با Go می‌نویسم.'],
      },
      alireza: {
        name: 'علیرضا',
        lines: [
          'سلام! علیرضام. فریمور بُرد کنترل دستگاه با C++ ـه؛ الان دارم موتورهای تحویل کالا رو تنظیم می‌کنم.',
        ],
      },
      reza: {
        name: 'رضا',
        lines: [
          'سلام، خوش اومدین. من رضام؛ کد C++ سنسورها و دمای یخچال دستگاه با منه.',
          'دستگاه وندینگ همین دفتر کنار دره؛ از اون خرید کنین!',
        ],
      },
      mohammad: {
        name: 'محمد',
        lines: [`سلام! من محمدم. به دفتر فنی مهندسی ${COMPANY.shortName} خوش اومدین!`],
      },
    },
    accounting: {
      label: 'واحد حسابداری',
      lines: ['سلام! اینجا فروش همهٔ دستگاه‌ها ثبت می‌شه. هر خریدی بکنین، فاکتورش این‌جا میاد!'],
    },
    managerLines: [
      `سلام، خوش اومدین! من محمدی‌ام، مدیر ${COMPANY.shortName}.`,
      'امروز چهل نفر توی سالن تولید کار می‌کنن: خم‌کاری، برش، رنگ، یخچال‌سازی و مونتاژ.',
      'یه سر به دفتر فنی بزنین و از دستگاهش خرید کنین؛ بعد برین سراغ دستگاه‌های شهر!',
    ],
    truck: 'بابا ببین! کامیون داره دستگاه‌های بسته‌بندی‌شده رو بار می‌زنه که ببره شهر!',
    // One comment per production area, spoken the first time the family walks in.
    areaTalks: [
      'اینجا خم‌کاریه؛ ورق‌های فلزی بدنهٔ دستگاه رو با پرس خم می‌کنن.',
      'دستگاه برش لیزر رو ببین! ورق رو مثل کاغذ می‌بُره.',
      `این کابین رنگه؛ بدنه‌ها اینجا رنگ برند ${COMPANY.shortName} رو می‌گیرن.`,
      'یخچال‌سازی! برای همینه که نوشیدنی‌های دستگاه همیشه خنکن.',
      'خط مونتاژ: روبات‌ها و کارگرها قطعه‌ها رو کنار هم می‌ذارن و دستگاه کامل می‌شه.',
    ],
    // Scenery text painted on office screens and boards.
    decor: {
      invoices: [
        'فاکتور   دستگاه        مبلغ',
        '۱۰۴۲    بوستان ملت     ۴۸۰',
        '۱۰۴۳    دانشگاه فردوسی  ۳۲۰',
        '۱۰۴۴    مترو آزادی     ۲۹۰',
        '۱۰۴۵    مشهد مال       ۶۱۰',
        '۱۰۴۶    مدرسه راحیل    ۱۸۰',
        'جمع                 ۱۸۸۰',
      ],
      dashboard: [
        'فروش امروز: ۱۲۸ دستگاه',
        'تولید هفته: ۴۶ دستگاه',
        'ارسال شده: ۳۸',
        '',
        '▇▇▇▇▇▇▇▇▇▇▇ خم',
        '▇▇▇▇▇▇▇▇▇ برش',
        '▇▇▇▇▇▇▇ رنگ',
      ],
      sprintTitle: 'اسپرینت ۱۴: دستگاه نسل جدید',
      sprintItems: ['صفحهٔ لمسی جدید ← React', 'سرویس پرداخت ← Go', 'فریمور موتور و سنسور ← C++'],
    },
  },
};
