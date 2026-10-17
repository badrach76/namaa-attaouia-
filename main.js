document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-members-table')) loadAdminData();
    if (document.getElementById('public-activities-grid')) loadPublicActivities();
    if (document.getElementById('public-trainings-grid')) loadPublicTrainings();
    if (document.getElementById('member-trainings-grid')) loadMemberTrainings();
    if (document.getElementById('public-news-grid')) loadPublicNews();
    if (document.getElementById('user-dashboard-info')) loadUserDashboard();
});

// طلب انخراط جديد
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

    const { error } = await supabase.from('members').insert([{ name, mill, phone, address, type, license, member_type: 'جديد', annual_fee: 'غير مؤدى', status: 'معالجة', username, password }]);
    if (error) alert('خطأ: ' + error.message);
    else { alert('تم إرسال طلب انخراطكم بنجاح.'); e.target.reset(); window.location.href = 'index.html'; }
}

// تسجيل منخرط قديم
async function handleAddOldMember(e) {
    e.preventDefault();
    const name = document.getElementById('old-name').value;
    const mill = document.getElementById('old-mill').value;
    const phone = document.getElementById('old-phone').value;
    const type = document.getElementById('old-type').value;
    const annual_fee = document.getElementById('old-fee').value;
    const username = 'old_' + Math.floor(Math.random() * 9000 + 1000);
    const password = 'pass' + Math.floor(Math.random() * 9000 + 1000);

    const { error } = await supabase.from('members').insert([{ name, mill, phone, address: 'العطاوية (قديم)', type, license: 'مرخص', member_type: 'قديم', annual_fee, status: 'مقبول', username, password }]);
    if (error) alert('خطأ: ' + error.message);
    else { alert('تم تسجيل المنخرط القديم بنجاح.'); e.target.reset(); loadAdminData(); }
}

// نشر نشاط مع رفع الملفات من الجهاز
async function handleAddActivity(e) {
    e.preventDefault();
    const title = document.getElementById('act-title').value;
    const date = document.getElementById('act-date').value;
    const type = document.getElementById('act-type').value;
    const description = document.getElementById('act-desc').value;
    const imageUrl = await uploadFileToSupabase('act-image-file');
    const videoUrl = await uploadFileToSupabase('act-video-file');

    const { error } = await supabase.from('activities').insert([{ title, date, type, description, image_url: imageUrl || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80', video_url: videoUrl || '' }]);
    if (error) alert('خطأ: ' + error.message);
    else { alert('تم نشر النشاط بنجاح.'); e.target.reset(); loadAdminData(); }
}

// نشر خبر جديد مع رفع الصورة من الجهاز
async function handleAddNews(e) {
    e.preventDefault();
    const title = document.getElementById('news-title').value;
    const category = document.getElementById('news-category').value;
    const date = document.getElementById('news-date').value;
    const content = document.getElementById('news-content').value;
    const imageUrl = await uploadFileToSupabase('news-image-file');

    const { error } = await supabase.from('news').insert([{ title, category, date, content, image_url: imageUrl || 'https://images.unsplash.com/photo-1589927986062-0ef777bb1f16?auto=format&fit=crop&w=600&q=80' }]);
    if (error) alert('خطأ: ' + error.message);
    else { alert('تم نشر الخبر بنجاح.'); e.target.reset(); loadAdminData(); }
}

// نشر تكوين حصري مع رفع الملفات
async function handleAddTraining(e) {
    e.preventDefault();
    const title = document.getElementById('tr-title').value;
    const date = document.getElementById('tr-date').value;
    const trainer = document.getElementById('tr-trainer').value;
    const content = document.getElementById('tr-content').value;
    const imageUrl = await uploadFileToSupabase('tr-image-file');
    const videoUrl = await uploadFileToSupabase('tr-video-file');

    const { error } = await supabase.from('trainings').insert([{ title, date, trainer, target: 'أرباب المعاصر', content, image_url: imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80', video_url: videoUrl || '' }]);
    if (error) alert('خطأ: ' + error.message);
    else { alert('تم نشر التكوين بنجاح.'); e.target.reset(); loadAdminData(); }
}

// تحميل العرض العام للأخبار
async function loadPublicNews() {
    const grid = document.getElementById('public-news-grid');
    if (!grid) return;
    const { data: newsList } = await supabase.from('news').select('*').order('id', { ascending: false });
    if (!newsList) return;
    let html = '';
    newsList.forEach(n => {
        html += `<div style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.08); border-top:4px solid var(--accent-gold);"><img src="${n.image_url}" style="width:100%; height:180px; object-fit:cover;"><div style="padding:20px;"><span style="background:var(--primary-green); color:white; padding:3px 10px; border-radius:15px; font-size:0.75rem;">${n.category}</span><h4 style="color:var(--primary-green); margin:12px 0 8px; font-size:1.1rem;">${n.title}</h4><p style="font-size:0.8rem; color:#777; margin-bottom:8px;"><i class="fa-solid fa-clock"></i> ${n.date}</p><p style="color:#555; font-size:0.9rem;">${n.content}</p></div></div>`;
    });
    grid.innerHTML = html;
}

// تحميل الأنشطة
async function loadPublicActivities() {
    const grid = document.getElementById('public-activities-grid');
    if (!grid) return;
    const { data: acts } = await supabase.from('activities').select('*').order('id', { ascending: false });
    if (!acts) return;
    let html = '';
    acts.forEach(a => {
        let mediaBox = a.video_url ? `<div style="margin-top:10px;"><video width="100%" controls style="border-radius:8px;"><source src="${a.video_url}" type="video/mp4"></video></div>` : '';
        html += `<div style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.08); border-top:4px solid var(--primary-green);"><img src="${a.image_url}" style="width:100%; height:200px; object-fit:cover;"><div style="padding:20px;"><span style="background:var(--light-green); color:white; padding:3px 10px; border-radius:15px; font-size:0.75rem;">${a.type}</span><h4 style="color:var(--primary-green); margin:12px 0 8px; font-size:1.2rem;">${a.title}</h4><p style="font-size:0.85rem; color:#777;"><i class="fa-solid fa-calendar"></i> ${a.date}</p><p style="color:#555; font-size:0.95rem; margin-top:10px;">${a.description}</p>${mediaBox}</div></div>`;
    });
    grid.innerHTML = html;
}

// تحميل التكوينات العامة
async function loadPublicTrainings() {
    const grid = document.getElementById('public-trainings-grid');
    if (!grid) return;
    const { data: trs } = await supabase.from('trainings').select('*').order('id', { ascending: false });
    if (!trs) return;
    let html = '';
    trs.forEach(t => {
        html += `<div style="background:white; padding:25px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.05); border-top:4px solid var(--accent-gold);"><h4 style="color:var(--primary-green); margin-bottom:10px;"><i class="fa-solid fa-graduation-cap"></i> ${t.title}</h4><p style="font-size:0.9rem; color:#555; margin-bottom:6px;"><strong>المؤطر:</strong> ${t.trainer}</p><p style="font-size:0.85rem; color:#777; margin-bottom:15px;"><i class="fa-solid fa-clock"></i> ${t.date}</p><div style="background:var(--light-gold); padding:10px; border-radius:8px; font-size:0.85rem; text-align:center; color:var(--primary-green);"><i class="fa-solid fa-lock"></i> المحتوى الحصري متاح للمنخرطين عبر <a href="register.html" style="font-weight:bold;">حساب المنخرط</a></div></div>`;
    });
    grid.innerHTML = html;
}

// تحميل لوحة الإدارة (حذف وتعديل)
async function loadAdminData() {
    const { data: members } = await supabase.from('members').select('*').order('id', { ascending: false });
    const table = document.getElementById('admin-members-table');
    if (members && table) {
        let html = '';
        members.forEach(m => {
            let badgeClass = m.status === 'مقبول' ? 'badge-success' : 'badge-danger';
            let waBtn = m.status === 'مقبول' ? `<a href="https://wa.me/${m.phone}?text=مرحباً%20${m.name}،%20تم تفعيل حسابكم بجمعية نماء. المستخدم: ${m.username} | الرمز: ${m.password}" target="_blank" style="background:#25d366; color:white; padding:3px 6px; border-radius:4px; text-decoration:none; font-size:0.75rem; display:inline-block; margin-top:2px;">واتساب</a>` : '';
            html += `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px;"><strong>${m.name}</strong></td><td style="padding:10px;">${m.mill}</td><td style="padding:10px;"><select onchange="updateMemberField(${m.id}, 'annual_fee', this.value)" style="padding:2px;"><option value="مؤدى" ${m.annual_fee==='مؤدى'?'selected':''}>مؤدى</option><option value="غير مؤدى" ${m.annual_fee==='غير مؤدى'?'selected':''}>غير مؤدى</option></select></td><td style="padding:10px;"><span class="badge ${badgeClass}">${m.status}</span></td><td style="padding:10px;"><select onchange="updateMemberField(${m.id}, 'status', this.value)" style="padding:2px;"><option value="معالجة" ${m.status==='معالجة'?'selected':''}>معالجة</option><option value="مقبول" ${m.status==='مقبول'?'selected':''}>قبول</option><option value="مرفوض" ${m.status==='مرفوض'?'selected':''}>رفض</option></select>${waBtn}</td><td style="padding:10px;"><button class="btn-danger" onclick="deleteRecord('members', ${m.id})">حذف</button></td></tr>`;
        });
        table.innerHTML = html;
    }
}

async function updateMemberField(id, field, val) {
    await supabase.from('members').update({ [field]: val }).eq('id', id);
    loadAdminData();
}

async function deleteRecord(table, id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        await supabase.from(table).delete().eq('id', id);
        loadAdminData();
    }
}

// دخول الإدارة والمنخرطين
function handleAdminLogin(e) {
    e.preventDefault();
    if (document.getElementById('admin-user').value === 'admin_namaa' && document.getElementById('admin-pass').value === 'Olive2026@Attaouia') {
        sessionStorage.setItem('isAdmin', 'true');
        window.location.href = 'admin-dashboard.html';
    } else { alert('بيانات الدخول غير صحيحة!'); }
}

async function handleUserLogin(e) {
    e.preventDefault();
    const u = document.getElementById('user-username').value;
    const p = document.getElementById('user-pass').value;
    const { data: members } = await supabase.from('members').select('*').eq('username', u).eq('password', p).eq('status', 'مقبول');
    if (members && members.length > 0) {
        sessionStorage.setItem('currentMember', JSON.stringify(members[0]));
        window.location.href = 'user-dashboard.html';
    } else { alert('بيانات الدخول غير صحيحة أو الطلب لم يُقبل بعد.'); }
}

async function loadUserDashboard() {
    const member = JSON.parse(sessionStorage.getItem('currentMember'));
    if (!member) { window.location.href = 'register.html'; return; }
    document.getElementById('u-name-display').innerText = member.name;
    document.getElementById('u-mill-display').innerText = member.mill;
    document.getElementById('u-phone-display').innerText = member.phone;
    document.getElementById('u-type-display').innerText = member.type;
    document.getElementById('u-license-display').innerText = member.license;
    document.getElementById('u-fee-status').innerHTML = member.annual_fee === 'مؤدى' ? '<span class="badge badge-success">مؤدى (خالص)</span>' : '<span class="badge badge-danger">غير مؤدى</span>';

    // تحميل التكوينات الحصرية للمنخرط
    const { data: trs } = await supabase.from('trainings').select('*').order('id', { ascending: false });
    const grid = document.getElementById('member-trainings-grid');
    if (trs && grid) {
        let html = '';
        trs.forEach(t => {
            let mediaBox = t.video_url ? `<div style="margin-top:15px;"><video width="100%" controls style="border-radius:8px;"><source src="${t.video_url}" type="video/mp4"></video></div>` : '';
            let imgBox = t.image_url ? `<img src="${t.image_url}" style="width:100%; height:180px; object-fit:cover; border-radius:8px; margin-bottom:10px;">` : '';
            html += `<div style="background:white; padding:25px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.08); border-top:4px solid var(--light-green);">${imgBox}<h4 style="color:var(--primary-green); margin-bottom:10px;">${t.title}</h4><p style="font-size:0.85rem; color:#777; margin-bottom:8px;">المؤطر: ${t.trainer} | ${t.date}</p><p style="color:#444; font-size:0.95rem; margin-bottom:15px; background:var(--bg-light); padding:12px; border-radius:8px;">${t.content}</p>${mediaBox}</div>`;
        });
        grid.innerHTML = html;
    }
}

async function handleMemberInquiry(e) {
    e.preventDefault();
    const member = JSON.parse(sessionStorage.getItem('currentMember'));
    const message = document.getElementById('inquiry-text').value;
    await supabase.from('inquiries').insert([{ member_phone: member.phone, message }]);
    alert('تم إرسال استفسارك بنجاح.');
    e.target.reset();
}
