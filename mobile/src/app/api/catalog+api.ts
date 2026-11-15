const upstream='https://cloudybebe.com/wp-json/wc/store/v1/';
export async function GET(request: Request) {
  const path=new URL(request.url).searchParams.get('path')||'';
  if(!/^products(?:\/categories|\/\d+)?(?:\?[^#]*)?$/.test(path))return Response.json({message:'Invalid catalog request.'},{status:400});
  try {
    const response=await fetch(upstream+path,{signal:AbortSignal.timeout(20000)});
    return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=30'}});
  }catch{return Response.json({message:'The store is temporarily unavailable.'},{status:502});}
}
