import { useState } from 'react';
import { useGetConnectedStudentsQuery } from '../../features/teacher/teacherApi';
import { 
  useGetTeacherAchievementsQuery,
  useGenerateAchievementImageMutation,
  useUploadAchievementImageMutation,
  useCreateAchievementMutation,
} from '../../features/achievements/achievementsApi';
import toast from 'react-hot-toast';

export default function TeacherAchievementsPage() {
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

  const onGenerate = async () => {
    try {
      if (!prompt) return toast.error('Enter a prompt');
      const res = await generateImage({ prompt }).unwrap();
      setPreviewUrl(res.imageUrl);
    } catch (e) {
      toast.error('Failed to generate image');
    }
  };

  const onUpload = async (file?: File) => {
    try {
      if (!file) return;
      const res = await uploadImage({ file }).unwrap();
      setPreviewUrl(res.imageUrl);
    } catch {
      toast.error('Upload failed');
    }
  };

  const onCreate = async () => {
    try {
      if (!studentId || !title || !reason) return toast.error('Fill all required fields');
      await createAchievement({ studentId, title, reason, imageUrl: previewUrl || undefined }).unwrap();
      toast.success('Achievement created');
      setTitle('');
      setReason('');
      setPrompt('');
      setPreviewUrl(null);
    } catch {
      toast.error('Failed to create achievement');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Achievements</h1>

      <div className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Student</label>
            <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="" disabled>Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName ?? ''} {s.lastName ?? ''} ({s.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Math Master" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Reason</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why the student earned it" />
          </div>
          <div className="md:col-span-2">
            <label className="label">AI Image Prompt</label>
            <textarea className="input min-h-24" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the achievement image" />
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn" onClick={onGenerate} disabled={isGenerating}>Generate Image</button>
          <label className="btn-secondary cursor-pointer">
            <input type="file" className="hidden" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0] || undefined)} />
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </label>
          <button className="btn-primary" onClick={onCreate} disabled={isCreating}>Create Achievement</button>
        </div>
        {previewUrl && (
          <div className="mt-3">
            <div className="text-sm text-gray-600 mb-2">Preview</div>
            <img src={previewUrl} alt="Preview" className="w-full max-w-md rounded-lg" />
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Recent Achievements</h2>
        {(!achievements || achievements.length === 0) ? (
          <div className="text-gray-600">No achievements yet.</div>
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
