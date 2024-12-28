import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  useToast,
  Progress,
  Card,
  CardBody,
  Textarea,
  Divider,
  HStack,
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { studentAPI } from '../api/student';

export default function StudentPage() {
  const [plan, setPlan] = useState(null);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [previousTopic, setPreviousTopic] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [decision, setDecision] = useState('');
  const [showExercises, setShowExercises] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { planId } = useParams();
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, [planId]);

  const loadData = async () => {
    if (planId) {
      setIsLoading(true);
      try {
        const progress = await studentAPI.getProgress(planId);
        
        if (progress.completed) {
          setIsCompleted(true);
          return;
        }

        setPlan(await studentAPI.getPlan(planId));
        setCurrentTopic(progress.currentTopic);
        setPreviousTopic(progress.previousTopic);
        setShowExercises(false);
        setCurrentExerciseIndex(0);
        setAnswer('');
        setFeedback(null);
        setDecision('');
      } catch (error) {
        console.error('Error loading data:', error);
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

  const handleDecisionSubmit = async () => {
    if (!decision) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, введите ваше решение',
        status: 'warning',
      });
      return;
    }

    setIsLoading(true);
    try {
      await studentAPI.submitDecision(planId, currentTopic.id, decision);
      setShowExercises(true);
      setDecision('');
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

  const handleAnswerSubmit = async () => {
    if (!answer.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите ответ',
        status: 'warning',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await studentAPI.checkAnswer(
        planId,
        currentTopic.id,
        currentTopic.exercises[currentExerciseIndex].id,
        answer
      );

      setFeedback(result);

      if (result.isCorrect) {
        // Задержка перед следующим действием
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Если тема завершена
        if (result.isTopicCompleted) {
          if (result.nextTopic) {
            // Переходим к следующей теме
            await loadData();
          } else {
            // Все темы пройдены
            setIsCompleted(true);
          }
        } else if (result.nextExercise) {
          // Переходим к следующему упражнению
          setCurrentExerciseIndex(currentExerciseIndex + 1);
          setAnswer('');
          setFeedback(null);
        }
      }
    } catch (error) {
      console.error('Error checking answer:', error);
      toast({
        title: 'Ошибка',
        description: error.message,
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.md" py={8}>
        <Progress size="xs" isIndeterminate />
      </Container>
    );
  }

  if (isCompleted) {
    return (
      <Container maxW="container.md" py={8}>
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>Поздравляем!</Heading>
            <Text>Вы успешно прошли все темы этого плана.</Text>
          </CardBody>
        </Card>
      </Container>
    );
  }

  if (!currentTopic) {
    return (
      <Container maxW="container.md" py={8}>
        <Text>План не найден или не содержит тем с упражнениями.</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Заголовок плана */}
        <Heading size="lg">{plan?.name}</Heading>

        {/* История из предыдущей темы */}
        {previousTopic && !showExercises && (
          <Card>
            <CardBody>
              <Heading size="md" mb={4}>{previousTopic.name}</Heading>
              <Text whiteSpace="pre-wrap">{previousTopic.story}</Text>
              {previousTopic.decision && (
                <Box mt={4} p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold" mb={2}>Ваше предыдущее решение:</Text>
                  <Text>{previousTopic.decision}</Text>
                </Box>
              )}
            </CardBody>
          </Card>
        )}

        {/* Текущая тема */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>{currentTopic.name}</Heading>
            <Text mb={4}>{currentTopic.description}</Text>
            
            {!showExercises ? (
              <>
                <Text whiteSpace="pre-wrap" mb={4}>{currentTopic.story}</Text>
                <Textarea
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  placeholder="Как бы вы поступили в этой ситуации?"
                  mb={4}
                />
                <Button
                  colorScheme="blue"
                  onClick={handleDecisionSubmit}
                  isLoading={isLoading}
                >
                  Отправить решение
                </Button>
              </>
            ) : (
              <Box>
                <Divider my={4} />
                <Heading size="sm" mb={4}>
                  Упражнение {currentExerciseIndex + 1} из {currentTopic.exercises.length}
                </Heading>
                <Text mb={4}>{currentTopic.exercises[currentExerciseIndex].question}</Text>
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Введите ваш ответ..."
                  mb={4}
                />
                <HStack>
                  <Button
                    colorScheme="blue"
                    onClick={handleAnswerSubmit}
                    isLoading={isLoading}
                  >
                    Проверить
                  </Button>
                </HStack>
                {feedback && (
                  <Box mt={4} p={4} bg={feedback.isCorrect ? 'green.50' : 'red.50'} borderRadius="md">
                    <Text color={feedback.isCorrect ? 'green.600' : 'red.600'}>
                      {feedback.explanation}
                    </Text>
                  </Box>
                )}
              </Box>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}
