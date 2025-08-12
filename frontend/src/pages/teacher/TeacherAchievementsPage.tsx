import { useEffect, useState } from 'react';
import { useGetConnectedStudentsQuery } from '../../features/teacher/teacherApi';
import { 
  useGetTeacherAchievementsQuery,
  useGenerateAchievementImageMutation,
  useUploadAchievementImageMutation,
  useCreateAchievementMutation,
} from '../../features/achievements/achievementsApi';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function TeacherAchievementsPage() {
  const { t } = useTranslation();
  const { data: students = [] } = useGetConnectedStudentsQuery();
  const [studentId, setStudentId] = useState<string>(students[0]?.id || '');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [prompt, setPrompt] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: achievements = [] } = useGetTeacherAchievementsQuery({ studentId }, { skip: !studentId });
  const [generateImage, { isLoading: isGenerating }] = useGenerateAchievementImageMutation();
  const [uploadImage, { isLoading: isUploading }] = useUploadAchievementImageMutation();
  const [createAchievement, { isLoading: isCreating }] = useCreateAchievementMutation();

  // Ensure default student is selected when data loads
  useEffect(() => {
    if (!studentId && students.length > 0) {
      setStudentId(students[0].id);
    }
  }, [students, studentId]);

  const onGenerate = async () => {
    try {
      const res = await generateImage({ prompt: prompt || undefined, title: title || undefined, reason: reason || undefined }).unwrap();
      setPreviewUrl(res.imageUrl);
    } catch (e) {
      toast.error(t('achievements.generateError', { defaultValue: 'Failed to generate image' }));
    }
  };

  const onUpload = async (file?: File) => {
    try {
      if (!file) return;
      const res = await uploadImage({ file }).unwrap();
      setPreviewUrl(res.imageUrl);
    } catch {
      toast.error(t('achievements.uploadError', { defaultValue: 'Upload failed' }));
    }
  };

  const onCreate = async () => {
    try {
      if (!studentId || !title || !reason) return toast.error(t('achievements.fillRequired', { defaultValue: 'Fill all required fields' }));
      await createAchievement({ studentId, title, reason, imageUrl: previewUrl || undefined }).unwrap();
      toast.success(t('achievements.created', { defaultValue: 'Achievement created' }));
      setTitle('');
      setReason('');
      setPrompt('');
      setPreviewUrl(null);
    } catch {
      toast.error(t('achievements.createError', { defaultValue: 'Failed to create achievement' }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('achievements.title', { defaultValue: 'Achievements' })}</h1>

      <div className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">{t('achievements.student', { defaultValue: 'Student' })}</label>
            <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="" disabled>{t('achievements.selectStudent', { defaultValue: 'Select student' })}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName ?? ''} {s.lastName ?? ''} ({s.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('achievements.fieldTitle', { defaultValue: 'Title' })}</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('achievements.fieldTitlePlaceholder', { defaultValue: 'e.g. Math Master' }) as string} />
          </div>
          <div className="md:col-span-2">
            <label className="label">{t('achievements.fieldReason', { defaultValue: 'Reason' })}</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('achievements.fieldReasonPlaceholder', { defaultValue: 'Why the student earned it' }) as string} />
          </div>
          <div className="md:col-span-2">
            <label className="label">{t('achievements.prompt', { defaultValue: 'AI Image Prompt (optional)' })}</label>
            <textarea className="input min-h-24" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t('achievements.promptPlaceholder', { defaultValue: 'Describe the achievement image (optional)' }) as string} />
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn" onClick={onGenerate} disabled={isGenerating}>{isGenerating ? t('achievements.generating', { defaultValue: 'Generating…' }) : t('achievements.generate', { defaultValue: 'Generate Image' })}</button>
          <label className="btn-secondary cursor-pointer">
            <input type="file" className="hidden" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0] || undefined)} />
            {isUploading ? t('achievements.uploading', { defaultValue: 'Uploading…' }) : t('achievements.upload', { defaultValue: 'Upload Image' })}
          </label>
          <button className="btn-primary" onClick={onCreate} disabled={isCreating}>{isCreating ? t('common.saving', { defaultValue: 'Saving…' }) : t('achievements.create', { defaultValue: 'Create Achievement' })}</button>
        </div>
        {isGenerating && !previewUrl && (
          <div className="mt-3 flex items-center gap-2 text-gray-600">
            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span>{t('achievements.generating', { defaultValue: 'Generating…' })}</span>
          </div>
        )}
        {previewUrl && (
          <div className="mt-3">
            <div className="text-sm text-gray-600 mb-2">{t('achievements.preview', { defaultValue: 'Preview' })}</div>
            <img src={previewUrl} alt="Preview" className="w-full max-w-md rounded-lg" />
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">{t('achievements.recent', { defaultValue: 'Recent Achievements' })}</h2>
        {(!achievements || achievements.length === 0) ? (
          <div className="text-gray-600">{t('achievements.none', { defaultValue: 'No achievements yet.' })}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((a) => (
              <div key={a.id} className="card">
                {a.imageUrl && <img src={a.imageUrl} className="w-full h-40 object-cover rounded-lg" />}
                <div className="mt-3">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-sm text-gray-600">{a.reason}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
