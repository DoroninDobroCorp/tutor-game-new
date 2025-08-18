import { Droppable, Draggable } from '@hello-pangea/dnd';
import { ContentSection, Lesson } from '../../../types/models';
import { FiMove, FiTrash2, FiPlus, FiEdit2, FiSettings, FiShield } from 'react-icons/fi';
import { LessonStatusIndicator } from './LessonStatusIndicator';
import { useTranslation } from 'react-i18next';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

interface RoadmapSectionProps {
    section: ContentSection;
    sectionIndex: number;
    onRemoveSection: (index: number) => void;
    onAddLesson: (sectionIndex: number) => void;
    onRemoveLesson: (sectionIndex: number, lessonIndex: number) => void;
    onEditLesson: (lesson: Lesson, sectionIndex: number, lessonIndex: number) => void;
    onTitleChange: (value: string, sectionIndex: number, lessonIndex: number) => void;
    onSectionTitleChange: (value: string, sectionIndex: number) => void;
    editingTitle: { section: number | null; lesson: number | null };
    editingSectionIndex: number | null;
    setEditingSectionIndex: (index: number | null) => void;
    startEditing: (sectionIndex: number, lessonIndex: number) => void;
    stopEditing: () => void;
}

function classNames(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

export const RoadmapSection = ({
    section,
    sectionIndex,
    onRemoveSection,
    onAddLesson,
    onRemoveLesson,
    onEditLesson,
    onTitleChange,
    onSectionTitleChange,
    editingTitle,
    editingSectionIndex,
    setEditingSectionIndex,
    startEditing,
    stopEditing,
}: RoadmapSectionProps) => {
    const { t } = useTranslation();
    const regularLessons = section.lessons.filter(l => l.type !== 'CONTROL_WORK');
    const controlWorkLessons = section.lessons.filter(l => l.type === 'CONTROL_WORK');

    return (
        <Draggable draggableId={section.id} index={sectionIndex}>
            {(provided) => (
                <div 
                    ref={provided.innerRef} 
                    {...provided.draggableProps} 
                    style={provided.draggableProps.style} 
                    className="p-4 md:p-6 bg-white rounded-lg shadow-md"
                >
                    <div className="flex justify-between items-center mb-4" {...provided.dragHandleProps}>
                        <div className="flex items-center flex-grow min-w-0">
                            <FiMove className="text-gray-400 mr-3 cursor-grab flex-shrink-0" />
                            {editingSectionIndex === sectionIndex ? (
                                <Input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => onSectionTitleChange(e.target.value, sectionIndex)}
                                    onBlur={() => setEditingSectionIndex(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingSectionIndex(null)}
                                    autoFocus
                                    className="text-xl font-semibold border-b-2 border-gray-500 bg-transparent w-full focus:outline-none"
                                />
                            ) : (
                                <div className="flex items-center group" onClick={() => setEditingSectionIndex(sectionIndex)}>
                                    <Button 
                                        type="button"
                                        variant="ghost"
                                        className="mr-2 text-gray-500 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                                        title={t('roadmapSection.editTitle') as string}
                                        aria-label={t('roadmapSection.editTitle') as string}
                                    >
                                        <FiEdit2 />
                                    </Button>
                                    <h2 className="text-xl font-semibold cursor-pointer truncate">{section.title}</h2>
                                </div>
                            )}
                        </div>
                        <Button 
                            type="button"
                            onClick={() => onRemoveSection(sectionIndex)} 
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 p-1 ml-2 flex-shrink-0" 
                            title={t('roadmapSection.removeSection') as string}
                            aria-label={t('roadmapSection.removeSection') as string}
                        >
                            <FiTrash2 />
                        </Button>
                    </div>
                    
                    <Droppable droppableId={`lessons-${sectionIndex}`} type="LESSONS">
                        {(provided) => (
                            <ul 
                                {...provided.droppableProps} 
                                ref={provided.innerRef} 
                                className="space-y-3 pl-2 min-h-[50px]"
                            >
                                {regularLessons.map((lesson, lessonIndex) => {
                                    const isNewLesson = lesson.id.startsWith('new-');
                                    const originalLessonIndex = section.lessons.findIndex(l => l.id === lesson.id);

                                    return (
                                        <Draggable key={lesson.id} draggableId={lesson.id} index={lessonIndex}>
                                            {(provided) => (
                                                <li 
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    style={{...provided.draggableProps.style}}
                                                    className="flex items-center group bg-gray-50 p-2 rounded-md"
                                                >
                                                    <div {...provided.dragHandleProps} className="mr-2 text-gray-400 cursor-grab"><FiMove /></div>
                                                    <LessonStatusIndicator lesson={lesson} />
                                                    <div className="ml-2 flex-grow min-w-0">
                                                        {editingTitle.section === sectionIndex && editingTitle.lesson === originalLessonIndex ? (
                                                            <Input type="text" value={lesson.title} onChange={(e) => onTitleChange(e.target.value, sectionIndex, originalLessonIndex)} onBlur={stopEditing} onKeyDown={(e) => e.key === 'Enter' && stopEditing()} autoFocus className="border-b-2 border-gray-500 bg-transparent w-full focus:outline-none"/>
                                                        ) : (
                                                            <div className="flex items-center min-w-0" onClick={() => startEditing(sectionIndex, originalLessonIndex)}>
                                                                <Button type="button" variant="ghost" className="mr-2 text-gray-500 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" title={t('roadmapSection.editTitle') as string} aria-label={t('roadmapSection.editTitle') as string}><FiEdit2 size={14} /></Button>
                                                                <span className="cursor-pointer truncate">{lesson.title}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="relative ml-2" title={isNewLesson ? (t('roadmapSection.savePlanFirst') as string) : undefined}>
                                                        <Button type="button" onClick={() => !isNewLesson && onEditLesson(lesson, sectionIndex, originalLessonIndex)} disabled={isNewLesson} variant="ghost" className={classNames('transition-opacity flex items-center', isNewLesson ? 'cursor-not-allowed text-gray-300' : 'text-gray-500 hover:text-gray-600 opacity-0 group-hover:opacity-100')} title={!isNewLesson ? (t('roadmapSection.configureContent') as string) : undefined} aria-label={!isNewLesson ? (t('roadmapSection.configureContent') as string) : (t('roadmapSection.savePlanFirst') as string)}><FiSettings /></Button>
                                                    </span>
                                                    <Button type="button" onClick={() => onRemoveLesson(sectionIndex, originalLessonIndex)} variant="ghost" className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity" title={t('roadmapSection.removeLesson') as string} aria-label={t('roadmapSection.removeLesson') as string}><FiTrash2 size={14} /></Button>
                                                </li>
                                            )}
                                        </Draggable>
                                    )
                                })}
                                {provided.placeholder}
                            </ul>
                        )}
                    </Droppable>

                    {controlWorkLessons.map(cw => {
                        const originalLessonIndex = section.lessons.findIndex(l => l.id === cw.id);
                        return (
                            <div key={cw.id} className="mt-4 pt-4 border-t-2 border-dashed border-amber-300">
                                <div className="flex items-center bg-amber-50 p-2 rounded-md border border-amber-200">
                                    <FiShield className="mr-2 text-amber-600 flex-shrink-0" />
                                    <LessonStatusIndicator lesson={cw} />
                                    <div className="ml-2 flex-grow min-w-0">
                                        {editingTitle.section === sectionIndex && editingTitle.lesson === originalLessonIndex ? (
                                            <Input 
                                                type="text" 
                                                value={cw.title} 
                                                onChange={(e) => onTitleChange(e.target.value, sectionIndex, originalLessonIndex)} 
                                                onBlur={stopEditing} 
                                                onKeyDown={(e) => e.key === 'Enter' && stopEditing()} 
                                                autoFocus 
                                                className="border-b-2 border-amber-500 bg-transparent w-full focus:outline-none font-semibold text-amber-800"
                                            />
                                        ) : (
                                            <div className="flex items-center group min-w-0" onClick={() => startEditing(sectionIndex, originalLessonIndex)}>
                                                <Button type="button" variant="ghost" className="mr-2 text-amber-600 hover:text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity" title={t('roadmapSection.editTitle') as string} aria-label={t('roadmapSection.editTitle') as string}><FiEdit2 size={14} /></Button>
                                                <span className="font-semibold truncate text-amber-800 cursor-pointer">{cw.title}</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className="relative ml-4">
                                         <Button type="button" onClick={() => onEditLesson(cw, sectionIndex, originalLessonIndex)} variant='ghost' className='text-gray-500 hover:text-amber-800' title={t('roadmapSection.configureControlWork') as string} aria-label={t('roadmapSection.configureControlWork') as string}><FiSettings /></Button>
                                    </span>
                                    <Button type="button" onClick={() => onRemoveLesson(sectionIndex, originalLessonIndex)} variant="ghost" className="ml-2 text-red-500 hover:text-red-700" title={t('roadmapSection.removeControlWork') as string} aria-label={t('roadmapSection.removeControlWork') as string}><FiTrash2 size={14} /></Button>
                                </div>
                            </div>
                        );
                    })}

                    <Button 
                        type="button"
                        onClick={() => onAddLesson(sectionIndex)}
                        variant="ghost"
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800 mt-4 ml-2"
                    >
                        <FiPlus size={16} className="mr-1" />
                        {t('roadmapSection.addLesson')}
                    </Button>
                    
                </div>
            )}
        </Draggable>
    );
};
