// إعدادات الاتصال بقاعدة البيانات ورفع الملفات
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// دالة رفع الصور والفيديوهات مباشرة من الجهاز إلى Supabase Storage (Bucket: namaa-media)
async function uploadFileToSupabase(fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || fileInput.files.length === 0) return null;
    
    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error } = await supabase.storage.from('namaa-media').upload(fileName, file);
    if (error) {
        alert('خطأ أثناء رفع الملف: ' + error.message);
        return null;
    }

    const { data: publicUrlData } = supabase.storage.from('namaa-media').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
}
