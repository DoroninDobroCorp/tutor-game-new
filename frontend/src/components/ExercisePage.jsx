import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  VStack,
  Heading,
  Text,
  Input,
  useToast,
  Card,
  CardBody,
  Badge,
} from '@chakra-ui/react';
import { checkExercise } from '../api/api';

const ExercisePage = ({ planId, topic, onExerciseCompleted }) => {
  const [currentExercise, setCurrentExercise] = useState(topic.exercises[0]);
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await checkExercise({
        planId,
        topicId: topic.id,
        exerciseId: currentExercise.id,
        answer,
      });

      if (result.isCorrect) {
        toast({
          title: 'Правильно!',
          description: result.explanation,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        if (result.topicCompleted) {
          onExerciseCompleted(result.plan);
        } else if (result.nextExercise) {
          setCurrentExercise(result.nextExercise);
          setAnswer('');
        }
      } else {
        toast({
          title: 'Неправильно',
          description: result.explanation,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось проверить ответ',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentExerciseIndex = topic.exercises.findIndex(ex => ex.id === currentExercise.id);

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center">
          {topic.name}
        </Heading>
        <Text textAlign="center" color="gray.600">
          {topic.description}
        </Text>

        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Badge colorScheme="blue" alignSelf="flex-start">
                Задание {currentExerciseIndex + 1} из {topic.exercises.length}
              </Badge>
              <Text fontSize="lg" fontWeight="bold">
                {currentExercise.question}
              </Text>

              <Box as="form" onSubmit={handleSubmit}>
                <VStack spacing={4}>
                  <Input
                    placeholder="Ваш ответ"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />

                  <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    width="full"
                    isLoading={isLoading}
                  >
                    Проверить
                  </Button>
                </VStack>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default ExercisePage;
