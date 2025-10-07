import React from 'react';
import ReactDOM from 'react-dom/client';
import { CreateContainerPage } from './pages/create-container/CreateContainerPage';
import './App.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CreateContainerPage />
  </React.StrictMode>,
);
