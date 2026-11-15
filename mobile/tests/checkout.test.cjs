const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(relative,globals={}) {
 const source=fs.readFileSync(path.join(__dirname,'../src',relative),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const context={exports:{},URL,Date,Number,...globals};vm.runInNewContext(compiled,context);return context.exports;
}
const {validateTicket,isCheckoutReturn,receiptConfirmed}=load('lib/checkout.ts');
const {checkoutItems,bagConflict,persistedBag,subtractPurchased,clampQuantity}=load('lib/bag.ts');
const plain=value=>JSON.parse(JSON.stringify(value));
const id='01234567-89ab-cdef-0123-456789abcdef';
const ticket={url:`https://cloudybebe.com/?cbm_handoff=${id}&ticket=one-use-secret`,checkout_id:id,checkout_token:'separate-receipt-secret',expires_at:new Date(Date.now()+600000).toISOString()};
test('checkout accepts only current store handoff with matching identifier',()=>{
 assert.equal(validateTicket(ticket),ticket);
 for(const url of ['https://example.com/',`https://cloudybebe.com.evil.test/?cbm_handoff=${id}&ticket=x`,`https://cloudybebe.com/?cbm_handoff=other&ticket=x`,'http://cloudybebe.com/'])assert.throws(()=>validateTicket({...ticket,url}));
 assert.throws(()=>validateTicket({...ticket,expires_at:'2000-01-01'}));
});
test('payment redirect URLs are hints only and cannot confirm an order',()=>{
 assert.equal(isCheckoutReturn(`https://cloudybebe.com/checkout/order-received/1?cbm_checkout=${id}`,id),true);
 assert.equal(isCheckoutReturn(`cloudybebe://checkout-return?checkout_id=${id}`,id),true);
 assert.equal(isCheckoutReturn(`https://evil.test/?cbm_checkout=${id}`,id),false);
 assert.equal(isCheckoutReturn('cloudybebe://checkout-return?checkout_id=other',id),false);
});
test('only authoritative received order states clear purchased bag rows',()=>{
 assert.equal(receiptConfirmed({status:'completed',received:true,paid:true,order_id:1}),true);
 assert.equal(receiptConfirmed({status:'on-hold',received:true,paid:false,order_id:1}),true);
 for(const status of ['pending','failed','cancelled','refunded'])assert.equal(receiptConfirmed({status,received:true,paid:false,order_id:1}),false);
 assert.equal(receiptConfirmed({status:'processing',received:false,order_id:1}),false);
 assert.equal(receiptConfirmed({status:'processing',received:true}),false);
});
const product={id:22,parent:10,add_to_cart:{minimum:2,maximum:10,multiple_of:2}};
const gift={registry_id:7,registry_item_id:8,registry_token:'share-token',registry_password:'private-password'};
test('variation and registry attribution reach server without substituting the parent SKU',()=>{
 assert.deepEqual(plain(checkoutItems([{product,quantity:2,registry:gift}])),[{product_id:10,variation_id:22,quantity:2,registry_id:7,registry_item_id:8,registry_token:'share-token',registry_password:'private-password'}]);
});
test('registry password is removed from persistent bag and required again after restore',()=>{
 const saved=persistedBag([{product,quantity:2,registry:gift}]);
 assert.equal(JSON.stringify(saved).includes('private-password'),false);
 assert.equal(saved[0].registry.requires_password,true);
 assert.throws(()=>checkoutItems(saved),/protected registry/);
});
test('normal shopping and separate registries cannot mix in checkout',()=>{
 assert.ok(bagConflict([{product,quantity:2}],gift));
 assert.ok(bagConflict([{product,quantity:2,registry:gift}]));
 assert.ok(bagConflict([{product,quantity:2,registry:gift}],{...gift,registry_id:9}));
 assert.equal(bagConflict([{product,quantity:2,registry:gift}],gift),'');
 assert.throws(()=>checkoutItems([{product,quantity:2},{product,quantity:2,registry:gift}]));
});
test('quantity constraints and invalid checkout quantities are enforced',()=>{
 assert.equal(clampQuantity(product,1),2);assert.equal(clampQuantity(product,5),4);assert.equal(clampQuantity(product,50),10);
 assert.throws(()=>checkoutItems([{product,quantity:0}]));assert.throws(()=>checkoutItems([{product,quantity:1.5}]));assert.throws(()=>checkoutItems([]));
});
test('order confirmation removes only purchased quantities and preserves subsequent additions',()=>{
 const rows=[{product,quantity:6},{product:{...product,id:33},quantity:1}];
 const purchased=[{product,quantity:2}];
 assert.deepEqual(plain(subtractPurchased(rows,purchased)).map(x=>[x.product.id,x.quantity]),[[22,4],[33,1]]);
 assert.equal(subtractPurchased([{product,quantity:2}],purchased).length,0);
 assert.equal(subtractPurchased([{product,quantity:2,registry:gift}],purchased).length,1);
});
test('web mobile proxy forwards only scoped JSON API plus explicit authentication headers',async()=>{
 const calls=[];
 const api=load('app/api/mobile+api.ts',{Request,Response,AbortSignal,fetch:async(url,options)=>{calls.push({url,options});return Response.json({ok:true});}});
 const request=new Request('http://localhost:8094/api/mobile?path=checkout%2F'+id+'%2Fstatus',{headers:{Authorization:'Bearer token-123','X-Checkout-Token':'receipt-123',Cookie:'unrelated=private'}});
 const response=await api.GET(request);
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(calls[0].options.headers.Authorization,'Bearer token-123');assert.equal(calls[0].options.headers['X-Checkout-Token'],'receipt-123');assert.equal(calls[0].options.headers.Cookie,undefined);
 for(const unsafe of ['https://evil.test/','../wp/v2/users','me/../orders','orders/1#evil','orders/1\\..\\me']){
  const result=await api.GET(new Request('http://localhost:8094/api/mobile?path='+encodeURIComponent(unsafe)));assert.equal(result.status,400);
 }
 const cross=await api.POST(new Request('http://localhost:8094/api/mobile?path=me',{method:'POST',headers:{Origin:'https://evil.test'},body:'{}'}));assert.equal(cross.status,403);
 assert.equal(calls.length,1);
});

test('different wildcard choices keep distinct bag identities while attribute ordering is stable',()=>{
 const {bagLineKey}=load('lib/bag.ts');
 const small={...product,selected_attributes:{size:'small',colour:'blue'}};
 const large={...product,selected_attributes:{size:'large',colour:'blue'}};
 assert.notEqual(bagLineKey(small),bagLineKey(large));
 assert.equal(bagLineKey(small),bagLineKey({...product,selected_attributes:{colour:'blue',size:'small'}}));
 assert.deepEqual(plain(checkoutItems([{product:small,quantity:2}]))[0].attributes,{size:'small',colour:'blue'});
 const left=subtractPurchased([{product:small,quantity:2},{product:large,quantity:2}],[{product:small,quantity:2}]);
 assert.equal(left.length,1);assert.equal(left[0].product.selected_attributes.size,'large');
});
