const upstream='https://cloudybebe.com/wp-json/cloudybebe-mobile/v1/';
const routes=/^(?:config|auth\/(?:login|register|reset|logout)|me(?:\/(?:addresses|deletion))?|orders(?:\/\d+)?|registries(?:\/(?:\d+(?:\/items)?|find|public\/[A-Za-z0-9_-]+))?|registry-items\/\d+|checkout(?:\/[A-Za-z0-9_-]+\/status)?)(?:\?[^#]*)?$/;
async function proxy(request:Request) {
  const path=new URL(request.url).searchParams.get('path')||'';
  if(!routes.test(path)||/[\r\n\\]/.test(path))return Response.json({message:'Invalid store request.'},{status:400});
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return Response.json({message:'Invalid request origin.'},{status:403});
  try {
    const headers:Record<string,string>={Accept:'application/json'};
    const bearer=request.headers.get('authorization');
    if(bearer&&/^Bearer [A-Za-z0-9._~-]+$/.test(bearer))headers.Authorization=bearer;
    const receipt=request.headers.get('x-checkout-token');
    if(receipt&&/^[A-Za-z0-9._~-]+$/.test(receipt))headers['X-Checkout-Token']=receipt;
    let body:string|undefined;
    if(!['GET','HEAD'].includes(request.method)) {
      body=await request.text();
      if(body.length>64000)return Response.json({message:'This request is too large.'},{status:413});
      if(body){try{JSON.parse(body);}catch{return Response.json({message:'Invalid request.'},{status:400});}}
      headers['Content-Type']='application/json';
    }
    const response=await fetch(upstream+path,{method:request.method,headers,body,redirect:'error',signal:AbortSignal.timeout(25000)});
    return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Authorization, X-Checkout-Token','X-Content-Type-Options':'nosniff'}});
  }catch{return Response.json({message:'We couldn’t reach CloudyBebe. Please try again.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
export const GET=proxy;
export const POST=proxy;
export const PUT=proxy;
export const PATCH=proxy;
export const DELETE=proxy;
