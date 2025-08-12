import { useState, Fragment } from 'react';
import { useParams } from 'react-router-dom';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { FiX } from 'react-icons/fi';
import { type Lesson } from '../../types/models';
import { LessonContentEditor } from './components/LessonContentEditor';
import LessonStoryEditor from './components/LessonStoryEditor';
import { ControlWorkContentEditor } from './components/ControlWorkContentEditor';
import { useTranslation } from 'react-i18next';
import { DiagnosticTopicsModal } from './components/DiagnosticTopicsModal';

// Lightbox component is now defined and managed within the modal
const Lightbox = ({ src, onClose }: { src: string; onClose: () => void; }) => {
    const { t } = useTranslation();
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]" 
            onClick={onClose}
        >
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-white text-3xl hover:opacity-75"
            >
                <FiX />
            </button>
            <img 
                src={src} 
                alt={t('lessonEditor.fullView')} 
                className="max-w-[90vw] max-h-[90vh] object-contain" 
                onClick={(e) => e.stopPropagation()} 
            />
        </div>
    );
};

function classNames(...classes: (string | boolean)[]) {
    return classes.filter(Boolean).join(' ');
}

export default function LessonEditorModal({ isOpen, onClose, lesson }: { isOpen: boolean; onClose: () => void; lesson: Lesson | null; }) {
    const { t } = useTranslation();
    const { goalId } = useParams<{ goalId: string }>();
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState(0);
    const [diagModalOpen, setDiagModalOpen] = useState(false);

    if (!lesson) return null;

    const handleCloseModal = () => {
        setLightboxImage(null); // Ensure lightbox is closed when modal closes
        onClose();
    };
    
    return (
        <>
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={diagModalOpen ? () => {} : handleCloseModal}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all relative">
                                {/* Close button */}
                                <button
                                    aria-label={t('common.close')}
                                    onClick={handleCloseModal}
                                    className="absolute top-3 right-3 btn-secondary px-3 py-2"
                                >
                                    <FiX />
                                </button>

                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4 pr-10">
                                    {t('lessonEditor.title', { title: lesson.title })}
                                </Dialog.Title>

                                <Tab.Group selectedIndex={currentTab} onChange={setCurrentTab}>
                                    <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
                                        <Tab
                                            className={({ selected }) =>
                                                classNames(
                                                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                                    'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                                                    selected
                                                        ? 'bg-white text-blue-700 shadow'
                                                        : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                                                )
                                            }
                                        >
                                            {t('lessonEditor.lessonContent')}
                                        </Tab>
                                        <Tab
                                            className={({ selected }) =>
                                                classNames(
                                                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                                    'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                                                    selected
                                                        ? 'bg-white text-blue-700 shadow'
                                                        : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                                                )
                                            }
                                        >
                                            {t('lessonEditor.story')}
                                        </Tab>
                                    </Tab.List>
                                    <Tab.Panels className="mt-4">
                                        <Tab.Panel>
                                            {lesson.type === 'CONTROL_WORK' ? (
                                                <ControlWorkContentEditor 
                                                    lesson={lesson} 
                                                    onCloseModal={handleCloseModal}
                                                />
                                            ) : lesson.type === 'DIAGNOSTIC' ? (
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded">
                                                        <p className="text-sm text-amber-800">
                                                            {t('diagnostic.lessonContentInfo', 'Диагностический урок использует список тем. Сгенерируйте или отредактируйте темы ниже. Генерация и утверждение истории доступны на соседней вкладке.')}
                                                        </p>
                                                    </div>
                                                    <div className="p-4 bg-gray-50 border rounded">
                                                        <h4 className="text-sm font-semibold mb-2">{t('diagnostic.topics', 'Темы диагностики')}</h4>
                                                        {(lesson.content as any)?.topics?.length ? (
                                                            <ul className="list-disc pl-5 space-y-1">
                                                                {(lesson.content as any).topics.map((topic: any, idx: number) => {
                                                                    const isString = typeof topic === 'string';
                                                                    const title = isString ? topic : (topic?.title ?? '');
                                                                    const firstQuestion = isString ? undefined : (topic?.firstQuestion ?? undefined);
                                                                    return (
                                                                        <li key={idx} className="text-sm text-gray-700">
                                                                            <span className="font-medium">{title}</span>
                                                                            {firstQuestion ? (
                                                                                <span className="text-gray-500"> — {firstQuestion}</span>
                                                                            ) : null}
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-sm text-gray-500">{t('diagnostic.noTopics', 'Тем пока нет')}</p>
                                                        )}
                                                        <div className="mt-3">
                                                            <button type="button" className="btn-primary text-sm" onClick={() => setDiagModalOpen(true)}>
                                                                {t('diagnostic.editTopics', 'Сгенерировать/редактировать темы')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <LessonContentEditor 
                                                    lesson={lesson} 
                                                    onCloseModal={handleCloseModal}
                                                />
                                            )}
                                        </Tab.Panel>
                                        <Tab.Panel>
                                            <LessonStoryEditor 
                                                lesson={lesson}
                                                goalId={goalId!}
                                                onClose={handleCloseModal}
                                            />
                                        </Tab.Panel>
                                    </Tab.Panels>
                                </Tab.Group>

                                {/* Render lightbox here, managed by this component's state */}
                                {lightboxImage && (
                                    <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
        {diagModalOpen && goalId && lesson && (
            <DiagnosticTopicsModal
                isOpen={diagModalOpen}
                onClose={() => setDiagModalOpen(false)}
                goalId={goalId}
                lessonId={lesson.id}
                initialTopics={(lesson.content as any)?.topics}
            />
        )}
        </>
    );
}
