let recognition=null;
let listening=false;
let finalText='';

let guidedActive=false;
let guidedIndex=0;

const guidedSteps=[
  {
    key:'team',
    question:'Hangi ekip? Örneğin Ekip 1.'
  },
  {
    key:'location',
    question:'Kilometre veya çalışma yeri nedir? Örneğin 24 artı 500.'
  },
  {
    key:'work',
    question:'Yapılacak iş nedir?'
  },
  {
    key:'diameter',
    question:'Boru çapı nedir? Örneğin 1000.'
  },
  {
    key:'supervisor',
    question:'Sorumlu kim?'
  },
  {
    key:'personnel',
    question:'Personel adı nedir? Personel yoksa yok deyin.'
  },
  {
    key:'personnelMore',
    question:'Başka personel var mı? Evet veya hayır deyin.'
  },
  {
    key:'vehicle',
    question:'Araç veya makine nedir? Örneğin kamyon 3 veya JCB 2. Yoksa yok deyin.'
  },
  {
    key:'vehicleMore',
    question:'Başka araç veya makine var mı? Evet veya hayır deyin.'
  },
  {
    key:'target',
    question:'Hedef nedir? Örneğin 60 metre.'
  },
  {
    key:'confirm',
    question:'Bilgiler doğru mu? Evet veya hayır deyin.'
  }
];

function $(id){return document.getElementById(id)}

function openWorkPlan(){
  $('workView').classList.remove('hidden');
  document.body.style.overflow='hidden';
}

function openDaily(){
  $('dailyView').classList.remove('hidden');
  document.body.style.overflow='hidden';
}

function closeView(id){
  $(id).classList.add('hidden');
  document.body.style.overflow='';
}

function setStatus(msg,cls=''){
  const e=$('status');
  e.textContent=msg;
  e.className='status'+(cls?' '+cls:'');
}

function normalizeSpaces(s){
  return String(s||'').replace(/\s+/g,' ').trim();
}

function trFold(s){
  return String(s||'')
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g,'I')
    .replace(/Ş/g,'S')
    .replace(/Ğ/g,'G')
    .replace(/Ü/g,'U')
    .replace(/Ö/g,'O')
    .replace(/Ç/g,'C');
}

function speechSupported(){
  return !!(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition
  );
}


/* =========================================================
   SESLİ SORU - CEVAP ASİSTANI
========================================================= */

function toggleRecognition(){

  if(listening){
    try{
      recognition.stop();
    }catch(e){}
    return;
  }

  if(guidedActive){
    stopGuidedAssistant();
    return;
  }

  startGuidedAssistant();
}


function startGuidedAssistant(){

  if(!speechSupported()){
    setStatus(
      'Bu tarayıcı konuşma tanımayı desteklemiyor. Chrome veya Edge kullanın.',
      'err'
    );
    return;
  }

  guidedActive=true;
  guidedIndex=0;
  finalText='';

  $('transcript').value='';

  ['team','supervisor','location','work','targetQty','people','vehicles','note']
    .forEach(id=>$(id).value='');
  $('targetUnit').value='';
  $('confidence').textContent='Bekliyor';

  $('startBtn').classList.add('listening');
  $('startBtn').textContent='⏹️ Asistanı Durdur';

  setStatus(
    'Sesli asistan başladı.',
    'ok'
  );

  setTimeout(
    askGuidedQuestion,
    300
  );
}


function stopGuidedAssistant(){

  guidedActive=false;
  listening=false;

  if(recognition){
    try{
      recognition.stop();
    }catch(e){}
  }

  if(window.speechSynthesis){
    window.speechSynthesis.cancel();
  }

  $('startBtn').classList.remove('listening');
  $('startBtn').textContent='🎙️ Konuşmaya Başla';

  setStatus(
    'Sesli asistan durduruldu.'
  );
}


function askGuidedQuestion(){

  if(!guidedActive){
    return;
  }

  if(guidedIndex>=guidedSteps.length){
    finishGuidedAssistant();
    return;
  }

  const step=guidedSteps[guidedIndex];

  setStatus(
    step.question,
    'ok'
  );

  speakTurkish(
    step.question,
    ()=>{
      if(guidedActive){
        startGuidedRecognition();
      }
    }
  );
}


function speakTurkish(text,callback){

  if(!window.speechSynthesis){
    if(callback){
      callback();
    }
    return;
  }
    window.speechSynthesis.cancel();

  const utterance=
    new SpeechSynthesisUtterance(text);

  utterance.lang='tr-TR';

  const voices=
    window.speechSynthesis.getVoices();

  const femaleVoice=
    voices.find(v=>
      v.lang &&
      v.lang.toLowerCase().startsWith('tr') &&
      /female|kadın|filiz|emel|yelda|selin/i.test(v.name)
    )
    ||
    voices.find(v=>
      v.lang &&
      v.lang.toLowerCase().startsWith('tr')
    );

  if(femaleVoice){
    utterance.voice=femaleVoice;
  }

  utterance.rate=0.95;
  utterance.pitch=1.05;

  utterance.onend=()=>{
    setTimeout(
      ()=>{
        if(callback){
          callback();
        }
      },
      250
    );
  };

  utterance.onerror=()=>{
    if(callback){
      callback();
    }
  };

  window.speechSynthesis.speak(
    utterance
  );
}


function startGuidedRecognition(){

  if(!guidedActive){
    return;
  }

  const SR=
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  recognition=new SR();

  recognition.lang='tr-TR';
  recognition.continuous=false;
  recognition.interimResults=true;
  recognition.maxAlternatives=1;

  let answer='';

  recognition.onstart=()=>{
    listening=true;

    setStatus(
      '🎙️ Cevabınızı dinliyorum…',
      'ok'
    );
  };


  recognition.onresult=(event)=>{

    let interim='';

    for(
      let i=event.resultIndex;
      i<event.results.length;
      i++
    ){

      const t=
        event.results[i][0].transcript || '';

      if(event.results[i].isFinal){
        answer+=' '+t;
      }
      else{
        interim+=' '+t;
      }
    }

    const live=
      normalizeSpaces(
        answer+' '+interim
      );

    if(live){
      setStatus(
        'Duyduğum: '+live,
        'ok'
      );
    }
  };


  recognition.onerror=(event)=>{

    listening=false;

    const code=
      String(event.error||'');

    if(code==='no-speech'){

      setStatus(
        'Ses duyamadım. Aynı soruyu tekrar soruyorum.',
        'err'
      );

      setTimeout(
        askGuidedQuestion,
        1000
      );

      return;
    }

    if(code==='not-allowed'){

      guidedActive=false;

      $('startBtn').classList.remove('listening');
      $('startBtn').textContent='🎙️ Konuşmaya Başla';

      setStatus(
        'Mikrofon izni verilmedi.',
        'err'
      );

      return;
    }

    setStatus(
      'Ses algılama hatası: '+code,
      'err'
    );
  };


  recognition.onend=()=>{

    listening=false;

    answer=
      normalizeSpaces(answer);

    if(!guidedActive){
      return;
    }

    if(!answer){

      setTimeout(
        askGuidedQuestion,
        700
      );

      return;
    }

    processGuidedAnswer(
      answer
    );
  };


  try{
    recognition.start();
  }
  catch(e){

    setStatus(
      'Mikrofon başlatılamadı: '+e.message,
      'err'
    );
  }
}


function processGuidedAnswer(answer){

  const step=
    guidedSteps[guidedIndex];

  const check=
    validateGuidedAnswer(
      step.key,
      answer
    );

  if(!check.ok){

    setStatus(
      check.message,
      'err'
    );

    speakTurkish(
      check.message,
      ()=>{
        setTimeout(
          askGuidedQuestion,
          400
        );
      }
    );

    return;
  }

  appendConversation(
    step.question,
    answer
  );


  if(step.key==='team'){

    $('team').value=
      formatTeamAnswer(answer);
  }


  else if(step.key==='location'){

    $('location').value=
      formatKmAnswer(answer);
  }


  else if(step.key==='work'){

    $('work').value=
      formatWorkAnswer(answer);
  }


  else if(step.key==='diameter'){

    const m=
      String(answer)
        .match(/\d{2,4}/);

    if(m){

      const diameter=
        m[0];

      let currentWork=
        $('work').value.trim();

      currentWork=
        currentWork
          .replace(
            /^Ø\d+\s*/,
            ''
          )
          .trim();

      $('work').value=
        'Ø'+
        diameter+
        ' '+
        currentWork;
    }
  }


  else if(step.key==='supervisor'){

    const person=
      formatPersonAnswer(answer);

    $('supervisor').value=
      person;

    addUniqueCsvValue(
      'people',
      person
    );
  }


  else if(step.key==='personnel'){

    const folded=
      trFold(answer);

    if(
      folded==='YOK' ||
      folded.includes('PERSONEL YOK')
    ){
      guidedIndex=
        findGuidedStepIndex(
          'vehicle'
        );

      setTimeout(
        askGuidedQuestion,
        450
      );

      return;
    }

    const person=
      formatPersonAnswer(answer);

    addUniqueCsvValue(
      'people',
      person
    );
  }


  else if(step.key==='personnelMore'){

    const folded=
      trFold(answer);

    if(isYesAnswer(folded)){

      guidedIndex=
        findGuidedStepIndex(
          'personnel'
        );

      setTimeout(
        askGuidedQuestion,
        450
      );

      return;
    }

    if(isNoAnswer(folded)){

      guidedIndex=
        findGuidedStepIndex(
          'vehicle'
        );

      setTimeout(
        askGuidedQuestion,
        450
      );

      return;
    }
  }


  else if(step.key==='vehicle'){

    const folded=
      trFold(answer);

    if(
      folded==='YOK' ||
      folded.includes('ARAC YOK') ||
      folded.includes('MAKINE YOK')
    ){

      guidedIndex=
        findGuidedStepIndex(
          'target'
        );

      setTimeout(
        askGuidedQuestion,
        450
      );

      return;
    }

    addUniqueCsvValue(
      'vehicles',
      normalizeSpaces(answer)
    );
  }


  else if(step.key==='vehicleMore'){

    const folded=
      trFold(answer);

    if(isYesAnswer(folded)){

      guidedIndex=
        findGuidedStepIndex(
          'vehicle'
        );

      setTimeout(
        askGuidedQuestion,
        450
      );

      return;
    }

    if(isNoAnswer(folded)){

      guidedIndex=
        findGuidedStepIndex(
          'target'
        );

      setTimeout(
        askGuidedQuestion,
        450
      );

      return;
    }
  }


  else if(step.key==='target'){

    const target=
      formatTargetAnswer(answer);

    $('targetQty').value=
      target.qty;

    $('targetUnit').value=
      target.unit;
  }


  else if(step.key==='confirm'){

    const folded=
      trFold(answer);

    if(isYesAnswer(folded)){

      $('confidence').textContent=
        'Onaylandı';

      setStatus(
        'Bilgiler onaylandı.',
        'ok'
      );

      guidedActive=false;

      $('startBtn').classList.remove('listening');
      $('startBtn').textContent='🎙️ Konuşmaya Başla';

      speakTurkish(
        'Program hazırlandı.',
        ()=>{
          showPreview();
        }
      );

      return;
    }


    if(isNoAnswer(folded)){

      setStatus(
        'Tamam. Bilgileri yeniden alıyorum.',
        'err'
      );

      speakTurkish(
        'Tamam. Baştan tekrar başlayalım.',
        ()=>{
          guidedIndex=0;
          $('transcript').value='';

          setTimeout(
            askGuidedQuestion,
            400
          );
        }
      );

      return;
    }
  }


  guidedIndex++;

  setTimeout(
    askGuidedQuestion,
    450
  );
}
function findGuidedStepIndex(key){
  return guidedSteps.findIndex(
    step=>step.key===key
  );
}


function isYesAnswer(folded){

  const s=trFold(folded);

  return (
    s==='EVET' ||
    s==='EVET VAR' ||
    s==='VAR' ||
    s==='DOGRU' ||
    s==='TAMAM' ||
    s.includes('EVET')
  );
}


function isNoAnswer(folded){

  const s=trFold(folded);

  return (
    s==='HAYIR' ||
    s==='YOK' ||
    s==='HAYIR YOK' ||
    s==='BASKA YOK' ||
    s==='YOKTUR' ||
    s==='YANLIS' ||
    s.includes('HAYIR')
  );
}


function addUniqueCsvValue(id,value){

  const clean=
    normalizeSpaces(value);

  if(!clean){
    return;
  }

  const current=
    $(id).value
      .split(',')
      .map(x=>normalizeSpaces(x))
      .filter(Boolean);

  const folded=
    trFold(clean);

  const exists=
    current.some(
      x=>trFold(x)===folded
    );

  if(!exists){
    current.push(clean);
  }

  $(id).value=
    current.join(', ');
}


function validateGuidedAnswer(key,answer){

  const raw=
    normalizeSpaces(answer);

  const folded=
    trFold(raw);


  if(key==='team'){

    const m=
      folded.match(
        /\bEKIP\s*(\d{1,2})\b/
      );

    if(!m){

      return {
        ok:false,
        message:'Ekip numarasını anlayamadım. Örneğin Ekip 3 deyin.'
      };
    }

    const n=
      Number(m[1]);

    if(n<1 || n>12){

      return {
        ok:false,
        message:'Ekip numarası 1 ile 12 arasında olmalı.'
      };
    }
  }


  if(key==='supervisor'){

    if(!isValidPersonName(raw)){

      return {
        ok:false,
        message:'Sorumlu adını anlayamadım. Sadece ad ve soyadı söyleyin.'
      };
    }
  }


  if(key==='personnel'){

    if(
      folded==='YOK' ||
      folded.includes('PERSONEL YOK')
    ){
      return {
        ok:true,
        message:''
      };
    }

    if(!isValidPersonName(raw)){

      return {
        ok:false,
        message:'Personel adını anlayamadım. Sadece ad ve soyadı söyleyin veya yok deyin.'
      };
    }
  }


  if(key==='personnelMore'){

    if(
      !isYesAnswer(folded) &&
      !isNoAnswer(folded)
    ){

      return {
        ok:false,
        message:'Başka personel varsa evet, yoksa hayır deyin.'
      };
    }
  }


  if(key==='vehicle'){

    if(
      folded==='YOK' ||
      folded.includes('ARAC YOK') ||
      folded.includes('MAKINE YOK')
    ){
      return {
        ok:true,
        message:''
      };
    }

    if(raw.length<2 || raw.length>60){

      return {
        ok:false,
        message:'Araç veya makineyi anlayamadım. Örneğin kamyon 3 veya JCB 2 deyin.'
      };
    }
  }


  if(key==='vehicleMore'){

    if(
      !isYesAnswer(folded) &&
      !isNoAnswer(folded)
    ){

      return {
        ok:false,
        message:'Başka araç veya makine varsa evet, yoksa hayır deyin.'
      };
    }
  }


  if(key==='diameter'){

    const m=
      raw.match(
        /\d{2,4}/
      );

    if(!m){

      return {
        ok:false,
        message:'Boru çapını anlayamadım. Örneğin 1000 deyin.'
      };
    }

    const n=
      Number(m[0]);

    if(n<100 || n>3000){

      return {
        ok:false,
        message:'Boru çapını anlayamadım. Çapı tekrar söyleyin.'
      };
    }
  }


  if(key==='target'){

    if(!/\d/.test(raw)){

      return {
        ok:false,
        message:'Hedef miktarı anlayamadım. Örneğin 60 metre deyin.'
      };
    }
  }


  if(key==='confirm'){

    if(
      !isYesAnswer(folded) &&
      !isNoAnswer(folded)
    ){

      return {
        ok:false,
        message:'Lütfen evet veya hayır deyin.'
      };
    }
  }


  return {
    ok:true,
    message:''
  };
}


function isValidPersonName(answer){

  const raw=
    normalizeSpaces(answer);

  if(/\d/.test(raw)){
    return false;
  }

  const words=
    raw
      .split(/\s+/)
      .filter(Boolean);

  if(
    words.length<2 ||
    words.length>4
  ){
    return false;
  }

  return words.every(
    word=>
      /^[A-Za-zÇĞİÖŞÜçğıöşü'-]+$/.test(word)
  );
}


function appendConversation(question,answer){

  const old=
    $('transcript').value.trim();

  const line=
    'SORU: '+question+
    '\nCEVAP: '+answer;

  $('transcript').value=
    old
      ? old+'\n\n'+line
      : line;
}


function formatTeamAnswer(answer){

  const folded=
    trFold(answer);

  let m=
    folded.match(
      /EKIP\s*(\d{1,2})/
    );

  if(m){
    return 'Ekip '+m[1];
  }

  const numbers={
    'ON IKI':'12',
    'ON BIR':'11',
    'ON':'10',
    'DOKUZ':'9',
    'SEKIZ':'8',
    'YEDI':'7',
    'ALTI':'6',
    'BES':'5',
    'DORT':'4',
    'UC':'3',
    'IKI':'2',
    'BIR':'1'
  };

  for(const key of Object.keys(numbers)){

    if(folded.includes(key)){
      return 'Ekip '+numbers[key];
    }
  }

  return normalizeSpaces(answer);
}


function formatKmAnswer(answer){

  let s=
    trFold(answer);

  s=s
    .replace(/KILOMETRE/g,'')
    .replace(/\bKM\b/g,'')
    .replace(/ARTI/g,'+')
    .replace(/\s+/g,' ')
    .trim();

  let m=
    s.match(
      /(\d{1,4})\s*\+\s*(\d{1,3})/
    );

  if(m){

    return (
      'KM '+
      Number(m[1])+
      '+'+
      String(m[2]).padStart(3,'0')
    );
  }

  m=
    s.match(
      /(\d{4,7})/
    );

  if(m){
    return kmFormatV2(
      m[1]
    );
  }

  return normalizeSpaces(answer);
}


function formatWorkAnswer(answer){

  const raw=
    normalizeSpaces(answer);

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

  return action || raw;
}


function formatPersonAnswer(answer){

  let s=
    normalizeSpaces(answer)
      .replace(
        /^(?:sorumlu|formen|personel)\s+/i,
        ''
      )
      .replace(
        /[.,;:]+$/,
        ''
      );

  return s
    .split(' ')
    .map(
      word=>
        word
          ? word.charAt(0)
              .toLocaleUpperCase('tr-TR')+
            word.slice(1)
              .toLocaleLowerCase('tr-TR')
          : ''
    )
    .join(' ');
}


function formatTargetAnswer(answer){

  const raw=
    normalizeSpaces(answer);

  const m=
    raw.match(
      /(\d+(?:[.,]\d+)?)\s*(metre|meter|m\b|m2|m²|m3|m³|adet|ton|kg)?/i
    );

  if(!m){

    return {
      qty:raw,
      unit:''
    };
  }

  const qty=
    String(m[1])
      .replace(',','.');

  let unit=
    String(m[2]||'m')
      .toLowerCase();

  if(
    unit==='metre' ||
    unit==='meter' ||
    unit==='m'
  ){
    unit='m';
  }

  return {
    qty,
    unit
  };
}
function finishGuidedAssistant(){

  guidedActive=false;
  listening=false;

  $('startBtn').classList.remove('listening');
  $('startBtn').textContent='🎙️ Konuşmaya Başla';

  setStatus(
    'Sesli giriş tamamlandı.',
    'ok'
  );
}


/* =========================================================
   TEMİZLE
========================================================= */

function clearTranscript(){

  if(guidedActive){
    stopGuidedAssistant();
  }

  $('transcript').value='';
  finalText='';

  [
    'team',
    'supervisor',
    'location',
    'work',
    'targetQty',
    'people',
    'vehicles',
    'note'
  ].forEach(
    id=>$(id).value=''
  );

  $('start').value='08:00';
  $('end').value='17:00';
  $('targetUnit').value='';
  $('confidence').textContent='Bekliyor';

  setStatus(
    'Temizlendi.'
  );
}


/* =========================================================
   ESKİ V2 PARSER
   Manuel metin girişi için korunuyor
========================================================= */

function parseTime(text,keys){

  const keyPart=
    keys.join('|');

  const r=
    new RegExp(
      '(?:'+keyPart+')\\s*(\\d{1,2})(?:[:.\\s](\\d{2}))?',
      'i'
    ).exec(text);

  if(!r){
    return '';
  }

  const hh=
    String(
      Math.min(
        23,
        Number(r[1])
      )
    ).padStart(2,'0');

  const mm=
    String(
      r[2]||'00'
    ).padStart(2,'0');

  return hh+':'+mm;
}


function kmFormatV2(raw){

  let s=
    String(raw||'')
      .replace(/[^\d]/g,'');

  if(!s){
    return '';
  }

  if(s.length<=3){
    return 'KM '+s;
  }

  return (
    'KM '+
    s.slice(0,-3)+
    '+'+
    s.slice(-3)
  );
}


function cleanPersonNameV2(name){

  return normalizeSpaces(
    String(name||'')
      .replace(
        /\b(?:başlangıç|baslangic|bitiş|bitis|hedef|kilometre|km|saat)\b.*$/i,
        ''
      )
      .replace(
        /[.,;:]+$/,
        ''
      )
  );
}


function extractSupervisorV2(raw){

  const m=
    raw.match(
      /(?:sorumlu|formen)\s+([A-Za-zÇĞİÖŞÜçğıöşü]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü]+){1,3})/i
    );

  return m
    ? cleanPersonNameV2(m[1])
    : '';
}


function extractLocationV2(raw){

  let m=
    raw.match(
      /\bkilometre\s*(\d{1,7})\b/i
    );

  if(m){
    return kmFormatV2(
      m[1]
    );
  }

  m=
    raw.match(
      /\bkm\s*(\d{1,4})\s*[+.,]?\s*(\d{1,3})\b/i
    );

  if(m){

    return (
      'KM '+
      Number(m[1])+
      '+'+
      String(m[2])
        .padStart(3,'0')
    );
  }

  m=
    raw.match(
      /(?:ekip\s*\d+\s+)?(.{2,70}?)(?:\s+(?:hattında|hatta|bölgesinde|bolgesinde|lokasyonunda))\b/i
    );

  if(m){

    let v=
      normalizeSpaces(m[1])
        .replace(
          /^yarın\s+/i,
          ''
        )
        .replace(
          /^bugün\s+/i,
          ''
        );

    v=
      v.replace(
        /^kilometre\s*\d+\s*/i,
        ''
      );

    if(v.length<80){
      return v;
    }
  }

  return '';
}


function extractWorkV2(raw){

  const diameter=
    raw.match(
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

    return (
      'Ø'+
      diameter[1]+
      ' '+
      action
    );
  }

  let work=
    raw
      .replace(
        /\bEkip\s*\d+\b/ig,
        ''
      )
      .replace(
        /\bkilometre\s*\d+\b/ig,
        ''
      )
      .replace(
        /\bKM\s*\d+(?:\s*[+.,]\s*\d+)?\b/ig,
        ''
      )
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
    .replace(
      /^[,.;:\-\s]+|[,.;:\-\s]+$/g,
      ''
    );
}


function parseTranscript(){

  const raw=
    normalizeSpaces(
      $('transcript').value
    );

  if(!raw){

    setStatus(
      'Önce konuşun veya metin yazın.',
      'err'
    );

    return;
  }

  let score=0;

  const team=
    raw.match(
      /\b(ekip\s*\d+)\b/i
    );

  if(team){

    $('team').value=
      team[1]
        .replace(/\s+/g,' ');

    score++;
  }

  const supervisor=
    extractSupervisorV2(raw);

  if(supervisor){

    $('supervisor').value=
      supervisor;

    addUniqueCsvValue(
      'people',
      supervisor
    );

    score++;
  }

  const location=
    extractLocationV2(raw);

  if(location){

    $('location').value=
      location;

    score++;
  }

  const start=
    parseTime(
      raw,
      [
        'başlangıç',
        'baslangic',
        'saat'
      ]
    );

  const end=
    parseTime(
      raw,
      [
        'bitiş',
        'bitis',
        'bitecek',
        'kadar'
      ]
    );

  if(start){

    $('start').value=
      start;

    score++;
  }

  if(end){

    $('end').value=
      end;

    score++;
  }

  const target=
    raw.match(
      /(?:hedef|planlanan|yaklaşık|yaklasik)\s*(\d+(?:[.,]\d+)?)\s*(metre|m\b|m2|m²|m3|m³|adet|ton|kg)/i
    );

  if(target){

    $('targetQty').value=
      String(target[1])
        .replace(',','.');

    const u=
      target[2]
        .toLowerCase();

    $('targetUnit').value=
      u.startsWith('metre') ||
      u==='m'
        ? 'm'
        : u;

    score++;
  }

  const work=
    extractWorkV2(raw);

  $('work').value=
    work||raw;

  if(work){
    score++;
  }

  const vehicleTerms=[];

  const vr=
    raw.match(
      /((?:cat|jcb|ekskavatör|ekskavator|kamyon|pikap|vinç|vinc|loader|dozer)[^.;,]*)/ig
    );

  if(vr){

    vehicleTerms.push(
      ...vr.map(
        normalizeSpaces
      )
    );
  }

  vehicleTerms.forEach(
    vehicle=>
      addUniqueCsvValue(
        'vehicles',
        vehicle
      )
  );

  $('confidence').textContent=
    score>=6
      ? 'İyi'
      : score>=4
      ? 'Orta'
      : 'Kontrol Gerekli';

  setStatus(
    'V2 taslak oluşturuldu.',
    'ok'
  );
}


/* =========================================================
   TASLAK
========================================================= */

function collectDraft(){

  return {

    type:
      'TOMORROW_WORK_PLAN',

    createdAt:
      new Date().toISOString(),

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
        .map(
          x=>x.trim()
        )
        .filter(Boolean),

    vehicles:
      $('vehicles').value
        .split(',')
        .map(
          x=>x.trim()
        )
        .filter(Boolean),

    note:
      $('note').value.trim()
  };
}


function showPreview(){

  const d=
    collectDraft();

  const rows=[

    [
      'Ekip',
      d.team||'-'
    ],

    [
      'Sorumlu',
      d.supervisor||'-'
    ],

    [
      'Lokasyon',
      d.location||'-'
    ],

    [
      'Yapılacak İş',
      d.work||'-'
    ],

    [
      'Saat',
      d.start+' – '+d.end
    ],

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

  $('preview').classList.remove(
    'hidden'
  );
}


function closePreview(){

  $('preview').classList.add(
    'hidden'
  );
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

  const d=
    collectDraft();

  const blob=
    new Blob(
      [
        JSON.stringify(
          d,
          null,
          2
        )
      ],
      {
        type:
          'application/json;charset=utf-8'
      }
    );

  const a=
    document.createElement(
      'a'
    );

  a.href=
    URL.createObjectURL(
      blob
    );

  a.download=
    'Akdeniz_Sesli_Saha_Taslak_'+
    new Date()
      .toISOString()
      .slice(0,10)+
    '.json';

  document.body.appendChild(
    a
  );

  a.click();

  a.remove();

  setTimeout(
    ()=>URL.revokeObjectURL(
      a.href
    ),
    500
  );
}
