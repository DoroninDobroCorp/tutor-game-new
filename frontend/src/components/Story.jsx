import React from 'react';
import {
  Box,
  Container,
  VStack,
  Text,
  Image,
  Button,
  Heading,
  Card,
  CardBody,
} from '@chakra-ui/react';

const Story = ({ story, onContinue }) => {
  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        <Card>
          <CardBody>
            <VStack spacing={6}>
              {story.image && (
                <Box boxSize="md" mx="auto">
                  <Image
                    src={`data:image/png;base64,${story.image}`}
                    alt="Story illustration"
                    borderRadius="lg"
                    objectFit="cover"
                  />
                </Box>
              )}

              <Text fontSize="lg" whiteSpace="pre-wrap">
                {story.text}
              </Text>

              <Button
                colorScheme="blue"
                size="lg"
                onClick={onContinue}
              >
                Перейти к заданиям
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default Story;
