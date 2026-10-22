document.addEventListener('DOMContentLoaded', () => {
    // تفعيل جلب أسعار السوق والمؤشرات تلقائياً
    fetchGlobalMarketPrices();
    setInterval(fetchGlobalMarketPrices, 21600000); // تحديث كل 6 ساعات؛ الأسعار الرسمية دورية وليست لحظية

    if (document.getElementById('admin-members-table')) { loadAdminData(); loadAdminActivities(); loadAdminTrainings(); loadAdminNews(); loadAdminLocalPrices(); loadAdminMemberComms(); }
    if (document.getElementById('public-activities-grid')) loadPublicActivities();
    if (document.getElementById('public-trainings-grid')) loadPublicTrainings();
    if (document.getElementById('member-trainings-grid')) loadMemberTrainings();
    if (document.getElementById('training-material-content')) loadTrainingMaterialPage();
    if (document.getElementById('public-news-grid')) loadPublicNews();
    if (document.getElementById('user-dashboard-info')) { loadUserDashboard(); loadMemberMessages(); loadMemberAnnouncements(); }
});

// دالة جلب أسعار السوق ومؤشرات البورصات الدولية والأسعار المحلية المسجلة يدوياً من الإدارة
function formatApiDate(value) {
    if (!value) return '—';
    const m = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[1]}/${m[2]}/${m[3]}`;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('ar-MA');
}

async function fetchOfficialOliveOilPrices() {
    // API بيانات المفوضية الأوروبية الرسمية؛ أسعار ممثلة مُبلّغ عنها، وليست أسعار تجزئة أو عقوداً فورية.
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    start.setDate(start.getDate() - 6); // يشمل الأسابيع التي تتقاطع مع بداية الشهر.
    const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    const url = `https://api.tech.ec.europa.eu/agrifood/api/oliveOil/prices?beginDate=${encodeURIComponent(fmt(start))}&endDate=${encodeURIComponent(fmt(now))}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`EU API HTTP ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.results) ? payload.results : []);
    if (!rows.length) throw new Error('لم تُرجع واجهة المفوضية بيانات أسعار قابلة للعرض');
    const wanted = ['Spain','Italy','Greece','Portugal','إسبانيا','إيطاليا','اليونان','البرتغال'];
    const dateValue = r => r.endDate || r.referencePeriod || r.beginDate || '';
    const parseDate = v => { const m=String(v||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(+m[3],+m[2]-1,+m[1]).getTime() : (Date.parse(v)||0); };
    const usable = rows.filter(r => {
        const country = String(r.memberStateName || r.countryName || r.marketName || '');
        const price = r.price ?? r.priceValue ?? r.value;
        return price !== undefined && price !== null && String(price).trim() !== '' && wanted.some(w => country.toLowerCase().includes(w.toLowerCase()));
    }).sort((a,b) => parseDate(dateValue(b))-parseDate(dateValue(a)));
    if (!usable.length) throw new Error('استجابة المفوضية لا تتضمن سجلات أسعار معروفة للعرض');
    const seen = new Set();
    return usable.filter(r => {
        const country=String(r.memberStateName||r.countryName||r.marketName||'');
        const product=String(r.productName||r.category||r.productType||'');
        const key=[country,product,String(dateValue(r)),String(r.price??r.priceValue??r.value)].join('|');
        if(seen.has(key)) return false; seen.add(key); return true;
    }).slice(0,6).map(r => {
        const country = r.memberStateName || r.countryName || r.marketName || 'سوق أوروبي';
        const product = r.productName || r.category || r.productType || 'زيت الزيتون';
        const price = r.price ?? r.priceValue ?? r.value;
        const unit = r.unit ? ` ${r.unit}` : '';
        return `<span>🇪🇺 ${escapeHTML(country)} — ${escapeHTML(product)}: <strong>${escapeHTML(price)}${escapeHTML(unit)}</strong> <small>(الفترة: ${escapeHTML(formatApiDate(dateValue(r)))})</small></span>`;
    });
}

async function fetchGlobalMarketPrices() {
    const tickerContainer = document.getElementById('live-market-ticker');
    if (!tickerContainer) return;
    const officialUrl = 'https://agridata.ec.europa.eu/extensions/DataPortal/olive-oil.html';
    const items = [];
    try {
        const officialItems = await fetchOfficialOliveOilPrices();
        items.push(...officialItems);
        items.push(`<a href="${officialUrl}" target="_blank" rel="noopener noreferrer">المصدر الرسمي: المفوضية الأوروبية — بيانات أسعار زيت الزيتون</a>`);
    } catch (err) {
        console.warn('تعذر جلب أسعار الزيت من API المفوضية الأوروبية:', err);
        items.push(`<a href="${officialUrl}" target="_blank" rel="noopener noreferrer">🌍 أسعار زيت الزيتون الدولية: افتح بيانات المفوضية الأوروبية الرسمية (تعذر جلب الأرقام آلياً حالياً)</a>`);
    }
    items.push('<a href="https://www.internationaloliveoil.org/" target="_blank" rel="noopener noreferrer">المجلس الدولي للزيتون — الإحصاءات والتقارير</a>');
    try {
        const { data: localPrices, error } = await supabaseClient.from('market_prices').select('id,price_text').order('id', { ascending: false }).limit(20);
        if (error) console.warn('تعذر تحميل الأسعار المحلية:', error.message);
        if (localPrices?.length) localPrices.forEach(item => items.push(`<span>🇲🇦 سعر محلي مدخل يدوياً من الإدارة: ${escapeHTML(item.price_text || '')} — ليس سعراً دولياً مباشراً</span>`));
        else items.push('<span>🇲🇦 لا توجد أسعار محلية مسجلة حالياً من الإدارة.</span>');
    } catch (err) {
        console.warn('تعذر تحديث الأسعار المحلية:', err);
        items.push('<span>تعذر تحميل الأسعار المحلية حالياً.</span>');
    }
    items.push('<small>ملاحظة: بيانات المفوضية أسعار سوق مُبلّغ عنها وتُحدّث دورياً، وليست أسعاراً لحظية أو أسعار بيع بالتجزئة في المغرب.</small>');
    const track = items.join(' <b class="ticker-separator" aria-hidden="true">✦</b> ');
    tickerContainer.innerHTML = `<div class="ticker-track"><div class="ticker-group">${track}</div><div class="ticker-group" aria-hidden="true">${track}</div></div>`;
}


// 1. تسجيل دخول المشرف (الإدارة)
async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-user').value.trim();
    const password = document.getElementById('admin-pass').value;
    const button = e.currentTarget.querySelector('button[type="submit"]');
    if (button) { button.disabled = true; button.textContent = 'جارٍ التحقق من بيانات الدخول…'; }
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user?.app_metadata?.role !== 'admin') {
            await supabaseClient.auth.signOut();
            throw new Error('الحساب صحيح لكنه غير مخوّل كمسؤول. يجب تعيين app_metadata.role = admin لهذا المستخدم في Supabase.');
        }
        sessionStorage.setItem('isAdmin', 'true');
        window.location.href = 'admin-dashboard.html';
    } catch (err) {
        alert('تعذر تسجيل الدخول: ' + (err.message || 'تحقق من البريد الإلكتروني وكلمة المرور وصلاحية المشرف.'));
    } finally {
        if (button) { button.disabled = false; button.innerHTML = 'تسجيل الدخول الآمن'; }
    }
}

// 2. تسجيل دخول المنخرط
async function handleUserLogin(e) {
    e.preventDefault();
    const u = document.getElementById('user-username').value.trim();
    const p = document.getElementById('user-pass').value.trim();

    const { data: members, error } = await supabaseClient
        .from('members')
        .select('id,name,mill,phone,address,type,license,member_type,annual_fee,status,username')
        .eq('username', u)
        .eq('password', p);

    if (error) {
        alert('خطأ في الاتصال بقاعدة البيانات: ' + error.message);
        return;
    }

    if (members && members.length > 0) {
        const member = members[0];
        sessionStorage.setItem('currentMember', JSON.stringify(member));
        alert('تم تسجيل الدخول بنجاح، مرحباً بك.');
        window.location.href = 'user-dashboard.html';
    } else { 
        alert('اسم المستخدم أو كلمة المرور غير صحيحة!'); 
    }
}

// 3. عرض لوحة تحكم المنخرط المهني
async function loadUserDashboard() {
    let member; try { member = JSON.parse(sessionStorage.getItem('currentMember') || 'null'); } catch (_) {}
    if (!member) { window.location.href = 'register.html'; return; }
    const set = (id, value) => { const el=document.getElementById(id); if(el) el.value=value || ''; };
    set('update-name',member.name); set('update-mill',member.mill); set('update-phone',member.phone);
    const infoBox=document.getElementById('user-dashboard-info');
    if(infoBox) infoBox.innerHTML=`<div class="profile-hero"><div class="profile-avatar"><i class="fa-solid fa-user-tie"></i></div><div><span class="profile-kicker">أهلاً وسهلاً بك</span><h3>${escapeHTML(member.name||'المنخرط المهني')}</h3><p>${escapeHTML(member.mill||'اسم الوحدة غير محدد')}</p></div><span class="member-status-pill ${member.status==='مقبول'?'is-approved':member.status==='مرفوض'?'is-rejected':'is-pending'}">${escapeHTML(member.status||'قيد المعالجة')}</span></div><div class="profile-data-grid"><div><span>الاسم الكامل</span><strong>${escapeHTML(member.name||'—')}</strong></div><div><span>اسم الوحدة / المعصرة</span><strong>${escapeHTML(member.mill||'—')}</strong></div><div><span>رقم الهاتف</span><strong dir="ltr">${escapeHTML(member.phone||'—')}</strong></div><div><span>نوع الوحدة</span><strong>${escapeHTML(member.type||'غير محدد')}</strong></div><div><span>نوع العضوية</span><strong>${escapeHTML(member.member_type||'منخرط')}</strong></div><div><span>واجب الانخراط</span><strong>${escapeHTML(member.annual_fee||'غير محدد')}</strong></div><div><span>العنوان</span><strong>${escapeHTML(member.address||'—')}</strong></div><div><span>الترخيص</span><strong>${escapeHTML(member.license||'غير محدد')}</strong></div></div>`;
}

// 4. طلب انخراط جديد
async function handleMembership(e) {
    e.preventDefault();
    const name = document.getElementById('m-name').value;
    const mill = document.getElementById('m-mill').value;
    const phone = document.getElementById('m-phone').value;
    const address = document.getElementById('m-address').value;
    const type = document.getElementById('m-type').value;
    const license = document.getElementById('m-license').value;
    const username = 'user_' + Math.floor(Math.random() * 9000 + 1000);
    const password = 'pass' + Math.floor(Math.random() * 9000 + 1000);

    const { error } = await supabaseClient.from('members').insert([{ name, mill, phone, address, type, license, member_type: 'جديد', annual_fee: 'غير مؤدى', status: 'قيد المعالجة', username, password }]);
    if (error) alert('خطأ: ' + error.message);
    else { alert('تم إرسال طلب انخراطكم بنجاح.'); e.target.reset(); window.location.href = 'index.html'; }
}

// 5. نشر خبر جديد مع رفع الصورة
async function handleAddNews(e) {
    e.preventDefault();
    const title = document.getElementById('news-title').value;
    const category = document.getElementById('news-category').value;
    const date = document.getElementById('news-date').value;
    const content = document.getElementById('news-content').value;
    const imageUrl = (await uploadFileToSupabase('news-image-file')) || document.getElementById('news-image-url')?.value.trim() || '';
    const documentUrl = document.getElementById('news-document-url')?.value.trim() || '';

    const { error } = await supabaseClient.from('news').insert([{ title, category, date, content, image_url: imageUrl, document_url: documentUrl }]);
    if (error) alert('خطأ: ' + error.message);
    else { alert('تم نشر الخبر بنجاح.'); e.target.reset(); loadAdminNews(); loadPublicNews(); }
}

// 6. عرض الأخبار العامة
async function loadPublicNews() {
    const grid = document.getElementById('public-news-grid');
    if (!grid) return;
    grid.innerHTML = '<p class="loading-state">جارٍ تحميل الأخبار…</p>';
    const { data: newsList, error } = await supabaseClient.from('news').select('*').order('id', { ascending: false });
    if (error) { grid.innerHTML = '<p class="empty-state">تعذر تحميل الأخبار حالياً.</p>'; return; }
    if (!newsList?.length) { grid.innerHTML = '<p class="empty-state">لا توجد أخبار منشورة حالياً.</p>'; return; }
    grid.innerHTML = newsList.map(n => {
        const image = safeHttpUrl(n.image_url), doc = safeHttpUrl(n.document_url);
        return `<article class="public-content-card" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.06);border-top:4px solid #c5a059;">
          ${image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(n.title || 'صورة الخبر')}" loading="lazy" style="width:100%;height:180px;object-fit:cover;">` : ''}
          <div style="padding:20px;"><span style="background:#1b4d3e;color:white;padding:3px 10px;border-radius:15px;font-size:.75rem;">${escapeHTML(n.category || 'خبر')}</span>
          <h4 style="color:#1b4d3e;margin:10px 0 6px;font-size:1.1rem;">${escapeHTML(n.title || 'خبر')}</h4>
          <p style="font-size:.8rem;color:#777;margin-bottom:8px;"><i class="fa-solid fa-clock"></i> ${escapeHTML(n.date || '—')}</p>
          <p style="color:#555;font-size:.9rem;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHTML(n.content || '')}</p>
          ${doc ? `<p style="margin-top:12px;"><a href="${escapeHTML(doc)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-pdf"></i> فتح الوثيقة المرفقة</a></p>` : ''}</div></article>`;
    }).join('');
}

// 7. عرض الأنشطة
async function loadPublicActivities() {
    const grid = document.getElementById('public-activities-grid');
    if (!grid) return;
    grid.innerHTML = '<p class="loading-state">جارٍ تحميل أنشطة الجمعية…</p>';
    const { data: acts, error } = await supabaseClient.from('activities').select('*').order('id', { ascending: false });
    if (error) { grid.innerHTML = '<p class="empty-state">تعذر تحميل الأنشطة حالياً.</p>'; return; }
    if (!acts?.length) { grid.innerHTML = '<p class="empty-state">لا توجد أنشطة منشورة حالياً.</p>'; return; }
    grid.innerHTML = acts.map(a => {
        const image = safeHttpUrl(a.image_url), video = safeHttpUrl(a.video_url);
        return `<article class="public-content-card" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.06);border-top:4px solid #1b4d3e;">
          ${image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(a.title || 'صورة النشاط')}" loading="lazy" style="width:100%;height:180px;object-fit:cover;">` : ''}
          <div style="padding:20px;"><span style="background:#2e7d32;color:white;padding:3px 10px;border-radius:15px;font-size:.75rem;">${escapeHTML(a.type || 'نشاط')}</span>
          <h4 style="color:#1b4d3e;margin:10px 0 6px;font-size:1.1rem;">${escapeHTML(a.title || 'نشاط')}</h4>
          <p style="font-size:.8rem;color:#777;margin-bottom:8px;"><i class="fa-solid fa-calendar"></i> ${escapeHTML(a.date || '—')}</p>
          <p style="color:#555;font-size:.9rem;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHTML(a.description || '')}</p>
          ${video ? `<p><a href="${escapeHTML(video)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-circle-play"></i> مشاهدة الفيديو</a></p>` : ''}</div></article>`;
    }).join('');
}

// 8. عرض التكوينات العامة
async function loadPublicTrainings() {
    const grid = document.getElementById('public-trainings-grid');
    if (!grid) return;
    grid.innerHTML = '<p class="loading-state">جارٍ تحميل التكوينات…</p>';
    const { data: trs, error } = await supabaseClient.from('trainings').select('id,title,trainer,date,description,image_url,target').order('id', { ascending: false });
    if (error) { grid.innerHTML = '<p class="empty-state">تعذر تحميل التكوينات حالياً.</p>'; return; }
    if (!trs?.length) { grid.innerHTML = '<p class="empty-state">لا توجد تكوينات منشورة حالياً.</p>'; return; }
    grid.innerHTML = trs.map(t => {
        const image = safeHttpUrl(t.image_url);
        return `<article class="training-card training-index-card">
          ${image ? `<img class="training-cover" src="${escapeHTML(image)}" alt="${escapeHTML(t.title || 'صورة التكوين')}" loading="lazy">` : '<div class="training-cover-placeholder"><i class="fa-solid fa-graduation-cap"></i></div>'}
          <div class="training-card-body"><span class="training-kicker"><i class="fa-solid fa-lock"></i> مادة مخصصة للمنخرطين</span>
          <h4>${escapeHTML(t.title || 'مادة تكوينية')}</h4>
          <div class="training-meta"><span><i class="fa-solid fa-chalkboard-user"></i> ${escapeHTML(t.trainer || 'غير محدد')}</span><span><i class="fa-solid fa-calendar-days"></i> ${escapeHTML(t.date || 'غير محدد')}</span>${t.target ? `<span><i class="fa-solid fa-users"></i> ${escapeHTML(t.target)}</span>` : ''}</div>
          ${t.description ? `<p class="training-index-description">${escapeHTML(t.description)}</p>` : ''}
          <a class="training-open-link" href="training-material.html?id=${encodeURIComponent(t.id)}"><i class="fa-solid fa-arrow-up-right-from-square"></i> فتح مادة التكوين</a></div></article>`;
    }).join('');
}

// 10. إدارة لوحة المشرف وجلب المنخرطين
async function loadAdminData() {
    const table = document.getElementById('admin-members-table');
    if (!table) return;
    table.innerHTML = '<tr><td colspan="7">جارٍ تحميل طلبات الانخراط والمنخرطين…</td></tr>';
    const { data: members, error } = await supabaseClient.from('members').select('id,name,mill,phone,address,type,license,member_type,annual_fee,status,username').order('id', { ascending: false });
    if (error) { table.innerHTML = `<tr><td colspan="7" style="color:#b42318">تعذر تحميل البيانات: ${escapeHTML(error.message)}. تحقق من صلاحيات SELECT في Supabase.</td></tr>`; return; }
    if (!members || !members.length) { table.innerHTML = '<tr><td colspan="7">لا توجد طلبات أو عضويات مسجلة حالياً.</td></tr>'; return; }
    table.innerHTML = members.map(m => {
        const status = m.status || 'قيد المعالجة';
        const badgeClass = status === 'مقبول' ? 'badge-success' : status === 'مرفوض' ? 'badge-danger' : 'badge-pending';
        const phone = String(m.phone || '').replace(/[^\d+]/g, '');
        const waBtn = status === 'مقبول' && phone ? `<a href="https://wa.me/${encodeURIComponent(phone)}" target="_blank" rel="noopener" class="admin-wa-link"><i class="fa-brands fa-whatsapp"></i> تواصل</a>` : '';
        return `<tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px"><strong>${escapeHTML(m.name || m.full_name || '—')}</strong><br><small>${escapeHTML(m.member_type || '—')}</small></td>
          <td style="padding:10px">${escapeHTML(m.mill || m.mill_name || '—')}</td>
          <td style="padding:10px;direction:ltr">${escapeHTML(m.phone || '—')}</td>
          <td style="padding:10px"><select aria-label="واجب الانخراط" onchange="updateMemberField(${Number(m.id)},'annual_fee',this.value)"><option value="مؤدى" ${m.annual_fee==='مؤدى'?'selected':''}>مؤدى</option><option value="غير مؤدى" ${m.annual_fee!=='مؤدى'?'selected':''}>غير مؤدى</option></select></td>
          <td style="padding:10px"><span class="badge ${badgeClass}">${escapeHTML(status)}</span>${waBtn}</td>
          <td style="padding:10px;min-width:260px"><div class="member-status-actions"><button type="button" class="status-processing" onclick="setMemberStatus(${Number(m.id)},'قيد المعالجة')">قيد المعالجة</button><button type="button" class="status-approve" onclick="setMemberStatus(${Number(m.id)},'مقبول')">قبول</button><button type="button" class="status-reject" onclick="setMemberStatus(${Number(m.id)},'مرفوض')">رفض</button><button type="button" class="admin-small-btn" onclick="editMemberRecord(${Number(m.id)})">تعديل</button></div></td>
          <td style="padding:10px"><button type="button" class="btn-danger" onclick="deleteRecord('members',${Number(m.id)})">حذف</button></td>
        </tr>`;
    }).join('');
}

async function setMemberStatus(id, status) {
    if (!['قيد المعالجة','معالجة','مقبول','مرفوض'].includes(status)) return;
    const { error } = await supabaseClient.from('members').update({ status }).eq('id', id);
    if (error) { alert('تعذر تحديث حالة طلب الانخراط: ' + error.message); return; }
    await loadAdminData();
}

async function editMemberRecord(id) {
 const {data:m,error}=await supabaseClient.from('members').select('id,name,mill,phone,address,type,license,username,status,member_type,annual_fee').eq('id',id).single();
 if(error||!m){alert('تعذر جلب بيانات المنخرط: '+(error?.message||''));return;}
 let modal=document.getElementById('member-edit-modal'); if(modal) modal.remove();
 modal=document.createElement('div'); modal.id='member-edit-modal'; modal.className='admin-modal-backdrop';
 const fields=[['name','الاسم الكامل','text'],['mill','اسم المعصرة','text'],['phone','رقم الهاتف','tel'],['address','العنوان','text'],['type','نوع المعصرة','text'],['license','رقم/حالة الترخيص','text'],['username','اسم المستخدم','text'],['status','حالة الانخراط','text'],['member_type','نوع العضوية','text'],['annual_fee','واجب الانخراط','text']];
 modal.innerHTML=`<section class="admin-edit-modal" role="dialog" aria-modal="true" aria-labelledby="member-edit-title"><header><h3 id="member-edit-title">تعديل بيانات المنخرط</h3><button type="button" class="modal-close" aria-label="إغلاق">×</button></header><form id="member-edit-form"><div class="edit-fields">${fields.filter(([k])=>k in m || ['name','mill','phone','status','annual_fee'].includes(k)).map(([k,label,type])=>`<label>${label}<input name="${k}" type="${type}" value="${escapeHTML(m[k] ?? '')}" /></label>`).join('')}</div><footer><button type="button" class="modal-cancel">إلغاء</button><button type="submit" class="modal-save">حفظ التعديلات</button></footer></form></section>`;
 document.body.appendChild(modal); const close=()=>modal.remove(); modal.querySelector('.modal-close').onclick=close; modal.querySelector('.modal-cancel').onclick=close; modal.addEventListener('click',e=>{if(e.target===modal)close()});
 modal.querySelector('form').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const updates={};for(const [k,v] of fd.entries())updates[k]=String(v).trim();const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;btn.textContent='جارٍ الحفظ…';const {error:saveError}=await supabaseClient.from('members').update(updates).eq('id',id);if(saveError){alert('تعذر حفظ التعديلات: '+saveError.message);btn.disabled=false;btn.textContent='حفظ التعديلات';return;}close();await loadAdminData();alert('تم تحديث بيانات المنخرط بنجاح.');};
}

async function handleAddOldMember(e) {
 e.preventDefault(); const name=document.getElementById('old-name').value.trim(), mill=document.getElementById('old-mill').value.trim(), phone=document.getElementById('old-phone').value.trim(), type=document.getElementById('old-type').value, annual_fee=document.getElementById('old-fee').value;
 if(!name||!mill||!phone){alert('يرجى تعبئة الاسم واسم المعصرة والهاتف.');return;}
 const username='member_'+phone.replace(/\D/g,'').slice(-8); const payload={name,mill,phone,type,annual_fee,status:'مقبول',member_type:'قديم',username};
 const {error}=await supabaseClient.from('members').insert([payload]); if(error){alert('تعذرت إضافة المنخرط القديم: '+error.message);return;} e.target.reset(); await loadAdminData(); alert('تمت إضافة المنخرط القديم وظهر في الجدول.');
}

async function updateMemberField(id, field, val) {
    if (field !== 'annual_fee' || !['مؤدى','غير مؤدى'].includes(val)) return;
    const { error } = await supabaseClient.from('members').update({ annual_fee: val }).eq('id', id);
    if (error) { alert('تعذر تحديث واجب الانخراط: ' + error.message); return; }
    await loadAdminData();
}

async function deleteRecord(table, id) {
    const allowed = ['members', 'market_prices'];
    if (!allowed.includes(table) || !Number.isFinite(Number(id))) { alert('طلب حذف غير صالح.'); return; }
    if (!confirm('هل أنت متأكد من الحذف النهائي؟')) return;
    const { error } = await supabaseClient.from(table).delete().eq('id', Number(id));
    if (error) { alert('تعذر الحذف: ' + error.message); return; }
    if (table === 'members') await loadAdminData();
    if (table === 'market_prices') { await loadAdminLocalPrices(); await fetchGlobalMarketPrices(); }
}
// إضافة سعر محلي جديد من لوحة الإدارة
async function handleAddLocalPrice(e) {
    e.preventDefault();
    const priceText = document.getElementById('local-price-input').value.trim();
    if (!priceText) return;

    const { error } = await supabaseClient.from('market_prices').insert([{ price_text: priceText }]);
    if (error) alert('خطأ: ' + error.message);
    else {
        alert('تم إضافة السعر المحلي بنجاح وتحديث العارضة.');
        e.target.reset();
        loadAdminLocalPrices();
        fetchGlobalMarketPrices();
    }
}
// عرض التكوينات الخاصة بالمنخرطين مع الصورة والفيديو والمحتوى والوثائق
async function loadMemberTrainings() {
    const grid = document.getElementById('member-trainings-grid');
    if (!grid) return;
    let member; try { member = JSON.parse(sessionStorage.getItem('currentMember') || 'null'); } catch (_) {}
    if (!member) { grid.innerHTML = '<p class="empty-state">يرجى تسجيل الدخول لعرض المواد التكوينية.</p>'; setTimeout(() => { location.href = 'register.html'; }, 500); return; }
    grid.innerHTML = '<p class="loading-state">جارٍ تحميل البرامج التكوينية…</p>';
    const { data: trs, error } = await supabaseClient.from('trainings').select('*').order('id', { ascending: false });
    if (error) { grid.innerHTML = '<p class="empty-state">تعذر تحميل التكوينات. تحقق من صلاحيات Supabase.</p>'; return; }
    if (!trs?.length) { grid.innerHTML = '<p class="empty-state">لا توجد تكوينات منشورة حالياً.</p>'; return; }
    grid.innerHTML = trs.map(t => {
        const image = safeHttpUrl(t.image_url), video = safeHttpUrl(t.video_url), doc = safeHttpUrl(t.document_url);
        return `<article class="training-card">
          ${image ? `<img class="training-cover" src="${escapeHTML(image)}" alt="${escapeHTML(t.title || 'صورة التكوين')}" loading="lazy">` : '<div class="training-cover-placeholder"><i class="fa-solid fa-graduation-cap"></i></div>'}
          <div class="training-card-body"><span class="training-kicker"><i class="fa-solid fa-graduation-cap"></i> برنامج تكويني للمنخرطين</span>
          <h4>${escapeHTML(t.title || 'تكوين')}</h4>
          <div class="training-meta"><span><i class="fa-solid fa-chalkboard-user"></i> ${escapeHTML(t.trainer || 'غير محدد')}</span><span><i class="fa-solid fa-calendar-days"></i> ${escapeHTML(t.date || 'غير محدد')}</span>${t.target ? `<span><i class="fa-solid fa-users"></i> ${escapeHTML(t.target)}</span>` : ''}</div>
          <div class="training-description">${escapeHTML(t.description || t.content || 'لم تتم إضافة تفاصيل لهذا التكوين بعد.').replace(/\n/g,'<br>')}</div>
          ${video ? `<div class="training-media"><a href="${escapeHTML(video)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-circle-play"></i> مشاهدة الفيديو</a></div>` : ''}
          ${doc ? `<div class="training-media"><a href="${escapeHTML(doc)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-pdf"></i> فتح الوثيقة المرفقة</a></div>` : ''}
          <a class="training-open-link" href="training-material.html?id=${encodeURIComponent(t.id)}"><i class="fa-solid fa-book-open"></i> فتح صفحة المادة</a></div></article>`;
    }).join('');
}

async function loadTrainingMaterialPage() {
    const box = document.getElementById('training-material-content');
    if (!box) return;
    let member; try { member = JSON.parse(sessionStorage.getItem('currentMember') || 'null'); } catch (_) {}
    if (!member) { box.innerHTML = '<p class="empty-state">هذه المادة مخصصة للمنخرطين. يرجى تسجيل الدخول أولاً.</p>'; location.href = 'register.html'; return; }
    const id = new URLSearchParams(location.search).get('id');
    if (!id || !/^\d+$/.test(id)) { box.innerHTML = '<p class="empty-state">رابط المادة غير صحيح. ارجع إلى قائمة التكوينات.</p>'; return; }
    box.innerHTML = '<p class="loading-state">جارٍ تحميل المادة التكوينية…</p>';
    const { data: t, error } = await supabaseClient.from('trainings').select('*').eq('id', Number(id)).maybeSingle();
    if (error || !t) { box.innerHTML = '<p class="empty-state">تعذر العثور على المادة. تحقق من الرابط أو صلاحيات قاعدة البيانات.</p>'; return; }
    const image=safeHttpUrl(t.image_url), video=safeHttpUrl(t.video_url), doc=safeHttpUrl(t.document_url);
    box.innerHTML = `<article class="training-material-card">${image?`<img class="training-cover" src="${escapeHTML(image)}" alt="${escapeHTML(t.title||'صورة التكوين')}" loading="lazy">`:''}<div class="training-card-body"><h2>${escapeHTML(t.title||'مادة تكوينية')}</h2><div class="training-meta"><span>المؤطر: ${escapeHTML(t.trainer||'غير محدد')}</span><span>التاريخ: ${escapeHTML(t.date||'غير محدد')}</span></div><div class="training-description" style="white-space:pre-wrap">${escapeHTML(t.description||t.content||'لم تتم إضافة تفاصيل لهذه المادة بعد.')}</div>${video?`<p class="training-media"><a href="${escapeHTML(video)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-circle-play"></i> مشاهدة الفيديو أو المادة المرئية</a></p>`:''}${doc?`<p class="training-media"><a href="${escapeHTML(doc)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-pdf"></i> فتح الوثيقة المرفقة</a></p>`:''}</div></article>`;
}

// دالة تحديث بيانات المنخرط من لوحة تحكمه
async function handleUpdateMemberProfile(e) {
    e.preventDefault();
    let member; try { member = JSON.parse(sessionStorage.getItem('currentMember') || 'null'); } catch (_) {}
    if (!member || !member.id) { alert('انتهت الجلسة. يرجى تسجيل الدخول مجدداً.'); location.href='register.html'; return; }

    const name = document.getElementById('update-name').value;
    const mill = document.getElementById('update-mill').value;
    const phone = document.getElementById('update-phone').value;
    const password = document.getElementById('update-pass')?.value || '';
    if (password.trim() !== '') {
        alert('تغيير كلمة المرور غير متاح عبر التخزين القديم. لحماية حسابك، يجب أولاً ترحيل تسجيل دخول المنخرطين إلى Supabase Auth. لم يتم حفظ كلمة المرور الجديدة.');
        return;
    }
    const updateData = { name, mill, phone };

    const { error } = await supabaseClient.from('members').update(updateData).eq('id', member.id);
    if (error) {
        alert('خطأ أثناء التحديث: ' + error.message);
    } else {
        // تحديث الجلسة
        Object.assign(member, {name, mill, phone});
        sessionStorage.setItem('currentMember', JSON.stringify(member));
        await loadUserDashboard();
        const passEl=document.getElementById('update-pass'); if(passEl) passEl.value='';
        alert('تم تحديث بياناتكم بنجاح.');
    }
}
// أدوات مشتركة: حماية النصوص وإدارة الوسائط
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function safeHttpUrl(value) { try { const u = new URL(String(value || '').trim(), window.location.href); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } }
async function uploadFileToSupabase(inputId) {
    const input = document.getElementById(inputId);
    const file = input?.files?.[0];
    if (!file) return '';
    const isVideo = /video/i.test(inputId);
    const allowed = isVideo ? ['video/mp4','video/webm','video/quicktime'] : ['image/jpeg','image/png','image/webp','image/gif','application/pdf'];
    const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!allowed.includes(file.type) || file.size > maxBytes) {
        alert(isVideo ? 'اختر فيديو MP4 أو WebM أو MOV بحجم لا يتجاوز 50 ميغابايت.' : 'اختر صورة أو PDF من الأنواع المدعومة بحجم لا يتجاوز 10 ميغابايت.');
        input.value = '';
        return '';
    }
    // يتطلب إنشاء bucket باسم media مع سياسات رفع مناسبة في Supabase Storage.
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const { data, error } = await supabaseClient.storage.from('media').upload(safeName, file, { upsert: false });
    if (error) { console.error('Storage upload failed:', error); alert('تعذر رفع الملف. تحقق من إعدادات Storage وbucket باسم media، أو استخدم رابطاً مباشراً.'); return ''; }
    return supabaseClient.storage.from('media').getPublicUrl(data.path).data.publicUrl;
}
function mediaUrl(fileId, urlId, uploaded) { return uploaded || document.getElementById(urlId)?.value.trim() || ''; }
async function handleAddActivity(e) {
    e.preventDefault();
    try {
      const uploaded = await uploadFileToSupabase('act-image-file');
      const videoUploaded = await uploadFileToSupabase('act-video-file');
      const row = { title: document.getElementById('act-title').value.trim(), date: document.getElementById('act-date').value, type: document.getElementById('act-type').value, description: document.getElementById('act-desc').value.trim(), image_url: mediaUrl('act-image-file','act-image-url',uploaded), video_url: videoUploaded || document.getElementById('act-video-url').value.trim() };
      const { error } = await supabaseClient.from('activities').insert([row]);
      if (error) throw error;
      alert('تم نشر النشاط بنجاح.'); e.target.reset(); loadAdminActivities(); loadPublicActivities();
    } catch (err) { if (err?.message) console.error(err); if (!err?.handled) alert('تعذر نشر النشاط: ' + (err.message || 'تحقق من الاتصال وإعدادات قاعدة البيانات.')); }
}
async function handleAddTraining(e) {
    e.preventDefault();
    try {
      const uploaded = await uploadFileToSupabase('tr-image-file');
      const videoUploaded = await uploadFileToSupabase('tr-video-file');
      const row = { title: document.getElementById('tr-title').value.trim(), date: document.getElementById('tr-date').value, trainer: document.getElementById('tr-trainer').value.trim(), target: document.getElementById('tr-target').value.trim(), description: document.getElementById('tr-content').value.trim(), image_url: mediaUrl('tr-image-file','tr-image-url',uploaded), video_url: videoUploaded || document.getElementById('tr-video-url').value.trim() };
      const { error } = await supabaseClient.from('trainings').insert([row]);
      if (error) throw error;
      alert('تم نشر التكوين بنجاح.'); e.target.reset(); loadAdminTrainings(); loadPublicTrainings(); loadMemberTrainings();
    } catch (err) { if (err?.message) console.error(err); alert('تعذر نشر التكوين: ' + (err.message || 'تحقق من الاتصال وإعدادات قاعدة البيانات.')); }
}
async function loadAdminActivities() {
 const table=document.getElementById('admin-activities-table'); if(!table)return;
 const {data,error}=await supabaseClient.from('activities').select('*').order('id',{ascending:false});
 if(error){table.innerHTML='<tr><td colspan="5">تعذر تحميل الأنشطة.</td></tr>';return;}
 table.innerHTML=(data||[]).map(a=>`<tr><td>${escapeHTML(a.title)}</td><td>${escapeHTML(a.date)}</td><td>${escapeHTML(a.type)}</td><td>${safeHttpUrl(a.image_url)?'<a target="_blank" rel="noopener noreferrer" href="'+escapeHTML(safeHttpUrl(a.image_url))+'">صورة</a> ':''}${safeHttpUrl(a.video_url)?'<a target="_blank" rel="noopener noreferrer" href="'+escapeHTML(safeHttpUrl(a.video_url))+'">فيديو</a>':''}</td><td><button onclick="editContentRecord('activities',${a.id})">تعديل</button> <button class="btn-danger" onclick="deleteContentRecord('activities',${a.id})">حذف</button></td></tr>`).join('');
}
async function loadAdminTrainings() {
 const table=document.getElementById('admin-trainings-table'); if(!table)return;
 const {data,error}=await supabaseClient.from('trainings').select('*').order('id',{ascending:false});
 if(error){table.innerHTML='<tr><td colspan="5">تعذر تحميل التكوينات.</td></tr>';return;}
 table.innerHTML=(data||[]).map(t=>`<tr><td>${escapeHTML(t.title)}</td><td>${escapeHTML(t.trainer)}</td><td>${escapeHTML(t.date)}</td><td>${safeHttpUrl(t.image_url)?'<a target="_blank" rel="noopener noreferrer" href="'+escapeHTML(safeHttpUrl(t.image_url))+'">صورة</a> ':''}${safeHttpUrl(t.video_url)?'<a target="_blank" rel="noopener noreferrer" href="'+escapeHTML(safeHttpUrl(t.video_url))+'">فيديو</a>':''}</td><td><button onclick="editContentRecord('trainings',${t.id})">تعديل</button> <button class="btn-danger" onclick="deleteContentRecord('trainings',${t.id})">حذف</button></td></tr>`).join('');
}
async function loadAdminNews() {
 const table=document.getElementById('admin-news-table'); if(!table)return;
 const {data,error}=await supabaseClient.from('news').select('*').order('id',{ascending:false});
 if(error){table.innerHTML='<tr><td colspan="5">تعذر تحميل الأخبار.</td></tr>';return;}
 table.innerHTML=(data||[]).map(n=>`<tr><td>${escapeHTML(n.title)}</td><td>${escapeHTML(n.category)}</td><td>${escapeHTML(n.date)}</td><td>${safeHttpUrl(n.image_url)?'<a target="_blank" rel="noopener noreferrer" href="'+escapeHTML(safeHttpUrl(n.image_url))+'">صورة</a> ':''}${safeHttpUrl(n.document_url)?'<a target="_blank" rel="noopener noreferrer" href="'+escapeHTML(safeHttpUrl(n.document_url))+'">وثيقة</a>':''}</td><td><button onclick="editContentRecord('news',${n.id})">تعديل</button> <button class="btn-danger" onclick="deleteContentRecord('news',${n.id})">حذف</button></td></tr>`).join('');
}
async function editContentRecord(table,id) {
 const fields={activities:[['title','العنوان'],['date','التاريخ'],['type','النوع'],['description','التفاصيل'],['image_url','رابط الصورة'],['video_url','رابط الفيديو']],trainings:[['title','العنوان'],['date','التاريخ'],['trainer','المؤطر'],['target','الفئة المستهدفة'],['description','المحتوى'],['image_url','رابط الصورة'],['video_url','رابط الفيديو']],news:[['title','العنوان'],['category','التصنيف'],['date','التاريخ'],['content','مضمون الخبر'],['image_url','رابط الصورة'],['document_url','رابط الوثيقة']]};
 const {data,error}=await supabaseClient.from(table).select('*').eq('id',id).single();if(error||!data){alert('تعذر جلب المنشور للتعديل: '+(error?.message||''));return;}
 const updates={};for(const [key,label] of (fields[table]||[])){if(!(key in data))continue;const value=prompt('تعديل '+label+' (إلغاء يوقف العملية):',data[key]??'');if(value===null)return;updates[key]=value.trim();}
 const {error:saveError}=await supabaseClient.from(table).update(updates).eq('id',id);if(saveError){alert('تعذر حفظ التعديلات: '+saveError.message);return;}alert('تم حفظ التعديلات.');
 if(table==='activities'){await loadAdminActivities();await loadPublicActivities();}if(table==='trainings'){await loadAdminTrainings();await loadPublicTrainings();await loadMemberTrainings();}if(table==='news'){await loadAdminNews();await loadPublicNews();}
}
async function deleteContentRecord(table,id) { if(!confirm('هل تريد حذف هذا المحتوى نهائياً؟'))return; const {error}=await supabaseClient.from(table).delete().eq('id',id); if(error){alert('تعذر الحذف: '+error.message);return;} if(table==='activities'){loadAdminActivities();loadPublicActivities();} if(table==='trainings'){loadAdminTrainings();loadPublicTrainings();loadMemberTrainings();} if(table==='news'){loadAdminNews();loadPublicNews();} }

// تحميل الأسعار المحلية في لوحة المشرف لإدارتها وحذفها
async function loadAdminLocalPrices() {
    const table = document.getElementById('admin-local-prices-table');
    if (!table) return;
    table.innerHTML = '<tr><td colspan="2">جارٍ تحميل الأسعار المحلية…</td></tr>';
    const { data: prices, error } = await supabaseClient.from('market_prices').select('id,price_text').order('id', { ascending: false });
    if (error) { table.innerHTML = `<tr><td colspan="2">تعذر تحميل الأسعار: ${escapeHTML(error.message)}</td></tr>`; return; }
    if (!prices?.length) { table.innerHTML = '<tr><td colspan="2">لا توجد أسعار محلية مدخلة.</td></tr>'; return; }
    table.innerHTML = prices.map(p => `<tr style="border-bottom:1px solid #eee;">
      <td style="padding:10px;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHTML(p.price_text || '')}</td>
      <td style="padding:10px;"><button type="button" class="btn-danger" onclick="deleteRecord('market_prices', ${Number(p.id)})">حذف</button></td>
    </tr>`).join('');
}


// قائمة تنقل موحدة للهاتف والحاسوب: فتح/طي وإغلاق عند اختيار رابط أو الضغط خارجها
function initResponsiveNavigation() {
  document.querySelectorAll('.navbar').forEach(navbar => {
    const toggle = navbar.querySelector('.nav-toggle');
    const links = navbar.querySelector('.nav-links');
    if (!toggle || !links || toggle.dataset.ready === '1') return;
    toggle.dataset.ready = '1';
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = open ? '<i class="fa-solid fa-xmark"></i><span>إغلاق القائمة</span>' : '<i class="fa-solid fa-bars"></i><span>القائمة</span>';
    });
    links.querySelectorAll('li').forEach(item => {
      const trigger = item.querySelector(':scope > a');
      const menu = item.querySelector(':scope > .dropdown-menu');
      if (!trigger || !menu) return;
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', e => {
        // روابط القوائم التي لا تملك href تعمل كمفتاح فتح/طي
        if (!trigger.getAttribute('href') || trigger.getAttribute('href') === '#') {
          e.preventDefault();
          const opening = !item.classList.contains('active');
          links.querySelectorAll('li.active').forEach(other => {
            other.classList.remove('active');
            other.querySelector(':scope > a')?.setAttribute('aria-expanded','false');
          });
          item.classList.toggle('active', opening);
          trigger.setAttribute('aria-expanded', String(opening));
        } else if (window.matchMedia('(max-width: 768px)').matches) {
          links.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded','false');
          toggle.innerHTML = '<i class="fa-solid fa-bars"></i><span>القائمة</span>';
        }
      });
    });
    document.addEventListener('click', e => {
      if (!navbar.contains(e.target)) {
        links.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded','false');
        toggle.innerHTML = '<i class="fa-solid fa-bars"></i><span>القائمة</span>';
        links.querySelectorAll('li.active').forEach(item => item.classList.remove('active'));
      }
    });
  });
}
document.addEventListener('DOMContentLoaded', initResponsiveNavigation);


// مراسلات المنخرط مع الإدارة والإعلانات الموجهة للمنخرطين
async function submitMemberMessage(e) {
  e.preventDefault();
  let member; try { member=JSON.parse(sessionStorage.getItem('currentMember')||'null'); } catch(_) {}
  if(!member){alert('يرجى تسجيل الدخول من جديد.');return;}
  const message=document.getElementById('member-message-body')?.value.trim();
  const topic=document.getElementById('member-message-topic')?.value||'استفسار عام';
  if(!message||message.length<5){alert('يرجى كتابة رسالة واضحة.');return;}
  const btn=e.currentTarget.querySelector('[type=submit]'); if(btn){btn.disabled=true;btn.innerHTML='جارٍ الإرسال…';}
  try {
    const row={member_id:member.id, member_name:member.name||'', mill_name:member.mill||'', phone:member.phone||'', topic, message, status:'جديدة'};
    const {error}=await supabaseClient.from('member_messages').insert([row]);
    if(error) throw error;
    e.currentTarget.reset(); alert('تم إرسال رسالتك إلى الإدارة بنجاح.'); await loadMemberMessages();
  } catch(err){alert('تعذر إرسال الرسالة. تحقق من تنفيذ ملف MIGRATION-MEMBER-PORTAL.sql وصلاحيات Supabase. '+(err.message||''));}
  finally {if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-paper-plane"></i> إرسال إلى الإدارة';}}
}
async function loadMemberMessages(){
 const box=document.getElementById('member-messages-list'); if(!box)return;
 let member;try{member=JSON.parse(sessionStorage.getItem('currentMember')||'null')}catch(_){}
 if(!member){box.innerHTML='<p class="empty-state">يرجى تسجيل الدخول لعرض المراسلات.</p>';return;}
 box.innerHTML='<p class="loading-state">جارٍ تحميل المراسلات...</p>';
 try{const {data,error}=await supabaseClient.from('member_messages').select('*').eq('member_id',member.id).order('created_at',{ascending:false});if(error)throw error;
 if(!data?.length){box.innerHTML='<p class="empty-state">لا توجد مراسلات بعد. يمكنك إرسال أول رسالة إلى الإدارة من النموذج أعلاه.</p>';return;}
 box.innerHTML=data.map(m=>`<article class="member-message-card"><div class="message-card-head"><strong>${escapeHTML(m.topic||'مراسلة')}</strong><span>${escapeHTML(m.status||'جديدة')}</span></div><p>${escapeHTML(m.message||'')}</p>${m.admin_reply?`<div class="admin-reply"><strong><i class="fa-solid fa-reply"></i> رد الإدارة</strong><p>${escapeHTML(m.admin_reply)}</p></div>`:''}<small>${escapeHTML(m.created_at?new Date(m.created_at).toLocaleString('ar-MA'):'')}</small></article>`).join('');
 }catch(err){box.innerHTML='<p class="empty-state">تعذر تحميل المراسلات. تحقق من صلاحيات الجدول member_messages في Supabase.</p>';}
}
async function loadMemberAnnouncements(){
 const box=document.getElementById('member-announcements-list');if(!box)return;
 let member;try{member=JSON.parse(sessionStorage.getItem('currentMember')||'null')}catch(_){}
 if(!member){box.innerHTML='<p class="empty-state">يرجى تسجيل الدخول لعرض الإعلانات.</p>';return;}
 box.innerHTML='<p class="loading-state">جارٍ تحميل الإعلانات...</p>';
 try{const {data,error}=await supabaseClient.from('member_announcements').select('*').order('created_at',{ascending:false});if(error)throw error;
 const visible=(data||[]).filter(a=>a.published!==false && (a.audience==='all'||(a.audience==='member' && String(a.member_id)===String(member.id))));
 if(!visible.length){box.innerHTML='<p class="empty-state">لا توجد إعلانات جديدة حالياً.</p>';return;}
 box.innerHTML=visible.map(a=>`<article class="member-announcement-card"><div class="announcement-icon"><i class="fa-solid fa-bullhorn"></i></div><div class="announcement-content"><div class="announcement-meta"><span>${a.audience==='all'?'إعلان عام للمنخرطين':'إعلان خاص'}</span><small>${escapeHTML(a.created_at?new Date(a.created_at).toLocaleDateString('ar-MA'):'')}</small></div><h4>${escapeHTML(a.title||'إعلان الإدارة')}</h4><p>${escapeHTML(a.body||'').replace(/\n/g,'<br>')}</p></div></article>`).join('');
 }catch(err){box.innerHTML='<p class="empty-state">تعذر تحميل الإعلانات. يرجى التأكد من إنشاء جدول member_announcements وتنفيذ ملف التهيئة.</p>';}
}


// مركز التواصل الإداري: إعلانات جماعية/فردية والرد على رسائل المنخرطين
function toggleAnnouncementMember(){const audience=document.getElementById('admin-announcement-audience')?.value;const field=document.getElementById('announcement-member-field');if(field)field.style.display=audience==='member'?'grid':'none';}
async function loadAdminMemberComms(){
 const memberSelect=document.getElementById('admin-announcement-member');
 const inbox=document.getElementById('admin-member-messages-list'); const history=document.getElementById('admin-announcements-list');
 if(memberSelect){const {data,error}=await supabaseClient.from('members').select('id,name,mill,phone').order('name');if(error){memberSelect.innerHTML='<option value="">تعذر تحميل المنخرطين</option>';}else{memberSelect.innerHTML='<option value="">اختر المنخرط</option>'+(data||[]).map(m=>`<option value="${Number(m.id)}">${escapeHTML(m.name||'بدون اسم')} — ${escapeHTML(m.mill||'')} (${escapeHTML(m.phone||'')})</option>`).join('');}}
 if(inbox){inbox.innerHTML='<p class="loading-state">جارٍ تحميل الرسائل...</p>';try{const {data,error}=await supabaseClient.from('member_messages').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;if(!data?.length){inbox.innerHTML='<p class="empty-state">لا توجد رسائل واردة.</p>';}else{inbox.innerHTML='<div class="admin-comms-list">'+data.map(m=>`<article class="admin-comms-card"><div class="message-card-head"><strong>${escapeHTML(m.topic||'رسالة')}</strong><span>${escapeHTML(m.status||'جديدة')}</span></div><p><b>${escapeHTML(m.member_name||'منخرط')}</b> — ${escapeHTML(m.mill_name||'')} ${m.phone?'· '+escapeHTML(m.phone):''}</p><p>${escapeHTML(m.message||'')}</p>${m.admin_reply?`<div class="admin-reply"><b>الرد السابق:</b><p>${escapeHTML(m.admin_reply)}</p></div>`:''}<form onsubmit="replyToMemberMessage(event,${Number(m.id)})" class="reply-form"><textarea name="admin_reply" rows="3" required placeholder="اكتب الرد أو التوجيه للمنخرط">${escapeHTML(m.admin_reply||'')}</textarea><select name="status"><option ${m.status==='جديدة'?'selected':''}>جديدة</option><option ${m.status==='قيد المعالجة'?'selected':''}>قيد المعالجة</option><option ${m.status==='تم الرد'?'selected':''}>تم الرد</option></select><button type="submit" class="member-primary-btn">حفظ الرد</button></form><small>${escapeHTML(m.created_at?new Date(m.created_at).toLocaleString('ar-MA'):'')}</small></article>`).join('')+'</div>';}}catch(err){inbox.innerHTML='<p class="empty-state">تعذر تحميل رسائل المنخرطين. نفّذ MIGRATION-MEMBER-PORTAL.sql وتحقق من صلاحيات المشرف.</p>';}}
 if(history){history.innerHTML='<p class="loading-state">جارٍ تحميل سجل الإعلانات...</p>';try{const {data,error}=await supabaseClient.from('member_announcements').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;if(!data?.length){history.innerHTML='<p class="empty-state">لم يتم نشر إعلانات بعد.</p>';}else{history.innerHTML='<div class="admin-comms-list">'+data.map(a=>`<article class="admin-comms-card"><div class="message-card-head"><strong>${escapeHTML(a.title||'إعلان')}</strong><span>${a.audience==='all'?'جماعي':'فردي'}</span></div><p>${escapeHTML(a.body||'')}</p><small>${escapeHTML(a.created_at?new Date(a.created_at).toLocaleString('ar-MA'):'')}</small><button type="button" class="btn-danger" onclick="deleteMemberAnnouncement(${Number(a.id)})">حذف الإعلان</button></article>`).join('')+'</div>';}}catch(err){history.innerHTML='<p class="empty-state">تعذر تحميل سجل الإعلانات. تحقق من إعداد الجدول وصلاحيات المشرف.</p>';}}
}
async function sendMemberAnnouncement(e){e.preventDefault();const audience=document.getElementById('admin-announcement-audience').value;const memberId=document.getElementById('admin-announcement-member').value;const title=document.getElementById('admin-announcement-title').value.trim();const body=document.getElementById('admin-announcement-body').value.trim();if(audience==='member'&&!memberId){alert('اختر المنخرط المستهدف أولاً.');return;}const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;try{const row={audience,member_id:audience==='member'?Number(memberId):null,title,body};const {error}=await supabaseClient.from('member_announcements').insert([row]);if(error)throw error;e.currentTarget.reset();toggleAnnouncementMember();alert('تم حفظ الإعلان وإرساله داخل فضاء المنخرطين.');await loadAdminMemberComms();}catch(err){alert('تعذر نشر الإعلان: '+(err.message||'تحقق من ملف MIGRATION-MEMBER-PORTAL.sql وصلاحيات الإدارة.'));}finally{btn.disabled=false;}}
async function replyToMemberMessage(e,id){e.preventDefault();const fd=new FormData(e.currentTarget);const admin_reply=String(fd.get('admin_reply')||'').trim();const status=String(fd.get('status')||'تم الرد');const {error}=await supabaseClient.from('member_messages').update({admin_reply,status,replied_at:new Date().toISOString()}).eq('id',id);if(error){alert('تعذر حفظ الرد: '+error.message);return;}alert('تم حفظ رد الإدارة.');await loadAdminMemberComms();}
async function deleteMemberAnnouncement(id){if(!confirm('هل تريد حذف هذا الإعلان؟'))return;const {error}=await supabaseClient.from('member_announcements').delete().eq('id',id);if(error){alert('تعذر حذف الإعلان: '+error.message);return;}await loadAdminMemberComms();}
