const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw0Fcp5E_80wNB9ApYZdbKKDJAPox0hEWs9n2uKVaDVWgjoU7gYA3F1nkwz5dcZiqz5Iw/exec';

const nationalities = ['سعودي','إماراتي','كويتي','قطري','بحريني','عماني','يمني','مصري','سوداني','ليبي','تونسي','جزائري','مغربي','موريتاني','فلسطيني','أردني','لبناني','سوري','عراقي','إيراني','تركي','هندي','باكستاني','بنغلاديشي','نيبالي','سريلانكي','فلبيني','إندونيسي','ماليزي','تايلندي','تايلاندي','صيني','ياباني','كوري','أفغاني','إثيوبي','إريتري','صومالي','نيجيري','جنوب أفريقي','أمريكي','بريطاني','فرنسي','ألماني','إيطالي','إسباني','روسي','كندي','أسترالي'];

document.addEventListener('DOMContentLoaded', () => {
  initHome();
  const dl = document.getElementById('nationalities');
  if (dl) dl.innerHTML = nationalities.map(n => `<option value="${n}">`).join('');
  const form = document.getElementById('jobForm');
  if (!form) return;
  const role = new URLSearchParams(location.search).get('role') || localStorage.getItem('selectedJobRole') || '';
  const roleInput = document.getElementById('jobRole');
  if (roleInput) roleInput.value = role;
  initBirthDatePicker();
  enhanceFileInputs();
  document.getElementById('idNumber')?.addEventListener('input', handleIdChange);
  document.getElementById('idFile')?.addEventListener('change', tryExtractIdData);
  document.querySelectorAll('input[name="vaccination"], input[name="permitType"], input[name="ajeer"], input[name="paymentMethod"]').forEach(r => r.addEventListener('change', toggle));
  document.getElementById('category')?.addEventListener('change', toggle);
  ['birthGregorian','hijriDay','hijriMonth','hijriYear'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { updateBirthDate(); updateAge(); }));
  toggle(); handleIdChange(); updateAge();
  form.addEventListener('submit', submitForm);
});

function initHome() {
  const roleStep = document.getElementById('roleStep');
  const companyStep = document.getElementById('companyStep');
  if (!roleStep || !companyStep) return;
  document.querySelectorAll('.role-card').forEach(btn => btn.addEventListener('click', () => {
    const role = btn.dataset.role;
    localStorage.setItem('selectedJobRole', role);
    document.getElementById('chosenRole').textContent = 'الوظيفة المختارة: ' + role;
    const limited = role === 'خدمة عملاء' || role === 'موظف خدمات';
    document.querySelectorAll('.company-card').forEach(card => card.classList.toggle('hidden', limited && card.classList.contains('clean-only')));
    roleStep.classList.add('hidden'); companyStep.classList.remove('hidden');
  }));
  document.getElementById('backToRoles')?.addEventListener('click', () => { companyStep.classList.add('hidden'); roleStep.classList.remove('hidden'); });
  document.querySelectorAll('.company-card').forEach(a => a.addEventListener('click', () => {
    const role = localStorage.getItem('selectedJobRole') || '';
    if (role) a.href = a.getAttribute('href').split('?')[0] + '?role=' + encodeURIComponent(role);
  }));
}

function enhanceFileInputs() {
  document.querySelectorAll('input[type="file"]').forEach(input => {
    if (input.dataset.enhanced) return;
    input.dataset.enhanced = '1'; input.classList.add('native-file');
    const accept = input.getAttribute('accept') || '';
    let acceptText = accept.includes('image') && !accept.includes('pdf') ? 'صورة فقط' : (accept.includes('pdf') && !accept.includes('image') ? 'PDF فقط' : 'JPG, PNG, PDF');
    if (input.name === 'personalPhoto') acceptText = 'صورة 4×3';
    const card = document.createElement('div'); card.className = 'upload-card'; card.tabIndex = 0;
    card.innerHTML = `<div class="upload-icon">☁</div><div class="upload-title">اختر ملف أو اسحب هنا</div><div class="upload-sub">(${acceptText})</div>`;
    input.insertAdjacentElement('afterend', card);
    const open = () => input.click(); card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }});
    ['dragenter','dragover'].forEach(ev => card.addEventListener(ev, e => { e.preventDefault(); card.classList.add('drag'); }));
    ['dragleave','drop'].forEach(ev => card.addEventListener(ev, e => { e.preventDefault(); card.classList.remove('drag'); }));
    card.addEventListener('drop', e => { if (e.dataTransfer.files.length) { input.files = e.dataTransfer.files; input.dispatchEvent(new Event('change', {bubbles:true})); }});
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []); card.classList.toggle('has-file', files.length > 0);
      card.querySelector('.upload-title').textContent = files.length ? (files.length === 1 ? files[0].name : `${files.length} ملفات مختارة`) : 'اختر ملف أو اسحب هنا';
      card.querySelector('.upload-sub').textContent = files.length ? `${Math.ceil(files.reduce((s,f)=>s+f.size,0)/1024)} KB` : `(${acceptText})`;
    });
  });
}

function initBirthDatePicker() {
  const hDay = document.getElementById('hijriDay'), hYear = document.getElementById('hijriYear');
  for (let d=1; d<=30; d++) hDay?.insertAdjacentHTML('beforeend', `<option value="${String(d).padStart(2,'0')}">${d}</option>`);
  for (let y=1450; y>=1320; y--) hYear?.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
  document.querySelectorAll('[data-date-mode]').forEach(btn => btn.addEventListener('click', () => setDateMode(btn.dataset.dateMode, false)));
}

function setDateMode(mode, lockById = false) {
  const hijri = mode === 'hijri';
  document.querySelectorAll('[data-date-mode]').forEach(b => { b.classList.toggle('active', b.dataset.dateMode === mode); b.disabled = !!lockById; });
  document.getElementById('dateType').value = hijri ? 'هجري' : 'ميلادي';
  document.getElementById('gregorianPanel').classList.toggle('hidden-panel', hijri);
  document.getElementById('hijriPanel').classList.toggle('hidden-panel', !hijri);
  updateBirthDate(); updateAge();
}

function handleIdChange() {
  const id = document.getElementById('idNumber')?.value || '';
  if (id.startsWith('10')) setDateMode('hijri', true);
  else if (id.startsWith('2')) setDateMode('gregorian', true);
  else document.querySelectorAll('[data-date-mode]').forEach(b => b.disabled = false);
}

function updateBirthDate() {
  const mode = document.getElementById('dateType')?.value || 'ميلادي';
  const birth = document.getElementById('birthDate'); if (!birth) return;
  if (mode === 'هجري') {
    const d = document.getElementById('hijriDay')?.value, m = document.getElementById('hijriMonth')?.value, y = document.getElementById('hijriYear')?.value;
    birth.value = (d && m && y) ? `${y}/${m}/${d} هـ` : '';
  } else birth.value = document.getElementById('birthGregorian')?.value || '';
}

function hijriToApproxGregorian(y, m, d) {
  const jd = Math.floor((11*y + 3)/30) + 354*y + 30*m - Math.floor((m-1)/2) + d + 1948440 - 385;
  let l = jd + 68569, n = Math.floor(4*l/146097); l = l - Math.floor((146097*n + 3)/4);
  let i = Math.floor(4000*(l+1)/1461001); l = l - Math.floor(1461*i/4) + 31;
  let j = Math.floor(80*l/2447); const day = l - Math.floor(2447*j/80); l = Math.floor(j/11);
  const month = j + 2 - 12*l; const year = 100*(n-49) + i + l;
  return new Date(year, month - 1, day);
}

function updateAge() {
  const ageInput = document.getElementById('age'); if (!ageInput) return;
  let date = null;
  if (document.getElementById('dateType')?.value === 'هجري') {
    const d = +document.getElementById('hijriDay')?.value, m = +document.getElementById('hijriMonth')?.value, y = +document.getElementById('hijriYear')?.value;
    if (d && m && y) date = hijriToApproxGregorian(y,m,d);
  } else {
    const g = document.getElementById('birthGregorian')?.value; if (g) date = new Date(g + 'T00:00:00');
  }
  if (!date || isNaN(date)) { ageInput.value = ''; return; }
  const today = new Date(); let age = today.getFullYear() - date.getFullYear();
  const beforeBirthday = today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
  if (beforeBirthday) age--;
  ageInput.value = age;
}

function box(boxId, inputId, show) {
  const b = document.getElementById(boxId), i = document.getElementById(inputId); if (!b || !i) return;
  b.classList.toggle('show', show); i.required = show; if (!show) i.value = '';
}
function toggle() {
  const vaccYes = [...document.querySelectorAll('input[name="vaccination"]')].some(r => r.checked && r.value === 'نعم');
  box('vaccinationFileBox','vaccinationFile',vaccYes);
  const permit = document.querySelector('input[name="permitType"]:checked')?.value || '';
  const hasPermit = permit && permit !== 'لا يوجد';
  box('permitNumberBox','permitNumber',hasPermit);
  const pf = document.getElementById('permitFileBox'); if (pf) pf.classList.toggle('show', hasPermit);
  const category = document.getElementById('category')?.value; box('workPermitFileBox','workPermitFile', category === 'لديك تصريح عمل');
  const ajeer = [...document.querySelectorAll('input[name="ajeer"]')].some(r => r.checked && r.value === 'نعم'); box('ajeerFileBox','ajeerFile',ajeer);
  const bank = [...document.querySelectorAll('input[name="paymentMethod"]')].some(r => r.checked && r.value === 'تحويل بنكي');
  document.getElementById('bankFields')?.classList.toggle('show', bank); const ibanCert = document.getElementById('ibanCertificate'); if (ibanCert) { ibanCert.required = bank; if (!bank) ibanCert.value = ''; }
}

function normalizeDigits(text) {
  return String(text || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

function setOcrBadge(fieldId, show) {
  const input = document.getElementById(fieldId); if (!input) return;
  const label = input.closest('.field')?.querySelector('label'); if (!label) return;
  let badge = label.querySelector('.auto-badge');
  if (!badge) { badge = document.createElement('span'); badge.className = 'auto-badge hidden'; badge.textContent = 'تلقائي ✓'; label.appendChild(badge); }
  badge.classList.toggle('hidden', !show);
}

function setOcrStatus(msg, state='work') {
  const status = document.getElementById('ocrStatus'); if (!status) return;
  status.textContent = msg;
  status.classList.remove('ocr-status-ok','ocr-status-err','ocr-status-work');
  status.classList.add(state === 'ok' ? 'ocr-status-ok' : state === 'err' ? 'ocr-status-err' : 'ocr-status-work');
}

function clearAutoBadges() { setOcrBadge('idNumber', false); setOcrBadge('birthGregorian', false); }

function parseIdData(text) {
  const normalized = normalizeDigits(text).replace(/\s+/g, ' ');
  const id = (normalized.match(/\b(?:10\d{8}|2\d{9})\b/) || [])[0] || '';
  const dates = [...normalized.matchAll(/(13\d{2}|14\d{2}|19\d{2}|20\d{2})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})/g)]
    .map(m => ({ y:m[1], m:String(m[2]).padStart(2,'0'), d:String(m[3]).padStart(2,'0'), raw:m[0], index:m.index || 0 }));
  let hijri = dates.find(x => x.y.startsWith('13') || x.y.startsWith('14'));
  let gregorian = dates.find(x => x.y.startsWith('19') || x.y.startsWith('20'));
  // في بعض وثائق توكلنا يظهر التاريخ الميلادي بصيغة 02/05/1992
  const dmyDates = [...normalized.matchAll(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](19\d{2}|20\d{2})\b/g)]
    .map(m => ({ y:m[3], m:String(m[2]).padStart(2,'0'), d:String(m[1]).padStart(2,'0'), raw:m[0], index:m.index || 0 }));
  if (!gregorian && dmyDates.length) gregorian = dmyDates[0];
  return { id, hijri, gregorian, text: normalized };
}

function applyExtractedIdData(data) {
  let filledId = false, filledDate = false;
  if (data.id) {
    document.getElementById('idNumber').value = data.id;
    setOcrBadge('idNumber', true); filledId = true;
    handleIdChange();
  }
  const preferHijri = data.id?.startsWith('10') || (!data.id && data.hijri);
  if (preferHijri && data.hijri) {
    setDateMode('hijri', !!data.id);
    document.getElementById('hijriYear').value = data.hijri.y;
    document.getElementById('hijriMonth').value = data.hijri.m;
    document.getElementById('hijriDay').value = data.hijri.d;
    setOcrBadge('birthGregorian', true); filledDate = true;
  } else if (data.gregorian) {
    setDateMode('gregorian', !!data.id);
    document.getElementById('birthGregorian').value = `${data.gregorian.y}-${data.gregorian.m}-${data.gregorian.d}`;
    setOcrBadge('birthGregorian', true); filledDate = true;
  } else if (data.hijri) {
    setDateMode('hijri', !!data.id);
    document.getElementById('hijriYear').value = data.hijri.y;
    document.getElementById('hijriMonth').value = data.hijri.m;
    document.getElementById('hijriDay').value = data.hijri.d;
    setOcrBadge('birthGregorian', true); filledDate = true;
  }
  updateBirthDate(); updateAge();
  return { filledId, filledDate };
}

async function extractTextFromPdf(file) {
  if (!window.pdfjsLib) throw new Error('PDF.js غير متاح');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  for (let pageNo = 1; pageNo <= Math.min(pdf.numPages, 2); pageNo++) {
    const page = await pdf.getPage(pageNo);
    const tc = await page.getTextContent();
    text += '\n' + tc.items.map(i => i.str).join(' ');
  }
  return text;
}

async function ocrPdfFirstPage(file) {
  if (!window.pdfjsLib || !window.Tesseract) return '';
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.2 });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = viewport.width; canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
  const { data:{ text } } = await Tesseract.recognize(canvas, 'ara+eng');
  return text;
}

async function tryExtractIdData() {
  const input = document.getElementById('idFile');
  const file = input?.files?.[0];
  clearAutoBadges();
  if (!file) return;
  try {
    setOcrStatus('جاري استخراج رقم الهوية وتاريخ الميلاد من الملف...', 'work');
    let text = '';
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      text = await extractTextFromPdf(file);
      let parsed = parseIdData(text);
      if (!parsed.id || (!parsed.hijri && !parsed.gregorian)) {
        setOcrStatus('جاري قراءة صورة PDF لاستخراج البيانات...', 'work');
        text += '\n' + await ocrPdfFirstPage(file);
      }
    } else if (file.type.startsWith('image/')) {
      if (!window.Tesseract) throw new Error('تعذر تحميل أداة الاستخراج');
      const { data:{ text: imageText } } = await Tesseract.recognize(file, 'ara+eng');
      text = imageText;
    } else {
      throw new Error('نوع الملف غير مدعوم للاستخراج');
    }
    const parsed = parseIdData(text);
    const result = applyExtractedIdData(parsed);
    if (result.filledId && result.filledDate) setOcrStatus('تم استخراج رقم الهوية وتاريخ الميلاد تلقائيًا، يرجى المراجعة قبل الإرسال.', 'ok');
    else if (result.filledId || result.filledDate) setOcrStatus('تم استخراج بعض البيانات تلقائيًا، أكمل الحقول الناقصة يدويًا.', 'ok');
    else {
      clearAutoBadges();
      document.querySelectorAll('[data-date-mode]').forEach(b => b.disabled = false);
      setOcrStatus('لم يتمكن النظام من الاستخراج، يرجى إدخال رقم الهوية وتاريخ الميلاد يدويًا.', 'err');
    }
  } catch(e) {
    clearAutoBadges();
    document.querySelectorAll('[data-date-mode]').forEach(b => b.disabled = false);
    setOcrStatus('لم يتمكن النظام من الاستخراج، يرجى إدخال رقم الهوية وتاريخ الميلاد يدويًا.', 'err');
  }
}

async function fileToObj(input) { const f = input?.files?.[0]; return f ? convertFile(f) : null; }
async function filesToObjs(input) { const files = Array.from(input?.files || []); const out = []; for (const f of files) out.push(await convertFile(f)); return out; }
function convertFile(f) {
  const maxSizeMB = 8; if (f.size > maxSizeMB * 1024 * 1024) throw new Error(`حجم الملف ${f.name} أكبر من ${maxSizeMB} ميجا`);
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name:f.name, type:f.type || 'application/octet-stream', data:String(reader.result).split(',')[1] }); reader.onerror = reject; reader.readAsDataURL(f); });
}

async function submitForm(e) {
  e.preventDefault(); updateBirthDate(); updateAge();
  const form = e.target, status = document.getElementById('status'), btn = document.getElementById('submitBtn');
  const age = Number(document.getElementById('age')?.value || 0);
  if (!document.getElementById('birthDate')?.value) { status.textContent='يرجى تحديد تاريخ الميلاد.'; status.className='status err'; return; }
  if (!age || age < 18) { status.textContent='لا يمكن قبول عمر أقل من 18 سنة.'; status.className='status err'; return; }
  btn.disabled = true; status.textContent='جاري الإرسال...'; status.className='status';
  try {
    const fd = new FormData(form), payload = {};
    for (const [k,v] of fd.entries()) { if (v instanceof File) continue; if (payload[k]) payload[k] += '، ' + v; else payload[k]=v; }
    payload.idFile = await fileToObj(form.elements.idFile);
    payload.personalPhoto = await fileToObj(form.elements.personalPhoto);
    payload.vaccinationFile = await fileToObj(form.elements.vaccinationFile);
    payload.permitFiles = await filesToObjs(form.elements.permitFiles);
    payload.workPermitFile = await fileToObj(form.elements.workPermitFile);
    payload.ajeerFile = await fileToObj(form.elements.ajeerFile);
    payload.contractImage = await fileToObj(form.elements.contractImage);
    payload.ibanCertificate = await fileToObj(form.elements.ibanCertificate);
    const res = await fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify(payload)});
    const json = await res.json(); if (!json.ok) throw new Error(json.message || 'تعذر الإرسال');
    status.textContent='تم إرسال الملف بنجاح'; status.className='status ok';
    form.reset(); document.querySelectorAll('.upload-card').forEach(card=>{card.classList.remove('has-file');card.querySelector('.upload-title').textContent='اختر ملف أو اسحب هنا';}); toggle(); handleIdChange(); updateAge();
  } catch(err) { status.textContent='حدث خطأ: '+err.message; status.className='status err'; }
  finally { btn.disabled=false; }
}
