// Tafel-Finder Kernlogik (Browser + Node)
(function(root){
"use strict";
function cx(b){return (b.x0+b.x1)/2;} function cy(b){return (b.y0+b.y1)/2;}
function isGreen(p){var r=p[0],g=p[1],b=p[2];return g>r+35&&g>b+25&&g>70;}
function normWkz(s){s=String(s||"").toUpperCase().replace(/^[^0-9R]+/,"").replace(/O/g,"0").replace(/\s/g,"");s=s.replace(/\.\d{3}$/,"");s=s.replace(/^0+(?=\d)/,"");
  var m=s.match(/^0?R(\d{4})/);if(m)return "R"+m[1];m=s.match(/(\d{5,6})/);return m?String(+m[1]):s;}
// words: [{t,b:{x0,y0,x1,y1}}], px(x,y)->[r,g,b], W,H
function findGreenRows(words,px,W,H){
  var fauf=words.filter(function(w){return /^[12]\d{6}$/.test(w.t);});
  var wkzRe=/^(R\d{4}|\d{5})$/;
  var out=[];
  fauf.forEach(function(f){
    var h=f.b.y1-f.b.y0,x=cx(f.b),y=cy(f.b),slope=0,last=f,wkz=null;
    var cand=words.filter(function(w){return cx(w.b)>f.b.x1&&w!==f;}).sort(function(a,b){return cx(a.b)-cx(b.b);});
    cand.forEach(function(w){var py=y+slope*(cx(w.b)-x);if(Math.abs(cy(w.b)-py)<h*0.55&&(w.b.y1-w.b.y0)<h*1.6){
      if(!wkz&&wkzRe.test(w.t.replace(/[^0-9R]/g,"")))wkz=w.t.replace(/[^0-9R]/g,"");
      if(/^[0-9A-Z]{1,5}$/.test(w.t)&&cx(w.b)-x<W*0.5){var dx=cx(w.b)-x;if(dx>h*3){slope=(cy(w.b)-y)/dx;}last=w;}}});
    // scan Bemerkung region right of last word
    var x0=last.b.x1+h*0.8,x1=Math.min(W-2,x0+W*0.35),n=0,g=0;
    for(var xx=x0;xx<x1;xx+=3){var yy=Math.round(y+slope*(xx-x));if(yy<1||yy>=H-1)continue;n++;if(isGreen(px(Math.round(xx),yy)))g++;}
    var frac=n?g/n:0;
    out.push({fauf:f.t,wkz:wkz||"",green:frac>0.42,frac:Math.round(frac*100)/100,y:y});
  });
  return out;
}
// board: find cards
function findCards(words){
  var cards=[];
  var wk=words.filter(function(w){var t=w.t.replace(/^[^0-9]+/,"").replace(/O/g,"0");return /^0(R\d{4}|\d{5})([.,]|$)/.test(t);});
  var fa=words.filter(function(w){return /^(1[89]|20)\d{5}$/.test(w.t.replace(/\D/g,""));});
  wk.forEach(function(w){var h=w.b.y1-w.b.y0,best=null,bd=1e9;
    fa.forEach(function(f){var dy=cy(w.b)-cy(f.b),dx=cx(f.b)-cx(w.b);if(dy>0&&dy<h*2.6&&Math.abs(dx)<(w.b.x1-w.b.x0)*0.9){var d=dy+Math.abs(dx)*0.3;if(d<bd){bd=d;best=f;}}});
    var bw=w.b.x1-w.b.x0;
    cards.push({wkz:normWkz(w.t),wkzRaw:w.t,fauf:best?best.t.replace(/\D/g,""):"",x:cx(w.b),y:cy(w.b)-h*0.6,r:bw*0.75});});
  // FAUF without Wkz
  fa.forEach(function(f){if(!cards.some(function(c){return c.fauf===f.t.replace(/\D/g,"");})){var h=f.b.y1-f.b.y0;cards.push({wkz:"",fauf:f.t.replace(/\D/g,""),x:cx(f.b)-h*2,y:cy(f.b)+h,r:h*9});}});
  // Duplikate (Kachel-Überlappung) zusammenführen
  var res=[];cards.forEach(function(c){var d=res.find(function(o){return Math.hypot(o.x-c.x,o.y-c.y)<Math.max(o.r,c.r)*0.6;});
    if(!d)res.push(c);else{if(!d.fauf&&c.fauf)d.fauf=c.fauf;if(!d.wkz&&c.wkz){d.wkz=c.wkz;d.x=c.x;d.y=c.y;d.r=c.r;}}});
  return res;
}
function ham(a,b){if(a.length!==b.length)return 9;var n=0;for(var i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n;}
function match(items,cards){
  return items.map(function(it){var f=String(it.fauf||"").replace(/\D/g,""),wk=normWkz(it.wkz);
    var exact=f?cards.filter(function(c){return c.fauf===f;}):[];
    if(exact.length)return {item:it,status:"sicher",cards:exact};
    var cand=cards.filter(function(c){return (wk&&c.wkz===wk)||(f&&c.fauf&&ham(c.fauf,f)===1&&(!c.wkz||c.wkz===wk));});
    return {item:it,status:cand.length?"kandidat":"nicht gefunden",cards:cand};});
}
var api={findGreenRows:findGreenRows,findCards:findCards,match:match,normWkz:normWkz};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.TafelCore=api;
})(this);
