export function redirectSystemPath({path}:{path:string;initial:boolean}) {
  try {
    const url=new URL(path,'cloudybebe://app');
    if(url.protocol==='cloudybebe:'&&url.hostname==='checkout-return')return '/checkout-return';
    if(url.origin==='https://cloudybebe.com'&&['/baby-registry/','/gift-registry/'].includes(url.pathname)) {
      const token=url.searchParams.get('gift');
      if(token&&/^[a-f0-9]{48}$/.test(token))return `/registry/public/${token}`;
    }
    return path;
  }catch{return '/';}
}
