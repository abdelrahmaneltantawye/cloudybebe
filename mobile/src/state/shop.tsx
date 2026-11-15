import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Product } from '@/lib/store';
import {bagConflict,bagLineKey,clampQuantity,persistedBag,subtractPurchased,type BagItem,type RegistryGift} from '@/lib/bag';
export type {BagItem,RegistryGift} from '@/lib/bag';
type State = {bag: BagItem[]; saved: Product[];processedCheckouts:string[]};
const empty: State = {bag: [], saved: [],processedCheckouts:[]};
type Shop = State & {ready: boolean; storageError: string; count: number; add: (product: Product, quantity?:number, registry?:RegistryGift) => string; quantity: (id: number|string, quantity: number) => void; toggleSaved: (product: Product) => void; clearBag: () => void; removePurchased:(snapshot:BagItem[],checkoutId:string)=>Promise<void>};
const Context = createContext<Shop | null>(null);
export function ShopProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<State>(empty);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const current=useRef<State>(empty);const hydrated=useRef(false);const writes=useRef(Promise.resolve());
  const commit=useCallback((change:(old:State)=>State)=>{
    const next=change(current.current);if(next===current.current)return writes.current;
    current.current=next;setState(next);
    if(!hydrated.current)return Promise.resolve();
    const write=writes.current.catch(()=>{}).then(()=>AsyncStorage.setItem('cloudybebe-shop-v1',JSON.stringify({...next,bag:persistedBag(next.bag)})));
    writes.current=write;
    void write.catch(()=>setStorageError('Your changes are available now, but could not be saved on this device.'));
    return write;
  },[]);
  useEffect(() => {
    AsyncStorage.getItem('cloudybebe-shop-v1').then(raw => {
      if (raw) { const value = JSON.parse(raw); if (Array.isArray(value.bag) && Array.isArray(value.saved)) {
        const validProduct=(p:Product)=>p&&Number.isSafeInteger(p.id)&&p.id>0&&p.prices&&Array.isArray(p.images)&&p.add_to_cart;
        const restored={bag:value.bag.filter((row:BagItem)=>row&&validProduct(row.product)&&Number.isSafeInteger(row.quantity)&&row.quantity>0).map((row:BagItem)=>({...row,key:bagLineKey(row.product,row.registry)})),saved:value.saved.filter(validProduct),processedCheckouts:Array.isArray(value.processedCheckouts)?value.processedCheckouts.filter((id:unknown)=>typeof id==='string').slice(-100):[]};
        current.current=restored;setState(restored);
      } }
    }).catch(() => setStorageError('Your saved bag could not be restored.'))
      .finally(() => {hydrated.current=true;setReady(true);});
  }, []);
  const add = useCallback((product: Product, amount?:number, registry?:RegistryGift) => {
    if(!hydrated.current)return 'Your bag is still loading. Please try again.';
    if (!product.is_in_stock || !product.is_purchasable || product.has_options) return 'This item is unavailable. Please choose an available option.';
    const conflict=bagConflict(current.current.bag,registry);if(conflict)return conflict;
    const lineKey=bagLineKey(product,registry),existingLine=current.current.bag.find(row=>row.key===lineKey);
    if(!existingLine&&current.current.bag.length>=50)return 'Your bag can hold up to 50 product lines. Please check out before adding more.';
    const requested=amount??product.add_to_cart.minimum??1;
    if(!Number.isFinite(requested)||requested<1)return 'Choose a valid quantity.';
    const permitted=clampQuantity(product,requested),maximum=Math.min(99,product.add_to_cart.maximum||99);
    if(existingLine&&existingLine.quantity+permitted>maximum)return `You can add up to ${maximum} of this item. Check the quantity already in your bag.`;
    commit(old => {
      const key=bagLineKey(product,registry);
      const existing = old.bag.find(item => item.key===key);
      const step = product.add_to_cart.multiple_of || 1;
      const value=clampQuantity(product,amount??product.add_to_cart.minimum??step);
      return {...old, bag: existing ? old.bag.map(item => item.key===key ? {...item,product,registry:registry||item.registry,quantity:clampQuantity(product,item.quantity+value)} : item) : [...old.bag, {key,product, quantity:value,registry}]};
    });
    return '';
  }, [commit]);
  const quantity = useCallback((id: number|string, value: number) => commit(old => ({...old, bag: old.bag.flatMap(item => {
    if (typeof id==='string'?item.key!==id:item.product.id!==id) return [item];
    if (value <= 0) return [];
    return [{...item, quantity:clampQuantity(item.product,value)}];
  })})), [commit]);
  const toggleSaved = useCallback((product: Product) => {if(hydrated.current)commit(old => ({...old, saved: old.saved.some(item => item.id === product.id) ? old.saved.filter(item => item.id !== product.id) : [...old.saved, product]}));}, [commit]);
  const clearBag = useCallback(() => commit(old => ({...old, bag:[]})), [commit]);
  const removePurchased=useCallback((snapshot:BagItem[],checkoutId:string)=>commit(old=>old.processedCheckouts.includes(checkoutId)?old:{...old,bag:subtractPurchased(old.bag,snapshot),processedCheckouts:[...old.processedCheckouts,checkoutId].slice(-100)}),[commit]);
  const value = useMemo(() => ({...state, ready, storageError, count: state.bag.reduce((sum,item) => sum + item.quantity, 0), add, quantity, toggleSaved, clearBag,removePurchased}), [state, ready, storageError, add, quantity, toggleSaved, clearBag,removePurchased]);
  return <Context value={value}>{children}</Context>;
}
export function useShop() { const shop = use(Context); if (!shop) throw new Error('Missing ShopProvider'); return shop; }
