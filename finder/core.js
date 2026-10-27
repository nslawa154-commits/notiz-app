// Tafel-Finder Kernlogik (Browser + Node)
(function(root){
"use strict";
function cx(b){return (b.x0+b.x1)/2;} function cy(b){return (b.y0+b.y1)/2;}
function normWkz(s){s=String(s||"").toUpperCase().replace(/^[^0-9R]+/,"").replace(/O/g,"0").replace(/\s/g,"");s=s.replace(/\.\d{3}$/,"");s=s.replace(/^0+(?=\d)/,"");
  var m=s.match(/^0?R(\d{4})/);if(m)return "R"+m[1];m=s.match(/(\d{5,6})/);return m?String(+m[1]):s;}
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
var DONE_RE=/(^|\s)(fertig|erledigt|done|ok)(\s|$|[.,!])|✓|✔/i;
function hkey(v){var t=String(v==null?"":v).toLowerCase().replace(/[^a-zäöü0-9]/g,"");
  if(/^vorgmenge|^vorgangsmenge/.test(t))return "vm";if(/^gutmenge|^gutmng/.test(t))return "gm";if(/^nacharb/.test(t))return "na";
  if(/^vorg(ang)?(nr)?$|^vorg/.test(t))return "vg";if(/^material|^matnr/.test(t))return "mat";if(/^auftrag|^fauf/.test(t))return "auf";
  if(/^wkz|werkzeug/.test(t))return "wkz";if(/^avo/.test(t))return "avo";if(/bemerk/.test(t))return "bem";return null;}
// grid: Array<Array<string|number>>
function parseTable(grid){var hdr=-1,col={};
  for(var r=0;r<Math.min(grid.length,30)&&hdr<0;r++){col={};(grid[r]||[]).forEach(function(v,c){var k=hkey(v);if(k&&col[k]==null)col[k]=c;});
    if((col.vm!=null&&col.gm!=null)||col.auf!=null)hdr=r;}
  if(hdr<0){col={};var cnt={};grid.forEach(function(row){(row||[]).forEach(function(v,c){if(/^(1[89]|20)\d{5}$/.test(String(v).trim()))cnt[c]=(cnt[c]||0)+1;});});
    var best=-1,bn=0;Object.keys(cnt).forEach(function(c){if(cnt[c]>bn){bn=cnt[c];best=+c;}});if(best<0)return {rows:[],orders:[],cols:col,header:false};col.auf=best;
    var wc={};grid.forEach(function(row){(row||[]).forEach(function(v,c){if(c!==best&&/^0?(R?\d{4,6})(\.\d{3})?$/i.test(String(v).trim()))wc[c]=(wc[c]||0)+1;});});
    var bw=-1,bwn=0;Object.keys(wc).forEach(function(c){if(wc[c]>bwn){bwn=wc[c];bw=+c;}});if(bw>=0)col.mat=bw;}
  if(col.mat==null&&col.wkz!=null)col.mat=col.wkz;
  var g=function(row,k){return col[k]==null?"":(row[col[k]]==null?"":row[col[k]]);};
  var hasQty=col.vm!=null&&col.gm!=null,rows=[];
  for(var i=hdr+1;i<grid.length;i++){var row=grid[i]||[];var f=String(g(row,"auf")).replace(/\D/g,"");var m=String(g(row,"mat")).trim();
    var o={auftrag:(hdr>=0?/^[1-9]\d{6}$/:/^(1[89]|20)\d{5}$/).test(f)?f:"",material:m,vorgang:String(g(row,"vg")).trim(),vorg:hasQty?num(g(row,"vm")):null,gut:hasQty?num(g(row,"gm")):null,nach:col.na!=null?num(g(row,"na")):null,bem:String(g(row,"bem")).trim()};
    if(o.vorgang&&/^\d{1,3}$/.test(o.vorgang))o.vorgang=("000"+o.vorgang).slice(-4);
    if(!o.auftrag&&!o.material&&!o.vorgang)continue;
    if(!o.material&&!o.vorgang&&o.auftrag){o.vorg=o.gut=null;}// Zwischensumme
    rows.push(o);}
  var ev=evalOrders(rows);
  if(!hasQty)ev.rows.forEach(function(r){r.done=DONE_RE.test(r.bem);});
  return {rows:ev.rows,orders:hasQty?ev.orders:null,cols:col,header:hdr>=0,hasQty:hasQty};}
function parseText(txt){var lines=String(txt||"").replace(/\r/g,"").split("\n").filter(function(l){return l.trim();});if(!lines.length)return {rows:[]};
  var sep=lines.some(function(l){return l.indexOf("\t")>=0;})?"\t":(lines[0].split(";").length>lines[0].split(",").length?";":",");
  var grid=lines.map(function(l){return l.split(sep).map(function(v){return v.replace(/^"|"$/g,"").trim();});});
  if(lines.every(function(l){return l.split(sep).length<2;}))grid=lines.map(function(l){return l.trim().split(/\s{2,}|\s+(?=\d)/);});
  return parseTable(grid);}
// ===== v2.0: Erledigt = Gutmenge == VorgMenge =====
// Graustufen-Bild vorbereiten (Moiré weg, Gitterlinien weg, Hintergrund flach)
function prepExcel(gray,W,H){var n=W*H,a=new Float32Array(n),t=new Float32Array(n),x,y,i;
  var k=[1,4,6,4,1];for(y=0;y<H;y++)for(x=0;x<W;x++){var s=0,ws=0;for(var d=-2;d<=2;d++){var xx=x+d;if(xx<0||xx>=W)continue;s+=gray[y*W+xx]*k[d+2];ws+=k[d+2];}t[y*W+x]=s/ws;}
  for(y=0;y<H;y++)for(x=0;x<W;x++){var s2=0,w2=0;for(var d2=-2;d2<=2;d2++){var yy=y+d2;if(yy<0||yy>=H)continue;s2+=t[yy*W+x]*k[d2+2];w2+=k[d2+2];}a[y*W+x]=s2/w2;}
  var R=20,W1=W+1,ii=new Float64Array(W1*(H+1));for(y=0;y<H;y++){var rs=0;for(x=0;x<W;x++){rs+=a[y*W+x];ii[(y+1)*W1+x+1]=ii[y*W1+x+1]+rs;}}
  var m=new Float32Array(n);for(y=0;y<H;y++){var y0=Math.max(0,y-R),y1=Math.min(H,y+R+1);for(x=0;x<W;x++){var x0=Math.max(0,x-R),x1=Math.min(W,x+R+1);
    m[y*W+x]=(ii[y1*W1+x1]-ii[y0*W1+x1]-ii[y1*W1+x0]+ii[y0*W1+x0])/((y1-y0)*(x1-x0));}}
  var b=new Uint8Array(n);for(i=0;i<n;i++)b[i]=a[i]<m[i]-20?1:0;
  var L=Math.round(W*0.025),ln=new Uint8Array(n),run;
  for(y=0;y<H;y++){run=0;for(x=0;x<=W;x++){if(x<W&&b[y*W+x])run++;else{if(run>=L)for(var q=x-run;q<x;q++)ln[y*W+q]=1;run=0;}}}
  for(x=0;x<W;x++){run=0;for(y=0;y<=H;y++){if(y<H&&b[y*W+x])run++;else{if(run>=L)for(var q2=y-run;q2<y;q2++)ln[q2*W+x]=1;run=0;}}}
  var out=new Uint8ClampedArray(n);for(y=0;y<H;y++)for(x=0;x<W;x++){i=y*W+x;var l=ln[i]||(x>0&&ln[i-1])||(x<W-1&&ln[i+1])||(y>0&&ln[i-W])||(y<H-1&&ln[i+W]);
    out[i]=l?255:Math.max(0,Math.min(255,(a[i]-m[i])*3.5+235));}
  return out;}
// Schräglage (Grad) schätzen: Projektionsprofil auf verkleinertem Bild
function estimateSkew(gray,W,H){var f=Math.max(1,Math.round(W/800)),w=Math.floor(W/f),h=Math.floor(H/f),a=new Float32Array(w*h),x,y;
  for(y=0;y<h;y++)for(x=0;x<w;x++)a[y*w+x]=gray[(y*f)*W+x*f];
  var R=7,W1=w+1,ii=new Float64Array(W1*(h+1));for(y=0;y<h;y++){var rs=0;for(x=0;x<w;x++){rs+=a[y*w+x];ii[(y+1)*W1+x+1]=ii[y*W1+x+1]+rs;}}
  var px=[],py=[];for(y=0;y<h;y++){var y0=Math.max(0,y-R),y1=Math.min(h,y+R+1);for(x=0;x<w;x++){var x0=Math.max(0,x-R),x1=Math.min(w,x+R+1);
    var m=(ii[y1*W1+x1]-ii[y0*W1+x1]-ii[y1*W1+x0]+ii[y0*W1+x0])/((y1-y0)*(x1-x0));if(a[y*w+x]<m-8){px.push(x-w/2);py.push(y);}}}
  var best=0,bs=-1,hist=new Float64Array(h*2+w);for(var ang=-8;ang<=8.001;ang+=0.25){var t=Math.tan(ang*Math.PI/180),off=Math.ceil(w/2*Math.abs(t))+1;hist.fill(0);
    for(var i=0;i<px.length;i++){var k=Math.round(py[i]-px[i]*t)+off;if(k>=0&&k<hist.length)hist[k]++;}var sc=0;for(var j=0;j<hist.length;j++)sc+=hist[j]*hist[j];if(sc>bs){bs=sc;best=ang;}}
  return best;}
function median(v){if(!v.length)return null;v=v.slice().sort(function(a,b){return a-b;});return v[v.length>>1];}
function theilSen(pts){if(pts.length<3)return null;var s=[];for(var i=0;i<pts.length;i++)for(var j=i+1;j<pts.length;j++){var dy=pts[j][1]-pts[i][1];if(Math.abs(dy)>30)s.push((pts[j][0]-pts[i][0])/dy);}return median(s);}
var MAT_RE=/0\d{5}[.,]\d{3}|0R\d{4}[.,]\d{3}/;
function normMat(t){t=String(t||"").toUpperCase().replace(/O/g,"0");var m=t.match(/0\d{5}[.,]\d{3}/)||t.match(/0R\d{4}[.,]\d{3}/);if(m)return m[0].replace(",",".");
  var d=t.replace(/[^0-9R]/g,"");m=d.match(/(0\d{5})(\d{3})$/);if(m)return m[1]+"."+m[2];return "";}
function normAuf(t){var m=String(t||"").replace(/\D/g,"").match(/(1[89]|20)\d{5}/);return m?m[0]:"";}
function normVg(t){var d=String(t||"").replace(/\D/g,"");if(/^0\d{3}$/.test(d))return d;if(/^[1-9]0\d{3}$/.test(d))return d.slice(1);if(/^\d{3}$/.test(d)&&/0$/.test(d))return "0"+d;return "";}
function normInt(t){var d=String(t||"").replace(/[^\d]/g,"");if(!d||d.length>5)return null;return +d;}
// Kopfzeile + Spalten (mit Schräglage) aus Wörtern einer Ganzseiten-Erkennung bestimmen
function excelLayout(words,W,H){var hd={};words.forEach(function(w){var t=w.t.toLowerCase().replace(/[^a-zäöü]/g,"");if(!t)return;
    var put=function(k,x0){if(!hd[k]||Math.abs(cy(w.b)-H*0.2)<Math.abs(cy(hd[k].b)-H*0.2))hd[k]={x0:x0,b:w.b};};
    if(/material/.test(t))put("mat",w.b.x0);if(/uftrag/.test(t))put("auf",w.b.x0);if(/achar|charb/.test(t))put("na",w.b.x0);
    if(/gutm|utmenge/.test(t))put("gm",w.b.x0);
    var iv=t.indexOf("vorgm");if(iv<0)iv=t.indexOf("orgmenge")>=0?t.indexOf("orgmenge")-1:-1;
    if(iv>=0){put("vm",w.b.x0+(w.b.x1-w.b.x0)*Math.max(0,iv)/t.length);var j=t.indexOf("vorg");if(j>=0&&j<iv)put("vg",w.b.x0);}
    else if(/^.?vorg.?.?$/.test(t))put("vg",w.b.x0);});
  if(!hd.vm||!hd.gm)return null;
  var hy=median(Object.keys(hd).map(function(k){return cy(hd[k].b);})),ch=median(Object.keys(hd).map(function(k){return hd[k].b.y1-hd[k].b.y0;}))||20;
  Object.keys(hd).forEach(function(k){if(Math.abs(cy(hd[k].b)-hy)>ch*2.5)delete hd[k];});if(!hd.vm||!hd.gm)return null;
  var ew=hd.gm.x0-hd.vm.x0,m=ch*0.4;
  var order=["mat","auf","vg","vm","gm","na"],xs=order.map(function(k){return hd[k]?hd[k].x0:null;});
  if(xs[2]==null)xs[2]=xs[3]-ew*0.35;if(xs[5]==null)xs[5]=xs[4]+ew;
  var cols={};for(var i=0;i<5;i++){if(xs[i]==null)continue;var nx=null;for(var j=i+1;j<6;j++)if(xs[j]!=null){nx=xs[j];break;}if(nx==null)continue;cols[order[i]]={x0:xs[i]-m,x1:nx-m};}
  // Schräglage je Spalte aus erkannten Werten
  var pts={mat:[],vg:[]};words.forEach(function(w){if(cy(w.b)<hy+ch)return;if(MAT_RE.test(w.t.replace(/O/g,"0")))pts.mat.push([w.b.x0,cy(w.b)]);else if(/^\W*1?0\d{3}\W*$/.test(w.t))pts.vg.push([w.b.x0,cy(w.b)]);});
  var lx=[],lv=[];["mat","vg"].forEach(function(k){if(!cols[k])return;var s=theilSen(pts[k].filter(function(p){return p[0]>cols[k].x0-ew&&p[0]<cols[k].x1+ew;}));if(s!=null&&Math.abs(s)<0.3){lx.push((cols[k].x0+cols[k].x1)/2);lv.push(s);}});
  var leanAt=function(x){if(!lv.length)return 0;if(lv.length===1)return lv[0];var a=(lv[1]-lv[0])/(lx[1]-lx[0]);return lv[0]+a*(x-lx[0]);};
  Object.keys(cols).forEach(function(k){var c=cols[k];c.lean=leanAt((c.x0+c.x1)/2);
    if(k==="vm"||k==="gm"){var p=[];words.forEach(function(w){if(cy(w.b)<hy+ch||!/^\W*\d{1,4}\W*$/.test(w.t))return;var sx=w.b.x1-c.lean*(cy(w.b)-hy);if(sx>c.x0&&sx<c.x1+m*2)p.push([w.b.x1,cy(w.b)]);});var s=theilSen(p);if(s!=null&&p.length>=5&&Math.abs(s-c.lean)<0.06)c.lean=s;}});
  return {cols:cols,hy:hy,ch:ch,W:W,H:H};}
// Zeilen zusammensetzen. lines: {mat:[{t,y}],auf:[],vg:[],vm:[],gm:[]} (y im Originalbild)
function wordsToCols(words,lay){var o={};Object.keys(lay.cols).forEach(function(k){var c=lay.cols[k];o[k]=[];words.forEach(function(w){var y=cy(w.b);if(y<lay.hy+lay.ch*0.7)return;
  var x=(k==="vm"||k==="gm"?w.b.x1-lay.ch*0.3:cx(w.b))-c.lean*(y-lay.hy);if(x>c.x0&&x<c.x1)o[k].push({t:w.t,y:y});});});return o;}
function nnOffset(A,B,tol){var d=[];A.forEach(function(a){var best=null;B.forEach(function(b){var x=b.y-a.y;if(Math.abs(x)<tol&&(best==null||Math.abs(x)<Math.abs(best)))best=x;});if(best!=null)d.push(best);});return d.length>=3?median(d):0;}
function assembleRows(lines,lay,extra){var keys=["mat","auf","vg","vm","gm"],P={};
  var nv=function(k,t){var tk=String(t||"").trim().split(/\s+/).filter(Boolean);if(!tk.length)return "";
    if(k==="vm"||k==="gm")return normInt(tk[tk.length-1]);var f=k==="mat"?normMat:k==="auf"?normAuf:normVg;for(var i=0;i<tk.length;i++){var v=f(tk[i]);if(v)return v;}return k==="mat"?normMat(tk.join("")):"";};
  keys.forEach(function(k){P[k]=(lines[k]||[]).map(function(l){return {v:nv(k,l.t),y:l.y,t:l.t};}).filter(function(l){return l.v!==""&&l.v!=null;});});
  var ys=P.vg.concat(P.vm).map(function(l){return l.y;}).sort(function(a,b){return a-b;}),gaps=[];for(var i=1;i<ys.length;i++){var g=ys[i]-ys[i-1];if(g>lay.ch*0.8)gaps.push(g);}
  var pitch=median(gaps)||lay.ch*2,tol=pitch*0.45,off={};
  off.vg=0;off.vm=nnOffset(P.vg,P.vm,tol);off.gm=off.vm+nnOffset(P.vm,P.gm,tol);off.mat=nnOffset(P.vg,P.mat,tol);
  var cx_=function(k){var c=lay.cols[k];return c?(c.x0+c.x1)/2:0;};
  off.auf=lay.cols.auf&&lay.cols.mat&&lay.cols.vg?off.mat+(off.vg-off.mat)*(cx_("auf")-cx_("mat"))/Math.max(1,cx_("vg")-cx_("mat")):off.mat;
  var all=[];keys.forEach(function(k){P[k].forEach(function(l){all.push({k:k,v:l.v,y:l.y-off[k],pr:l.pr});});
    if(k!=="vm"&&k!=="gm")(extra&&extra[k]||[]).forEach(function(l){var v=nv(k,l.t);if(v!==""&&v!=null)all.push({k:k,v:v,y:l.y-off[k],pr:1});});});
  all.sort(function(a,b){return a.y-b.y;});
  var rows=[],cur=null;all.forEach(function(e){if(!cur||e.y-cur.y>tol){cur={y:e.y,n:0,f:{},p:{}};rows.push(cur);}if(cur.f[e.k]==null||cur.p[e.k]>(e.pr||0)){cur.f[e.k]=e.v;cur.p[e.k]=e.pr||0;}if(!e.pr){cur.y=(cur.y*cur.n+e.y)/(cur.n+1);cur.n++;}});
  rows=rows.filter(function(r){return r.f.mat||r.f.vg||(r.f.auf&&r.f.vm==null&&r.f.gm==null);});
  return rows.map(function(r){return {material:r.f.mat||"",auftrag:r.f.auf||"",vorgang:r.f.vg||"",vorg:r.f.vm!=null?r.f.vm:null,gut:r.f.gm!=null?r.f.gm:null,y:Math.round(r.y)};});}
// Gemeinsame Regel für Foto, Datei, Einfügen. rows: [{material,auftrag,vorgang,vorg,gut,nach}]
function evalOrders(rows){var out=[],last=null;
  rows.forEach(function(r,i){var data=r.vorgang||r.material||(r.vorg!=null&&r.gut!=null&&!r.auftrag);
    if(!data){if(r.auftrag){r.sub=true;last=null;/* Zwischensumme: für offene Zeilen ohne Auftrag darüber */for(var j=i-1;j>=0&&!rows[j].sub;j--){if(!rows[j].auftrag)rows[j].auftrag=r.auftrag;else break;}}return;}
    if(!r.material&&last&&last.material&&(!r.auftrag||r.auftrag===last.auftrag))r.material=last.material;
    if(!r.auftrag&&last&&last.auftrag&&(!r.material||!last.material||r.material===last.material))r.auftrag=last.auftrag;
    last=r;});
  // Zeilen ohne Auftrag: nächste Zwischensumme darunter
  rows.forEach(function(r,i){if(r.sub||r.auftrag)return;for(var j=i+1;j<rows.length;j++){if(rows[j].sub){r.auftrag=rows[j].auftrag;break;}if(rows[j].auftrag&&rows[j].material!==r.material)break;}});
  var gm={};rows.forEach(function(r){if(!r.sub&&r.auftrag&&r.material){var g=gm[r.auftrag]=gm[r.auftrag]||{};g[r.material]=(g[r.material]||0)+1;}});
  rows.forEach(function(r){if(!r.sub&&r.auftrag&&!r.material&&gm[r.auftrag]){var g=gm[r.auftrag],b="",n=0;Object.keys(g).forEach(function(m){if(g[m]>n){n=g[m];b=m;}});r.material=b;}});
  var map={};rows.forEach(function(r){if(r.sub)return;if(!r.auftrag&&!r.material)return;
    r.done=r.vorg!=null&&r.gut!=null&&r.vorg>0&&r.vorg===r.gut;
    var key=r.auftrag||("M"+r.material),o=map[key];if(!o){o=map[key]={fauf:r.auftrag,wkz:r.material,rows:0,done:false,vorgang:"",vorg:null,gut:null,doneVg:[]};out.push(o);}
    o.rows++;if(!o.wkz&&r.material)o.wkz=r.material;if(!o.fauf&&r.auftrag)o.fauf=r.auftrag;
    if(r.done){if(!o.done){o.vorgang=r.vorgang;o.vorg=r.vorg;o.gut=r.gut;}o.done=true;if(r.vorgang&&o.doneVg.indexOf(r.vorgang)<0)o.doneVg.push(r.vorgang);}
    if(r.vorg!=null&&r.gut!=null){var pk=r.vorgang+"|"+r.vorg+"|"+r.gut;o._p=o._p||{};o._p[pk]=(o._p[pk]||0)+1;}});
  out.forEach(function(o){if(!o.done&&o._p){var b=null,n=0;Object.keys(o._p).forEach(function(k){if(o._p[k]>n){n=o._p[k];b=k;}});var q=b.split("|");o.vorgang=q[0];o.vorg=+q[1];o.gut=+q[2];}delete o._p;});
  return {orders:out,rows:rows.filter(function(r){return !r.sub;})};}
function num(v){if(typeof v==="number")return v;var s=String(v==null?"":v).trim().replace(/\s/g,"");if(!s)return null;
  if(/^\d+([.,]0+)?$/.test(s))return parseInt(s,10);if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))return parseFloat(s.replace(/\./g,"").replace(",","."));
  s=s.replace(",",".");return /^-?\d+(\.\d+)?$/.test(s)?parseFloat(s):null;}
// v2.8: Arbeitsgänge je Arbeitsplatz. Ein Vorgang = ArbPlatz+Auftrag(oder Material)+Vorgang, Mengen EINMAL zählen (nicht über Buchungszeilen summieren).
// fertig an diesem Arbeitsplatz = Gutmenge == VorgMenge (VorgMenge > 0). Ändert NICHT die Tafel-Regel (evalOrders).
var AP_NAMES={TISAND:"Sandstrahlen",TISCHL:"Schleifen",T4PENE:"Penetrant",T4BEIZ:"Beizen"};
function opsByAp(rows){var map={},ops=[];(rows||[]).forEach(function(r){if(!r||r.sub)return;var ap=String(r.arbplatz||"").trim().toUpperCase();
  var auf=String(r.auftrag||"").trim(),mat=String(r.material||"").trim(),vg=String(r.vorgang||"").trim();if(!auf&&!mat&&!vg)return;
  var k=ap+"|"+(auf||"M"+mat)+"|"+vg,o=map[k];
  if(!o){o=map[k]={ap:ap||"?",auftrag:auf,material:mat,vorgang:vg,vorg:null,gut:null,n:0};ops.push(o);}
  o.n++;if(!o.material&&mat)o.material=mat;
  if(r.vorg!=null&&(o.vorg==null||r.vorg>o.vorg))o.vorg=r.vorg;if(r.gut!=null&&(o.gut==null||r.gut>o.gut))o.gut=r.gut;});
 ops.forEach(function(o){o.done=o.vorg!=null&&o.gut!=null&&o.vorg>0&&o.gut===o.vorg;o.fehlt=(o.vorg!=null&&o.gut!=null)?o.vorg-o.gut:null;});
 var by={},aps=[];ops.forEach(function(o){if(!by[o.ap]){by[o.ap]={ap:o.ap,name:AP_NAMES[o.ap]||"",ops:[],done:0};aps.push(by[o.ap]);}by[o.ap].ops.push(o);if(o.done)by[o.ap].done++;});
 var known=Object.keys(AP_NAMES);aps.sort(function(a,b){var ia=known.indexOf(a.ap),ib=known.indexOf(b.ap);ia=ia<0?99:ia;ib=ib<0?99:ib;return ia-ib||(a.ap<b.ap?-1:a.ap>b.ap?1:0);});
 var cmp=function(a,b){return (a.ap<b.ap?-1:a.ap>b.ap?1:0)||(a.auftrag||a.material).localeCompare(b.auftrag||b.material)||a.vorgang.localeCompare(b.vorgang);};
 ops.sort(cmp);aps.forEach(function(a){a.ops.sort(cmp);});
 return {ops:ops,aps:aps,done:ops.filter(function(o){return o.done;}).length};}
var api={estimateSkew:estimateSkew,wordsToCols:wordsToCols,prepExcel:prepExcel,excelLayout:excelLayout,assembleRows:assembleRows,evalOrders:evalOrders,normMat:normMat,num:num,parseTable:parseTable,parseText:parseText,findCards:findCards,match:match,normWkz:normWkz,gridPos:gridPos,cleanup:cleanup,opsByAp:opsByAp,AP_NAMES:AP_NAMES};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.TafelCore=api;
})(this);
