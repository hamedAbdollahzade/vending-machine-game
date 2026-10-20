import {purchase} from './game-state.js';
export function createPayment(){return {phase:'idle',product:null};}
export function beginPayment(state,payment,product){
 if(payment.phase!=='idle'||!product||!purchase({...state,basket:[...state.basket]},product.id))return false;
 payment.product=product;payment.phase='approaching';state.busy=true;return true;
}
export function swipePayment(state,payment){
 if(payment.phase!=='ready')return false;
 state.busy=false;
 if(!purchase(state,payment.product.id)){payment.phase='idle';payment.product=null;return false;}
 payment.phase='approved';return true;
}
export function cancelPayment(state,payment){
 if(!['approaching','ready'].includes(payment.phase))return false;
 payment.phase='idle';payment.product=null;state.busy=false;return true;
}
