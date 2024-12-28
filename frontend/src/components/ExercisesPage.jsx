import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  VStack,
  Heading,
  Text,
  useToast,
  HStack,
  IconButton,
  Spacer,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon, AddIcon } from '@chakra-ui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { teacherAPI } from '../api/api';

export default function ExercisesPage() {
  const [plan, setPlan] = useState(null);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newExercise, setNewExercise] = useState({
    question: '',
    answer: '',
    explanation: '',
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { planId, topicId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPlan();
  }, [planId]);

  useEffect(() => {
    if (plan && plan.topics) {
      const topic = plan.topics.find(t => t.id === topicId);
      setCurrentTopic(topic);
    }
  }, [plan, topicId]);

  const loadPlan = async () => {
    if (planId) {
      setIsLoading(true);
      try {
        const loadedPlan = await teacherAPI.getPlan(planId);
        setPlan(loadedPlan);
        console.log('Loaded plan:', loadedPlan);
      } catch (error) {
        console.error('Error loading plan:', error);
        toast({
          title: 'Ошибка',
          description: error.message,
          status: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTopicChange = (newTopicId) => {
    navigate(`/teacher/exercises/${planId}/${newTopicId}`);
  };

  const handleBackToPlan = () => {
    navigate(`/teacher/plan/${planId}`);
  };

  const handleGenerateExercises = async () => {
    setIsLoading(true);
    try {
      console.log('Generating exercises for topic:', currentTopic.id);
      await teacherAPI.generateExercises(planId, currentTopic.id);
      await loadPlan(); // Перезагружаем план для получения новых упражнений
      toast({
        title: 'Упражнения сгенерированы',
        status: 'success',
      });
    } catch (error) {
      console.error('Error generating exercises:', error);
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExercise = async (exerciseId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это упражнение?')) {
      return;
    }

    setIsLoading(true);
    try {
      console.log('Deleting exercise:', exerciseId);
      await teacherAPI.deleteExercise(planId, currentTopic.id, exerciseId);
      await loadPlan(); // Перезагружаем план
      toast({
        title: 'Упражнение удалено',
        status: 'success',
      });
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExercise = async () => {
    if (!newExercise.question || !newExercise.answer) {
      toast({
        title: 'Ошибка',
        description: 'Заполните вопрос и ответ',
        status: 'warning',
      });
      return;
    }

    setIsLoading(true);
    try {
      await teacherAPI.addExercise(planId, currentTopic.id, newExercise);
      await loadPlan();
      onClose();
      setNewExercise({ question: '', answer: '', explanation: '' });
      toast({
        title: 'Упражнение добавлено',
        status: 'success',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!plan || !currentTopic) {
    return (
      <Container maxW="container.md" py={8}>
        <Text>Загрузка...</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={8} align="stretch">
        <HStack>
          <Button onClick={handleBackToPlan}>Вернуться к плану</Button>
          <Spacer />
          <Select
            value={currentTopic.id}
            onChange={(e) => handleTopicChange(e.target.value)}
            maxW="400px"
          >
            {plan.topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </Select>
        </HStack>

        <Box>
          <Heading size="lg" mb={2}>
            {currentTopic.name}
          </Heading>
          <Text color="gray.600" mb={4}>
            {currentTopic.description}
          </Text>
        </Box>

        <HStack spacing={4}>
          <Button
            colorScheme="blue"
            onClick={handleGenerateExercises}
            isLoading={isLoading}
            leftIcon={<AddIcon />}
          >
            Сгенерировать упражнения
          </Button>
          <Button
            onClick={onOpen}
            leftIcon={<AddIcon />}
            colorScheme="green"
          >
            Добавить своё упражнение
          </Button>
        </HStack>

        <VStack spacing={4} align="stretch">
          {currentTopic.exercises && currentTopic.exercises.length > 0 ? (
            currentTopic.exercises.map((exercise, index) => (
              <Box
                key={exercise.id}
                p={4}
                borderWidth={1}
                borderRadius="md"
                position="relative"
              >
                <HStack justify="space-between" align="start">
                  <VStack align="start" flex={1}>
                    <Text fontWeight="bold">
                      Упражнение {index + 1}
                    </Text>
                    <Text>{exercise.question}</Text>
                    <Text color="green.500">
                      Ответ: {exercise.answer}
                    </Text>
                    {exercise.explanation && (
                      <Text color="gray.600" fontSize="sm">
                        Объяснение: {exercise.explanation}
                      </Text>
                    )}
                  </VStack>
                  <IconButton
                    icon={<DeleteIcon />}
                    onClick={() => handleDeleteExercise(exercise.id)}
                    colorScheme="red"
                    variant="ghost"
                    aria-label="Удалить упражнение"
                  />
                </HStack>
              </Box>
            ))
          ) : (
            <Text color="gray.500" textAlign="center">
              Нет упражнений. Нажмите "Сгенерировать упражнения" для создания новых или добавьте своё упражнение.
            </Text>
          )}
        </VStack>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Добавить упражнение</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Вопрос</FormLabel>
                <Textarea
                  value={newExercise.question}
                  onChange={(e) => setNewExercise({ ...newExercise, question: e.target.value })}
                  placeholder="Введите вопрос..."
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Ответ</FormLabel>
                <Input
                  value={newExercise.answer}
                  onChange={(e) => setNewExercise({ ...newExercise, answer: e.target.value })}
                  placeholder="Введите правильный ответ..."
                />
              </FormControl>
              <FormControl>
                <FormLabel>Объяснение (необязательно)</FormLabel>
                <Textarea
                  value={newExercise.explanation}
                  onChange={(e) => setNewExercise({ ...newExercise, explanation: e.target.value })}
                  placeholder="Введите объяснение..."
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Отмена
            </Button>
            <Button colorScheme="blue" onClick={handleAddExercise} isLoading={isLoading}>
              Добавить
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
