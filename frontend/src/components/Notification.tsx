import { Alert, AlertIcon, AlertTitle, AlertDescription } from "@chakra-ui/react";

interface NotificationProps {
  status: "info" | "warning" | "success" | "error";
  title: string;
  description?: string;
}

export const Notification = ({ status, title, description }: NotificationProps) => (
  <Alert status={status} borderRadius="md" boxShadow="md">
    <AlertIcon />
    <AlertTitle>{title}</AlertTitle>
    {description && <AlertDescription>{description}</AlertDescription>}
  </Alert>
);
