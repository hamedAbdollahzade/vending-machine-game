export const chapters = {
 morning:{title:'تپهٔ آرزوها',lines:['پدر: بریم تپه؟ امروز راه رو با هم کشف می‌کنیم.']},
 rabbit:{title:'یک دوست کوچک',lines:['بچه: یه خرگوش! آروم نگاهش کنیم؟'],action:{value:'watch',label:'تماشای خرگوش'}},
 bridge:{title:'روی پل',lines:['پدر: دستم رو بگیر؛ با هم رد می‌شیم.']},
 fish:{title:'زیر پل',lines:['بچه: ماهی‌ها رو ببین!']},
 courage:{title:'اولین خرید من',lines:['پدر: حالا برای پیک‌نیک خرید کنیم.']},
 wind:{title:'باد و نقاشی',lines:['بچه: نقاشیم رفت کنار بوته!']},
 paper:{title:'پیداش کردیم',lines:['بچه: سالمه! بالای تپه کاملش می‌کنم.'],action:{value:'recover',label:'برداشتن نقاشی'}},
 fork:{title:'مسیر تپه',lines:['پدر: از راه آفتابی به تپه می‌رسیم.'],action:{value:'sunny',label:'ادامهٔ مسیر'}},
 sunny:{title:'رنگ‌های جنگل',lines:['بچه: این رنگ‌ها رو توی نقاشیم می‌کشم!']},
 shade:{title:'درخت خاطره‌ها',lines:['پدر: بچه که بودم هم زیر همین درخت می‌نشستم.']},
 summit:{title:'کنار هم',lines:['بچه: دفعهٔ بعد، من راه رو نشونت می‌دم!'],action:{value:'gold',label:'کامل کردن نقاشی'}}
};
export function createStory(){return {done:[],rabbitChoice:null,route:null,sky:null};}
export function completeChapter(story,id,choice){
    if(!chapters[id]||story.done.includes(id))return false;
    if(chapters[id].action&&chapters[id].action.value!==choice)return false;
    story.done.push(id);
    if(id==='rabbit')story.rabbitChoice=choice;
    if(id==='fork')story.route=choice;
    if(id==='summit')story.sky=choice;
    return true;
}
export function nextChapter(story,x){
    const done=id=>story.done.includes(id);
    if(!done('morning'))return 'morning';
    for(const [id,threshold] of [['rabbit',-3.7],['bridge',-2.2],['fish',0],['courage',2.7],['wind',12],['paper',14],['fork',16]]){
        if(!done(id))return x>=threshold?id:null;
    }
    if(!done(story.route))return x>=19?story.route:null;
    return null;
}
export function storyReady(story){return ['morning','rabbit','bridge','fish','courage','wind','paper','fork',story.route].every(id=>story.done.includes(id));}
export function routeOffset(story,x){if(x>12&&x<15&&story.done.includes('wind'))return Math.sin((x-12)/3*Math.PI)*1.5;if(x<=16||x>=21||!story.route)return 0;return Math.sin((x-16)/5*Math.PI)*(story.route==='sunny'?2.2:-2.2);}
export function discoveries(story){const entries=[];if(story.done.includes('rabbit'))entries.push(story.rabbitChoice==='sketch'?'🐇 نقاشی خرگوش':'🐇 تماشای آرام خرگوش');if(story.done.includes('fish'))entries.push('🐟 ماهی‌های زیر پل');if(story.done.includes('courage'))entries.push('🌉 پل شجاعت');if(story.done.includes('paper'))entries.push('📄 نقاشی بازیابی‌شده');if(story.done.includes('sunny'))entries.push('🦋 رنگ‌های پروانه‌ها');if(story.done.includes('shade'))entries.push('🌳 خاطرهٔ درخت قدیمی');return entries;}
