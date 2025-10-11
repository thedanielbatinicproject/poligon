import React from 'react';
import DocumentPage from '../DocumentPage';
import './Dashboard.css';

const Dashboard = ({ mode, user }) => {
    return <DocumentPage mode={mode} user={user} />;
};

export default Dashboard;