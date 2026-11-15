import { Linking, View } from 'react-native';
import { Button, Copy } from '@/components/ui';
import { STORE_URL } from '@/lib/store';
import { theme as t } from '@/theme';
export function StoreBrowser({url}: {url:string;script?:string;onMessage?:(message:string)=>void;onNavigation?:(url:string)=>void;privateSession?:boolean}) {
  let valid=false;try{valid=new URL(url).origin===STORE_URL;}catch{}
  return <View style={{padding:t.space.xl,gap:t.space.lg,maxWidth:600,alignSelf:'center'}}><Copy>Open the secure website in a new tab, then return here to check your order. On iOS and Android, checkout opens inside the app.</Copy><Button label="Open secure website" disabled={!valid} onPress={()=>{void Linking.openURL(url);}}/></View>;
}
