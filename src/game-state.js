export const INITIAL_BALANCE = 500;
export const formatHetoman = value => `${value.toLocaleString('fa-IR')} هتومان`;
export const hetomanToRial = value => value * 10000;

const assortment = [
    {id: 'juice', code:'11', name: 'آب‌میوه', icon: '🧃', cost: 35000, type: 'drink'},
    {id: 'water', code:'12', name: 'آب معدنی', icon: '💧', cost: 15000, type: 'drink'},
    {id: 'biscuit', code:'13', name: 'بیسکویت', icon: '🍪', cost: 25000, type: 'snack'},
    {id:'milk',code:'14',name:'شیر کاکائو',icon:'🥛',cost:40000,type:'drink'},
    {id:'tea',code:'15',name:'چای سرد',icon:'🧋',cost:45000,type:'drink'},
    {id:'lemonade',code:'16',name:'لیموناد',icon:'🍋',cost:40000,type:'drink'},
    {id:'chocolate',code:'17',name:'شکلات',icon:'🍫',cost:30000,type:'snack'},
    {id:'nuts',code:'18',name:'آجیل',icon:'🥜',cost:65000,type:'snack'},
    {id:'cake',code:'19',name:'کیک',icon:'🧁',cost:35000,type:'snack'}
];

// All 60 physical channels exist; only 21–60 are available in this scene.
export const channels=Array.from({length:60},(_,index)=>{
 const channel=index+1,base=assortment[(channel-22+63)%assortment.length];
 return {...base,baseId:base.id,id:`channel-${channel}`,code:String(channel),channel,cost:base.cost/1000,available:channel>=21};
});
export const products=channels.filter(channel=>channel.available);

export function createState() {
    return {balance: INITIAL_BALANCE, basket: [], busy: false, finished: false, recycled: false};
}

export function readyForPicnic(state) {
    return state.basket.some(p => p.type === 'drink') && state.basket.some(p => p.type === 'snack');
}

export function purchase(state, id) {
    const product = products.find(p => p.id === id);
    if (!product || state.busy || state.finished || state.balance < product.cost) return null;
    // Keep enough money for the missing picnic category, so the quest stays completable.
    const next = [...state.basket, product];
    const reserve = ['drink', 'snack'].reduce((total, type) => total + (next.some(p => p.type === type) ? 0 : Math.min(...products.filter(p => p.type === type).map(p => p.cost))), 0);
    if (state.balance - product.cost < reserve) return null;
    state.balance -= product.cost;
    state.basket.push(product);
    state.busy = true;
    return product;
}

export function productByCode(value) {
    const normalized=String(value).trim().replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
    return products.find(p=>p.code===normalized) ?? null;
}
