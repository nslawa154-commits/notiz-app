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
// Raster-Position (Reihe/Spalte) aus Kartenmitten schätzen
function gridPos(cards){var hs=cards.map(function(c){return c.r;}).sort(function(a,b){return a-b;}),h=hs.length?hs[hs.length>>1]*1.1:100;
  var srt=cards.slice().sort(function(a,b){return a.y-b.y;}),rows=[],cur=null;
  srt.forEach(function(c){if(!cur||c.y-cur.y>h*0.6){cur={y:c.y,list:[]};rows.push(cur);}cur.list.push(c);cur.y=(cur.y*(cur.list.length-1)+c.y)/cur.list.length;});
  rows.forEach(function(r,ri){r.list.sort(function(a,b){return a.x-b.x;}).forEach(function(c,ci){c.row=ri+1;c.col=ci+1;});});return cards;}
// Variante 2: Karten, die NICHT im Plan stehen
function cleanup(plan,cards){var F={},W={},Fl=[];plan.forEach(function(p){var f=String(p.fauf||"").replace(/\D/g,"");if(f){F[f]=1;Fl.push(f);}var w=normWkz(p.wkz);if(w)W[w]=1;});
  return cards.map(function(c){var f=c.fauf;
    if(f&&/^(1[89]|20)\d{5}$/.test(f)){if(F[f])return{card:c,status:"plan",why:"FAUF im Plan"};
      if(Fl.some(function(x){return ham(x,f)===1;}))return{card:c,status:"pruefen",why:"FAUF fast wie im Plan – evtl. falsch gelesen"};
      return{card:c,status:"raus",why:"FAUF nicht im Plan"};}
    if(c.wkz){if(W[c.wkz])return{card:c,status:"pruefen",why:"FAUF nicht lesbar, Wkz steht im Plan"};return{card:c,status:"raus",why:"FAUF nicht lesbar, Wkz nicht im Plan"};}
    return{card:c,status:"pruefen",why:"Nummer nicht lesbar"};});}
// ---- Excel/CSV/Einfügen: Tabelle -> Zeilen ----
function isGreenHex(h){h=String(h||"").replace(/^#?(FF)?(?=[0-9A-F]{6}$)/i,"");if(!/^[0-9A-F]{6}$/i.test(h))return false;var r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);return g>r+40&&g>b+30&&g>90;}
var DONE_RE=/(^|\s)(fertig|erledigt|done|ok)(\s|$|[.,!])|✓|✔/i;
// grid: Array<Array<string>>, fill(r,c)-> "green"|null|undefined (undefined = keine Farbinfo)
function parseTable(grid,fill){var hdr=-1,col={};
  for(var r=0;r<Math.min(grid.length,30)&&hdr<0;r++){var row=grid[r]||[];row.forEach(function(v,c){var t=String(v==null?"":v).toLowerCase().replace(/\s/g,"");
    if(/^fauf/.test(t))col.fauf=c;else if(/^wkz|werkzeug/.test(t))col.wkz=c;else if(/^avo/.test(t))col.avo=c;else if(t==="z")col.z=c;else if(/^st\.?$|^stück/.test(t))col.st=c;else if(/bemerk/.test(t))col.bem=c;});
    if(col.fauf!=null)hdr=r;else col={};}
  if(col.fauf==null){var cnt={};grid.forEach(function(row){(row||[]).forEach(function(v,c){if(/^(1[89]|20)\d{5}$/.test(String(v).trim()))cnt[c]=(cnt[c]||0)+1;});});
    var best=-1,bn=0;Object.keys(cnt).forEach(function(c){if(cnt[c]>bn){bn=cnt[c];best=+c;}});if(best<0)return {rows:[],cols:col,header:false};col.fauf=best;
    var wc={};grid.forEach(function(row){(row||[]).forEach(function(v,c){if(c!==best&&/^(R?\d{4,6})(\.\d{3})?$/i.test(String(v).trim()))wc[c]=(wc[c]||0)+1;});});
    var bw=-1,bwn=0;Object.keys(wc).forEach(function(c){if(wc[c]>bwn){bwn=wc[c];bw=+c;}});if(bw>=0)col.wkz=bw;}
  var out=[],hasColor=false;
  for(var i=hdr+1;i<grid.length;i++){var row=grid[i]||[],f=String(row[col.fauf]==null?"":row[col.fauf]).replace(/\D/g,"");if(!/^(1[89]|20)\d{5}$/.test(f))continue;
    var g=(col.bem!=null&&fill)?fill(i,col.bem):undefined;if(g===undefined&&fill){/* ganze Zeile prüfen */for(var c=0;c<row.length;c++){var x=fill(i,c);if(x==="green"){g="green";break;}if(x!==undefined)g=g||null;}}
    if(g!==undefined)hasColor=true;var bem=col.bem!=null?String(row[col.bem]==null?"":row[col.bem]).trim():"";
    out.push({fauf:f,wkz:col.wkz!=null?String(row[col.wkz]==null?"":row[col.wkz]).trim():"",avo:col.avo!=null?String(row[col.avo]||""):"",z:col.z!=null?String(row[col.z]||""):"",st:col.st!=null?String(row[col.st]||""):"",bem:bem,
      green:g==="green",marker:DONE_RE.test(bem)});}
  out.forEach(function(o){o.done=o.green||(!hasColor&&o.marker);});
  return {rows:out,cols:col,header:hdr>=0,hasColor:hasColor};}
function parseText(txt){var lines=String(txt||"").replace(/\r/g,"").split("\n").filter(function(l){return l.trim();});if(!lines.length)return {rows:[]};
  var sep=lines.some(function(l){return l.indexOf("\t")>=0;})?"\t":(lines[0].split(";").length>lines[0].split(",").length?";":",");
  var grid=lines.map(function(l){return l.split(sep).map(function(v){return v.replace(/^"|"$/g,"").trim();});});
  if(lines.every(function(l){return l.split(sep).length<2;}))grid=lines.map(function(l){return l.trim().split(/\s{2,}|\s+(?=\d)/);});
  return parseTable(grid,null);}
var api={parseTable:parseTable,parseText:parseText,isGreenHex:isGreenHex,findGreenRows:findGreenRows,findCards:findCards,match:match,normWkz:normWkz,gridPos:gridPos,cleanup:cleanup};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.TafelCore=api;
})(this);
