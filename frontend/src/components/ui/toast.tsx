import React from 'react';
import { Toaster, toast } from 'sonner';

export const toastSuccess = (msg: string) => toast.success(msg);
export const toastError = (msg: string) => toast.error(msg);

export const AppToaster: React.FC = () => {
  return <Toaster position="top-right" />;
};

export default AppToaster;
