// Robot Market machines in the playable Park Mellat area. Positions are path points taken from
// the OpenStreetMap data (local metres, see geo.js); the machine is placed beside that path.
export const CATEGORIES = {
    factory: {label: 'کارخانه', icon: '🏭'},
    park: {label: 'پارک', icon: '🌳'},
    university: {label: 'دانشگاه', icon: '🎓'},
    school: {label: 'مدرسه', icon: '🏫'},
    metro: {label: 'ایستگاه مترو', icon: 'Ⓜ'},
    mall: {label: 'مرکز خرید', icon: '🛍'},
    test: {label: 'نقطهٔ آزمایشی GPS', icon: '🧪'}
};

const ALL_DAY = [7 * 60, 23 * 60];

export const FACTORY = {
    name: 'شرکت روبات مارکت',
    tagline: 'سازندهٔ دستگاه‌های وندینگ هوشمند',
    address: 'بزرگراه مشهد–چناران، خیابان کاله، کنار پارک علم و فناوری خراسان',
    // Centre of the compound and the direction of its driveway (towards the gate on Kaleh Street).
    center: {x: -10308.4, z: -14964.2},
    axis: {x: Math.SQRT1_2, z: Math.SQRT1_2}
};

export const machines = [
    {
        id: 'factory', name: 'دستگاه دفتر فنی مهندسی', category: 'factory',
        address: `${FACTORY.address}، ساختمان اداری، دفتر فنی مهندسی`,
        anchor: null, hours: [0, 24 * 60], priceFactor: .5,
        products: ['water', 'juice', 'tea', 'biscuit', 'chocolate'],
        note: 'دستگاه دفتر برنامه‌نویس‌ها؛ نصف قیمت برای مهمان‌های کارخانه'
    },
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

// GPS test points at real coordinates beside the factory, for checking real-world mode on a phone.
// They exist only while real-world mode is on; `spot` is where the player stands to buy.
const testPoint = (n, lat, lon) => ({
    id: `test-${n}`, name: `نقطهٔ آزمایشی ${['۱', '۲', '۳'][n - 1]}`, category: 'test', test: true,
    address: `کنار کارخانهٔ روبات مارکت · ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
    anchor: null, spot: {lat, lon}, hours: [0, 24 * 60], priceFactor: .5,
    products: ['water', 'biscuit'],
    note: 'برای آزمایش حالت دنیای واقعی: با گوشی تا اینجا راه بروید'
});
machines.push(testPoint(1, 36.450276, 59.423431), testPoint(2, 36.450172, 59.423209), testPoint(3, 36.449976, 59.422866));

// Shown on the map as the next area to unlock.
export const lockedPlaces = [
    {name: 'پارک کوهسنگی', note: 'خارج از محدودهٔ فعلی · به‌زودی'},
    {name: 'حرم و مرکز شهر', note: 'خارج از محدودهٔ فعلی · به‌زودی'}
];

export const START = {machineId: 'factory'};
export const CITY_START = 'mellat-park';

export const machineById = id => machines.find(m => m.id === id) ?? null;
