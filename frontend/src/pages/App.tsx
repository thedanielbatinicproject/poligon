import React from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';

const App: React.FC = () => (
  <Box p={8} minH="100vh" bg="gray.50">
    <Heading as="h1" size="2xl" mb={4} color="teal.600">
      Poligon
    </Heading>
    <Text fontSize="xl" color="gray.700">
      Welcome to Poligon 2.0 – your platform for writing academic and scientific papers.
    </Text>
  </Box>
);

export default App;
