(function(){
"use strict";
var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
var $ = function(s,c){return (c||document).querySelector(s)};
var $$ = function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};

/* vercel web analytics, production host only */
if(/\.vercel\.app$/.test(location.hostname)){
  var va = document.createElement('script');
  va.defer = true;
  va.src = '/_vercel/insights/script.js';
  document.head.appendChild(va);
}

/* ---------- counter util ---------- */
function count(el, to, opts){
  opts = opts||{};
  var dur = opts.dur||1200, prefix = opts.prefix||'', suffix = opts.suffix||'';
  var fmt = function(v){return prefix + Math.round(v).toLocaleString('en-US') + suffix};
  if(RM){ el.textContent = fmt(to); return; }
  var t0 = null;
  function frame(t){
    if(!t0) t0 = t;
    var p = Math.min((t - t0)/dur, 1);
    var e = 1 - Math.pow(2, -10 * p);
    el.textContent = fmt(to * e);
    if(p < 1) requestAnimationFrame(frame); else el.textContent = fmt(to);
  }
  requestAnimationFrame(frame);
}

/* ---------- gate ---------- */
var gate = $('#gate'), board = $('#board'), stamp = $('#stamp');
var header = $('#siteHeader');
var heroStarted = false;
setTimeout(function(){ gate.classList.add('ready'); }, RM?0:500);
function startHero(){
  if(heroStarted) return; heroStarted = true;
  header.classList.add('show');
  var h1 = $('#heroH1');
  h1.innerHTML = h1.textContent.split(' ').map(function(w){return '<span class="word"><i>'+w+'</i></span>'}).join(' ');
  var arc = $('#heroArc'), plane = $('#heroPlane');
  var len = arc.getTotalLength();
  arc.style.strokeDasharray = len;
  arc.style.strokeDashoffset = RM ? 0 : len;
  setTimeout(function(){
    $('#s1').classList.add('in','words-in');
    if(RM) return;
    arc.style.transition = 'stroke-dashoffset 1400ms cubic-bezier(0.22,1,0.36,1)';
    arc.style.strokeDashoffset = 0;
    plane.style.opacity = .8;
    plane.style.offsetPath = "path('M -60 640 Q 400 120 760 300 T 1520 170')";
    plane.style.offsetRotate = 'auto';
    plane.animate([{offsetDistance:'0%'},{offsetDistance:'100%'}],{duration:2600,easing:'cubic-bezier(0.45,0,0.3,1)',fill:'forwards'})
      .onfinish = function(){ plane.style.opacity = 0; };
  }, RM ? 0 : 400);
  loadHeroVideo();
}
function clearGate(instant){
  document.body.classList.remove('locked');
  if(instant){ gate.classList.add('gone'); startHero(); return; }
  gate.classList.add('lift');
  setTimeout(function(){ gate.classList.add('gone'); }, 750);
  startHero();
}
var deepLink = location.hash && location.hash !== '#s1';
if(sessionStorage.getItem('ajet-boarded') || deepLink){ clearGate(true); }
else{
  board.addEventListener('click', function(){
    sessionStorage.setItem('ajet-boarded','1');
    if(RM){ clearGate(true); return; }
    stamp.classList.add('on');
    setTimeout(function(){ clearGate(false); }, 1500);
  });
  $('#gateSkip').addEventListener('click', function(){
    sessionStorage.setItem('ajet-boarded','1');
    clearGate(true);
  });
}

/* ---------- hero video ---------- */
function loadHeroVideo(){
  if(RM) return;
  if(matchMedia('(max-width:1023px)').matches) return;
  if(navigator.connection && navigator.connection.saveData) return;
  var media = $('#heroMedia');
  var v = document.createElement('video');
  v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
  v.setAttribute('muted',''); v.setAttribute('playsinline','');
  v.src = 'https://cdn.jsdelivr.net/gh/haultagency/ajet-assets@main/hero-loop.mp4';
  v.addEventListener('canplay', function(){
    media.appendChild(v);
    var p = v.play();
    if(p && p.then) p.then(function(){ media.classList.add('has-video'); }).catch(function(){ v.remove(); });
    else media.classList.add('has-video');
  });
  v.addEventListener('error', function(){ v.remove(); });
  v.load();
}

/* ---------- header, progress, scroll spy ---------- */
var secs = $$('.sec');
var navLinks = $$('.site-nav a');
var pbar = $('#pbar');
var navToggle = $('#navToggle'), siteNav = $('#siteNav');
navToggle.addEventListener('click', function(){
  var open = siteNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});
siteNav.addEventListener('click', function(e){
  if(e.target.tagName === 'A'){ siteNav.classList.remove('open'); navToggle.setAttribute('aria-expanded','false'); }
});
var ticking = false, cur = 0;
function onScroll(){
  if(ticking) return; ticking = true;
  requestAnimationFrame(function(){
    ticking = false;
    var h = document.documentElement;
    var p = h.scrollTop / (h.scrollHeight - h.clientHeight);
    pbar.style.width = (p*100).toFixed(2) + '%';
    header.classList.toggle('scrolled', h.scrollTop > 8);
    var mid = h.scrollTop + innerHeight/2;
    for(var i=0;i<secs.length;i++){
      if(secs[i].offsetTop <= mid && secs[i].offsetTop + secs[i].offsetHeight > mid){ cur = i; break; }
    }
    var id = secs[cur] ? secs[cur].id : '';
    navLinks.forEach(function(a){ a.classList.toggle('active', a.getAttribute('href') === '#'+id); });
  });
}
addEventListener('scroll', onScroll, {passive:true});
onScroll();

/* ---------- gate keyboard: forward keys board, everything else is native scroll ---------- */
addEventListener('keydown', function(e){
  if(gate.classList.contains('gone') || gate.classList.contains('lift')) return;
  if(['ArrowDown','ArrowRight','PageDown',' ','Enter'].indexOf(e.key) > -1 && e.target === document.body){
    e.preventDefault(); board.click();
  }
});

/* ---------- choreography runner ---------- */
var done = {};
var chores = {};
function reveal(s){
  var id = s.id;
  s.classList.add('in');
  if(done[id]) return; done[id] = true;
  if(chores[id]) chores[id]();
}
var io = new IntersectionObserver(function(entries){
  entries.forEach(function(en){
    if(!en.isIntersecting) return;
    reveal(en.target);
  });
},{threshold:.12, rootMargin:'0px 0px -8% 0px'});
secs.forEach(function(s){ io.observe(s); });
addEventListener('scroll', function(){
  var trigger = document.documentElement.scrollTop + innerHeight * .8;
  secs.forEach(function(s){
    if(!done[s.id] && s.offsetTop < trigger && !document.body.classList.contains('locked')) reveal(s);
  });
}, {passive:true});

/* ---------- s2 stats: static values, no counting theatre ---------- */
function setStats(scope){
  $$('[data-count]', scope).forEach(function(el){
    el.textContent = (+el.dataset.count).toLocaleString('en-US') + (el.dataset.suffix||'');
  });
}

/* ---------- s4 map ---------- */
var GEO = [
{cc:'U', pts:[[-5.7,50],[-3.8,50.2],[-1.9,50.7],[0.3,50.8],[1.4,51.2],[1.7,52.6],[0.2,53.6],[-0.2,54.6],[-1.6,55.6],[-2.2,56.8],[-3.3,57.7],[-5.3,58.6],[-6.2,57.2],[-5.6,55.3],[-4.9,54.4],[-3.6,54.1],[-4.8,53.2],[-4.3,52.4],[-5.4,51.7],[-4.2,51.2]]},
{cc:'N', pts:[[3.4,51.4],[4.2,52.4],[4.9,53.2],[6.9,53.5],[7.2,53.2],[7,52.2],[6,51.9],[6.2,51.4],[4.6,51.4]]},
{cc:'B', pts:[[2.5,51.1],[4.6,51.4],[6.2,51.4],[6.4,50.3],[5.7,49.5],[4.9,49.8],[2.9,50.7]]},
{cc:'G', pts:[[7,53.6],[8.6,54.9],[9.6,54.8],[11,54.4],[12.8,54.4],[14.3,53.9],[14.6,53.2],[15,51.1],[12.2,50.3],[13.8,48.8],[12.9,47.5],[10.4,47.4],[7.6,47.6],[8.2,48.9],[6.7,49.2],[6.4,50.3],[6.2,51.4],[6,51.9],[7,52.2],[7.2,53.2]]},
{cc:'F', pts:[[-4.8,48.4],[-1.9,49.7],[0.2,49.7],[1.6,50.9],[2.5,51.1],[2.9,50.7],[4.9,49.8],[5.7,49.5],[6.7,49.2],[8.2,48.9],[7.6,47.6],[6.1,46.3],[6.8,45.2],[7.7,44.1],[7.5,43.8],[6.5,43.2],[4.8,43.3],[3.9,43.5],[3.2,42.4],[-1.8,43.4],[-1.2,44.6],[-1.1,45.6],[-2.1,47.3],[-4.4,47.8]]},
{cc:'I', pts:[[7.5,43.8],[7.7,44.1],[6.8,45.2],[6.1,46.3],[7,45.9],[8.4,46.2],[10.5,46.9],[12.4,46.9],[13.7,46.5],[13.6,45.7],[12.5,45.5],[13.9,44.6],[13.5,43.6],[14.8,42.3],[16.2,41.9],[18.5,40.3],[17.9,40],[16.8,40.4],[16.6,38.9],[15.7,38],[15.9,40],[15,40.2],[13.7,41.3],[11.8,42.1],[10.3,43.5],[8.9,44.4]]},
{cc:'I', pts:[[12.4,38.2],[15.6,38.3],[15.2,36.9],[12.6,37.6]]},
{cc:'I', pts:[[8.2,41.2],[9.6,41.3],[9.5,39],[8.3,38.9]]},
{cc:'T', pts:[[26.3,40.1],[27.5,40.4],[29.2,41.2],[31.2,41.6],[34.5,42],[38,41.2],[41.5,41.5],[43.5,41.1],[44.8,39.7],[44.3,37.9],[42.5,37.1],[40,36.8],[36.7,36.2],[36.2,36.9],[34,36.3],[30.5,36.3],[29.1,36.6],[27.3,36.9],[28.2,37.7],[26.9,38.4],[27.2,39.1]]},
{cc:'T', pts:[[26.1,40.1],[26.3,41.8],[28.1,41.9],[29.2,41.2],[27.5,40.4]]},
{cc:'L', pts:[[-10,54.2],[-7.7,55.3],[-6,54.6],[-6.1,52.8],[-8.1,51.4],[-10.2,51.9]]},
{cc:'L', pts:[[4.9,58.9],[7.5,58],[10.4,59],[11.8,58.3],[12.9,56.1],[14.4,55.4],[16.6,56.4],[18.9,59.4],[18,62.6],[13,62.6],[10,61]]},
{cc:'L', pts:[[21,62.6],[28,62.6],[30,60],[28,59],[24,59],[21.5,60.5]]},
{cc:'L', pts:[[21.5,59],[28,59],[27,55.7],[23.5,54],[21,55.2]]},
{cc:'L', pts:[[8.1,54.9],[8.2,57.2],[10.7,57.8],[10.9,54.8]]},
{cc:'L', pts:[[6.1,46.3],[7.6,47.6],[9.5,47.6],[10.4,47.4],[10.5,46.9],[8.4,46.2],[7,45.9]]},
{cc:'L', pts:[[9.5,47.6],[13,48.1],[16.9,48.6],[17.1,47.9],[16,46.9],[14.5,46.6],[13.7,46.5],[12.4,46.9],[10.5,46.9],[10.4,47.4]]},
{cc:'L', pts:[[-9.3,43.1],[-7.7,43.7],[-5.5,43.6],[-3.6,43.5],[-1.8,43.4],[3.2,42.4],[3.1,41.6],[0.7,40.6],[0,38.9],[-0.7,37.6],[-2.1,36.7],[-4.4,36.7],[-5.9,36],[-7.4,37.2],[-8.9,37],[-8.8,38.5],[-9.5,38.7],[-8.7,40.7],[-8.7,41.9]]},
{cc:'L', pts:[[8.6,43],[9.5,43],[9.4,41.4],[8.7,41.6]]},
{cc:'L', pts:[[14.6,53.2],[16.9,54.6],[18.8,54.4],[23.5,54],[23.9,52],[24.1,50.4],[22.6,49.1],[19.4,49.4],[15,51.1]]},
{cc:'L', pts:[[23.5,54],[28,56],[33,55.5],[36,54],[38,51],[37,49],[33,46.5],[30.5,46],[28.2,45.5],[26.6,48.3],[24.1,50.4],[23.9,52]]},
{cc:'L', pts:[[13.7,46.5],[14.5,46.6],[16,46.9],[17.1,47.9],[16.9,48.6],[22,48.4],[26.6,48.3],[28.2,45.5],[28.6,43.7],[28,41.9],[26.1,40.1],[24.4,40.1],[23.7,39.1],[22.9,37.9],[23.6,36.8],[21.9,36.7],[20.2,39.3],[19.4,41.3],[18.5,42.5],[16,43.6],[13.6,45.7]]},
{cc:'L', pts:[[-6,35.6],[-2,35.4],[3,36.6],[9,37],[11,36.9],[11,34.8],[-6,34.8]]}
];
function inPoly(lon, lat, pts){
  var inside = false;
  for(var i=0, j=pts.length-1; i<pts.length; j=i++){
    var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if(((yi>lat)!==(yj>lat)) && (lon < (xj-xi)*(lat-yi)/(yj-yi)+xi)) inside = !inside;
  }
  return inside;
}
var CITIES = [
  {name:'Amsterdam', x:261, y:200, cc:'N', dx:2,   dy:-14, anchor:'start'},
  {name:'Berlin',    x:392, y:197, cc:'G', dx:14,  dy:4,   anchor:'start'},
  {name:'Brussels',  x:252, y:231, cc:'B', dx:12,  dy:16,  anchor:'start'},
  {name:'London',    x:183, y:218, cc:'U', dx:-12, dy:2,   anchor:'end'},
  {name:'Paris',     x:222, y:273, cc:'F', dx:-12, dy:14,  anchor:'end'},
  {name:'Rome',      x:378, y:417, cc:'I', dx:14,  dy:6,   anchor:'start'}
];
var IST = {x:633, y:435};
function buildMap(){
  var svg = $('#mapSvg');
  var NS = 'http://www.w3.org/2000/svg';
  var defs = document.createElementNS(NS,'defs');
  var rg = document.createElementNS(NS,'radialGradient');
  rg.setAttribute('id','cityHeat');
  var st1 = document.createElementNS(NS,'stop'); st1.setAttribute('offset','0'); st1.setAttribute('stop-color','#9AD8FF'); st1.setAttribute('stop-opacity','.9');
  var st2 = document.createElementNS(NS,'stop'); st2.setAttribute('offset','1'); st2.setAttribute('stop-color','#9AD8FF'); st2.setAttribute('stop-opacity','0');
  rg.appendChild(st1); rg.appendChild(st2); defs.appendChild(rg); svg.appendChild(defs);
  var groups = {};
  ['N','G','B','U','F','I'].forEach(function(cc){
    var g = document.createElementNS(NS,'g'); g.dataset.cc = cc; svg.appendChild(g); groups[cc] = g;
  });
  var gLand = document.createElementNS(NS,'g'); svg.appendChild(gLand);
  var CELL = 11, R2 = 2.6;
  for(var ry=0; ry<Math.floor(560/CELL); ry++){
    for(var rx=0; rx<Math.floor(880/CELL); rx++){
      var px = rx*CELL + CELL/2, py = ry*CELL + CELL/2;
      var lon = px/880*57 - 12, lat = 62 - py/560*27;
      var hit = null;
      for(var gi=0; gi<GEO.length; gi++){
        if(inPoly(lon, lat, GEO[gi].pts)){ hit = GEO[gi].cc; break; }
      }
      if(!hit) continue;
      var c = document.createElementNS(NS,'circle');
      c.setAttribute('cx', px); c.setAttribute('cy', py); c.setAttribute('r', R2);
      if(hit==='L'){ c.setAttribute('class','dot-land'); gLand.appendChild(c); }
      else if(hit==='T'){ c.setAttribute('class','dot-tr'); gLand.appendChild(c); }
      else { c.setAttribute('class','dot-mkt'); groups[hit].appendChild(c); }
    }
  }
  var heats = document.createElementNS(NS,'g'); svg.appendChild(heats);
  CITIES.forEach(function(city,i){
    var h = document.createElementNS(NS,'circle');
    h.setAttribute('cx',city.x); h.setAttribute('cy',city.y); h.setAttribute('r',34);
    h.setAttribute('fill','url(#cityHeat)'); h.setAttribute('class','heat'); h.dataset.i = i;
    heats.appendChild(h);
    city.heat = h;
  });
  var arcs = document.createElementNS(NS,'g'); svg.appendChild(arcs);
  CITIES.forEach(function(city,i){
    var midX = (IST.x + city.x)/2, midY = Math.min(IST.y, city.y) - 90 - Math.abs(IST.x-city.x)*0.10;
    var d = 'M '+IST.x+' '+IST.y+' Q '+midX+' '+midY+' '+city.x+' '+city.y;
    var pg = document.createElementNS(NS,'path');
    pg.setAttribute('d', d); pg.setAttribute('class','arc-glow'); pg.dataset.i = i;
    arcs.appendChild(pg);
    var p = document.createElementNS(NS,'path');
    p.setAttribute('d', d); p.setAttribute('class','arc'); p.dataset.i = i;
    arcs.appendChild(p);
    city.d = d;
    city.arcEls = [pg, p];
  });
  var ip = document.createElementNS(NS,'circle');
  ip.setAttribute('cx',IST.x); ip.setAttribute('cy',IST.y); ip.setAttribute('r',6); ip.setAttribute('fill','#0923F3');
  svg.appendChild(ip);
  var pulse = document.createElementNS(NS,'circle');
  pulse.setAttribute('cx',IST.x); pulse.setAttribute('cy',IST.y); pulse.setAttribute('r',6); pulse.setAttribute('class','ist-pulse');
  svg.appendChild(pulse);
  var il = document.createElementNS(NS,'text');
  il.setAttribute('x',IST.x+12); il.setAttribute('y',IST.y+22); il.textContent = 'Istanbul';
  il.setAttribute('style',"font-family:'Onest',sans-serif;font-size:15px;font-weight:700;fill:#0D1759;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round");
  svg.appendChild(il);
  var tip = $('#mapTip');
  CITIES.forEach(function(city,i){
    var g = document.createElementNS(NS,'g'); g.setAttribute('class','city'); g.dataset.i = i;
    var c = document.createElementNS(NS,'circle');
    c.setAttribute('cx',city.x); c.setAttribute('cy',city.y); c.setAttribute('r',5);
    var t = document.createElementNS(NS,'text');
    t.setAttribute('x', city.x + city.dx); t.setAttribute('y', city.y + city.dy);
    t.setAttribute('text-anchor', city.anchor);
    t.textContent = city.name;
    g.appendChild(c); g.appendChild(t);
    g.addEventListener('mouseenter', function(){ showTip(city); });
    g.addEventListener('mouseleave', function(){ tip.style.opacity = 0; });
    g.addEventListener('click', function(){ showTip(city); setTimeout(function(){tip.style.opacity=0;},1800); });
    svg.appendChild(g);
    city.el = g;
  });
  function showTip(city){
    var br = svg.getBoundingClientRect();
    tip.textContent = city.name + ' · 2026 growth market';
    tip.style.left = (city.x/880*br.width) + 'px';
    tip.style.top = (city.y/560*br.height) + 'px';
    tip.style.opacity = 1;
  }
  var plane = document.createElementNS(NS,'path');
  plane.setAttribute('d','M2 21 23 12 2 3v7l15 2-15 2z');
  plane.setAttribute('fill','#0923F3');
  plane.setAttribute('class','map-plane'); plane.setAttribute('id','mapPlane');
  svg.appendChild(plane);
  return {groups: groups};
}
var mapParts = null;
function runMap(){
  if(!mapParts) mapParts = buildMap();
  var counters = $$('#mapCounters [data-count]');
  if(RM){
    CITIES.forEach(function(city){
      city.el.classList.add('on');
      city.heat.classList.add('on');
      mapParts.groups[city.cc].classList.add('landed');
    });
    counters.forEach(function(el){ count(el, +el.dataset.count, {suffix: el.dataset.suffix||''}); });
    return;
  }
  CITIES.forEach(function(city,i){
    city.arcEls.forEach(function(a){
      var len = a.getTotalLength();
      a.style.strokeDasharray = len; a.style.strokeDashoffset = len;
    });
    setTimeout(function(){
      city.arcEls.forEach(function(a){
        a.style.transition = 'stroke-dashoffset 500ms cubic-bezier(0.45,0,0.3,1)';
        a.style.strokeDashoffset = 0;
      });
      setTimeout(function(){
        city.el.classList.add('on');
        city.heat.classList.add('on');
        mapParts.groups[city.cc].classList.add('landed');
        if(i < counters.length) count(counters[i], +counters[i].dataset.count, {suffix: counters[i].dataset.suffix||''});
      }, 480);
    }, i*350);
  });
  setTimeout(function(){
    if(counters[4]) count(counters[4], +counters[4].dataset.count, {suffix:''});
    var plane = $('#mapPlane');
    plane.style.opacity = .9;
    plane.style.offsetPath = "path('"+CITIES[0].d+"')";
    plane.style.offsetRotate = 'auto';
    plane.animate([{offsetDistance:'0%'},{offsetDistance:'100%'}],{duration:1800,easing:'cubic-bezier(0.45,0,0.3,1)',fill:'forwards'})
      .onfinish = function(){ plane.style.opacity = 0; };
  }, CITIES.length*350 + 700);
}

/* ---------- s5 calculator ---------- */
function runCalc(){
  var lines = $$('#calc .calc-line');
  lines.forEach(function(line,i){
    setTimeout(function(){
      line.classList.add('on');
      var sub = $('.sub', line), total = line.classList.contains('calc-total');
      count(sub, +line.dataset.sub, {dur: total?1400:800, prefix: line.dataset.prefix||''});
      if(total) setTimeout(function(){ line.classList.add('flash'); }, 1300);
    }, RM?0:i*600);
  });
}
var kitBtn = $('#kitBtn'), kitBody = $('#kitBody');
kitBtn.addEventListener('click', function(e){
  e.stopPropagation();
  var open = kitBtn.getAttribute('aria-expanded') === 'true';
  kitBtn.setAttribute('aria-expanded', String(!open));
  kitBody.style.maxHeight = open ? '0' : kitBody.scrollHeight + 'px';
});

/* ---------- s6 bridge ---------- */
function runBridge(){
  var lines = $$('.bridge-lines path');
  lines.forEach(function(p,i){
    var len = p.getTotalLength();
    p.style.strokeDasharray = len; p.style.strokeDashoffset = RM?0:len;
    if(!RM) setTimeout(function(){
      p.style.transition = 'stroke-dashoffset 400ms cubic-bezier(0.22,1,0.36,1)';
      p.style.strokeDashoffset = 0;
    }, 600 + i*200);
  });
  var text = 'You brief, we produce, and you approve.';
  var tl = $('#typedLine');
  if(RM){ tl.textContent = text; return; }
  setTimeout(function(){
    tl.classList.add('typing');
    var i = 0;
    var iv = setInterval(function(){
      tl.textContent = text.slice(0, ++i);
      if(i >= text.length){ clearInterval(iv); setTimeout(function(){tl.classList.remove('typing');},900); }
    }, 32);
  }, 1500);
}
var bridge = $('#bridge');
$$('.team-card').forEach(function(card){
  function iso(){
    bridge.classList.add('iso');
    card.classList.add('hot');
    var line = $('.bridge-lines path[data-line="'+card.dataset.team+'"]');
    if(line) line.classList.add('hot');
  }
  function unIso(){
    bridge.classList.remove('iso');
    $$('.hot', bridge).forEach(function(el){ el.classList.remove('hot'); });
  }
  card.addEventListener('mouseenter', iso);
  card.addEventListener('mouseleave', unIso);
  card.addEventListener('focus', iso);
  card.addEventListener('blur', unIso);
  card.addEventListener('touchstart', function(){ bridge.classList.contains('iso') ? unIso() : iso(); }, {passive:true});
});

/* ---------- s7 services: chips + grid + detail ---------- */
var DATA = JSON.parse(document.getElementById("site-data").textContent);
var SVC = DATA.svc;
var CLUSTER_LABEL = {create:'Create', convert:'Convert', coordinate:'Coordinate'};
var svcGrid = $('#svcGrid'), svcDetail = $('#svcDetail');
var activeSvc = -1, activeCluster = 'all';
SVC.forEach(function(s,i){
  var b = document.createElement('button');
  b.className = 'svc-mini card';
  b.dataset.cluster = s.cluster;
  b.setAttribute('aria-expanded','false');
  b.innerHTML = '<span class="top"><span class="no">'+s.n+'</span><span class="cl">'+CLUSTER_LABEL[s.cluster]+'</span></span><b>'+s.t+'</b><span class="promise">'+s.p+'</span>';
  b.addEventListener('click', function(){ openSvc(i, true); });
  svcGrid.appendChild(b);
});
var svcCards = $$('.svc-mini', svcGrid);
function openSvc(i, scroll){
  if(activeSvc === i){ closeSvc(); return; }
  activeSvc = i;
  var s = SVC[i];
  svcCards.forEach(function(c,j){
    c.classList.toggle('active', j===i);
    c.setAttribute('aria-expanded', String(j===i));
  });
  svcDetail.innerHTML =
    '<div class="det-head">'+
      '<span class="no">'+s.n+'</span>'+
      '<div class="tt"><h3>'+s.t+'</h3><span class="team">'+s.team+'</span><p class="promise">"'+s.p+'"</p></div>'+
      '<div class="det-nav">'+
        '<button id="svcPrev" aria-label="Previous service"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
        '<button id="svcNext" aria-label="Next service"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
        '<button id="svcClose" aria-label="Close"><svg width="15" height="15" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>'+
      '</div>'+
    '</div>'+
    '<ul>'+s.b.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul>'+
    '<p class="connects">'+s.c+'</p>';
  svcDetail.classList.add('open');
  $('#svcPrev').addEventListener('click', function(){ step(-1); });
  $('#svcNext').addEventListener('click', function(){ step(1); });
  $('#svcClose').addEventListener('click', closeSvc);
  function step(d){
    var pool = SVC.map(function(s,j){return j}).filter(function(j){ return activeCluster==='all' || SVC[j].cluster===activeCluster; });
    var pos = pool.indexOf(activeSvc);
    var nx = pool[(pos + d + pool.length) % pool.length];
    openSvc(nx, true);
  }
  if(history.replaceState) history.replaceState(null,'','#service-'+s.n);
  if(scroll) setTimeout(function(){ svcDetail.scrollIntoView({behavior: RM?'auto':'smooth', block:'nearest'}); }, 40);
}
function closeSvc(){
  activeSvc = -1;
  svcDetail.classList.remove('open');
  svcCards.forEach(function(c){ c.classList.remove('active'); c.setAttribute('aria-expanded','false'); });
  if(history.replaceState) history.replaceState(null,'','#s7');
}
$$('.chip-f').forEach(function(chip){
  chip.addEventListener('click', function(){
    activeCluster = chip.dataset.cluster;
    $$('.chip-f').forEach(function(c){ c.setAttribute('aria-pressed', String(c===chip)); });
    svcCards.forEach(function(c){
      c.classList.toggle('dim', activeCluster!=='all' && c.dataset.cluster!==activeCluster);
    });
    if(activeSvc > -1 && activeCluster!=='all' && SVC[activeSvc].cluster!==activeCluster) closeSvc();
  });
});
if(location.hash && /^#service-\d\d$/.test(location.hash)){
  var wanted = location.hash.replace('#service-','');
  var idx = SVC.findIndex(function(s){ return s.n === wanted; });
  if(idx > -1) setTimeout(function(){ openSvc(idx, true); }, 400);
}

/* ---------- s8 language ---------- */
var LANGS = DATA.langs;
var langRow = $('#langRow'), adEl = $('#adArtifact'), adHead = $('#adHead'), adCta = $('#adCta');
LANGS.forEach(function(l,i){
  var b = document.createElement('button');
  b.className = 'lang'; b.setAttribute('role','radio');
  b.setAttribute('aria-checked', i===0 ? 'true':'false');
  b.tabIndex = i===0 ? 0 : -1;
  b.textContent = l.k;
  b.addEventListener('click', function(){ selectLang(i); });
  b.addEventListener('keydown', function(e){
    var n = null;
    if(e.key==='ArrowRight' || e.key==='ArrowDown') n = (i+1)%LANGS.length;
    if(e.key==='ArrowLeft' || e.key==='ArrowUp') n = (i-1+LANGS.length)%LANGS.length;
    if(n===null) return;
    e.preventDefault(); e.stopPropagation();
    selectLang(n); $$('.lang',langRow)[n].focus();
  });
  langRow.appendChild(b);
});
function selectLang(i){
  $$('.lang', langRow).forEach(function(b,j){
    b.setAttribute('aria-checked', String(i===j));
    b.tabIndex = i===j ? 0 : -1;
  });
  var l = LANGS[i];
  if(RM){ adHead.textContent = l.h; adCta.textContent = l.c; return; }
  adEl.classList.add('swap');
  setTimeout(function(){
    adHead.textContent = l.h; adCta.textContent = l.c;
    adEl.classList.remove('swap');
  }, 130);
}

/* ---------- heatmap showcase ---------- */
var hmCard = $('#hmCard'), hmToggle = $('#hmToggle');
function positionHeat(){
  var stage = $('#hmStage'), svgH = $('#hmHeat');
  if(!stage || !svgH) return;
  var sr = stage.getBoundingClientRect();
  if(sr.width < 10) return;
  var prices = $$('.hm-price', stage);
  var tms = $$('.hm-row .tms', stage);
  var anchors = [
    {el: prices[0], sx: 1.4, sy: 2.6},
    {el: prices[1], sx: 1.2, sy: 2.2},
    {el: prices[2], sx: 1.1, sy: 2.0},
    {el: tms[0], sx: .75, sy: 2.2},
    {el: $('.hm-fam', stage), sx: .32, sy: 1.6},
    {el: $('.hm-search .btn-mock', stage), sx: 2.2, sy: 2.4},
    {el: tms[2], sx: .6, sy: 1.8}
  ];
  var cap = sr.width * .22;
  $$('ellipse', svgH).forEach(function(e, i){
    var a = anchors[i];
    if(!a || !a.el) return;
    var r = a.el.getBoundingClientRect();
    e.setAttribute('cx', (r.left + r.width/2 - sr.left).toFixed(1));
    e.setAttribute('cy', (r.top + r.height/2 - sr.top).toFixed(1));
    e.setAttribute('rx', Math.max(30, Math.min(cap, r.width/2 * a.sx)).toFixed(1));
    e.setAttribute('ry', Math.max(24, Math.min(cap, r.height/2 * a.sy)).toFixed(1));
  });
}
hmToggle.addEventListener('click', function(){
  positionHeat();
  var on = hmCard.classList.toggle('hm-on');
  hmToggle.setAttribute('aria-pressed', String(on));
  hmToggle.textContent = on ? 'Hide heatmap' : 'Show heatmap';
});
var hmResizeT;
addEventListener('resize', function(){
  clearTimeout(hmResizeT);
  hmResizeT = setTimeout(positionHeat, 150);
});
function runHeatmap(){
  positionHeat();
  setTimeout(function(){ positionHeat(); hmCard.classList.add('hm-on'); }, RM?0:500);
}

/* ---------- dashboard ---------- */
function buildLine(){
  var g = $('#lineChart');
  var NS = 'http://www.w3.org/2000/svg';
  var data = [180,186,195,205,214,222,231,242,252,261,272,284];
  var w = 440, h = 170, pad = 26, top = 18;
  var min = 160, max = 300;
  var pts = data.map(function(v,i){
    return [pad + i*(w-pad*2)/(data.length-1), top + (h-top-30) * (1 - (v-min)/(max-min))];
  });
  var dPath = pts.map(function(p,i){ return (i?'L':'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
  var fill = document.createElementNS(NS,'path');
  fill.setAttribute('d', dPath + ' L ' + pts[pts.length-1][0] + ' ' + (h-24) + ' L ' + pts[0][0] + ' ' + (h-24) + ' Z');
  fill.setAttribute('class','chart-fill');
  g.appendChild(fill);
  var line = document.createElementNS(NS,'path');
  line.setAttribute('d', dPath); line.setAttribute('class','chart-line'); line.setAttribute('id','orgLine');
  g.appendChild(line);
  var t1 = document.createElementNS(NS,'text');
  t1.setAttribute('x',pts[0][0]); t1.setAttribute('y',h-8); t1.setAttribute('class','axis-label');
  t1.textContent = '180K · 12 months ago';
  g.appendChild(t1);
  var t2 = document.createElementNS(NS,'text');
  t2.setAttribute('x',w-26); t2.setAttribute('y',h-8); t2.setAttribute('text-anchor','end'); t2.setAttribute('class','axis-label');
  t2.textContent = 'this month';
  g.appendChild(t2);
  var end = document.createElementNS(NS,'circle');
  end.setAttribute('cx',pts[pts.length-1][0]); end.setAttribute('cy',pts[pts.length-1][1]); end.setAttribute('r',4.5);
  end.setAttribute('class','chart-dot');
  g.appendChild(end);
  var lbl = document.createElementNS(NS,'text');
  lbl.setAttribute('x',pts[pts.length-1][0]-8); lbl.setAttribute('y',pts[pts.length-1][1]-12);
  lbl.setAttribute('text-anchor','end'); lbl.setAttribute('class','chart-label');
  lbl.textContent = '284K';
  g.appendChild(lbl);
  data.forEach(function(v,i){
    var hit = document.createElementNS(NS,'circle');
    hit.setAttribute('cx',pts[i][0]); hit.setAttribute('cy',pts[i][1]); hit.setAttribute('r',10); hit.setAttribute('fill','transparent');
    var ttl = document.createElementNS(NS,'title'); ttl.textContent = 'Month '+(i+1)+': '+v+'K sessions';
    hit.appendChild(ttl); g.appendChild(hit);
  });
  return line;
}
function buildBars(){
  var svg = $('#roasSvg');
  var NS = 'http://www.w3.org/2000/svg';
  var data = [['NL',3.4],['DE',3.9],['UK',3.1],['BE',2.8],['FR',2.6],['IT',2.4]];
  var w = 440, h = 170, pad = 18, bw = 42, gap = (w - pad*2 - bw*6)/5;
  data.forEach(function(d,i){
    var x = pad + i*(bw+gap);
    var bh = d[1]/4.2*(h-56);
    var r = document.createElementNS(NS,'rect');
    r.setAttribute('x',x); r.setAttribute('y',h-30-bh); r.setAttribute('width',bw); r.setAttribute('height',bh);
    r.setAttribute('rx',3); r.setAttribute('class','bar');
    var ttl = document.createElementNS(NS,'title'); ttl.textContent = d[0]+': '+d[1].toFixed(1)+' return on ad spend';
    r.appendChild(ttl);
    svg.appendChild(r);
    var v = document.createElementNS(NS,'text');
    v.setAttribute('x',x+bw/2); v.setAttribute('y',h-36-bh); v.setAttribute('text-anchor','middle'); v.setAttribute('class','chart-label');
    v.setAttribute('style','font-size:12px'); v.textContent = d[1].toFixed(1);
    svg.appendChild(v);
    var m = document.createElementNS(NS,'text');
    m.setAttribute('x',x+bw/2); m.setAttribute('y',h-12); m.setAttribute('text-anchor','middle'); m.setAttribute('class','axis-label');
    m.textContent = d[0];
    svg.appendChild(m);
  });
}
function buildFunnel(){
  var svg = $('#funSvg');
  var NS = 'http://www.w3.org/2000/svg';
  var data = [['1.2M sessions',1,'#0923F3'],['540K searches',.62,'#4E63F7'],['68K bookings started',.3,'#7FA8FB'],['27K paid',.17,'#9AD8FF']];
  data.forEach(function(d,i){
    var y = 6 + i*34;
    var r = document.createElementNS(NS,'rect');
    r.setAttribute('x',0); r.setAttribute('y',y); r.setAttribute('width',300*d[1]+40); r.setAttribute('height',22);
    r.setAttribute('rx',3); r.setAttribute('class','fun-bar');
    r.setAttribute('style','fill:'+d[2]);
    var ttl = document.createElementNS(NS,'title'); ttl.textContent = d[0];
    r.appendChild(ttl);
    svg.appendChild(r);
    var t = document.createElementNS(NS,'text');
    t.setAttribute('x',300*d[1]+50); t.setAttribute('y',y+16); t.setAttribute('class','chart-label'); t.setAttribute('style','font-size:12.5px');
    t.textContent = d[0];
    svg.appendChild(t);
  });
}
var dashBuilt = false;
function runDash(){
  if(!dashBuilt){ dashBuilt = true; var line = buildLine(); buildBars(); buildFunnel();
    var seg1 = $('#seg1'), seg2 = $('#seg2');
    var C = 2*Math.PI*58;
    seg1.style.strokeDasharray = C; seg1.style.strokeDashoffset = C;
    seg2.style.strokeDasharray = C; seg2.style.strokeDashoffset = C;
    var len = line.getTotalLength();
    line.style.strokeDasharray = len; line.style.strokeDashoffset = RM?0:len;
    if(RM){
      seg1.style.strokeDashoffset = C*(1-.68); seg2.style.strokeDashoffset = C*(1-.32);
      $('#dash').classList.add('on');
      return;
    }
    setTimeout(function(){
      line.style.transition = 'stroke-dashoffset 1200ms cubic-bezier(0.45,0,0.3,1)';
      line.style.strokeDashoffset = 0;
      $('#dash').classList.add('on');
      seg1.style.strokeDashoffset = C*(1-.68);
      seg2.style.strokeDashoffset = C*(1-.32);
    }, 150);
  }
}

/* ---------- s9 stepper ---------- */
var STEPS = [
  {t:'Brief', d:'Requests come through your shared system: Asana, Monday, Notion, whatever you already run.'},
  {t:'Produce', d:'We design, create, localize, and prepare all deliverables.'},
  {t:'Review', d:'Your team approves, with clear revision rounds.'},
  {t:'Deliver', d:'Final formats on schedule, organized and ready to deploy.'},
  {t:'Report', d:'Monthly output volume, performance data, and the upcoming pipeline.'}
];
var stepTrack = $('#stepTrack'), stepPanel = $('#stepPanel');
STEPS.forEach(function(s,i){
  var node = document.createElement('button');
  node.className = 'step-node'; node.setAttribute('aria-label','Step '+(i+1)+': '+s.t);
  node.innerHTML = '<span class="step-dot">'+(i+1)+'</span><span>'+s.t+'</span>';
  node.addEventListener('click', function(){ setStep(i, true); });
  node.addEventListener('keydown', function(e){
    var n = null;
    if(e.key==='ArrowRight') n = Math.min(4, i+1);
    if(e.key==='ArrowLeft') n = Math.max(0, i-1);
    if(n===null) return;
    e.preventDefault(); e.stopPropagation();
    setStep(n, true); $$('.step-node',stepTrack)[n].focus();
  });
  stepTrack.appendChild(node);
  if(i < STEPS.length-1){
    var conn = document.createElement('div');
    conn.className = 'step-conn'; conn.setAttribute('aria-hidden','true');
    conn.innerHTML = '<i></i>';
    stepTrack.appendChild(conn);
  }
});
var stepNodes = $$('.step-node', stepTrack), stepConns = $$('.step-conn', stepTrack);
function setStep(i, user){
  stepNodes.forEach(function(n,j){ n.classList.toggle('on', j<=i); });
  stepConns.forEach(function(c,j){ c.classList.toggle('on', j<i); });
  var s = STEPS[i];
  if(RM || !user){
    $('b',stepPanel).textContent = s.t; $('p',stepPanel).textContent = s.d;
    return;
  }
  stepPanel.classList.add('fade');
  setTimeout(function(){
    $('b',stepPanel).textContent = s.t; $('p',stepPanel).textContent = s.d;
    stepPanel.classList.remove('fade');
  }, 220);
}
function runStepper(){
  if(RM){
    stepNodes.forEach(function(n,j){n.classList.toggle('on', j===0)});
    $('b',stepPanel).textContent = STEPS[0].t; $('p',stepPanel).textContent = STEPS[0].d; return; }
  var i = 0;
  var iv = setInterval(function(){
    setStep(i, false);
    $('b',stepPanel).textContent = STEPS[i].t; $('p',stepPanel).textContent = STEPS[i].d;
    i++;
    if(i >= STEPS.length){
      clearInterval(iv);
      setTimeout(function(){
        stepNodes.forEach(function(n,j){ n.classList.toggle('on', j===0); });
        stepConns.forEach(function(c){ c.classList.remove('on'); });
        $('b',stepPanel).textContent = STEPS[0].t; $('p',stepPanel).textContent = STEPS[0].d;
      }, 900);
    }
  }, 600);
}

/* ---------- s11 timeline ---------- */
var PHASES = [
  {t:'Weeks 1 to 2 · Review and immersion', d:'We review your current brand assets, creative workflows, and campaign pipeline, and we meet all three teams. Together we map where we can have the most immediate impact.'},
  {t:'Weeks 3 to 4 · Setup and alignment', d:'We set up in your project management tools, establish approval flows, and align on brand guidelines. The design system build begins here.'},
  {t:'Weeks 5 to 6 · First delivery', d:'The first batch goes live: social content, ad creative, or print assets, depending on the priority your teams set.'},
  {t:'Month 2+ · Full rhythm', d:'Monthly production cycles, with quarterly reviews with all three teams to assess output, adjust priorities, and plan ahead.'}
];
var tlTrack = $('#tlTrack'), tlPanel = $('#tlPanel'), tlFill = $('#tlFill');
var tlBtns = [];
for(var w=1; w<=6; w++){
  (function(w){
    var b = document.createElement('button');
    b.className = 'tl-mark'; b.textContent = 'W'+w;
    b.setAttribute('aria-label','Week '+w);
    var phase = w<=2 ? 0 : w<=4 ? 1 : 2;
    b.addEventListener('click', function(){ setPhase(phase, (w-0.5)/6*100, b); });
    tlTrack.appendChild(b); tlBtns.push(b);
  })(w);
}
var chip = document.createElement('button');
chip.className = 'tl-chip'; chip.textContent = 'Month 2+';
chip.addEventListener('click', function(){ setPhase(3, 100, chip); });
tlTrack.appendChild(chip); tlBtns.push(chip);
tlTrack.addEventListener('keydown', function(e){
  var idx = tlBtns.indexOf(document.activeElement);
  if(idx < 0) return;
  var n = null;
  if(e.key==='ArrowRight') n = Math.min(tlBtns.length-1, idx+1);
  if(e.key==='ArrowLeft') n = Math.max(0, idx-1);
  if(n===null) return;
  e.preventDefault(); e.stopPropagation();
  tlBtns[n].focus(); tlBtns[n].click();
});
function setPhase(p, pct, activeBtn){
  tlFill.style.width = pct + '%';
  tlBtns.forEach(function(b){ b.classList.remove('on'); });
  var hitCount = activeBtn===chip ? 6 : tlBtns.indexOf(activeBtn)+1;
  tlBtns.forEach(function(b,i){ b.classList.toggle('hit', i < hitCount && b!==activeBtn); });
  if(activeBtn===chip) tlBtns.slice(0,6).forEach(function(b){b.classList.add('hit')});
  activeBtn.classList.add('on');
  var ph = PHASES[p];
  if(RM){ $('b',tlPanel).textContent = ph.t; $('p',tlPanel).textContent = ph.d; return; }
  tlPanel.classList.add('fade');
  setTimeout(function(){
    $('b',tlPanel).textContent = ph.t; $('p',tlPanel).textContent = ph.d;
    tlPanel.classList.remove('fade');
  }, 220);
}
function runTimeline(){
  $('b',tlPanel).textContent = PHASES[0].t; $('p',tlPanel).textContent = PHASES[0].d;
  tlBtns[0].classList.add('on');
  if(RM){ tlFill.style.transition='none'; tlFill.style.width='8.3%'; return; }
  setTimeout(function(){ tlFill.style.width = '8.3%'; }, 300);
}

/* ---------- s12 checklist ---------- */
function runChecklist(){
  $$('#checklist li').forEach(function(li,i){
    setTimeout(function(){ li.classList.add('on'); }, RM?0:400+i*150);
  });
}

/* ---------- s13 closing ---------- */
function runClose(){
  var h = $('#h-s13');
  h.innerHTML = h.textContent.split(' ').map(function(w){return '<span class="word"><i>'+w+'</i></span>'}).join(' ');
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ $('#s13').classList.add('words-in'); }); });
  var arc = $('#closeArc');
  var len = arc.getTotalLength();
  arc.style.strokeDasharray = len;
  arc.style.strokeDashoffset = RM?0:len;
  if(!RM) setTimeout(function(){
    arc.style.transition = 'stroke-dashoffset 1600ms cubic-bezier(0.45,0,0.3,1)';
    arc.style.strokeDashoffset = 0;
  }, 300);
}

/* ---------- choreography map ---------- */
chores.s2 = function(){ setStats($('#s2')); };
chores.s4 = runMap;
chores.s5 = runCalc;
chores.s6 = runBridge;
chores.s8 = function(){ runHeatmap(); runDash(); };
chores.s9 = runStepper;
chores.s11 = runTimeline;
chores.s12 = runChecklist;
chores.s13 = runClose;

/* ---------- print ---------- */
addEventListener('beforeprint', function(){
  Object.keys(chores).forEach(function(id){ done[id] = true; });
  secs.forEach(function(s){ s.classList.add('in','words-in'); });
  if(!mapParts) mapParts = buildMap();
  CITIES.forEach(function(city){
    city.el.classList.add('on');
    city.heat.classList.add('on');
    mapParts.groups[city.cc].classList.add('landed');
  });
  $$('[data-count]').forEach(function(el){
    el.textContent = (+el.dataset.count).toLocaleString('en-US') + (el.dataset.suffix||'');
  });
  $$('#calc .calc-line').forEach(function(line){
    line.classList.add('on');
    $('.sub',line).textContent = (line.dataset.prefix||'') + (+line.dataset.sub).toLocaleString('en-US');
  });
  if(!dashBuilt) runDash();
  $('#dash').classList.add('on');
  positionHeat();
  hmCard.classList.add('hm-on');
  $$('#checklist li').forEach(function(li){ li.classList.add('on'); });
  $('#kitBody').style.maxHeight = 'none';
  $('#typedLine').textContent = 'You brief, we produce, and you approve.';
  var ps = $('#printSvcs');
  if(!ps.innerHTML){
    ps.innerHTML = SVC.map(function(s){
      return '<article><h4>'+s.n+' · '+s.t+'</h4><div class="pteam">'+CLUSTER_LABEL[s.cluster]+' · '+s.team+'</div>'+
        '<ul>'+s.b.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul><p>'+s.c+'</p></article>';
    }).join('');
  }
  ps.style.display = '';
  $('b',stepPanel).textContent = STEPS[0].t; $('p',stepPanel).textContent = STEPS[0].d;
  if(!$('b',tlPanel).textContent){ $('b',tlPanel).textContent = PHASES[0].t; $('p',tlPanel).textContent = PHASES[0].d; }
});

})();
