import React, { useState, useEffect } from 'react';
import {
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  SimpleGrid,
  Badge,
  useToast,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { teacherAPI } from '../api/api';

export default function ApprovedPlansPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const loadedPlans = await teacherAPI.getApprovedPlans();
      setPlans(loadedPlans);
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

  useEffect(() => {
    loadPlans();
  }, [toast]);

  const handleDelete = async (planId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот план?')) {
      try {
        await teacherAPI.deletePlan(planId);
        toast({
          title: 'План удален',
          status: 'success',
          duration: 3000,
        });
        loadPlans(); // Перезагружаем список планов
      } catch (error) {
        toast({
          title: 'Ошибка при удалении',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
      }
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading>Утвержденные планы обучения</Heading>
        
        <Button
          colorScheme="blue"
          onClick={() => navigate('/create')}
          size="lg"
          width="fit-content"
        >
          Создать новый план
        </Button>

        {isLoading ? (
          <Text>Загрузка планов...</Text>
        ) : plans && plans.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {plans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <Heading size="md">{plan.subject}</Heading>
                </CardHeader>
                <CardBody>
                  <Text>{plan.description}</Text>
                  <Text mt={4}>
                    Тем: {plan.topics.length}
                  </Text>
                  <Text>
                    Упражнений: {plan.topics.reduce((sum, topic) => sum + topic.exercises.length, 0)}
                  </Text>
                  <Text>
                    Темы с упражнениями: {plan.topics.filter(t => t.exercises.length > 0).length} из {plan.topics.length}
                  </Text>
                </CardBody>
                <CardFooter>
                  <VStack spacing={2} width="100%">
                    <Button
                      colorScheme="blue"
                      onClick={() => navigate(`/teacher/plan/${plan.id}`)}
                      width="100%"
                    >
                      Редактировать упражнения
                    </Button>
                    <Button
                      colorScheme="green"
                      onClick={() => navigate(`/student/plan/${plan.id}`)}
                      width="100%"
                    >
                      Открыть для ученика
                    </Button>
                    <Button
                      colorScheme="red"
                      variant="outline"
                      onClick={() => handleDelete(plan.id)}
                      width="100%"
                    >
                      Удалить план
                    </Button>
                  </VStack>
                </CardFooter>
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <Text>Нет доступных планов обучения</Text>
        )}
      </VStack>
    </Container>
  );
}
