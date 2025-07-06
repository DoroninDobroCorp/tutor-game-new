import { useState } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { FiX } from 'react-icons/fi';
// Импортируем тип Lesson из центрального файла goalApi.ts
import { type Lesson } from '../../features/goal/goalApi';
import { LessonContentEditor } from './components/LessonContentEditor';
import { LessonStoryEditor } from './components/LessonStoryEditor';

// Lightbox component for image preview
const Lightbox = ({ src, onClose }: { src: string; onClose: () => void; }) => {
    if (!src) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white text-3xl"><FiX /></button>
            <img src={src} alt="Full view" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
    );
};

function classNames(...classes: (string | boolean)[]) {
    return classes.filter(Boolean).join(' ');
}

export default function LessonEditorModal({ isOpen, onClose, lesson }: { isOpen: boolean; onClose: () => void; lesson: Lesson | null; }) {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [currentTab, setCurrentTab] = useState(0);

    if (!lesson) return null;

    return (
        <Transition appear show={isOpen} as="div">
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child
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
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                                    Редактирование урока: {lesson.title}
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
                                            Контент урока
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
                                            История
                                        </Tab>
                                    </Tab.List>
                                    <Tab.Panels className="mt-4">
                                        <Tab.Panel>
                                            <LessonContentEditor 
                                                lesson={lesson} 
                                                onCloseModal={onClose} 
                                                onContentSaved={() => {}} 
                                            />
                                        </Tab.Panel>
                                        <Tab.Panel>
                                            <LessonStoryEditor 
                                                lesson={lesson}
                                                onCloseModal={onClose}
                                                onStorySaved={() => {}}
                                            />
                                        </Tab.Panel>
                                    </Tab.Panels>
                                </Tab.Group>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
                
                {isLightboxOpen && lesson.storyChapter?.teacherSnippetImageUrl && (
                    <Lightbox 
                        src={lesson.storyChapter.teacherSnippetImageUrl} 
                        onClose={() => setIsLightboxOpen(false)} 
                    />
                )}
            </Dialog>
        </Transition>
    );
}