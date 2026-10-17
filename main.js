document.addEventListener('DOMContentLoaded', () => {
    // تفعيل جلب أسعار السوق تلقائياً
    if (typeof fetchGlobalMarketPrices === 'function') {
        fetchGlobalMarketPrices();
    }

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

    const { error } = await supabaseClient.from('members').insert([{ name, mill, phone, address, type, license, member_type: 'جديد', annual_fee: 'غير مؤدى', status: 'معالجة', username, password }]);
    if (error) alert('خطأ: ' + error.message);
    else { alert('تم إرسال طلب انخراطكم بنجاح.'); e.target.reset(); window.location.href = 'index.html'; }
}

// نشر خبر جديد مع رفع الصورة
async function handleAddNews(e) {
    e.preventDefault();
    const title = document.getElementById('news-title').value;
    const category = document.getElementById('news-category').value;
    const date = document.getElementById('news-date').value;
    const content = document.getElementById('news-content').value;
    const imageUrl = await uploadFileToSupabase('news-image-file');

    const { error } = await supabaseClient.from('news').insert([{ title, category, date, content, image_url: imageUrl || 'https://images.unsplash.com/photo-1589927986062-0ef777bb1f16?auto=format&fit=crop&w=600&q=80' }]);
    if (error) alert('خطأ: ' + error.message);
    else { alert('تم نشر الخبر بنجاح.'); e.target.reset(); loadAdminData(); }
}

// عرض الأخبار العامة
async function loadPublicNews() {
    const grid = document.getElementById('public-news-grid');
    if (!grid) return;
    const { data: newsList } = await supabaseClient.from('news').select('*').order('id', { ascending: false });
    if (!newsList) return;
    let html = '';
    newsList.forEach(n => {
        html += `<div style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.06); border-top:4px solid #c5a059;"><img src="${n.image_url}" style="width:100%; height:180px; object-fit:cover;"><div style="padding:20px;"><span style="background:#1b4d3e; color:white; padding:3px 10px; border-radius:15px; font-size:0.75rem;">${n.category}</span><h4 style="color:#1b4d3e; margin:10px 0 6px; font-size:1.1rem;">${n.title}</h4><p style="font-size:0.8rem; color:#777; margin-bottom:8px;"><i class="fa-solid fa-clock"></i> ${n.date}</p><p style="color:#555; font-size:0.9rem;">${n.content}</p></div></div>`;
    });
    grid.innerHTML = html;
}

// عرض الأنشطة
async function loadPublicActivities() {
    const grid = document.getElementById('public-activities-grid');
    if (!grid) return;
    const { data: acts } = await supabaseClient.from('activities').select('*').order('id', { ascending: false });
    if (!acts) return;
    let html = '';
    acts.forEach(a => {
        html += `<div style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.06); border-top:4px solid #1b4d3e;"><img src="${a.image_url}" style="width:100%; height:180px; object-fit:cover;"><div style="padding:20px;"><span style="background:#2e7d32; color:white; padding:3px 10px; border-radius:15px; font-size:0.75rem;">${a.type}</span><h4 style="color:#1b4d3e; margin:10px 0 6px; font-size:1.1rem;">${a.title}</h4><p style="font-size:0.8rem; color:#777; margin-bottom:8px;"><i class="fa-solid fa-calendar"></i> ${a.date}</p><p style="color:#555; font-size:0.9rem;">${a.description}</p></div></div>`;
    });
    grid.innerHTML = html;
}

// عرض التكوينات
async function loadPublicTrainings() {
    const grid = document.getElementById('public-trainings-grid');
    if (!grid) return;
    const { data: trs } = await supabaseClient.from('trainings').select('*').order('id', { ascending: false });
    if (!trs) return;
    let html = '';
    trs.forEach(t => {
        html += `<div style="background:white; padding:25px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.06); border-top:4px solid #c5a059;"><h4 style="color:#1b4d3e; margin-bottom:10px;"><i class="fa-solid fa-graduation-cap"></i> ${t.title}</h4><p style="font-size:0.9rem; color:#555; margin-bottom:5px;"><strong>المؤطر:</strong> ${t.trainer}</p><p style="font-size:0.8rem; color:#777; margin-bottom:15px;">${t.date}</p><div style="background:#f4ecdf; padding:10px; border-radius:8px; font-size:0.85rem; text-align:center; color:#1b4d3e;"><i class="fa-solid fa-lock"></i> محتوى حصري للمنخرطين عبر <a href="register.html" style="font-weight:bold;">فضاء المنخرط</a></div></div>`;
    });
    grid.innerHTML = html;
}

// إدارة لوحة المشرف وجلب المنخرطين
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

async function updateMemberField(id, field, val) {
    await supabaseClient.from('members').update({ [field]: val }).eq('id', id);
    loadAdminData();
}

async function deleteRecord(table, id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        await supabaseClient.from(table).delete().eq('id', id);
        loadAdminData();
    }
}
