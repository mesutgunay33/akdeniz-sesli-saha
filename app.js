let recognition=null;
let listening=false;
let finalText='';

let guidedActive=false;
let guidedIndex=0;

const guidedSteps=[
  {key:'team',question:'Hangi ekip? Örneğin Ekip 1.'},
  {key:'location',question:'Kilometre veya çalışma yeri nedir? Örneğin 24 artı 500.'},
  {key:'work',question:'Yapılacak iş nedir?'},
  {key:'diameter',question:'Boru çapı nedir? Örneğin 1000.'},
  {key:'supervisor',question:'Sorumlu kim?'},
  {key:'personnel',question:'Personel adı nedir? Personel yoksa yok deyin.'},
  {key:'personnelMore',question:'Başka personel var mı? Evet veya hayır deyin.'},
  {key:'vehicle',question:'Araç veya makine nedir? Örneğin kamyon 3 veya JCB 2. Yoksa yok deyin.'},
  {key:'vehicleMore',question:'Başka araç veya makine var mı? Evet veya hayır deyin.'},
  {key:'target',question:'Hedef nedir? Örneğin 60 metre.'},
  {key:'confirm',question:'Bilgiler doğru mu? Evet veya hayır deyin.'}
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
  return !!(window.SpeechRecognition||window.webkitSpeechRecognition);
}

function toggleRecognition(){
  if(listening){
    try{recognition.stop()}catch(e){}
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

  [
    'team','supervisor','location','work',
    'targetQty','people','vehicles','note'
  ].forEach(id=>$(id).value='');

  $('targetUnit').value='';
  $('confidence').textContent='Bekliyor';

  $('startBtn').classList.add('listening');
  $('startBtn').textContent='⏹️ Asistanı Durdur';

  setStatus('Sesli asistan başladı.','ok');

  setTimeout(askGuidedQuestion,300);
}

function stopGuidedAssistant(){
  guidedActive=false;
  listening=false;

  if(recognition){
    try{recognition.stop()}catch(e){}
  }

  if(window.speechSynthesis){
    window.speechSynthesis.cancel();
  }

  $('startBtn').classList.remove('listening');
  $('startBtn').textContent='🎙️ Konuşmaya Başla';

  setStatus('Sesli asistan durduruldu.');
}

function askGuidedQuestion(){
  if(!guidedActive)return;

  if(guidedIndex>=guidedSteps.length){
    finishGuidedAssistant();
    return;
  }

  const step=guidedSteps[guidedIndex];

  setStatus(step.question,'ok');

  speakTurkish(step.question,()=>{
    if(guidedActive){
      startGuidedRecognition();
    }
  });
}

function speakTurkish(text,callback){
  if(!window.speechSynthesis){
    if(callback)callback();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang='tr-TR';

  const voices=window.speechSynthesis.getVoices();

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
    setTimeout(()=>{
      if(callback)callback();
    },250);
  };

  utterance.onerror=()=>{
    if(callback)callback();
  };

  window.speechSynthesis.speak(utterance);
}

function startGuidedRecognition(){
  if(!guidedActive)return;

  const SR=
    window.SpeechRecognition||
    window.webkitSpeechRecognition;

  recognition=new SR();

  recognition.lang='tr-TR';
  recognition.continuous=false;
  recognition.interimResults=true;
  recognition.maxAlternatives=1;

  let answer='';

  recognition.onstart=()=>{
    listening=true;
    setStatus('🎙️ Cevabınızı dinliyorum…','ok');
  };

  recognition.onresult=(event)=>{
    let interim='';

    for(let i=event.resultIndex;i<event.results.length;i++){
      const t=event.results[i][0].transcript||'';

      if(event.results[i].isFinal){
        answer+=' '+t;
      }else{
        interim+=' '+t;
      }
    }

    const live=normalizeSpaces(answer+' '+interim);

    if(live){
      setStatus('Duyduğum: '+live,'ok');
    }
  };

  recognition.onerror=(event)=>{
    listening=false;

    const code=String(event.error||'');

    if(code==='no-speech'){
      setStatus(
        'Ses duyamadım. Aynı soruyu tekrar soruyorum.',
        'err'
      );

      setTimeout(askGuidedQuestion,1000);
      return;
    }

    if(code==='not-allowed'){
      guidedActive=false;

      $('startBtn').classList.remove('listening');
      $('startBtn').textContent='🎙️ Konuşmaya Başla';

      setStatus('Mikrofon izni verilmedi.','err');
      return;
    }

    setStatus('Ses algılama hatası: '+code,'err');
  };

  recognition.onend=()=>{
    listening=false;
    answer=normalizeSpaces(answer);

    if(!guidedActive)return;

    if(!answer){
      setTimeout(askGuidedQuestion,700);
      return;
    }

    processGuidedAnswer(answer);
  };

  try{
    recognition.start();
  }catch(e){
    setStatus(
      'Mikrofon başlatılamadı: '+e.message,
      'err'
    );
  }
}

function processGuidedAnswer(answer){
  const step=guidedSteps[guidedIndex];

  const check=validateGuidedAnswer(step.key,answer);

  if(!check.ok){
    setStatus(check.message,'err');

    speakTurkish(check.message,()=>{
      setTimeout(askGuidedQuestion,400);
    });

    return;
  }

  appendConversation(step.question,answer);

  if(step.key==='team'){
    $('team').value=formatTeamAnswer(answer);
  }

  else if(step.key==='location'){
    $('location').value=formatKmAnswer(answer);
  }

  else if(step.key==='work'){
    $('work').value=formatWorkAnswer(answer);
  }

  else if(step.key==='diameter'){
    const m=String(answer).match(/\d{2,4}/);

    if(m){
      const diameter=m[0];

      let currentWork=$('work').value.trim();

      currentWork=
        currentWork.replace(/^Ø\d+\s*/,'').trim();

      $('work').value=
        'Ø'+diameter+(currentWork?' '+currentWork:'');
    }
  }

  else if(step.key==='supervisor'){
    const person=formatPersonAnswer(answer);

    $('supervisor').value=person;

    addCommaValue('people',person);
  }

  else if(step.key==='personnel'){
    const folded=trFold(answer);

    if(!isNoValue(folded)){
      const person=formatPersonAnswer(answer);
      addCommaValue('people',person);
    }
  }

  else if(step.key==='personnelMore'){
    const folded=trFold(answer);

    if(isYes(folded)){
      guidedIndex=findStepIndex('personnel');

      setTimeout(askGuidedQuestion,450);
      return;
    }

    if(isNo(folded)){
      guidedIndex=findStepIndex('vehicle');

      setTimeout(askGuidedQuestion,450);
      return;
    }
  }

  else if(step.key==='vehicle'){
    const folded=trFold(answer);

    if(!isNoValue(folded)){
      addCommaValue(
        'vehicles',
        formatVehicleAnswer(answer)
      );
    }
  }

  else if(step.key==='vehicleMore'){
    const folded=trFold(answer);

    if(isYes(folded)){
      guidedIndex=findStepIndex('vehicle');

      setTimeout(askGuidedQuestion,450);
      return;
    }

    if(isNo(folded)){
      guidedIndex=findStepIndex('target');

      setTimeout(askGuidedQuestion,450);
      return;
    }
  }

  else if(step.key==='target'){
    const target=formatTargetAnswer(answer);

    $('targetQty').value=target.qty;
    $('targetUnit').value=target.unit;
  }

  else if(step.key==='confirm'){
    const folded=trFold(answer);

    if(isYes(folded)){
      $('confidence').textContent='Onaylandı';

      setStatus('Bilgiler onaylandı.','ok');

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

    if(isNo(folded)){
      setStatus(
        'Tamam. Bilgileri yeniden alıyorum.',
        'err'
      );

      speakTurkish(
        'Tamam. Baştan tekrar başlayalım.',
        ()=>{
          guidedIndex=0;

          $('transcript').value='';

          [
            'team','supervisor','location','work',
            'targetQty','people','vehicles','note'
          ].forEach(id=>$(id).value='');

          $('targetUnit').value='';

          setTimeout(askGuidedQuestion,400);
        }
      );

      return;
    }
  }

  guidedIndex++;

  setTimeout(askGuidedQuestion,450);
}

function findStepIndex(key){
  const i=guidedSteps.findIndex(x=>x.key===key);
  return i>=0?i:0;
}

function isYes(folded){
  return (
    folded.includes('EVET') ||
    folded.includes('DOGRU') ||
    folded.includes('TAMAM') ||
    folded.includes('VAR')
  );
}

function isNo(folded){
  return (
    folded.includes('HAYIR') ||
    folded.includes('YANLIS') ||
    folded==='YOK' ||
    folded.includes('YOK')
  );
}

function isNoValue(folded){
  return (
    folded==='YOK' ||
    folded==='YOKTUR' ||
    folded.includes('PERSONEL YOK') ||
    folded.includes('ARAC YOK') ||
    folded.includes('MAKINE YOK')
  );
}

function addCommaValue(id,value){
  value=normalizeSpaces(value);

  if(!value)return;

  const arr=$(id).value
    .split(',')
    .map(x=>x.trim())
    .filter(Boolean);

  const folded=trFold(value);

  const exists=
    arr.some(x=>trFold(x)===folded);

  if(!exists){
    arr.push(value);
  }

  $(id).value=arr.join(', ');
}

function formatVehicleAnswer(answer){
  return normalizeSpaces(answer)
    .replace(/[.,;:]+$/,'');
}

function validateGuidedAnswer(key,answer){
  const raw=normalizeSpaces(answer);
  const folded=trFold(raw);

  if(key==='team'){
    const m=folded.match(/\bEKIP\s*(\d{1,2})\b/);

    if(!m){
      return {
        ok:false,
        message:'Ekip numarasını anlayamadım. Örneğin Ekip 3 deyin.'
      };
    }

    const n=Number(m[1]);

    if(n<1||n>12){
      return {
        ok:false,
        message:'Ekip numarası 1 ile 12 arasında olmalı.'
      };
    }
  }

  if(key==='supervisor'){
    const words=raw.split(/\s+/).filter(Boolean);

    if(words.length<2||words.length>4||/\d/.test(raw)){
      return {
        ok:false,
        message:'Sorumlu adını anlayamadım. Sadece ad ve soyadı söyleyin.'
      };
    }
  }

  if(key==='diameter'){
    const m=raw.match(/\d{2,4}/);

    if(!m){
      return {
        ok:false,
        message:'Boru çapını anlayamadım. Örneğin 1000 deyin.'
      };
    }

    const n=Number(m[0]);

    if(n<100||n>3000){
      return {
        ok:false,
        message:'Boru çapını anlayamadım. Çapı tekrar söyleyin.'
      };
    }
  }

  if(key==='personnel'){
    if(isNoValue(folded)){
      return {ok:true,message:''};
    }

    const words=raw.split(/\s+/).filter(Boolean);

    if(
      words.length<2 ||
      words.length>4 ||
      /\d/.test(raw)
    ){
      return {
        ok:false,
        message:'Personel adını anlayamadım. Sadece ad ve soyadı söyleyin. Personel yoksa yok deyin.'
      };
    }
  }

  if(key==='personnelMore'){
    if(!isYes(folded)&&!isNo(folded)){
      return {
        ok:false,
        message:'Başka personel varsa evet, yoksa hayır deyin.'
      };
    }
  }

  if(key==='vehicle'){
    if(isNoValue(folded)){
      return {ok:true,message:''};
    }

    if(raw.length<2||raw.length>60){
      return {
        ok:false,
        message:'Araç veya makineyi anlayamadım. Örneğin kamyon 3 veya JCB 2 deyin.'
      };
    }
  }

  if(key==='vehicleMore'){
    if(!isYes(folded)&&!isNo(folded)){
      return {
        ok:false,
        message:'Başka araç veya makine varsa evet, yoksa hayır deyin.'
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
    if(!isYes(folded)&&!isNo(folded)){
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

function appendConversation(question,answer){
  const old=$('transcript').value.trim();

  const line=
    'SORU: '+question+
    '\nCEVAP: '+answer;

  $('transcript').value=
    old
      ? old+'\n\n'+line
      : line;
}

function formatTeamAnswer(answer){
  const folded=trFold(answer);

  let m=folded.match(/EKIP\s*(\d{1,2})/);

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
  let s=trFold(answer);

  s=s
    .replace(/KILOMETRE/g,'')
    .replace(/\bKM\b/g,'')
    .replace(/ARTI/g,'+')
    .replace(/\s+/g,' ')
    .trim();

  let m=s.match(/(\d{1,4})\s*\+\s*(\d{1,3})/);

  if(m){
    return (
      'KM '+
      Number(m[1])+
      '+'+
      String(m[2]).
