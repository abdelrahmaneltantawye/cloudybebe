import { useRef,useState } from 'react';
import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Button, Copy, Status } from '@/components/ui';
import { STORE_URL } from '@/lib/store';
import { theme as t } from '@/theme';
export function StoreBrowser({url, script, onMessage,onNavigation, privateSession=false}: {url:string;script?:string;onMessage?:(message:string)=>void;onNavigation?:(url:string)=>void;privateSession?:boolean}) {
  const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
  const web=useRef<WebView<object>>(null);
  let valid=false;try{valid=new URL(url).origin===STORE_URL;}catch{}
  if(!valid)return <Status error="This store link is not valid."/>;
  return <View style={{flex:1}}>{error?<View style={{padding:t.space.lg,gap:t.space.md}}><Copy style={{color:t.colors.error}}>{error}</Copy><Button label="Reload secure page" onPress={()=>{setError('');setLoading(true);web.current?.reload();}}/></View>:null}
    <WebView<object> ref={web} source={{uri:url}} incognito={privateSession} style={{flex:1,backgroundColor:t.colors.background}} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false}
      injectedJavaScript={script} onMessage={event=>onMessage?.(event.nativeEvent.data)}
      onLoadStart={()=>setLoading(true)} onLoadEnd={()=>setLoading(false)}
      onNavigationStateChange={state=>onNavigation?.(state.url)}
      onError={()=>{setLoading(false);setError('This page couldn’t load. Please check your connection and try again.');}}
      onHttpError={event=>{if(event.nativeEvent.url===url){setError('The store is temporarily unavailable. Please try again.');setLoading(false);}}}
      onShouldStartLoadWithRequest={request=>{
        if(request.url==='about:blank')return true;
        try{const parsed=new URL(request.url);if(parsed.protocol==='cloudybebe:'){onNavigation?.(request.url);return false;}if(parsed.protocol==='https:')return true;if(['mailto:','tel:'].includes(parsed.protocol))void Linking.openURL(request.url);}catch{}
        return false;
      }}/>
    {loading?<View style={{position:'absolute',top:0,left:0,right:0,backgroundColor:t.colors.background}}><Status loading/></View>:null}
  </View>;
}


