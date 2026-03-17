import QuizView from '../../components/student/QuizView';
import { useAuth } from '../../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';

export default function StudentQuizPage() {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    return (
        <MainLayout>
            <QuizView />
        </MainLayout>
    );
}