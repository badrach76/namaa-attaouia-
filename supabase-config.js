// استبدل الروابط والمفاتيح الخاصة بمشروعك في Supabase
const SUPABASE_URL = 'https://yogeqsykljpuipanybei.supbase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_46eo92Prv6Ks0eYscB3OjA_DjlNAKBl';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// دالة مساعدة لرفع الملفات (صور/فيديوهات) مباشرة من الجهاز إلى Supabase Storage
async function uploadFileToSupabase(fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || fileInput.files.length === 0) return null;
    
    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36.substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage.from('namaa-media').upload(filePath, file);
    if (error) {
        alert('خطأ أثناء رفع الملف: ' + error.message);
        return null;
    }

    // جلب الرابط العام للملف المرفوع
    const { data: publicUrlData } = supabase.storage.from('namaa-media').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
      }
