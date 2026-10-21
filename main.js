document.addEventListener('DOMContentLoaded', () => {
    // تفعيل جلب أسعار السوق والمؤشرات تلقائياً
    fetchGlobalMarketPrices();
    setInterval(fetchGlobalMarketPrices, 600000); // تحديث كل 10 دقائق

    if (document.getElementById('admin-members-table')) { loadAdminData(); loadAdminActivities(); loadAdminTrainings(); loadAdminNews(); loadAdminLocalPrices(); }
    if (document.getElementById('public-activities-grid')) loadPublicActivities();
    if (document.getElementById('public-trainings-grid')) loadPublicTrainings();
    if (document.getElementById('member-trainings-grid')) loadMemberTrainings();
    if (document.getElementById('training-material-content')) loadTrainingMaterialPage();
    if (document.getElementById('public-news-grid')) loadPublicNews();
    if (document.getElementById('user-dashboard-info')) loadUserDashboard();
});

// دالة جلب أسعار السوق ومؤشرات البورصات الدولية والأسعار المحلية المسجلة يدوياً من الإدارة
async function fetchGlobalMarketPrices() {
    const tickerContainer = document.getElementById('live-market-ticker');
    if (!tickerContainer) return;

    try {
        // لا نعرض أسعاراً دولية ثابتة أو تقديرية. إلى حين إعداد نقطة API موثوقة
        // تقرأ ملف المفوضية الأوروبية وتتحقق من تاريخ البيانات، نعرض رابط المصدر فقط.
        let marketData = [
            "🌍 الأسعار الدولية: راجع البيانات الرسمية وتاريخ آخر تحديث لدى المفوضية الأوروبية",
            "🔎 المجلس الدولي للزيتون: تقارير السوق والإحصاءات الرسمية"
        ];

        const { data: localPrices, error } = await supabaseClient.from('market_prices').select('*');
        if (!error && localPrices && localPrices.length > 0) {
            localPrices.forEach(item => marketData.push(`🇲🇦 أسعار محلية مدخلة من الإدارة: ${item.price_text} (يرجى مراجعة تاريخ ومصدر الإدخال)`));
        }
        marketData.push("المصادر الرسمية: agriculture.ec.europa.eu و internationaloliveoil.org");

        // مساران متطابقان يضمنان حركة متصلة دون اختفاء النص عند نهاية الدورة
        const track = marketData.map(item => `<span>${escapeHTML(item)}</span>`).join(' <b class="ticker-separator">✦</b> ');
        tickerContainer.innerHTML = `<div class="ticker-track"><div class="ticker-group">${track}</div><div class="ticker-group" aria-hidden="true">${track}</div></div>`;
    } catch (error) {
        console.error('تعذر تحديث أسعار السوق:', error);
    }
}


// 1. تسجيل دخول المشرف (الإدارة)
function handleAdminLogin(e) {
    e.preventDefault();
    const user = document.getElementById('admin-user').value.trim();
    const pass = document.getElementById('admin-pass').value.trim();

    if (user === 'admin_namaa' && pass === 'Olive2026@Attaouia') {
        sessionStorage.setItem('isAdmin', 'true');
        alert('مرحباً بك، تم تسجيل دخول المشرف بنجاح.');
        window.location.href = 'admin-dashboard.html';
    } else { 
        alert('اسم المستخدم أو كلمة المرور الإدارية غير صحيحة!'); 
    }
}

// 2. تسجيل دخول المنخرط
async function handleUserLogin(e) {
    e.preventDefault();
    const u = document.getElementById('user-username').value.trim();
    const p = document.getElementById('user-pass').value.trim();

    const { data: members, error } = await supabaseClient
        .from('members')
        .select('*')
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

// 3. عرض لوحة تحكم المنخرط
async function loadUserDashboard() {
    const member = JSON.parse(sessionStorage.getItem('currentMember'));
    if (!member) { 
        window.location.href = 'register.html'; 
        return; 
    }
    [['update-name','name'],['update-mill','mill'],['update-phone','phone']].forEach(([id,key]) => { const el=document.getElementById(id); if(el) el.value=member[key] || ''; });
    const infoBox = document.getElementById('user-dashboard-info');
    if (infoBox) {
        infoBox.innerHTML = `
            <div style="background:white; padding:20px; border-radius:10px; box-shadow:var(--shadow);">
                <h3 style="color:var(--primary-green); margin-bottom:10px;">مرحباً بك، ${member.name}</h3>
                <p><strong>المعصرة:</strong> ${member.mill}</p>
                <p><strong>رقم الهاتف:</strong> ${member.phone}</p>
                <p><strong>نوع الانخراط:</strong> ${member.type}</p>
                <p><strong>حالة الانخراط:</strong> ${member.status}</p>
                <p><strong>الانخراط السنوي:</strong> ${member.annual_fee}</p>
            </div>
        `;
    }
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

    const { error } = await supabaseClient.from('members').insert([{ name, mill, phone, address, type, license, member_type: 'جديد', annual_fee: 'غير مؤدى', status: 'معالجة', username, password }]);
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
    const { data: newsList } = await supabaseClient.from('news').select('*').order('id', { ascending: false });
    if (!newsList) return;
    let html = '';
    newsList.forEach(n => {
        html += `<div style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.06); border-top:4px solid #c5a059;">${n.image_url ? `<img src="${n.image_url}" alt="${n.title}" loading="lazy" style="width:100%; height:180px; object-fit:cover;">` : ''}<div style="padding:20px;"><span style="background:#1b4d3e; color:white; padding:3px 10px; border-radius:15px; font-size:0.75rem;">${n.category}</span><h4 style="color:#1b4d3e; margin:10px 0 6px; font-size:1.1rem;">${n.title}</h4><p style="font-size:0.8rem; color:#777; margin-bottom:8px;"><i class="fa-solid fa-clock"></i> ${n.date}</p><p style="color:#555; font-size:0.9rem;">${n.content}</p>${n.document_url ? `<p style="margin-top:12px;"><a href="${n.document_url}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> تحميل الوثيقة المرفقة</a></p>` : ""}</div></div>`;
    });
    grid.innerHTML = html;
}

// 7. عرض الأنشطة
async function loadPublicActivities() {
    const grid = document.getElementById('public-activities-grid');
    if (!grid) return;
    const { data: acts } = await supabaseClient.from('activities').select('*').order('id', { ascending: false });
    if (!acts) return;
    let html = '';
    acts.forEach(a => {
        html += `<div style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.06); border-top:4px solid #1b4d3e;">${a.image_url ? `<img src="${a.image_url}" alt="${a.title}" loading="lazy" style="width:100%; height:180px; object-fit:cover;">` : ''}<div style="padding:20px;"><span style="background:#2e7d32; color:white; padding:3px 10px; border-radius:15px; font-size:0.75rem;">${a.type}</span><h4 style="color:#1b4d3e; margin:10px 0 6px; font-size:1.1rem;">${a.title}</h4><p style="font-size:0.8rem; color:#777; margin-bottom:8px;"><i class="fa-solid fa-calendar"></i> ${a.date}</p><p style="color:#555; font-size:0.9rem;">${a.description}</p></div></div>`;
    });
    grid.innerHTML = html;
}

// 8. فهرس التكوينات العام: عرض بطاقات وروابط فقط، والمحتوى داخل صفحة محمية للمنخرطين.
async function loadPublicTrainings() {
    const grid = document.getElementById('public-trainings-grid');
    if (!grid) return;
    grid.innerHTML = '<p class="loading-state">جارٍ تحميل مواد التكوين...</p>';
    const { data: trs, error } = await supabaseClient.from('trainings').select('id,title,trainer,date,description,image_url,target').order('id', { ascending: false });
    if (error) { grid.innerHTML = '<p class="empty-state">تعذر تحميل التكوينات حالياً.</p>'; return; }
    if (!trs || !trs.length) { grid.innerHTML = '<p class="empty-state">لا توجد تكوينات منشورة حالياً.</p>'; return; }
    grid.innerHTML = trs.map(t => `<article class="training-card training-index-card">
      ${t.image_url ? `<img class="training-cover" src="${escapeHTML(t.image_url)}" alt="${escapeHTML(t.title || 'صورة التكوين')}" loading="lazy">` : '<div class="training-cover-placeholder"><i class="fa-solid fa-graduation-cap"></i></div>'}
      <div class="training-card-body"><span class="training-kicker"><i class="fa-solid fa-lock"></i> مادة مخصصة للمنخرطين</span>
      <h4>${escapeHTML(t.title || 'مادة تكوينية')}</h4>
      <div class="training-meta"><span><i class="fa-solid fa-chalkboard-user"></i> ${escapeHTML(t.trainer || 'غير محدد')}</span><span><i class="fa-solid fa-calendar-days"></i> ${escapeHTML(t.date || 'غير محدد')}</span></div>
      ${t.description ? `<p class="training-index-description">${escapeHTML(t.description)}</p>` : ''}
      <a class="training-open-link" href="training-material.html?id=${encodeURIComponent(t.id)}"><i class="fa-solid fa-arrow-up-right-from-square"></i> فتح مادة التكوين</a></div></article>`).join('');
}

// 10. إدارة لوحة المشرف وجلب المنخرطين
async function loadAdminData() {
    const { data: members } = await supabaseClient.from('members').select('*').order('id', { ascending: false });
    const table = document.getElementById('admin-members-table');
    if (!members || !table) return;
    let html = '';
    members.forEach(m => {
        let badgeClass = m.status === 'مقبول' ? 'badge-success' : 'badge-danger';
        let waBtn = m.status === 'مقبول' ? `<a href="https://wa.me/${m.phone}?text=مرحباً%20${m.name}،%20تم تفعيل حسابكم بجمعية نماء العطاوية. المستخدم: ${m.username} | الرمز: ${m.password}" target="_blank" style="background:#25d366; color:white; padding:3px 6px; border-radius:4px; text-decoration:none; font-size:0.7rem; display:inline-block; margin-top:3px;"><i class="fa-brands fa-whatsapp"></i> واتساب</a>` : '';
        html += `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px;"><strong>${m.name}</strong></td><td style="padding:10px;">${m.mill}</td><td style="padding:10px; direction:ltr;">${m.phone}</td><td style="padding:10px;"><select onchange="updateMemberField(${m.id}, 'annual_fee', this.value)" style="padding:2px;"><option value="مؤدى" ${m.annual_fee==='مؤدى'?'selected':''}>مؤدى</option><option value="غير مؤدى" ${m.annual_fee==='غير مؤدى'?'selected':''}>غير مؤدى</option></select></td><td style="padding:10px;"><span class="badge ${badgeClass}">${m.status}</span><br>${waBtn}</td><td style="padding:10px;"><button class="btn-danger" onclick="deleteRecord('members', ${m.id})">حذف</button></td></tr>`;
    });
    table.innerHTML = html;
}

async function updateMemberField(id, field, val) { const {error}=await supabaseClient.from('members').update({ [field]: val }).eq('id', id); if(error) alert('تعذر تحديث البيانات: '+error.message); await loadAdminData(); }

async function deleteRecord(table, id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        await supabaseClient.from(table).delete().eq('id', id);
        loadAdminData();
    }
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
// فضاء المنخرط: فهرس أنيق للمواد، دون عرض المحتوى الكامل في هذه الصفحة.
async function loadMemberTrainings() {
    const grid = document.getElementById('member-trainings-grid');
    if (!grid) return;
    const member = sessionStorage.getItem('currentMember');
    if (!member) { location.href = 'register.html'; return; }
    grid.innerHTML = '<p class="loading-state">جارٍ تحميل البرامج التكوينية...</p>';
    const { data: trs, error } = await supabaseClient.from('trainings').select('id,title,trainer,date,description,image_url,target').order('id', { ascending: false });
    if (error) { grid.innerHTML = '<p class="empty-state">تعذر تحميل التكوينات. يرجى المحاولة لاحقاً.</p>'; return; }
    if (!trs || !trs.length) { grid.innerHTML = '<p class="empty-state">لا توجد تكوينات منشورة حالياً.</p>'; return; }
    grid.innerHTML = trs.map(t => `<article class="training-card training-index-card">
      ${t.image_url ? `<img class="training-cover" src="${escapeHTML(t.image_url)}" alt="${escapeHTML(t.title || 'صورة التكوين')}" loading="lazy">` : '<div class="training-cover-placeholder"><i class="fa-solid fa-graduation-cap"></i></div>'}
      <div class="training-card-body"><span class="training-kicker"><i class="fa-solid fa-circle-check"></i> متاحة للمنخرطين</span>
      <h4>${escapeHTML(t.title || 'مادة تكوينية')}</h4>
      <div class="training-meta"><span><i class="fa-solid fa-chalkboard-user"></i> ${escapeHTML(t.trainer || 'غير محدد')}</span><span><i class="fa-solid fa-calendar-days"></i> ${escapeHTML(t.date || 'غير محدد')}</span></div>
      ${t.description ? `<p class="training-index-description">${escapeHTML(t.description)}</p>` : ''}
      <a class="training-open-link" href="training-material.html?id=${encodeURIComponent(t.id)}"><i class="fa-solid fa-book-open"></i> الاطلاع على المادة</a></div></article>`).join('');
}

// صفحة مادة تكوينية منفصلة: فحص جلسة المنخرط قبل طلب المحتوى.
async function loadTrainingMaterialPage() {
    const root = document.getElementById('training-material-content');
    if (!root) return;
    if (!sessionStorage.getItem('currentMember')) {
        const next = encodeURIComponent(location.pathname + location.search);
        location.replace('register.html?next=' + next);
        return;
    }
    const id = new URLSearchParams(location.search).get('id');
    if (!id || !/^[0-9]+$/.test(id)) { root.innerHTML = '<p class="empty-state">رابط المادة غير صحيح. ارجع إلى قائمة التكوينات واختر مادة.</p>'; return; }
    root.innerHTML = '<p class="loading-state">جارٍ تحميل المادة التكوينية...</p>';
    const { data: t, error } = await supabaseClient.from('trainings').select('*').eq('id', id).maybeSingle();
    if (error || !t) { root.innerHTML = '<p class="empty-state">تعذر العثور على هذه المادة أو أنها لم تعد متاحة.</p>'; return; }
    root.innerHTML = `<article class="training-detail-card">
      ${t.image_url ? `<img class="training-detail-cover" src="${escapeHTML(t.image_url)}" alt="${escapeHTML(t.title || 'صورة التكوين')}">` : ''}
      <div class="training-detail-body"><span class="training-kicker"><i class="fa-solid fa-graduation-cap"></i> مادة تكوينية للمنخرطين</span>
      <h2>${escapeHTML(t.title || 'مادة تكوينية')}</h2>
      <div class="training-meta"><span><i class="fa-solid fa-chalkboard-user"></i> ${escapeHTML(t.trainer || 'غير محدد')}</span><span><i class="fa-solid fa-calendar-days"></i> ${escapeHTML(t.date || 'غير محدد')}</span>${t.target ? `<span><i class="fa-solid fa-users"></i> ${escapeHTML(t.target)}</span>` : ''}</div>
      <div class="training-description">${escapeHTML(t.description || t.content || 'لم تتم إضافة تفاصيل لهذه المادة بعد.').replace(/\n/g,'<br>')}</div>
      ${t.video_url ? `<div class="training-media"><a href="${escapeHTML(t.video_url)}" target="_blank" rel="noopener"><i class="fa-solid fa-circle-play"></i> مشاهدة الفيديو أو المادة المرئية</a></div>` : ''}
      ${t.document_url ? `<div class="training-media"><a href="${escapeHTML(t.document_url)}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> فتح الوثيقة المرفقة</a></div>` : ''}
      </div></article>`;
}

// دالة تحديث بيانات المنخرط من لوحة تحكمه
async function handleUpdateMemberProfile(e) {
    e.preventDefault();
    const member = JSON.parse(sessionStorage.getItem('currentMember'));
    if (!member) return;

    const name = document.getElementById('update-name').value;
    const mill = document.getElementById('update-mill').value;
    const phone = document.getElementById('update-phone').value;
    const password = document.getElementById('update-pass').value;

    let updateData = { name, mill, phone };
    if (password.trim() !== '') {
        updateData.password = password.trim();
    }

    const { error } = await supabaseClient.from('members').update(updateData).eq('id', member.id);
    if (error) {
        alert('خطأ أثناء التحديث: ' + error.message);
    } else {
        alert('تم تحديث بياناتكم بنجاح!');
        // تحديث الجلسة
        Object.assign(member, updateData);
        sessionStorage.setItem('currentMember', JSON.stringify(member));
        location.reload();
    }
}
// أدوات مشتركة: حماية النصوص وإدارة الوسائط
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
async function uploadFileToSupabase(inputId) {
    const input = document.getElementById(inputId);
    const file = input?.files?.[0];
    if (!file) return '';
    // يتطلب إنشاء bucket عام باسم media في Supabase مع صلاحيات الرفع المناسبة.
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
 table.innerHTML=(data||[]).map(a=>`<tr><td>${escapeHTML(a.title)}</td><td>${escapeHTML(a.date)}</td><td>${escapeHTML(a.type)}</td><td>${a.image_url?'<a target="_blank" rel="noopener" href="'+escapeHTML(a.image_url)+'">صورة</a> ':''}${a.video_url?'<a target="_blank" rel="noopener" href="'+escapeHTML(a.video_url)+'">فيديو</a>':''}</td><td><button class="btn-danger" onclick="deleteContentRecord('activities',${a.id})">حذف</button></td></tr>`).join('');
}
async function loadAdminTrainings() {
 const table=document.getElementById('admin-trainings-table'); if(!table)return;
 const {data,error}=await supabaseClient.from('trainings').select('*').order('id',{ascending:false});
 if(error){table.innerHTML='<tr><td colspan="5">تعذر تحميل التكوينات.</td></tr>';return;}
 table.innerHTML=(data||[]).map(t=>`<tr><td>${escapeHTML(t.title)}</td><td>${escapeHTML(t.trainer)}</td><td>${escapeHTML(t.date)}</td><td>${t.image_url?'<a target="_blank" rel="noopener" href="'+escapeHTML(t.image_url)+'">صورة</a> ':''}${t.video_url?'<a target="_blank" rel="noopener" href="'+escapeHTML(t.video_url)+'">فيديو</a>':''}</td><td><button class="btn-danger" onclick="deleteContentRecord('trainings',${t.id})">حذف</button></td></tr>`).join('');
}
async function loadAdminNews() {
 const table=document.getElementById('admin-news-table'); if(!table)return;
 const {data,error}=await supabaseClient.from('news').select('*').order('id',{ascending:false});
 if(error){table.innerHTML='<tr><td colspan="5">تعذر تحميل الأخبار.</td></tr>';return;}
 table.innerHTML=(data||[]).map(n=>`<tr><td>${escapeHTML(n.title)}</td><td>${escapeHTML(n.category)}</td><td>${escapeHTML(n.date)}</td><td>${n.image_url?'<a target="_blank" rel="noopener" href="'+escapeHTML(n.image_url)+'">صورة</a> ':''}${n.document_url?'<a target="_blank" rel="noopener" href="'+escapeHTML(n.document_url)+'">وثيقة</a>':''}</td><td><button class="btn-danger" onclick="deleteContentRecord('news',${n.id})">حذف</button></td></tr>`).join('');
}
async function deleteContentRecord(table,id) { if(!confirm('هل تريد حذف هذا المحتوى نهائياً؟'))return; const {error}=await supabaseClient.from(table).delete().eq('id',id); if(error){alert('تعذر الحذف: '+error.message);return;} if(table==='activities'){loadAdminActivities();loadPublicActivities();} if(table==='trainings'){loadAdminTrainings();loadPublicTrainings();loadMemberTrainings();} if(table==='news'){loadAdminNews();loadPublicNews();} }

// تحميل الأسعار المحلية في لوحة المشرف لإدارتها وحذفها
async function loadAdminLocalPrices() {
    const table = document.getElementById('admin-local-prices-table');
    if (!table) return;
    const { data: prices } = await supabaseClient.from('market_prices').select('*').order('id', { ascending: false });
    let html = '';
    if (prices) {
        prices.forEach(p => {
            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;">${p.price_text}</td>
                <td style="padding:10px;"><button class="btn-danger" onclick="deleteRecord('market_prices', ${p.id}); loadAdminLocalPrices();">حذف</button></td>
            </tr>`;
        });
    }
    table.innerHTML = html;
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
