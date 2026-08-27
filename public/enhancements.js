/* Production page enhancements: dedicated streaming hub and linked home sections. */
const baseSection=section,baseLivescore=livescore,basePredictions=predictions;
section=function(title,html,klass=''){
  const routes={'Live Stream Bola':'/livescore?tab=live','Prediksi':'/prediksi','Klasemen':'/klasemen','Berita Olahraga':'/berita'};
  const label=routes[title]?`<a class="section-title" href="${routes[title]}">${title} ›</a>`:`<span class="section-title">${title} ›</span>`;
  return `<section class="section">${label}<div class="${klass}">${html}</div></section>`;
};

function streamState(x){
  const s=String(x.match_status||x.status||'').toLowerCase();
  if(['live','1h','2h','ht','et','p'].includes(s))return 'live';
  const kick=Number(x.match_time||x.timestamp||0)*1000;
  return kick&&kick<Date.now()?'finished':'scheduled';
}
function hubStreamCard(x){
  const t=streamTeams(x),mid=x.match_id||x.id||x.slug||encodeURIComponent(`${t.home.name}-vs-${t.away.name}`),status=streamState(x),kick=Number(x.match_time||x.timestamp||0)*1000;
  return `<a class="live-hub-card" data-stream-status="${status}" href="/match/${esc(mid)}"><div class="live-ribbon ${status}">${status==='live'?'● LIVE':status==='finished'?'BERAKHIR':'AKAN DATANG'}</div><div class="live-league">${esc(x.league_name||x.league||'Sepak Bola')}</div><div class="live-hub-teams">${team(t.home)}<strong>${status==='live'?esc((x.homeTeamScore??x.home_score??0)+' : '+(x.awayTeamScore??x.away_score??0)):'VS'}</strong>${team(t.away)}</div><div class="live-watch">${status==='live'?'▣ Nonton Sekarang':kick?`Mulai ${fmtDate(kick)} • ${fmtTime(kick)}`:'Buka pertandingan'}</div></a>`;
}
async function liveStreamHub(){
  app.innerHTML='<div class="loading"><span></span> Memuat pertandingan live...</div>';
  try{
    const streams=await loadStreams();state.streams=streams;
    app.innerHTML=`<div class="container live-hub"><div class="live-hub-heading"><div><small>LIVE STREAMING</small><h1>Live Stream Bola</h1><p>Pilih pertandingan untuk membuka pemutar, server alternatif, dan komentar member.</p></div><a class="btn" href="/livescore">Lihat Semua Skor</a></div><div class="live-hub-filters"><input id="liveSearch" placeholder="🔍 Cari tim atau liga..."><button class="filter-active" data-live-filter="all">Semua (${streams.length})</button><button data-live-filter="live">Live (${streams.filter(x=>streamState(x)==='live').length})</button><button data-live-filter="scheduled">Dijadwalkan</button><button data-live-filter="finished">Berakhir</button></div><div id="liveGrid" class="live-hub-grid">${streams.map(hubStreamCard).join('')||'<div class="service-empty"><img src="/favicon.svg"><div><b>Belum ada pertandingan streaming</b><span>Jadwal akan muncul otomatis saat penyedia mengirim data.</span></div></div>'}</div></div>`;
    const apply=()=>{const q=(document.querySelector('#liveSearch')?.value||'').toLowerCase(),f=document.querySelector('[data-live-filter].filter-active')?.dataset.liveFilter||'all';document.querySelectorAll('.live-hub-card').forEach(c=>c.hidden=!(c.textContent.toLowerCase().includes(q)&&(f==='all'||c.dataset.streamStatus===f)))};
    document.querySelector('#liveSearch')?.addEventListener('input',apply);
    document.querySelectorAll('[data-live-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-live-filter]').forEach(x=>x.classList.remove('filter-active'));b.classList.add('filter-active');apply()});
  }catch(e){app.innerHTML=`<div class="container live-hub">${configError({message:friendlyApiError(e.message,'stream')})}</div>`}
}

async function liveSideStandings(){
  const box=document.querySelector('.livescore-page .standings');if(!box)return;
  try{const d=await api('/api/football/standings?league=39&season='+new Date().getFullYear()),rows=d.response?.[0]?.league?.standings?.[0]||[];box.innerHTML=`<h3>Premier League</h3><small>KLASEMEN TERKINI</small><table class="side-table"><thead><tr><th>#</th><th>Tim</th><th>PL</th><th>PTS</th></tr></thead><tbody>${rows.slice(0,20).map(r=>`<tr><td>${r.rank}</td><td><img src="${esc(r.team.logo)}">${esc(r.team.name)}</td><td>${r.all.played}</td><td><b>${r.points}</b></td></tr>`).join('')}</tbody></table><a class="btn standings-more" href="/klasemen?league=39">Klasemen Lengkap</a>`}catch{}
}
livescore=async function(){
  if(new URLSearchParams(location.search).get('tab')==='live')return liveStreamHub();
  await baseLivescore();liveSideStandings();
};

function predictionCover(x){
  const h=x.teams?.home||{},a=x.teams?.away||{};
  return `<a class="sarang-cover" href="/match/${x.fixture.id}"><div class="cover-brand">BOLA <b>UTAMA</b></div><div class="cover-teams"><img src="${esc(h.logo||'/favicon.svg')}"><span>VS</span><img src="${esc(a.logo||'/favicon.svg')}"></div><strong>Prediksi Sepak Bola</strong><time>${fmtDate(x.fixture.date)}</time></a>`;
}
function recentForm(p,teamId){
  const games=Array.isArray(p?.h2h)?p.h2h.slice(-5):[];
  const values=games.map(g=>{const home=Number(g.teams?.home?.id)===Number(teamId),gf=Number(home?g.goals?.home:g.goals?.away),ga=Number(home?g.goals?.away:g.goals?.home);return gf>ga?'W':gf<ga?'L':'D'});
  return formHTML(values.join(''));
}
function sarangPredictionRow({x,p}){
  const raw=p?.predictions?.percent||{},ph=Math.max(0,Number(String(raw.home||0).replace('%',''))),pd=Math.max(0,Number(String(raw.draw||0).replace('%',''))),pa=Math.max(0,Number(String(raw.away||0).replace('%',''))),sum=ph+pd+pa||100,hp=Math.round(ph/sum*100),dp=Math.round(pd/sum*100),ap=100-hp-dp,h=x.teams.home,a=x.teams.away,gh=p?.predictions?.goals?.home,ga=p?.predictions?.goals?.away;
  const predicted=(gh!=null&&ga!=null&&/^\d+(?:\.\d+)?$/.test(String(gh))&&/^\d+(?:\.\d+)?$/.test(String(ga)))?`${Math.round(Number(gh))} : ${Math.round(Number(ga))}`:'– : –';
  return `<a class="sarang-pred-row" href="/match/${x.fixture.id}"><div class="pred-form home-form">${recentForm(p,h.id)}</div><div class="pred-match"><div class="pred-side home-side"><b>${esc(h.name)}</b><img src="${esc(h.logo||'/favicon.svg')}"></div><div class="pred-kick"><time>${fmtTime(x.fixture.date)}</time><strong>${predicted}</strong></div><div class="pred-side away-side"><img src="${esc(a.logo||'/favicon.svg')}"><b>${esc(a.name)}</b></div><div class="prob"><span class="home" style="width:${hp}%">Home: ${hp}%</span><span class="draw" style="width:${dp}%">Draw: ${dp}%</span><span class="away" style="width:${ap}%">Away: ${ap}%</span></div></div><div class="pred-form away-form">${recentForm(p,a.id)}</div></a>`;
}
predictions=async function(){
  app.innerHTML='<div class="loading"><span></span> Memuat prediksi...</div>';
  try{
    const fixtures=(await loadUpcoming(7)).filter(x=>x.fixture?.id).slice(0,40),enriched=await Promise.all(fixtures.map(async x=>{try{const d=await api('/api/football/predictions?fixture='+x.fixture.id);return{x,p:d.response?.[0]||null}}catch{return{x,p:null}}})),dates=[...new Set(fixtures.map(x=>ymd(x.fixture.date)))],first=dates[0],last=dates[dates.length-1];
    const byDate=enriched.reduce((all,item)=>{const date=ymd(item.x.fixture.date),league=item.x.league?.name||'Sepak Bola';all[date]??={};(all[date][league]??=[]).push(item);return all},{});
    app.innerHTML=`<div class="container sarang-predictions"><div class="sarang-page-title"><h1>Prediksi Bola</h1></div><div class="cover-slider"><button type="button" id="coverPrev">‹</button><div id="coverTrack">${fixtures.slice(0,12).map(predictionCover).join('')}</div><button type="button" id="coverNext">›</button></div><div class="prediction-copy"><h2>Prediksi Bola${first?` | ${fmtDate(first)}${last&&last!==first?' – '+fmtDate(last):''}`:''}</h2><p>Prediksi pertandingan sepak bola berdasarkan statistik, performa tim, pertemuan sebelumnya, dan data API-FOOTBALL.</p></div><div class="prediction-search"><input id="predSearch" placeholder="⌕  Pencarian tim atau liga..."></div><div id="predictionDates">${Object.entries(byDate).map(([date,leagues],di)=>`<details class="prediction-date" ${di===0?'open':''}><summary><b>${new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00Z'))}</b><span>⌄</span></summary><div>${Object.entries(leagues).map(([name,items])=>`<section class="sarang-league"><div class="league-head"><img src="${esc(items[0].x.league?.logo||'/favicon.svg')}"><b>${esc(name)}</b></div>${items.map(sarangPredictionRow).join('')}</section>`).join('')}</div></details>`).join('')||'<div class="service-empty"><img src="/favicon.svg"><div><b>Prediksi belum tersedia</b><span>Belum ada jadwal pertandingan tujuh hari ke depan.</span></div></div>'}</div></div>`;
    const track=document.querySelector('#coverTrack');document.querySelector('#coverPrev').onclick=()=>track.scrollBy({left:-480,behavior:'smooth'});document.querySelector('#coverNext').onclick=()=>track.scrollBy({left:480,behavior:'smooth'});document.querySelector('#predSearch').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.sarang-pred-row').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q));document.querySelectorAll('.sarang-league').forEach(g=>g.hidden=![...g.querySelectorAll('.sarang-pred-row')].some(r=>!r.hidden))};
  }catch(e){app.innerHTML=configError(e)}
};
