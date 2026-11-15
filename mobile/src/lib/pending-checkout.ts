import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { PendingCheckout } from './checkout';
import { persistedBag } from './bag';
const KEY='cloudybebe-checkout-v1';
let pending:PendingCheckout|null=null;
export async function saveCheckout(value:PendingCheckout) {
  if(Platform.OS!=='web') {
    await AsyncStorage.setItem(KEY,JSON.stringify({snapshot:persistedBag(value.snapshot),userId:value.userId}));
    await SecureStore.setItemAsync(KEY,JSON.stringify(value.ticket),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
  }
  pending=value;
}
export async function readCheckout() {
  if(pending||Platform.OS==='web')return pending;
  const [secret,local]=await Promise.all([SecureStore.getItemAsync(KEY),AsyncStorage.getItem(KEY)]);
  if(secret&&local){try{pending={...JSON.parse(local),ticket:JSON.parse(secret)};}catch{await clearCheckout();}}
  return pending;
}
export async function clearCheckout() {
  pending=null;
  if(Platform.OS!=='web')await Promise.all([SecureStore.deleteItemAsync(KEY),AsyncStorage.removeItem(KEY)]);
}
