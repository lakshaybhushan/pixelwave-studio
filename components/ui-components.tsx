import React from 'react';
import { Button } from '@chakra-ui/react';

const CustomButton = ({ children, ...props }) => {
  return (
    <Button
      {...props}
      _hover={{
        shadow: '0 0 8px rgba(0,255,65,0.3)',
      }}
      _focus={{
        shadow: '0 0 8px rgba(0,255,65,0.3)',
      }}
    >
      {children}
    </Button>
  );
};

export default CustomButton;
