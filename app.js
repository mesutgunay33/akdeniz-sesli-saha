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
    if($('transcript').value.trim()){
      setStatus('Konuşma yazıya çevrildi. Taslak oluşturabilirsiniz.','ok');
    }
  };

  try{
    recognition.start();
  }catch(e){
    setStatus('Mikrofon başlatılamadı: '+e.message,'err');
  }
}

function clearTranscript(){
  $('transcript').value='';
  finalText='';
  ['team','supervisor','location','work','targetQty','people','vehicles','note']
    .forEach(id=>$(id).value='');

  $('start').value='08:00';
  $('end').value='17:00';
  $('targetUnit').value='';
  $('confidence').textContent='Bekliyor';
  setStatus('Temizlendi.');
}

function parseTime(text,keys){
  const keyPart=keys.join('|');
  const r=new RegExp(
    '(?:'+keyPart+')\\s*(\\d{1,2})(?:[:.\\s](\\d{2}))?',
    'i'
  ).exec(text);

  if(!r)return '';

  const hh=String(Math.min(23,Number(r[1]))).padStart(2,'0');
  const mm=String(r[2]||'00').padStart(2,'0');

  return hh+':'+mm;
}

function kmFormatV2(raw){
  let s=String(raw||'').replace(/[^\d]/g,'');

  if(!s)return '';

  if(s.length<=3){
    return 'KM '+s;
  }

  return 'KM '+s.slice(0,-3)+'+'+s.slice(-3);
}

function cleanPersonNameV2(name){
  return normalizeSpaces(
    String(name||'')
      .replace(
        /\b(?:başlangıç|baslangic|bitiş|bitis|hedef|kilometre|km|saat)\b.*$/i,
        ''
      )
      .replace(/[.,;:]+$/,'')
  );
}

function extractSupervisorV2(raw){
  const m=raw.match(
    /(?:sorumlu|formen)\s+([A-Za-zÇĞİÖŞÜçğıöşü]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü]+){1,3})/i
  );

  return m ? cleanPersonNameV2(m[1]) : '';
}

function extractLocationV2(raw){

  let m=raw.match(/\bkilometre\s*(\d{1,7})\b/i);

  if(m){
    return kmFormatV2(m[1]);
  }

  m=raw.match(
    /\bkm\s*(\d{1,4})\s*[+.,]?\s*(\d{1,3})\b/i
  );

  if(m){
    return 'KM '+Number(m[1])+'+'+String(m[2]).padStart(3,'0');
  }

  m=raw.match(
    /(?:ekip\s*\d+\s+)?(.{2,70}?)(?:\s+(?:hattında|hatta|bölgesinde|bolgesinde|lokasyonunda))\b/i
  );

  if(m){

    let v=normalizeSpaces(m[1])
      .replace(/^yarın\s+/i,'')
      .replace(/^bugün\s+/i,'');

    v=v.replace(/^kilometre\s*\d+\s*/i,'');

    if(v.length<80){
      return v;
    }
  }

  return '';
}

function extractWorkV2(raw){

  const diameter=raw.match(
    /(\d{2,4})\s*['’]?\s*lük\b/i
  );

  let action='';

  if(/boru\s+döş/i.test(raw)){
    action='boru döşeme';
  }
  else if(/kazı|kazi/i.test(raw)){
    action='kazı';
  }
  else if(/dolgu/i.test(raw)){
    action='dolgu';
  }
  else if(/beton/i.test(raw)){
    action='beton imalatı';
  }
  else if(/rögar|rogar/i.test(raw)){
    action='rögar imalatı';
  }

  if(diameter && action){
    return 'Ø'+diameter[1]+' '+action;
  }

  let work=raw
    .replace(/\bEkip\s*\d+\b/ig,'')
    .replace(/\bkilometre\s*\d+\b/ig,'')
    .replace(/\bKM\s*\d+(?:\s*[+.,]\s*\d+)?\b/ig,'')
    .replace(
      /Sorumlu\s+[A-Za-zÇĞİÖŞÜçğıöşü]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü]+){1,3}[.,;]?/ig,
      ''
    )
    .replace(
      /Başlangıç\s*\d{1,2}(?:[:.\s]\d{2})?[.,;]?/ig,
      ''
    )
    .replace(
      /Bitiş\s*\d{1,2}(?:[:.\s]\d{2})?[.,;]?/ig,
      ''
    )
    .replace(
      /Hedef\s*\d+(?:[.,]\d+)?\s*(?:metre|m\b|m²|m3|m³|adet|ton|kg)[.,;]?/ig,
      ''
    );

  return normalizeSpaces(work)
    .replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/g,'');
}

function parseTranscript(){

  const raw=normalizeSpaces($('transcript').value);

  if(!raw){
    setStatus('Önce konuşun veya metin yazın.','err');
    return;
  }

  let score=0;

  const team=raw.match(/\b(ekip\s*\d+)\b/i);

  if(team){
    $('team').value=team[1].replace(/\s+/g,' ');
    score++;
  }

  const supervisor=extractSupervisorV2(raw);

  if(supervisor){
    $('supervisor').value=supervisor;
    score++;
  }

  const location=extractLocationV2(raw);

  if(location){
    $('location').value=location;
    score++;
  }

  const start=parseTime(
    raw,
    ['başlangıç','baslangic','saat']
  );

  const end=parseTime(
    raw,
    ['bitiş','bitis','bitecek','kadar']
  );

  if(start){
    $('start').value=start;
    score++;
  }

  if(end){
    $('end').value=end;
    score++;
  }

  const target=raw.match(
    /(?:hedef|planlanan|yaklaşık|yaklasik)\s*(\d+(?:[.,]\d+)?)\s*(metre|m\b|m2|m²|m3|m³|adet|ton|kg)/i
  );

  if(target){

    $('targetQty').value=
      String(target[1]).replace(',','.');

    const u=target[2].toLowerCase();

    $('targetUnit').value=
      u.startsWith('metre') || u==='m'
        ? 'm'
        : u;

    score++;
  }

  const work=extractWorkV2(raw);

  $('work').value=work||raw;

  if(work){
    score++;
  }

  const people=[];

  if(supervisor){
    people.push(supervisor);
  }

  $('people').value=
    [...new Set(people)].join(', ');

  const vehicleTerms=[];

  const vr=raw.match(
    /((?:cat|jcb|ekskavatör|ekskavator|kamyon|pikap|vinç|vinc|loader|dozer)[^.;,]*)/ig
  );

  if(vr){
    vehicleTerms.push(
      ...vr.map(normalizeSpaces)
    );
  }

  $('vehicles').value=
    [...new Set(vehicleTerms)].join(', ');

  $('confidence').textContent=
    score>=6
      ? 'İyi'
      : score>=4
      ? 'Orta'
      : 'Kontrol Gerekli';

  setStatus(
    'V2 taslak oluşturuldu. Lokasyon, iş ve sorumlu alanları geliştirildi.',
    'ok'
  );
}

function collectDraft(){

  return {

    type:'TOMORROW_WORK_PLAN',

    createdAt:new Date().toISOString(),

    transcript:
      $('transcript').value.trim(),

    team:
      $('team').value.trim(),

    supervisor:
      $('supervisor').value.trim(),

    location:
      $('location').value.trim(),

    work:
      $('work').value.trim(),

    start:
      $('start').value,

    end:
      $('end').value,

    targetQty:
      $('targetQty').value,

    targetUnit:
      $('targetUnit').value,

    people:
      $('people').value
        .split(',')
        .map(x=>x.trim())
        .filter(Boolean),

    vehicles:
      $('vehicles').value
        .split(',')
        .map(x=>x.trim())
        .filter(Boolean),

    note:
      $('note').value.trim()
  };
}

function showPreview(){

  const d=collectDraft();

  const rows=[

    ['Ekip',d.team||'-'],

    ['Sorumlu',d.supervisor||'-'],

    ['Lokasyon',d.location||'-'],

    ['Yapılacak İş',d.work||'-'],

    ['Saat',d.start+' – '+d.end],

    [
      'Hedef',
      d.targetQty
        ? d.targetQty+' '+d.targetUnit
        : '-'
    ],

    [
      'Personel',
      d.people.join(', ')||'-'
    ],

    [
      'Araç / Makine',
      d.vehicles.join(', ')||'-'
    ],

    [
      'Not',
      d.note||'-'
    ]
  ];

  $('previewBody').innerHTML=
    rows.map(
      r=>
        '<div class="preview-row">'+
          '<span>'+r[0]+'</span>'+
          '<b>'+escapeHtml(r[1])+'</b>'+
        '</div>'
    ).join('');

  $('preview').classList.remove('hidden');
}

function closePreview(){
  $('preview').classList.add('hidden');
}

function escapeHtml(s){

  return String(s||'')
    .replace(
      /[&<>"']/g,
      m=>({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[m])
    );
}

function exportJson(){

  const d=collectDraft();

  const blob=new Blob(
    [
      JSON.stringify(
        d,
        null,
        2
      )
    ],
    {
      type:'application/json;charset=utf-8'
    }
  );

  const a=document.createElement('a');

  a.href=
    URL.createObjectURL(blob);

  a.download=
    'Akdeniz_Sesli_Saha_Taslak_'+
    new Date().toISOString().slice(0,10)+
    '.json';

  document.body.appendChild(a);

  a.click();

  a.remove();

  setTimeout(
    ()=>URL.revokeObjectURL(a.href),
    500
  );
}
