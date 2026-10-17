// إعداد الاتصال بقاعدة بيانات Supabase
// تنبيه: يجب أن يكون عنوان المشروع ومفتاح anon/public صحيحين من إعدادات Supabase.
const SUPABASE_URL = 'https://yogeqsykljpuipanybei.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_46eo92Prv6Ks0eYscB3OjA_DjlNAKBl';

// استعمال اسم مختلف لتفادي التعارض مع مكتبة window.supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadFileToSupabase(fileInputId) {
    const input = document.getElementById(fileInputId);
    if (!input || !input.files || !input.files[0]) return null;
    const file = input.files[0];
    const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-');
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
    const { data, error } = await supabaseClient.storage.from('namaa-media').upload(filePath, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw new Error(`تعذر رفع الملف «${file.name}»: ${error.message}`);
    const { data: publicData } = supabaseClient.storage.from('namaa-media').getPublicUrl(data.path);
    return publicData.publicUrl;
}
