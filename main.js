document.addEventListener('DOMContentLoaded', () => {
    // تفعيل جلب أسعار السوق والمؤشرات تلقائياً
    fetchGlobalMarketPrices();
    setInterval(fetchGlobalMarketPrices, 600000); // تحديث كل 10 دقائق

    if (document.getElementById('admin-members-table')) loadAdminData();
    if (document.getElementById('public-activities-grid')) loadPublicActivities();
    if (document.getElementById('public-trainings-grid')) loadPublicTrainings();
    if (document.getElementById('member-trainings-grid')) loadMemberTrainings();
    if (document.getElementById('public-news-grid')) loadPublicNews();
    if (document.getElementById('user-dashboard-info')) loadUserDashboard();
});

// أسعار دولية موثقة: تُجلب من ملف الأسعار الأسبوعية الرسمي للمفوضية الأوروبية عبر API خادمي.
// لا تُستخدم أرقام احتياطية أو أسعار افتراضية عند فشل المصدر.
async function fetchGlobalMarketPrices() {
    const tickerContainer = document.getElementById('live-market-ticker');
    if (!tickerContainer) return;
    tickerContainer.innerHTML = '<span>🫒 جارٍ جلب بيانات الأسعار الرسمية…</span>';
    try {
        const response = await fetch('/api/olive-oil-prices', { cache: 'no-store' });
        if (!response.ok) throw new Error('مصدر الأسعار غير متاح حالياً');
        const payload = await response.json();
        if (!payload || !Array.isArray(payload.prices) || payload.prices.length === 0) {
            throw new Error('لم تتوفر بيانات أسعار قابلة للعرض من المصدر الرسمي');
        }
        const entries = payload.prices.map(item => {
            const price = Number(item.price);
            if (!Number.isFinite(price) || !item.country || !item.category) return '';
            return `🇪🇺 ${item.country} — ${item.category}: ${price.toLocaleString('ar-MA', {maximumFractionDigits: 2})} ${item.unit || '€/100 kg'} — ${item.period || 'الفترة حسب المصدر'}`;
        }).filter(Boolean);
        if (!entries.length) throw new Error('لم يتم التعرف على قيم أسعار موثوقة في الملف الرسمي');
        const stamp = payload.sourceUpdated ? `تاريخ بيانات المصدر: ${payload.sourceUpdated}` : 'التاريخ حسب ملف المصدر';
        const source = `المصدر: المفوضية الأوروبية — أسعار أسبوعية رسمية لزيت الزيتون (${stamp})`;
        const local = await loadLocalMarketPricesForTicker();
        const marketData = [...entries, source, ...local];
        const escaped = marketData.map(item => `<span>${escapeTickerText(item)}</span>`).join('<b class="ticker-separator"> ✦ </b>');
        tickerContainer.innerHTML = `<div class="ticker-track"><div class="ticker-group">${escaped}</div><div class="ticker-group" aria-hidden="true">${escaped}</div></div>`;
        tickerContainer.title = `المصدر: ${payload.sourceUrl || 'المفوضية الأوروبية'} | آخر جلب ناجح: ${payload.fetchedAt ? new Date(payload.fetchedAt).toLocaleString('ar-MA') : 'غير متاح'}`;
    } catch (error) {
        console.error('تعذر جلب الأسعار الدولية الموثقة:', error);
        tickerContainer.innerHTML = `<span class="ticker-error">⚠️ تعذر تحديث الأسعار الدولية. لن نعرض أرقاماً تقديرية. <a href="https://agriculture.ec.europa.eu/data-and-analysis/markets/price-data/price-monitoring-sector/olive-oil_en" target="_blank" rel="noopener">اطّلع على المصدر الرسمي</a></span>`;
    }
}
function escapeTickerText(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
async function loadLocalMarketPricesForTicker() {
    try {
        const { data, error } = await supabaseClient.from('market_prices').select('*').order('id', { ascending: false }).limit(5);
        if (error || !data) return [];
        return data.map(row => `🇲🇦 سعر محلي مدخل من الإدارة (ليس سعراً دولياً): ${row.price_text}`);
    } catch (_) { return []; }
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
    const imageUrl = await uploadFileToSupabase('news-image-file');

    const { error } = await supabaseClient.from('news').insert([{ title, category, date, content, image_url: imageUrl || 'https://images.unsplash.com/photo-1589927986062-0ef777bb1f16?auto=format&fit=crop&w=600&q=80' }]);
    if (error) alert('خطأ: ' + error.message);
    else { alert('تم نشر الخبر بنجاح.'); e.target.reset(); loadAdminData(); }
}

// 6. عرض الأخبار العامة
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

// 7. عرض الأنشطة
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

// 8. عرض التكوينات العامة
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

// 9. عرض تكوينات المنخرطين الخاصة
async function loadMemberTrainings() {
    const grid = document.getElementById('member-trainings-grid');
    if (!grid) return;
    const { data: trs } = await supabaseClient.from('trainings').select('*').order('id', { ascending: false });
    if (!trs) return;
    let html = '';
    trs.forEach(t => {
        html += `<div style="background:white; padding:25px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.06); border-top:4px solid #1b4d3e;"><h4 style="color:#1b4d3e; margin-bottom:10px;"><i class="fa-solid fa-graduation-cap"></i> ${t.title}</h4><p style="font-size:0.9rem; color:#555;"><strong>المؤطر:</strong> ${t.trainer}</p><p style="font-size:0.8rem; color:#777; margin-bottom:15px;">${t.date}</p><p style="color:#444;">${t.description || 'محتوى تكويني تفصيلي للمنخرطين'}</p></div>`;
    });
    grid.innerHTML = html;
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
// تفعيل القوائم المنسدلة القابلة للطي بالضغط عليها
document.addEventListener('DOMContentLoaded', () => {
    const dropdowns = document.querySelectorAll('.nav-links li');
    dropdowns.forEach(item => {
        const link = item.querySelector('a');
        const menu = item.querySelector('.dropdown-menu');
        if (menu) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                // إغلاق الباقي
                dropdowns.forEach(d => {
                    if (d !== item) d.classList.remove('active');
                });
                item.classList.toggle('active');
            });
        }
    });

    // إغلاق القوائم عند النقر خارجها
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-links')) {
            dropdowns.forEach(d => d.classList.remove('active'));
        }
    });
});
// عرض تكوينات المنخرطين الخاصة (كاملة التفاصيل)
async function loadMemberTrainings() {
    const grid = document.getElementById('member-trainings-grid');
    if (!grid) return;
    const { data: trs } = await supabaseClient.from('trainings').select('*').order('id', { ascending: false });
    if (!trs) return;
    let html = '';
    trs.forEach(t => {
        html += `<div style="background:#fdfcf9; border: 1px solid #e8dfd1; padding: 20px; border-radius: 10px; border-right: 4px solid var(--accent-gold);">
            <h4 style="color:var(--primary-green); margin-bottom: 8px; font-size: 1.1rem;"><i class="fa-solid fa-graduation-cap"></i> ${t.title}</h4>
            <div style="display: flex; gap: 20px; font-size: 0.85rem; color: #666; margin-bottom: 12px;">
                <span><i class="fa-solid fa-chalkboard-user"></i> <strong>المؤطر:</strong> ${t.trainer}</span>
                <span><i class="fa-solid fa-calendar-days"></i> <strong>التاريخ:</strong> ${t.date}</span>
            </div>
            <p style="color:#444; font-size: 0.95rem; line-height: 1.6; background: white; padding: 12px; border-radius: 6px; border: 1px solid #eee;">${t.description || 'لا توجد تفاصيل إضافية مسجلة لهذا البرنامج التكويني حالياً.'}</p>
        </div>`;
    });
    grid.innerHTML = html;
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

