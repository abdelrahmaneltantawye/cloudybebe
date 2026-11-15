import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { ReactNode } from 'react';
export default function Root({children}:{children:ReactNode}) {
  const {bodyAttributes,bodyNodes,htmlAttributes,headNodes}=useServerDocumentContext();
  return <html lang="en" {...htmlAttributes}><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>CloudyBebe · Little things. Big love.</title><ScrollViewStyleReset/>{headNodes}<style dangerouslySetInnerHTML={{__html:'body { background: #F7F3F0; }'}}/></head><body {...bodyAttributes}>{children}{bodyNodes}</body></html>;
}
