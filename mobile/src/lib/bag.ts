import type { Product } from './store';
export type RegistryGift = {registry_id:number;registry_item_id:number;registry_token?:string;registry_password?:string;registry_title?:string;requires_password?:boolean};
export type BagItem = {key:string;product:Product;quantity:number;registry?:RegistryGift};
export function bagLineKey(product:Product,registry?:RegistryGift) {
  const options=Object.entries(product.selected_attributes||{}).sort(([a],[b])=>a.localeCompare(b));
  return JSON.stringify([product.id,options,registry?.registry_id||0,registry?.registry_item_id||0]);
}
export function clampQuantity(product:Product, value:number) {
  const rules=product.add_to_cart;
  const min=Math.max(1,rules?.minimum||1), step=Math.max(1,rules?.multiple_of||1), max=Math.min(99,rules?.maximum||99);
  return Math.min(max,Math.max(min,min+Math.floor((value-min)/step)*step));
}
export function bagConflict(bag:BagItem[],registry?:RegistryGift) {
  if(!bag.length)return '';
  const current=bag[0].registry;
  if(Boolean(current)!==Boolean(registry))return 'Please check out your current bag before shopping for a registry or for yourself.';
  if(current&&registry&&current.registry_id!==registry.registry_id)return 'Please check out gifts from one registry at a time.';
  return '';
}
export function checkoutItems(bag:BagItem[]) {
  if(!bag.length)throw new Error('Your bag is empty.');
  const conflict=bag.slice(1).map(item=>bagConflict([bag[0]],item.registry)).find(Boolean);
  if(conflict)throw new Error(conflict);
  return bag.map(({product,quantity,registry})=>{
    if(!Number.isSafeInteger(quantity)||quantity<1)throw new Error('Please update the quantities in your bag.');
    if(registry?.requires_password&&!registry.registry_password)throw new Error('Open this password-protected registry again and re-add your gifts before checkout.');
    return {product_id:product.parent||product.id,...(product.parent?{variation_id:product.id, ...(product.selected_attributes?{attributes:product.selected_attributes}:{})}:{}),quantity,...(registry?{registry_id:registry.registry_id,registry_item_id:registry.registry_item_id,registry_token:registry.registry_token,registry_password:registry.registry_password}: {})};
  });
}
export function persistedBag(bag:BagItem[]) {
  return bag.map(item=>{
    if(!item.registry)return item;
    const {registry_password,...registry}=item.registry;
    return {...item,registry:{...registry,requires_password:Boolean(registry.requires_password||registry_password)}};
  });
}
export function subtractPurchased(bag:BagItem[],purchased:BagItem[]) {
  return bag.flatMap(item=>{
    const paid=purchased.find(row=>bagLineKey(row.product,row.registry)===bagLineKey(item.product,item.registry));
    if(!paid)return [item];
    return item.quantity>paid.quantity?[{...item,quantity:item.quantity-paid.quantity}]:[];
  });
}
