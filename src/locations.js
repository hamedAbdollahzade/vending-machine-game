// Robot Market machines in the playable Park Mellat area. Positions are path points taken from
// the OpenStreetMap data (local metres, see geo.js); the machine is placed beside that path.
export const CATEGORIES = {
    park: {label: 'پارک', icon: '🌳'},
    university: {label: 'دانشگاه', icon: '🎓'},
    school: {label: 'مدرسه', icon: '🏫'},
    metro: {label: 'ایستگاه مترو', icon: 'Ⓜ'},
    mall: {label: 'مرکز خرید', icon: '🛍'}
};

const ALL_DAY = [7 * 60, 23 * 60];

export const machines = [
    {
        id: 'mellat-park', name: 'بوستان ملت', category: 'park',
        address: 'بزرگراه وکیل‌آباد، ورودی جنوبی بوستان ملت، نزدیک ایستگاه مترو پارک ملت',
        anchor: {x: -487.6, z: -326.4}, hours: ALL_DAY, priceFactor: 1,
        products: ['water', 'juice', 'lemonade', 'tea', 'biscuit', 'chocolate', 'cake', 'nuts'],
        note: 'نوشیدنی‌های خنک برای پیاده‌روی در پارک'
    },
    {
        id: 'school-rahil', name: 'مجموعه آموزشی راحیل', category: 'school',
        address: 'بولوار امامت، کوچهٔ امامت ۲، کنار در ورودی مدرسه',
        anchor: {x: -554.6, z: -569.7}, hours: [7 * 60 + 30, 13 * 60 + 30], priceFactor: .9,
        products: ['water', 'milk', 'juice', 'biscuit', 'cake'],
        note: 'فقط در ساعت کاری مدرسه (۷:۳۰ تا ۱۳:۳۰) باز است'
    },
    {
        id: 'ferdowsi-university', name: 'دانشگاه فردوسی مشهد', category: 'university',
        address: 'میدان آزادی، پردیس دانشگاه فردوسی، مسیر پیاده‌روی مرکزی',
        anchor: {x: -936, z: 645}, hours: ALL_DAY, priceFactor: .8,
        products: ['water', 'tea', 'milk', 'biscuit', 'chocolate', 'nuts', 'cake'],
        note: 'تخفیف دانشجویی: ۲۰٪ ارزان‌تر'
    },
    {
        id: 'literature-faculty', name: 'دانشکدهٔ ادبیات دکتر شریعتی', category: 'university',
        address: 'پردیس دانشگاه فردوسی، بولوار دانش، جلوی دانشکدهٔ ادبیات',
        anchor: {x: -417.1, z: 966.3}, hours: ALL_DAY, priceFactor: .8,
        products: ['water', 'tea', 'lemonade', 'biscuit', 'chocolate'],
        note: 'تخفیف دانشجویی: ۲۰٪ ارزان‌تر'
    },
    {
        id: 'medical-university', name: 'دانشگاه علوم پزشکی مشهد', category: 'university',
        address: 'میدان آزادی، پردیس دانشگاه علوم پزشکی مشهد',
        anchor: {x: -272.1, z: 150.6}, hours: ALL_DAY, priceFactor: .8,
        products: ['water', 'juice', 'milk', 'nuts', 'biscuit'],
        note: 'تخفیف دانشجویی: ۲۰٪ ارزان‌تر'
    },
    {
        id: 'azadi-metro', name: 'ایستگاه مترو آزادی', category: 'metro',
        address: 'بولوار ملک‌آباد، ورودی ایستگاه مترو آزادی',
        anchor: {x: 494.1, z: 280.3}, hours: [6 * 60, 22 * 60], priceFactor: 1,
        products: ['water', 'tea', 'juice', 'chocolate', 'biscuit'],
        note: 'دستگاه کنار گیت‌های مترو'
    },
    {
        id: 'mashhad-mall', name: 'مشهد مال', category: 'mall',
        address: 'خیابان اخوان ثالث، کنار ورودی پارکینگ مشهد مال',
        anchor: {x: 1940.6, z: -367.8}, hours: [10 * 60, 23 * 60], priceFactor: 1.1,
        products: ['water', 'juice', 'milk', 'tea', 'lemonade', 'chocolate', 'cake', 'nuts', 'biscuit'],
        note: 'بیشترین تنوع محصول؛ قیمت کمی بالاتر'
    }
];

// Shown on the map as the next area to unlock.
export const lockedPlaces = [
    {name: 'پارک کوهسنگی', note: 'خارج از محدودهٔ فعلی · به‌زودی'},
    {name: 'حرم و مرکز شهر', note: 'خارج از محدودهٔ فعلی · به‌زودی'}
];

export const START = {machineId: 'mellat-park', carAnchor: {x: -445.8, z: -275.7}};

export const machineById = id => machines.find(m => m.id === id) ?? null;
