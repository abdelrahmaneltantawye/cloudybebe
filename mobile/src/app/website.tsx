import { Stack, useLocalSearchParams } from 'expo-router';
import { StoreBrowser } from '@/components/store-browser';
export default function Website() {const {url,title}=useLocalSearchParams<{url:string;title?:string}>();return <><Stack.Screen options={{title:title||'CloudyBebe'}}/><StoreBrowser url={url}/></>;}
