
let recognition=null;
let listening=false;
let finalText='';

function $(id){return document.getElementById(id)}
function openWorkPlan(){$('workView').classList.remove('hidden');document.body.style.overflow='hidden'}
function openDaily(){$('dailyView').classList.remove('hidden');document.body.style.overflow='hidden'}
function closeView(id){$(id).classList.add('hidden');document.body.style.overflow=''}
function setStatus(msg,cls=''){const e=$('status');e.textContent=msg;e.className='status'+(cls?' '+cls:'')}
function normalizeSpaces(s){return String(s||'').replace(/\s+/g,' ').trim()}
function trFold(s){return String(s||'').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/Ş/g,'S').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/Ç/g,'C')}

function speechSupported(){
  return !!(window.SpeechRecognition||window.webkitSpeechRecognition)
}

function toggleRecognition(){
  if(listening){try{recognition.stop()}catch(e){};return}
  if(!speechSupported()){
    setStatus('Bu tarayıcı konuşma tanımayı desteklemiyor. Chrome/Edge üzerinde HTTPS adresinde deneyin.','err');
    return;
  }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  recognition=new SR();
  recognition.lang='tr-TR';
  recognition.continuous=true;
  recognition.interimResults=true;
  recognition.maxAlternatives=1;
  finalText='';

  recognition.onstart=()=>{
    listening=true;
    $('startBtn').classList.add('listening');
    $('startBtn').textContent='⏹️ Dinlemeyi Durdur';
    setStatus('Dinliyorum…','ok');
  };

  recognition.onresult=(event)=>{
    let interim='';
    for(let i=event.resultIndex;i<event.results.length;i++){
      const t=event.results[i][0].transcript||'';
      if(event.results[i].isFinal) finalText+=' '+t;
      else interim+=' '+t;
    }
    $('transcript').value=normalizeSpaces(finalText+' '+interim);
  };

  recognition.onerror=(event)=>{
    const code=String(event.error||'');
    let msg='Ses algılama hatası: '+code;
    if(code==='not-allowed') msg='Mikrofon izni verilmedi. Site izinlerinden mikrofonu açın.';
    if(code==='no-speech') msg='Ses algılanmadı. Tekrar deneyin.';
    setStatus(msg,'err');
  };

  recognition.onend=()=>{
    listening=false;
    $('startBtn').classList.remove('listening');
    $('startBtn').textContent='🎙️ Konuşmaya Başla';
    if($('transcript').value.trim()) setStatus('Konuşma yazıya çevrildi. Taslak oluşturabilirsiniz.','ok');
  };

  try{recognition.start()}catch(e){setStatus('Mikrofon başlatılamadı: '+e.message,'err')}
}

function clearTranscript(){
  $('transcript').value='';
  finalText='';
  ['team','supervisor','location','work','targetQty','people','vehicles','note'].forEach(id=>$(id).value='');
  $('start').value='08:00';$('end').value='17:00';$('targetUnit').value='';
  $('confidence').textContent='Bekliyor';
  setStatus('Temizlendi.');
}

function parseTime(text, keys){
  const keyPart=keys.join('|');
  const r=new RegExp('(?:'+keyPart+')\\s*(\\d{1,2})(?:[:.\\s](\\d{2}))?','i').exec(text);
  if(!r)return '';
  const hh=String(Math.min(23,Number(r[1]))).padStart(2,'0');
  const mm=String(r[2]||'00').padStart(2,'0');
  return hh+':'+mm;
}

function parseTranscript(){
  const raw=normalizeSpaces($('transcript').value);
  if(!raw){setStatus('Önce konuşun veya metin yazın.','err');return}

  let score=0;

  const team=raw.match(/\b(ekip\s*\d+)\b/i);
  if(team){$('team').value=team[1].replace(/\s+/g,' ');score++}

  const sup=raw.match(/(?:sorumlu|formen)\s+([A-Za-zÇĞİÖŞÜçğıöşü]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü]+){1,3})/i);
  if(sup){$('supervisor').value=sup[1].replace(/[.,;].*$/,'').trim();score++}

  const start=parseTime(raw,['başlangıç','baslangic','saat']);
  const end=parseTime(raw,['bitiş','bitis','bitecek','kadar']);
  if(start){$('start').value=start;score++}
  if(end){$('end').value=end;score++}

  const target=raw.match(/(?:hedef|planlanan|yaklaşık|yaklasik)\s*(\d+(?:[.,]\d+)?)\s*(metre|m\b|m2|m²|m3|m³|adet|ton|kg)/i);
  if(target){
    $('targetQty').value=String(target[1]).replace(',','.');
    const u=target[2].toLowerCase();
    $('targetUnit').value=u.startsWith('metre')||u==='m'?'m':u;
    score++;
  }

  const loc=raw.match(/(?:ekip\s*\d+\s+)?(.{2,70}?)(?:\s+(?:hattında|hatta|bölgesinde|bolgesinde|lokasyonunda))\b/i);
  if(loc){
    let v=normalizeSpaces(loc[1]).replace(/^yarın\s+/i,'').replace(/^bugün\s+/i,'');
    if(v.length<80){$('location').value=v;score++}
  }

  // İş cümlesini mümkünse hedef/sorumlu/saat bölümlerinden önce kes.
  let work=raw
    .replace(/\bEkip\s*\d+\b/i,'')
    .replace(/Sorumlu\s+[A-Za-zÇĞİÖŞÜçğıöşü]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü]+){1,3}[.,;]?/i,'')
    .replace(/Başlangıç\s*\d{1,2}(?:[:.\s]\d{2})?[.,;]?/i,'')
    .replace(/Bitiş\s*\d{1,2}(?:[:.\s]\d{2})?[.,;]?/i,'')
    .replace(/Hedef\s*\d+(?:[.,]\d+)?\s*(?:metre|m\b|m²|m3|m³|adet|ton|kg)[.,;]?/i,'');
  work=normalizeSpaces(work).replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/g,'');
  $('work').value=work||raw;
  if(work)score++;

  // Basit personel ve araç sinyalleri.
  const people=[];
  const personPatterns=[
    /(?:personel|işçi|isci)\s*[:\-]?\s*([^.;]+)/i,
    /(?:ile|ve)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)+)/g
  ];
  if(sup) people.push(sup[1]);
  $('people').value=[...new Set(people)].join(', ');

  const vehicleTerms=[];
  const vr=raw.match(/((?:cat|jcb|ekskavatör|ekskavator|kamyon|pikap|vinç|vinc|loader|dozer)[^.;,]*)/ig);
  if(vr)vehicleTerms.push(...vr.map(normalizeSpaces));
  $('vehicles').value=[...new Set(vehicleTerms)].join(', ');

  $('confidence').textContent=score>=5?'İyi':score>=3?'Orta':'Kontrol Gerekli';
  setStatus('Taslak oluşturuldu. Alanları kontrol edip gerekiyorsa düzeltin.','ok');
}

function collectDraft(){
  return {
    type:'TOMORROW_WORK_PLAN',
    createdAt:new Date().toISOString(),
    transcript:$('transcript').value.trim(),
    team:$('team').value.trim(),
    supervisor:$('supervisor').value.trim(),
    location:$('location').value.trim(),
    work:$('work').value.trim(),
    start:$('start').value,
    end:$('end').value,
    targetQty:$('targetQty').value,
    targetUnit:$('targetUnit').value,
    people:$('people').value.split(',').map(x=>x.trim()).filter(Boolean),
    vehicles:$('vehicles').value.split(',').map(x=>x.trim()).filter(Boolean),
    note:$('note').value.trim()
  };
}

function showPreview(){
  const d=collectDraft();
  const rows=[
    ['Ekip',d.team||'-'],['Sorumlu',d.supervisor||'-'],['Lokasyon',d.location||'-'],
    ['Yapılacak İş',d.work||'-'],['Saat',d.start+' – '+d.end],
    ['Hedef',(d.targetQty?d.targetQty+' '+d.targetUnit:'-')],
    ['Personel',d.people.join(', ')||'-'],['Araç / Makine',d.vehicles.join(', ')||'-'],
    ['Not',d.note||'-']
  ];
  $('previewBody').innerHTML=rows.map(r=>'<div class="preview-row"><span>'+r[0]+'</span><b>'+escapeHtml(r[1])+'</b></div>').join('');
  $('preview').classList.remove('hidden');
}

function closePreview(){$('preview').classList.add('hidden')}

function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function exportJson(){
  const d=collectDraft();
  const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='Akdeniz_Sesli_Saha_Taslak_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
