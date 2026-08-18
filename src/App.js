import { useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import ChatLayout from './components/ChatLayout';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ChannelProvider } from './context/ChannelContext';
import { ServerProvider } from './context/ServerContext';
import { FriendsProvider } from './context/FriendsContext';
import { DMProvider } from './context/DMContext';

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return user ? <ChatLayout /> : <AuthScreen />;
};

function App() {
  return (
    <AuthProvider>
      <ServerProvider>
        <ChannelProvider>
          <FriendsProvider>
            <DMProvider>
              <ChatProvider>
                <AppContent />
              </ChatProvider>
            </DMProvider>
          </FriendsProvider>
        </ChannelProvider>
      </ServerProvider>
    </AuthProvider>
  );
}

export default App;
