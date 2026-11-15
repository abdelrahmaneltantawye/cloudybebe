import type { BagItem } from './bag';
export type CheckoutTicket = {url:string;checkout_id:string;checkout_token:string;expires_at:string};
export type CheckoutReceipt = {status:string;order_id?:number;order_number?:string;received:boolean;paid:boolean;currency?:string;total?:string};
export function validateTicket(ticket:CheckoutTicket) {
  const url=new URL(ticket.url);
  if(url.origin!=='https://cloudybebe.com'||url.username||url.password||url.pathname!=='/'||url.searchParams.get('cbm_handoff')!==ticket.checkout_id||!url.searchParams.get('ticket')||!/^[-a-f0-9]{36}$/.test(ticket.checkout_id)||!ticket.checkout_token||!Number.isFinite(Date.parse(ticket.expires_at))||Date.parse(ticket.expires_at)<=Date.now())throw new Error('The store could not prepare a valid checkout. Please try again.');
  return ticket;
}
export function isCheckoutReturn(url:string,checkoutId:string) {
  try{const target=new URL(url);return (target.origin==='https://cloudybebe.com'&&target.searchParams.get('cbm_checkout')===checkoutId)||(target.protocol==='cloudybebe:'&&target.hostname==='checkout-return'&&target.searchParams.get('checkout_id')===checkoutId);}catch{return false;}
}
export function receiptConfirmed(receipt:CheckoutReceipt) {
  return receipt.received===true&&Number.isSafeInteger(receipt.order_id)&&Number(receipt.order_id)>0&&['processing','completed','on-hold'].includes(receipt.status);
}
export type PendingCheckout = {ticket:CheckoutTicket;snapshot:BagItem[];userId:number|null};
