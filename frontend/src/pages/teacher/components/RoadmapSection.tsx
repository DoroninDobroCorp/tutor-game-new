import { Droppable, Draggable } from '@hello-pangea/dnd';
import { ContentSection, Lesson } from '../../../types/models';
import { FiMove, FiTrash2, FiPlus, FiEdit2, FiSettings } from 'react-icons/fi';
import { LessonStatusIndicator } from './LessonStatusIndicator';

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
                                <input
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
                                    <button 
                                        className="mr-2 text-gray-500 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                                        title="Редактировать название"
                                    >
                                        <FiEdit2 />
                                    </button>
                                    <h2 className="text-xl font-semibold cursor-pointer truncate">{section.title}</h2>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => onRemoveSection(sectionIndex)} 
                            className="text-red-500 hover:text-red-700 p-1 ml-2 flex-shrink-0" 
                            title="Удалить раздел"
                        >
                            <FiTrash2 />
                        </button>
                    </div>
                    
                    <Droppable droppableId={`lessons-${sectionIndex}`} type="LESSONS">
                        {(provided) => (
                            <ul 
                                {...provided.droppableProps} 
                                ref={provided.innerRef} 
                                className="space-y-3 pl-2 min-h-[50px]"
                            >
                                {section.lessons.map((lesson, lessonIndex) => {
                                    const isNewLesson = lesson.id.startsWith('new-');
                                    return (
                                        <Draggable key={lesson.id} draggableId={lesson.id} index={lessonIndex}>
                                            {(provided) => (
                                                <li 
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                        // Add some animation when dragging
                                                        transition: 'all 0.2s',
                                                    }}
                                                    className="flex items-center group bg-gray-50 p-2 rounded-md"
                                                >
                                                    <div {...provided.dragHandleProps} className="mr-2 text-gray-400 cursor-grab">
                                                        <FiMove />
                                                    </div>
                                                    
                                                    <LessonStatusIndicator lesson={lesson} />
                                                    
                                                    <div className="ml-2 flex-grow min-w-0">
                                                        {editingTitle.section === sectionIndex && editingTitle.lesson === lessonIndex ? (
                                                            <input 
                                                                type="text" 
                                                                value={lesson.title} 
                                                                onChange={(e) => onTitleChange(e.target.value, sectionIndex, lessonIndex)}
                                                                onBlur={stopEditing}
                                                                onKeyDown={(e) => e.key === 'Enter' && stopEditing()}
                                                                autoFocus
                                                                className="border-b-2 border-gray-500 bg-transparent w-full focus:outline-none"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center min-w-0" onClick={() => startEditing(sectionIndex, lessonIndex)}>
                                                                <button 
                                                                    className="mr-2 text-gray-500 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Редактировать название"
                                                                >
                                                                    <FiEdit2 size={14} />
                                                                </button>
                                                                <span className="cursor-pointer truncate">
                                                                    {lesson.title}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <span className="relative ml-2" title={isNewLesson ? "Сначала сохраните план, чтобы редактировать урок" : undefined}>
                                                        <button 
                                                            onClick={() => !isNewLesson && onEditLesson(lesson, sectionIndex, lessonIndex)}
                                                            disabled={isNewLesson}
                                                            className={classNames(
                                                                'transition-opacity flex items-center',
                                                                isNewLesson 
                                                                    ? 'cursor-not-allowed text-gray-300'
                                                                    : 'text-gray-500 hover:text-gray-600 opacity-0 group-hover:opacity-100'
                                                            )}
                                                            title={!isNewLesson ? "Настроить контент" : undefined}
                                                        >
                                                            <FiSettings />
                                                        </button>
                                                    </span>
                                                    
                                                    <button 
                                                        onClick={() => onRemoveLesson(sectionIndex, lessonIndex)}
                                                        className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Удалить урок"
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </li>
                                            )}
                                        </Draggable>
                                    )
                                })}
                                {provided.placeholder}
                            </ul>
                        )}
                    </Droppable>
                    
                    <button 
                        onClick={() => onAddLesson(sectionIndex)}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800 mt-3 ml-2"
                    >
                        <FiPlus size={16} className="mr-1" />
                        Добавить урок
                    </button>
                </div>
            )}
        </Draggable>
    );
};
