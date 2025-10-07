import React from 'react';
import ReactDOM from 'react-dom/client';
import { EditContainerPage } from './pages/edit-container/EditContainerPage';
import './App.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <EditContainerPage />
  </React.StrictMode>,
);
