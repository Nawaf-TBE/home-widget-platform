import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SavedPage } from './pages/SavedPage';
import { DealDetailPage } from './pages/DealDetailPage';
import { TariffsPage } from './pages/TariffsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/saved" element={<SavedPage />} />
                    <Route path="/deals/:id" element={<DealDetailPage />} />
                    <Route path="/tariffs" element={<TariffsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
