document.addEventListener('DOMContentLoaded', () => {
    // تفعيل القوائم المنسدلة القابلة للطي
    const dropdowns = document.querySelectorAll('.nav-links li');
    dropdowns.forEach(item => {
        const link = item.querySelector('a');
        const menu = item.querySelector('.dropdown-menu');
        if (menu) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                dropdowns.forEach(d => {
                    if (d !== item) d.classList.remove('active');
                });
                item.classList.toggle('active');
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-links')) {
            dropdowns.forEach(d => d.classList.remove('active'));
        }
    });

    // تفعيل جلب أسعار السوق ومؤشرات البورصات تلقائياً
    fetchGlobalMarketPrices();
    setInterval(fetchGlobalMarketPrices, 600000);

    if (document.getElementById('admin-members-table')) loadAdminData();
    if (document.getElementById('admin-news-table')) loadAdminNewsAdmin();
    if (document.getElementById('admin-activities-table')) loadAdminActivitiesAdmin();
    if (document.getElementById('admin-trainings-table')) loadAdminTrainingsAdmin();
    if (document.getElementById('admin-local-prices-table')) loadAdminLocalPrices();

    if (document.getElementById('public-activities-grid')) loadPublicActivities();
    if (document.getElementById('public-trainings-grid')) loadPublicTrainings();
    if (document.getElementById('member-trainings-grid')) loadMemberTrainings();
    if (document.getElementById('public-news-grid')) loadPublicNews();
    if (document.getElementById('user-dashboard-info')) loadUserDashboard();
});

// دالة جلب أسعار السوق ومؤشرات البورصات الدولية والأسعار المحلية من Supabase
async function fetchGlobalMarketPrices() {
    const tickerContainer = document.getElementById('live-market-ticker');
    if (!tickerContainer) return;

    try {
        let marketData = [
            "🏛️ مرجعيات المجلس الدولي لزيت الزيتون (IOC): اعتماد معايير الجودة والشفافية الدولية",
            "🇪🇸 بورصة إسبانيا (أندلسية - Extra Virgin): 8.35 - 8.50 أورو / لتر",
            "🇮🇹 بورصة إيطاليا (باري - Extra Virgin): 9.00 - 9.20 أورو / لتر",
            "🇹🇳 السوق التونسية (تصدير - معايير IOC): 22.00 - 23.00 دينار / لتر",
            "🌱 مؤشر العصر والإنتاج الإقليمي (العصر على البارد): مستقر في حدود 18%"
        ];

        const { data: localPrices, error } = await supabaseClient.from('market_prices').select('*');
        if (!error && localPrices && localPrices.length > 0) {
            localPrices.forEach(item => {
                marketData.push(`🇲🇦 ${item.price_text}`);
            });
        }

        let tickerHTML = "";
        for (let i = 0; i < 2; i++) {
            marketData.forEach(item => {
                tickerHTML += `<span>${item}</span> | `;
            });
        }

        tickerContainer.innerHTML = tickerHTML;
    } catch (error) {
        console.error('تعذر تحديث أسعار السوق:', error);
    }
}
document.addEventListener('DOMContentLoaded', () => {
  // 1. تفعيل القائمة المنسدلة القابلة للطي
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle-btn');
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const menu = toggle.nextElementSibling;
      if (menu && menu.classList.contains('dropdown-menu-collapsible')) {
        menu.classList.toggle('show');
      }
    });
  });

  // إغلاق القائمة عند النقر خارجها
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-container')) {
      document.querySelectorAll('.dropdown-menu-collapsible').forEach(menu => {
        menu.classList.remove('show');
      });
    }
  });

  // 2. تهيئة عارضة الأسعار لضمان الاستمرارية
  initTicker();

  // 3. التحقق من الصفحة الحالية وجلب البيانات المناسبة (إدارة / منخرط)
  if (document.body.classList.contains('admin-dashboard-page')) {
    loadAdminPreviousAchievements();
  }

  if (document.body.classList.contains('user-dashboard-page')) {
    loadMemberCompleteTrainings();
  }
});

// وظيفة عارضة الأسعار
function initTicker() {
  const tickerWrapper = document.querySelector('.ticker-wrapper');
  if (tickerWrapper) {
    // التأكد من تكرار المحتوى بسلاسة إن لزم الأمر
    tickerWrapper.style.animationPlayState = 'running';
  }
}

// جلب الإنجازات السابقة في لوحة الإدارة (الأنشطة، التكوين، الأخبار)
async function loadAdminPreviousAchievements() {
  try {
    if (typeof supabaseClient === 'undefined') return;
    
    // مثال لجلب الأرشيف للوحات الإدارة
    const tables = ['activities', 'trainings', 'news'];
    for (const table of tables) {
      const { data, error } = await supabaseClient
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const container = document.getElementById(`admin-${table}-archive`);
        if (container) {
          container.innerHTML = data.map(item => `
            <div class="archive-item p-3 mb-2 border rounded bg-light">
              <h5>${item.title || item.name}</h5>
              <p>${item.description || item.content || ''}</p>
              <small class="text-muted">تاريخ النشر: ${new Date(item.created_at).toLocaleDateString('ar-MA')}</small>
            </div>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.error('خطأ في تحميل إنجازات لوحة الإدارة:', err);
  }
}

// جلب التكوينات كاملة (صور، نص، بيانات) داخل فضاء المنخرط
async function loadMemberCompleteTrainings() {
  try {
    if (typeof supabaseClient === 'undefined') return;

    const { data, error } = await supabaseClient
      .from('trainings')
      .select('id, title, description, image_url, start_date, location, trainer')
      .order('start_date', { ascending: false });

    if (error) throw error;

    const container = document.getElementById('member-trainings-list');
    if (container && data) {
      container.innerHTML = data.map(training => `
        <div class="col-md-4 mb-4">
          <div class="card h-100 shadow-sm border-0">
            ${training.image_url ? `<img src="${training.image_url}" class="card-img-top" alt="${training.title}" style="height: 180px; object-fit: cover;">` : ''}
            <div class="card-body">
              <h5 class="card-title text-success font-weight-bold">${training.title}</h5>
              <p class="card-text text-muted">${training.description || 'لا توجد تفاصيل متاحة حالياً.'}</p>
              <ul class="list-unstyled small mb-3">
                <li><strong>التاريخ:</strong> ${training.ئنart_date || 'يحدد لاحقاً'}</li>
                <li><strong>المؤطر:</strong> ${training.trainer || 'غير محدد'}</li>
                <li><strong>المكان:</strong> ${training.location || 'العطاوية'}</li>
              </ul>
              <button class="btn btn-outline-success btn-sm btn-block" onclick="viewTrainingDetails('${training.id}')">عرض التفاصيل كاملة</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('خطأ في جلب تكوينات المنخرط:', err);
  }
}


// تسجيل دخول المشرف
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

// تسجيل دخول المنخرط
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

// عرض لوحة تحكم المنخرط
async function loadUserDashboard() {
    const member = JSON.parse(sessionStorage.getItem('currentMember'));
    if (!member) { 
        window.location.href = 'register.html'; 
        return; 
    }
    const infoBox = document.getElementById('user-dashboard-info');
    if (infoBox) {
        infoBox.innerHTML = `
            <h3 style="color:var(--primary-green); margin-bottom:10px;">مرحباً بك، ${member.name}</h3>
            <p><strong>المعصرة:</strong> ${member.mill}</p>
            <p><strong>رقم الهاتف:</strong> ${member.phone}</p>
            <p><strong>نوع الانخراط:</strong> ${member.type}</p>
            <p><strong>حالة الانخراط:</strong> ${member.status}</p>
            <p><strong>الانخراط السنوي:</strong> ${member.annual_fee}</p>
        `;
    }
    
    // تعبئة حقول التعديل المباشر
    if (document.getElementById('update-name')) {
        document.getElementById('update-name').value = member.name || '';
        document.getElementById('update-mill').value = member.mill || '';
        document.getElementById('update-phone').value = member.phone || '';
    }
    
    loadMemberTrainings();
}

// تحديث بيانات المنخرط الشخصية
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
        Object.assign(member, updateData);
        sessionStorage.setItem('currentMember', JSON.stringify(member));
        location.reload();
    }
}

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

// نشر خبر جديد
async function handleAddNews(e) {
    e.preventDefault();
    const title = document.getElementById('news-title').value;
    const category = document.getElementById('news-category').value;
    const date = document.getElementById('news-date').value;
    const content = document.getElementById('news-content').value;
    const imageUrl = await uploadFileToSupabase('news-image-file');

    const { error } = await supabaseClient.from('news').insert([{ title, category, date, content, image_url: imageUrl || 'https://images.unsplash.com/photo-1589927986062-0ef777bb1f16?auto=format&fit=crop&w=600&q=80' }]);
    if (error) alert('خطأ: ' + error.message);
    else { alert('تم نشر الخبر بنجاح.'); e.target.reset(); loadAdminNewsAdmin(); }
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

// عرض الأنشطة العامة
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

// عرض التكوينات العامة
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

// عرض تكوينات المنخرطين الخاصة كاملة التفاصيل
async function loadMemberTrainings() {
    const grid = document.getElementById('member-trainings-grid');
    if (!grid) return;
    const { data: trs } = await supabaseClient.from('trainings').select('*').order('id', { ascending: false });
    if (!trs) return;
    let html = '';
    trs.forEach(t => {
        html += `<div style="background:#fdfcf9; border: 1px solid #e8dfd1; padding: 20px; border-radius: 10px; border-right: 4px solid var(--accent-gold); margin-bottom: 15px;">
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

// تدبير الأسعار المحلية في لوحة المشرف
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

async function loadAdminLocalPrices() {
    const table = document.getElementById('admin-local-prices-table');
    if (!table) return;
    const { data: prices } = await supabaseClient.from('market_prices').select('*').order('id', { ascending: false });
    let html = '';
    if (prices && prices.length > 0) {
        prices.forEach(p => {
            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;">${p.price_text}</td>
                <td style="padding:10px;"><button class="btn-danger" onclick="deleteRecord('market_prices', ${p.id}); loadAdminLocalPrices();" style="background:#c0392b; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">حذف</button></td>
            </tr>`;
        });
    } else {
        html = `<tr><td colspan="2" style="padding:15px; text-align:center; color:#777;">لا توجد أسعار محلية مسجلة حالياً.</td></tr>`;
    }
    table.innerHTML = html;
}

// إدارة المنخرطين في لوحة المشرف
async function loadAdminData() {
    const { data: members } = await supabaseClient.from('members').select('*').order('id', { ascending: false });
    const table = document.getElementById('admin-members-table');
    if (!members || !table) return;
    let html = '';
    members.forEach(m => {
        let badgeClass = m.status === 'مقبول' ? 'badge-success' : 'badge-danger';
        let waBtn = m.status === 'مقبول' ? `<a href="https://wa.me/${m.phone}?text=مرحباً%20${m.name}،%20تم تفعيل حسابكم بجمعية نماء العطاوية. المستخدم: ${m.username} | الرمز: ${m.password}" target="_blank" style="background:#25d366; color:white; padding:3px 6px; border-radius:4px; text-decoration:none; font-size:0.7rem; display:inline-block; margin-top:3px;"><i class="fa-brands fa-whatsapp"></i> واتساب</a>` : '';
        html += `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px;"><strong>${m.name}</strong></td>
            <td style="padding:10px;">${m.mill}</td>
            <td style="padding:10px; direction:ltr;">${m.phone}</td>
            <td style="padding:10px;"><select onchange="updateMemberField(${m.id}, 'annual_fee', this.value)" style="padding:2px;"><option value="مؤدى" ${m.annual_fee==='مؤدى'?'selected':''}>مؤدى</option><option value="غير مؤدى" ${m.annual_fee==='غير مؤدى'?'selected':''}>غير مؤدى</option></select></td>
            <td style="padding:10px;"><span class="badge ${badgeClass}">${m.status}</span><br>${waBtn}</td>
            <td style="padding:10px;">
                <button onclick="editMemberStatus(${m.id}, '${m.status}')" style="background:#1b4d3e; color:white; padding:4px 8px; border-radius:4px; border:none; cursor:pointer; font-size:0.75rem; margin-left:4px;">تعديل</button>
                <button class="btn-danger" onclick="deleteRecord('members', ${m.id})" style="background:#c0392b; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem;">حذف</button>
            </td>
        </tr>`;
    });
    table.innerHTML = html;
}

async function editMemberStatus(id, currentStatus) {
    const newStatus = prompt("أدخل الحالة الجديدة للمنخرط (مثال: مقبول أو معالجة):", currentStatus);
    if (newStatus !== null && newStatus.trim() !== "") {
        const { error } = await supabaseClient.from('members').update({ status: newStatus.trim() }).eq('id', id);
        if (error) alert("خطأ أثناء التعديل: " + error.message);
        else { alert("تم التعديل بنجاح!"); loadAdminData(); }
    }
}

async function updateMemberField(id, field, val) {
    await supabaseClient.from('members').update({ [field]: val }).eq('id', id);
    loadAdminData();
}

async function deleteRecord(table, id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        const { error } = await supabaseClient.from(table).delete().eq('id', id);
        if (error) alert('خطأ أثناء الحذف: ' + error.message);
        else {
            alert('تم الحذف بنجاح.');
            if (table === 'members') loadAdminData();
            if (table === 'market_prices') loadAdminLocalPrices();
        }
    }
}
