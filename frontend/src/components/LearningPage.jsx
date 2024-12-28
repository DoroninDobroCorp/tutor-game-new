import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Image,
  Badge,
  useToast,
  Textarea,
  Progress,
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { studentAPI } from '../api/api';

export default function LearningPage() {
  const { planId } = useParams();
  const [plan, setPlan] = useState(null);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [story, setStory] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const toast = useToast();

  useEffect(() => {
    loadPlan();
  }, [planId]);

  useEffect(() => {
    if (plan && !currentTopic) {
      // Находим первую неутвержденную тему
      const topic = plan.topics.find((t) => !t.completed);
      if (topic) {
        setCurrentTopic(topic);
        loadStory(topic.id);
      }
    }
  }, [plan]);

  const loadPlan = async () => {
    try {
      const data = await studentAPI.getPlan(planId);
      setPlan(data);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
      });
    }
  };

  const loadStory = async (topicId) => {
    try {
      const data = await studentAPI.getStory(planId, topicId);
      setStory(data.story);
      if (data.exercises && data.exercises.length > 0) {
        setCurrentExercise(data.exercises[0]);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
      });
    }
  };

  const handleSubmitAnswer = async () => {
    try {
      const result = await studentAPI.checkAnswer(
        planId,
        currentTopic.id,
        currentExercise.id,
        answer
      );

      setFeedback(result);

      if (result.correct) {
        toast({
          title: 'Правильно!',
          description: result.feedback,
          status: 'success',
        });

        // Если все упражнения выполнены, переходим к следующей теме
        const nextExercise = currentTopic.exercises.find(
          (ex) => !ex.completed && ex.id !== currentExercise.id
        );

        if (nextExercise) {
          setCurrentExercise(nextExercise);
          setAnswer('');
          setFeedback(null);
        } else {
          // Переходим к следующей теме
          const nextTopic = plan.topics.find(
            (t) => !t.completed && t.id !== currentTopic.id
          );
          if (nextTopic) {
            setCurrentTopic(nextTopic);
            loadStory(nextTopic.id);
          } else {
            toast({
              title: 'Поздравляем!',
              description: 'Вы завершили все темы в этом плане обучения!',
              status: 'success',
              duration: null,
            });
          }
        }
      } else {
        toast({
          title: 'Попробуйте еще раз',
          description: result.feedback,
          status: 'warning',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
      });
    }
  };

  if (!plan || !currentTopic || !story) {
    return (
      <Container maxW="container.md" py={8}>
        <Progress size="xs" isIndeterminate />
      </Container>
    );
  }

  const progress = (plan.topics.filter((t) => t.completed).length / plan.topics.length) * 100;

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="md" mb={2}>
            {plan.subject}
          </Heading>
          <Progress value={progress} colorScheme="blue" mb={4} />
          <Text color="gray.600">
            Прогресс: {Math.round(progress)}% ({plan.topics.filter((t) => t.completed).length} из{' '}
            {plan.topics.length} тем)
          </Text>
        </Box>

        <Box>
          <Heading size="md" mb={4}>
            {currentTopic.name}
          </Heading>
          <Badge colorScheme={currentTopic.status === 'approved' ? 'green' : 'yellow'} mb={4}>
            {currentTopic.status === 'approved'
              ? 'Утверждена'
              : currentTopic.status === 'completed'
              ? 'Завершена'
              : 'В процессе'}
          </Badge>

          <Box borderWidth={1} borderRadius="md" p={4} mb={6}>
            <Text mb={4}>{story.text}</Text>
            {story.image && (
              <Image
                src={`data:image/png;base64,${story.image}`}
                alt="Story illustration"
                borderRadius="md"
              />
            )}
          </Box>

          {currentExercise && (
            <Box borderWidth={1} borderRadius="md" p={4}>
              <Heading size="sm" mb={4}>
                Упражнение
              </Heading>
              <Text mb={4}>{currentExercise.question}</Text>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Введите ваш ответ..."
                mb={4}
              />
              <Button colorScheme="blue" onClick={handleSubmitAnswer}>
                Проверить
              </Button>
              {feedback && (
                <Text
                  mt={4}
                  color={feedback.correct ? 'green.500' : 'orange.500'}
                  fontWeight="bold"
                >
                  {feedback.feedback}
                </Text>
              )}
            </Box>
          )}
        </Box>
      </VStack>
    </Container>
  );
}
