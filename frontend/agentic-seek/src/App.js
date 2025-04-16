import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentView, setCurrentView] = useState('blocks');
    const [responseData, setResponseData] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        scrollToBottom();
        checkHealth();
    }, [messages]);

    const checkHealth = async () => {
        try {
            await axios.get('http://0.0.0.0:8000/health');
            setIsOnline(true);
            console.log('System is online');
        } catch {
            setIsOnline(false);
            console.log('System is offline');
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (currentView === 'screenshot') {
            let isMounted = true;
    
            const fetchScreenshot = async () => {
                try {
                    const timestamp = new Date().getTime();
                    const res = await axios.get(`http://0.0.0.0:8000/screenshots/updated_screen.png?timestamp=${timestamp}`, {
                        responseType: 'blob'
                    });
                    if (isMounted) {
                        console.log('Screenshot fetched successfully');
                        const imageUrl = URL.createObjectURL(res.data);
                        setResponseData((prev) => {
                            if (prev?.screenshot && prev.screenshot !== 'placeholder.png') {
                                URL.revokeObjectURL(prev.screenshot);
                            }
                            return {
                                ...prev,
                                screenshot: imageUrl,
                                screenshotTimestamp: new Date().getTime()
                            };
                        });
                    }
                } catch (err) {
                    console.error('Error fetching screenshot:', err);
                    if (isMounted) {
                        setResponseData((prev) => ({
                            ...prev,
                            screenshot: 'placeholder.png',
                            screenshotTimestamp: new Date().getTime()
                        }));
                    }
                }
            };
    
            fetchScreenshot();
            const interval = setInterval(fetchScreenshot, 1000);
    
            return () => {
                isMounted = false;
                clearInterval(interval);
                if (responseData?.screenshot && responseData.screenshot !== 'placeholder.png') {
                    URL.revokeObjectURL(responseData.screenshot);
                }
            };
        }
    }, [currentView]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        checkHealth();
        if (!query.trim()) {
            console.log('Empty query');
            return;
        }
        setMessages((prev) => [...prev, { type: 'user', content: query }]);
        setIsLoading(true);
        setError(null);

        try {
            console.log('Sending query:', query);
            const res = await axios.post('http://0.0.0.0:8000/query', {
                query,
                tts_enabled: false
            });
            console.log('Response:', res.data);
            const data = res.data;
            setResponseData(data);
            setMessages((prev) => [
                ...prev,
                { type: 'agent', content: data.answer, agentName: data.agent_name },
            ]);
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to process query.');
            setMessages((prev) => [
                ...prev,
                { type: 'error', content: 'Error: Unable to get a response.' },
            ]);
        } finally {
            console.log('Query completed');
            setIsLoading(false);
            setQuery('');
        }
    };

    const handleGetScreenshot = async () => {
        try {
            console.log('Fetching screenshot...');
            const res = await axios.get('http://0.0.0.0:8000/screenshots/updated_screen.png');
            setResponseData((prev) => ({ ...prev, screenshot: res.data.screenshot }));
            setCurrentView('screenshot');
        } catch (err) {
            console.error('Error fetching screenshot:', err);
            setError('Browser not in use');
        }
    };

    return (
        <div className="app">
            <header className="header">
                <h1>AgenticSeek</h1>
            </header>
            <main className="main">
                <div className="chat-container">
                    <div className="left-panel">
                        <h2>C H A T</h2>
                        <br />
                        <div className="messages">
                            {messages.length === 0 ? (
                                <p className="placeholder">No messages yet. Type below to start!</p>
                            ) : (
                                messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`message ${
                                            msg.type === 'user'
                                                ? 'user-message'
                                                : msg.type === 'agent'
                                                ? 'agent-message'
                                                : 'error-message'
                                        }`}
                                    >
                                        {msg.type === 'agent' && (
                                            <span className="agent-name">{msg.agentName}</span>
                                        )}
                                        <p>{msg.content}</p>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        {isOnline && isLoading && <div className="loading-animation">Thinking...</div>}
                        {!isLoading && !isOnline && <p className="loading-animation">System offline. Deploy backend first.</p>}
                        <form onSubmit={handleSubmit} className="input-form">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Type your query..."
                                disabled={isLoading}
                            />
                            <button type="submit" disabled={isLoading}>
                                Send
                            </button>
                        </form>
                    </div>
                    <div className="right-panel">
                        <h2>I N T E R F A C E</h2>
                        <br />
                        <div className="view-selector">
                            <button
                                className={currentView === 'blocks' ? 'active' : ''}
                                onClick={() => setCurrentView('blocks')}
                            >
                                Editor View
                            </button>
                            <button
                                className={currentView === 'screenshot' ? 'active' : ''}
                                onClick={responseData?.screenshot ? () => setCurrentView('screenshot') : handleGetScreenshot}
                            >
                                Browser View
                            </button>
                        </div>
                        <div className="content">
                            {error && <p className="error">{error}</p>}
                            {currentView === 'blocks' ? (
                                <div className="blocks">
                                    {responseData && responseData.blocks && Object.values(responseData.blocks).length > 0 ? (
                                        Object.values(responseData.blocks).map((block, index) => (
                                            <div key={index} className="block">
                                                <p className="block-tool">Tool: {block.tool_type}</p>
                                                <pre>{block.block}</pre>
                                                <p className="block-feedback">Feedback: {block.feedback}</p>
                                                <p className="block-success">
                                                    Success: {block.success ? 'Yes' : 'No'}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="block">
                                            <p className="block-tool">Tool: No tool in use</p>
                                            <pre>No file opened</pre>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="screenshot">
                                    <img
                                        src={responseData?.screenshot || 'placeholder.png'}
                                        alt="Screenshot"
                                        onError={(e) => {
                                            e.target.src = 'placeholder.png';
                                            console.error('Failed to load screenshot');
                                        }}
                                        key={responseData?.screenshotTimestamp || 'default'} 
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
