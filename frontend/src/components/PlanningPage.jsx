import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Textarea,
  VStack,
  Text,
  useToast,
  IconButton,
  HStack,
  Spacer,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { DragHandleIcon, CheckIcon, AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { teacherAPI } from '../api/api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export default function PlanningPage() {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { planId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newPlan = await teacherAPI.createPlan(subject, description);
      setPlan(newPlan);
      toast({
        title: 'План создан',
        description: 'Черновик плана успешно создан',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePlan = async () => {
    setIsLoading(true);
    try {
      const updatedPlan = await teacherAPI.approvePlan(plan.id);
      setPlan(updatedPlan);
      toast({
        title: 'План утвержден',
        description: 'Теперь вы можете наполнить темы упражнениями',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      if (updatedPlan.topics.length > 0) {
        navigate(`/teacher/exercises/${plan.id}/${updatedPlan.topics[0].id}`);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTopic = async (topicId) => {
    setIsLoading(true);
    try {
      const updatedPlan = await teacherAPI.approveTopic(plan.id, topicId);
      setPlan(updatedPlan);
      toast({
        title: 'Тема утверждена',
        description: 'Тема успешно утверждена',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    setIsLoading(true);
    try {
      const updatedPlan = await teacherAPI.deleteTopic(plan.id, topicId);
      setPlan(updatedPlan);
      toast({
        title: 'Тема удалена',
        description: 'Тема успешно удалена',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) {
      return;
    }

    if (result.destination.index === result.source.index) {
      return;
    }

    const newTopics = reorder(
      plan.topics,
      result.source.index,
      result.destination.index
    );

    setPlan({ ...plan, topics: newTopics });

    try {
      const topicIds = newTopics.map((topic) => topic.id);
      await teacherAPI.updateTopicsOrder(plan.id, topicIds);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleRequestMoreTopics = async () => {
    setIsLoading(true);
    try {
      const updatedPlan = await teacherAPI.requestMoreTopics(plan.id);
      setPlan(updatedPlan);
      toast({
        title: 'Темы добавлены',
        description: 'Новые темы успешно добавлены',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');

  const handleAddCustomTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название темы',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const updatedPlan = await teacherAPI.addCustomTopic(plan.id, {
        name: newTopicName,
        description: newTopicDescription || '',
      });
      setPlan(updatedPlan);
      setNewTopicName('');
      setNewTopicDescription('');
      toast({
        title: 'Тема добавлена',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToPlans = () => {
    navigate('/'); // Теперь ведет на главную
  };

  const handleTopicClick = (topicId) => {
    if (plan && topicId) {
      navigate(`/teacher/exercises/${plan.id}/${topicId}`);
    }
  };

  const handleEditExercise = (topicId, exercise) => {
    setEditingExercise(exercise);
    setEditingTopicId(topicId);
    onOpen();
  };

  const handleSaveExercise = async () => {
    if (!editingExercise.question || !editingExercise.answer) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await teacherAPI.updateExercise(plan.id, editingTopicId, editingExercise.id, editingExercise);
      const updatedPlan = await teacherAPI.getPlan(plan.id);
      setPlan(updatedPlan);
      toast({
        title: 'Упражнение обновлено',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlan = async () => {
    if (planId) {
      setIsLoading(true);
      try {
        const loadedPlan = await teacherAPI.getPlan(planId);
        setPlan(loadedPlan);
      } catch (error) {
        toast({
          title: 'Ошибка',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteExercise = async (topicId, exerciseId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это упражнение?')) {
      return;
    }

    setIsLoading(true);
    try {
      const updatedPlan = await teacherAPI.deleteExercise(plan.id, topicId, exerciseId);
      setPlan(updatedPlan);
      setEditingExercise(null);
      setEditingTopicId(null);
      toast({
        title: 'Упражнение удалено',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateExercises = async (topicId) => {
    setIsLoading(true);
    try {
      await teacherAPI.generateExercises(plan.id, topicId);
      const updatedPlan = await teacherAPI.getPlan(plan.id);
      setPlan(updatedPlan);
      toast({
        title: 'Упражнения сгенерированы',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderTopic = (topic, index) => (
    <Draggable key={topic.id} draggableId={topic.id} index={index}>
      {(provided) => (
        <Box
          ref={provided.innerRef}
          {...provided.draggableProps}
          borderWidth={1}
          borderRadius="md"
          p={4}
          mb={4}
          cursor="pointer"
          onClick={() => handleTopicClick(topic.id)}
          _hover={{ boxShadow: "md" }}
        >
          <HStack>
            <Box {...provided.dragHandleProps}>
              <DragHandleIcon />
            </Box>
            <VStack align="start" flex={1} spacing={1}>
              <Text fontWeight="bold">
                {topic.name}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {topic.description}
              </Text>
              {topic.exercises && topic.exercises.length > 0 && (
                <Text color="blue.500" fontSize="sm">
                  Упражнений: {topic.exercises.length}
                </Text>
              )}
            </VStack>
            <HStack>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={() => navigate(`/teacher/exercises/${plan.id}/${topic.id}`)}
              >
                Упражнения
              </Button>
              <IconButton
                icon={<DeleteIcon />}
                onClick={() => handleDeleteTopic(topic.id)}
                colorScheme="red"
                variant="ghost"
                aria-label="Удалить тему"
              />
            </HStack>
          </HStack>
        </Box>
      )}
    </Draggable>
  );

  useEffect(() => {
    loadPlan();
  }, [planId]);

  return (
    <Container maxW="container.lg" py={8}>
      {!plan ? (
        <VStack spacing={4} align="stretch">
          <Heading size="lg">Создание плана</Heading>
          <form onSubmit={handleCreatePlan}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Предмет</FormLabel>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Например: Математика"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Описание</FormLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите цели и задачи плана обучения..."
                />
              </FormControl>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isLoading}
              >
                Создать план
              </Button>
            </VStack>
          </form>
        </VStack>
      ) : (
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Heading size="lg">{plan.subject}</Heading>
              <Text color="gray.600">{plan.description}</Text>
            </VStack>
            <Button
              colorScheme="green"
              onClick={handleApprovePlan}
              isLoading={isLoading}
              leftIcon={<CheckIcon />}
            >
              Утвердить план
            </Button>
          </HStack>

          <HStack spacing={4}>
            <Button
              onClick={handleRequestMoreTopics}
              isLoading={isLoading}
              leftIcon={<AddIcon />}
            >
              Добавить темы через AI
            </Button>
            <Button
              onClick={onOpen}
              leftIcon={<AddIcon />}
            >
              Добавить свою тему
            </Button>
          </HStack>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="topics">
              {(provided) => (
                <VStack
                  spacing={4}
                  align="stretch"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {plan.topics.map((topic, index) => renderTopic(topic, index))}
                  {provided.placeholder}
                </VStack>
              )}
            </Droppable>
          </DragDropContext>

          <Modal isOpen={isOpen} onClose={() => { onClose(); setEditingExercise(null); }}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Редактировать упражнение</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Вопрос</FormLabel>
                    <Input
                      value={editingExercise?.question}
                      onChange={(e) => setEditingExercise({ ...editingExercise, question: e.target.value })}
                      placeholder="Введите вопрос"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Ответ</FormLabel>
                    <Input
                      value={editingExercise?.answer}
                      onChange={(e) => setEditingExercise({ ...editingExercise, answer: e.target.value })}
                      placeholder="Введите ответ"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Объяснение</FormLabel>
                    <Textarea
                      value={editingExercise?.explanation}
                      onChange={(e) => setEditingExercise({ ...editingExercise, explanation: e.target.value })}
                      placeholder="Введите объяснение"
                    />
                  </FormControl>
                </VStack>
              </ModalBody>
              <ModalFooter>
                <Button colorScheme="blue" onClick={handleSaveExercise}>
                  Сохранить
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </VStack>
      )}
    </Container>
  );
}
